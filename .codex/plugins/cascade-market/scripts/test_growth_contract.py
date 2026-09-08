from __future__ import annotations

import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from evaluate_case_assertions import market_artifact_errors
from validate_artifact import canonical_digest, validate_growth, validate_schema

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "schemas/growth-strategy.schema.json"


def strategy():
    return {
        "schema_version": 4, "kind": "GROWTH_STRATEGY",
        "strategy_id": "move-1", "version": "1", "status": "READY",
        "decision": {"action": "TEST", "rationale": "Test qualified demand before expanding.", "unknowns": ["Acquisition cost"]},
        "scope": {"segment": "People preparing one application", "job": "Complete the application",
                  "outcome": "Submit an accurate application", "cadence": "FINITE",
                  "business_objective": "Sustainable paid service", "product_version": "1"},
        "source_bindings": [],
        "channels": [{"channel_id": "search", "motion": "Intentional search",
                      "reach_hypothesis": "Reach people during application preparation",
                      "constraints": ["Unknown entrant cost"], "evidence_ids": []}],
        "stages": [{"stage": "OUTCOME", "mechanism": "Guided preparation",
                    "metric": "Accurate completed application", "denominator": "Eligible applications",
                    "status": "HYPOTHESIS", "evidence_ids": []}],
        "economics": {"status": "UNKNOWN", "unit": "USD per completed application", "window": "Pilot cohort",
                      "cost_basis": "Include acquisition, staff review, support and refunds",
                      "net_contribution": None, "marginal_acquisition_cost": None,
                      "assumptions": ["Unknown review cost"], "concentration": ["Search access"], "evidence_ids": []},
        "product_feedback": [{"feedback_id": "f-1", "changed_hypothesis": "First useful action",
                              "requirement_id": "REQ-1", "reason": "Investigate preparation friction",
                              "evidence_ids": [], "owner": "cascade-product:define-product",
                              "next_action": "Compare a simpler first step with current REQ-1"}],
        "next_test": {"hypothesis": "The offered service addresses the application job",
                      "unit": "Eligible applicant", "baseline": "Current manual preparation",
                      "success": "Complete an accurate application with acceptable effort; confirm criterion with owner",
                      "guardrails": ["No misleading outcome promises"],
                      "failure": "Revise the offer", "inconclusive": "Inspect selection and missing outcomes",
                      "owner": "Product owner", "time_limit": "One agreed pilot window",
                      "budget_limit": "Owner acceptance required before any spend", "status": "PROPOSED"},
        "learning": {"reopen_decision": "offer-1", "review_trigger": "Pilot outcome review",
                     "evidence_limitations": ["No live experiment has run"]},
        "execution": {"publication": "NOT_RUN", "spend": "NOT_RUN", "implementation": "NOT_RUN"},
    }


def evidenced_scale():
    value = strategy()
    value["decision"] = {"action": "SCALE", "rationale": "Bounded increase from observed cohort results", "unknowns": []}
    value["source_bindings"] = [
        {"id": "outcomes", "version": "1", "sha256": "a" * 64, "evidence_class": "OBSERVATION", "status": "CURRENT"},
        {"id": "payments", "version": "1", "sha256": "b" * 64, "evidence_class": "PAYMENT", "status": "CURRENT"},
    ]
    value["stages"] = [
        {"stage": stage, "mechanism": "Pilot service", "metric": stage.lower(),
         "denominator": "Eligible pilot cohort", "status": "OBSERVED", "evidence_ids": [source]}
        for stage, source in [("ACTIVATION", "outcomes"), ("OUTCOME", "outcomes"), ("PAYMENT", "payments")]
    ]
    value["economics"].update(status="OBSERVED", net_contribution=12, marginal_acquisition_cost=4, evidence_ids=["payments", "outcomes"])
    return value


class GrowthContractTests(unittest.TestCase):
    def errors(self, value):
        structural = validate_schema(value, SCHEMA)
        return structural or validate_growth(value)

    def test_finite_job_plan_preserves_unknown_economics_and_product_feedback(self):
        self.assertEqual(self.errors(strategy()), [])

    def test_scale_requires_observed_value_and_net_economics(self):
        value = strategy()
        value["decision"]["action"] = "SCALE"
        errors = self.errors(value)
        self.assertIn("SCALE requires observed positive net contribution", errors)
        self.assertIn("SCALE requires marginal acquisition cost", errors)
        self.assertIn("SCALE lacks observed outcome evidence", errors)

    def test_finite_job_scale_does_not_invent_retention(self):
        self.assertEqual(self.errors(evidenced_scale()), [])

    def test_recurring_scale_requires_return_evidence(self):
        value = evidenced_scale()
        value["scope"]["cadence"] = "RECURRING"
        self.assertIn("SCALE lacks observed return evidence", self.errors(value))

    def test_hypotheses_and_wrong_classes_cannot_prove_payment(self):
        for evidence_class in ["HYPOTHESIS", "RESEARCH", "OBSERVATION"]:
            with self.subTest(evidence_class=evidence_class):
                value = evidenced_scale()
                value["source_bindings"][1]["evidence_class"] = evidence_class
                self.assertIn("observed payment lacks matching evidence class", self.errors(value))

    def test_source_lineage_rejects_stale_unknown_and_duplicate_bindings(self):
        for mutation in ["stale", "unknown", "duplicate"]:
            with self.subTest(mutation=mutation):
                value = evidenced_scale()
                if mutation == "stale":
                    value["source_bindings"][0]["status"] = "STALE"
                elif mutation == "unknown":
                    value["stages"][0]["evidence_ids"] = ["missing"]
                else:
                    value["source_bindings"].append(copy.deepcopy(value["source_bindings"][0]))
                self.assertTrue(self.errors(value))

    def test_planner_cannot_claim_execution(self):
        value = strategy()
        value["execution"]["spend"] = "PASS"
        self.assertTrue(self.errors(value))

    def test_runtime_cli_and_evaluation_adapter_use_the_same_contract(self):
        value = strategy()
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "strategy.json"
            path.write_text(json.dumps(value), encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(ROOT / "scripts/validate_artifact.py"), "growth", str(path), "--schema", str(SCHEMA)],
                capture_output=True, text=True, check=False,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual(json.loads(result.stdout)["status"], "PASS")
        case = {"skill": "plan-growth", "fixture": {"output_contract": {
            "artifact_kind": "GROWTH_STRATEGY", "artifact_schema": "schemas/growth-strategy.schema.json",
            "expected_artifact_status": "READY", "require_handoff": False,
        }}}
        envelope = {"artifact": value, "artifact_sha256": canonical_digest(value), "supporting_artifacts": [], "handoffs": []}
        self.assertEqual(market_artifact_errors(case, {"response": json.dumps(envelope)}), [])
        envelope["artifact"]["decision"]["action"] = "SCALE"
        envelope["artifact_sha256"] = canonical_digest(envelope["artifact"])
        self.assertIn("SCALE requires observed positive net contribution",
                      market_artifact_errors(case, {"response": json.dumps(envelope)}))


if __name__ == "__main__":
    unittest.main()
