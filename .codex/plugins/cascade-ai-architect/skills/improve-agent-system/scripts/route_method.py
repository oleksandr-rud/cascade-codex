#!/usr/bin/env python3
"""Select the smallest allowlisted improvement method for a diagnostic."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def route(diagnostic: dict[str, Any]) -> dict[str, Any]:
    evidence = diagnostic.get("external_evidence", False)
    prompt_available = diagnostic.get("cascade_prompt_available", False)
    if not evidence:
        return {"status": "BLOCKED", "reason": "MISSING_EXTERNAL_EVIDENCE", "method": None}
    if not prompt_available:
        return {"status": "BLOCKED", "reason": "CASCADE_PROMPT_UNAVAILABLE", "method": None}

    if diagnostic.get("workflow_boundary_implicated", False):
        if not diagnostic.get("prompt_methods_exhausted", False):
            return {
                "status": "ROUTED",
                "reason": "TRY_PROMPT_METHOD_FIRST",
                "method": "structured-expert-repair",
            }
        if not diagnostic.get("isolated_sandbox", False):
            return {"status": "BLOCKED", "reason": "WORKFLOW_SANDBOX_REQUIRED", "method": None}
        if not diagnostic.get("mutation_allowlist", []):
            return {"status": "BLOCKED", "reason": "WORKFLOW_ALLOWLIST_REQUIRED", "method": None}
        return {
            "status": "ROUTED",
            "reason": "PROMPT_METHODS_EXHAUSTED_WITH_WORKFLOW_CONTROLS",
            "method": "allowlisted-workflow-mutation",
        }

    if diagnostic.get("trace_rich", False) and diagnostic.get("multiple_objectives", False):
        return {"status": "ROUTED", "reason": "TRACE_RICH_MULTI_OBJECTIVE", "method": "trace-pareto-search"}
    if diagnostic.get("interacting_prompt_modules", False) and diagnostic.get("enough_nonsealed_examples", False):
        return {"status": "ROUTED", "reason": "MULTI_MODULE_WITH_EXAMPLES", "method": "instruction-demo-search"}
    if diagnostic.get("localized_defect", False):
        return {"status": "ROUTED", "reason": "LOCALIZED_EVIDENCE_BACKED_DEFECT", "method": "textual-gradient-edit"}
    if diagnostic.get("outcome_grounded_reusable_lesson", False):
        return {"status": "ROUTED", "reason": "OUTCOME_GROUNDED_LESSON", "method": "reflexion-lesson"}
    return {"status": "ROUTED", "reason": "FIRST_BOUNDED_ATTEMPT", "method": "structured-expert-repair"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("diagnostic", type=Path)
    args = parser.parse_args()
    try:
        data = json.loads(args.diagnostic.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("diagnostic must be a JSON object")
        print(json.dumps(route(data), indent=2, sort_keys=True))
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(json.dumps({"status": "INVALID", "reason": str(exc), "method": None}, sort_keys=True))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
