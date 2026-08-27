#!/usr/bin/env python3
"""Validate Cascade Product decision and cross-plugin handoff artifacts."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import sys
from typing import Any


PLUGIN_ALIAS = re.compile(r"^cascade-[a-z0-9-]+:[a-z0-9-]+$")
SEMVER = re.compile(r"^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")
STATES = ["INTAKE", "DISCOVERY", "DEFINITION", "VALIDATION", "DELIVERY_READY", "LEARNING"]
MAX_SAFE_INTEGER = 2**53 - 1


def reject_duplicate_members(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON member: {key}")
        result[key] = value
    return result


def validate_i_json(value: Any, path: str = "$") -> None:
    if isinstance(value, bool) or value is None or isinstance(value, str):
        return
    if isinstance(value, int):
        if abs(value) > MAX_SAFE_INTEGER:
            raise ValueError(f"unsafe I-JSON integer at {path}: {value}")
        return
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError(f"non-finite JSON number at {path}")
        return
    if isinstance(value, list):
        for index, item in enumerate(value):
            validate_i_json(item, f"{path}[{index}]")
        return
    if isinstance(value, dict):
        for key, item in value.items():
            validate_i_json(item, f"{path}.{key}")
        return
    raise ValueError(f"non-JSON value at {path}: {type(value).__name__}")


def strict_json_loads(raw: str) -> Any:
    def reject_constant(value: str) -> Any:
        raise ValueError(f"non-finite JSON number: {value}")

    result = json.loads(raw, object_pairs_hook=reject_duplicate_members, parse_constant=reject_constant)
    validate_i_json(result)
    return result


def strict_json_file(path: Path) -> Any:
    return strict_json_loads(path.read_text(encoding="utf-8"))


def duplicates(values: list[Any]) -> set[Any]:
    seen: set[Any] = set()
    repeated: set[Any] = set()
    for value in values:
        if value in seen:
            repeated.add(value)
        seen.add(value)
    return repeated


def canonical_digest(value: Any) -> str:
    validate_i_json(value)
    process = subprocess.run(
        ["node", str(Path(__file__).with_name("canonicalize_json.mjs")), "-"],
        input=json.dumps(value, ensure_ascii=False, separators=(",", ":")),
        check=False,
        capture_output=True,
        text=True,
    )
    if process.returncode != 0:
        raise ValueError(f"RFC 8785 canonicalization failed: {process.stderr.strip()}")
    result = json.loads(process.stdout)
    if result.get("algorithm") != "RFC8785-JCS+SHA-256":
        raise ValueError("canonicalizer algorithm identity mismatch")
    return result["sha256"]


def validate_decision(value: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    evidence = value.get("evidence", [])
    identities = [
        (item.get("artifact_id"), item.get("version"))
        for item in evidence
        if isinstance(item, dict)
    ]
    for artifact_id, version in sorted(duplicates(identities)):
        errors.append(f"duplicate evidence identity: {artifact_id}@{version}")
    accepted = [item for item in evidence if isinstance(item, dict) and item.get("acceptance_status") == "ACCEPTED"]
    conflicts = [item for item in evidence if isinstance(item, dict) and item.get("acceptance_status") == "CONFLICT"]
    confidence = value.get("confidence", {})
    for item in accepted:
        if not item.get("accepted_by"):
            errors.append(f"accepted evidence lacks accepting owner: {item.get('artifact_id')}")
    gate = value.get("gate_status")
    approval = value.get("approval_status")
    owner = value.get("decision_owner")
    authority = value.get("transition_authority")
    current = value.get("current_state")
    proposed = value.get("proposed_state")
    disposition = value.get("disposition")
    if gate == "READY" and (value.get("unmet_conditions") or conflicts):
        errors.append("READY gate has unmet conditions or unresolved evidence conflicts")
    if confidence.get("level") == "HIGH" and (gate != "READY" or value.get("unmet_conditions") or conflicts):
        errors.append("HIGH confidence requires a READY gate without unmet conditions or conflicts")
    if confidence.get("level") in {"LOW", "MEDIUM"} and not confidence.get("limitations"):
        errors.append(f"{confidence.get('level')} confidence lacks explicit limitations")
    if gate in {"GAP", "BLOCKED"} and not value.get("unmet_conditions"):
        errors.append(f"{gate} gate lacks unmet conditions")
    if approval == "PENDING_APPROVAL" and not owner:
        errors.append("PENDING_APPROVAL lacks a named decision owner")
    if approval == "APPROVED":
        if not owner or authority != owner:
            errors.append("APPROVED transition authority must equal the named decision owner")
        if gate != "READY" or proposed is None:
            errors.append("APPROVED decision requires a READY gate and proposed state")
        if proposed != current and not accepted:
            errors.append("APPROVED state change lacks accepted evidence")
    elif authority is not None:
        errors.append("non-approved decision cannot carry transition authority")
    if proposed in STATES and current in STATES:
        forward_distance = STATES.index(proposed) - STATES.index(current)
        if forward_distance > 1:
            errors.append("product lifecycle proposal skips more than one forward gate")
        if forward_distance > 0 and not owner:
            if gate != "BLOCKED":
                errors.append("ownerless forward gate must be BLOCKED")
            authority_gap = any(
                isinstance(item, str) and any(term in item.lower() for term in ("owner", "authority"))
                for item in value.get("unmet_conditions", [])
            )
            if not authority_gap:
                errors.append("ownerless forward gate lacks an explicit authority unmet condition")
    if disposition == "ADVANCE" and (proposed not in STATES or proposed == current):
        errors.append("ADVANCE disposition requires a distinct lifecycle state")
    if disposition in {"STOP", "DEFER", "REJECT"} and (proposed is not None or value.get("next_gate") is not None):
        errors.append(f"{disposition} disposition cannot carry a lifecycle transition")
    if approval == "REJECTED" and disposition != "REJECT":
        errors.append("REJECTED approval status requires REJECT disposition")
    if approval == "DEFERRED" and disposition != "DEFER":
        errors.append("DEFERRED approval status requires DEFER disposition")
    if proposed is not None and value.get("next_gate") != proposed:
        errors.append("next_gate must equal the proposed lifecycle state")
    if proposed == "LEARNING" and approval == "APPROVED":
        classes = {item.get("evidence_class") for item in accepted}
        if not classes.intersection({"OBSERVED", "RELEASE"}):
            errors.append("approved LEARNING transition lacks accepted observed or release evidence")
    return sorted(set(errors))


def validate_work_product(value: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    sources = [item for item in value.get("source_artifacts", []) if isinstance(item, dict)]
    source_ids = [item.get("id") for item in sources]
    errors.extend(f"duplicate source artifact id: {item}" for item in sorted(duplicates(source_ids)))
    known_sources = set(source_ids)
    sections = [item for item in value.get("sections", []) if isinstance(item, dict)]
    journeys = [item for item in value.get("journeys", []) if isinstance(item, dict)]
    requirements = [item for item in value.get("requirements", []) if isinstance(item, dict)]
    claims = [item for item in value.get("validation_claims", []) if isinstance(item, dict)]
    identifiers = {
        *(item.get("section_id") for item in sections),
        *(item.get("journey_id") for item in journeys),
        *(item.get("requirement_id") for item in requirements),
        *(item.get("claim_id") for item in claims),
    }
    identifiers.discard(None)
    for group, field in (
        (sections, "section_id"),
        (journeys, "journey_id"),
        (requirements, "requirement_id"),
        (claims, "claim_id"),
    ):
        errors.extend(f"duplicate {field}: {item}" for item in sorted(duplicates([entry.get(field) for entry in group])))
        for entry in group:
            unknown = sorted(set(entry.get("evidence_ids", [])) - known_sources)
            if unknown:
                errors.append(f"{entry.get(field)} references unknown source artifacts: {unknown}")
    for item in value.get("traceability", []):
        if not isinstance(item, dict):
            continue
        if item.get("from_id") not in identifiers:
            errors.append(f"traceability references unknown from_id: {item.get('from_id')}")
        unknown = sorted(set(item.get("to_ids", [])) - identifiers)
        if unknown:
            errors.append(f"traceability references unknown to_ids: {unknown}")
    kind = value.get("kind")
    if kind == "PRODUCT_DEFINITION" and (not journeys or not requirements or not value.get("traceability")):
        errors.append("PRODUCT_DEFINITION requires journeys, requirements, and traceability")
    if kind == "LIFECYCLE_RECORD" and not sections:
        errors.append("LIFECYCLE_RECORD requires at least one decision section")
    if kind == "VALIDATION_REPORT" and not claims:
        errors.append("VALIDATION_REPORT requires at least one validation claim")
    if value.get("status") in {"READY", "APPROVED"}:
        non_success = [item.get("id") for item in sources if item.get("status") not in {"READY", "PASS", "APPROVED"}]
        if non_success:
            errors.append(f"successful work product depends on non-success source artifacts: {non_success}")
    return sorted(set(errors))


def contract_alias_versions() -> dict[str, str]:
    root = Path(__file__).resolve().parents[1]
    plugin = strict_json_file(root / ".codex-plugin" / "plugin.json")
    versions = {
        f"{plugin['name']}:{path.parent.name}": plugin["version"]
        for path in (root / "skills").glob("*/SKILL.md")
    }
    manifest = strict_json_file(root / "evals" / "manifest.json")
    for item in manifest.get("dependencies", []):
        alias = item.get("alias")
        version = item.get("plugin_version")
        if isinstance(alias, str) and isinstance(version, str):
            previous = versions.setdefault(alias, version)
            if previous != version:
                raise ValueError(f"dependency alias has conflicting versions: {alias}")
    return versions


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def validate_handoff(value: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    mode = value.get("mode")
    status = value.get("status")
    authority = value.get("authority", {})
    policy = value.get("data_policy", {})
    freshness = value.get("freshness", {})
    failure = value.get("failure", {})
    resume = value.get("resume", {})
    closure = value.get("closure", {})
    expected_output = value.get("expected_output", {})
    budget = value.get("budget", {})
    consumer_type = value.get("consumer_type")
    for field in ("producer", "consumer"):
        if not isinstance(value.get(field), str) or PLUGIN_ALIAS.fullmatch(value[field]) is None:
            errors.append(f"handoff {field} must be an exact cascade plugin skill alias")
    if not any(
        isinstance(value.get(field), str) and value[field].startswith("cascade-product:")
        for field in ("producer", "consumer")
    ):
        errors.append("Product handoff must name Cascade Product as producer or consumer")
    try:
        versions = contract_alias_versions()
        for field in ("producer", "consumer"):
            alias = value.get(field)
            declared = value.get(f"{field}_version")
            expected = versions.get(alias)
            if expected is not None and declared != expected:
                errors.append(f"handoff {field}_version does not match the frozen package manifest: {declared} != {expected}")
            elif expected is None and (
                not isinstance(declared, str) or SEMVER.fullmatch(declared) is None
            ):
                errors.append(f"handoff {field}_version is not an exact semantic version for an optional peer: {declared}")
    except (OSError, ValueError, KeyError, TypeError) as error:
        errors.append(f"handoff alias/version registry cannot be verified: {error}")
    if consumer_type != "CASCADE_PLUGIN":
        errors.append("Product handoff consumer_type must be CASCADE_PLUGIN")
    if mode != "EXECUTE" and (authority.get("execution_authorized") or authority.get("external_write_authorized")):
        errors.append(f"{mode} handoff cannot carry execution or external-write authority")
    if authority.get("execution_authorized") and not authority.get("decision_owner"):
        errors.append("execution authority lacks a named decision owner")
    if authority.get("external_write_authorized") and (
        mode != "EXECUTE"
        or not authority.get("execution_authorized")
        or not authority.get("decision_owner")
        or not policy.get("transfer_authorized")
        or not policy.get("destination")
    ):
        errors.append("external-write authority is not closed by execute, owner, and destination permission")
    if budget.get("external_writes", 0) and not authority.get("external_write_authorized"):
        errors.append("external-write budget lacks external-write authority")
    if authority.get("external_write_authorized") and not budget.get("external_writes", 0):
        errors.append("external-write authority lacks a positive bounded write budget")
    if not expected_output.get("artifact_id") or not expected_output.get("artifact_version"):
        errors.append("handoff expected output identity is incomplete")
    if mode == "EXECUTE" and not isinstance(budget.get("timeout_seconds"), int):
        errors.append("EXECUTE handoff requires a finite timeout_seconds budget")
    if policy.get("transfer_authorized") and not policy.get("destination"):
        errors.append("transfer authority lacks a destination")
    if mode == "EXECUTE" and (
        not authority.get("execution_authorized")
        or not authority.get("decision_owner")
        or not policy.get("transfer_authorized")
        or not policy.get("destination")
    ):
        errors.append("EXECUTE handoff lacks named authority or destination permission")
    try:
        produced = parse_time(freshness["produced_at"])
        expires = parse_time(freshness["expires_at"]) if freshness.get("expires_at") else None
        if expires is not None and expires <= produced:
            errors.append("handoff expires_at is not after produced_at")
        if freshness.get("status") == "CURRENT" and expires is not None and expires <= datetime.now(timezone.utc):
            errors.append("handoff marked CURRENT is already expired")
    except (KeyError, TypeError, ValueError):
        errors.append("handoff freshness timestamps are invalid")
    if status in {"READY", "PASS"}:
        if failure.get("classification") != "NONE" or failure.get("message") is not None:
            errors.append("successful handoff contains a failure")
        if not value.get("output_artifacts"):
            errors.append("successful handoff lacks output artifacts")
    elif failure.get("classification") == "NONE":
        errors.append("non-success handoff lacks a failure classification")
    if failure.get("classification") != "NONE":
        if not resume.get("owner") or not resume.get("next_action"):
            errors.append("failed handoff lacks closed resume ownership")
        has_artifact = isinstance(resume.get("required_artifact"), str) and bool(resume["required_artifact"])
        has_not_applicable = isinstance(resume.get("not_applicable_reason"), str) and bool(resume["not_applicable_reason"])
        if has_artifact == has_not_applicable:
            errors.append("failed handoff resume must provide exactly one required_artifact or not_applicable_reason")
        if failure.get("classification") in {"MISSING_INPUT", "CONFLICT", "STALE", "SCHEMA_MISMATCH", "PERMISSION_DENIED"} and not has_artifact:
            errors.append(f"{failure.get('classification')} handoff must name the required artifact")
    if mode == "PREPARE" and status == "READY":
        if not resume.get("owner") or not resume.get("next_action"):
            errors.append("READY PREPARE handoff lacks actionable resume ownership")
        has_artifact = isinstance(resume.get("required_artifact"), str) and bool(resume["required_artifact"])
        has_not_applicable = isinstance(resume.get("not_applicable_reason"), str) and bool(resume["not_applicable_reason"])
        if has_artifact == has_not_applicable:
            errors.append("READY PREPARE resume must provide exactly one required_artifact or not_applicable_reason")
    if status == "PASS" and (
        not closure.get("requires_acknowledgment")
        or not closure.get("acknowledged")
        or not closure.get("acknowledgment_id")
    ):
        errors.append("PASS handoff lacks acknowledgment closure")
    if status == "PASS":
        matches = [
            artifact
            for artifact in value.get("output_artifacts", [])
            if isinstance(artifact, dict)
            and artifact.get("id") == expected_output.get("artifact_id")
            and artifact.get("version") == expected_output.get("artifact_version")
            and artifact.get("status") == expected_output.get("status")
            and artifact.get("sha256") == expected_output.get("sha256")
        ]
        if len(matches) != 1 or not expected_output.get("sha256"):
            errors.append("terminal PASS output does not exactly satisfy expected_output identity, status, and digest")
    return sorted(set(errors))


VALIDATORS = {"decision": validate_decision, "handoff": validate_handoff, "work-product": validate_work_product}


def validate_schema(value: Any, schema_path: Path) -> list[str]:
    try:
        from jsonschema import Draft202012Validator, FormatChecker
    except ImportError:
        return ["jsonschema dependency unavailable; run through uv --offline --with jsonschema"]
    schema = strict_json_file(schema_path)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors: list[str] = []
    for error in sorted(validator.iter_errors(value), key=lambda item: list(item.path)):
        path = "$" + "".join(f"[{item}]" if isinstance(item, int) else f".{item}" for item in error.path)
        errors.append(f"{path}: {error.message}")
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("kind", choices=sorted(VALIDATORS))
    parser.add_argument("artifact", type=Path)
    parser.add_argument("--schema", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        value = strict_json_file(args.artifact)
        errors = validate_schema(value, args.schema)
        if not errors:
            errors = VALIDATORS[args.kind](value)
        result = {"status": "PASS" if not errors else "INVALID", "kind": args.kind, "errors": errors}
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0 if not errors else 2
    except (OSError, json.JSONDecodeError, ValueError, KeyError, TypeError, AttributeError) as error:
        print(json.dumps({"status": "INVALID", "kind": args.kind, "errors": [str(error)]}, indent=2, sort_keys=True))
        return 2


if __name__ == "__main__":
    sys.exit(main())
