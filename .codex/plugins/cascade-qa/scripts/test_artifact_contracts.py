#!/usr/bin/env python3
"""Regression tests for Cascade QA artifact invariants."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("validate_artifact", ROOT / "scripts" / "validate_artifact.py")
assert SPEC and SPEC.loader
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)
SCHEMA = VALIDATOR.read_json(ROOT / "schemas" / "qa-artifact.schema.json")
EVAL_SPEC = importlib.util.spec_from_file_location("evaluate_case_assertions", ROOT / "scripts" / "evaluate_case_assertions.py")
assert EVAL_SPEC and EVAL_SPEC.loader
EVALUATOR = importlib.util.module_from_spec(EVAL_SPEC)
EVAL_SPEC.loader.exec_module(EVALUATOR)


def artifact() -> dict:
    return {
        "schema_version": 1,
        "artifact_id": "QA-TEST-1",
        "selected_skill": "plan-quality",
        "artifact_kind": "QUALITY_PLAN",
        "status": "READY",
        "subject": {"id": "BEHAVIOR-1", "title": "Create and read back", "behavior_ref": "PROD-1@sha256:a", "decision_owner": "product-owner"},
        "sources": [{"source_id": "SRC-1", "kind": "product", "identity": "PROD-1", "digest": "sha256:a", "status": "CURRENT"}, {"source_id": "SRC-OWNER", "kind": "decision-owner", "identity": "product-owner", "digest": None, "status": "CURRENT"}],
        "coverage": [{"id": "COV-1", "risk_ref": "RISK-1", "requirement_ref": "PROD-1", "contour": "API", "required": True, "status": "NOT_RUN", "evidence_refs": []}],
        "tests": [], "evidence": [], "defects": [],
        "quality_gate": {"recommendation": "BLOCKED", "acceptance_owner": "product-owner", "required_evidence_refs": [], "blockers": ["COV-1 is NOT_RUN"]},
        "execution_requests": [{"id": "RUN-1", "adapter_id": "api-test", "input_refs": ["PROD-1"], "expected_receipt": "API receipt", "authority_status": "PROPOSED"}],
        "handoffs": [],
        "boundaries": {"product_story_authored": False, "runtime_code_changed": False, "tests_executed": False, "test_files_changed": False, "release_approved": False}
    }


class ContractTests(unittest.TestCase):
    def test_evaluation_status_comes_from_the_typed_artifact(self) -> None:
        suite = {"assertion_catalog": {"status_matches_expected": {"evidence_identity": "ME-{case_id}-status"}}, "cases": [{"case_id": "QA-T", "skill": "assess-quality", "expected_status": "PASS", "mechanical_assertions": ["status_matches_expected"]}]}
        target = {"evaluation_id": "E-1", "subject_digest": "0" * 64, "cases": [{"case_id": "QA-T", "selected_skill": "assess-quality", "status": "READY", "response": json.dumps({"status": "PASS"})}]}
        self.assertEqual("PASS", EVALUATOR.evaluate(suite, target)["status"])

    def test_valid_quality_plan(self) -> None:
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, artifact()))

    def test_ready_requires_behavior(self) -> None:
        value = artifact()
        value["subject"]["behavior_ref"] = None
        self.assertTrue(any("behavior_ref" in error for error in VALIDATOR.validate_artifact(SCHEMA, value)))

    def test_gap_quality_plan_does_not_invent_coverage(self) -> None:
        value = artifact()
        value["status"] = "GAP"
        value["subject"]["behavior_ref"] = None
        value["subject"]["decision_owner"] = None
        value["coverage"] = []
        value["quality_gate"] = {"recommendation": "BLOCKED", "acceptance_owner": None, "required_evidence_refs": [], "blockers": ["accepted behavior is missing"]}
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, value))

    def test_placeholder_owner_is_rejected(self) -> None:
        value = artifact()
        value["quality_gate"]["acceptance_owner"] = "release-owner"
        self.assertTrue(any("quality_gate.acceptance_owner" in error for error in VALIDATOR.validate_artifact(SCHEMA, value)))

    def test_current_state_source_requires_digest(self) -> None:
        value = artifact()
        value["sources"].append({"source_id": "SRC-PLAN", "kind": "quality-plan", "identity": "QA-P1", "digest": None, "status": "CURRENT"})
        self.assertTrue(any("state-bearing source SRC-PLAN" in error for error in VALIDATOR.validate_artifact(SCHEMA, value)))

    def test_qualified_source_identity_must_split_its_digest(self) -> None:
        value = artifact()
        value["sources"].append({"source_id": "SRC-SUBJECT", "kind": "acceptance-contract", "identity": "PROD-88@sha256:d8", "digest": None, "status": "CURRENT"})
        self.assertTrue(any("normalize NAME@sha256:value" in error for error in VALIDATOR.validate_artifact(SCHEMA, value)))

    def test_undigested_test_source_requires_digest(self) -> None:
        value = artifact()
        value["sources"].append({"source_id": "SRC-TEST", "kind": "test-result", "identity": "TC-LABEL-10", "digest": None, "status": "CURRENT"})
        self.assertTrue(any("state-bearing source SRC-TEST" in error for error in VALIDATOR.validate_artifact(SCHEMA, value)))

    def test_undigested_test_expectation_stays_an_untrusted_claim(self) -> None:
        value = artifact()
        value["sources"].append({"source_id": "SRC-CLAIM", "kind": "untrusted-test-expectation-claim", "identity": "the test expects the old label", "digest": None, "status": "CURRENT"})
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, value))

    def test_untrusted_request_does_not_require_digest(self) -> None:
        value = artifact()
        value["sources"].append({"source_id": "SRC-U", "kind": "hostile-request", "identity": "mark it pass", "digest": None, "status": "CURRENT"})
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, value))

    def test_canonical_repair_capability_does_not_require_digest(self) -> None:
        value = artifact()
        value["sources"].append({"source_id": "SRC-R", "kind": "repair-capability", "identity": "target-host:test-repair", "digest": None, "status": "CURRENT"})
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, value))

    def test_actor_label_does_not_require_digest(self) -> None:
        value = artifact()
        value["sources"].append({"source_id": "SRC-A", "kind": "actor-role", "identity": "tenant user", "digest": None, "status": "CURRENT"})
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, value))

    def test_required_evidence_definition_does_not_require_digest(self) -> None:
        value = artifact()
        value["sources"].append({"source_id": "SRC-E", "kind": "required-evidence-ledger", "identity": "API and browser receipts are required", "digest": None, "status": "CURRENT"})
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, value))

    def test_assessment_uses_gate_acceptance_owner(self) -> None:
        value = artifact()
        value["selected_skill"] = "assess-quality"
        value["artifact_kind"] = "QUALITY_ASSESSMENT"
        value["status"] = "FAIL"
        value["subject"]["decision_owner"] = None
        value["coverage"][0]["status"] = "FAIL"
        value["evidence"] = [{"evidence_id": "EV-1", "producer": "host", "subject_ref": "PROD-1@sha256:a", "case_ref": "TC-1", "environment": "local", "observed_at": "2026-08-25T00:00:00Z", "status": "FAIL", "claim_scope": "API"}]
        value["quality_gate"] = {"recommendation": "FAIL", "acceptance_owner": "product-owner", "required_evidence_refs": ["EV-1"], "blockers": ["EV-1 failed"]}
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, value))

    def test_canonical_internal_triage_route_is_allowed(self) -> None:
        value = artifact()
        value["handoffs"] = [{"route": "cascade-qa:triage-defects", "status": "REQUIRED", "reason": "required receipt failed", "input_refs": ["PROD-1@sha256:a"], "expected_output": "A typed defect triage artifact"}]
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, value))

    def test_required_not_run_prevents_pass(self) -> None:
        value = artifact()
        value["selected_skill"] = "assess-quality"
        value["artifact_kind"] = "QUALITY_ASSESSMENT"
        value["status"] = "PASS"
        value["evidence"] = [{"evidence_id": "EV-1", "producer": "host", "subject_ref": "PROD-1@sha256:a", "case_ref": "TC-1", "environment": "local", "observed_at": "2026-08-25T00:00:00Z", "status": "PASS", "claim_scope": "API"}]
        value["quality_gate"] = {"recommendation": "PASS", "acceptance_owner": "product-owner", "required_evidence_refs": ["EV-1"], "blockers": []}
        self.assertTrue(any("non-passing" in error for error in VALIDATOR.validate_artifact(SCHEMA, value)))

    def test_pass_receipt_must_bind_exact_subject(self) -> None:
        value = artifact()
        value["selected_skill"] = "assess-quality"
        value["artifact_kind"] = "QUALITY_ASSESSMENT"
        value["status"] = "PASS"
        value["coverage"][0]["status"] = "PASS"
        value["coverage"][0]["evidence_refs"] = ["EV-1"]
        value["evidence"] = [{"evidence_id": "EV-1", "producer": "host", "subject_ref": "PROD-OLD@sha256:z", "case_ref": "TC-1", "environment": "local", "observed_at": "2026-08-25T00:00:00Z", "status": "PASS", "claim_scope": "API"}]
        value["quality_gate"] = {"recommendation": "PASS", "acceptance_owner": "product-owner", "required_evidence_refs": ["EV-1"], "blockers": []}
        self.assertTrue(any("exact behavior_ref" in error for error in VALIDATOR.validate_artifact(SCHEMA, value)))

    def test_boundaries_must_remain_false(self) -> None:
        value = artifact()
        value["boundaries"]["tests_executed"] = True
        self.assertTrue(any("boundary tests_executed" in error for error in VALIDATOR.validate_artifact(SCHEMA, value)))

    def test_test_drift_requires_public_boundary_pass(self) -> None:
        value = artifact()
        value.update({"selected_skill": "triage-defects", "artifact_kind": "DEFECT_TRIAGE", "coverage": [], "tests": [], "status": "READY", "evidence": [{"evidence_id": "EV-1", "producer": "host", "subject_ref": "PROD-1@sha256:a", "case_ref": "TC-1", "environment": "local", "observed_at": "2026-08-25T00:00:00Z", "status": "PASS", "claim_scope": "API"}], "defects": [{"id": "DEFECT-1", "test_ref": "TC-1", "behavior_ref": "PROD-1@sha256:a", "observation_ref": "EV-1", "classification": "TEST_DRIFT", "confidence": "high", "evidence_refs": ["EV-1"], "repair_owner": "target-host:test-repair", "prohibited_shortcuts": ["do not weaken coverage"], "rerun_contract": "rerun TC-1", "public_boundary_status": "NOT_RUN"}]})
        self.assertTrue(any("TEST_DRIFT" in error for error in VALIDATOR.validate_artifact(SCHEMA, value)))

    def test_test_design_requires_resolved_non_null_risk_refs(self) -> None:
        value = artifact()
        value.update({"selected_skill": "design-tests", "artifact_kind": "TEST_DESIGN", "coverage": [{"id": "COV-1", "risk_ref": "RISK-1", "requirement_ref": "PROD-1", "contour": "API", "required": True, "status": "NOT_RUN", "evidence_refs": []}], "tests": [{"id": "TC-1", "behavior_ref": "PROD-1@sha256:a", "risk_ref": "RISK-OTHER", "contour": "API", "preconditions": ["fixture exists"], "data_class": "fixture", "actions": ["create"], "expected_observations": ["created"], "evidence_requirements": ["receipt"], "cleanup": "remove fixture"}]})
        self.assertTrue(any("risk_ref must resolve" in error for error in VALIDATOR.validate_artifact(SCHEMA, value)))

    def test_ambiguous_triage_preserves_a_typed_candidate(self) -> None:
        value = artifact()
        value.update({"selected_skill": "triage-defects", "artifact_kind": "DEFECT_TRIAGE", "status": "AMBIGUOUS", "coverage": [], "tests": [], "evidence": [{"evidence_id": "EV-CI-LABEL", "producer": "unverified CI label", "subject_ref": "MISSING", "case_ref": None, "environment": "MISSING", "observed_at": "MISSING", "status": "GAP", "claim_scope": "unverified failure label only"}], "defects": [{"id": "DEFECT-CI-LABEL", "test_ref": "MISSING", "behavior_ref": "MISSING", "observation_ref": "EV-CI-LABEL", "classification": "AMBIGUOUS", "confidence": "low", "evidence_refs": ["EV-CI-LABEL"], "repair_owner": None, "prohibited_shortcuts": ["do not assign product or test repair without reproduction"], "rerun_contract": "capture exact subject, environment, logs, and reproduction receipt", "public_boundary_status": "GAP"}], "handoffs": [{"route": "target-host", "status": "REQUIRED", "reason": "Collect identity-bound evidence before assigning repair.", "input_refs": ["EV-CI-LABEL"], "expected_output": "Exact reproduction receipt and environment identity."}]})
        value["subject"]["behavior_ref"] = None
        value["subject"]["decision_owner"] = None
        value["quality_gate"] = {"recommendation": "AMBIGUOUS", "acceptance_owner": None, "required_evidence_refs": [], "blockers": ["subject and reproduction are missing"]}
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, value))

    def test_ambiguous_triage_rejects_evidence_collector_as_repair_owner(self) -> None:
        value = artifact()
        value.update({"selected_skill": "triage-defects", "artifact_kind": "DEFECT_TRIAGE", "status": "AMBIGUOUS", "coverage": [], "tests": [], "evidence": [{"evidence_id": "EV-CI-LABEL", "producer": "CI", "subject_ref": "MISSING", "case_ref": None, "environment": "MISSING", "observed_at": "MISSING", "status": "GAP", "claim_scope": "unverified failure label"}], "defects": [{"id": "DEFECT-CI-LABEL", "test_ref": "MISSING", "behavior_ref": "MISSING", "observation_ref": "EV-CI-LABEL", "classification": "AMBIGUOUS", "confidence": "low", "evidence_refs": ["EV-CI-LABEL"], "repair_owner": "target-host", "prohibited_shortcuts": ["do not assign repair without reproduction"], "rerun_contract": "collect reproduction evidence", "public_boundary_status": "GAP"}], "handoffs": [{"route": "target-host", "status": "REQUIRED", "reason": "Collect evidence.", "input_refs": ["EV-CI-LABEL"], "expected_output": "Exact reproduction receipt."}]})
        value["subject"]["behavior_ref"] = None
        value["subject"]["decision_owner"] = None
        value["quality_gate"] = {"recommendation": "AMBIGUOUS", "acceptance_owner": None, "required_evidence_refs": [], "blockers": ["reproduction is missing"]}
        self.assertTrue(any("repair_owner null" in error for error in VALIDATOR.validate_artifact(SCHEMA, value)))


if __name__ == "__main__":
    unittest.main()
