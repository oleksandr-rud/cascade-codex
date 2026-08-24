from __future__ import annotations

import sys
import unittest
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

from route_method import route  # noqa: E402


class MethodRouterTests(unittest.TestCase):
    def test_first_attempt_uses_structured_repair(self) -> None:
        result = route({"external_evidence": True, "cascade_prompt_available": True})
        self.assertEqual(result["method"], "structured-expert-repair")

    def test_localized_defect_uses_textual_gradient(self) -> None:
        result = route({"external_evidence": True, "cascade_prompt_available": True, "localized_defect": True})
        self.assertEqual(result["method"], "textual-gradient-edit")

    def test_workflow_mutation_requires_sandbox(self) -> None:
        result = route({
            "external_evidence": True,
            "cascade_prompt_available": True,
            "workflow_boundary_implicated": True,
            "prompt_methods_exhausted": True,
            "mutation_allowlist": ["router"],
        })
        self.assertEqual((result["status"], result["reason"]), ("BLOCKED", "WORKFLOW_SANDBOX_REQUIRED"))

    def test_workflow_mutation_requires_allowlist(self) -> None:
        result = route({
            "external_evidence": True,
            "cascade_prompt_available": True,
            "workflow_boundary_implicated": True,
            "prompt_methods_exhausted": True,
            "isolated_sandbox": True,
        })
        self.assertEqual((result["status"], result["reason"]), ("BLOCKED", "WORKFLOW_ALLOWLIST_REQUIRED"))


if __name__ == "__main__":
    unittest.main()
