#!/usr/bin/env python3
"""Validate a Cascade Design review artifact and cross-field invariants."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
from typing import Any

from jsonschema import Draft202012Validator


SKILL_KIND = {
    "ux-flow-review": "ux-flow",
    "accessibility-review": "accessibility",
    "visual-qa": "visual",
    "design-system": "design-system",
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

    source_ids = {
        item.get("source_id")
        for item in artifact.get("sources", [])
        if isinstance(item, dict)
    }
    sources_by_id = {
        item.get("source_id"): item
        for item in artifact.get("sources", [])
        if isinstance(item, dict) and isinstance(item.get("source_id"), str)
    }
    for finding in artifact.get("findings", []):
        for reference in finding.get("evidence_refs", []):
            if reference.startswith("SRC-") and reference not in source_ids:
                errors.append(f"finding references unknown source: {reference}")

    status = artifact.get("status")
    if status in {"GAP", "BLOCKED"}:
        has_gap = any(
            item.get("classification") == "gap"
            for item in artifact.get("findings", [])
            if isinstance(item, dict)
        )
        has_blocked = any(
            item.get("status") == "BLOCKED"
            for item in artifact.get("handoffs", [])
            if isinstance(item, dict)
        )
        if not has_gap and not has_blocked:
            errors.append(f"{status} artifact must expose a gap finding or blocked handoff")

    if selected == "ux-flow-review" and status == "READY":
        required = [artifact.get("scope", {}).get("actor"), artifact.get("scope", {}).get("job"), coverage.get("entry_point"), coverage.get("completion_signal")]
        if any(not value for value in required):
            errors.append("READY UX review must bind actor, job, entry point, and completion signal")

    if selected == "accessibility-review":
        areas = [item.get("area") for item in coverage.get("checks", []) if isinstance(item, dict)]
        if len(areas) != len(set(areas)) or len(set(areas)) != 10:
            errors.append("accessibility coverage must contain each required area exactly once")
        note = str(coverage.get("non_attestation_note", "")).lower()
        positive_claims = (
            "certifies compliance",
            "certifies legal compliance",
            "is fully compliant",
            "legal compliance is confirmed",
            "wcag compliant",
        )
        if any(claim in note for claim in positive_claims):
            errors.append("accessibility non-attestation note makes a positive compliance claim")
        plan_by_id = {
            item.get("evidence_id"): item
            for item in artifact.get("evidence_plan", [])
            if isinstance(item, dict) and isinstance(item.get("evidence_id"), str)
        }
        for check in coverage.get("checks", []):
            if not isinstance(check, dict):
                continue
            for reference in check.get("evidence_refs", []):
                if not isinstance(reference, str) or not reference.startswith("EV-"):
                    continue
                if reference not in plan_by_id:
                    errors.append(f"accessibility check {check.get('area')} references unknown evidence plan: {reference}")
                elif plan_by_id[reference].get("status") != check.get("status"):
                    errors.append(f"accessibility check {check.get('area')} status must match evidence plan {reference}")
        available_tool_sources = [
            item
            for item in artifact.get("sources", [])
            if isinstance(item, dict)
            and item.get("kind") == "tool-output"
            and item.get("status") == "AVAILABLE"
        ]
        finding_references = {
            reference
            for finding in artifact.get("findings", [])
            if isinstance(finding, dict)
            for reference in finding.get("evidence_refs", [])
            if isinstance(reference, str)
        }
        evidence_plan_text = " ".join(
            f"{item.get('check', '')} {item.get('expected_evidence', '')}"
            for item in artifact.get("evidence_plan", [])
            if isinstance(item, dict)
        ).lower()
        for source in available_tool_sources:
            source_id = str(source.get("source_id", ""))
            if source_id not in finding_references and source_id.lower() not in evidence_plan_text:
                errors.append(f"accessibility review lacks explicit automated-source disposition for {source_id}")

    if selected == "visual-qa" and status == "READY":
        if not any(item.get("status") in {"PASS", "FAIL"} for item in coverage.get("matrix", []) if isinstance(item, dict)):
            errors.append("READY visual QA requires at least one observed PASS or FAIL matrix row")
        expected = coverage.get("expected_source_id")
        if expected and expected not in source_ids:
            errors.append("visual expected_source_id must identify a declared source")
        brand_sources = [
            item
            for item in artifact.get("sources", [])
            if isinstance(item, dict)
            and item.get("kind") == "brand"
            and item.get("authority") == "GOVERNING"
            and item.get("status") == "AVAILABLE"
        ]
        for source in brand_sources:
            source_id = str(source.get("source_id", ""))
            if not any(
                "brand-content-fit" in str(item.get("check", "")).lower()
                and source_id.lower() in (
                    str(item.get("check", "")) + " " + str(item.get("expected_evidence", ""))
                ).lower()
                for item in artifact.get("evidence_plan", [])
                if isinstance(item, dict)
            ):
                errors.append(f"visual QA lacks explicit brand-content-fit disposition for {source_id}")

    if selected == "design-system" and status == "READY":
        if not coverage.get("reuse_evidence"):
            errors.append("READY design-system rule requires reuse evidence")
        unknown = [item for item in coverage.get("source_of_truth_ids", []) if item not in source_ids]
        if unknown:
            errors.append(f"design-system source_of_truth_ids are unknown: {unknown}")

    if selected == "design-system":
        unavailable_truth = [
            source_id
            for source_id in coverage.get("source_of_truth_ids", [])
            if source_id in sources_by_id
            and (
                sources_by_id[source_id].get("status") == "MISSING"
                or sources_by_id[source_id].get("authority") == "MISSING"
            )
        ]
        if unavailable_truth:
            errors.append(f"design-system source_of_truth_ids include missing artifacts: {unavailable_truth}")

    for handoff in artifact.get("handoffs", []):
        if not isinstance(handoff, dict):
            continue
        required_input = " ".join(str(handoff.get("required_input", "")).lower().split())
        expected_output = " ".join(str(handoff.get("expected_output", "")).lower().split())
        if required_input == expected_output:
            errors.append(f"handoff input repeats its expected output: {handoff.get('route')}")
        if handoff.get("route") == "cascade-product:define-product" and handoff.get("status") == "REQUIRED":
            circular_phrases = ("accepted product definition", "accepted product contract", "versioned product definition")
            if any(phrase in required_input for phrase in circular_phrases):
                errors.append("product-definition handoff requires the missing product output as its own input")
            if not any(token in required_input for token in ("request", "observation", "source", "gap", "unresolved", "current")):
                errors.append("product-definition handoff input must name current evidence and unresolved fields")

    return errors


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
        default=Path(__file__).resolve().parents[1] / "schemas" / "design-review.schema.json",
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
