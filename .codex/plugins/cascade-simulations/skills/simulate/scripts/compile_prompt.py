#!/usr/bin/env python3
"""Compile a validated simulation and adapter into the runtime actor prompt."""

from __future__ import annotations

import argparse
from pathlib import Path

import yaml

from validate_simulation import ValidationFailure, validate


def prompt_body(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    marker = "```text\n"
    start = text.find(marker)
    end = text.rfind("\n```")
    if start < 0 or end <= start:
        raise ValidationFailure("runtime prompt must contain one text code fence")
    return text[start + len(marker) : end]


def as_yaml(value: object) -> str:
    return yaml.safe_dump(value, sort_keys=False, allow_unicode=True).strip()


def compile_prompt(simulation_path: Path, adapter_path: Path) -> str:
    simulation, adapter = validate(simulation_path, adapter_path)
    root = Path(__file__).resolve().parent.parent
    prompt = prompt_body(root / "references" / "runtime-prompt.md")
    replacements = {
        "{{INTERFACE_ADAPTER}}": as_yaml(adapter),
        "{{RUN_AUTHORITY}}": as_yaml(simulation["authority"]),
        "{{ACTOR_CONTRACT}}": as_yaml({"persona": simulation["persona"], "actor": simulation["actor"]}),
        "{{DOMAIN_FEATURE_BRIEF}}": as_yaml(simulation["brief"]),
        "{{OUTCOME_CONTRACT}}": as_yaml(simulation["outcome"]),
        "{{RUN_LIMITS}}": as_yaml(simulation["limits"]),
        "{{INITIAL_RUN_STATE}}": as_yaml(
            {
                "target": simulation["interface"]["target"],
                "required_capabilities": adapter["driver"]["required_capabilities"],
                "progress": [],
                "uncertainty": simulation["actor"]["unknown"],
                "actor_state": {
                    item["name"]: item["initial"]
                    for item in simulation["actor"].get("state_variables", [])
                },
                "steps_used": 0,
                "tool_calls_used": 0,
            }
        ),
    }
    for placeholder, value in replacements.items():
        prompt = prompt.replace(placeholder, value)
    if "{{" in prompt or "}}" in prompt:
        raise ValidationFailure("compiled runtime prompt contains unresolved placeholders")
    return prompt.rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--simulation", required=True, type=Path)
    parser.add_argument("--adapter", required=True, type=Path)
    args = parser.parse_args()
    try:
        print(compile_prompt(args.simulation, args.adapter), end="")
    except ValidationFailure as error:
        print(f"prompt_compile_status=FAIL reason={error}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
