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

from build_blind_packets import EXCLUDED_FIELDS, build_packets
from validate_judge import ContractError


def suite() -> dict:
    return {
        "schema_version": 2,
        "suite_id": "fixture-suite",
        "split_id": "qualification-v1",
        "split_membership": ["CASE-001"],
        "packet_contract": {
            "target_fields": ["case_id", "request", "fixture"],
            "sealed_fields": ["skill", "expected_status", "oracle", "mechanical_assertions"],
            "judge_builder": "cascade-evals/scripts/build_blind_packets.py",
            "judge_schema": "cascade-evals/skills/evaluate/references/judge-packet.schema.json",
        },
        "cases": [
            {
                "case_id": "CASE-001",
                "skill": "fixture-skill",
                "request": "Perform the bounded task.",
                "fixture": {"supplied": ["request"], "permissions": {"external_write": False}},
                "expected_status": "READY",
                "oracle": "Returns the bounded artifact.",
                "mechanical_assertions": ["bounded-output"],
            }
        ],
    }


def profile() -> dict:
    anchors = {str(index): f"anchor {index}" for index in range(5)}
    return {
        "schema_version": 1,
        "profile_id": "fixture-outcome",
        "version": 1,
        "role": "outcome",
        "decision": "whether the subject meets the contract",
        "population": "fixture cases",
        "model": "gpt-5.6-sol",
        "threshold": 0.95,
        "minimum_dimension": 3,
        "dimensions": [
            {
                "dimension_id": "contract-fit",
                "description": "Fits the contract",
                "weight": 1.0,
                "anchors": anchors,
            }
        ],
        "blindness": ["sealed expectations", "peer judgments"],
    }


class BlindPacketTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.target_output = self.root / "target-output.json"
        self.target_output.write_text('{"status":"READY"}\n', encoding="utf-8")
        self.digest = hashlib.sha256(b"subject").hexdigest()

    def test_builder_separates_target_sealed_and_judge_packets(self) -> None:
        receipt = build_packets(
            suite(),
            [profile()],
            evaluation_id="eval-fixture",
            subject_id="fixture",
            subject_version="1",
            subject_digest=self.digest,
            output_dir=self.root,
            target_output=self.target_output,
        )
        target = json.loads((self.root / "target-packet.json").read_text(encoding="utf-8"))
        judge_path = self.root / receipt["judge_packets"][0]["path"]
        judge = json.loads(judge_path.read_text(encoding="utf-8"))
        self.assertEqual(set(target["cases"][0]), {"case_id", "request", "fixture"})
        for field in EXCLUDED_FIELDS:
            self.assertNotIn(field, judge["profile"])
        self.assertIn("dimensions", judge["profile"])
        self.assertEqual(receipt["blindness"], "PASS")
        self.assertEqual(receipt["sealed_packet"]["state"], "HELD_IN_CONTROLLER_MEMORY")
        self.assertIsNone(receipt["sealed_packet"]["path"])
        self.assertFalse((self.root / "sealed-oracles.json").exists())
        self.assertEqual(judge["target_packet"]["path"], "../../target-packet.json")
        self.assertEqual(judge["target_output"]["path"], "../../target-output.json")

    def test_builder_rejects_packet_policy_drift(self) -> None:
        value = suite()
        value["packet_contract"]["target_fields"].append("oracle")
        with self.assertRaises(ContractError):
            build_packets(
                value,
                [],
                evaluation_id="eval-fixture",
                subject_id="fixture",
                subject_version="1",
                subject_digest=self.digest,
                output_dir=self.root,
            )

    def test_builder_rejects_declared_builder_or_schema_drift(self) -> None:
        for field in ("judge_builder", "judge_schema"):
            value = suite()
            value["packet_contract"][field] = "untrusted/other-contract"
            with self.assertRaises(ContractError):
                build_packets(
                    value,
                    [],
                    evaluation_id="eval-fixture",
                    subject_id="fixture",
                    subject_version="1",
                    subject_digest=self.digest,
                    output_dir=self.root,
                )

    def test_builder_rejects_recursive_target_leakage(self) -> None:
        value = suite()
        value["cases"][0]["fixture"]["nested"] = {"oracle": "leaked"}
        with self.assertRaisesRegex(ContractError, "leaks sealed fields"):
            build_packets(
                value,
                [],
                evaluation_id="eval-fixture",
                subject_id="fixture",
                subject_version="1",
                subject_digest=self.digest,
                output_dir=self.root,
            )


if __name__ == "__main__":
    unittest.main()
