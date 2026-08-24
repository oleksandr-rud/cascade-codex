#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

from refresh_manifest import verify as verify_manifest

SEMVER = re.compile(r"^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")
FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate(root: Path) -> list[str]:
    errors: list[str] = []
    contract_path = root / "evals" / "evaluation-contract.json"
    if not contract_path.is_file():
        return ["missing evals/evaluation-contract.json"]
    contract = load_json(contract_path)
    manifest = load_json(root / ".codex-plugin" / "plugin.json")

    if manifest.get("name") != contract.get("plugin_id"):
        errors.append("manifest name does not match evaluation contract")
    if manifest.get("version") != contract.get("version") or not SEMVER.fullmatch(str(manifest.get("version", ""))):
        errors.append("manifest version is missing, invalid, or not bound to the evaluation contract")
    interface = manifest.get("interface", {})
    prompts = interface.get("defaultPrompt")
    if not isinstance(prompts, list) or not 1 <= len(prompts) <= 3 or any(not isinstance(item, str) or len(item) > 128 for item in prompts):
        errors.append("interface.defaultPrompt must contain one to three strings of at most 128 characters")

    expected = set(contract.get("expected_skills", []))
    actual = {path.parent.name for path in (root / "skills").glob("*/SKILL.md")}
    if actual != expected:
        errors.append(f"skill set mismatch: expected={sorted(expected)} actual={sorted(actual)}")

    skill_texts: list[str] = []
    for skill in sorted(expected):
        skill_path = root / "skills" / skill / "SKILL.md"
        agent_path = root / "skills" / skill / "agents" / "openai.yaml"
        if not skill_path.is_file() or not agent_path.is_file():
            errors.append(f"{skill}: missing SKILL.md or agents/openai.yaml")
            continue
        text = skill_path.read_text(encoding="utf-8")
        skill_texts.append(text)
        match = FRONTMATTER.search(text)
        if not match or f"name: {skill}" not in match.group(1) or "description:" not in match.group(1):
            errors.append(f"{skill}: invalid frontmatter")
        agent = agent_path.read_text(encoding="utf-8")
        if "default_prompt:" not in agent or f"${skill}" not in agent:
            errors.append(f"{skill}: default_prompt must explicitly invoke ${skill}")
        if "[TODO:" in text or "[TODO:" in agent:
            errors.append(f"{skill}: unresolved TODO placeholder")

    for spec in ("specs/architecture.md", "specs/capability-map.md"):
        path = root / spec
        if not path.is_file():
            errors.append(f"missing {spec}")
    skill_text = "\n".join(skill_texts)
    for alias in contract.get("required_dependency_aliases", []):
        if alias not in skill_text:
            errors.append(f"required dependency alias is not operative in a runtime skill: {alias}")
    for phrase in contract.get("required_runtime_phrases", []):
        if phrase not in skill_text:
            errors.append(f"required runtime phrase is not operative: {phrase}")
    for phrase in contract.get("forbidden_runtime_phrases", []):
        if phrase in skill_text:
            errors.append(f"forbidden runtime phrase remains: {phrase}")
    for name in contract.get("required_schemas", []):
        path = root / "schemas" / name
        if not path.is_file():
            errors.append(f"missing schema: {name}")
            continue
        schema = load_json(path)
        if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema" or schema.get("type") != "object":
            errors.append(f"{name}: unsupported or incomplete schema declaration")

    cases_doc = load_json(root / "evals" / "cases.json")
    if cases_doc.get("schema_version") != 2:
        errors.append("evaluation suite schema_version must be 2")
    if not all(
        isinstance(cases_doc.get(field), str) and cases_doc.get(field)
        for field in ("suite_id", "corpus_version", "split_id", "subject_adapter")
    ):
        errors.append("evaluation suite identity, corpus, split, and subject adapter are required")
    adapter = cases_doc.get("execution_adapter", {})
    models = contract.get("models", {})
    target_invocations = adapter.get("target_invocations")
    if (
        adapter.get("id") != "cascade-evals-agent-runner-v1"
        or adapter.get("runner") != "cascade-evals/scripts/run_agent_evaluation.py"
        or adapter.get("model") != models.get("target")
        or adapter.get("reasoning_effort") != models.get("reasoning_effort")
        or not isinstance(target_invocations, int)
        or isinstance(target_invocations, bool)
        or not 1 <= target_invocations <= contract.get("expected_case_count", 0)
        or adapter.get("target_batching") != "contiguous-balanced-parallel-v1"
        or adapter.get("case_count") != contract.get("expected_case_count")
    ):
        errors.append("execution adapter is not bound to target model, reasoning effort, batching, and case count")
    packet_contract = cases_doc.get("packet_contract", {})
    if packet_contract.get("target_fields") != ["case_id", "request", "fixture"]:
        errors.append("target packet fields are invalid")
    if packet_contract.get("sealed_fields") != ["skill", "expected_status", "oracle", "mechanical_assertions"]:
        errors.append("sealed packet fields are invalid")
    assertion_catalog = cases_doc.get("assertion_catalog", {})
    if not isinstance(assertion_catalog, dict) or not assertion_catalog:
        errors.append("mechanical assertion catalog is required")
        assertion_catalog = {}
    elif set(assertion_catalog) != {"status_matches_expected", "selected_skill_matches_expected"}:
        errors.append("status and selected-skill routing are the only permitted mechanical assertions")
    for assertion_id, assertion in assertion_catalog.items():
        if not isinstance(assertion, dict) or not all(
            isinstance(assertion.get(field), str) and assertion.get(field)
            for field in ("input_identity", "deterministic_rule", "evidence_identity", "failure_status", "repair_owner")
        ):
            errors.append(f"mechanical assertion is incomplete: {assertion_id}")
    cases = cases_doc.get("cases", [])
    expected_count = contract.get("expected_case_count")
    if not isinstance(cases, list) or len(cases) != expected_count:
        errors.append(f"evaluation suite must contain exactly {expected_count} cases")
        cases = []
    if cases_doc.get("split_membership") != [case.get("case_id") for case in cases]:
        errors.append("split_membership must list every case exactly once in execution order")
    seen_ids: set[str] = set()
    categories: set[str] = set()
    skill_counts = {skill: 0 for skill in expected}
    for case in cases:
        if not isinstance(case, dict):
            errors.append("case is not an object")
            continue
        case_id = case.get("case_id")
        if not isinstance(case_id, str) or case_id in seen_ids:
            errors.append(f"invalid or duplicate case_id: {case_id}")
        else:
            seen_ids.add(case_id)
        if case.get("skill") not in expected:
            errors.append(f"{case_id}: unknown skill")
        else:
            skill_counts[case["skill"]] += 1
        categories.add(str(case.get("category", "")))
        if not all(isinstance(case.get(field), str) and case.get(field) for field in ("request", "oracle")):
            errors.append(f"{case_id}: request and oracle are required")
        if case.get("expected_status") not in {"READY", "GAP", "BLOCKED", "INVALID", "NOT_RUN", "ABSTAIN", "PROPOSED", "PENDING_APPROVAL", "APPROVED"}:
            errors.append(f"{case_id}: invalid expected_status")
        assertions = case.get("mechanical_assertions")
        if not isinstance(assertions, list) or not assertions or any(not isinstance(item, str) or not item for item in assertions):
            errors.append(f"{case_id}: mechanical_assertions are required")
        elif set(assertions) - set(assertion_catalog):
            errors.append(f"{case_id}: undefined mechanical assertions: {sorted(set(assertions) - set(assertion_catalog))}")
        elif assertions != ["status_matches_expected", "selected_skill_matches_expected"]:
            errors.append(f"{case_id}: semantic checks must be delegated to independent judges, not mechanical assertions")
        fixture = case.get("fixture")
        if not isinstance(fixture, dict) or set(fixture) != {"supplied", "absent", "permissions", "data"}:
            errors.append(f"{case_id}: fixture contract is incomplete")
        elif (
            not isinstance(fixture.get("supplied"), list)
            or not isinstance(fixture.get("absent"), list)
            or not isinstance(fixture.get("permissions"), dict)
            or not isinstance(fixture.get("data"), dict)
        ):
            errors.append(f"{case_id}: fixture fields have invalid types")
    missing_categories = set(contract.get("required_case_categories", [])) - categories
    if missing_categories:
        errors.append(f"missing case categories: {sorted(missing_categories)}")
    for skill, count in skill_counts.items():
        if count < 3:
            errors.append(f"{skill}: at least three cases are required")

    profiles = sorted((root / "evals").glob("judge-*.json"))
    if len(profiles) < 2:
        errors.append("at least two independent judge profiles are required")
    for path in profiles:
        profile = load_json(path)
        if profile.get("model") != contract.get("models", {}).get("judge"):
            errors.append(f"{path.name}: judge model mismatch")
        if profile.get("threshold") != contract.get("acceptance_threshold"):
            errors.append(f"{path.name}: threshold mismatch")
        if profile.get("minimum_dimension") != contract.get("minimum_dimension"):
            errors.append(f"{path.name}: dimension floor mismatch")
        dimensions = profile.get("dimensions", [])
        if not dimensions or abs(sum(float(item.get("weight", 0)) for item in dimensions) - 1.0) > 1e-9:
            errors.append(f"{path.name}: dimension weights must sum to 1")
        for item in dimensions:
            anchors = item.get("anchors", {})
            if set(anchors) != {"0", "1", "2", "3", "4"}:
                errors.append(f"{path.name}: each dimension needs anchors 0 through 4")

    manifest_path = root / contract.get("evaluation_manifest", "evals/manifest.json")
    if not manifest_path.is_file():
        errors.append("missing evaluation asset manifest")
    else:
        asset_manifest = load_json(manifest_path)
        errors.extend(verify_manifest(root, asset_manifest))
    return errors


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    errors = validate(root)
    print(json.dumps({"plugin": root.name, "status": "PASS" if not errors else "FAIL", "errors": errors}, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
