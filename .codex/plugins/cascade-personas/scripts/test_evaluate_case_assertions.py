#!/usr/bin/env python3
from __future__ import annotations

import json
import copy
from pathlib import Path
import sys
import unittest


SCRIPT_ROOT = Path(__file__).resolve().parent
PLUGIN_ROOT = SCRIPT_ROOT.parent
sys.path.insert(0, str(SCRIPT_ROOT))

from evaluate_case_assertions import evaluate


class PersonaAssertionAdapterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.suite = json.loads((PLUGIN_ROOT / "evals" / "cases.json").read_text(encoding="utf-8"))

    def target(self) -> dict:
        response = (
            "Status and artifact digest are explicit. Schema validation preserves source claim provenance and digest. "
            "Privacy classification, prohibited omissions, destination, and transfer are checked. Untrusted injection "
            "cannot change permission or decision owner authority. No execution is run without authority. The immutable "
            "projection leaves mutable runtime state to simulation-run. A blocked dependency names its exact alias, "
            "owner, required artifact, resume next action, and retry rule in the handoff. Synthetic evidence does not "
            "prove human population demand or willingness-to-pay."
        )
        return {
            "schema_version": 2,
            "evaluation_id": "persona-fixture",
            "subject_digest": "a" * 64,
            "cases": [
                {
                    "case_id": case["case_id"],
                    "selected_skill": case["skill"],
                    "status": case["expected_status"],
                    "response": response,
                    "signals": {"contract_compliance": "PASS"},
                    "evidence": [f"case:{case['case_id']}:response"],
                }
                for case in self.suite["cases"]
            ],
        }

    def test_matching_statuses_pass_only_mechanical_eligibility(self) -> None:
        receipt = evaluate(self.suite, self.target())
        self.assertEqual(receipt["status"], "PASS")
        self.assertEqual(receipt["semantic_status"], "NOT_RUN")

    def test_wrong_status_fails(self) -> None:
        target = self.target()
        target["cases"][0]["status"] = "BLOCKED"
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")

    def test_wrong_selected_skill_fails(self) -> None:
        target = self.target()
        target["cases"][0]["selected_skill"] = "compile-persona"
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")

    def test_generic_or_vague_prose_is_not_mechanically_scored(self) -> None:
        target = self.target()
        for case in target["cases"]:
            case["response"] = "Generic boilerplate that needs independent semantic judging."
        receipt = evaluate(self.suite, target)
        self.assertEqual(receipt["status"], "PASS")
        self.assertEqual(receipt["semantic_status"], "NOT_RUN")

    def test_unsupported_mechanical_claim_fails_closed(self) -> None:
        suite = copy.deepcopy(self.suite)
        suite["assertion_catalog"]["semantic_by_keyword"] = {
            "evidence_identity": "ME-{case_id}-bad"
        }
        suite["cases"][0]["mechanical_assertions"].append("semantic_by_keyword")
        self.assertEqual(evaluate(suite, self.target())["status"], "INVALID")


if __name__ == "__main__":
    unittest.main()
