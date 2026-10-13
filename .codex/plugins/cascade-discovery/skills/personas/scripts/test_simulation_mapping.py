#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock


SCRIPT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_ROOT))

from compile_simulation_persona import (
    compile_persona,
    installed_simulation_dependency,
    main,
    sha256,
    simulation_field_mappings,
    write_new_pair,
)
from test_artifact_contracts import persona
from validate_artifact import canonical_digest


SIMULATION_PLUGIN_ROOT, SIMULATION_VERSION = installed_simulation_dependency()
SIMULATION_ROOT = SIMULATION_PLUGIN_ROOT / "skills" / "simulation-persona"
SCHEMA = SIMULATION_ROOT / "references" / "persona.schema.json"
VALIDATOR = SIMULATION_ROOT / "scripts" / "validate_persona.py"
MANIFEST = SCRIPT_ROOT.parent / "evals" / "manifest.json"


class SimulationMappingTests(unittest.TestCase):
    def test_mapping_conforms_to_installed_simulation_schema(self) -> None:
        from jsonschema import Draft202012Validator

        result = compile_persona(persona(), destination="local-codex", transfer_authorized=True)
        schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
        errors = list(Draft202012Validator(schema).iter_errors(result))
        self.assertEqual(errors, [])
        self.assertEqual(result["dynamic"]["variables"][0]["initial"], "0.5")
        self.assertIn("0.6", result["dynamic"]["variables"][0]["allowed_values"])
        self.assertTrue(result["sources"][0]["locator"].startswith("content-sha256:"))
        self.assertNotIn("study:1", json.dumps(result))
        self.assertEqual(result["kind"], "evidence-backed")

    def test_mapping_rejects_unrepresentable_text_state(self) -> None:
        value = persona()
        variable = value["dynamic_model"]["variables"][0]
        variable.update(
            {
                "value_type": "TEXT",
                "allowed_values": None,
                "minimum": None,
                "maximum": None,
                "baseline": "uncertain",
            }
        )
        value["dynamic_model"]["transitions"][0]["updates"][0] = {
            "variable_id": "confidence",
            "operation": "SET",
            "value": "engaged",
        }
        value["dynamic_model"]["transitions"][0]["preconditions"][0] = {
            "variable_id": "confidence",
            "operator": "EQ",
            "value": "uncertain",
        }
        with self.assertRaisesRegex(ValueError, "finite simulation state"):
            compile_persona(value, destination="local-codex", transfer_authorized=True)

    def test_mapping_rejects_relative_update_without_exact_source_state(self) -> None:
        value = persona()
        value["dynamic_model"]["transitions"][0]["preconditions"] = [
            {"variable_id": "confidence", "operator": "LTE", "value": 0.8}
        ]
        with self.assertRaisesRegex(ValueError, "not representable"):
            compile_persona(value, destination="local-codex", transfer_authorized=True)

    def test_mapping_rejects_privacy_denial(self) -> None:
        value = persona()
        value["privacy"]["allowed_consumers"] = ["evaluation"]
        with self.assertRaisesRegex(RuntimeError, "do not permit"):
            compile_persona(value, destination="local-codex", transfer_authorized=True)

    def test_mapping_rejects_schema_invalid_source(self) -> None:
        value = persona()
        value["unexpected_top_level"] = True
        with self.assertRaisesRegex(ValueError, "schema or semantic validation failed"):
            compile_persona(value, destination="local-codex", transfer_authorized=True)

    def test_mapping_uses_conservative_order_independent_basis(self) -> None:
        value = persona()
        value["status"] = "MIXED"
        value["sources"].append({
            "source_id": "source-hypothesis",
            "locator": "hypothesis:1",
            "authority": "HYPOTHESIS",
            "observed_at": None,
            "freshness": "UNKNOWN",
            "scope": "explicit simulation hypothesis",
            "content_sha256": "b" * 64,
        })
        value["claims"].append({
            "claim_id": "claim-synthetic",
            "claim_type": "SYNTHETIC",
            "statement": "Planner may prefer visual confirmation.",
            "source_ids": ["source-hypothesis"],
            "confidence": 0.3,
            "synthetic_basis": "explicit simulation hypothesis",
            "conflicts_with": [],
        })
        value["stable_profile"]["behaviors"][0]["claim_ids"] = ["claim-observed", "claim-synthetic"]
        first = compile_persona(value, destination="local-codex", transfer_authorized=True)
        value["stable_profile"]["behaviors"][0]["claim_ids"].reverse()
        second = compile_persona(value, destination="local-codex", transfer_authorized=True)
        self.assertEqual(first["stable"]["traits"][0]["basis"], "synthetic-hypothesis")
        self.assertEqual(second["stable"]["traits"][0]["basis"], "synthetic-hypothesis")

    def test_mapping_rejects_required_prohibited_pointer(self) -> None:
        value = persona()
        value["privacy"]["prohibited_fields"] = ["/stable_profile/communication"]
        with self.assertRaisesRegex(RuntimeError, "canonically prohibited source paths"):
            compile_persona(value, destination="local-codex", transfer_authorized=True)

    def test_mapping_rejects_unrepresentable_user_provided_grounding(self) -> None:
        value = persona()
        value["sources"][0]["authority"] = "USER_PROVIDED"
        value["claims"][0]["claim_type"] = "USER_PROVIDED"
        with self.assertRaisesRegex(ValueError, "direct evidence source is required"):
            compile_persona(value, destination="local-codex", transfer_authorized=True)

    def test_mapping_table_is_deterministic_and_claim_bound(self) -> None:
        mappings = simulation_field_mappings(persona())
        self.assertEqual([item["target_path"] for item in mappings], [
            "schema_version",
            "id",
            "kind",
            "purpose",
            "sources",
            "claims",
            "stable",
            "dynamic",
            "boundaries.prohibited_inferences",
            "boundaries.sensitive_data",
            "limitations",
        ])
        self.assertEqual(mappings[5]["claim_ids"], ["claim-observed"])

    def test_cli_rejects_claimed_source_digest_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "persona.json"
            source.write_text(json.dumps(persona()), encoding="utf-8")
            status = main([
                str(source),
                "--source-digest", "b" * 64,
                "--target-schema", str(SCHEMA),
                "--target-validator", str(VALIDATOR),
                "--dependency-manifest", str(MANIFEST),
                "--destination", "local-codex",
                "--transfer-authorized",
                "--output", str(root / "output.json"),
                "--receipt", str(root / "receipt.json"),
            ])
            self.assertEqual(status, 2)
            self.assertFalse((root / "output.json").exists())

    def test_cli_binds_source_and_target_dependency_digests(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            value = persona()
            source = root / "persona.json"
            source.write_text(json.dumps(value), encoding="utf-8")
            receipt = root / "receipt.json"
            status = main([
                str(source),
                "--source-digest", canonical_digest(value),
                "--target-schema", str(SCHEMA),
                "--target-validator", str(VALIDATOR),
                "--dependency-manifest", str(MANIFEST),
                "--destination", "local-codex",
                "--transfer-authorized",
                "--output", str(root / "output.json"),
                "--receipt", str(receipt),
            ])
            self.assertEqual(status, 0)
            result = json.loads(receipt.read_text(encoding="utf-8"))
            self.assertEqual(result["source_persona_sha256"], canonical_digest(value))
            self.assertEqual(result["target_schema_sha256"], sha256(SCHEMA))
            self.assertEqual(result["target_validator_sha256"], sha256(VALIDATOR))
            self.assertEqual(result["dependency_plugin_version"], SIMULATION_VERSION)

    def test_cli_rejects_caller_selected_dependency_bundle(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "persona.json"
            forged = root / "manifest.json"
            source.write_text(json.dumps(persona()), encoding="utf-8")
            forged.write_text(MANIFEST.read_text(encoding="utf-8"), encoding="utf-8")
            status = main([
                str(source),
                "--source-digest", canonical_digest(persona()),
                "--target-schema", str(SCHEMA),
                "--target-validator", str(VALIDATOR),
                "--dependency-manifest", str(forged),
                "--destination", "local-codex",
                "--transfer-authorized",
                "--output", str(root / "output.json"),
                "--receipt", str(root / "receipt.json"),
            ])
            self.assertEqual(status, 2)
            self.assertFalse((root / "output.json").exists())

    def test_cli_rejects_duplicate_json_members(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            raw = json.dumps(persona(), separators=(",", ":"))
            raw = raw.replace('"status":"GROUNDED"', '"status":"MIXED","status":"GROUNDED"', 1)
            source = root / "persona.json"
            source.write_text(raw, encoding="utf-8")
            status = main([
                str(source),
                "--source-digest", canonical_digest(persona()),
                "--target-schema", str(SCHEMA),
                "--target-validator", str(VALIDATOR),
                "--dependency-manifest", str(MANIFEST),
                "--destination", "local-codex",
                "--transfer-authorized",
                "--output", str(root / "output.json"),
                "--receipt", str(root / "receipt.json"),
            ])
            self.assertEqual(status, 2)
            self.assertFalse((root / "output.json").exists())

    def test_pair_write_removes_partial_output_on_receipt_failure(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output = root / "output.json"
            receipt = root / "receipt.json"
            real_replace = __import__("os").replace
            calls = 0

            def fail_second(source: str | bytes, destination: str | bytes) -> None:
                nonlocal calls
                calls += 1
                if calls == 2:
                    raise OSError("receipt replace failed")
                real_replace(source, destination)

            with mock.patch("compile_simulation_persona.os.replace", side_effect=fail_second):
                with self.assertRaisesRegex(OSError, "receipt replace failed"):
                    write_new_pair(output, b"{}\n", receipt, b"{}\n")
            self.assertFalse(output.exists())
            self.assertFalse(receipt.exists())


if __name__ == "__main__":
    unittest.main()
