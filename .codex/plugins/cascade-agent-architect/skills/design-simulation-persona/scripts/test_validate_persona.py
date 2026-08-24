#!/usr/bin/env python3

from __future__ import annotations

import copy
import tempfile
import unittest
from pathlib import Path

import yaml

from validate_persona import ValidationFailure, load_document, validate


SKILL = Path(__file__).resolve().parent.parent


class PersonaValidationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.persona = load_document(SKILL / "assets" / "persona.yaml")

    def validate_value(self, value: dict) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "persona.yaml"
            path.write_text(yaml.safe_dump(value, sort_keys=False), encoding="utf-8")
            validate(path)

    def test_starter_persona_passes(self) -> None:
        validate(SKILL / "assets" / "persona.yaml")

    def test_unknown_claim_source_fails(self) -> None:
        value = copy.deepcopy(self.persona)
        value["claims"][0]["source_refs"] = ["missing"]
        with self.assertRaisesRegex(ValidationFailure, "unknown sources"):
            self.validate_value(value)

    def test_initial_state_must_be_allowed(self) -> None:
        value = copy.deepcopy(self.persona)
        value["dynamic"]["variables"][0]["initial"] = "impossible"
        with self.assertRaisesRegex(ValidationFailure, "initial value"):
            self.validate_value(value)

    def test_transition_cannot_update_unknown_state(self) -> None:
        value = copy.deepcopy(self.persona)
        value["dynamic"]["transitions"][0]["set"] = {"diagnosis": "certain"}
        with self.assertRaisesRegex(ValidationFailure, "unknown variable"):
            self.validate_value(value)

    def test_evidence_backed_requires_direct_evidence(self) -> None:
        value = copy.deepcopy(self.persona)
        value["kind"] = "evidence-backed"
        with self.assertRaisesRegex(ValidationFailure, "direct evidence"):
            self.validate_value(value)


if __name__ == "__main__":
    unittest.main()
