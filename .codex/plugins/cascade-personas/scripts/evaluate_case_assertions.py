#!/usr/bin/env python3
"""Apply only deterministic case-suite eligibility assertions.

Semantic correctness is intentionally NOT_RUN here and belongs to the two
independent Cascade Evals judges. Prose or self-reported signals never satisfy
mechanical eligibility.
"""

from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Any

from validate_artifact import strict_json_file


SUPPORTED_ASSERTIONS = {"status_matches_expected", "selected_skill_matches_expected"}


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
            "observed": f"unsupported mechanical assertions: {sorted(unsupported)}",
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
        for assertion_id in case["mechanical_assertions"]:
            assertion = catalog.get(assertion_id, {})
            if assertion_id == "status_matches_expected":
                ok = actual.get("status") == case["expected_status"]
                observed = f"status={actual.get('status')} expected={case['expected_status']}"
            elif assertion_id == "selected_skill_matches_expected":
                ok = actual.get("selected_skill") == case.get("skill")
                observed = f"selected_skill={actual.get('selected_skill')} expected={case.get('skill')}"
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
    suite = strict_json_file(Path(argv[0]))
    target = strict_json_file(Path(argv[1]))
    receipt = evaluate(suite, target)
    print(json.dumps(receipt, indent=2, sort_keys=True))
    return 0 if receipt["status"] == "PASS" else 2


if __name__ == "__main__":
    sys.exit(main())
