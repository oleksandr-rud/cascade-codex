#!/usr/bin/env python3
"""Validate the Cascade QA package."""

from __future__ import annotations

import json
import re
from pathlib import Path
import sys
from typing import Any

from jsonschema import Draft202012Validator

from refresh_manifest import verify as verify_manifest


ROOT = Path(__file__).resolve().parents[1]
EXPECTED_SKILLS = {"plan-quality", "design-tests", "assess-quality", "triage-defects"}
EXPECTED_ASSERTIONS = {"status_matches_expected", "selected_skill_matches_expected", "qa_artifact_validates"}
SEMVER = re.compile(r"^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")
FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)


def load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"JSON root must be an object: {path}")
    return value


def validate(root: Path = ROOT) -> list[str]:
    errors: list[str] = []
    plugin = load(root / ".codex-plugin" / "plugin.json")
    contract = load(root / "evals" / "evaluation-contract.json")
    version = str(plugin.get("version", ""))
    if plugin.get("name") != "cascade-qa" or contract.get("plugin_id") != plugin.get("name"):
        errors.append("plugin identity is inconsistent")
    if not SEMVER.fullmatch(version) or contract.get("version") != version:
        errors.append("plugin version is invalid or not evaluation-bound")
    if plugin.get("skills") != "./skills/":
        errors.append("plugin skills path must be ./skills/")
    prompts = plugin.get("interface", {}).get("defaultPrompt")
    if not isinstance(prompts, list) or not 1 <= len(prompts) <= 3 or any(not isinstance(item, str) or not item or len(item) > 128 for item in prompts):
        errors.append("defaultPrompt must contain one to three concise prompts")

    actual = {path.parent.name for path in (root / "skills").glob("*/SKILL.md")}
    if actual != EXPECTED_SKILLS or set(contract.get("expected_skills", [])) != EXPECTED_SKILLS:
        errors.append(f"skill set mismatch: {sorted(actual)}")
    runtime_parts: list[str] = []
    for skill in sorted(EXPECTED_SKILLS):
        skill_path = root / "skills" / skill / "SKILL.md"
        agent_path = root / "skills" / skill / "agents" / "openai.yaml"
        if not skill_path.is_file() or not agent_path.is_file():
            errors.append(f"{skill}: missing runtime or agent metadata")
            continue
        text = skill_path.read_text(encoding="utf-8")
        runtime_parts.append(text)
        match = FRONTMATTER.search(text)
        if not match or f"name: {skill}" not in match.group(1) or "description:" not in match.group(1):
            errors.append(f"{skill}: invalid frontmatter")
        if f"${skill}" not in agent_path.read_text(encoding="utf-8"):
            errors.append(f"{skill}: default prompt must invoke the skill")
        if ".codex/skills/" in text:
            errors.append(f"{skill}: runtime depends on a host skill path")
    runtime = "\n".join(runtime_parts)
    for phrase in contract.get("required_runtime_phrases", []):
        if phrase not in runtime:
            errors.append(f"required runtime phrase is missing: {phrase}")
    for phrase in contract.get("forbidden_runtime_phrases", []):
        if phrase in runtime:
            errors.append(f"forbidden runtime phrase remains: {phrase}")

    schema = load(root / "schemas" / "qa-artifact.schema.json")
    try:
        Draft202012Validator.check_schema(schema)
    except Exception as error:
        errors.append(f"artifact schema is invalid: {error}")
    models = contract.get("models", {})
    if any(models.get(role) != "gpt-6-astra" for role in ("builder", "target", "judge")) or models.get("reasoning_effort") != "high" or models.get("explicit_comparison_override") is not False:
        errors.append("model matrix must use explicit gpt-6-astra high")
    if contract.get("acceptance_threshold") != 0.95 or contract.get("minimum_dimension") != 3:
        errors.append("acceptance policy must be 0.95 with dimension floor 3")

    suite = load(root / "evals" / "cases.json")
    cases = suite.get("cases", [])
    if suite.get("schema_version") != 2 or len(cases) != 12 or len(cases) != contract.get("expected_case_count"):
        errors.append("evaluation suite identity or case count is invalid")
    if suite.get("split_membership") != [case.get("case_id") for case in cases]:
        errors.append("split_membership must list cases in order")
    if set(suite.get("assertion_catalog", {})) != EXPECTED_ASSERTIONS:
        errors.append("mechanical assertion catalog is incomplete")
    adapter = suite.get("execution_adapter", {})
    if adapter.get("model") != "gpt-6-astra" or adapter.get("reasoning_effort") != "high" or adapter.get("case_count") != 12 or adapter.get("target_invocations") != 4:
        errors.append("execution adapter model or batching is invalid")
    counts = {skill: 0 for skill in EXPECTED_SKILLS}
    ids: set[str] = set()
    categories: set[str] = set()
    for case in cases:
        case_id = case.get("case_id")
        if not isinstance(case_id, str) or case_id in ids:
            errors.append(f"duplicate or invalid case ID: {case_id}")
        ids.add(str(case_id))
        skill = case.get("skill")
        if skill in counts:
            counts[skill] += 1
        else:
            errors.append(f"{case_id}: unknown skill")
        categories.add(str(case.get("category", "")))
        if case.get("mechanical_assertions") != ["status_matches_expected", "selected_skill_matches_expected", "qa_artifact_validates"]:
            errors.append(f"{case_id}: assertion set is incomplete")
        output = case.get("fixture", {}).get("output_contract", {})
        if output.get("response_encoding") != "json" or output.get("schema") != "schemas/qa-artifact.schema.json" or output.get("artifact_status_contract") != "Domain status is the serialized response artifact.status; outer case status is transport-only.":
            errors.append(f"{case_id}: typed output contract is invalid")
    if any(count != 3 for count in counts.values()):
        errors.append(f"every skill needs exactly three cases: {counts}")
    missing = set(contract.get("required_case_categories", [])) - categories
    if missing:
        errors.append(f"missing case categories: {sorted(missing)}")

    profiles = sorted((root / "evals").glob("judge-*.json"))
    if len(profiles) != 2:
        errors.append("exactly two judge profiles are required")
    for path in profiles:
        profile = load(path)
        dimensions = profile.get("dimensions", [])
        if profile.get("model") != "gpt-6-astra" or profile.get("threshold") != 0.95 or profile.get("minimum_dimension") != 3:
            errors.append(f"{path.name}: policy mismatch")
        if not dimensions or abs(sum(float(item.get("weight", 0)) for item in dimensions) - 1.0) > 1e-9 or any(set(item.get("anchors", {})) != {"0", "1", "2", "3", "4"} for item in dimensions):
            errors.append(f"{path.name}: rubric dimensions are invalid")

    extraction = load(root / "specs" / "extraction-manifest.json")
    artifacts = extraction.get("artifacts", [])
    if extraction.get("schema_version") != 1 or not re.fullmatch(r"[a-f0-9]{40}", str(extraction.get("source_revision", ""))) or not artifacts:
        errors.append("extraction manifest is invalid")
    for item in artifacts:
        if not re.fullmatch(r"[a-f0-9]{64}", str(item.get("sha256", ""))) or not item.get("capabilities"):
            errors.append(f"extraction entry is incomplete: {item.get('path')}")

    manifest_path = root / "evals" / "manifest.json"
    if manifest_path.is_file():
        errors.extend(verify_manifest(root, load(manifest_path)))
    else:
        errors.append("missing evals/manifest.json")
    return sorted(set(errors))


def main() -> int:
    try:
        errors = validate()
    except (OSError, ValueError, json.JSONDecodeError) as error:
        errors = [str(error)]
    print(json.dumps({"status": "PASS" if not errors else "FAIL", "errors": errors}, indent=2))
    return 0 if not errors else 2


if __name__ == "__main__":
    sys.exit(main())
