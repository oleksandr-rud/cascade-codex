#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest


SCRIPT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_ROOT))

from reduce_evaluation import ContractError, reduce_bundle
from validate_judge import validate_profile, validate_response


def profile(profile_id: str, role: str) -> dict:
    anchors = {str(index): f"anchor {index}" for index in range(5)}
    return {
        "schema_version": 1,
        "profile_id": profile_id,
        "version": 1,
        "role": role,
        "decision": "whether the subject meets the declared contract",
        "population": "the selected versioned cases",
        "model": "gpt-5.6-sol",
        "threshold": 0.8,
        "minimum_dimension": 2,
        "dimensions": [
            {"dimension_id": "contract-fit", "description": "Fits the contract", "weight": 0.5, "anchors": anchors},
            {"dimension_id": "evidence-use", "description": "Uses evidence", "weight": 0.5, "anchors": anchors},
        ],
        "blindness": ["expected answer", "peer judgment"],
    }


def response(evaluation_id: str, digest: str, judge: str, context: str, profile_value: dict, ratings: tuple[int, int] = (4, 4)) -> dict:
    verdict = "PASS" if min(ratings) >= 2 and sum(ratings) / 8 >= profile_value["threshold"] else "FAIL"
    return {
        "schema_version": 1,
        "evaluation_id": evaluation_id,
        "subject_digest": digest,
        "profile_id": profile_value["profile_id"],
        "profile_version": profile_value["version"],
        "judge_identity": judge,
        "judge_context_id": context,
        "ratings": [
            {"dimension_id": "contract-fit", "rating": ratings[0], "evidence": ["artifact:1"], "rationale": "grounded"},
            {"dimension_id": "evidence-use", "rating": ratings[1], "evidence": ["artifact:2"], "rationale": "grounded"},
        ],
        "verdict": verdict,
        "leakage_check": "PASS",
    }


class EvaluationContractsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.artifact = self.root / "trace.json"
        self.artifact.write_text('{"status":"complete"}\n', encoding="utf-8")
        self.digest = hashlib.sha256(b"subject").hexdigest()
        self.evidence_digest = hashlib.sha256(self.artifact.read_bytes()).hexdigest()

    def bundle(self) -> dict:
        outcome = profile("outcome-v1", "outcome")
        trajectory = profile("trajectory-v1", "trajectory")
        evaluation_id = "eval-fixture-v1"
        return {
            "schema_version": 1,
            "evaluation_id": evaluation_id,
            "subject": {"kind": "agent", "id": "fixture-agent", "version": "1", "digest": self.digest},
            "models": {
                "builder_model": "gpt-5.6-sol",
                "builder_reasoning_effort": "max",
                "target_model": "gpt-5.6-sol",
                "target_reasoning_effort": "max",
                "judge_model": "gpt-5.6-sol",
                "judge_reasoning_effort": "max",
            },
            "mechanical_status": "PASS",
            "evidence_root": str(self.root),
            "evidence": [{"path": "trace.json", "sha256": self.evidence_digest}],
            "required_profile_ids": ["outcome-v1", "trajectory-v1"],
            "judgments": [
                {"profile": outcome, "response": response(evaluation_id, self.digest, "judge-outcome", "context-outcome", outcome)},
                {"profile": trajectory, "response": response(evaluation_id, self.digest, "judge-trajectory", "context-trajectory", trajectory)},
            ],
        }

    def test_profile_and_response_recompute(self) -> None:
        value = profile("outcome-v1", "outcome")
        validate_profile(value)
        result = validate_response(value, response("e", self.digest, "j", "c", value))
        self.assertEqual(result["score"], 1.0)
        self.assertTrue(result["passed"])

    def test_reducer_passes_two_independent_judges(self) -> None:
        receipt = reduce_bundle(self.bundle())
        self.assertEqual(receipt["overall_status"], "PASS")
        self.assertEqual(receipt["conservative_score"], 1.0)

    def test_reducer_fails_closed_on_evidence_drift(self) -> None:
        bundle = self.bundle()
        bundle["evidence"][0]["sha256"] = "0" * 64
        with self.assertRaises(ContractError):
            reduce_bundle(bundle)

    def test_reducer_rejects_same_judge_context(self) -> None:
        bundle = self.bundle()
        bundle["judgments"][1]["response"]["judge_context_id"] = "context-outcome"
        with self.assertRaises(ContractError):
            reduce_bundle(bundle)

    def test_sol_max_is_required_unless_comparison_is_explicit(self) -> None:
        bundle = self.bundle()
        bundle["models"]["judge_model"] = "gpt-5.6-terra"
        with self.assertRaises(ContractError):
            reduce_bundle(bundle)
        bundle["models"]["explicit_comparison"] = True
        for judgment in bundle["judgments"]:
            judgment["profile"]["model"] = "gpt-5.6-terra"
        self.assertEqual(reduce_bundle(bundle)["overall_status"], "PASS")

    def test_receipt_preserves_explicit_sol_max_configuration(self) -> None:
        bundle = self.bundle()
        bundle["models"] = {
            "builder_model": "gpt-5.6-sol",
            "builder_reasoning_effort": "max",
            "target_model": "gpt-5.6-sol",
            "target_reasoning_effort": "max",
            "judge_model": "gpt-5.6-sol",
            "judge_reasoning_effort": "max",
            "explicit_comparison": False,
        }
        for judgment in bundle["judgments"]:
            judgment["profile"]["model"] = "gpt-5.6-sol"
        receipt = reduce_bundle(bundle)
        self.assertEqual(receipt["models"]["judge_reasoning_effort"], "max")

    def test_reducer_rejects_missing_reasoning_effort(self) -> None:
        bundle = self.bundle()
        del bundle["models"]["judge_reasoning_effort"]
        with self.assertRaises(ContractError):
            reduce_bundle(bundle)

    def test_mechanical_failure_cannot_run_judges(self) -> None:
        bundle = self.bundle()
        bundle["mechanical_status"] = "INVALID"
        with self.assertRaises(ContractError):
            reduce_bundle(bundle)
        bundle["judgments"] = []
        self.assertEqual(reduce_bundle(bundle)["overall_status"], "INVALID")


if __name__ == "__main__":
    unittest.main()
