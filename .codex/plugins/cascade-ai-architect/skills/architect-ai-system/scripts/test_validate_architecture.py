#!/usr/bin/env python3
"""Focused tests for architecture packet validation."""

from __future__ import annotations

import copy
import json
import unittest
from pathlib import Path

from validate_architecture import validate_packet


SKILL_DIR = Path(__file__).resolve().parents[1]
TEMPLATE = json.loads((SKILL_DIR / "assets" / "architecture.packet.yaml").read_text(encoding="utf-8"))


class ArchitectureValidationTests(unittest.TestCase):
    def packet(self):
        return copy.deepcopy(TEMPLATE)

    def assert_has(self, packet, fragment):
        errors = validate_packet(packet)
        self.assertTrue(any(fragment in error for error in errors), errors)

    def test_packaged_template_is_valid(self):
        self.assertEqual(validate_packet(self.packet()), [])

    def test_rejects_opaque_claim_identifier(self):
        packet = self.packet()
        packet["capabilities"][0]["slug"] = "C-017"
        self.assert_has(packet, "opaque ordinal identifier")

    def test_rejects_unknown_source_locator(self):
        packet = self.packet()
        packet["capabilities"][0]["inputs"][0]["source_locator"] = "missing:source"
        self.assert_has(packet, "unknown source locator")

    def test_rejects_not_a_digest_source_identity(self):
        packet = self.packet()
        packet["source_snapshot"]["sources"][0]["digest"] = "not-a-digest"
        self.assert_has(packet, "does not match ^sha256:[0-9a-f]{64}$")

    def test_rejects_unresolved_owner(self):
        packet = self.packet()
        packet["capabilities"][0]["primary_owner"] = "missing-owner"
        self.assert_has(packet, "unresolved primary owner")

    def test_rejects_unresolved_capability_without_gap(self):
        packet = self.packet()
        packet["capabilities"][0]["evidence_status"] = "unresolved"
        self.assert_has(packet, "requires an active gap")
        self.assert_has(packet, "requires packet status GAP or BLOCKED")

    def test_rejects_state_change_without_confirmation_rule(self):
        packet = self.packet()
        tool = packet["components"]["tools"][0]
        tool["effect"] = "state_changing"
        tool["confirmation_rule"] = "none"
        self.assert_has(packet, "state-changing tools require an explicit rule")

    def test_rejects_duplicate_mutation_authority(self):
        packet = self.packet()
        role = packet["components"]["roles"][0]
        role["mutation_scope"] = ["ticket.status"]
        second = copy.deepcopy(role)
        second["slug"] = "support-ticket-mutator"
        packet["components"]["roles"].append(second)
        self.assert_has(packet, "already owned by role")

    def test_rejects_nonpositive_budget(self):
        packet = self.packet()
        packet["behavior_blocks"]["loop"]["budgets"]["tool_calls"] = 0
        self.assert_has(packet, "must be a finite positive number")

    def test_rejects_nonfinite_budget(self):
        packet = self.packet()
        packet["behavior_blocks"]["loop"]["budgets"]["cost_usd"] = float("inf")
        self.assert_has(packet, "must be a finite positive number")

    def test_rejects_unknown_final_output_owner(self):
        packet = self.packet()
        packet["behavior_blocks"]["output_contract"]["primary_owner"] = "missing-owner"
        self.assert_has(packet, "unresolved owner")

    def test_rejects_placeholder_behavior_blocks(self):
        for block in TEMPLATE["behavior_blocks"]:
            with self.subTest(block=block):
                packet = self.packet()
                packet["behavior_blocks"][block] = {"placeholder": "present"}
                errors = validate_packet(packet)
                self.assertTrue(
                    any(f"behavior_blocks.{block}" in error for error in errors),
                    errors,
                )

    def test_rejects_unknown_behavior_block_references(self):
        mutations = (
            ("state", "owner", "missing-workflow", "behavior_blocks.state.owner"),
            ("tools", "references", ["missing-tool"], "behavior_blocks.tools.references"),
            ("skills", "references", ["missing-skill"], "behavior_blocks.skills.references"),
            ("skills", "prompt_references", ["missing-prompt"], "behavior_blocks.skills.prompt_references"),
            ("roles", "merge_authority", "missing-owner", "behavior_blocks.roles.merge_authority"),
            ("failure", "recovery_owner", "missing-owner", "behavior_blocks.failure.recovery_owner"),
            ("evaluation", "references", ["missing-evaluation"], "behavior_blocks.evaluation.references"),
        )
        for block, field, value, fragment in mutations:
            with self.subTest(block=block, field=field):
                packet = self.packet()
                packet["behavior_blocks"][block][field] = value
                self.assert_has(packet, fragment)

    def test_rejects_orphan_empty_agent(self):
        packet = self.packet()
        orphan = copy.deepcopy(packet["components"]["agents"][0])
        orphan["slug"] = "orphan-empty-agent"
        for field in (
            "capabilities",
            "inputs",
            "outputs",
            "tools",
            "skills",
            "workflows",
            "prompts",
            "evaluations",
        ):
            orphan[field] = []
        packet["components"]["agents"].append(orphan)
        errors = validate_packet(packet)
        self.assertTrue(
            any("agent 'orphan-empty-agent': must be referenced by at least one role" in error for error in errors),
            errors,
        )
        for field in (
            "capabilities",
            "inputs",
            "outputs",
            "tools",
            "skills",
            "workflows",
            "prompts",
            "evaluations",
        ):
            self.assertTrue(
                any(f"agents[1].{field}: requires at least 1 items" in error for error in errors),
                errors,
            )

    def test_rejects_agent_declaring_another_owners_capability(self):
        packet = self.packet()
        second = copy.deepcopy(packet["components"]["agents"][0])
        second["slug"] = "secondary-triage-agent"
        packet["components"]["agents"].append(second)
        role = copy.deepcopy(packet["components"]["roles"][0])
        role["slug"] = "secondary-triage-owner"
        role["agent"] = "secondary-triage-agent"
        packet["components"]["roles"].append(role)
        packet["topology"]["kind"] = "manager_with_specialists"
        self.assert_has(packet, "is primarily owned by 'support-triage-agent'")

    def test_rejects_topology_agent_count_mismatch(self):
        packet = self.packet()
        packet["topology"]["kind"] = "manager_with_specialists"
        self.assert_has(packet, "requires at least two role-backed agents; found 1")

    def test_accepts_deterministic_workflow_with_zero_agents(self):
        packet = self.packet()
        workflow = "support-triage-workflow"
        packet["topology"]["kind"] = "deterministic_workflow"
        packet["components"]["agents"] = []
        packet["components"]["roles"] = []
        packet["capabilities"][0]["primary_owner"] = workflow
        packet["clusters"][0]["recovery_owner"] = workflow
        packet["components"]["prompts"][0]["owner"] = workflow
        packet["components"]["evaluations"][0]["owner"] = workflow
        packet["behavior_blocks"]["output_contract"]["primary_owner"] = workflow
        packet["behavior_blocks"]["roles"]["primary_owner"] = workflow
        packet["behavior_blocks"]["roles"]["merge_authority"] = workflow
        packet["behavior_blocks"]["failure"]["recovery_owner"] = workflow
        self.assertEqual(validate_packet(packet), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
