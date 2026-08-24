#!/usr/bin/env python3

from __future__ import annotations

import copy
import tempfile
import unittest
from pathlib import Path

import yaml

from validate_simulation import ValidationFailure, load_document, validate


ROOT = Path(__file__).resolve().parent.parent
SIMULATION = ROOT / "assets" / "simulation.yaml"
ADAPTER = ROOT / "assets" / "adapter.yaml"


class ValidateSimulationTest(unittest.TestCase):
    def test_starter_package_passes(self) -> None:
        simulation, adapter = validate(SIMULATION, ADAPTER)
        self.assertEqual(simulation["interface"]["adapter_id"], adapter["id"])

    def test_all_codex_host_adapter_profiles_pass_schema_and_cross_rules(self) -> None:
        from validate_simulation import validate_schema, validate_cross_contract

        schema = ROOT / "references" / "adapter.schema.json"
        for path in sorted((ROOT / "assets" / "adapters").glob("*.yaml")):
            adapter = load_document(path)
            validate_schema(adapter, schema, path.name)
            simulation = load_document(SIMULATION)
            simulation["interface"] = {
                "adapter_id": adapter["id"],
                "surface": adapter["surface"],
                "target": adapter["target"],
            }
            simulation["authority"]["allowed_actions"] = [
                action["name"] for action in adapter["actions"]
            ]
            for evidence in simulation["outcome"]["evidence"]:
                evidence["observe_via"] = [adapter["observations"][0]["name"]]
            validate_cross_contract(simulation, adapter)

    def test_cross_contract_mismatch_fails(self) -> None:
        simulation = load_document(SIMULATION)
        simulation["interface"]["target"] = "another-target"
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "simulation.yaml"
            path.write_text(yaml.safe_dump(simulation, sort_keys=False), encoding="utf-8")
            with self.assertRaisesRegex(ValidationFailure, "target does not match"):
                validate(path, ADAPTER)

    def test_synthetic_actor_cannot_claim_persona_id(self) -> None:
        simulation = load_document(SIMULATION)
        simulation["persona"] = {
            "source_kind": "synthetic-hypothesis",
            "persona_id": "P-001",
            "source_refs": [],
            "assumptions": ["The actor is hypothetical"],
        }
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "simulation.yaml"
            path.write_text(yaml.safe_dump(simulation, sort_keys=False), encoding="utf-8")
            with self.assertRaisesRegex(ValidationFailure, "must not claim"):
                validate(path, ADAPTER)

    def test_destructive_action_requires_confirmation(self) -> None:
        adapter = copy.deepcopy(load_document(ADAPTER))
        adapter["actions"][1]["risk"] = "destructive"
        adapter["actions"][1]["confirmation"] = "when-not-authorized"
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "adapter.yaml"
            path.write_text(yaml.safe_dump(adapter, sort_keys=False), encoding="utf-8")
            with self.assertRaisesRegex(ValidationFailure, "requires confirmation always"):
                validate(SIMULATION, path)

    def test_action_capability_must_be_declared_by_driver(self) -> None:
        adapter = copy.deepcopy(load_document(ADAPTER))
        adapter["actions"][0]["capability"] = "browser.missing"
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "adapter.yaml"
            path.write_text(yaml.safe_dump(adapter, sort_keys=False), encoding="utf-8")
            with self.assertRaisesRegex(ValidationFailure, "undeclared capability"):
                validate(SIMULATION, path)

    def test_observation_must_be_produced_by_declared_action(self) -> None:
        adapter = copy.deepcopy(load_document(ADAPTER))
        adapter["observations"][0]["produced_by"] = ["missing_action"]
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "adapter.yaml"
            path.write_text(yaml.safe_dump(adapter, sort_keys=False), encoding="utf-8")
            with self.assertRaisesRegex(ValidationFailure, "undeclared producer action"):
                validate(SIMULATION, path)

    def test_outcome_evidence_must_map_each_condition_once(self) -> None:
        simulation = load_document(SIMULATION)
        simulation["outcome"]["evidence"].pop()
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "simulation.yaml"
            path.write_text(yaml.safe_dump(simulation, sort_keys=False), encoding="utf-8")
            with self.assertRaisesRegex(ValidationFailure, "map every achieved_when"):
                validate(path, ADAPTER)

    def test_actor_state_transition_must_use_declared_value(self) -> None:
        simulation = load_document(SIMULATION)
        simulation["actor"]["state_transitions"][0]["set"] = {"confidence": "certain"}
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "simulation.yaml"
            path.write_text(yaml.safe_dump(simulation, sort_keys=False), encoding="utf-8")
            with self.assertRaisesRegex(ValidationFailure, "unsupported value"):
                validate(path, ADAPTER)

if __name__ == "__main__":
    unittest.main()
