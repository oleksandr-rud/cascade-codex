#!/usr/bin/env python3
"""Regression tests for validate_eval_pack.py."""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "validate_eval_pack", SKILL_ROOT / "scripts" / "validate_eval_pack.py"
)
assert SPEC and SPEC.loader
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)


class EvalPackValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name)
        (self.root / "references" / "rubrics").mkdir(parents=True)
        (self.root / "assets").mkdir()
        for path in (SKILL_ROOT / "references").glob("*.json"):
            (self.root / "references" / path.name).write_text(
                path.read_text(encoding="utf-8"), encoding="utf-8"
            )
        for path in (SKILL_ROOT / "references" / "rubrics").glob("*.md"):
            (self.root / "references" / "rubrics" / path.name).write_text(
                path.read_text(encoding="utf-8"), encoding="utf-8"
            )
        template = SKILL_ROOT / "assets" / "human-label-template.json"
        (self.root / "assets" / template.name).write_text(
            template.read_text(encoding="utf-8"), encoding="utf-8"
        )

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def mutate(self, relative: str, callback) -> None:
        path = self.root / relative
        value = json.loads(path.read_text(encoding="utf-8"))
        callback(value)
        path.write_text(json.dumps(value), encoding="utf-8")

    def test_valid_pack_passes(self) -> None:
        self.assertEqual([], VALIDATOR.validate(self.root))

    def test_duplicate_case_id_fails(self) -> None:
        def duplicate(value):
            value["cases"][1]["id"] = value["cases"][0]["id"]

        self.mutate("references/task-catalog.json", duplicate)
        errors = VALIDATOR.validate(self.root)
        self.assertTrue(any("unique" in error for error in errors))

    def test_split_overlap_fails(self) -> None:
        def overlap(value):
            value["partitions"]["validation"]["case_ids"][0] = value["partitions"]["build"]["case_ids"][0]

        self.mutate("references/split-manifest.json", overlap)
        errors = VALIDATOR.validate(self.root)
        self.assertTrue(any("overlap" in error for error in errors))

    def test_hidden_answer_leak_fails(self) -> None:
        def leak(value):
            value["cases"][0]["expected_answer"] = "secret"

        self.mutate("references/task-catalog.json", leak)
        errors = VALIDATOR.validate(self.root)
        self.assertTrue(any("leaks evaluator-only" in error for error in errors))

    def test_profile_weight_tampering_fails(self) -> None:
        def tamper(value):
            value["profiles"][0]["dimensions"][0]["weight"] = 24

        self.mutate("references/judge-profiles.json", tamper)
        errors = VALIDATOR.validate(self.root)
        self.assertTrue(any("dimensions or weights" in error for error in errors))

    def test_nonpositive_budget_fails(self) -> None:
        def zero(value):
            value["per_case"]["max_cost_usd"] = 0

        self.mutate("references/budgets.json", zero)
        errors = VALIDATOR.validate(self.root)
        self.assertTrue(any("must be positive" in error for error in errors))

    def test_prefilled_human_label_fails(self) -> None:
        def fabricate(value):
            value["verdict"] = "PASS"

        self.mutate("assets/human-label-template.json", fabricate)
        errors = VALIDATOR.validate(self.root)
        self.assertTrue(any("must not fabricate" in error for error in errors))

    def test_duplicate_json_keys_fail_closed(self) -> None:
        path = self.root / "references" / "eligibility-receipt.schema.json"
        path.write_text('{"$schema":"x","$defs":{},"$defs":{}}', encoding="utf-8")
        errors = VALIDATOR.validate(self.root)
        self.assertTrue(any("duplicate key: $defs" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
