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
from test_artifact_contracts import decision, handoff, work_product
from validate_artifact import canonical_digest, contract_alias_versions


class ProductAssertionAdapterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.suite = json.loads((PLUGIN_ROOT / "evals" / "cases.json").read_text(encoding="utf-8"))

    def target(self) -> dict:
        results = []
        for case in self.suite["cases"]:
            expected = case["expected_status"]
            decision_artifact = decision()
            decision_artifact["approval_status"] = "PROPOSED"
            decision_artifact["transition_authority"] = None
            if expected in {"READY", "GAP", "BLOCKED", "INVALID"}:
                decision_artifact["gate_status"] = expected
                decision_artifact["unmet_conditions"] = (
                    [f"{expected.lower()} condition remains"] if expected in {"GAP", "BLOCKED"} else []
                )
            elif expected in {"PROPOSED", "PENDING_APPROVAL"}:
                decision_artifact["approval_status"] = expected
                if expected == "PENDING_APPROVAL":
                    decision_artifact["gate_status"] = "BLOCKED"
                    decision_artifact["unmet_conditions"] = ["decision-owner approval pending"]
            kind = {
                "define-product": "PRODUCT_DEFINITION",
                "manage-product-lifecycle": "LIFECYCLE_RECORD",
                "validate-product": "VALIDATION_REPORT",
            }[case["skill"]]
            product_artifact = work_product(kind=kind, status=expected)
            product_artifact["decision_id"] = decision_artifact["decision_id"]
            product_digest = canonical_digest(product_artifact)
            decision_artifact["work_product"] = {
                "artifact_id": product_artifact["artifact_id"],
                "version": product_artifact["version"],
                "status": product_artifact["status"],
                "sha256": product_digest,
            }
            handoff_artifacts = []
            if case["fixture"]["output_contract"]["require_handoff"]:
                handoff_artifact = handoff()
                if expected in {"GAP", "BLOCKED", "INVALID"}:
                    handoff_artifact["status"] = expected
                    handoff_artifact["output_artifacts"] = []
                    handoff_artifact["failure"] = {
                        "classification": "TOOL_FAILURE",
                        "message": f"{expected.lower()} handoff fixture",
                        "retry_allowed": True,
                    }
                    handoff_artifact["resume"] = {
                        "owner": "product-owner",
                        "required_artifact": None,
                        "not_applicable_reason": "retry after the bounded failure is resolved",
                        "next_action": "repair and retry",
                    }
                else:
                    handoff_artifact["output_artifacts"] = [{
                        "id": product_artifact["artifact_id"],
                        "version": product_artifact["version"],
                        "sha256": product_digest,
                        "evidence_class": "DERIVED",
                        "status": expected,
                    }]
                    handoff_artifact["expected_output"] = {
                        "artifact_id": product_artifact["artifact_id"],
                        "artifact_version": product_artifact["version"],
                        "status": product_artifact["status"],
                        "sha256": product_digest,
                    }
                handoff_artifacts.append({
                    "artifact": handoff_artifact,
                    "sha256": canonical_digest(handoff_artifact),
                })
            envelope = {
                "product_artifact": product_artifact,
                "product_artifact_sha256": product_digest,
                "decision": decision_artifact,
                "decision_sha256": canonical_digest(decision_artifact),
                "handoffs": handoff_artifacts,
            }
            results.append({
                "case_id": case["case_id"],
                "selected_skill": case["skill"],
                "status": expected,
                "response": json.dumps(envelope, separators=(",", ":"), sort_keys=True),
                "signals": {"contract_compliance": "PASS"},
                "evidence": [f"case:{case['case_id']}:response"],
            })
        return {
            "schema_version": 2,
            "evaluation_id": "product-fixture",
            "subject_digest": "a" * 64,
            "cases": results,
        }

    def test_status_routing_artifacts_and_digests_gate_mechanical_eligibility(self) -> None:
        receipt = evaluate(self.suite, self.target())
        self.assertEqual(receipt["status"], "PASS")
        self.assertEqual(receipt["semantic_status"], "NOT_RUN")

    def test_wrong_status_fails(self) -> None:
        target = self.target()
        target["cases"][0]["status"] = "INVALID"
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")

    def test_wrong_selected_skill_fails(self) -> None:
        target = self.target()
        target["cases"][0]["selected_skill"] = "validate-product"
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")

    def test_placeholder_prose_and_digest_tampering_fail(self) -> None:
        target = self.target()
        target["cases"][0]["response"] = "placeholder prose"
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")

    def test_digest_finalizer_repairs_only_computable_digest_bindings(self) -> None:
        target = self.target()
        envelope = json.loads(target["cases"][2]["response"])
        envelope["decision_sha256"] = "0" * 64
        envelope["product_artifact_sha256"] = "0" * 64
        envelope["decision"]["work_product"]["sha256"] = "0" * 64
        envelope["decision"]["evidence"].append({
            "artifact_id": envelope["product_artifact"]["artifact_id"],
            "version": envelope["product_artifact"]["version"],
            "sha256": "0" * 64,
            "evidence_class": "ACCEPTED_DECISION",
            "acceptance_status": "ACCEPTED",
            "accepted_by": "product-owner",
            "scope": "typed Product output identity",
            "as_of": "2026-08-23T00:00:00Z",
        })
        envelope["handoffs"][0]["sha256"] = "0" * 64
        envelope["handoffs"][0]["artifact"]["output_artifacts"][0]["sha256"] = "0" * 64
        target["cases"][2]["response"] = json.dumps(envelope)
        finalized = finalize_target(self.suite, target)
        self.assertEqual(evaluate(self.suite, finalized)["status"], "PASS")
        target = self.target()
        envelope = json.loads(target["cases"][0]["response"])
        envelope["decision_sha256"] = "0" * 64
        target["cases"][0]["response"] = json.dumps(envelope)
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")

    def test_duplicate_nested_response_member_fails(self) -> None:
        target = self.target()
        raw = target["cases"][0]["response"]
        raw = raw.replace('"decision_sha256":', '"decision_sha256":"' + "0" * 64 + '","decision_sha256":', 1)
        target["cases"][0]["response"] = raw
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")

    def test_forward_decision_with_blocked_required_handoff_fails(self) -> None:
        target = self.target()
        index = next(
            index
            for index, case in enumerate(self.suite["cases"])
            if case["expected_status"] in {"READY", "PROPOSED"}
            and case["fixture"]["output_contract"]["require_handoff"]
        )
        envelope = json.loads(target["cases"][index]["response"])
        wrapper = envelope["handoffs"][0]
        artifact = wrapper["artifact"]
        artifact["status"] = "BLOCKED"
        artifact["output_artifacts"] = []
        artifact["failure"] = {"classification": "TOOL_FAILURE", "message": "blocked", "retry_allowed": True}
        artifact["resume"] = {
            "owner": "product-owner",
            "required_artifact": None,
            "not_applicable_reason": "repair dependency",
            "next_action": "repair dependency",
        }
        wrapper["sha256"] = canonical_digest(artifact)
        target["cases"][index]["response"] = json.dumps(envelope, separators=(",", ":"), sort_keys=True)
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")

    def test_additional_successful_input_handoff_does_not_need_to_republish_product_output(self) -> None:
        target = self.target()
        index = next(
            index
            for index, case in enumerate(self.suite["cases"])
            if case["expected_status"] in {"READY", "PROPOSED"}
            and case["fixture"]["output_contract"]["require_handoff"]
        )
        envelope = json.loads(target["cases"][index]["response"])
        inbound = handoff()
        versions = contract_alias_versions()
        inbound["producer"] = "cascade-personas:compile-persona"
        inbound["producer_version"] = versions[inbound["producer"]]
        inbound["consumer"] = "cascade-product:define-product"
        inbound["consumer_version"] = versions[inbound["consumer"]]
        envelope["handoffs"].append({"artifact": inbound, "sha256": canonical_digest(inbound)})
        target["cases"][index]["response"] = json.dumps(envelope, separators=(",", ":"), sort_keys=True)
        self.assertEqual(evaluate(self.suite, target)["status"], "PASS")

    def test_required_forward_handoff_set_must_bind_product_output_once(self) -> None:
        target = self.target()
        index = next(
            index
            for index, case in enumerate(self.suite["cases"])
            if case["expected_status"] in {"READY", "PROPOSED"}
            and case["fixture"]["output_contract"]["require_handoff"]
        )
        envelope = json.loads(target["cases"][index]["response"])
        envelope["handoffs"][0]["artifact"]["output_artifacts"][0]["id"] = "different-product-output"
        envelope["handoffs"][0]["sha256"] = canonical_digest(envelope["handoffs"][0]["artifact"])
        target["cases"][index]["response"] = json.dumps(envelope, separators=(",", ":"), sort_keys=True)
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")

    def test_required_forward_handoff_expected_output_must_match_product_status(self) -> None:
        target = self.target()
        index = next(
            index
            for index, case in enumerate(self.suite["cases"])
            if case["expected_status"] in {"READY", "PROPOSED"}
            and case["fixture"]["output_contract"]["require_handoff"]
        )
        envelope = json.loads(target["cases"][index]["response"])
        artifact = envelope["handoffs"][0]["artifact"]
        artifact["expected_output"]["status"] = "READY" if envelope["product_artifact"]["status"] != "READY" else "PASS"
        envelope["handoffs"][0]["sha256"] = canonical_digest(artifact)
        target["cases"][index]["response"] = json.dumps(envelope, separators=(",", ":"), sort_keys=True)
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")

    def test_missing_core_work_product_fails(self) -> None:
        target = self.target()
        envelope = json.loads(target["cases"][0]["response"])
        envelope.pop("product_artifact")
        target["cases"][0]["response"] = json.dumps(envelope)
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")

    def test_decision_work_product_binding_must_match_typed_output(self) -> None:
        target = self.target()
        envelope = json.loads(target["cases"][0]["response"])
        envelope["decision"]["work_product"]["artifact_id"] = "different-output"
        envelope["decision_sha256"] = canonical_digest(envelope["decision"])
        target["cases"][0]["response"] = json.dumps(envelope)
        self.assertEqual(evaluate(self.suite, target)["status"], "INVALID")

    def test_unsupported_semantic_assertion_fails_closed(self) -> None:
        suite = copy.deepcopy(self.suite)
        suite["assertion_catalog"]["semantic_by_keyword"] = {"evidence_identity": "ME-bad"}
        suite["cases"][0]["mechanical_assertions"].append("semantic_by_keyword")
        self.assertEqual(evaluate(suite, self.target())["status"], "INVALID")


if __name__ == "__main__":
    unittest.main()
