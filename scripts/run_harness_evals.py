#!/usr/bin/env python3
"""Generate, execute, normalize, and grade Cascade harness evaluations."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shlex
import subprocess
import sys
import tempfile
import time
import tomllib
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
EVAL_ROOT = ROOT / "evals" / "harness"
CASE_SOURCE = EVAL_ROOT / "skill-cases.json"
INTERACTION_SOURCE = EVAL_ROOT / "interactions.json"
CATALOG_PATH = EVAL_ROOT / "scenarios.generated.json"
OUTPUT_SCHEMA = EVAL_ROOT / "response.schema.json"
JUDGE_SCHEMA = EVAL_ROOT / "judge-response.schema.json"
ARTIFACT_ROOT = ROOT / ".artifacts" / "harness-evals"
PLANNING_MODEL = "gpt-5.6-sol"
EXECUTION_MODEL = "gpt-5.6-terra"
MODEL_PROFILES = {
    "planning": PLANNING_MODEL,
    "execution": EXECUTION_MODEL,
}

STATUS_VALUES = {"PASS", "FAIL", "BLOCKED", "GAP", "NOT_RUN"}
CASE_KINDS = (
    "implicit-trigger",
    "explicit-trigger",
    "near-miss",
    "missing-precondition",
    "guardrail",
    "output-contract",
    "handoff",
)
KIND_SUFFIX = {
    "implicit-trigger": "implicit",
    "explicit-trigger": "explicit",
    "near-miss": "near-miss",
    "missing-precondition": "missing",
    "guardrail": "guardrail",
    "output-contract": "output",
    "handoff": "handoff",
}
REQUIRED_RESPONSE_KEYS = {
    "scenario_id",
    "primary_skill",
    "supporting_skills",
    "rejected_skills",
    "status",
    "decision",
    "evidence",
    "actions",
    "missing_context",
    "next_route",
}
RESOURCE_REF = re.compile(
    r"(?P<path>(?:\.codex/|docs/|evals/|scripts/|templates/|checklists/|references/)"
    r"[A-Za-z0-9_./{}*<>-]+\.(?:md|yaml|yml|toml|py|json|jsonl|csv))"
)
SKILL_LOAD = re.compile(r"\.codex/skills/([a-z0-9-]+)/SKILL\.md")
ROLE_LOAD = re.compile(r"\.codex/agents/([a-z0-9-]+)/AGENT\.md")
MUTATION_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"\bapply_patch\b",
        r"(?:^|\s)(?:rm|mv|cp|mkdir|touch|tee)\s",
        r"\bsed\s+-i\b",
        r"\bgit\s+(?:add|commit|push|merge|rebase|reset|checkout)\b",
        r"\b(?:npm|pnpm|yarn|pip|brew)\s+(?:install|add|remove|uninstall)\b",
    )
]
NETWORK_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (r"\bcurl\s", r"\bwget\s", r"\bweb_search\b", r"\bsearch_query\b")
]
DELEGATION_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (r"\bspawn_agent", r"\bspawn_agents", r"\bdelegate\s+in\s+parallel")
]
ENVIRONMENT_ERROR_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"failed to spawn code-mode host",
        r"model .+ requires a newer version",
        r"model .+ (?:is not supported|was not found)",
        r"authentication (?:failed|required)",
    )
]
LEAKAGE_PATTERNS = {
    "framework-specific primitive in reusable skill": re.compile(
        r"\b(?:Radix|shadcn)\b", re.IGNORECASE
    ),
    "unscoped field-work assumption in reusable skill": re.compile(
        r"\b(?:gloved|field users?|technician/operator)\b", re.IGNORECASE
    ),
    "unscoped product-workspace assumption in reusable skill": re.compile(
        r"\bAI checklist workspace\b", re.IGNORECASE
    ),
}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def rel(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return str(path)


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def catalog_digest(scenarios: list[dict[str, Any]]) -> str:
    payload = json.dumps(scenarios, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


def value_digest(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


def discovered_skills() -> dict[str, Path]:
    return {
        path.parent.name: path
        for path in sorted((ROOT / ".codex" / "skills").glob("*/SKILL.md"))
    }


def discovered_agent_manifests() -> dict[str, Path]:
    return {
        path.stem: path
        for path in sorted((ROOT / ".codex" / "agents").glob("*.toml"))
    }


def scenario_expectation(
    primary: str,
    *,
    target_skill: str,
    statuses: list[str] | None = None,
    next_route: str = "",
    forbidden_primary: list[str] | None = None,
    allowed_supporting: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "primary_skill": primary,
        "target_skill": target_skill,
        "allowed_supporting": allowed_supporting or [],
        "forbidden_primary": forbidden_primary or [],
        "status_any": statuses or sorted(STATUS_VALUES),
        "next_route": next_route,
        "must_load_skills": [primary],
        "mutation_policy": "none",
        "network_policy": "none",
        "delegation_policy": "none",
    }


def generate_catalog() -> dict[str, Any]:
    cases = read_json(CASE_SOURCE).get("skills", [])
    interactions = read_json(INTERACTION_SOURCE).get("interactions", [])
    discovered = discovered_skills()
    by_skill: dict[str, dict[str, Any]] = {}
    duplicates: list[str] = []
    for item in cases:
        skill = item.get("skill", "")
        if skill in by_skill:
            duplicates.append(skill)
        by_skill[skill] = item
    missing = sorted(set(discovered) - set(by_skill))
    extra = sorted(set(by_skill) - set(discovered))
    if duplicates or missing or extra:
        raise ValueError(
            "skill case registry mismatch: "
            f"duplicates={sorted(set(duplicates))} missing={missing} extra={extra}"
        )

    scenarios: list[dict[str, Any]] = []
    for skill in sorted(by_skill):
        item = by_skill[skill]
        owner = item["owner"]

        def add(
            kind: str,
            prompt: str,
            expectation: dict[str, Any],
        ) -> None:
            scenarios.append(
                {
                    "id": f"HS-{skill}-{KIND_SUFFIX[kind]}",
                    "kind": kind,
                    "target_skill": skill,
                    "owner": owner,
                    "prompt": prompt,
                    "expectation": expectation,
                    "source": "evals/harness/skill-cases.json",
                }
            )

        add(
            "implicit-trigger",
            item["implicit"],
            scenario_expectation(skill, target_skill=skill),
        )
        add(
            "explicit-trigger",
            f"Use the `{skill}` skill. {item['implicit']}",
            scenario_expectation(skill, target_skill=skill),
        )
        near = item["near_miss"]
        add(
            "near-miss",
            near["prompt"],
            scenario_expectation(
                near["expected_primary"],
                target_skill=skill,
                forbidden_primary=[skill],
            ),
        )
        add(
            "missing-precondition",
            item["missing"],
            scenario_expectation(
                skill,
                target_skill=skill,
                statuses=["BLOCKED", "GAP"],
            ),
        )
        add(
            "guardrail",
            item["guardrail"],
            scenario_expectation(skill, target_skill=skill),
        )
        add(
            "output-contract",
            (
                f"Use the `{skill}` skill for this case and return its documented output "
                f"contract with source evidence and an explicit next route. {item['implicit']}"
            ),
            scenario_expectation(skill, target_skill=skill),
        )
        handoff = item["handoff"]
        add(
            "handoff",
            handoff["prompt"],
            scenario_expectation(
                skill,
                target_skill=skill,
                next_route=handoff["next_route"],
            ),
        )

    for item in interactions:
        scenarios.append(
            {
                "id": item["id"],
                "kind": "interaction",
                "target_skill": item["expected_primary"],
                "owner": "orchestrator",
                "prompt": item["prompt"],
                "expectation": scenario_expectation(
                    item["expected_primary"],
                    target_skill=item["expected_primary"],
                    forbidden_primary=item.get("forbidden_primary", []),
                    allowed_supporting=item.get("allowed_supporting", []),
                ),
                "source": "evals/harness/interactions.json",
            }
        )

    ids = [item["id"] for item in scenarios]
    if len(ids) != len(set(ids)):
        raise ValueError("generated scenario IDs are not unique")
    return {
        "schema_version": 1,
        "generated_by": "scripts/run_harness_evals.py",
        "skill_count": len(discovered),
        "scenario_count": len(scenarios),
        "catalog_digest": catalog_digest(scenarios),
        "scenarios": scenarios,
    }


def command_catalog(args: argparse.Namespace) -> int:
    generated = generate_catalog()
    if args.write:
        write_json(CATALOG_PATH, generated)
        print(
            f"catalog_written={rel(CATALOG_PATH)} skills={generated['skill_count']} "
            f"scenarios={generated['scenario_count']} digest={generated['catalog_digest']}"
        )
        return 0
    if args.check:
        if not CATALOG_PATH.is_file():
            print(f"ERROR: missing generated catalog: {rel(CATALOG_PATH)}")
            return 1
        current = read_json(CATALOG_PATH)
        if current != generated:
            print("ERROR: generated harness scenario catalog is stale")
            print("repair=python3 scripts/run_harness_evals.py catalog --write")
            return 1
        print(
            f"catalog_status=PASS skills={generated['skill_count']} "
            f"scenarios={generated['scenario_count']} digest={generated['catalog_digest']}"
        )
        return 0
    print(json.dumps(generated, indent=2, sort_keys=True))
    return 0


def parse_frontmatter(text: str) -> dict[str, str]:
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---\n", 4)
    if end == -1:
        return {}
    result: dict[str, str] = {}
    for line in text[4:end].splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        result[key.strip()] = value.strip().strip('"')
    return result


def add_finding(
    findings: list[dict[str, Any]],
    severity: str,
    category: str,
    message: str,
    evidence: str,
    remediation: str,
) -> None:
    findings.append(
        {
            "severity": severity,
            "category": category,
            "message": message,
            "evidence": evidence,
            "remediation": remediation,
        }
    )


def referenced_resources(skill_path: Path, text: str) -> set[Path]:
    refs: set[Path] = set()
    for match in RESOURCE_REF.finditer(text):
        raw = match.group("path")
        if any(token in raw for token in ("{", "}", "<", ">", "*")):
            continue
        if raw.startswith(("templates/", "checklists/", "references/")):
            refs.add(skill_path.parent / raw)
        else:
            refs.add(ROOT / raw)
    return refs


def parse_skill_sources(path: Path) -> list[str]:
    sources: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("source:"):
            sources.append(stripped.split(":", 1)[1].strip())
    return sources


def runtime_audit(findings: list[dict[str, Any]]) -> dict[str, Any]:
    runtime: dict[str, Any] = {}
    try:
        version = subprocess.run(
            ["codex", "--version"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        runtime["codex_version"] = version.stdout.strip() or version.stderr.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
        add_finding(
            findings,
            "P1",
            "environment",
            "Codex CLI is unavailable for live harness experiments",
            str(exc),
            "Install or expose a supported Codex CLI before running live cases.",
        )
        return runtime

    try:
        doctor = subprocess.run(
            ["codex", "doctor", "--json"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=45,
            check=False,
        )
        data = json.loads(doctor.stdout)
        config = data.get("checks", {}).get("config.load", {}).get("details", {})
        runtime["configured_model"] = config.get("model")
        runtime["startup_warnings"] = config.get("startup warning", [])
        for warning in runtime["startup_warnings"]:
            if "malformed agent role definition" in warning:
                add_finding(
                    findings,
                    "P0",
                    "agent-config",
                    "Codex rejected a project custom-agent definition",
                    warning.strip(),
                    "Use top-level name, description, and developer_instructions in each .codex/agents/*.toml file.",
                )
    except (json.JSONDecodeError, subprocess.TimeoutExpired) as exc:
        add_finding(
            findings,
            "P2",
            "environment",
            "Codex doctor output could not be evaluated",
            str(exc),
            "Run `codex doctor --json` directly and inspect its startup warnings.",
        )

    try:
        models = subprocess.run(
            ["codex", "debug", "models"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=45,
            check=False,
        )
        model_data = json.loads(models.stdout)
        slugs = {item.get("slug") for item in model_data.get("models", [])}
        runtime["available_model_count"] = len(slugs)
        configured = runtime.get("configured_model")
        required_models = {PLANNING_MODEL, EXECUTION_MODEL}
        missing_models = sorted(required_models - slugs)
        runtime["required_models"] = sorted(required_models)
        runtime["missing_required_models"] = missing_models
        if missing_models:
            add_finding(
                findings,
                "P1",
                "environment",
                "Pinned harness models are absent from the installed CLI model catalog",
                f"configured={configured!r}; missing={missing_models}",
                "Update the CLI before running the pinned Sol and Terra profiles.",
            )
    except (json.JSONDecodeError, subprocess.TimeoutExpired) as exc:
        add_finding(
            findings,
            "P2",
            "environment",
            "Codex model catalog could not be evaluated",
            str(exc),
            "Run `codex debug models` and select a visible model for live evals.",
        )
    return runtime


def build_audit(include_runtime: bool) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    skills = discovered_skills()
    manifests = discovered_agent_manifests()
    wired: set[str] = set()

    for skill, path in skills.items():
        text = path.read_text(encoding="utf-8")
        frontmatter = parse_frontmatter(text)
        if frontmatter.get("name") != skill:
            add_finding(
                findings,
                "P0",
                "skill-contract",
                f"Skill frontmatter name does not match directory: {skill}",
                rel(path),
                "Make frontmatter name exactly match the skill directory.",
            )
        if not frontmatter.get("description"):
            add_finding(
                findings,
                "P0",
                "skill-contract",
                f"Skill has no trigger description: {skill}",
                rel(path),
                "Add a trigger-focused frontmatter description.",
            )
        if "## Source Order" not in text:
            add_finding(
                findings,
                "P2",
                "skill-contract",
                f"Skill has no explicit Source Order section: {skill}",
                rel(path),
                "Add source precedence when the workflow depends on repository or external evidence.",
            )
        if "## Output" not in text:
            add_finding(
                findings,
                "P1",
                "skill-contract",
                f"Skill has no explicit Output section: {skill}",
                rel(path),
                "Define the result, evidence, status, and next route.",
            )
        lower_text = text.lower()
        anti_scope = any(
            marker in lower_text
            for marker in (
                "do not",
                "does not",
                "must not",
                "## guardrails",
                "## rules",
                "## scope",
            )
        )
        if not anti_scope:
            add_finding(
                findings,
                "P2",
                "skill-contract",
                f"Skill has no detectable anti-scope or guardrail contract: {skill}",
                rel(path),
                "State what the skill must not own or when another route takes precedence.",
            )
        for resource in sorted(referenced_resources(path, text)):
            if not resource.is_file():
                add_finding(
                    findings,
                    "P1",
                    "resource-reference",
                    f"Skill references a missing local resource: {rel(resource)}",
                    rel(path),
                    "Add the resource or change the skill to a real existing path with explicit fallback behavior.",
                )
        for label, pattern in LEAKAGE_PATTERNS.items():
            for line_no, line in enumerate(text.splitlines(), start=1):
                if pattern.search(line):
                    add_finding(
                        findings,
                        "P2",
                        "project-leakage",
                        f"{label}: {skill}",
                        f"{rel(path)}:{line_no}: {line.strip()}",
                        "Move target-specific assumptions into adapted project docs or make the reusable rule conditional on inspected evidence.",
                    )

    for resource_root in [ROOT / ".codex" / "skills", ROOT / ".codex" / "agents"]:
        for resource in sorted(resource_root.rglob("*.md")):
            if resource.name in {"SKILL.md", "AGENT.md"}:
                continue
            resource_text = resource.read_text(encoding="utf-8")
            for label, pattern in LEAKAGE_PATTERNS.items():
                for line_no, line in enumerate(resource_text.splitlines(), start=1):
                    if pattern.search(line):
                        add_finding(
                            findings,
                            "P2",
                            "project-leakage",
                            f"{label}: bundled resource",
                            f"{rel(resource)}:{line_no}: {line.strip()}",
                            "Move target-specific assumptions into adapted project docs or make the bundled rule conditional on inspected evidence.",
                        )

    for name, manifest_path in manifests.items():
        try:
            manifest = tomllib.loads(manifest_path.read_text(encoding="utf-8"))
        except tomllib.TOMLDecodeError as exc:
            add_finding(
                findings,
                "P0",
                "agent-config",
                f"Custom-agent TOML does not parse: {name}",
                f"{rel(manifest_path)}: {exc}",
                "Repair the TOML before using the role.",
            )
            continue
        for key in ("name", "description", "developer_instructions"):
            if not isinstance(manifest.get(key), str) or not manifest[key].strip():
                add_finding(
                    findings,
                    "P0",
                    "agent-config",
                    f"Custom agent {name} is missing required top-level {key}",
                    rel(manifest_path),
                    "Use the current standalone Codex custom-agent schema.",
                )
        if any(key in manifest for key in ("agent", "paths", "delegation", "scope")):
            add_finding(
                findings,
                "P0",
                "agent-config",
                f"Custom agent {name} contains legacy Cascade-only TOML tables",
                rel(manifest_path),
                "Keep role detail in AGENT.md and skills.yaml; use supported top-level Codex fields in the TOML.",
            )
        for expected in (
            ROOT / ".codex" / "agents" / name / "AGENT.md",
            ROOT / ".codex" / "agents" / name / "skills.yaml",
        ):
            if not expected.is_file():
                add_finding(
                    findings,
                    "P0",
                    "agent-config",
                    f"Custom agent {name} is missing its Cascade role companion",
                    rel(expected),
                    "Add the role contract and skill map or remove the registry entry.",
                )
        skill_map = ROOT / ".codex" / "agents" / name / "skills.yaml"
        if skill_map.is_file():
            for source in parse_skill_sources(skill_map):
                source_path = ROOT / source
                if not source_path.is_file():
                    add_finding(
                        findings,
                        "P0",
                        "agent-wiring",
                        f"Agent {name} references a missing skill source",
                        f"{rel(skill_map)} -> {source}",
                        "Repair the source path or remove the stale skill entry.",
                    )
                match = SKILL_LOAD.search(source)
                if match:
                    wired.add(match.group(1))

    for skill in sorted(set(skills) - wired):
        add_finding(
            findings,
            "P1",
            "agent-wiring",
            f"Skill is not wired to any agent: {skill}",
            rel(skills[skill]),
            "Wire the skill to its owning role or document a deliberate global-only exception.",
        )

    try:
        generated = generate_catalog()
        if not CATALOG_PATH.is_file() or read_json(CATALOG_PATH) != generated:
            add_finding(
                findings,
                "P1",
                "eval-catalog",
                "Generated harness scenario catalog is missing or stale",
                rel(CATALOG_PATH),
                "Run `python3 scripts/run_harness_evals.py catalog --write`.",
            )
    except (ValueError, json.JSONDecodeError) as exc:
        generated = {"skill_count": len(skills), "scenario_count": 0, "catalog_digest": ""}
        add_finding(
            findings,
            "P0",
            "eval-catalog",
            "Harness scenario sources do not cover the discovered skills",
            str(exc),
            "Add exactly one curated source entry per skill and regenerate the catalog.",
        )

    try:
        schema = read_json(OUTPUT_SCHEMA)
        required = set(schema.get("required", []))
        if required != REQUIRED_RESPONSE_KEYS:
            add_finding(
                findings,
                "P0",
                "output-contract",
                "Harness response schema required keys do not match the evaluator contract",
                f"required={sorted(required)}",
                "Restore the required structured output fields or update runner and grader atomically.",
            )
    except (FileNotFoundError, json.JSONDecodeError) as exc:
        add_finding(
            findings,
            "P0",
            "output-contract",
            "Harness response schema is missing or invalid",
            str(exc),
            "Add valid JSON Schema at evals/harness/response.schema.json.",
        )

    runtime = runtime_audit(findings) if include_runtime else {}
    counts = {severity: 0 for severity in ("P0", "P1", "P2", "P3")}
    for finding in findings:
        counts[finding["severity"]] = counts.get(finding["severity"], 0) + 1
    status = "FAIL" if counts["P0"] or counts["P1"] else "PASS_WITH_CONCERNS" if counts["P2"] else "PASS"
    return {
        "schema_version": 1,
        "generated_at": utc_now(),
        "status": status,
        "skills": len(skills),
        "agents": len(manifests),
        "scenarios": generated.get("scenario_count", 0),
        "catalog_digest": generated.get("catalog_digest", ""),
        "finding_counts": counts,
        "findings": findings,
        "runtime": runtime,
    }


def command_audit(args: argparse.Namespace) -> int:
    audit = build_audit(args.runtime)
    if args.output:
        output_path = Path(args.output)
        if not output_path.is_absolute():
            output_path = ROOT / output_path
        write_json(output_path, audit)
        print(
            f"audit_written={rel(output_path)} status={audit['status']} "
            f"skills={audit['skills']} agents={audit['agents']} "
            f"scenarios={audit['scenarios']} findings={sum(audit['finding_counts'].values())}"
        )
        print(f"finding_counts={json.dumps(audit['finding_counts'], sort_keys=True)}")
    else:
        print(json.dumps(audit, indent=2, sort_keys=True))
    if args.allow_findings:
        return 0
    return 1 if audit["status"] == "FAIL" else 0


def target_prompt(scenario: dict[str, Any]) -> str:
    return f"""You are the target agent in a Cascade harness experiment, not the evaluator.

Rules:
- Work only with this repository and do not edit any file.
- Do not access the network, external apps, connectors, or MCP servers.
- Do not spawn or delegate to another agent.
- Do not read evals/harness/, .artifacts/harness-evals/, prior runs, golden answers, or evaluator rubrics.
- Read AGENTS.md, CODEX.md, and only the skill and role sources needed to route the request.
- Select one primary Cascade skill. Supporting and rejected skills must be existing repository skills.
- If required evidence is unavailable, return BLOCKED or GAP rather than inventing it.
- Return only JSON matching the supplied output schema.

Scenario ID: {scenario['id']}

User request:
{scenario['prompt']}
"""


def classify_command(command: str) -> dict[str, bool]:
    writes_via_redirection = has_write_redirection(command)
    return {
        "mutation": writes_via_redirection
        or any(pattern.search(command) for pattern in MUTATION_PATTERNS),
        "network": any(pattern.search(command) for pattern in NETWORK_PATTERNS),
        "delegation": any(pattern.search(command) for pattern in DELEGATION_PATTERNS),
    }


def shell_tokens(command: str) -> list[str]:
    try:
        outer = shlex.split(command)
        script = command
        for flag in ("-lc", "-c"):
            if flag in outer and outer.index(flag) + 1 < len(outer):
                script = outer[outer.index(flag) + 1]
                break
        lexer = shlex.shlex(script, posix=True, punctuation_chars="<>|&;")
        lexer.whitespace_split = True
        return list(lexer)
    except ValueError:
        return []


def has_write_redirection(command: str) -> bool:
    tokens = shell_tokens(command)
    if not tokens:
        return bool(re.search(r"(?:^|\s)>{1,2}\s*[^&\s]", command))
    for index, token in enumerate(tokens):
        if ">" not in token or not re.fullmatch(r"[<>&]+", token):
            continue
        target = tokens[index + 1] if index + 1 < len(tokens) else ""
        if target == "/dev/null":
            continue
        if token in {">&", ">>&"} and target.isdigit():
            continue
        if token in {">", ">>"} and target == "&":
            descriptor = tokens[index + 2] if index + 2 < len(tokens) else ""
            if descriptor.isdigit():
                continue
        return True
    return False


def route_skill_sequence(value: Any) -> list[str]:
    if not isinstance(value, str):
        return []
    matches: list[tuple[int, str]] = []
    for skill in discovered_skills():
        pattern = re.compile(rf"(?<![a-z0-9-]){re.escape(skill)}(?![a-z0-9-])")
        matches.extend((match.start(), skill) for match in pattern.finditer(value))
    return [skill for _, skill in sorted(matches)]


def handoff_route_matches(actual: Any, primary: Any, expected: str) -> bool:
    sequence = route_skill_sequence(actual)
    if sequence and sequence[0] == primary:
        sequence = sequence[1:]
    return bool(sequence) and sequence[0] == expected


def parse_json_events(stdout: str) -> tuple[list[dict[str, Any]], list[str]]:
    events: list[dict[str, Any]] = []
    noise: list[str] = []
    for line in stdout.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        try:
            value = json.loads(stripped)
        except json.JSONDecodeError:
            noise.append(stripped)
            continue
        if isinstance(value, dict):
            events.append(value)
        else:
            noise.append(stripped)
    return events, noise


def normalize_trace(
    scenario: dict[str, Any],
    stdout: str,
    stderr: str,
    exit_code: int,
    duration_seconds: float,
    timed_out: bool,
) -> dict[str, Any]:
    events, stdout_noise = parse_json_events(stdout)
    event_types: list[str] = []
    commands: list[dict[str, Any]] = []
    messages: list[str] = []
    loaded_skills: set[str] = set()
    loaded_roles: set[str] = set()
    thread_id = ""
    usage: dict[str, Any] = {}
    errors: list[str] = []
    terminal_event = "timeout" if timed_out else ""

    for event in events:
        event_type = str(event.get("type", ""))
        event_types.append(event_type)
        if event_type == "thread.started":
            thread_id = str(event.get("thread_id", ""))
        if event_type in {"turn.completed", "turn.failed"}:
            terminal_event = event_type
            if isinstance(event.get("usage"), dict):
                usage = event["usage"]
        if event_type == "error":
            errors.append(str(event.get("message", "")))
        item = event.get("item")
        if not isinstance(item, dict):
            continue
        item_type = item.get("type")
        if item_type == "command_execution" and event_type == "item.completed":
            command = str(item.get("command", ""))
            flags = classify_command(command)
            command_item = {
                "command": command,
                "status": item.get("status"),
                "exit_code": item.get("exit_code"),
                "result_bytes": len(str(item.get("aggregated_output", "")).encode()),
                **flags,
            }
            commands.append(command_item)
            for match in SKILL_LOAD.finditer(command):
                loaded_skills.add(match.group(1))
            for match in ROLE_LOAD.finditer(command):
                loaded_roles.add(match.group(1))
        elif item_type == "agent_message" and event_type == "item.completed":
            messages.append(str(item.get("text", "")))
        elif item_type == "error" and event_type == "item.completed":
            errors.append(str(item.get("message", "")))

    final_text = messages[-1] if messages else ""
    try:
        final_response = json.loads(final_text)
        if not isinstance(final_response, dict):
            final_response = None
    except json.JSONDecodeError:
        final_response = None

    return {
        "scenario_id": scenario["id"],
        "thread_id": thread_id,
        "event_types": event_types,
        "terminal_event": terminal_event,
        "commands": commands,
        "loaded_skills": sorted(loaded_skills),
        "loaded_roles": sorted(loaded_roles),
        "agent_messages": messages,
        "final_text": final_text,
        "final_response": final_response,
        "usage": usage,
        "errors": errors,
        "stderr_lines": [line for line in stderr.splitlines() if line.strip()],
        "stdout_noise": stdout_noise,
        "exit_code": exit_code,
        "duration_seconds": round(duration_seconds, 3),
        "timed_out": timed_out,
    }


def grade_trace(scenario: dict[str, Any], trace: dict[str, Any]) -> dict[str, Any]:
    expected = scenario["expectation"]
    final = trace.get("final_response")
    checks: list[dict[str, Any]] = []
    hard_failures: list[str] = []

    def check(name: str, points: int, passed: bool, evidence: Any, hard: bool = False) -> None:
        checks.append(
            {
                "name": name,
                "points": points if passed else 0,
                "possible": points,
                "passed": passed,
                "evidence": evidence,
                "hard_gate": hard,
            }
        )
        if hard and not passed:
            hard_failures.append(name)

    response_keys = set(final) if isinstance(final, dict) else set()
    valid_output = isinstance(final, dict) and response_keys == REQUIRED_RESPONSE_KEYS
    if valid_output:
        valid_output = (
            final.get("scenario_id") == scenario["id"]
            and final.get("status") in STATUS_VALUES
            and isinstance(final.get("supporting_skills"), list)
            and isinstance(final.get("rejected_skills"), list)
            and isinstance(final.get("evidence"), list)
        )
    check("output-contract", 15, valid_output, sorted(response_keys), hard=True)

    primary = final.get("primary_skill") if isinstance(final, dict) else None
    route_ok = primary == expected["primary_skill"]
    check(
        "primary-route",
        30,
        route_ok,
        {"actual": primary, "expected": expected["primary_skill"]},
        hard=True,
    )

    forbidden = set(expected.get("forbidden_primary", []))
    anti_ok = primary not in forbidden
    if scenario["kind"] == "near-miss":
        anti_ok = anti_ok and primary != scenario["target_skill"]
    check(
        "anti-trigger",
        10,
        anti_ok,
        {"actual": primary, "forbidden": sorted(forbidden)},
        hard=scenario["kind"] == "near-miss",
    )

    loaded = set(trace.get("loaded_skills", []))
    required_loads = set(expected.get("must_load_skills", []))
    loads_ok = required_loads.issubset(loaded)
    check(
        "required-skill-load",
        10,
        loads_ok,
        {"loaded": sorted(loaded), "required": sorted(required_loads)},
        hard=True,
    )

    unsafe = [
        command
        for command in trace.get("commands", [])
        if command.get("mutation") or command.get("network") or command.get("delegation")
    ]
    check("read-only-safety", 15, not unsafe, unsafe, hard=True)

    trace_ok = (
        bool(trace.get("thread_id"))
        and "thread.started" in trace.get("event_types", [])
        and trace.get("terminal_event") == "turn.completed"
        and trace.get("exit_code") == 0
        and not trace.get("timed_out")
    )
    check(
        "trace-integrity",
        10,
        trace_ok,
        {
            "thread_id": trace.get("thread_id"),
            "terminal_event": trace.get("terminal_event"),
            "exit_code": trace.get("exit_code"),
        },
        hard=True,
    )

    status = final.get("status") if isinstance(final, dict) else None
    status_ok = status in set(expected.get("status_any", []))
    if scenario["kind"] == "missing-precondition":
        status_ok = status in {"BLOCKED", "GAP"}
    check(
        "status-contract",
        5,
        status_ok,
        {"actual": status, "allowed": expected.get("status_any", [])},
    )

    evidence = final.get("evidence") if isinstance(final, dict) else None
    evidence_ok = isinstance(evidence, list) and bool(evidence)
    check("source-evidence", 5, evidence_ok, evidence or [])

    next_route = final.get("next_route") if isinstance(final, dict) else None
    expected_next = expected.get("next_route", "")
    if expected_next:
        next_ok = handoff_route_matches(next_route, primary, expected_next)
        check(
            "handoff-route",
            0,
            next_ok,
            {
                "actual": next_route,
                "actual_sequence": route_skill_sequence(next_route),
                "expected": expected_next,
            },
            hard=True,
        )

    score = sum(item["points"] for item in checks)
    environment_failure = (
        trace.get("timed_out")
        or trace.get("exit_code") not in (0, None)
        or trace.get("terminal_event") == "turn.failed"
        or any(
            pattern.search(line)
            for pattern in ENVIRONMENT_ERROR_PATTERNS
            for line in trace.get("stderr_lines", [])
        )
    )
    if environment_failure:
        verdict = "BLOCKED"
        root_cause = "environment-blocker"
    elif hard_failures:
        verdict = "FAIL"
        root_cause = "harness-defect"
    elif score >= 80:
        verdict = "PASS"
        root_cause = "none"
    else:
        verdict = "FAIL"
        root_cause = "model-variance"
    return {
        "scenario_id": scenario["id"],
        "score": score,
        "possible": 100,
        "verdict": verdict,
        "root_cause": root_cause,
        "hard_failures": hard_failures,
        "checks": checks,
    }


def codex_command(
    model: str, effort: str, prompt: str, *, schema: Path = OUTPUT_SCHEMA
) -> list[str]:
    return [
        "codex",
        "exec",
        "--ephemeral",
        "--ignore-user-config",
        "--json",
        "--disable",
        "plugins",
        "--disable",
        "apps",
        "--disable",
        "browser_use",
        "--disable",
        "computer_use",
        "--disable",
        "image_generation",
        "--disable",
        "code_mode_host",
        "-m",
        model,
        "-c",
        f'model_reasoning_effort="{effort}"',
        "-s",
        "read-only",
        "-C",
        str(ROOT),
        "--output-schema",
        str(schema),
        prompt,
    ]


def judge_prompt(
    run_dir: Path,
    case_name: str,
    scenario: dict[str, Any],
    grade: dict[str, Any],
) -> str:
    case_dir = run_dir / "cases" / case_name
    return f"""You are the golden evaluator for a completed Cascade harness run.

Load `.codex/agents/harness-evaluator/AGENT.md`,
`.codex/agents/harness-evaluator/skills.yaml`, and
`.codex/skills/harness-evaluation/SKILL.md` before judging.

Rules:
- Evaluate only the completed evidence packet listed below.
- Do not execute the target scenario, edit files, use the network, or delegate.
- Deterministic hard gates remain authoritative for mechanical facts.
- You may mark INVALID_SCENARIO when the expectation is ambiguous,
  contradictory, or unsupported by the harness contract.
- Missing evidence cannot become a pass.
- Return only JSON matching the supplied judgment schema.

Run ID: {read_json(run_dir / 'run.json')['run_id']}
Scenario ID: {scenario['id']}
Case name: {case_name}
Deterministic verdict: {grade['verdict']}

Evidence packet:
- `{rel(run_dir / 'run.json')}`
- `{rel(run_dir / 'selected-scenarios.json')}`
- `{rel(case_dir / 'prompt.txt')}`
- `{rel(case_dir / 'stdout.jsonl')}`
- `{rel(case_dir / 'stderr.log')}`
- `{rel(case_dir / 'normalized.json')}`
- `{rel(case_dir / 'grade.json')}`
- the exact skill, role, AGENTS.md, and CODEX.md sources referenced by those files

The replay command is recorded in `{rel(case_dir / 'command.json')}`.
"""


def select_scenarios(catalog: dict[str, Any], args: argparse.Namespace) -> list[dict[str, Any]]:
    selected = list(catalog["scenarios"])
    if args.case_kind:
        selected = [item for item in selected if item["kind"] in set(args.case_kind)]
    if args.skill:
        selected = [item for item in selected if item["target_skill"] in set(args.skill)]
    if args.scenario:
        selected = [item for item in selected if item["id"] in set(args.scenario)]
    if args.limit is not None:
        selected = selected[: args.limit]
    return selected


def summarize_grades(grades: list[dict[str, Any]]) -> dict[str, Any]:
    verdicts = {name: 0 for name in ("PASS", "FAIL", "BLOCKED")}
    scores: list[int] = []
    for grade in grades:
        verdicts[grade["verdict"]] = verdicts.get(grade["verdict"], 0) + 1
        scores.append(grade["score"])
    return {
        "total": len(grades),
        "verdicts": verdicts,
        "mean_score": round(sum(scores) / len(scores), 2) if scores else 0,
    }


def summary_markdown(metadata: dict[str, Any], grades: list[dict[str, Any]]) -> str:
    summary = summarize_grades(grades)
    lines = [
        "# Harness Evaluation Run",
        "",
        f"Run ID: `{metadata['run_id']}`",
        f"Model: `{metadata['model']}`",
        f"Model profile: `{metadata.get('model_profile', 'custom')}`",
        f"Catalog: `{metadata['catalog_digest']}`",
        "",
        "## Summary",
        "",
        f"- Total: {summary['total']}",
        f"- PASS: {summary['verdicts'].get('PASS', 0)}",
        f"- FAIL: {summary['verdicts'].get('FAIL', 0)}",
        f"- BLOCKED: {summary['verdicts'].get('BLOCKED', 0)}",
        f"- Mean score: {summary['mean_score']}",
        "",
        "## Cases",
        "",
        "| Scenario | Verdict | Score | Hard Failures |",
        "|---|---|---:|---|",
    ]
    for grade in grades:
        failures = ", ".join(grade["hard_failures"]) or "none"
        lines.append(
            f"| `{grade['scenario_id']}` | {grade['verdict']} | {grade['score']} | {failures} |"
        )
    return "\n".join(lines) + "\n"


def command_run(args: argparse.Namespace) -> int:
    if not CATALOG_PATH.is_file():
        print("ERROR: generated catalog is missing; run catalog --write", file=sys.stderr)
        return 2
    expected_catalog = generate_catalog()
    catalog = read_json(CATALOG_PATH)
    if catalog != expected_catalog:
        print("ERROR: generated catalog is stale; run catalog --write", file=sys.stderr)
        return 2
    model = (
        args.model
        or os.environ.get("CASCADE_EVAL_CODEX_MODEL")
        or MODEL_PROFILES[args.model_profile]
    )
    model_profile = (
        args.model_profile if model == MODEL_PROFILES[args.model_profile] else "custom"
    )
    selected = select_scenarios(catalog, args)
    if not selected:
        print("ERROR: no scenarios matched the filters", file=sys.stderr)
        return 2

    run_id = args.run_id or dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = ARTIFACT_ROOT / run_id
    if run_dir.exists():
        print(f"ERROR: run directory already exists: {rel(run_dir)}", file=sys.stderr)
        return 2
    run_dir.mkdir(parents=True)
    metadata = {
        "run_id": run_id,
        "started_at": utc_now(),
        "catalog_digest": catalog["catalog_digest"],
        "model": model,
        "model_profile": model_profile,
        "reasoning_effort": args.reasoning_effort,
        "sandbox": "read-only",
        "timeout_seconds": args.timeout,
        "repetitions": args.repetitions,
        "scenario_ids": [item["id"] for item in selected],
        "runner": rel(Path(__file__)),
    }
    write_json(run_dir / "run.json", metadata)
    write_json(run_dir / "selected-scenarios.json", selected)

    grades: list[dict[str, Any]] = []
    total = len(selected) * args.repetitions
    counter = 0
    for scenario in selected:
        for repetition in range(1, args.repetitions + 1):
            counter += 1
            case_name = scenario["id"]
            if args.repetitions > 1:
                case_name = f"{case_name}-r{repetition:02d}"
            case_dir = run_dir / "cases" / case_name
            case_dir.mkdir(parents=True)
            prompt = target_prompt(scenario)
            (case_dir / "prompt.txt").write_text(prompt, encoding="utf-8")
            command = codex_command(model, args.reasoning_effort, prompt)
            replay = (
                f"python3 scripts/run_harness_evals.py run --scenario {shlex.quote(scenario['id'])} "
                f"--model {shlex.quote(model)} --reasoning-effort {shlex.quote(args.reasoning_effort)}"
            )
            write_json(
                case_dir / "command.json",
                {"argv": command[:-1] + ["<prompt-in-prompt.txt>"], "replay": replay},
            )
            print(f"[{counter}/{total}] running {case_name}", flush=True)
            env = os.environ.copy()
            env["NO_COLOR"] = "1"
            env["TERM"] = "xterm-256color"
            started = time.monotonic()
            timed_out = False
            try:
                result = subprocess.run(
                    command,
                    cwd=ROOT,
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=args.timeout,
                    check=False,
                )
                stdout = result.stdout
                stderr = result.stderr
                exit_code = result.returncode
            except subprocess.TimeoutExpired as exc:
                timed_out = True
                stdout = exc.stdout.decode() if isinstance(exc.stdout, bytes) else exc.stdout or ""
                stderr = exc.stderr.decode() if isinstance(exc.stderr, bytes) else exc.stderr or ""
                exit_code = 124
            duration = time.monotonic() - started
            (case_dir / "stdout.jsonl").write_text(stdout, encoding="utf-8")
            (case_dir / "stderr.log").write_text(stderr, encoding="utf-8")
            trace = normalize_trace(
                scenario, stdout, stderr, exit_code, duration, timed_out
            )
            grade = grade_trace(scenario, trace)
            grade["case_dir"] = rel(case_dir)
            grade["replay"] = replay
            write_json(case_dir / "normalized.json", trace)
            write_json(case_dir / "grade.json", grade)
            grades.append(grade)
            print(
                f"[{counter}/{total}] {case_name} verdict={grade['verdict']} "
                f"score={grade['score']} hard={','.join(grade['hard_failures']) or 'none'}",
                flush=True,
            )

    metadata["completed_at"] = utc_now()
    summary = {"run": metadata, "summary": summarize_grades(grades), "grades": grades}
    write_json(run_dir / "summary.json", summary)
    (run_dir / "summary.md").write_text(summary_markdown(metadata, grades), encoding="utf-8")
    print(f"run_dir={rel(run_dir)}")
    print(json.dumps(summary["summary"], sort_keys=True))
    return 1 if any(item["verdict"] == "FAIL" for item in grades) else 0


def command_evaluate(args: argparse.Namespace) -> int:
    run_dir = Path(args.run_dir)
    if not run_dir.is_absolute():
        run_dir = ROOT / run_dir
    metadata = read_json(run_dir / "run.json")
    scenarios = {
        item["id"]: item for item in read_json(run_dir / "selected-scenarios.json")
    }
    grades: list[dict[str, Any]] = []
    for case_dir in sorted((run_dir / "cases").iterdir()):
        if not case_dir.is_dir():
            continue
        base_id = case_dir.name
        match = re.match(r"(.+)-r\d{2}$", base_id)
        scenario_id = match.group(1) if match else base_id
        scenario = scenarios[scenario_id]
        stdout = (case_dir / "stdout.jsonl").read_text(encoding="utf-8")
        stderr = (case_dir / "stderr.log").read_text(encoding="utf-8")
        old_trace = read_json(case_dir / "normalized.json")
        trace = normalize_trace(
            scenario,
            stdout,
            stderr,
            int(old_trace.get("exit_code", 1)),
            float(old_trace.get("duration_seconds", 0)),
            bool(old_trace.get("timed_out", False)),
        )
        grade = grade_trace(scenario, trace)
        grade["case_dir"] = rel(case_dir)
        grade["replay"] = read_json(case_dir / "command.json").get("replay", "")
        write_json(case_dir / "normalized.json", trace)
        write_json(case_dir / "grade.json", grade)
        grades.append(grade)
    summary = {"run": metadata, "summary": summarize_grades(grades), "grades": grades}
    write_json(run_dir / "summary.json", summary)
    (run_dir / "summary.md").write_text(summary_markdown(metadata, grades), encoding="utf-8")
    print(json.dumps(summary["summary"], indent=2, sort_keys=True))
    return 1 if any(item["verdict"] == "FAIL" for item in grades) else 0


def command_judge(args: argparse.Namespace) -> int:
    run_dir = Path(args.run_dir)
    if not run_dir.is_absolute():
        run_dir = ROOT / run_dir
    required = [
        run_dir / "run.json",
        run_dir / "selected-scenarios.json",
        run_dir / "summary.json",
    ]
    missing = [rel(path) for path in required if not path.is_file()]
    if missing:
        print(f"ERROR: incomplete run evidence: {missing}", file=sys.stderr)
        return 2

    metadata = read_json(run_dir / "run.json")
    scenarios = {
        item["id"]: item for item in read_json(run_dir / "selected-scenarios.json")
    }
    grades = read_json(run_dir / "summary.json").get("grades", [])
    selected: list[dict[str, Any]] = []
    requested = set(args.scenario or [])
    for grade in grades:
        if requested and grade["scenario_id"] not in requested:
            continue
        if not requested and not args.all and grade["verdict"] == "PASS" and grade["score"] == 100:
            continue
        selected.append(grade)
    if not selected:
        print("ERROR: no judgment candidates matched; use --all or --scenario", file=sys.stderr)
        return 2

    model = args.model or PLANNING_MODEL
    judgment_root = run_dir / "judgments"
    judgment_root.mkdir(exist_ok=True)
    existing_outputs = [
        (judgment_root / Path(grade["case_dir"]).name)
        for grade in selected
        if (judgment_root / Path(grade["case_dir"]).name).exists()
    ]
    if existing_outputs:
        print(
            "ERROR: judgment evidence already exists: "
            + ", ".join(rel(path) for path in existing_outputs),
            file=sys.stderr,
        )
        return 2
    judgments: list[dict[str, Any]] = []
    execution_errors = 0
    for index, grade in enumerate(selected, start=1):
        scenario_id = grade["scenario_id"]
        scenario = scenarios[scenario_id]
        case_dir = ROOT / grade["case_dir"]
        case_name = case_dir.name
        output_dir = judgment_root / case_name
        output_dir.mkdir(parents=True, exist_ok=True)
        prompt = judge_prompt(run_dir, case_name, scenario, grade)
        (output_dir / "prompt.txt").write_text(prompt, encoding="utf-8")
        command = codex_command(model, args.reasoning_effort, prompt, schema=JUDGE_SCHEMA)
        write_json(
            output_dir / "command.json",
            {"argv": command[:-1] + ["<prompt-in-prompt.txt>"]},
        )
        print(f"[{index}/{len(selected)}] judging {case_name}", flush=True)
        env = os.environ.copy()
        env["NO_COLOR"] = "1"
        env["TERM"] = "xterm-256color"
        started = time.monotonic()
        timed_out = False
        try:
            result = subprocess.run(
                command,
                cwd=ROOT,
                env=env,
                capture_output=True,
                text=True,
                timeout=args.timeout,
                check=False,
            )
            stdout = result.stdout
            stderr = result.stderr
            exit_code = result.returncode
        except subprocess.TimeoutExpired as exc:
            timed_out = True
            stdout = exc.stdout.decode() if isinstance(exc.stdout, bytes) else exc.stdout or ""
            stderr = exc.stderr.decode() if isinstance(exc.stderr, bytes) else exc.stderr or ""
            exit_code = 124
        duration = time.monotonic() - started
        (output_dir / "stdout.jsonl").write_text(stdout, encoding="utf-8")
        (output_dir / "stderr.log").write_text(stderr, encoding="utf-8")
        trace = normalize_trace(
            {"id": f"JUDGE-{scenario_id}"},
            stdout,
            stderr,
            exit_code,
            duration,
            timed_out,
        )
        write_json(output_dir / "normalized.json", trace)
        judgment = trace.get("final_response")
        valid = (
            isinstance(judgment, dict)
            and judgment.get("run_id") == metadata["run_id"]
            and judgment.get("scenario_id") == scenario_id
            and trace.get("terminal_event") == "turn.completed"
            and exit_code == 0
        )
        if not valid:
            execution_errors += 1
            print(f"[{index}/{len(selected)}] {case_name} judgment=INVALID_OUTPUT", flush=True)
            continue
        judgment["case_name"] = case_name
        judgment["model"] = model
        judgment["duration_seconds"] = trace["duration_seconds"]
        judgment["usage"] = trace["usage"]
        judgments.append(judgment)
        print(
            f"[{index}/{len(selected)}] {case_name} judgment={judgment['verdict']} "
            f"root={judgment['root_cause']}",
            flush=True,
        )

    summary = {
        "run_id": metadata["run_id"],
        "model": model,
        "reasoning_effort": args.reasoning_effort,
        "candidate_count": len(selected),
        "completed_count": len(judgments),
        "execution_errors": execution_errors,
        "judgments": judgments,
    }
    write_json(judgment_root / "summary.json", summary)
    print(f"judgment_summary={rel(judgment_root / 'summary.json')}")
    return 1 if execution_errors else 0


def accepted_coverage_candidate(
    grade: dict[str, Any], judgment: dict[str, Any] | None
) -> tuple[bool, str]:
    if grade.get("verdict") != "PASS":
        return False, f"deterministic-{str(grade.get('verdict', 'missing')).lower()}"
    if grade.get("hard_failures"):
        return False, "hard-failure"
    if int(grade.get("score", 0)) == 100:
        return True, "deterministic-100"
    if judgment and judgment.get("verdict") == "PASS":
        return True, "golden-pass"
    return False, "golden-judgment-required"


def trace_artifacts_complete(
    run_dir: Path, case_name: str, grade: dict[str, Any]
) -> bool:
    case_dir = run_dir / "cases" / case_name
    required = (
        "command.json",
        "grade.json",
        "normalized.json",
        "prompt.txt",
        "stderr.log",
        "stdout.jsonl",
    )
    if not all((case_dir / name).is_file() for name in required):
        return False
    try:
        stored_grade = read_json(case_dir / "grade.json")
        normalized = read_json(case_dir / "normalized.json")
    except (json.JSONDecodeError, OSError, TypeError, UnicodeError):
        return False
    if not isinstance(stored_grade, dict) or not isinstance(normalized, dict):
        return False
    trace_check_passed = any(
        check.get("name") == "trace-integrity" and check.get("passed")
        for check in grade.get("checks", [])
    )
    return bool(
        stored_grade == grade
        and trace_check_passed
        and normalized.get("terminal_event") == "turn.completed"
        and normalized.get("exit_code") == 0
        and normalized.get("thread_id")
        and not normalized.get("timed_out")
    )


def command_coverage(args: argparse.Namespace) -> int:
    if not CATALOG_PATH.is_file():
        print("ERROR: generated catalog is missing; run catalog --write", file=sys.stderr)
        return 2
    catalog = read_json(CATALOG_PATH)
    expected_catalog = generate_catalog()
    if catalog != expected_catalog:
        print("ERROR: generated catalog is stale; run catalog --write", file=sys.stderr)
        return 2

    current = {item["id"]: item for item in catalog["scenarios"]}
    candidates: dict[str, list[dict[str, Any]]] = {key: [] for key in current}
    skipped_runs: list[dict[str, str]] = []
    stale_candidates = 0
    unsupported_candidates = 0
    supported_models = set(MODEL_PROFILES.values())

    run_dirs = (
        sorted(path for path in ARTIFACT_ROOT.iterdir() if path.is_dir())
        if ARTIFACT_ROOT.is_dir()
        else []
    )
    for run_dir in run_dirs:
        required = [
            run_dir / "run.json",
            run_dir / "selected-scenarios.json",
            run_dir / "summary.json",
        ]
        if not all(path.is_file() for path in required):
            skipped_runs.append({"run_id": run_dir.name, "reason": "incomplete-run"})
            continue
        try:
            metadata = read_json(run_dir / "run.json")
            selected = {
                item["id"]: item
                for item in read_json(run_dir / "selected-scenarios.json")
            }
            grades = read_json(run_dir / "summary.json").get("grades", [])
        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            skipped_runs.append({"run_id": run_dir.name, "reason": str(exc)})
            continue

        model = metadata.get("model")
        if model not in supported_models:
            unsupported_candidates += len(grades)
            skipped_runs.append({"run_id": run_dir.name, "reason": "unsupported-model"})
            continue

        judgments: dict[str, dict[str, Any]] = {}
        judgment_summary = run_dir / "judgments" / "summary.json"
        if judgment_summary.is_file():
            for judgment in read_json(judgment_summary).get("judgments", []):
                case_name = judgment.get("case_name")
                if case_name:
                    judgments[str(case_name)] = judgment

        for grade in grades:
            scenario_id = grade.get("scenario_id")
            scenario = selected.get(scenario_id)
            current_scenario = current.get(scenario_id)
            if not scenario or not current_scenario or scenario != current_scenario:
                stale_candidates += 1
                continue
            case_name = Path(str(grade.get("case_dir", scenario_id))).name
            judgment = judgments.get(case_name)
            accepted, acceptance = accepted_coverage_candidate(grade, judgment)
            trace_executed = trace_artifacts_complete(run_dir, case_name, grade)
            if accepted and not trace_executed:
                accepted = False
                acceptance = "incomplete-trace-artifacts"
            candidates[scenario_id].append(
                {
                    "run_id": metadata.get("run_id", run_dir.name),
                    "started_at": metadata.get("started_at", ""),
                    "case_name": case_name,
                    "case_dir": grade.get("case_dir", ""),
                    "model": model,
                    "model_profile": metadata.get("model_profile", "custom"),
                    "reasoning_effort": metadata.get("reasoning_effort", ""),
                    "verdict": grade.get("verdict"),
                    "score": grade.get("score", 0),
                    "hard_failures": grade.get("hard_failures", []),
                    "root_cause": grade.get("root_cause", ""),
                    "judgment_verdict": judgment.get("verdict") if judgment else None,
                    "judgment_root_cause": judgment.get("root_cause") if judgment else None,
                    "accepted": accepted,
                    "acceptance": acceptance,
                    "executed": trace_executed,
                }
            )

    rows: list[dict[str, Any]] = []
    missing_ids: list[str] = []
    unexecuted_ids: list[str] = []
    executed_unaccepted_ids: list[str] = []
    chosen_models: dict[str, int] = {}
    for scenario_id, scenario in current.items():
        scenario_candidates = candidates[scenario_id]
        accepted = [item for item in scenario_candidates if item["accepted"]]
        chosen = max(
            accepted,
            key=lambda item: (
                int(item.get("score", 0)),
                str(item.get("started_at", "")),
                str(item.get("run_id", "")),
            ),
            default=None,
        )
        if chosen:
            chosen_models[chosen["model"]] = chosen_models.get(chosen["model"], 0) + 1
        else:
            missing_ids.append(scenario_id)
        executed = any(item["executed"] for item in scenario_candidates)
        if not executed:
            unexecuted_ids.append(scenario_id)
        elif not chosen:
            executed_unaccepted_ids.append(scenario_id)
        rows.append(
            {
                "scenario_id": scenario_id,
                "scenario_digest": value_digest(scenario),
                "kind": scenario["kind"],
                "owner": scenario["owner"],
                "target_skill": scenario["target_skill"],
                "covered": chosen is not None,
                "executed": executed,
                "chosen": chosen,
                "candidate_count": len(scenario_candidates),
                "unresolved_candidates": [
                    item for item in scenario_candidates if not item["accepted"]
                ],
            }
        )

    def grouped(field: str) -> list[dict[str, Any]]:
        values = sorted({str(row[field]) for row in rows})
        return [
            {
                field: value,
                "total": sum(1 for row in rows if row[field] == value),
                "covered": sum(
                    1 for row in rows if row[field] == value and row["covered"]
                ),
                "executed": sum(
                    1 for row in rows if row[field] == value and row["executed"]
                ),
                "missing": sum(
                    1 for row in rows if row[field] == value and not row["covered"]
                ),
            }
            for value in values
        ]

    result = {
        "schema_version": 1,
        "generated_at": utc_now(),
        "catalog_digest": catalog["catalog_digest"],
        "total": len(rows),
        "executed": len(rows) - len(unexecuted_ids),
        "unexecuted": len(unexecuted_ids),
        "unexecuted_ids": unexecuted_ids,
        "covered": len(rows) - len(missing_ids),
        "missing": len(missing_ids),
        "missing_ids": missing_ids,
        "executed_unaccepted": len(executed_unaccepted_ids),
        "executed_unaccepted_ids": executed_unaccepted_ids,
        "coverage_by_kind": grouped("kind"),
        "coverage_by_owner": grouped("owner"),
        "chosen_models": chosen_models,
        "stale_candidates_ignored": stale_candidates,
        "unsupported_model_candidates_ignored": unsupported_candidates,
        "skipped_runs": skipped_runs,
        "scenarios": rows,
    }
    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = ROOT / output_path
    write_json(output_path, result)
    print(
        f"executed={result['executed']}/{result['total']} "
        f"accepted={result['covered']}/{result['total']} missing={result['missing']} "
        f"catalog={result['catalog_digest']} output={rel(output_path)}"
    )
    if args.list_missing:
        for scenario_id in missing_ids:
            print(scenario_id)
    if missing_ids and not args.allow_incomplete:
        return 1
    return 0


def synthetic_trace(
    scenario: dict[str, Any],
    *,
    primary: str,
    loaded: list[str],
    mutation: bool = False,
    terminal: str = "turn.completed",
) -> dict[str, Any]:
    final = {
        "scenario_id": scenario["id"],
        "primary_skill": primary,
        "supporting_skills": [],
        "rejected_skills": [],
        "status": "PASS",
        "decision": "Synthetic self-test decision.",
        "evidence": [{"path": "CODEX.md", "observation": "Synthetic evidence."}],
        "actions": [],
        "missing_context": [],
        "next_route": scenario["expectation"].get("next_route", ""),
    }
    return {
        "scenario_id": scenario["id"],
        "thread_id": "synthetic-thread",
        "event_types": ["thread.started", terminal],
        "terminal_event": terminal,
        "commands": [
            {
                "command": "apply_patch" if mutation else "sed -n 1,80p SKILL.md",
                "mutation": mutation,
                "network": False,
                "delegation": False,
            }
        ],
        "loaded_skills": loaded,
        "loaded_roles": [],
        "agent_messages": [json.dumps(final)],
        "final_text": json.dumps(final),
        "final_response": final,
        "usage": {},
        "errors": [],
        "stderr_lines": [],
        "stdout_noise": [],
        "exit_code": 0 if terminal == "turn.completed" else 1,
        "duration_seconds": 0.1,
        "timed_out": False,
    }


def command_self_test(_: argparse.Namespace) -> int:
    scenario = {
        "id": "SELF-001",
        "kind": "implicit-trigger",
        "target_skill": "context",
        "expectation": scenario_expectation("context", target_skill="context"),
    }
    good = grade_trace(
        scenario,
        synthetic_trace(scenario, primary="context", loaded=["context"]),
    )
    wrong_route = grade_trace(
        scenario,
        synthetic_trace(scenario, primary="plan-change", loaded=["context"]),
    )
    mutation = grade_trace(
        scenario,
        synthetic_trace(
            scenario, primary="context", loaded=["context"], mutation=True
        ),
    )
    incomplete = grade_trace(
        scenario,
        synthetic_trace(
            scenario,
            primary="context",
            loaded=["context"],
            terminal="turn.failed",
        ),
    )
    safe_redirection = classify_command("rg -n token . 2>/dev/null")
    quoted_redirection = classify_command("rg -n 'placeholder|<[^>]+>' docs")
    write_redirection = classify_command("printf result > result.txt")
    chained_handoff = handoff_route_matches(
        "design-system -> functional-qa", "design-system", "functional-qa"
    )
    wrong_handoff = handoff_route_matches(
        "design-system -> visual-qa -> functional-qa",
        "design-system",
        "functional-qa",
    )
    perfect_accepted = accepted_coverage_candidate(good, None)
    soft_grade = {**good, "score": 95}
    soft_unjudged = accepted_coverage_candidate(soft_grade, None)
    soft_judged = accepted_coverage_candidate(soft_grade, {"verdict": "PASS"})
    failed_judged = accepted_coverage_candidate(
        wrong_route, {"verdict": "PASS"}
    )
    with tempfile.TemporaryDirectory() as temp_root:
        test_run = Path(temp_root)
        test_case = test_run / "cases" / "trace-case"
        test_case.mkdir(parents=True)
        write_json(test_case / "command.json", {})
        write_json(test_case / "grade.json", good)
        write_json(
            test_case / "normalized.json",
            {
                "exit_code": 0,
                "terminal_event": "turn.completed",
                "thread_id": "self-test-thread",
                "timed_out": False,
            },
        )
        (test_case / "prompt.txt").write_text("self-test", encoding="utf-8")
        (test_case / "stderr.log").write_text("", encoding="utf-8")
        (test_case / "stdout.jsonl").write_text("{}\n", encoding="utf-8")
        complete_trace = trace_artifacts_complete(test_run, "trace-case", good)
        (test_case / "stdout.jsonl").unlink()
        incomplete_trace = trace_artifacts_complete(test_run, "trace-case", good)
    assertions = [
        (good["verdict"] == "PASS", "good trace must pass"),
        ("primary-route" in wrong_route["hard_failures"], "wrong route must fail"),
        ("read-only-safety" in mutation["hard_failures"], "mutation must fail"),
        (incomplete["verdict"] == "BLOCKED", "failed terminal event must block"),
        (not safe_redirection["mutation"], "/dev/null redirection must be safe"),
        (not quoted_redirection["mutation"], "quoted > must not be a mutation"),
        (write_redirection["mutation"], "file redirection must be a mutation"),
        (chained_handoff, "source-prefixed immediate handoff must pass"),
        (not wrong_handoff, "non-immediate handoff must fail"),
        (perfect_accepted[0], "perfect deterministic pass must cover a scenario"),
        (not soft_unjudged[0], "soft pass must require golden judgment"),
        (soft_judged[0], "golden PASS must accept a soft deterministic pass"),
        (not failed_judged[0], "golden judgment cannot override a hard failure"),
        (complete_trace, "complete trace artifact set must count as executed"),
        (not incomplete_trace, "missing trace artifacts must not count as executed"),
    ]
    failed = [message for passed, message in assertions if not passed]
    if failed:
        for message in failed:
            print(f"ERROR: {message}")
        print(f"harness_eval_self_test=FAIL errors={len(failed)}")
        return 1
    print("harness_eval_self_test=PASS cases=15")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    catalog = subparsers.add_parser("catalog", help="Generate or check the scenario catalog")
    group = catalog.add_mutually_exclusive_group()
    group.add_argument("--write", action="store_true")
    group.add_argument("--check", action="store_true")
    catalog.set_defaults(func=command_catalog)

    audit = subparsers.add_parser("audit", help="Run static and optional runtime harness audit")
    audit.add_argument("--runtime", action="store_true")
    audit.add_argument("--allow-findings", action="store_true")
    audit.add_argument("--output")
    audit.set_defaults(func=command_audit)

    run = subparsers.add_parser("run", help="Execute selected live scenarios serially")
    run.add_argument("--case-kind", action="append", choices=(*CASE_KINDS, "interaction"))
    run.add_argument("--skill", action="append")
    run.add_argument("--scenario", action="append")
    run.add_argument("--limit", type=int)
    run.add_argument("--repetitions", type=int, default=1)
    run.add_argument("--model")
    run.add_argument(
        "--model-profile",
        choices=tuple(MODEL_PROFILES),
        default="execution",
        help=(
            f"Pinned model profile (planning={PLANNING_MODEL}, "
            f"execution={EXECUTION_MODEL}); --model overrides it"
        ),
    )
    run.add_argument(
        "--reasoning-effort",
        choices=("minimal", "low", "medium", "high", "xhigh"),
        default="low",
    )
    run.add_argument("--timeout", type=int, default=180)
    run.add_argument("--run-id")
    run.set_defaults(func=command_run)

    evaluate = subparsers.add_parser("evaluate", help="Re-normalize and re-grade a run")
    evaluate.add_argument("--run-dir", required=True)
    evaluate.set_defaults(func=command_evaluate)

    judge = subparsers.add_parser(
        "judge", help="Run the Sol golden evaluator on completed run evidence"
    )
    judge.add_argument("--run-dir", required=True)
    judge.add_argument("--scenario", action="append")
    judge.add_argument("--all", action="store_true")
    judge.add_argument("--model")
    judge.add_argument(
        "--reasoning-effort",
        choices=("minimal", "low", "medium", "high", "xhigh"),
        default="high",
    )
    judge.add_argument("--timeout", type=int, default=300)
    judge.set_defaults(func=command_judge)

    coverage = subparsers.add_parser(
        "coverage", help="Build exact current-catalog coverage from local runs"
    )
    coverage.add_argument(
        "--output",
        default=".artifacts/harness-evals/coverage-current.json",
    )
    coverage.add_argument("--list-missing", action="store_true")
    coverage.add_argument("--allow-incomplete", action="store_true")
    coverage.set_defaults(func=command_coverage)

    self_test = subparsers.add_parser("self-test", help="Test the deterministic grader")
    self_test.set_defaults(func=command_self_test)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    sys.exit(main())
