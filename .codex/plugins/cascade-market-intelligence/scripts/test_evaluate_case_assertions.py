#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
from pathlib import Path
import sys
import unittest


SCRIPT_ROOT = Path(__file__).resolve().parent
PLUGIN_ROOT = SCRIPT_ROOT.parent
sys.path.insert(0, str(SCRIPT_ROOT))

from evaluate_case_assertions import evaluate, finalize_target
from test_artifact_contracts import executed_experiment, experiment, handoff, ledger, opportunity
from validate_artifact import canonical_digest


def executed_from_frozen(wrapper: dict) -> dict:
    value = executed_experiment()
    frozen = wrapper["artifact"]
    for field in (
        "experiment_id", "version", "segment", "geography", "instrument",
        "primary_metric", "sample_rule", "stopping_rule", "analysis_method",
        "operator", "decision_routes",
    ):
        value[field] = copy.deepcopy(frozen[field])
    value["input_artifacts"] = [{
        "id": frozen["experiment_id"],
        "version": frozen["version"],
        "sha256": wrapper["sha256"],
        "alias": "cascade-market-intelligence:design-market-experiments",
        "status": "READY",
        "evidence_class": "SUPPLIED",
        "scope": "digest-bound frozen experiment terms",
        "permitted_use": "EXPERIMENT_DESIGN",
    }]
    value["hypothesis_evidence_ids"] = [frozen["experiment_id"]]
    value["baseline"]["metric_id"] = frozen["primary_metric"]["metric_id"]
    value["baseline"]["source_artifact_id"] = frozen["experiment_id"]
    operator = frozen["operator"]
    value["privacy_plan"]["destination"] = operator["destination"]
    authority = value["permissions"]["authority_receipt"]
    authority["subject"] = operator["owner"]
    authority["destination"] = operator["destination"]
    authority["budget_reference"] = operator["budget_reference"]
    authority["sha256"] = canonical_digest({key: item for key, item in authority.items() if key != "sha256"})
    receipt = value["receipt"]
    receipt["experiment_id"] = frozen["experiment_id"]
    receipt["experiment_version"] = frozen["version"]
    receipt["issuer"] = operator["owner"]
    receipt["operator"] = operator["owner"]
    receipt["destination"] = operator["destination"]
    receipt["budget_reference"] = operator["budget_reference"]
    receipt["authority_receipt_sha256"] = authority["sha256"]
    receipt["raw_outcome"]["metric_id"] = frozen["primary_metric"]["metric_id"]
    receipt["raw_outcome"]["record_count"] = 10
    receipt["raw_outcome"]["observed_value"] = 0.8
    receipt["raw_outcome_sha256"] = canonical_digest(receipt["raw_outcome"])
    receipt["sha256"] = canonical_digest({key: item for key, item in receipt.items() if key != "sha256"})
    return value


class MarketAssertionAdapterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.suite = json.loads((PLUGIN_ROOT / "evals" / "cases.json").read_text(encoding="utf-8"))

    def target(self) -> dict:
        results = []
        for case in self.suite["cases"]:
            response = "Semantic quality is intentionally left to blind independent judges."
            if "market_artifact_valid" in case["mechanical_assertions"]:
                contract = case["fixture"]["output_contract"]
                expected_state = contract["expected_artifact_status"]
                supporting_artifacts = []
                if case["skill"] == "research-market":
                    artifact = ledger()
                    artifact["status"] = expected_state
                    if expected_state != "READY":
                        artifact["gaps"] = [f"{expected_state.lower()} market evidence remains"]
                elif case["skill"] == "evaluate-market-opportunity":
                    frozen = case["fixture"].get("frozen_inputs", [])
                    source = copy.deepcopy(frozen[0]["artifact"]) if frozen else ledger()
                    artifact = opportunity(source)
                    artifact["decision_status"] = expected_state
                    if expected_state in {"ABSTAIN", "BLOCKED"}:
                        artifact["score"] = None
                        artifact["pmf_state"] = "UNTESTED"
                        artifact["pmf_evidence_claim_ids"] = []
                        artifact["expires_at"] = None
                        artifact["gaps"] = [f"{expected_state.lower()} opportunity evidence remains"]
                    supporting_artifacts = [{
                        "kind": "EVIDENCE_LEDGER",
                        "artifact": source,
                        "sha256": canonical_digest(source),
                    }]
                else:
                    frozen_experiment = case["fixture"].get("frozen_experiment")
                    if expected_state == "RECEIPT_SUPPLIED" and isinstance(frozen_experiment, dict):
                        artifact = executed_from_frozen(frozen_experiment)
                    else:
                        artifact = executed_experiment() if expected_state == "RECEIPT_SUPPLIED" else experiment()
                handoffs = []
                if contract["require_handoff"]:
                    handoff_artifact = handoff()
                    if case["expected_status"] == "BLOCKED":
                        handoff_artifact["status"] = "BLOCKED"
                        handoff_artifact["output_artifacts"] = []
                        handoff_artifact["failure"] = {
                            "classification": "MISSING_INPUT",
                            "message": "required dependency is disabled",
                            "retry_allowed": True,
                        }
                        handoff_artifact["resume"] = {
                            "owner": "market-owner",
                            "required_artifact": "enabled cascade-prompt:prompt",
                            "not_applicable_reason": None,
                            "next_action": "enable the exact dependency and retry",
                        }
                    elif expected_state == "RECEIPT_SUPPLIED":
                        receipt = artifact["receipt"]
                        handoff_artifact["input_artifacts"] = [{
                            "id": receipt["receipt_id"],
                            "version": receipt["version"],
                            "sha256": receipt["sha256"],
                            "evidence_class": "RECEIPT",
                            "status": receipt["status"],
                        }]
                        handoff_artifact["output_artifacts"] = [{
                            "id": artifact["experiment_id"],
                            "version": artifact["version"],
                            "sha256": canonical_digest(artifact),
                            "evidence_class": "DERIVED",
                            "status": "PASS",
                        }]
                    handoffs.append({
                        "artifact": handoff_artifact,
                        "sha256": canonical_digest(handoff_artifact),
                    })
                response = json.dumps({
                    "artifact": artifact,
                    "artifact_sha256": canonical_digest(artifact),
                    "supporting_artifacts": supporting_artifacts,
                    "handoffs": handoffs,
                }, separators=(",", ":"), sort_keys=True)
            results.append({
                "case_id": case["case_id"],
                "selected_skill": case["skill"],
                "status": case["expected_status"],
                "response": response,
                "signals": {"contract_compliance": "PASS"},
                "evidence": [f"case:{case['case_id']}:response"],
            })
        return {
            "schema_version": 2,
            "evaluation_id": "market-fixture",
            "subject_digest": "a" * 64,
            "cases": results,
        }

    def test_status_and_all_market_artifacts_gate_mechanical_eligibility(self) -> None:
        receipt = evaluate(self.suite, self.target())
        self.assertEqual(receipt["status"], "PASS")
        self.assertEqual(receipt["semantic_status"], "NOT_RUN")

    def test_wrong_status_fails(self) -> None:
        target = self.target()
        target["cases"][0]["status"] = "INVALID"
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")

    def test_wrong_selected_skill_fails(self) -> None:
        target = self.target()
        target["cases"][0]["selected_skill"] = "evaluate-market-opportunity"
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")

    def test_market_prose_or_digest_tampering_fails(self) -> None:
        target = self.target()
        target["cases"][5]["response"] = "placeholder prose"
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")
        target = self.target()
        envelope = json.loads(target["cases"][5]["response"])
        envelope["artifact_sha256"] = "0" * 64
        target["cases"][5]["response"] = json.dumps(envelope)
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")

    def test_digest_finalizer_repairs_only_computable_market_digest_bindings(self) -> None:
        target = self.target()
        opportunity_envelope = json.loads(target["cases"][3]["response"])
        opportunity_envelope["artifact_sha256"] = "0" * 64
        opportunity_envelope["artifact"]["ledger_sha256"] = "0" * 64
        opportunity_envelope["supporting_artifacts"][0]["sha256"] = "0" * 64
        target["cases"][3]["response"] = json.dumps(opportunity_envelope)

        experiment_envelope = json.loads(target["cases"][7]["response"])
        experiment = experiment_envelope["artifact"]
        experiment_envelope["artifact_sha256"] = "0" * 64
        experiment["permissions"]["authority_receipt"]["sha256"] = "0" * 64
        experiment["receipt"]["authority_receipt_sha256"] = "0" * 64
        experiment["receipt"]["raw_outcome_sha256"] = "0" * 64
        experiment["receipt"]["cleanup_proof_sha256"] = "0" * 64
        experiment["receipt"]["sha256"] = "0" * 64
        experiment_envelope["handoffs"][0]["artifact"]["input_artifacts"][0]["sha256"] = "0" * 64
        experiment_envelope["handoffs"][0]["artifact"]["output_artifacts"][0]["sha256"] = "0" * 64
        experiment_envelope["handoffs"][0]["sha256"] = "0" * 64
        target["cases"][7]["response"] = json.dumps(experiment_envelope)

        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")
        finalized = finalize_target(self.suite, target)
        self.assertEqual(evaluate(self.suite, finalized)["status"], "PASS")

    def test_required_product_handoff_must_bind_receipt_and_market_output(self) -> None:
        target = self.target()
        envelope = json.loads(target["cases"][7]["response"])
        handoff = envelope["handoffs"][0]["artifact"]
        handoff["input_artifacts"][0]["id"] = "wrong-receipt"
        envelope["handoffs"][0]["sha256"] = canonical_digest(handoff)
        target["cases"][7]["response"] = json.dumps(envelope)
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")

        target = self.target()
        envelope = json.loads(target["cases"][7]["response"])
        handoff = envelope["handoffs"][0]["artifact"]
        handoff["output_artifacts"][0]["id"] = "wrong-experiment"
        envelope["handoffs"][0]["sha256"] = canonical_digest(handoff)
        target["cases"][7]["response"] = json.dumps(envelope)
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")

    def test_digest_finalizer_does_not_repair_semantic_identity(self) -> None:
        target = self.target()
        envelope = json.loads(target["cases"][3]["response"])
        envelope["artifact"]["ledger_id"] = "wrong-ledger"
        envelope["artifact_sha256"] = "0" * 64
        target["cases"][3]["response"] = json.dumps(envelope)
        finalized = finalize_target(self.suite, target)
        self.assertEqual(evaluate(self.suite, finalized)["status"], "INVALID")

    def test_unsupported_semantic_assertion_fails_closed(self) -> None:
        suite = copy.deepcopy(self.suite)
        suite["assertion_catalog"]["semantic_by_keyword"] = {"evidence_identity": "ME-bad"}
        suite["cases"][0]["mechanical_assertions"].append("semantic_by_keyword")
        self.assertEqual(evaluate(suite, self.target())["status"], "INVALID")


if __name__ == "__main__":
    unittest.main()
