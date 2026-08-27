#!/usr/bin/env python3

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ADAPTER = load_module("evaluate_case_assertions", ROOT / "scripts" / "evaluate_case_assertions.py")
FIXTURES = load_module("artifact_fixtures", ROOT / "scripts" / "test_artifact_contracts.py")


class CaseAssertionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.suite = json.loads((ROOT / "evals" / "cases.json").read_text(encoding="utf-8"))
        factories = {
            "codebase-audit": FIXTURES.codebase_artifact,
            "auth-analysis": FIXTURES.auth_artifact,
            "secure-design": FIXTURES.design_artifact,
        }
        cases = []
        for case in self.suite["cases"]:
            artifact = factories[case["skill"]](case["expected_status"])
            cases.append({
                "case_id": case["case_id"],
                "selected_skill": case["skill"],
                "status": case["expected_status"],
                "response": json.dumps(artifact, separators=(",", ":")),
                "signals": {"contract_compliance": "PASS"},
                "evidence": ["typed security artifact"],
            })
        self.target = {
            "schema_version": 2,
            "evaluation_id": "test-evaluation",
            "subject_digest": "a" * 64,
            "cases": cases,
        }

    def test_complete_valid_target_passes_mechanical_eligibility(self) -> None:
        receipt = ADAPTER.evaluate(self.suite, self.target)
        self.assertEqual(receipt["status"], "PASS")
        self.assertEqual(receipt["semantic_status"], "NOT_RUN")
        self.assertEqual(receipt["case_count"], 9)

    def test_route_mismatch_is_invalid(self) -> None:
        self.target["cases"][0]["selected_skill"] = "auth-analysis"
        receipt = ADAPTER.evaluate(self.suite, self.target)
        self.assertEqual(receipt["status"], "INVALID")
        self.assertTrue(any(item["assertion_id"] == "selected_skill_matches_expected" and item["status"] == "FAIL" for item in receipt["findings"]))

    def test_malformed_artifact_is_invalid(self) -> None:
        self.target["cases"][0]["response"] = "not json"
        receipt = ADAPTER.evaluate(self.suite, self.target)
        self.assertEqual(receipt["status"], "INVALID")
        self.assertTrue(any(item["assertion_id"] == "security_artifact_validates" and item["status"] == "FAIL" for item in receipt["findings"]))


if __name__ == "__main__":
    unittest.main()
