#!/usr/bin/env python3
"""Validate a Cascade Security review artifact and cross-field invariants."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
from typing import Any

from jsonschema import Draft202012Validator


SKILL_KIND = {
    "codebase-audit": "codebase",
    "auth-analysis": "auth",
    "secure-design": "design",
}


def strict_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=strict_object)


def cross_field_errors(artifact: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    selected = artifact.get("selected_skill")
    coverage = artifact.get("coverage", {})
    if SKILL_KIND.get(selected) != coverage.get("kind"):
        errors.append("selected_skill does not match coverage.kind")

    sources = [item for item in artifact.get("sources", []) if isinstance(item, dict)]
    source_ids = {item.get("source_id") for item in sources}
    if len(source_ids) != len(sources):
        errors.append("source_id values must be unique")
    if any(item.get("kind") == "assumption" and item.get("authority") != "ASSUMPTION" for item in sources):
        errors.append("assumption sources must declare ASSUMPTION authority")

    for finding in artifact.get("findings", []):
        if not isinstance(finding, dict):
            continue
        unknown = [ref for ref in finding.get("evidence_refs", []) if ref not in source_ids]
        if unknown:
            errors.append(f"finding references unknown sources: {unknown}")

    status = artifact.get("status")
    findings = [item for item in artifact.get("findings", []) if isinstance(item, dict)]
    handoffs = [item for item in artifact.get("handoffs", []) if isinstance(item, dict)]
    if status in {"GAP", "BLOCKED"}:
        has_gap = any(item.get("classification") in {"gap", "unknown", "conflict"} for item in findings)
        has_block = any(item.get("status") in {"REQUIRED", "BLOCKED"} for item in handoffs)
        if not has_gap and not has_block:
            errors.append(f"{status} artifact must expose a gap finding or required/blocked handoff")

    available_evidence = any(
        item.get("status") == "AVAILABLE" and item.get("authority") not in {"ASSUMPTION", "MISSING"}
        for item in sources
    )
    if status == "READY" and not available_evidence:
        errors.append("READY artifact requires at least one available non-assumption source")

    if selected == "codebase-audit" and status == "READY":
        inventory = coverage.get("inventory", {})
        if inventory.get("scanner") == "not-run":
            errors.append("READY codebase audit requires a completed filename inventory")
    if selected == "auth-analysis" and status == "READY":
        required = {"session-lifecycle", "server-side-authorization", "tenant-isolation"}
        missing = required - set(coverage.get("checks", []))
        if missing:
            errors.append(f"READY auth analysis is missing core checks: {sorted(missing)}")
    if selected == "secure-design" and status == "READY":
        for field in ("assets", "trust_boundaries", "abuse_cases", "required_controls"):
            if not coverage.get(field):
                errors.append(f"READY secure design requires {field}")

    for handoff in handoffs:
        required_input = " ".join(str(handoff.get("required_input", "")).lower().split())
        expected_output = " ".join(str(handoff.get("expected_output", "")).lower().split())
        if required_input == expected_output:
            errors.append(f"handoff input repeats expected output: {handoff.get('route')}")

    authority = artifact.get("authority", {})
    if authority.get("compliance_attestation") is not False:
        errors.append("security review must not claim compliance attestation")
    return sorted(set(errors))


def validate_artifact(schema: dict[str, Any], artifact: dict[str, Any]) -> list[str]:
    validator = Draft202012Validator(schema)
    errors = [
        f"schema {'.'.join(str(item) for item in error.absolute_path) or '<root>'}: {error.message}"
        for error in validator.iter_errors(artifact)
    ]
    errors.extend(cross_field_errors(artifact))
    return sorted(set(errors))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("artifact", type=Path)
    parser.add_argument(
        "--schema",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "schemas" / "security-review.schema.json",
    )
    args = parser.parse_args(argv)
    try:
        schema = read_json(args.schema)
        artifact = read_json(args.artifact)
        if not isinstance(schema, dict) or not isinstance(artifact, dict):
            raise ValueError("schema and artifact must be JSON objects")
        errors = validate_artifact(schema, artifact)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        errors = [str(error)]
    print(json.dumps({"status": "PASS" if not errors else "INVALID", "errors": errors}, indent=2))
    return 0 if not errors else 2


if __name__ == "__main__":
    sys.exit(main())
