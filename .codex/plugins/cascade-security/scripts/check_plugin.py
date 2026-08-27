#!/usr/bin/env python3
"""Structural and contract validation for the Cascade Security package."""

from __future__ import annotations

import json
import re
from pathlib import Path
import sys
from typing import Any

from jsonschema import Draft202012Validator

from refresh_manifest import verify as verify_manifest


SEMVER = re.compile(r"^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")
FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
EXPECTED_SKILLS = {"codebase-audit", "auth-analysis", "secure-design"}
ASSERTIONS = {"status_matches_expected", "selected_skill_matches_expected", "security_artifact_validates"}


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"JSON root must be an object: {path}")
    return value


def validate(root: Path) -> list[str]:
    errors: list[str] = []
    contract = load_json(root / "evals" / "evaluation-contract.json")
    plugin = load_json(root / ".codex-plugin" / "plugin.json")

    if plugin.get("name") != "cascade-security" or plugin.get("name") != contract.get("plugin_id"):
        errors.append("plugin identity is inconsistent")
    version = str(plugin.get("version", ""))
    if not SEMVER.fullmatch(version) or version != contract.get("version"):
        errors.append("plugin version is invalid or not bound to the evaluation contract")
    if plugin.get("skills") != "./skills/":
        errors.append("plugin skills path must be ./skills/")
    prompts = plugin.get("interface", {}).get("defaultPrompt")
    if not isinstance(prompts, list) or not 1 <= len(prompts) <= 3 or any(not isinstance(item, str) or not item or len(item) > 128 for item in prompts):
        errors.append("interface.defaultPrompt must contain one to three non-empty strings of at most 128 characters")

    actual_skills = {path.parent.name for path in (root / "skills").glob("*/SKILL.md")}
    if actual_skills != EXPECTED_SKILLS or set(contract.get("expected_skills", [])) != EXPECTED_SKILLS:
        errors.append(f"skill set mismatch: {sorted(actual_skills)}")

    runtime_texts: list[str] = []
    for skill in sorted(EXPECTED_SKILLS):
        skill_root = root / "skills" / skill
        skill_path = skill_root / "SKILL.md"
        agent_path = skill_root / "agents" / "openai.yaml"
        if not skill_path.is_file() or not agent_path.is_file():
            errors.append(f"{skill}: missing SKILL.md or agents/openai.yaml")
            continue
        text = skill_path.read_text(encoding="utf-8")
        runtime_texts.append(text)
        match = FRONTMATTER.search(text)
        if not match or f"name: {skill}" not in match.group(1) or "description:" not in match.group(1):
            errors.append(f"{skill}: invalid frontmatter")
        agent_text = agent_path.read_text(encoding="utf-8")
        if "default_prompt:" not in agent_text or f"${skill}" not in agent_text:
            errors.append(f"{skill}: default prompt must explicitly invoke ${skill}")
        if "[TODO:" in text or "[TODO:" in agent_text:
            errors.append(f"{skill}: unresolved TODO placeholder")
        for forbidden in (".codex/skills/", ".codex/agents/security"):
            if forbidden in text:
                errors.append(f"{skill}: runtime body depends on host source path {forbidden}")

    runtime = "\n".join(runtime_texts)
    for phrase in contract.get("required_runtime_phrases", []):
        if phrase not in runtime:
            errors.append(f"required runtime phrase is not operative: {phrase}")
    for phrase in contract.get("forbidden_runtime_phrases", []):
        if phrase in runtime:
            errors.append(f"forbidden runtime phrase remains: {phrase}")

    for required in (
        "README.md", "specs/architecture.md", "specs/capability-map.md",
        "specs/extraction-manifest.json", "schemas/security-review.schema.json",
        "scripts/validate_artifact.py", "scripts/evaluate_case_assertions.py",
        "skills/codebase-audit/scripts/security_stack_scan.ts",
    ):
        if not (root / required).is_file():
            errors.append(f"missing {required}")

    extraction = load_json(root / "specs" / "extraction-manifest.json")
    artifacts = extraction.get("artifacts")
    if (
        extraction.get("schema_version") != 1
        or extraction.get("plugin_id") != "cascade-security"
        or extraction.get("plugin_version") != version
        or not re.fullmatch(r"[a-f0-9]{40}", str(extraction.get("source_revision", "")))
        or extraction.get("source_state") != "LISTED_PATHS_MATCH_SOURCE_REVISION_BEFORE_CUTOVER"
        or not isinstance(artifacts, list)
        or len(artifacts) != 12
    ):
        errors.append("capability extraction manifest identity is invalid")
    else:
        paths = [item.get("path") for item in artifacts if isinstance(item, dict)]
        if len(paths) != 12 or len(set(paths)) != 12:
            errors.append("capability extraction manifest paths are missing or duplicated")
        for item in artifacts:
            if (
                not re.fullmatch(r"[a-f0-9]{64}", str(item.get("sha256", "")))
                or not isinstance(item.get("capabilities"), list)
                or not item["capabilities"]
            ):
                errors.append(f"capability extraction artifact is incomplete: {item.get('path')}")

    schema = load_json(root / "schemas" / "security-review.schema.json")
    if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema" or schema.get("type") != "object":
        errors.append("security-review schema declaration is invalid")
    try:
        Draft202012Validator.check_schema(schema)
    except Exception as error:
        errors.append(f"security-review schema is invalid: {error}")

    models = contract.get("models", {})
    if (
        any(models.get(role) != "gpt-5.6-sol" for role in ("builder", "target", "judge"))
        or models.get("reasoning_effort") != "max"
        or models.get("explicit_comparison_override") is not False
    ):
        errors.append("evaluation model matrix must bind gpt-5.6-sol with max reasoning")
    if contract.get("acceptance_threshold") != 0.95 or contract.get("minimum_dimension") != 3:
        errors.append("evaluation acceptance policy must remain 0.95 with dimension floor 3")

    suite = load_json(root / "evals" / "cases.json")
    cases = suite.get("cases", [])
    if suite.get("schema_version") != 2 or len(cases) != contract.get("expected_case_count"):
        errors.append("evaluation suite identity or case count is invalid")
        cases = []
    if suite.get("subject_adapter") != "cascade-evals:agent-evaluation":
        errors.append("subject adapter alias is invalid")
    if suite.get("split_membership") != [case.get("case_id") for case in cases]:
        errors.append("split_membership must list every case once in execution order")
    adapter = suite.get("execution_adapter", {})
    if (
        adapter.get("id") != "cascade-evals-agent-runner-v1"
        or adapter.get("runner") != "cascade-evals/scripts/run_agent_evaluation.py"
        or adapter.get("model") != "gpt-5.6-sol"
        or adapter.get("reasoning_effort") != "max"
        or adapter.get("target_batching") != "contiguous-balanced-parallel-v1"
        or adapter.get("target_invocations") != 3
        or adapter.get("case_count") != 9
    ):
        errors.append("execution adapter binding is invalid")
    packet = suite.get("packet_contract", {})
    if (
        packet.get("target_fields") != ["case_id", "request", "fixture"]
        or packet.get("sealed_fields") != ["skill", "expected_status", "oracle", "mechanical_assertions"]
        or packet.get("judge_builder") != "cascade-evals/scripts/build_blind_packets.py"
        or packet.get("judge_schema") != "cascade-evals/skills/evaluate/references/judge-packet.schema.json"
    ):
        errors.append("blind packet contract is invalid")
    if set(suite.get("assertion_catalog", {})) != ASSERTIONS:
        errors.append("mechanical assertion catalog is incomplete")

    ids: set[str] = set()
    categories: set[str] = set()
    counts = {skill: 0 for skill in EXPECTED_SKILLS}
    for case in cases:
        case_id = case.get("case_id")
        if not isinstance(case_id, str) or case_id in ids:
            errors.append(f"invalid or duplicate case ID: {case_id}")
        else:
            ids.add(case_id)
        skill = case.get("skill")
        if skill not in counts:
            errors.append(f"{case_id}: unknown skill")
        else:
            counts[skill] += 1
        categories.add(str(case.get("category", "")))
        if case.get("expected_status") not in {"READY", "GAP", "BLOCKED"}:
            errors.append(f"{case_id}: unsupported status")
        if case.get("mechanical_assertions") != ["status_matches_expected", "selected_skill_matches_expected", "security_artifact_validates"]:
            errors.append(f"{case_id}: mechanical assertion set is incomplete")
        output = case.get("fixture", {}).get("output_contract", {})
        if output.get("response_encoding") != "json" or output.get("schema") != "schemas/security-review.schema.json":
            errors.append(f"{case_id}: typed output contract is invalid")
        if not isinstance(case.get("request"), str) or not isinstance(case.get("oracle"), str):
            errors.append(f"{case_id}: request and oracle are required")
    for skill, count in counts.items():
        if count != 3:
            errors.append(f"{skill}: exactly three qualification cases are required")
    missing_categories = set(contract.get("required_case_categories", [])) - categories
    if missing_categories:
        errors.append(f"missing case categories: {sorted(missing_categories)}")

    profiles = sorted((root / "evals").glob("judge-*.json"))
    if len(profiles) != 2:
        errors.append("exactly two independent judge profiles are required")
    for path in profiles:
        profile = load_json(path)
        if profile.get("model") != "gpt-5.6-sol" or profile.get("threshold") != 0.95 or profile.get("minimum_dimension") != 3:
            errors.append(f"{path.name}: model or acceptance policy mismatch")
        dimensions = profile.get("dimensions", [])
        if not dimensions or abs(sum(float(item.get("weight", 0)) for item in dimensions) - 1.0) > 1e-9:
            errors.append(f"{path.name}: dimension weights must sum to one")
        if any(set(item.get("anchors", {})) != {"0", "1", "2", "3", "4"} for item in dimensions):
            errors.append(f"{path.name}: every dimension requires anchors zero through four")

    dependency_aliases = {item.get("alias") for item in contract.get("required_dependency_artifacts", [])}
    required_aliases = set(contract.get("required_dependency_aliases", [])) | set(contract.get("routed_peer_aliases", []))
    if not required_aliases.issubset(dependency_aliases):
        errors.append("dependency artifact set does not cover every required or routed alias")

    manifest_path = root / "evals" / "manifest.json"
    if not manifest_path.is_file():
        errors.append("missing evals/manifest.json")
    else:
        errors.extend(verify_manifest(root, load_json(manifest_path)))
    return sorted(set(errors))


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    try:
        errors = validate(root)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        errors = [str(error)]
    print(json.dumps({"status": "PASS" if not errors else "FAIL", "errors": errors}, indent=2))
    return 0 if not errors else 2


if __name__ == "__main__":
    sys.exit(main())
