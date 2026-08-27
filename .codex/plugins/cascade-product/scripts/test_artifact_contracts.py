#!/usr/bin/env python3
from __future__ import annotations

import copy
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
import unittest


SCRIPT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_ROOT))

from validate_artifact import (
    canonical_digest,
    contract_alias_versions,
    strict_json_loads,
    validate_decision,
    validate_handoff,
    validate_schema,
    validate_work_product,
)


DIGEST = "a" * 64


def decision() -> dict:
    return {
        "schema_version": 4,
        "decision_id": "decision-1",
        "version": "1",
        "decision_owner": "product-owner",
        "disposition": "ADVANCE",
        "approval_status": "APPROVED",
        "current_state": "DISCOVERY",
        "proposed_state": "DEFINITION",
        "gate_status": "READY",
        "evidence": [{
            "artifact_id": "evidence-1",
            "version": "1",
            "sha256": DIGEST,
            "evidence_class": "USER_PROVIDED",
            "acceptance_status": "ACCEPTED",
            "accepted_by": "product-owner",
            "scope": "repair workflow discovery",
            "as_of": "2026-08-21T10:00:00Z",
        }],
        "unmet_conditions": [],
        "work_product": {
            "artifact_id": "product-artifact-1",
            "version": "1",
            "status": "READY",
            "sha256": DIGEST,
        },
        "confidence": {
            "level": "MEDIUM",
            "basis": "The named owner accepted current scoped discovery evidence.",
            "limitations": ["Delivery and observed-outcome evidence are not part of this gate."],
        },
        "recommendation": "Advance to a bounded definition.",
        "rationale": "The named owner accepted current scoped discovery evidence.",
        "alternatives": ["Narrow the segment", "Defer"],
        "transition_authority": "product-owner",
        "invalidation_conditions": ["accepted evidence changes"],
        "next_gate": "DEFINITION",
    }


def handoff() -> dict:
    now = datetime.now(timezone.utc)
    return {
        "schema_version": 4,
        "envelope_id": "handoff-1",
        "producer": "cascade-product:validate-product",
        "producer_version": contract_alias_versions()["cascade-product:validate-product"],
        "consumer": "cascade-evals:evaluate",
        "consumer_version": contract_alias_versions()["cascade-evals:evaluate"],
        "consumer_type": "CASCADE_PLUGIN",
        "mode": "PREPARE",
        "status": "READY",
        "input_artifacts": [{"id": "decision-1", "version": "1", "sha256": DIGEST, "evidence_class": "ACCEPTED_DECISION", "status": "APPROVED"}],
        "output_artifacts": [{"id": "evaluation-brief-1", "version": "1", "sha256": DIGEST, "evidence_class": "DERIVED", "status": "READY"}],
        "expected_output": {"artifact_id": "evaluation-receipt-1", "artifact_version": "1", "status": "PASS", "sha256": None},
        "budget": {"model_calls": 0, "tool_calls": 0, "external_writes": 0, "timeout_seconds": 900},
        "authority": {"decision_owner": "product-owner", "execution_authorized": False, "external_write_authorized": False},
        "data_policy": {"classification": "INTERNAL", "destination": "local-codex", "transfer_authorized": True},
        "freshness": {
            "produced_at": now.isoformat(),
            "expires_at": (now + timedelta(hours=1)).isoformat(),
            "status": "CURRENT",
        },
        "failure": {"classification": "NONE", "message": None, "retry_allowed": False},
        "resume": {
            "owner": "product-owner",
            "required_artifact": "product-owner-review-receipt",
            "not_applicable_reason": None,
            "next_action": "Review the prepared artifact and record the bounded decision.",
        },
        "closure": {"requires_acknowledgment": False, "acknowledged": False, "acknowledgment_id": None},
    }


def work_product(kind: str = "PRODUCT_DEFINITION", status: str = "READY") -> dict:
    return {
        "schema_version": 1,
        "artifact_id": "product-artifact-1",
        "version": "1",
        "kind": kind,
        "status": status,
        "decision_id": "decision-1",
        "summary": "A bounded Product work product for the declared decision.",
        "source_artifacts": [{
            "id": "source-1",
            "version": "1",
            "sha256": DIGEST,
            "evidence_class": "USER_PROVIDED",
            "status": "READY",
            "scope": "declared product decision",
        }],
        "sections": [{
            "section_id": "section-1",
            "title": "Outcome",
            "content": "Improve completion of the declared workflow.",
            "evidence_ids": ["source-1"],
        }],
        "journeys": [{
            "journey_id": "journey-1",
            "actor": "maintenance planner",
            "steps": [{
                "step_id": "step-1",
                "action": "Open the planned work",
                "expected_behavior": "The system shows the accepted next action.",
                "failure_behavior": "The system preserves work and names recovery.",
            }],
            "evidence_ids": ["source-1"],
        }],
        "requirements": [{
            "requirement_id": "requirement-1",
            "statement": "The user can complete the declared workflow.",
            "acceptance_behavior": "A deterministic journey check reaches the expected state.",
            "evidence_ids": ["source-1"],
        }],
        "validation_claims": [{
            "claim_id": "claim-1",
            "claim": "The work product is structurally complete for evaluation.",
            "status": "PASS",
            "evidence_ids": ["source-1"],
        }],
        "traceability": [{"from_id": "requirement-1", "to_ids": ["journey-1"]}],
        "invalidation_conditions": ["source artifact identity changes"],
    }


class ProductArtifactContractTests(unittest.TestCase):
    def test_valid_decision_and_handoff_pass(self) -> None:
        value = decision()
        root = SCRIPT_ROOT.parent
        self.assertEqual(validate_schema(value, root / "schemas" / "product-decision.schema.json"), [])
        self.assertEqual(validate_schema(handoff(), root / "schemas" / "handoff-envelope.schema.json"), [])
        self.assertEqual(validate_decision(value), [])
        self.assertEqual(validate_handoff(handoff()), [])
        self.assertEqual(validate_work_product(work_product()), [])
        self.assertRegex(canonical_digest(value), r"^[a-f0-9]{64}$")

    def test_strict_json_rejects_duplicate_members_and_unsafe_integers(self) -> None:
        with self.assertRaisesRegex(ValueError, "duplicate JSON member"):
            strict_json_loads('{"decision_id":"one","decision_id":"two"}')
        with self.assertRaisesRegex(ValueError, "unsafe I-JSON integer"):
            strict_json_loads('{"value":9007199254740992}')

    def test_ready_gate_rejects_conflict(self) -> None:
        value = decision()
        value["evidence"][0]["acceptance_status"] = "CONFLICT"
        value["evidence"][0]["accepted_by"] = None
        self.assertTrue(any("READY gate" in error for error in validate_decision(value)))

    def test_approved_transition_rejects_authority_mismatch(self) -> None:
        value = decision()
        value["transition_authority"] = "plugin"
        self.assertTrue(any("must equal" in error for error in validate_decision(value)))

    def test_forward_gate_skip_is_invalid(self) -> None:
        value = decision()
        value["proposed_state"] = "DELIVERY_READY"
        value["next_gate"] = "DELIVERY_READY"
        self.assertTrue(any("skips" in error for error in validate_decision(value)))

    def test_duplicate_evidence_identity_is_invalid(self) -> None:
        value = decision()
        value["evidence"].append(copy.deepcopy(value["evidence"][0]))
        self.assertTrue(any("duplicate evidence identity" in error for error in validate_decision(value)))

    def test_prepare_handoff_rejects_authority_widening(self) -> None:
        value = handoff()
        value["authority"]["external_write_authorized"] = True
        self.assertTrue(any("cannot carry" in error for error in validate_handoff(value)))

    def test_ready_prepare_handoff_requires_actionable_resume(self) -> None:
        value = handoff()
        value["resume"] = {
            "owner": None,
            "required_artifact": None,
            "not_applicable_reason": None,
            "next_action": None,
        }
        self.assertNotEqual(validate_schema(value, SCRIPT_ROOT.parent / "schemas" / "handoff-envelope.schema.json"), [])
        self.assertTrue(any("actionable resume" in error for error in validate_handoff(value)))

    def test_handoff_expiration_must_follow_envelope_production(self) -> None:
        value = handoff()
        value["freshness"]["expires_at"] = value["freshness"]["produced_at"]
        self.assertTrue(any("not after produced_at" in error for error in validate_handoff(value)))

    def test_ownerless_forward_gate_is_blocked_with_authority_gap(self) -> None:
        value = decision()
        value["decision_owner"] = None
        value["approval_status"] = "PROPOSED"
        value["transition_authority"] = None
        value["gate_status"] = "READY"
        errors = validate_decision(value)
        self.assertTrue(any("ownerless forward gate must be BLOCKED" in error for error in errors))
        self.assertTrue(any("authority unmet condition" in error for error in errors))

    def test_handoff_rejects_unbound_version_and_unclosed_terminal_output(self) -> None:
        value = handoff()
        value["consumer_version"] = "banana"
        self.assertTrue(any("consumer_version" in error for error in validate_handoff(value)))
        value = handoff()
        value["status"] = "PASS"
        value["closure"] = {
            "requires_acknowledgment": True,
            "acknowledged": True,
            "acknowledgment_id": "ack-1",
        }
        self.assertTrue(any("terminal PASS output" in error for error in validate_handoff(value)))

    def test_inbound_optional_market_peer_uses_shared_contract_without_cycle(self) -> None:
        value = handoff()
        value["producer"] = "cascade-market:evaluate-market-opportunity"
        value["producer_version"] = "0.1.8+codex.20260823005800"
        value["consumer"] = "cascade-product:manage-product-lifecycle"
        value["consumer_version"] = contract_alias_versions()["cascade-product:manage-product-lifecycle"]
        self.assertEqual(validate_handoff(value), [])

    def test_work_product_rejects_missing_kind_contract_and_unknown_lineage(self) -> None:
        value = work_product()
        value["journeys"] = []
        value["requirements"][0]["evidence_ids"] = ["missing"]
        errors = validate_work_product(value)
        self.assertTrue(any("requires journeys" in error for error in errors))
        self.assertTrue(any("unknown source artifacts" in error for error in errors))

    def test_schema_error_identifies_missing_evidence_ids_path(self) -> None:
        value = work_product()
        del value["requirements"][0]["evidence_ids"]
        errors = validate_schema(value, SCRIPT_ROOT.parent / "schemas" / "product-work-product.schema.json")
        self.assertTrue(any("$.requirements[0]" in error and "evidence_ids" in error for error in errors))

    def test_malformed_decision_fails_without_exception(self) -> None:
        value = decision()
        value["evidence"] = [1]
        self.assertIsInstance(validate_decision(value), list)


if __name__ == "__main__":
    unittest.main()
