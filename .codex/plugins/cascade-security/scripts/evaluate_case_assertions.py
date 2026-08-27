#!/usr/bin/env python3
"""Mechanical eligibility adapter for Cascade Security evaluations."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
VALIDATOR_SPEC = importlib.util.spec_from_file_location("validate_artifact", ROOT / "scripts" / "validate_artifact.py")
if VALIDATOR_SPEC is None or VALIDATOR_SPEC.loader is None:
    raise RuntimeError("unable to load security artifact validator")
VALIDATOR = importlib.util.module_from_spec(VALIDATOR_SPEC)
VALIDATOR_SPEC.loader.exec_module(VALIDATOR)
SCHEMA = VALIDATOR.read_json(ROOT / "schemas" / "security-review.schema.json")

SUPPORTED_ASSERTIONS = {
    "status_matches_expected",
    "selected_skill_matches_expected",
    "security_artifact_validates",
}


def parse_response(actual: dict[str, Any]) -> tuple[dict[str, Any] | None, list[str]]:
    response = actual.get("response")
    if not isinstance(response, str) or not response:
        return None, ["response is not a non-empty JSON string"]
    try:
        value = json.loads(response, object_pairs_hook=VALIDATOR.strict_object)
    except (json.JSONDecodeError, ValueError) as error:
        return None, [f"response JSON is invalid: {error}"]
    if not isinstance(value, dict):
        return None, ["response JSON must be one object"]
    return value, []


def artifact_errors(case: dict[str, Any], artifact: dict[str, Any]) -> list[str]:
    errors = list(VALIDATOR.validate_artifact(SCHEMA, artifact))
    if artifact.get("selected_skill") != case.get("skill"):
        errors.append("artifact selected_skill does not match sealed expected skill")
    if artifact.get("status") != case.get("expected_status"):
        errors.append("artifact status does not match sealed expected status")
    required = case.get("fixture", {}).get("output_contract", {}).get("required_response_fields", [])
    missing = [field for field in required if field not in artifact]
    if missing:
        errors.append(f"artifact is missing required response fields: {missing}")
    return sorted(set(errors))


def evaluate(suite: dict[str, Any], target_output: dict[str, Any]) -> dict[str, Any]:
    catalog = suite.get("assertion_catalog", {})
    expected_cases = suite.get("cases", [])
    actual_cases = target_output.get("cases", [])
    actual_by_id = {
        item.get("case_id"): item
        for item in actual_cases
        if isinstance(item, dict) and isinstance(item.get("case_id"), str)
    }
    findings: list[dict[str, Any]] = []
    passed = len(actual_cases) == len(expected_cases) == len(actual_by_id)

    unsupported = set(catalog) - SUPPORTED_ASSERTIONS
    if unsupported:
        passed = False
        findings.append({
            "case_id": "suite",
            "assertion_id": "unsupported_assertions",
            "status": "FAIL",
            "evidence_identity": "ME-suite-unsupported",
            "observed": f"unsupported assertions: {sorted(unsupported)}",
        })

    for case in expected_cases:
        case_id = case["case_id"]
        actual = actual_by_id.get(case_id)
        if actual is None:
            passed = False
            findings.append({
                "case_id": case_id,
                "assertion_id": "case_result_present",
                "status": "FAIL",
                "evidence_identity": f"ME-{case_id}-result",
                "observed": "missing case result",
            })
            continue
        artifact, parse_errors = parse_response(actual)
        for assertion_id in case["mechanical_assertions"]:
            assertion = catalog.get(assertion_id, {})
            if assertion_id == "status_matches_expected":
                ok = actual.get("status") == case["expected_status"]
                observed = f"status={actual.get('status')} expected={case['expected_status']}"
            elif assertion_id == "selected_skill_matches_expected":
                ok = actual.get("selected_skill") == case["skill"]
                observed = f"selected_skill={actual.get('selected_skill')} expected={case['skill']}"
            elif assertion_id == "security_artifact_validates":
                errors = parse_errors if artifact is None else parse_errors + artifact_errors(case, artifact)
                ok = not errors
                observed = "schema+cross-field=PASS" if ok else "; ".join(errors)
            else:
                ok = False
                observed = "unsupported mechanical assertion"
            passed = passed and ok
            findings.append({
                "case_id": case_id,
                "assertion_id": assertion_id,
                "status": "PASS" if ok else "FAIL",
                "evidence_identity": assertion.get("evidence_identity", "ME-{case_id}-unsupported").replace("{case_id}", case_id),
                "observed": observed,
            })

    return {
        "schema_version": 1,
        "evaluation_id": target_output.get("evaluation_id"),
        "subject_digest": target_output.get("subject_digest"),
        "status": "PASS" if passed else "INVALID",
        "semantic_status": "NOT_RUN",
        "semantic_owner": "cascade-evals:independent-judges",
        "case_count": len(expected_cases),
        "findings": findings,
    }


def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[1:]
    if len(argv) != 2:
        print("usage: evaluate_case_assertions.py CASES.json TARGET_OUTPUT.json", file=sys.stderr)
        return 2
    suite = VALIDATOR.read_json(Path(argv[0]))
    target = VALIDATOR.read_json(Path(argv[1]))
    receipt = evaluate(suite, target)
    print(json.dumps(receipt, indent=2, sort_keys=True))
    return 0 if receipt["status"] == "PASS" else 2


if __name__ == "__main__":
    sys.exit(main())
