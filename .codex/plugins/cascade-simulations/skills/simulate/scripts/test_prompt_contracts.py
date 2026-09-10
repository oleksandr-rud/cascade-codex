#!/usr/bin/env python3

from __future__ import annotations

import unittest
from pathlib import Path

from compile_prompt import compile_prompt


SKILL = Path(__file__).resolve().parent.parent
PLUGIN = SKILL.parent.parent


class PromptContractTest(unittest.TestCase):
    def test_runtime_prompt_compiles_without_placeholders(self) -> None:
        prompt = compile_prompt(SKILL / "assets" / "simulation.yaml", SKILL / "assets" / "adapter.yaml")
        self.assertNotIn("{{", prompt)
        for required in [
            "UNKNOWN_OUTCOME",
            "prohibited",
            "untrusted",
            "A plan or prepared input is not execution authority",
            "controller's dispatch receipt",
            "Codex host tool",
            "Observations are declared outputs",
            "target-affecting cleanup",
            "Return the controller-verified Final Result only",
        ]:
            self.assertIn(required, prompt)

    def test_component_prompts_have_readiness_and_output_contracts(self) -> None:
        prompts = list((PLUGIN / "skills").glob("simulation-*/references/*-prompt.md"))
        self.assertEqual(len(prompts), 6)
        for path in prompts:
            text = path.read_text(encoding="utf-8")
            self.assertIn("output", text.lower(), path.name)
            self.assertNotIn("TODO", text, path.name)
            self.assertIn("{{", text, path.name)
        authoring = [path for path in prompts if "review" not in path.name]
        for path in authoring:
            text = path.read_text(encoding="utf-8")
            self.assertIn("Interview Status: NEEDS_INPUT", text, path.name)
            self.assertIn("BLOCKED", text, path.name)
            self.assertIn("READY", text, path.name)
            self.assertIn("Do not emit", text, path.name)

    def test_prompts_preserve_authority_and_evidence_boundaries(self) -> None:
        combined = "\n".join(
            path.read_text(encoding="utf-8")
            for path in (PLUGIN / "skills").glob("simulation-*/references/*-prompt.md")
        ).lower()
        for required in [
            "untrusted",
            "permission",
            "evidence",
            "do not claim",
            "no commentary",
        ]:
            self.assertIn(required, combined)

    def test_all_skills_are_compact_and_placeholder_free(self) -> None:
        skills = list((PLUGIN / "skills").glob("*/SKILL.md"))
        self.assertEqual(
            {path.parent.name for path in skills},
            {
                "simulate",
                "manage-simulation-campaign",
                "execute-simulation-campaign",
                "simulation-persona",
                "simulation-actor",
                "simulation-adapter",
                "simulation-brief",
                "simulation-outcome",
                "simulation-review",
            },
        )
        for path in skills:
            text = path.read_text(encoding="utf-8")
            self.assertLess(len(text.splitlines()), 220, path.parent.name)
            self.assertNotIn("TODO", text, path.parent.name)

    def test_simulate_has_a_bounded_preparation_only_fast_path(self) -> None:
        text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
        for required in [
            "## Preparation-only fast path",
            "Do not inventory adapters",
            "one grouped action",
            "preliminary metadata, line-count, or inventory command",
            "execution-only resources",
            "one stable ID",
            "compact pointers to the authoritative IDs",
            "within 1,400 words",
            "execution and cleanup are `NOT_RUN`",
        ]:
            self.assertIn(required, text)


if __name__ == "__main__":
    unittest.main()
