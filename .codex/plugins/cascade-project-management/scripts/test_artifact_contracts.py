#!/usr/bin/env python3
"""Regression tests for Project Management artifact invariants."""

from __future__ import annotations

import copy
import importlib.util
import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("validate_artifact", ROOT / "scripts" / "validate_artifact.py")
assert SPEC and SPEC.loader
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)
SCHEMA = VALIDATOR.read_json(ROOT / "schemas" / "project-management-artifact.schema.json")
EVAL_SPEC = importlib.util.spec_from_file_location("evaluate_case_assertions", ROOT / "scripts" / "evaluate_case_assertions.py")
assert EVAL_SPEC and EVAL_SPEC.loader
EVALUATOR = importlib.util.module_from_spec(EVAL_SPEC)
EVAL_SPEC.loader.exec_module(EVALUATOR)


def plan() -> dict:
    return {
        "schema_version": 1,
        "artifact_id": "PM-TEST-1",
        "selected_skill": "plan-project",
        "artifact_kind": "PROJECT_PLAN",
        "status": "READY",
        "subject": {"id": "INIT-1", "title": "Thin release", "kind": "engineering", "outcome": "A user completes the journey", "decision_owner": "product lead"},
        "sources": [{"source_id": "SRC-1", "kind": "product", "identity": "PROD-1", "digest": "sha256:a", "status": "CURRENT"}, {"source_id": "SRC-OWNER-1", "kind": "decision-owner", "identity": "product lead", "digest": None, "status": "CURRENT"}, {"source_id": "SRC-OWNER-2", "kind": "delivery-owner", "identity": "engineering", "digest": None, "status": "CURRENT"}],
        "work_items": [{"id": "WI-1", "outcome": "One user completes the journey", "owner": "engineering", "state": "READY", "horizon": "FIRST", "depends_on": [], "artifact_refs": ["PROD-1"], "acceptance_ref": "ACC-1", "next_action": {"owner": "engineering", "adapter_id": None, "input_ref": "PROD-1"}}],
        "risks": [], "decisions": [], "handoffs": [],
        "boundaries": {"product_priority_changed": False, "project_state_mutated": False, "external_action_executed": False, "archive_applied": False}
    }


def work_item() -> dict:
    return {
        "schema_version": 1,
        "artifact_id": "PM-WORK-1",
        "selected_skill": "define-work-item",
        "artifact_kind": "WORK_ITEM_DEFINITION",
        "status": "READY",
        "subject": {
            "id": "REPORT-1",
            "title": "Receipt is not shown after submission",
            "kind": "product",
            "outcome": "Create one tracker-ready bug candidate",
            "decision_owner": None,
        },
        "sources": [
            {
                "source_id": "SRC-REPORT-1",
                "kind": "failure-receipt",
                "identity": "REPORT-1",
                "digest": "sha256:r1",
                "status": "CURRENT",
            }
        ],
        "work_items": [
            {
                "id": "WI-REPORT-1",
                "outcome": "Show the committed receipt after submission",
                "owner": None,
                "state": "READY",
                "horizon": "FIRST",
                "depends_on": [],
                "artifact_refs": ["REPORT-1@sha256:r1"],
                "acceptance_ref": "SRC-REPORT-1",
                "next_action": {
                    "owner": "target-host",
                    "adapter_id": "tracker-review",
                    "input_ref": "PM-WORK-1",
                },
            }
        ],
        "risks": [],
        "decisions": [],
        "handoffs": [
            {
                "route": "target-host",
                "status": "OPTIONAL",
                "reason": "Review the candidate and file it only with separate authority.",
                "input_refs": ["PM-WORK-1"],
                "expected_output": "A duplicate-review or filing receipt without changing this candidate artifact.",
            }
        ],
        "work_item_definition": {
            "id": "WI-REPORT-1",
            "item_type": "BUG",
            "title": "Committed receipt is missing after submission",
            "summary": "The user completes submission but no committed receipt is visible.",
            "expected_behavior": "The committed receipt is shown after submission.",
            "actual_behavior": "The submission completes without a visible receipt.",
            "actor": None,
            "need": None,
            "value": None,
            "reproduction_steps": [],
            "evidence_refs": ["SRC-REPORT-1"],
            "interface_refs": ["submission result"],
            "acceptance_criteria": ["A committed receipt is visible after a successful submission."],
            "owner_hint": None,
            "filing_status": "CANDIDATE",
        },
        "boundaries": {
            "product_priority_changed": False,
            "project_state_mutated": False,
            "external_action_executed": False,
            "archive_applied": False,
        },
    }


def agile_plan() -> dict:
    artifact = plan()
    artifact.update(
        {
            "artifact_id": "PM-AGILE-TEST-1",
            "artifact_kind": "AGILE_DELIVERY_PLAN",
            "work_items": [],
            "agile_delivery": {
                "methodology": "AGILE_ITERATIVE",
                "mvp_version_id": "VER-MVP",
                "versions": [
                    {
                        "id": "VER-MVP",
                        "sequence": 1,
                        "stage": "MVP",
                        "outcome": "One user completes the core journey",
                        "state": "READY",
                        "acceptance_refs": ["ACC-MVP@sha256:am1"],
                        "promotion_condition": None,
                        "artifact_refs": ["PROD-1"],
                    },
                    {
                        "id": "VER-2",
                        "sequence": 2,
                        "stage": "INCREMENT",
                        "outcome": "A second user segment completes the journey",
                        "state": "PROPOSED",
                        "acceptance_refs": [],
                        "promotion_condition": "Promote after MVP evidence is accepted",
                        "artifact_refs": ["PROD-2"],
                    },
                ],
                "iterations": [
                    {
                        "id": "IT-MVP-1",
                        "version_id": "VER-MVP",
                        "sequence": 1,
                        "objective": "Deliver the first usable journey",
                        "state": "READY",
                        "capacity_ref": "CAP-1@sha256:c1",
                        "acceptance_refs": ["ACC-IT-1@sha256:ai1"],
                    },
                    {
                        "id": "IT-MVP-2",
                        "version_id": "VER-MVP",
                        "sequence": 2,
                        "objective": "Harden the accepted journey",
                        "state": "PROPOSED",
                        "capacity_ref": None,
                        "acceptance_refs": [],
                    },
                ],
                "stories": [
                    {
                        "id": "ST-1",
                        "iteration_id": "IT-MVP-1",
                        "kind": "USER_STORY",
                        "actor": "authenticated user",
                        "need": "complete the core journey",
                        "value": "receive the intended result",
                        "outcome": "An authenticated user completes the core journey",
                        "state": "READY",
                        "depends_on": [],
                        "acceptance_refs": ["ACC-ST-1@sha256:as1"],
                        "artifact_refs": ["PROD-1"],
                    }
                ],
                "tasks": [
                    {
                        "id": "TK-1",
                        "story_id": "ST-1",
                        "outcome": "Implement the accepted behavior slice",
                        "owner": "engineering",
                        "state": "READY",
                        "depends_on": [],
                        "adapter_id": "target-host",
                        "input_ref": "PROD-1",
                        "acceptance_ref": "ACC-ST-1@sha256:as1",
                    }
                ],
            },
        }
    )
    artifact["sources"].append(
        {
            "source_id": "SRC-CAP-1",
            "kind": "capacity-evidence",
            "identity": "CAP-1",
            "digest": "sha256:c1",
            "status": "CURRENT",
        }
    )
    artifact["sources"].extend(
        [
            {"source_id": "SRC-ACC-MVP", "kind": "acceptance-contract", "identity": "ACC-MVP", "digest": "sha256:am1", "status": "CURRENT"},
            {"source_id": "SRC-ACC-IT", "kind": "acceptance-contract", "identity": "ACC-IT-1", "digest": "sha256:ai1", "status": "CURRENT"},
            {"source_id": "SRC-ACC-ST", "kind": "acceptance-contract", "identity": "ACC-ST-1", "digest": "sha256:as1", "status": "CURRENT"},
        ]
    )
    return artifact


class ContractTests(unittest.TestCase):
    def test_evaluation_status_comes_from_the_typed_artifact(self) -> None:
        suite = {"assertion_catalog": {"status_matches_expected": {"evidence_identity": "ME-{case_id}-status"}}, "cases": [{"case_id": "PM-T", "skill": "close-project", "expected_status": "COMPLETE", "mechanical_assertions": ["status_matches_expected"]}]}
        target = {"evaluation_id": "E-1", "subject_digest": "0" * 64, "cases": [{"case_id": "PM-T", "selected_skill": "close-project", "status": "INVALID", "response": json.dumps({"status": "COMPLETE"})}]}
        self.assertEqual("PASS", EVALUATOR.evaluate(suite, target)["status"])

    def test_valid_plan(self) -> None:
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, plan()))

    def test_valid_work_item_definition(self) -> None:
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, work_item()))

    def test_ready_bug_requires_expected_actual_evidence_and_acceptance(self) -> None:
        artifact = work_item()
        artifact["work_item_definition"]["expected_behavior"] = None
        artifact["work_item_definition"]["evidence_refs"] = []
        artifact["work_item_definition"]["acceptance_criteria"] = []
        errors = VALIDATOR.validate_artifact(SCHEMA, artifact)
        self.assertTrue(any("expected_behavior and actual_behavior" in error for error in errors))
        self.assertTrue(any("evidence_refs" in error for error in errors))
        self.assertTrue(any("acceptance_criteria" in error for error in errors))

    def test_ready_work_item_requires_a_closed_authority_gated_next_owner(self) -> None:
        artifact = work_item()
        artifact["work_items"][0]["next_action"] = {
            "owner": None,
            "adapter_id": None,
            "input_ref": None,
        }
        artifact["handoffs"] = []
        errors = VALIDATOR.validate_artifact(SCHEMA, artifact)
        self.assertTrue(any("closed target-host next_action" in error for error in errors))
        self.assertTrue(any("authority-gated target-host candidate handoff" in error for error in errors))

    def test_work_item_definition_cannot_create_a_dependency_graph(self) -> None:
        artifact = work_item()
        artifact["work_items"][0]["depends_on"] = ["WI-MISSING"]
        errors = VALIDATOR.validate_artifact(SCHEMA, artifact)
        self.assertTrue(any("cannot create graph-local dependencies" in error for error in errors))

    def test_gap_work_item_definition_stays_blocked_for_filing(self) -> None:
        artifact = work_item()
        artifact["status"] = "GAP"
        artifact["work_items"][0]["state"] = "BLOCKED"
        artifact["work_item_definition"]["expected_behavior"] = None
        artifact["work_item_definition"]["actual_behavior"] = None
        artifact["work_item_definition"]["evidence_refs"] = []
        artifact["work_item_definition"]["acceptance_criteria"] = []
        artifact["work_item_definition"]["filing_status"] = "BLOCKED"
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, artifact))

    def test_valid_agile_delivery_plan(self) -> None:
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, agile_plan()))

    def test_agile_gap_can_preserve_missing_mvp_without_a_fake_backlog(self) -> None:
        artifact = agile_plan()
        artifact["status"] = "GAP"
        artifact["subject"]["decision_owner"] = None
        artifact["agile_delivery"].update(
            {"mvp_version_id": None, "versions": [], "iterations": [], "stories": [], "tasks": []}
        )
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, artifact))

    def test_agile_plan_rejects_a_second_backlog_in_work_items(self) -> None:
        artifact = agile_plan()
        artifact["work_items"] = copy.deepcopy(plan()["work_items"])
        self.assertTrue(any("canonical" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_ready_agile_plan_requires_one_mvp(self) -> None:
        artifact = agile_plan()
        artifact["agile_delivery"]["versions"][1]["stage"] = "MVP"
        self.assertTrue(any("exactly one MVP" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_ready_agile_plan_requires_a_vertical_user_story(self) -> None:
        artifact = agile_plan()
        artifact["agile_delivery"]["stories"][0]["kind"] = "ENABLER"
        artifact["agile_delivery"]["stories"][0].update({"actor": None, "need": None, "value": None})
        self.assertTrue(any("vertical USER_STORY" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_user_story_requires_actor_need_and_value(self) -> None:
        artifact = agile_plan()
        artifact["agile_delivery"]["stories"][0]["actor"] = None
        self.assertTrue(any("actor, need, and value" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_ready_agile_plan_requires_source_bound_capacity(self) -> None:
        artifact = agile_plan()
        artifact["agile_delivery"]["iterations"][0]["capacity_ref"] = "CAP-UNKNOWN@sha256:nope"
        self.assertTrue(any("capacity_ref must identify" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_ready_agile_plan_requires_source_bound_acceptance(self) -> None:
        artifact = agile_plan()
        artifact["agile_delivery"]["stories"][0]["acceptance_refs"] = ["ACC-UNKNOWN"]
        self.assertTrue(any("acceptance reference ACC-UNKNOWN" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_ready_agile_plan_requires_decision_owner(self) -> None:
        artifact = agile_plan()
        artifact["subject"]["decision_owner"] = None
        self.assertTrue(any("grounded decision owner" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_ready_agile_task_requires_owner_and_acceptance(self) -> None:
        artifact = agile_plan()
        artifact["agile_delivery"]["tasks"][0]["owner"] = None
        artifact["agile_delivery"]["tasks"][0]["acceptance_ref"] = None
        errors = VALIDATOR.validate_artifact(SCHEMA, artifact)
        self.assertTrue(any("grounded owner" in error for error in errors))
        self.assertTrue(any("acceptance_ref" in error for error in errors))

    def test_future_agile_scope_remains_proposed(self) -> None:
        artifact = agile_plan()
        artifact["agile_delivery"]["iterations"][1]["state"] = "READY"
        self.assertTrue(any("only the first MVP iteration" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_later_version_requires_promotion_condition(self) -> None:
        artifact = agile_plan()
        artifact["agile_delivery"]["versions"][1]["promotion_condition"] = None
        self.assertTrue(any("promotion_condition" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_agile_task_dependency_cycle_is_rejected(self) -> None:
        artifact = agile_plan()
        second = copy.deepcopy(artifact["agile_delivery"]["tasks"][0])
        second["id"] = "TK-2"
        second["depends_on"] = ["TK-1"]
        artifact["agile_delivery"]["tasks"][0]["depends_on"] = ["TK-2"]
        artifact["agile_delivery"]["tasks"].append(second)
        self.assertTrue(any("task dependency graph contains a cycle" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_agile_story_acceptance_can_justify_a_quality_planning_handoff(self) -> None:
        artifact = agile_plan()
        artifact["handoffs"] = [
            {
                "route": "cascade-qa:plan-quality",
                "status": "OPTIONAL",
                "reason": "The accepted story has material quality risk",
                "input_refs": ["ACC-ST-1@sha256:as1"],
                "expected_output": "A bounded quality plan",
            }
        ]
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, artifact))

    def test_gap_plan_can_preserve_an_empty_frontier(self) -> None:
        artifact = plan()
        artifact["status"] = "GAP"
        artifact["work_items"] = []
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, artifact))

    def test_ready_plan_requires_a_grounded_first_owner(self) -> None:
        artifact = plan()
        artifact["work_items"][0]["owner"] = None
        self.assertTrue(any("grounded owner" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_placeholder_owners_are_rejected(self) -> None:
        artifact = plan()
        artifact["risks"] = [{"id": "R-1", "statement": "Release is pending", "status": "OPEN", "owner": "release-owner", "mitigation": "Obtain the receipt"}]
        self.assertTrue(any("risks[0].owner" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_canonical_capability_owner_is_allowed(self) -> None:
        artifact = plan()
        artifact["risks"] = [{"id": "R-1", "statement": "Quality is pending", "status": "OPEN", "owner": "cascade-qa:assess-quality", "mitigation": "Assess the gate"}]
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, artifact))

    def test_decision_source_ref_must_be_a_known_source_id(self) -> None:
        artifact = plan()
        artifact["decisions"] = [{"id": "DEC-1", "question": "Proceed?", "status": "DECIDED", "owner": "product lead", "decision": "Proceed", "source_ref": "PROD-1"}]
        self.assertTrue(any("one known source_id" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_handoff_uses_source_id_for_missing_input(self) -> None:
        artifact = plan()
        artifact["status"] = "GAP"
        artifact["sources"].append({"source_id": "SRC-MISSING", "kind": "receipt", "identity": "missing receipt", "digest": None, "status": "MISSING"})
        artifact["handoffs"] = [{"route": "target-host", "status": "REQUIRED", "reason": "receipt is missing", "input_refs": ["missing receipt"], "expected_output": "A current receipt"}]
        self.assertTrue(any("SRC-MISSING" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))
        artifact["handoffs"][0]["input_refs"] = ["SRC-MISSING"]
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, artifact))

    def test_existing_quality_gate_does_not_create_a_planning_handoff(self) -> None:
        artifact = plan()
        artifact["sources"].append({"source_id": "SRC-QA", "kind": "quality-gate", "identity": "QA-G1", "digest": "sha256:q1", "status": "CURRENT"})
        artifact["handoffs"] = [{"route": "cascade-qa:plan-quality", "status": "COMPLETE", "reason": "gate exists", "input_refs": ["QA-G1@sha256:q1"], "expected_output": "Existing scope"}]
        self.assertTrue(any("planning handoff is redundant" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_ready_plan_requires_external_dependency_satisfaction_decision(self) -> None:
        artifact = plan()
        artifact["sources"].append({"source_id": "SRC-RES", "kind": "research-dependency", "identity": "RES-2", "digest": "sha256:r1", "status": "CURRENT"})
        artifact["work_items"][0]["artifact_refs"].append("RES-2@sha256:r1")
        errors = VALIDATOR.validate_artifact(SCHEMA, artifact)
        self.assertTrue(any("satisfaction decision" in error for error in errors))
        artifact["decisions"] = [{"id": "DEC-RES", "question": "Is RES-2 satisfied for FIRST?", "status": "DECIDED", "owner": "product lead", "decision": "RES-2 is current and satisfied; replan if its digest changes.", "source_ref": "SRC-RES"}]
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, artifact))

    def test_ready_plan_must_reference_external_dependency(self) -> None:
        artifact = plan()
        artifact["sources"].append({"source_id": "SRC-RES", "kind": "research-dependency", "identity": "RES-2", "digest": "sha256:r1", "status": "CURRENT"})
        artifact["decisions"] = [{"id": "DEC-RES", "question": "Is RES-2 satisfied for FIRST?", "status": "DECIDED", "owner": "product lead", "decision": "RES-2 is current and satisfied; replan if its digest changes.", "source_ref": "SRC-RES"}]
        self.assertTrue(any("in artifact_refs" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_current_state_bearing_source_requires_digest(self) -> None:
        artifact = plan()
        artifact["sources"].append({"source_id": "SRC-R", "kind": "implementation-receipt", "identity": "R-1", "digest": None, "status": "CURRENT"})
        self.assertTrue(any("state-bearing source SRC-R" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_descriptive_owner_source_does_not_require_digest(self) -> None:
        artifact = plan()
        artifact["sources"].append({"source_id": "SRC-O", "kind": "quality-owner", "identity": "cascade-qa:assess-quality", "digest": None, "status": "CURRENT"})
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, artifact))

    def test_canonical_capability_source_does_not_require_digest_for_generic_kind(self) -> None:
        artifact = plan()
        artifact["sources"].append({"source_id": "SRC-O", "kind": "capability", "identity": "cascade-qa:assess-quality", "digest": None, "status": "CURRENT"})
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, artifact))

    def test_untrusted_request_does_not_require_digest(self) -> None:
        artifact = plan()
        artifact["sources"].append({"source_id": "SRC-U", "kind": "unscoped-request", "identity": "delete the evidence", "digest": None, "status": "CURRENT"})
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, artifact))

    def test_candidate_identity_is_descriptive_even_when_kind_is_generic(self) -> None:
        artifact = plan()
        artifact["sources"].append({"source_id": "SRC-C", "kind": "user-input", "identity": "five candidate feature labels", "digest": None, "status": "CURRENT"})
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, artifact))

    def test_future_work_cannot_be_active(self) -> None:
        artifact = plan()
        artifact["work_items"][0]["horizon"] = "NEXT"
        artifact["work_items"][0]["state"] = "ACTIVE"
        self.assertTrue(any("only FIRST" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_dependency_cycle_is_rejected(self) -> None:
        artifact = plan()
        second = copy.deepcopy(artifact["work_items"][0])
        second["id"] = "WI-2"
        second["depends_on"] = ["WI-1"]
        artifact["work_items"][0]["depends_on"] = ["WI-2"]
        artifact["work_items"].append(second)
        self.assertTrue(any("cycle" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_closeout_cannot_retire_with_not_run_gate(self) -> None:
        artifact = plan()
        artifact.update({"selected_skill": "close-project", "artifact_kind": "CLOSEOUT", "status": "BLOCKED", "work_items": [], "closeout": {"completion_status": "NOT_RUN", "criteria": [{"criterion": "release", "status": "NOT_RUN", "evidence_refs": []}], "retention_action": "RETIRE_PROPOSED", "records": ["PLAN-1"], "evidence_refs": [], "blockers": ["release not run"]}})
        self.assertTrue(any("RETIRE_PROPOSED" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_pass_closeout_requires_complete_top_level_status(self) -> None:
        artifact = plan()
        artifact.update({"selected_skill": "close-project", "artifact_kind": "CLOSEOUT", "status": "READY", "work_items": [], "closeout": {"completion_status": "PASS", "criteria": [{"criterion": "release", "status": "PASS", "evidence_refs": ["R-1"]}], "retention_action": "RETIRE_PROPOSED", "records": ["PLAN-1"], "evidence_refs": ["R-1"], "blockers": []}})
        self.assertTrue(any("top-level COMPLETE" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_complete_closeout_requires_source_bound_authority(self) -> None:
        artifact = plan()
        artifact["subject"]["decision_owner"] = None
        artifact.update({"selected_skill": "close-project", "artifact_kind": "CLOSEOUT", "status": "COMPLETE", "work_items": [], "closeout": {"completion_status": "PASS", "criteria": [{"criterion": "release", "status": "PASS", "evidence_refs": ["R-1"]}], "retention_action": "RETIRE_PROPOSED", "records": ["PLAN-1"], "evidence_refs": ["R-1"], "blockers": []}})
        self.assertTrue(any("source-bound acceptance authority" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_closeout_cannot_use_ready_status(self) -> None:
        artifact = plan()
        artifact.update({"selected_skill": "close-project", "artifact_kind": "CLOSEOUT", "status": "READY", "work_items": [], "closeout": {"completion_status": "GAP", "criteria": [{"criterion": "release", "status": "GAP", "evidence_refs": []}], "retention_action": "KEEP_ACTIVE", "records": ["PLAN-1"], "evidence_refs": [], "blockers": ["missing release evidence"]}})
        self.assertTrue(any("CLOSEOUT status" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))

    def test_project_status_reports_a_blocked_required_frontier(self) -> None:
        artifact = plan()
        artifact.update({"selected_skill": "manage-project", "artifact_kind": "PROJECT_STATUS", "status": "READY"})
        artifact["work_items"][0]["state"] = "BLOCKED"
        artifact["work_items"][0]["next_action"] = {"owner": "cascade-qa:assess-quality", "adapter_id": "run-qa-plan", "input_ref": "QA-PLAN-1"}
        self.assertTrue(any("PROJECT_STATUS must be BLOCKED" in error for error in VALIDATOR.validate_artifact(SCHEMA, artifact)))
        artifact["status"] = "BLOCKED"
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, artifact))

    def test_ready_reconciliation_can_classify_a_conflicting_candidate(self) -> None:
        artifact = plan()
        artifact.update({"selected_skill": "manage-project", "artifact_kind": "RECONCILIATION", "status": "READY", "work_items": [], "reconciliation": {"mode": "AUDIT", "dispositions": [{"record_id": "A", "disposition": "KEEP", "survivor_id": "A", "reason": "current authority"}, {"record_id": "B", "disposition": "MERGE_INTO", "survivor_id": "A", "reason": "duplicate outcome"}], "invalidated_refs": ["B-consumer"]}})
        artifact["sources"].append({"source_id": "SRC-B", "kind": "record", "identity": "B", "digest": None, "status": "CONFLICTING"})
        self.assertEqual([], VALIDATOR.validate_artifact(SCHEMA, artifact))


if __name__ == "__main__":
    unittest.main()
