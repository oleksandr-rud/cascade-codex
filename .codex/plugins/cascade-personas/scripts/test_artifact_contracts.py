#!/usr/bin/env python3
from __future__ import annotations

import copy
from datetime import datetime, timedelta, timezone
import sys
from pathlib import Path
import unittest


SCRIPT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_ROOT))

from validate_artifact import (
    canonical_digest,
    file_digest,
    projection_validation_receipt,
    strict_json_loads,
    validate_handoff,
    validate_persona,
    validate_projection,
)
from compile_simulation_persona import (
    compile_persona,
    installed_simulation_dependency,
    simulation_field_mappings,
)


DIGEST = "a" * 64


def grounded(value: str) -> dict:
    return {"value": value, "claim_ids": ["claim-observed"]}


def persona() -> dict:
    return {
        "schema_version": 2,
        "persona_id": "persona-1",
        "version": "1",
        "status": "GROUNDED",
        "purpose": "Evaluate a product workflow",
        "population_scope": "Maintenance planners in the supplied study",
        "permitted_uses": ["simulation"],
        "prohibited_uses": ["credit decisions"],
        "sources": [
            {
                "source_id": "source-1",
                "locator": "study:1",
                "authority": "OBSERVED_BEHAVIOR",
                "observed_at": "2026-08-20T10:00:00Z",
                "freshness": "CURRENT",
                "scope": "study cohort",
                "content_sha256": DIGEST,
            }
        ],
        "claims": [
            {
                "claim_id": "claim-observed",
                "claim_type": "OBSERVED",
                "statement": "Planner verifies inventory before scheduling.",
                "source_ids": ["source-1"],
                "confidence": 0.9,
                "synthetic_basis": None,
                "conflicts_with": [],
            }
        ],
        "contradictions": [],
        "stable_profile": {
            "goals": [grounded("Schedule feasible work")],
            "jobs": [grounded("Plan maintenance")],
            "behaviors": [grounded("Checks inventory")],
            "constraints": [grounded("Limited stock")],
            "context": [grounded("Industrial maintenance planning")],
            "capabilities": [grounded("Reads work orders")],
            "accessibility_needs": [],
            "decision_drivers": [grounded("Asset uptime")],
            "communication": grounded("Concise and evidence-oriented"),
        },
        "dynamic_model": {
            "variables": [
                {
                    "variable_id": "confidence",
                    "value_type": "NUMBER",
                    "allowed_values": None,
                    "minimum": 0,
                    "maximum": 1,
                    "baseline": 0.5,
                    "meaning": "Confidence in the plan",
                    "update_authority": "SIMULATION_EVENT",
                    "uncertainty": 0.2,
                }
            ],
            "transitions": [
                {
                    "transition_id": "inventory-confirmed",
                    "event": "inventory evidence arrives",
                    "preconditions": [{"variable_id": "confidence", "operator": "EQ", "value": 0.5}],
                    "updates": [{"variable_id": "confidence", "operation": "INCREMENT", "value": 0.1}],
                    "behavioral_effect": "Planner advances the schedule.",
                    "evidence_claim_ids": ["claim-observed"],
                    "synthetic_basis": None,
                    "impossible_state_guard": "Reject an update outside 0..1.",
                }
            ],
        },
        "uncertainty": ["Small sample"],
        "privacy": {
            "classification": "INTERNAL",
            "retention": "90 days",
            "allowed_consumers": ["simulation", "evaluation"],
            "allowed_destinations": ["local-codex"],
            "prohibited_fields": ["/raw_interview_quote"],
            "identifiable_person": False,
        },
        "invalidation_rules": [
            {
                "rule_id": "source-expired",
                "condition": "source freshness becomes STALE",
                "affected_paths": ["claims", "stable_profile"],
                "next_status": "GAP",
            }
        ],
    }


def target_schema() -> dict:
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": "https://cascade.local/cascade-simulations/persona.schema.json",
        "type": "object",
        "required": ["stable"],
        "properties": {
            "schema_version": {"const": 1},
            "stable": {"type": "object"},
        },
    }


def projection(source: dict | None = None) -> dict:
    source = source or persona()
    payload = {"stable": {"goals": ["Schedule feasible work"]}}
    mappings = [
        {
            "source_path": "stable_profile.goals.0",
            "target_path": "stable.goals.0",
            "evidence_basis": "CLAIMS",
            "claim_ids": ["claim-observed"],
            "claim_types": ["OBSERVED"],
            "transformation": "grounded values to strings",
        }
    ]
    return {
        "schema_version": 5,
        "projection_id": "projection-1",
        "version": "1",
        "source_persona_id": "persona-1",
        "source_persona_version": "1",
        "source_persona_sha256": canonical_digest(source),
        "source_persona_status": "GROUNDED",
        "target_consumer": "simulation",
        "target_contract": "cascade-simulations:simulation-persona",
        "target_schema": {
            "id": "https://cascade.local/cascade-simulations/persona.schema.json",
            "version": "1",
            "sha256": DIGEST,
        },
        "mapping_version": "simulation-persona-v1",
        "field_mappings": mappings,
        "omitted_fields": [
            {"field": "/raw_interview_quote", "reason": "prohibited by canonical privacy policy", "privacy_rule": "privacy.prohibited_fields"}
        ],
        "payload": payload,
        "synthetic_disclosure": False,
        "source_privacy": {
            "classification": "INTERNAL",
            "permitted_consumer": True,
            "destination": "local-codex",
            "transfer_authorized": True,
            "omitted_sensitive_fields": ["/raw_interview_quote"],
        },
        "immutable": True,
        "mutable_state_owner": "simulation-run",
        "validation": projection_validation_receipt(
            payload,
            field_mappings=mappings,
            source_digest=canonical_digest(source),
            target_schema_digest=DIGEST,
            validation_kind="DECLARATIVE_MAPPING",
        ),
        "invalidation_conditions": ["source persona digest changes"],
    }


def handoff() -> dict:
    now = datetime.now(timezone.utc)
    return {
        "schema_version": 2,
        "envelope_id": "handoff-1",
        "producer": "cascade-personas:compile-persona",
        "consumer": "cascade-simulations:simulation-persona",
        "mode": "EXECUTE",
        "status": "READY",
        "input_artifacts": [{"id": "persona-1", "version": "1", "sha256": DIGEST, "evidence_class": "SUPPLIED"}],
        "output_artifacts": [{"id": "projection-1", "version": "1", "sha256": DIGEST, "evidence_class": "DERIVED"}],
        "authority": {
            "decision_owner": "evaluation-operator",
            "execution_authorized": True,
            "external_write_authorized": False,
        },
        "data_policy": {
            "classification": "INTERNAL",
            "destination": "local-codex",
            "transfer_authorized": True,
        },
        "freshness": {
            "produced_at": now.isoformat(),
            "expires_at": (now + timedelta(hours=1)).isoformat(),
            "status": "CURRENT",
        },
        "failure": {"classification": "NONE", "message": None, "retry_allowed": False},
        "resume": {
            "owner": None,
            "required_artifact": None,
            "not_applicable_reason": None,
            "next_action": None,
        },
        "closure": {"requires_acknowledgment": False, "acknowledged": False, "acknowledgment_id": None},
    }


def deterministic_projection(source: dict | None = None) -> tuple[dict, dict, Path]:
    source = source or persona()
    simulation_root, _ = installed_simulation_dependency()
    schema_path = simulation_root / "skills" / "simulation-persona" / "references" / "persona.schema.json"
    validator_path = simulation_root / "skills" / "simulation-persona" / "scripts" / "validate_persona.py"
    target = strict_json_loads(schema_path.read_text(encoding="utf-8"))
    target_digest = file_digest(schema_path)
    payload = compile_persona(source, destination="local-codex", transfer_authorized=True)
    mappings = simulation_field_mappings(source)
    value = {
        "schema_version": 5,
        "projection_id": "projection-simulation-1",
        "version": "1",
        "source_persona_id": source["persona_id"],
        "source_persona_version": source["version"],
        "source_persona_sha256": canonical_digest(source),
        "source_persona_status": source["status"],
        "target_consumer": "simulation",
        "target_contract": "cascade-simulations:simulation-persona",
        "target_schema": {
            "id": target["$id"],
            "version": "1",
            "sha256": target_digest,
        },
        "mapping_version": "simulation-persona-v2",
        "field_mappings": mappings,
        "omitted_fields": [{
            "field": "/raw_interview_quote",
            "reason": "prohibited by canonical privacy policy",
            "privacy_rule": "privacy.prohibited_fields",
        }],
        "payload": payload,
        "synthetic_disclosure": source["status"] != "GROUNDED",
        "source_privacy": {
            "classification": source["privacy"]["classification"],
            "permitted_consumer": True,
            "destination": "local-codex",
            "transfer_authorized": True,
            "omitted_sensitive_fields": source["privacy"]["prohibited_fields"],
        },
        "immutable": True,
        "mutable_state_owner": "simulation-run",
        "validation": projection_validation_receipt(
            payload,
            field_mappings=mappings,
            source_digest=canonical_digest(source),
            target_schema_digest=target_digest,
            validation_kind="DETERMINISTIC_SIMULATION_COMPILER",
            target_validator_path=validator_path,
        ),
        "invalidation_conditions": ["source persona digest changes"],
    }
    return value, target, validator_path


class ArtifactContractTests(unittest.TestCase):
    def test_strict_json_rejects_duplicate_members_and_unsafe_integers(self) -> None:
        with self.assertRaisesRegex(ValueError, "duplicate JSON member"):
            strict_json_loads('{"status":"GROUNDED","status":"MIXED"}')
        with self.assertRaisesRegex(ValueError, "unsafe I-JSON integer"):
            strict_json_loads('{"value":9007199254740992}')

    def test_valid_semantic_contracts_pass(self) -> None:
        source = persona()
        self.assertEqual(validate_persona(source), [])
        self.assertEqual(
            validate_projection(
                projection(source),
                source=source,
                source_digest=canonical_digest(source),
                target_schema=target_schema(),
                target_schema_digest=DIGEST,
            ),
            [],
        )
        self.assertEqual(validate_handoff(handoff()), [])

    def test_persona_rejects_cross_reference_and_bound_violations(self) -> None:
        value = persona()
        value["claims"][0]["source_ids"] = ["missing"]
        value["dynamic_model"]["variables"][0]["minimum"] = 1
        value["dynamic_model"]["variables"][0]["maximum"] = 0
        value["dynamic_model"]["transitions"][0]["updates"][0]["value"] = 2
        errors = validate_persona(value)
        self.assertTrue(any("unknown source_ids" in error for error in errors))
        self.assertTrue(any("invalid numeric bounds" in error for error in errors))
        self.assertTrue(any("unsatisfiable preconditions" in error or "update leaves" in error for error in errors))

    def test_persona_rejects_typed_precondition_and_immutable_update_violations(self) -> None:
        value = persona()
        transition = value["dynamic_model"]["transitions"][0]
        transition["preconditions"][0] = {"variable_id": "confidence", "operator": "IN", "value": [0.3, "high"]}
        value["dynamic_model"]["variables"][0]["update_authority"] = "IMMUTABLE"
        errors = validate_persona(value)
        self.assertTrue(any("precondition is incompatible" in error for error in errors))
        self.assertTrue(any("updates immutable" in error for error in errors))

    def test_persona_rejects_updates_unsafe_for_any_admitted_state(self) -> None:
        value = persona()
        transition = value["dynamic_model"]["transitions"][0]
        transition["preconditions"] = [{"variable_id": "confidence", "operator": "GTE", "value": 0.5}]
        transition["updates"] = [{"variable_id": "confidence", "operation": "INCREMENT", "value": 0.5}]
        errors = validate_persona(value)
        self.assertTrue(any("update leaves confidence invalid" in error for error in errors))

    def test_persona_rejects_duplicate_updates_to_one_variable(self) -> None:
        value = persona()
        transition = value["dynamic_model"]["transitions"][0]
        transition["updates"].append(
            {"variable_id": "confidence", "operation": "SET", "value": 0.8}
        )
        errors = validate_persona(value)
        self.assertTrue(any("updates confidence more than once" in error for error in errors))

    def test_projection_rejects_nested_mutable_state(self) -> None:
        source = persona()
        value = projection(source)
        value["payload"]["actor"] = {"runtime_state": {"confidence": 1}}
        errors = validate_projection(
            value,
            source=source,
            source_digest=canonical_digest(source),
            target_schema=target_schema(),
            target_schema_digest=DIGEST,
        )
        self.assertTrue(any("mutable runtime fields" in error for error in errors))

    def test_projection_rejects_digest_claim_type_and_schema_drift(self) -> None:
        source = persona()
        value = projection(source)
        value["field_mappings"][0]["claim_types"] = ["SYNTHETIC"]
        value["target_schema"]["sha256"] = "b" * 64
        errors = validate_projection(
            value,
            source=source,
            source_digest="c" * 64,
            target_schema=target_schema(),
            target_schema_digest=DIGEST,
        )
        self.assertTrue(any("declared source digest" in error for error in errors))
        self.assertTrue(any("claim_types drifted" in error for error in errors))
        self.assertTrue(any("target schema digest" in error for error in errors))

    def test_projection_rejects_missing_target_path_and_prohibited_payload_field(self) -> None:
        source = persona()
        value = projection(source)
        value["field_mappings"][0]["target_path"] = "stable.missing"
        value["payload"]["raw_interview_quote"] = "must not leave the canonical source"
        errors = validate_projection(
            value,
            source=source,
            source_digest=canonical_digest(source),
            target_schema=target_schema(),
            target_schema_digest=DIGEST,
        )
        self.assertTrue(any("target_path is absent" in error for error in errors))
        self.assertTrue(any("contains prohibited fields" in error for error in errors))

    def test_projection_rejects_unmapped_payload_subtrees_and_forged_receipt(self) -> None:
        source = persona()
        value = projection(source)
        value["payload"]["claims"] = [{"claim": "ungrounded extra claim"}]
        value["validation"]["receipt_sha256"] = "b" * 64
        errors = validate_projection(
            value,
            source=source,
            source_digest=canonical_digest(source),
            target_schema=target_schema(),
            target_schema_digest=DIGEST,
        )
        self.assertTrue(any("lack declared lineage" in error for error in errors))
        self.assertTrue(any("canonical validator-bound receipt" in error for error in errors))

    def test_projection_rejects_partial_collection_claim_lineage(self) -> None:
        source = persona()
        source["claims"].append({
            "claim_id": "claim-second",
            "claim_type": "OBSERVED",
            "statement": "Planner escalates blocked work.",
            "source_ids": ["source-1"],
            "confidence": 0.8,
            "synthetic_basis": None,
            "conflicts_with": [],
        })
        source["stable_profile"]["goals"].append({
            "value": "Escalate blocked work",
            "claim_ids": ["claim-second"],
        })
        value = projection(source)
        value["payload"]["stable"]["goals"].append("Escalate blocked work")
        value["field_mappings"][0]["source_path"] = "stable_profile.goals"
        value["field_mappings"][0]["target_path"] = "stable.goals"
        errors = validate_projection(
            value,
            source=source,
            source_digest=canonical_digest(source),
            target_schema=target_schema(),
            target_schema_digest=DIGEST,
        )
        self.assertTrue(any("exactly cover source_path" in error for error in errors))
        self.assertTrue(any("trace collection members individually" in error for error in errors))

    def test_projection_rejects_fabricated_array_member_without_own_mapping(self) -> None:
        source = persona()
        value = projection(source)
        value["payload"]["stable"]["goals"].append("Fabricated goal")
        errors = validate_projection(
            value,
            source=source,
            source_digest=canonical_digest(source),
            target_schema=target_schema(),
            target_schema_digest=DIGEST,
        )
        self.assertTrue(any("stable.goals.1" in error and "lack declared lineage" in error for error in errors))

    def test_deterministic_projection_binds_mapping_and_target_semantics(self) -> None:
        source = persona()
        value, target, validator_path = deterministic_projection(source)
        target_digest = value["target_schema"]["sha256"]
        self.assertEqual(
            validate_projection(
                value,
                source=source,
                source_digest=canonical_digest(source),
                target_schema=target,
                target_schema_digest=target_digest,
                target_validator_path=validator_path,
            ),
            [],
        )
        value["field_mappings"][5] = {
            "source_path": "schema_version",
            "target_path": "claims",
            "evidence_basis": "STRUCTURAL",
            "claim_ids": [],
            "claim_types": [],
            "transformation": "false lineage",
        }
        value["validation"] = projection_validation_receipt(
            value["payload"],
            field_mappings=value["field_mappings"],
            source_digest=canonical_digest(source),
            target_schema_digest=target_digest,
            validation_kind="DETERMINISTIC_SIMULATION_COMPILER",
            target_validator_path=validator_path,
        )
        errors = validate_projection(
            value,
            source=source,
            source_digest=canonical_digest(source),
            target_schema=target,
            target_schema_digest=target_digest,
            target_validator_path=validator_path,
        )
        self.assertTrue(any("deterministic compiler mapping table" in error for error in errors))

    def test_handoff_rejects_inconsistent_execute_failure_and_freshness(self) -> None:
        value = handoff()
        value["authority"]["execution_authorized"] = False
        value["failure"] = {"classification": "TOOL_FAILURE", "message": "timeout", "retry_allowed": True}
        value["freshness"]["expires_at"] = value["freshness"]["produced_at"]
        errors = validate_handoff(value)
        self.assertTrue(any("EXECUTE" in error for error in errors))
        self.assertTrue(any("successful handoff contains a failure" in error for error in errors))
        self.assertTrue(any("expires_at" in error for error in errors))

    def test_handoff_input_failure_requires_named_artifact(self) -> None:
        value = handoff()
        value["status"] = "BLOCKED"
        value["failure"] = {"classification": "MISSING_INPUT", "message": "persona absent", "retry_allowed": True}
        value["resume"] = {
            "owner": "persona-owner",
            "required_artifact": None,
            "not_applicable_reason": "not needed",
            "next_action": "supply input",
        }
        errors = validate_handoff(value)
        self.assertTrue(any("must name the required artifact" in error for error in errors))

    def test_handoff_rejects_unbound_alias_and_authority_widening(self) -> None:
        value = handoff()
        value["mode"] = "PREPARE"
        value["producer"] = "unbound-producer"
        value["authority"] = {
            "decision_owner": None,
            "execution_authorized": False,
            "external_write_authorized": True,
        }
        errors = validate_handoff(value)
        self.assertTrue(any("exact cascade plugin skill alias" in error for error in errors))
        self.assertTrue(any("cannot carry execution or external-write authority" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
