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
            "ux-flow-review": FIXTURES.ux_artifact,
            "accessibility-review": FIXTURES.accessibility_artifact,
            "visual-qa": FIXTURES.visual_artifact,
            "design-system": FIXTURES.design_system_artifact,
            "create-design": FIXTURES.design_creation_artifact,
        }
        cases = []
        for case in self.suite["cases"]:
            artifact = factories[case["skill"]]()
            artifact["artifact_id"] = f"DES-{case['case_id'].replace('DES-', '')}-TEST"
            artifact["status"] = case["expected_status"]
            if case["expected_status"] != "READY":
                artifact["findings"][0]["classification"] = "gap"
                if case["skill"] == "ux-flow-review":
                    artifact["scope"]["actor"] = None
                    artifact["scope"]["job"] = None
                    artifact["coverage"]["entry_point"] = None
                    artifact["coverage"]["completion_signal"] = None
                elif case["skill"] == "visual-qa":
                    artifact["coverage"]["expected_source_id"] = None
                    artifact["coverage"]["matrix"][0]["status"] = "GAP"
                elif case["skill"] == "design-system":
                    artifact["coverage"]["rule_type"] = "gap"
                    artifact["coverage"]["reuse_evidence"] = []
            cases.append({
                "case_id": case["case_id"],
                "selected_skill": case["skill"],
                "status": case["expected_status"],
                "response": json.dumps(artifact, separators=(",", ":")),
                "signals": {"contract_compliance": "PASS"},
                "evidence": ["typed design artifact"],
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
        self.assertEqual(receipt["case_count"], 19)

    def test_route_mismatch_is_invalid(self) -> None:
        self.target["cases"][0]["selected_skill"] = "visual-qa"
        receipt = ADAPTER.evaluate(self.suite, self.target)
        self.assertEqual(receipt["status"], "INVALID")
        self.assertTrue(any(item["assertion_id"] == "selected_skill_matches_expected" and item["status"] == "FAIL" for item in receipt["findings"]))

    def test_malformed_artifact_is_invalid(self) -> None:
        self.target["cases"][0]["response"] = "not json"
        receipt = ADAPTER.evaluate(self.suite, self.target)
        self.assertEqual(receipt["status"], "INVALID")
        self.assertTrue(any(item["assertion_id"] == "design_artifact_validates" and item["status"] == "FAIL" for item in receipt["findings"]))


if __name__ == "__main__":
    unittest.main()
