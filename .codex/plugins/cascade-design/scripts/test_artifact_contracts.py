#!/usr/bin/env python3

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("validate_artifact", ROOT / "scripts" / "validate_artifact.py")
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
SCHEMA = json.loads((ROOT / "schemas" / "design-review.schema.json").read_text(encoding="utf-8"))


def base(skill: str, status: str = "READY") -> dict:
    return {
        "schema_version": 1,
        "artifact_id": "DES-TEST-001",
        "selected_skill": skill,
        "status": status,
        "subject": "Example interface",
        "sources": [{
            "source_id": "SRC-REQUEST",
            "kind": "user-request",
            "locator": "test request",
            "authority": "GOVERNING",
            "freshness": "CURRENT",
            "status": "AVAILABLE",
        }],
        "scope": {
            "surface": "Example surface",
            "actor": "Operator",
            "job": "Complete a task",
            "states": ["default"],
            "viewports": ["1280x800"],
            "non_goals": ["runtime implementation"],
        },
        "coverage": {},
        "findings": [{
            "finding_id": "F-TEST-001",
            "severity": "P2",
            "classification": "confirmed" if status == "READY" else "gap",
            "summary": "A bounded finding.",
            "evidence_refs": ["SRC-REQUEST"],
            "recommendation": "Resolve the bounded issue.",
            "owner_route": "stop",
        }],
        "evidence_plan": [{
            "evidence_id": "EV-TEST-001",
            "check": "Inspect the observable result.",
            "mode": "manual",
            "status": "PLANNED",
            "expected_evidence": "A current observation bound to the surface.",
        }],
        "handoffs": [],
        "boundaries": {
            "runtime_code_changed": False,
            "legal_compliance_claimed": False,
            "product_intent_invented": False,
            "sensitive_data_persisted": False,
        },
    }


def ux_artifact() -> dict:
    artifact = base("ux-flow-review")
    artifact["coverage"] = {
        "kind": "ux-flow",
        "entry_point": "Dashboard",
        "completion_signal": "Success receipt",
        "interruption_paths": ["Save and resume"],
        "carried_state": ["selected record"],
        "state_coverage": [{"state": "default", "status": "PASS", "evidence_refs": ["SRC-REQUEST"]}],
        "responsive_behavior": "Primary action remains visible on narrow screens.",
    }
    return artifact


def accessibility_artifact() -> dict:
    artifact = base("accessibility-review")
    areas = [
        "semantics", "names-descriptions", "keyboard", "focus", "contrast",
        "target-size", "forms-errors", "status-messages", "reduced-motion", "mobile",
    ]
    artifact["coverage"] = {
        "kind": "accessibility",
        "standards": ["WCAG 2.2", "WAI-ARIA APG"],
        "checks": [
            {"area": area, "status": "PLANNED", "evidence_refs": ["SRC-REQUEST"], "notes": f"Plan {area} evidence."}
            for area in areas
        ],
        "non_attestation_note": "This review is not a legal or standards compliance certification.",
    }
    return artifact


def visual_artifact() -> dict:
    artifact = base("visual-qa")
    artifact["coverage"] = {
        "kind": "visual",
        "expected_source_id": "SRC-REQUEST",
        "matrix": [{
            "viewport": "1280x800",
            "state": "default",
            "status": "PASS",
            "evidence_refs": ["SRC-REQUEST"],
            "notes": "No clipping observed.",
        }],
        "checks": ["overlap-clipping", "functional-distinction"],
        "residual_risk": "Mobile evidence remains planned.",
    }
    return artifact


def design_system_artifact() -> dict:
    artifact = base("design-system")
    artifact["coverage"] = {
        "kind": "design-system",
        "rule_type": "component",
        "reuse_evidence": ["The pattern is used by two named workflows."],
        "source_of_truth_ids": ["SRC-REQUEST"],
        "observable_rule": "The action preserves a stable label and state treatment.",
        "user_visible_effect": "Users can recognize action state consistently.",
        "states": ["default", "loading", "disabled", "error"],
        "responsive_constraints": "The control remains visible and does not overflow.",
        "accessibility_constraints": "Use native semantics, visible focus, and a perceivable status.",
        "evidence_requirements": ["Visual and keyboard checks across consuming surfaces."],
        "migration_and_invalidation": "Revalidate every consumer when anatomy or token dependencies change.",
    }
    return artifact


class ArtifactContractTests(unittest.TestCase):
    def test_each_skill_has_a_valid_artifact(self) -> None:
        for artifact in (ux_artifact(), accessibility_artifact(), visual_artifact(), design_system_artifact()):
            with self.subTest(skill=artifact["selected_skill"]):
                self.assertEqual(MODULE.validate_artifact(SCHEMA, artifact), [])

    def test_skill_and_coverage_kind_must_match(self) -> None:
        artifact = ux_artifact()
        artifact["selected_skill"] = "visual-qa"
        self.assertIn("selected_skill does not match coverage.kind", MODULE.validate_artifact(SCHEMA, artifact))

    def test_ready_design_system_requires_reuse_evidence(self) -> None:
        artifact = design_system_artifact()
        artifact["coverage"]["reuse_evidence"] = []
        self.assertIn("READY design-system rule requires reuse evidence", MODULE.validate_artifact(SCHEMA, artifact))

    def test_accessibility_requires_all_unique_areas(self) -> None:
        artifact = accessibility_artifact()
        artifact["coverage"]["checks"][1]["area"] = "semantics"
        self.assertIn(
            "accessibility coverage must contain each required area exactly once",
            MODULE.validate_artifact(SCHEMA, artifact),
        )

    def test_accessibility_accepts_explicit_no_attestation_wording(self) -> None:
        artifact = accessibility_artifact()
        artifact["coverage"]["non_attestation_note"] = "This review provides no legal compliance attestation or certification."
        self.assertEqual(MODULE.validate_artifact(SCHEMA, artifact), [])

    def test_accessibility_rejects_positive_compliance_claim(self) -> None:
        artifact = accessibility_artifact()
        artifact["coverage"]["non_attestation_note"] = "This review certifies legal compliance for the interface."
        self.assertIn(
            "accessibility non-attestation note makes a positive compliance claim",
            MODULE.validate_artifact(SCHEMA, artifact),
        )

    def test_accessibility_check_status_matches_evidence_plan(self) -> None:
        artifact = accessibility_artifact()
        artifact["coverage"]["checks"][0]["status"] = "GAP"
        artifact["coverage"]["checks"][0]["evidence_refs"] = ["EV-TEST-001"]
        self.assertIn(
            "accessibility check semantics status must match evidence plan EV-TEST-001",
            MODULE.validate_artifact(SCHEMA, artifact),
        )

    def test_accessibility_requires_available_tool_output_disposition(self) -> None:
        artifact = accessibility_artifact()
        artifact["sources"].append({
            "source_id": "SRC-AXE",
            "kind": "tool-output",
            "locator": "supplied axe summary",
            "authority": "OBSERVATION",
            "freshness": "CURRENT",
            "status": "AVAILABLE",
        })
        self.assertIn(
            "accessibility review lacks explicit automated-source disposition for SRC-AXE",
            MODULE.validate_artifact(SCHEMA, artifact),
        )

    def test_accessibility_accepts_tool_output_evidence_plan_disposition(self) -> None:
        artifact = accessibility_artifact()
        artifact["sources"].append({
            "source_id": "SRC-AXE",
            "kind": "tool-output",
            "locator": "supplied axe summary",
            "authority": "OBSERVATION",
            "freshness": "CURRENT",
            "status": "AVAILABLE",
        })
        artifact["evidence_plan"].append({
            "evidence_id": "EV-AXE-001",
            "check": "Disposition automated source SRC-AXE.",
            "mode": "automated",
            "status": "PASS",
            "expected_evidence": "Record what SRC-AXE supports and what still requires manual interaction evidence.",
        })
        self.assertEqual(MODULE.validate_artifact(SCHEMA, artifact), [])

    def test_visual_qa_requires_explicit_governing_brand_disposition(self) -> None:
        artifact = visual_artifact()
        artifact["sources"].append({"source_id": "SRC-BRAND", "kind": "brand", "locator": "BR-1", "authority": "GOVERNING", "freshness": "CURRENT", "status": "AVAILABLE"})
        self.assertIn(
            "visual QA lacks explicit brand-content-fit disposition for SRC-BRAND",
            MODULE.validate_artifact(SCHEMA, artifact),
        )
        artifact["evidence_plan"].append({"evidence_id": "EV-BRAND-001", "check": "brand-content-fit against SRC-BRAND", "mode": "manual", "status": "PASS", "expected_evidence": "SRC-BRAND compared with the current screenshot."})
        self.assertEqual(MODULE.validate_artifact(SCHEMA, artifact), [])

    def test_gap_exposes_recovery(self) -> None:
        artifact = ux_artifact()
        artifact["status"] = "GAP"
        artifact["findings"][0]["classification"] = "gap"
        artifact["scope"]["actor"] = None
        artifact["coverage"]["entry_point"] = None
        self.assertEqual(MODULE.validate_artifact(SCHEMA, artifact), [])

    def test_product_handoff_rejects_circular_input(self) -> None:
        artifact = design_system_artifact()
        artifact["status"] = "GAP"
        artifact["coverage"]["rule_type"] = "gap"
        artifact["coverage"]["reuse_evidence"] = []
        artifact["findings"][0]["classification"] = "gap"
        artifact["handoffs"] = [{
            "route": "cascade-product:define-product",
            "reason": "Product behavior is missing.",
            "status": "REQUIRED",
            "required_input": "Accepted product definition naming actor and states",
            "expected_output": "Accepted product definition naming actor and states",
        }]
        errors = MODULE.validate_artifact(SCHEMA, artifact)
        self.assertIn("handoff input repeats its expected output: cascade-product:define-product", errors)
        self.assertIn("product-definition handoff requires the missing product output as its own input", errors)

    def test_product_handoff_accepts_current_evidence_input(self) -> None:
        artifact = design_system_artifact()
        artifact["status"] = "GAP"
        artifact["coverage"]["rule_type"] = "gap"
        artifact["coverage"]["reuse_evidence"] = []
        artifact["findings"][0]["classification"] = "gap"
        artifact["handoffs"] = [{
            "route": "cascade-product:define-product",
            "reason": "Product behavior is missing.",
            "status": "REQUIRED",
            "required_input": "Current request, primitive observation, source identities, and unresolved actor and state gaps",
            "expected_output": "Accepted product definition and scenario",
        }]
        self.assertEqual(MODULE.validate_artifact(SCHEMA, artifact), [])




def design_creation_artifact() -> dict:
    artifact = base("create-design")
    artifact["coverage"] = {
        "kind": "design-creation", "source_of_truth_ids": ["SRC-REQUEST"],
        "required_views": [{"viewport": "1280x800", "state": "default"}],
        "frames": [{"frame_id": "saved-default", "editable_locator": "fixture/mockup.svg",
                    "preview_locator": "fixture/preview.png", "revision": "fixture-v1",
                    "viewport": "1280x800", "state": "default",
                    "capture_conditions": "fixture metadata only; no live visual proof", "inspection": "PASS"}],
        "interaction_rules": "Filter updates the visible saved items.",
        "responsive_rules": "Use the accepted single-column layout at narrow widths.",
        "assets_and_tokens": "Existing host type and spacing tokens.", "unresolved_gaps": [],
    }
    artifact["handoffs"] = [{"route": "host:frontend-implementation", "reason": "Implement accepted design version.",
                              "status": "REQUIRED", "required_input": "Candidate frame, preview and current acceptance status.",
                              "expected_output": "Working UI and matched screenshot evidence."}]
    return artifact


class DesignCreationContractTests(unittest.TestCase):
    def test_candidate_index_is_structurally_valid_without_claiming_live_evidence(self):
        self.assertEqual(MODULE.validate_artifact(SCHEMA, design_creation_artifact()), [])

    def test_ready_rejects_absent_frames_uninspected_previews_and_missing_handoff(self):
        for mutation in (lambda a: a["coverage"].update(frames=[]),
                         lambda a: a["coverage"]["frames"][0].update(inspection="GAP"),
                         lambda a: a.update(handoffs=[]),
                         lambda a: a["coverage"].update(unresolved_gaps=["Missing empty state"]),
                         lambda a: a["scope"].update(viewports=["390x844"]),
                         lambda a: a["coverage"].update(source_of_truth_ids=["SRC-UNKNOWN"])):
            artifact = design_creation_artifact()
            mutation(artifact)
            self.assertTrue(MODULE.validate_artifact(SCHEMA, artifact))

    def test_duplicate_frames_and_malformed_types_rejected(self):
        artifact = design_creation_artifact()
        artifact["coverage"]["frames"] *= 2
        self.assertTrue(MODULE.validate_artifact(SCHEMA, artifact))
        artifact["coverage"]["frames"] = [None]
        self.assertTrue(MODULE.validate_artifact(SCHEMA, artifact))

    def test_ready_checks_viewport_state_pairs_not_just_separate_dimensions(self):
        import copy
        artifact = design_creation_artifact()
        artifact["scope"].update(states=["default", "empty"], viewports=["1280x800", "390x844"])
        artifact["coverage"]["required_views"] = [
            {"viewport": viewport, "state": state}
            for viewport in artifact["scope"]["viewports"] for state in artifact["scope"]["states"]
        ]
        second = copy.deepcopy(artifact["coverage"]["frames"][0])
        second.update(frame_id="mobile-empty", viewport="390x844", state="empty")
        artifact["coverage"]["frames"].append(second)
        self.assertTrue(MODULE.validate_artifact(SCHEMA, artifact))
        artifact["coverage"]["required_views"] = [
            {"viewport": frame["viewport"], "state": frame["state"]}
            for frame in artifact["coverage"]["frames"]
        ]
        self.assertEqual(MODULE.validate_artifact(SCHEMA, artifact), [])

    def test_clean_design_needs_no_invented_finding_but_gap_still_needs_explanation(self):
        artifact = design_creation_artifact()
        artifact["findings"] = []
        self.assertEqual(MODULE.validate_artifact(SCHEMA, artifact), [])
        artifact["status"] = "GAP"
        self.assertTrue(MODULE.validate_artifact(SCHEMA, artifact))

    def test_gap_can_report_missing_artifacts_without_fake_locators(self):
        artifact = design_creation_artifact()
        artifact["status"] = "GAP"
        artifact["coverage"]["frames"] = []
        artifact["findings"][0]["classification"] = "gap"
        self.assertEqual(MODULE.validate_artifact(SCHEMA, artifact), [])

if __name__ == "__main__":
    unittest.main()
