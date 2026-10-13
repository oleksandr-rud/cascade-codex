#!/usr/bin/env python3
"""Validate a Cascade QA artifact and cross-field invariants."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
from typing import Any

from jsonschema import Draft202012Validator


SKILL_KIND = {"plan-quality": "QUALITY_PLAN", "design-tests": "TEST_DESIGN", "assess-quality": "QUALITY_ASSESSMENT", "triage-defects": "DEFECT_TRIAGE"}
NONPASSING = {"FAIL", "BLOCKED", "NOT_RUN", "GAP", "STALE"}


def canonical_capability_owner(value: str) -> bool:
    return value == "target-host" or value.startswith("target-host:") or (
        value.startswith("cascade-") and ":" in value
    )


def owner_is_grounded(value: Any, current_source_identities: list[str]) -> bool:
    if value is None:
        return True
    owner = str(value).strip().casefold()
    if not owner:
        return False
    if canonical_capability_owner(owner):
        return True
    return any(owner in identity for identity in current_source_identities)


def source_is_state_bearing(source: dict[str, Any]) -> bool:
    kind = str(source.get("kind", "")).strip().casefold()
    descriptive_tokens = (
        "owner",
        "authority",
        "instruction",
        "request",
        "untrusted",
        "hostile",
        "claim",
        "label",
        "title",
        "candidate",
        "adapter",
        "alias",
        "capability",
        "route",
        "actor",
        "role",
        "environment",
        "required-evidence",
        "required_evidence",
        "evidence-requirement",
    )
    return not any(token in kind for token in descriptive_tokens)


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
    kind = artifact.get("artifact_kind")
    status = artifact.get("status")
    if SKILL_KIND.get(selected) != kind:
        errors.append("selected_skill does not match artifact_kind")

    subject = artifact.get("subject", {})
    if status in {"READY", "PASS", "FAIL"} and not subject.get("behavior_ref"):
        errors.append(f"{status} artifact requires an accepted behavior_ref")
    if status == "READY" and not subject.get("decision_owner"):
        errors.append("READY artifact requires a decision_owner")

    source_ids = [item.get("source_id") for item in artifact.get("sources", []) if isinstance(item, dict)]
    if len(source_ids) != len(set(source_ids)):
        errors.append("source_id values must be unique")
    current_source_identities = [
        str(item.get("identity", "")).strip().casefold()
        for item in artifact.get("sources", [])
        if isinstance(item, dict) and item.get("status") == "CURRENT"
    ]
    for item in artifact.get("sources", []):
        if (
            isinstance(item, dict)
            and item.get("status") == "CURRENT"
            and source_is_state_bearing(item)
            and not item.get("digest")
        ):
            errors.append(
                f"current state-bearing source {item.get('source_id')} requires an immutable digest; "
                "normalize NAME@sha256:value into identity NAME and digest sha256:value"
            )

    owner_fields: list[tuple[str, Any]] = [("subject.decision_owner", subject.get("decision_owner"))]
    evidence = [item for item in artifact.get("evidence", []) if isinstance(item, dict)]
    evidence_ids = [item.get("evidence_id") for item in evidence]
    if len(evidence_ids) != len(set(evidence_ids)):
        errors.append("evidence_id values must be unique")

    coverage = [item for item in artifact.get("coverage", []) if isinstance(item, dict)]
    tests = [item for item in artifact.get("tests", []) if isinstance(item, dict)]
    defects = [item for item in artifact.get("defects", []) if isinstance(item, dict)]
    if kind == "QUALITY_PLAN" and status not in {"GAP", "BLOCKED"} and not coverage:
        errors.append("QUALITY_PLAN requires risk-based coverage")
    if kind == "TEST_DESIGN" and not tests:
        errors.append("TEST_DESIGN requires test cases")
    if kind == "QUALITY_ASSESSMENT" and not evidence:
        errors.append("QUALITY_ASSESSMENT requires frozen evidence receipts")
    if kind == "DEFECT_TRIAGE" and not defects:
        errors.append("DEFECT_TRIAGE requires at least one classified defect")
    if kind == "DEFECT_TRIAGE" and status == "AMBIGUOUS" and any(
        item.get("classification") != "AMBIGUOUS" for item in defects
    ):
        errors.append("AMBIGUOUS DEFECT_TRIAGE may contain only AMBIGUOUS defect candidates")

    gate = artifact.get("quality_gate", {})
    owner_fields.append(("quality_gate.acceptance_owner", gate.get("acceptance_owner")))
    if kind == "QUALITY_ASSESSMENT" and status in {"PASS", "FAIL"} and not gate.get("acceptance_owner"):
        errors.append(f"{status} assessment requires an acceptance_owner")
    required_nonpassing = [item for item in coverage if item.get("required") and item.get("status") in NONPASSING]
    if gate.get("recommendation") == "PASS" and required_nonpassing:
        errors.append("PASS gate cannot contain required non-passing coverage")
    assessment_recommendation = {"PASS": "PASS", "FAIL": "FAIL", "BLOCKED": "BLOCKED", "AMBIGUOUS": "AMBIGUOUS"}
    if kind == "QUALITY_ASSESSMENT" and status in assessment_recommendation and gate.get("recommendation") != assessment_recommendation[status]:
        errors.append(f"{status} assessment requires {assessment_recommendation[status]} gate recommendation")
    if kind == "QUALITY_ASSESSMENT" and gate.get("recommendation") == "PASS":
        required_refs = set(gate.get("required_evidence_refs", []))
        known_refs = set(evidence_ids)
        if not required_refs or not required_refs.issubset(known_refs):
            errors.append("PASS assessment requires declared, known evidence receipts")
        evidence_by_id = {item.get("evidence_id"): item for item in evidence}
        for evidence_id in sorted(required_refs & known_refs):
            receipt = evidence_by_id[evidence_id]
            if receipt.get("status") != "PASS":
                errors.append(f"PASS assessment requires required receipt {evidence_id} to be PASS")
            if receipt.get("subject_ref") != subject.get("behavior_ref"):
                errors.append(f"PASS assessment receipt {evidence_id} must bind the exact behavior_ref")
        if gate.get("blockers"):
            errors.append("PASS assessment cannot retain blockers")

    if kind == "TEST_DESIGN":
        coverage_risks = {item.get("risk_ref") for item in coverage if item.get("risk_ref")}
        for item in coverage:
            if not item.get("risk_ref"):
                errors.append(f"{item.get('id')}: TEST_DESIGN coverage requires a non-null risk_ref")
        for test in tests:
            if test.get("behavior_ref") != subject.get("behavior_ref"):
                errors.append(f"{test.get('id')}: test behavior_ref must match the exact subject behavior_ref")
            if not test.get("risk_ref"):
                errors.append(f"{test.get('id')}: TEST_DESIGN test requires a non-null risk_ref")
            elif test.get("risk_ref") not in coverage_risks:
                errors.append(f"{test.get('id')}: test risk_ref must resolve to TEST_DESIGN coverage")

    for defect in defects:
        owner_fields.append((f"defects[{defect.get('id')}].repair_owner", defect.get("repair_owner")))
        unknown_evidence = sorted(set(defect.get("evidence_refs", [])) - set(evidence_ids))
        if unknown_evidence:
            errors.append(f"{defect.get('id')}: evidence_refs must resolve to frozen evidence: {unknown_evidence}")
        if subject.get("behavior_ref") and defect.get("behavior_ref") != subject.get("behavior_ref"):
            errors.append(f"{defect.get('id')}: defect behavior_ref must match the exact subject behavior_ref")
        if defect.get("classification") == "TEST_DRIFT" and defect.get("public_boundary_status") != "PASS":
            errors.append(f"{defect.get('id')}: TEST_DRIFT requires independent public-boundary PASS evidence")
        if defect.get("classification") == "TEST_DRIFT":
            evidence_by_id = {item.get("evidence_id"): item for item in evidence}
            pass_receipts = [
                evidence_by_id[ref]
                for ref in defect.get("evidence_refs", [])
                if ref in evidence_by_id
                and evidence_by_id[ref].get("status") == "PASS"
                and evidence_by_id[ref].get("subject_ref") == subject.get("behavior_ref")
            ]
            if len(pass_receipts) < 2 or len({item.get("claim_scope") for item in pass_receipts}) < 2:
                errors.append(f"{defect.get('id')}: TEST_DRIFT requires two independent exact-subject PASS receipts")
        if defect.get("classification") == "AMBIGUOUS" and defect.get("repair_owner") is not None:
            errors.append(f"{defect.get('id')}: AMBIGUOUS classification requires repair_owner null until evidence assigns repair ownership")
        if defect.get("classification") != "AMBIGUOUS" and not defect.get("repair_owner"):
            errors.append(f"{defect.get('id')}: classified defect requires a repair_owner")

    for request in artifact.get("execution_requests", []):
        if not isinstance(request, dict):
            continue
        if any(key in request for key in ("command", "shell", "script")):
            errors.append(f"{request.get('id')}: raw executable fields are forbidden")

    for index, handoff in enumerate(artifact.get("handoffs", [])):
        if isinstance(handoff, dict):
            owner_fields.append((f"handoffs[{index}].route", handoff.get("route")))

    if kind == "DEFECT_TRIAGE" and status == "AMBIGUOUS" and not any(
        isinstance(handoff, dict) and handoff.get("route") == "target-host"
        for handoff in artifact.get("handoffs", [])
    ):
        errors.append("AMBIGUOUS DEFECT_TRIAGE requires a target-host evidence-collection handoff")

    for field, owner in owner_fields:
        if not owner_is_grounded(owner, current_source_identities):
            errors.append(f"{field} must be a current source-bound owner or canonical capability route")

    for name, value in artifact.get("boundaries", {}).items():
        if value is not False:
            errors.append(f"boundary {name} must remain false")

    if status in {"GAP", "BLOCKED", "FAIL", "AMBIGUOUS"} and not gate.get("blockers") and not defects:
        errors.append(f"{status} artifact must expose blockers or defects")
    return sorted(set(errors))


def validate_artifact(schema: dict[str, Any], artifact: dict[str, Any]) -> list[str]:
    errors = [f"schema {'.'.join(str(item) for item in error.absolute_path) or '<root>'}: {error.message}" for error in Draft202012Validator(schema).iter_errors(artifact)]
    errors.extend(cross_field_errors(artifact))
    return sorted(set(errors))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("artifact", type=Path)
    parser.add_argument("--schema", type=Path, default=Path(__file__).resolve().parents[1] / "schemas" / "qa-artifact.schema.json")
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
