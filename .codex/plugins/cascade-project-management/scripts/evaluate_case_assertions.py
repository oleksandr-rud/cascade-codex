#!/usr/bin/env python3
"""Mechanical eligibility adapter for Project Management evaluations."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("validate_artifact", ROOT / "scripts" / "validate_artifact.py")
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("unable to load project artifact validator")
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)
SCHEMA = VALIDATOR.read_json(ROOT / "schemas" / "project-management-artifact.schema.json")
SUPPORTED = {"status_matches_expected", "selected_skill_matches_expected", "project_artifact_validates"}


def parse_response(actual: dict[str, Any]) -> tuple[dict[str, Any] | None, list[str]]:
    response = actual.get("response")
    if not isinstance(response, str) or not response:
        return None, ["response is not a non-empty JSON string"]
    try:
        value = json.loads(response, object_pairs_hook=VALIDATOR.strict_object)
    except (json.JSONDecodeError, ValueError) as error:
        return None, [f"response JSON is invalid: {error}"]
    return (value, []) if isinstance(value, dict) else (None, ["response JSON must be one object"])


def evaluate(suite: dict[str, Any], target: dict[str, Any]) -> dict[str, Any]:
    expected = suite.get("cases", [])
    actual = target.get("cases", [])
    actual_by_id = {item.get("case_id"): item for item in actual if isinstance(item, dict) and isinstance(item.get("case_id"), str)}
    findings: list[dict[str, Any]] = []
    passed = len(actual) == len(expected) == len(actual_by_id) and not (set(suite.get("assertion_catalog", {})) - SUPPORTED)
    for case in expected:
        case_id = case["case_id"]
        result = actual_by_id.get(case_id)
        if result is None:
            passed = False
            findings.append({"case_id": case_id, "assertion_id": "case_result_present", "status": "FAIL", "evidence_identity": f"ME-{case_id}-result", "observed": "missing case result"})
            continue
        artifact, parse_errors = parse_response(result)
        for assertion_id in case["mechanical_assertions"]:
            if assertion_id == "status_matches_expected":
                ok = artifact is not None and artifact.get("status") == case["expected_status"]
                observed = (
                    f"artifact.status={artifact.get('status')} expected={case['expected_status']}"
                    if artifact is not None
                    else "; ".join(parse_errors)
                )
            elif assertion_id == "selected_skill_matches_expected":
                ok = result.get("selected_skill") == case["skill"]
                observed = f"selected_skill={result.get('selected_skill')} expected={case['skill']}"
            elif assertion_id == "project_artifact_validates":
                errors = list(parse_errors)
                if artifact is not None:
                    errors.extend(VALIDATOR.validate_artifact(SCHEMA, artifact))
                    if artifact.get("selected_skill") != case["skill"]:
                        errors.append("artifact selected_skill does not match sealed skill")
                    required = case.get("fixture", {}).get("output_contract", {}).get("required_response_fields", [])
                    errors.extend(f"artifact is missing required field: {field}" for field in required if field not in artifact)
                ok = not errors
                observed = "schema+cross-field=PASS" if ok else "; ".join(sorted(set(errors)))
            else:
                ok, observed = False, "unsupported assertion"
            passed = passed and ok
            finding = suite["assertion_catalog"].get(assertion_id, {})
            findings.append({"case_id": case_id, "assertion_id": assertion_id, "status": "PASS" if ok else "FAIL", "evidence_identity": finding.get("evidence_identity", "ME-{case_id}-unsupported").replace("{case_id}", case_id), "observed": observed})
    return {"schema_version": 1, "evaluation_id": target.get("evaluation_id"), "subject_digest": target.get("subject_digest"), "status": "PASS" if passed else "INVALID", "semantic_status": "NOT_RUN", "semantic_owner": "cascade-evals:independent-judges", "case_count": len(expected), "findings": findings}


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) != 2:
        print("usage: evaluate_case_assertions.py CASES.json TARGET_OUTPUT.json", file=sys.stderr)
        return 2
    receipt = evaluate(VALIDATOR.read_json(Path(argv[0])), VALIDATOR.read_json(Path(argv[1])))
    print(json.dumps(receipt, indent=2, sort_keys=True))
    return 0 if receipt["status"] == "PASS" else 2


if __name__ == "__main__":
    sys.exit(main())
