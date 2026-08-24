#!/usr/bin/env python3
from __future__ import annotations

import copy
from datetime import datetime, timedelta, timezone
import importlib.util
from pathlib import Path
import sys
import unittest


SCRIPT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_ROOT))

from validate_artifact import (
    canonical_digest,
    contract_alias_versions,
    strict_json_loads,
    validate_experiment,
    validate_handoff,
    validate_ledger,
    validate_opportunity,
    validate_schema,
)


DIGEST = "a" * 64


def claim(claim_id: str, source_id: str, evidence_kind: str) -> dict:
    return {
        "claim_id": claim_id,
        "statement": f"Scoped evidence for {evidence_kind}.",
        "source_id": source_id,
        "entity_id": source_id if evidence_kind in {"OBSERVED_BEHAVIOR", "TRANSACTION", "RETENTION"} else None,
        "event_id": claim_id if evidence_kind in {"OBSERVED_BEHAVIOR", "TRANSACTION", "RETENTION"} else None,
        "observed_at": "2026-08-20T09:30:00Z" if evidence_kind in {"OBSERVED_BEHAVIOR", "TRANSACTION", "RETENTION"} else None,
        "source_locator": f"receipt:{source_id}",
        "source_sha256": DIGEST,
        "evidence_kind": evidence_kind,
        "source_type": "USER_PRIMARY",
        "published_at": "2026-08-20T09:00:00Z",
        "retrieved_at": "2026-08-20T10:00:00Z",
        "entity_segment": "small industrial maintenance teams",
        "geography": "United States",
        "directness": "DIRECT",
        "confidence": 0.9,
        "freshness_status": "CURRENT",
        "contradiction_ids": [],
        "permitted_uses": [
            "MARKET_RESEARCH",
            "OPPORTUNITY_SCORING",
            "PMF_ASSESSMENT",
            "EXPERIMENT_DESIGN",
            "PRODUCT_HANDOFF",
        ],
    }


def ledger() -> dict:
    return {
        "schema_version": 4,
        "ledger_id": "ledger-1",
        "version": "1",
        "scope": "small industrial maintenance teams in the United States",
        "as_of": "2026-08-21T10:00:00Z",
        "status": "READY",
        "claims": [
            claim("claim-behavior", "participant-1", "OBSERVED_BEHAVIOR"),
            claim("claim-transaction", "participant-1", "TRANSACTION"),
            claim("claim-retention", "participant-1", "RETENTION"),
            claim("claim-transaction-2", "participant-2", "TRANSACTION"),
            claim("claim-retention-2", "participant-2", "RETENTION"),
        ],
        "contradictions": [],
        "gaps": [],
        "invalidation_conditions": ["source scope or freshness changes"],
    }


def opportunity(source: dict | None = None) -> dict:
    source = source or ledger()
    return {
        "schema_version": 4,
        "assessment_id": "assessment-1",
        "version": "1",
        "ledger_id": source["ledger_id"],
        "ledger_version": source["version"],
        "ledger_sha256": canonical_digest(source),
        "criteria": [
            {"criterion_id": "pain", "weight": 0.5, "rating": 4, "floor": 2, "evidence_claim_ids": ["claim-behavior"]},
            {"criterion_id": "value", "weight": 0.5, "rating": 3, "floor": 2, "evidence_claim_ids": ["claim-transaction"]},
        ],
        "score": 0.875,
        "score_formula": "sum(weight * rating / 4)",
        "coverage": 1.0,
        "minimum_coverage": 1.0,
        "decision_rule": {
            "minimum_score": 0.7,
            "require_all_floors": True,
            "require_no_triggered_disqualifiers": True,
        },
        "rating_anchors": {
            "0": "No evidence-backed fit",
            "1": "Weak fit",
            "2": "Mixed fit",
            "3": "Strong fit",
            "4": "Compelling fit",
        },
        "decision_status": "READY",
        "disqualifiers": [{
            "rule_id": "legal-prohibition",
            "rule": "unresolved legal prohibition",
            "triggered": False,
            "evidence_claim_ids": ["claim-behavior"],
        }],
        "pmf_state": "VALIDATED_FOR_SCOPE",
        "pmf_evidence_claim_ids": ["claim-transaction", "claim-retention", "claim-transaction-2", "claim-retention-2"],
        "pmf_scope": "supplied segment, geography, and observation window",
        "pmf_cohort": {
            "segment": "small industrial maintenance teams",
            "geography": "United States",
            "minimum_distinct_entities": 2,
            "minimum_events_per_entity": 2,
        },
        "pmf_observation_window": {
            "start": "2026-08-01T00:00:00Z",
            "end": "2026-08-21T10:00:00Z",
        },
        "expires_at": "2026-09-21T10:00:00Z",
        "recommendation": "Proceed to a named Product decision.",
        "gaps": [],
        "invalidation_conditions": ["ledger digest changes"],
    }


def experiment() -> dict:
    return {
        "schema_version": 4,
        "experiment_id": "experiment-1",
        "version": "1",
        "hypothesis": "At least 30 percent complete the paid-intent action.",
        "segment": "small industrial maintenance teams",
        "geography": "United States",
        "method": "bounded landing test operated externally",
        "primary_metric": {
            "metric_id": "paid-intent-rate",
            "observable_event": "participant completes the paid-intent action",
            "unit": "fraction",
            "success_operator": "GTE",
            "success_value": 0.3,
            "kill_operator": "LTE",
            "kill_value": 0.1,
        },
        "guardrail_metrics": [],
        "success_criteria": ["paid-intent-rate is at least 0.3"],
        "kill_criteria": ["paid-intent-rate is at most 0.1"],
        "sample_rule": "Collect 100 eligible unique participants.",
        "stopping_rule": "Stop at the fixed sample or a safety violation.",
        "input_artifacts": [{
            "id": "ledger-1",
            "version": "1",
            "sha256": DIGEST,
            "alias": "cascade-market-intelligence:research-market",
            "status": "READY",
            "evidence_class": "SUPPLIED",
            "scope": "small industrial maintenance teams in the United States",
            "permitted_use": "EXPERIMENT_DESIGN",
        }],
        "hypothesis_evidence_ids": ["ledger-1"],
        "recruitment": {
            "channel": "consented research panel",
            "eligibility_rule": "United States maintenance team decision maker",
            "exclusion_rule": "duplicate organization or prior exposure",
            "target_count": 100,
        },
        "privacy_plan": {
            "classification": "CONFIDENTIAL",
            "destination": "approved-store",
            "retention_days": 30,
            "consent_required": True,
            "cleanup_required": True,
        },
        "instrument": {"id": "landing-test-1", "version": "1", "sha256": DIGEST, "kind": "LANDING_PAGE"},
        "baseline": {"metric_id": "paid-intent-rate", "value": 0.05, "source_artifact_id": "ledger-1"},
        "duration": {"start": "2026-08-20T00:00:00Z", "end": "2026-08-21T00:00:00Z"},
        "instrumentation": [{"event_id": "paid-intent", "trigger": "participant confirms paid intent", "schema_sha256": DIGEST}],
        "contamination_controls": ["deduplicate organizations and exclude prior exposure"],
        "permissions": {
            "external_execution_authorized": False,
            "data_destination_approved": False,
            "cost_budget_approved": False,
            "authority_receipt": None,
        },
        "operator": {
            "owner": None,
            "destination": None,
            "budget_reference": None,
            "budget_limit": None,
            "cleanup_rule": "External operator documents cleanup.",
        },
        "execution_state": "NOT_RUN",
        "evidence_location": None,
        "receipt": None,
        "analysis_method": "Apply the frozen thresholds without post-hoc changes.",
        "decision_routes": {
            "PASS": "Return evidence to Product.",
            "FAIL": "Reject or revise the hypothesis.",
            "MIXED": "Narrow the scope and design a discriminating test.",
            "INVALID": "Discard the result and repair the instrument.",
            "INCONCLUSIVE": "Gather the exact missing evidence.",
        },
        "invalidation_conditions": ["hypothesis, metric, threshold, or segment changes"],
    }


def executed_experiment() -> dict:
    value = experiment()
    value["execution_state"] = "RECEIPT_SUPPLIED"
    value["evidence_location"] = "artifact://experiment-1/raw-outcomes"
    authority = {
        "id": "authority-1",
        "version": "1",
        "issuer": "market-owner",
        "subject": "operator-a",
        "scopes": ["EXECUTE_MARKET_EXPERIMENT"],
        "issued_at": "2026-08-20T08:00:00Z",
        "expires_at": "2026-09-21T11:00:00Z",
        "destination": "approved-store",
        "budget_reference": "budget-1",
    }
    authority["sha256"] = canonical_digest(authority)
    value["permissions"] = {
        "external_execution_authorized": True,
        "data_destination_approved": True,
        "cost_budget_approved": True,
        "authority_receipt": authority,
    }
    value["operator"] = {
        "owner": "operator-a",
        "destination": "approved-store",
        "budget_reference": "budget-1",
        "budget_limit": {"currency": "USD", "amount": 500},
        "cleanup_rule": "Delete raw participant identifiers after aggregation.",
    }
    raw_outcome = {
        "artifact_id": "raw-outcomes-1",
        "version": "1",
        "record_count": 100,
        "metric_id": "paid-intent-rate",
        "observed_value": 0.34,
    }
    cleanup_proof = {
        "artifact_id": "cleanup-1",
        "version": "1",
        "completed_at": "2026-08-21T12:00:00Z",
        "action": "deleted raw participant identifiers after aggregation",
    }
    receipt = {
        "receipt_id": "receipt-1",
        "version": "1",
        "status": "PASS",
        "completeness_status": "COMPLETE",
        "experiment_id": "experiment-1",
        "experiment_version": "1",
        "issuer": "operator-a",
        "operator": "operator-a",
        "destination": "approved-store",
        "budget_reference": "budget-1",
        "authority_receipt_sha256": authority["sha256"],
        "executed_at": "2026-08-21T11:00:00Z",
        "expires_at": "2026-09-21T11:00:00Z",
        "raw_outcome_sha256": canonical_digest(raw_outcome),
        "raw_outcome": raw_outcome,
        "exclusions": [],
        "deviations": [],
        "failures": [],
        "actual_cost": {"currency": "USD", "amount": 120},
        "cleanup_status": "PASS",
        "cleanup_proof_sha256": canonical_digest(cleanup_proof),
        "cleanup_proof": cleanup_proof,
        "cleanup_not_applicable_reason": None,
    }
    receipt["sha256"] = canonical_digest(receipt)
    value["receipt"] = receipt
    return value


def handoff() -> dict:
    now = datetime.now(timezone.utc)
    versions = contract_alias_versions()
    return {
        "schema_version": 4,
        "envelope_id": "handoff-1",
        "producer": "cascade-market-intelligence:evaluate-market-opportunity",
        "producer_version": versions["cascade-market-intelligence:evaluate-market-opportunity"],
        "consumer": "cascade-product:manage-product-lifecycle",
        "consumer_version": versions["cascade-product:manage-product-lifecycle"],
        "consumer_type": "CASCADE_PLUGIN",
        "mode": "PREPARE",
        "status": "READY",
        "input_artifacts": [{"id": "ledger-1", "version": "1", "sha256": DIGEST, "evidence_class": "SUPPLIED", "status": "READY"}],
        "output_artifacts": [{"id": "assessment-1", "version": "1", "sha256": DIGEST, "evidence_class": "DERIVED", "status": "READY"}],
        "expected_output": {"artifact_id": "product-decision-1", "artifact_version": "1", "status": "READY", "sha256": None},
        "budget": {"model_calls": 0, "tool_calls": 0, "external_writes": 0, "timeout_seconds": 900},
        "authority": {"decision_owner": "market-owner", "execution_authorized": False, "external_write_authorized": False},
        "data_policy": {"classification": "INTERNAL", "destination": "local-codex", "transfer_authorized": True},
        "freshness": {"produced_at": now.isoformat(), "expires_at": (now + timedelta(hours=1)).isoformat(), "status": "CURRENT"},
        "failure": {"classification": "NONE", "message": None, "retry_allowed": False},
        "resume": {"owner": None, "required_artifact": None, "not_applicable_reason": None, "next_action": None},
        "closure": {"requires_acknowledgment": False, "acknowledged": False, "acknowledgment_id": None},
    }


class MarketArtifactContractTests(unittest.TestCase):
    def test_valid_artifacts_pass(self) -> None:
        source = ledger()
        root = SCRIPT_ROOT.parent
        self.assertEqual(validate_schema(source, root / "schemas" / "evidence-ledger.schema.json"), [])
        self.assertEqual(validate_schema(opportunity(source), root / "schemas" / "opportunity-assessment.schema.json"), [])
        self.assertEqual(validate_schema(experiment(), root / "schemas" / "experiment-contract.schema.json"), [])
        self.assertEqual(validate_schema(executed_experiment(), root / "schemas" / "experiment-contract.schema.json"), [])
        self.assertEqual(validate_schema(handoff(), root / "schemas" / "handoff-envelope.schema.json"), [])
        self.assertEqual(validate_ledger(source), [])
        self.assertEqual(validate_opportunity(opportunity(source), ledger=source, ledger_digest=canonical_digest(source)), [])
        self.assertEqual(validate_experiment(experiment()), [])
        self.assertEqual(validate_experiment(executed_experiment()), [])
        self.assertEqual(validate_handoff(handoff()), [])

    def test_ready_ledger_rejects_unresolved_contradiction(self) -> None:
        value = ledger()
        value["claims"][0]["contradiction_ids"] = ["conflict-1"]
        value["claims"][1]["contradiction_ids"] = ["conflict-1"]
        value["contradictions"] = [{
            "contradiction_id": "conflict-1",
            "claim_ids": ["claim-behavior", "claim-transaction"],
            "resolution_status": "UNRESOLVED",
            "governing_rule": None,
        }]
        self.assertTrue(any("unresolved contradictions" in error for error in validate_ledger(value)))

    def test_ledger_rejects_nonreciprocal_cross_reference(self) -> None:
        value = ledger()
        value["contradictions"] = [{
            "contradiction_id": "conflict-1",
            "claim_ids": ["claim-behavior", "claim-transaction"],
            "resolution_status": "RESOLVED",
            "governing_rule": "Use directly observed behavior for the behavior claim.",
        }]
        self.assertTrue(any("not reciprocal" in error for error in validate_ledger(value)))

    def test_ready_ledger_rejects_vendor_only_evidence(self) -> None:
        value = ledger()
        value["claims"] = [claim("claim-vendor", "vendor-1", "VENDOR_CLAIM")]
        value["claims"][0]["source_type"] = "VENDOR_CLAIM"
        self.assertTrue(any("lacks current direct" in error for error in validate_ledger(value)))

    def test_contradiction_requires_distinct_claims(self) -> None:
        value = ledger()
        value["claims"][0]["contradiction_ids"] = ["conflict-1"]
        value["contradictions"] = [{
            "contradiction_id": "conflict-1",
            "claim_ids": ["claim-behavior", "claim-behavior"],
            "resolution_status": "RESOLVED",
            "governing_rule": "Use the same claim twice.",
        }]
        self.assertTrue(any("distinct claims" in error for error in validate_ledger(value)))

    def test_false_contradiction_and_untyped_behavior_are_rejected(self) -> None:
        value = ledger()
        value["claims"][0]["contradiction_ids"] = ["conflict-1"]
        value["claims"][1]["contradiction_ids"] = ["conflict-1"]
        value["claims"][1]["statement"] = value["claims"][0]["statement"]
        value["contradictions"] = [{
            "contradiction_id": "conflict-1",
            "claim_ids": ["claim-behavior", "claim-transaction"],
            "resolution_status": "RESOLVED",
            "governing_rule": "Prefer the later observation.",
        }]
        self.assertTrue(any("substantively distinct" in error for error in validate_ledger(value)))
        value = ledger()
        value["claims"][0]["entity_id"] = None
        self.assertTrue(any("lacks entity" in error for error in validate_ledger(value)))

    def test_opportunity_recomputes_digest_score_and_coverage(self) -> None:
        source = ledger()
        value = opportunity(source)
        value["ledger_sha256"] = "b" * 64
        value["score"] = 1.0
        value["coverage"] = 0.5
        errors = validate_opportunity(value, ledger=source, ledger_digest="c" * 64)
        self.assertTrue(any("canonical bytes" in error for error in errors))
        self.assertTrue(any("ledger_sha256" in error for error in errors))
        self.assertTrue(any("weighted formula" in error for error in errors))
        self.assertTrue(any("coverage" in error for error in errors))

    def test_opportunity_enforces_permitted_use_and_event_lineage(self) -> None:
        source = ledger()
        source["claims"][0]["permitted_uses"].remove("OPPORTUNITY_SCORING")
        value = opportunity(source)
        errors = validate_opportunity(value, ledger=source, ledger_digest=canonical_digest(source))
        self.assertTrue(any("OPPORTUNITY_SCORING" in error for error in errors))

        source = ledger()
        for item in source["claims"]:
            if item["evidence_kind"] in {"TRANSACTION", "RETENTION"}:
                item["event_id"] = f"one-event-{item['entity_id']}"
        value = opportunity(source)
        errors = validate_opportunity(value, ledger=source, ledger_digest=canonical_digest(source))
        self.assertTrue(any("distinct-entity rule" in error for error in errors))

    def test_synthetic_claim_cannot_advance_pmf(self) -> None:
        source = ledger()
        for index, source_type in ((1, "HYPOTHESIS"), (2, "INFERENCE"), (3, "HYPOTHESIS"), (4, "INFERENCE")):
            source["claims"][index]["source_type"] = source_type
            source["claims"][index]["evidence_kind"] = source_type
            source["claims"][index]["directness"] = "INFERRED"
        value = opportunity(source)
        errors = validate_opportunity(value, ledger=source, ledger_digest=canonical_digest(source))
        self.assertTrue(any("transaction and retention" in error for error in errors))

    def test_opportunity_rejects_invalid_ledger_and_interview_only_pmf(self) -> None:
        source = ledger()
        source["claims"][0]["retrieved_at"] = "2026-08-22T10:00:00Z"
        value = opportunity(source)
        errors = validate_opportunity(value, ledger=source, ledger_digest=canonical_digest(source))
        self.assertTrue(any("supplied ledger is invalid" in error for error in errors))

        source = ledger()
        source["claims"][0]["evidence_kind"] = "INTERVIEW"
        source["claims"][0]["source_type"] = "PARTICIPANT_REPORT"
        value = opportunity(source)
        value["pmf_state"] = "EARLY_SIGNAL"
        value["pmf_evidence_claim_ids"] = ["claim-behavior"]
        errors = validate_opportunity(value, ledger=source, ledger_digest=canonical_digest(source))
        self.assertTrue(any("observed behavioral evidence" in error for error in errors))

    def test_experiment_rejects_overlapping_thresholds(self) -> None:
        value = experiment()
        value["primary_metric"]["kill_operator"] = "GTE"
        value["primary_metric"]["kill_value"] = 0.2
        self.assertTrue(any("thresholds overlap" in error for error in validate_experiment(value)))

    def test_receipt_requires_matching_operator_and_permissions(self) -> None:
        value = executed_experiment()
        value["receipt"]["operator"] = "operator-b"
        value["permissions"]["cost_budget_approved"] = False
        errors = validate_experiment(value)
        self.assertTrue(any("does not match" in error for error in errors))
        self.assertTrue(any("required permissions" in error for error in errors))

    def test_fractional_receipt_requires_an_integer_numerator(self) -> None:
        value = executed_experiment()
        value["receipt"]["raw_outcome"]["record_count"] = 12
        value["receipt"]["raw_outcome"]["observed_value"] = 0.8
        value["receipt"]["raw_outcome_sha256"] = canonical_digest(value["receipt"]["raw_outcome"])
        value["receipt"]["sha256"] = canonical_digest({
            key: item for key, item in value["receipt"].items() if key != "sha256"
        })
        self.assertTrue(any("integer numerator" in error for error in validate_experiment(value)))

    def test_receipt_rejects_partial_and_failed_cleanup(self) -> None:
        value = executed_experiment()
        value["receipt"]["status"] = "PARTIAL"
        value["receipt"]["completeness_status"] = "PARTIAL"
        value["receipt"]["cleanup_status"] = "FAIL"
        value["receipt"]["cleanup_proof_sha256"] = None
        errors = validate_experiment(value)
        self.assertTrue(any("partial or invalid" in error for error in errors))
        self.assertTrue(any("failed cleanup" in error for error in errors))

    def test_receipt_rejects_forged_bytes_future_time_and_expired_authority(self) -> None:
        value = executed_experiment()
        value["receipt"]["raw_outcome"]["observed_value"] = 0.99
        errors = validate_experiment(value, now=datetime(2026, 8, 22, tzinfo=timezone.utc))
        self.assertTrue(any("raw outcome digest" in error for error in errors))
        self.assertTrue(any("receipt digest" in error for error in errors))

        value = executed_experiment()
        value["receipt"]["executed_at"] = "2026-08-23T11:00:00Z"
        value["receipt"]["sha256"] = canonical_digest({key: item for key, item in value["receipt"].items() if key != "sha256"})
        errors = validate_experiment(value, now=datetime(2026, 8, 22, tzinfo=timezone.utc))
        self.assertTrue(any("in the future" in error for error in errors))

        value = executed_experiment()
        authority = value["permissions"]["authority_receipt"]
        authority["expires_at"] = "2026-08-21T10:00:00Z"
        authority["sha256"] = canonical_digest({key: item for key, item in authority.items() if key != "sha256"})
        value["receipt"]["authority_receipt_sha256"] = authority["sha256"]
        value["receipt"]["sha256"] = canonical_digest({key: item for key, item in value["receipt"].items() if key != "sha256"})
        errors = validate_experiment(value, now=datetime(2026, 8, 22, tzinfo=timezone.utc))
        self.assertTrue(any("authority was not valid" in error for error in errors))

    def test_prepare_handoff_rejects_execution_authority(self) -> None:
        value = handoff()
        value["authority"]["execution_authorized"] = True
        self.assertTrue(any("cannot carry" in error for error in validate_handoff(value)))

    def test_handoff_versions_and_terminal_output_fail_closed(self) -> None:
        value = handoff()
        value["producer_version"] = "9.9.9"
        self.assertTrue(any("producer_version" in error for error in validate_handoff(value)))

        value = handoff()
        value["status"] = "PASS"
        value["output_artifacts"][0]["status"] = "PASS"
        value["expected_output"] = {
            "artifact_id": "assessment-1",
            "artifact_version": "1",
            "status": "PASS",
            "sha256": DIGEST,
        }
        value["closure"] = {"requires_acknowledgment": True, "acknowledged": True, "acknowledgment_id": "ack-1"}
        self.assertEqual(validate_handoff(value), [])
        value["expected_output"]["sha256"] = "b" * 64
        self.assertTrue(any("exactly satisfy" in error for error in validate_handoff(value)))

    def test_market_to_product_handoff_passes_both_semantic_validators(self) -> None:
        product_root = SCRIPT_ROOT.parent.parent / "cascade-product"
        spec = importlib.util.spec_from_file_location(
            "cascade_product_validate_artifact",
            product_root / "scripts" / "validate_artifact.py",
        )
        self.assertIsNotNone(spec)
        self.assertIsNotNone(spec.loader if spec else None)
        module = importlib.util.module_from_spec(spec)
        assert spec is not None and spec.loader is not None
        spec.loader.exec_module(module)
        value = handoff()
        self.assertEqual(
            module.validate_schema(value, product_root / "schemas" / "handoff-envelope.schema.json"),
            [],
        )
        self.assertEqual(module.validate_handoff(value), [])

    def test_strict_json_rejects_duplicate_members_and_unsafe_integers(self) -> None:
        with self.assertRaisesRegex(ValueError, "duplicate JSON member"):
            strict_json_loads('{"status":"READY","status":"BLOCKED"}')
        with self.assertRaisesRegex(ValueError, "unsafe I-JSON integer"):
            strict_json_loads('{"count":9007199254740992}')


if __name__ == "__main__":
    unittest.main()
