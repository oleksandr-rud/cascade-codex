#!/usr/bin/env python3
"""Cross-field validators for canonical personas, projections, and handoffs."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re
import subprocess
import sys
from typing import Any


PLUGIN_ALIAS = re.compile(r"^cascade-[a-z0-9-]+:[a-z0-9-]+$")
PERSONA_SCHEMA = Path(__file__).resolve().parents[1] / "schemas" / "persona.schema.json"
MAX_SAFE_INTEGER = 2**53 - 1


def reject_duplicate_members(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON member: {key}")
        result[key] = value
    return result


def strict_json_loads(raw: str) -> Any:
    def reject_constant(value: str) -> Any:
        raise ValueError(f"non-finite JSON number: {value}")

    value = json.loads(
        raw,
        object_pairs_hook=reject_duplicate_members,
        parse_constant=reject_constant,
    )
    validate_i_json(value)
    return value


def strict_json_file(path: Path) -> Any:
    return strict_json_loads(path.read_text(encoding="utf-8"))


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


def duplicates(values: list[Any]) -> set[Any]:
    seen: set[Any] = set()
    repeated: set[Any] = set()
    for value in values:
        if value in seen:
            repeated.add(value)
        seen.add(value)
    return repeated


def is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def matches_variable(variable: dict[str, Any], value: Any) -> bool:
    kind = variable.get("value_type")
    if kind == "NUMBER":
        return is_number(value)
    if kind == "INTEGER":
        return isinstance(value, int) and not isinstance(value, bool)
    if kind == "BOOLEAN":
        return isinstance(value, bool)
    if kind in {"CATEGORY", "TEXT"}:
        return isinstance(value, str) and bool(value)
    return False


def bounded(variable: dict[str, Any], value: Any) -> bool:
    if variable.get("value_type") in {"NUMBER", "INTEGER"}:
        return variable["minimum"] <= value <= variable["maximum"]
    if variable.get("value_type") == "CATEGORY":
        return value in variable["allowed_values"]
    return True


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


def file_digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def projection_validation_receipt(
    payload: dict[str, Any],
    *,
    field_mappings: list[dict[str, Any]],
    source_digest: str,
    target_schema_digest: str,
    validation_kind: str,
    target_validator_path: Path | None = None,
) -> dict[str, Any]:
    if validation_kind == "DETERMINISTIC_SIMULATION_COMPILER":
        if target_validator_path is None:
            raise ValueError("deterministic validation requires the target semantic validator")
        validator_name = "cascade-personas/scripts/compile_simulation_persona.py"
        validator_path = Path(__file__).with_name("compile_simulation_persona.py")
        semantic_status = "PASS"
        target_validator = "cascade-simulations:simulation-persona/scripts/validate_persona.py"
        target_validator_sha256 = file_digest(target_validator_path)
    elif validation_kind == "DECLARATIVE_MAPPING":
        if target_validator_path is not None:
            raise ValueError("declarative validation cannot claim a target semantic validator")
        validator_name = "cascade-personas/scripts/validate_artifact.py"
        validator_path = Path(__file__)
        semantic_status = "NOT_RUN"
        target_validator = None
        target_validator_sha256 = None
    else:
        raise ValueError(f"unsupported projection validation kind: {validation_kind}")
    record = {
        "schema_status": "PASS",
        "lineage_status": "PASS",
        "semantic_status": semantic_status,
        "validation_kind": validation_kind,
        "validator": validator_name,
        "validator_sha256": file_digest(validator_path),
        "target_semantic_validator": target_validator,
        "target_semantic_validator_sha256": target_validator_sha256,
        "source_persona_sha256": source_digest,
        "target_schema_sha256": target_schema_digest,
        "payload_sha256": canonical_digest(payload),
        "field_mappings_sha256": canonical_digest(field_mappings),
    }
    return {**record, "receipt_sha256": canonical_digest(record)}


def precondition_valid(variable: dict[str, Any], operator: str, operand: Any) -> bool:
    kind = variable.get("value_type")
    if operator == "IN":
        return (
            isinstance(operand, list)
            and bool(operand)
            and all(matches_variable(variable, item) and bounded(variable, item) for item in operand)
        )
    if operator in {"LT", "LTE", "GT", "GTE"} and kind not in {"NUMBER", "INTEGER"}:
        return False
    return matches_variable(variable, operand) and bounded(variable, operand)


def condition_matches(value: Any, operator: str, operand: Any) -> bool:
    if operator == "EQ":
        return value == operand
    if operator == "NE":
        return value != operand
    if operator == "LT":
        return value < operand
    if operator == "LTE":
        return value <= operand
    if operator == "GT":
        return value > operand
    if operator == "GTE":
        return value >= operand
    if operator == "IN":
        return value in operand
    return False


def numeric_precondition_domain(
    variable: dict[str, Any],
    preconditions: list[dict[str, Any]],
) -> list[int | float]:
    """Return conservative extrema for every numeric state admitted by preconditions."""

    lower = variable["minimum"]
    upper = variable["maximum"]
    discrete: list[int | float] | None = None
    integer = variable.get("value_type") == "INTEGER"
    for item in preconditions:
        operator = item["operator"]
        operand = item["value"]
        if operator == "EQ":
            candidates = [operand]
            discrete = candidates if discrete is None else [value for value in discrete if value in candidates]
        elif operator == "IN":
            candidates = list(dict.fromkeys(operand))
            discrete = candidates if discrete is None else [value for value in discrete if value in candidates]
        elif operator == "GT":
            lower = max(lower, operand + 1 if integer else operand)
        elif operator == "GTE":
            lower = max(lower, operand)
        elif operator == "LT":
            upper = min(upper, operand - 1 if integer else operand)
        elif operator == "LTE":
            upper = min(upper, operand)

    if lower > upper:
        return []
    if discrete is not None:
        return sorted(
            {
                value
                for value in discrete
                if lower <= value <= upper
                and all(condition_matches(value, item["operator"], item["value"]) for item in preconditions)
            }
        )
    endpoints = [lower] if lower == upper else [lower, upper]
    if lower == upper and not all(
        condition_matches(lower, item["operator"], item["value"])
        for item in preconditions
    ):
        return []
    return endpoints


def validate_persona(value: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    sources = value.get("sources")
    claims = value.get("claims")
    stable = value.get("stable_profile")
    dynamic = value.get("dynamic_model")
    if not isinstance(sources, list) or not isinstance(claims, list):
        return ["sources and claims must be arrays before semantic validation"]
    if not isinstance(stable, dict) or not isinstance(dynamic, dict):
        return ["stable_profile and dynamic_model must be objects before semantic validation"]

    source_ids = [item.get("source_id") for item in sources if isinstance(item, dict)]
    claim_ids = [item.get("claim_id") for item in claims if isinstance(item, dict)]
    errors.extend(f"duplicate source_id: {item}" for item in sorted(duplicates(source_ids)))
    errors.extend(f"duplicate claim_id: {item}" for item in sorted(duplicates(claim_ids)))
    source_set = set(source_ids)
    claim_set = set(claim_ids)

    synthetic_types = {"HYPOTHESIS", "SYNTHETIC"}
    for claim in claims:
        if not isinstance(claim, dict):
            errors.append("claim is not an object")
            continue
        missing_sources = set(claim.get("source_ids", [])) - source_set
        if missing_sources:
            errors.append(f"claim {claim.get('claim_id')} has unknown source_ids: {sorted(missing_sources)}")
        unknown_conflicts = set(claim.get("conflicts_with", [])) - claim_set
        if unknown_conflicts:
            errors.append(f"claim {claim.get('claim_id')} has unknown conflicts_with: {sorted(unknown_conflicts)}")
        if claim.get("claim_id") in claim.get("conflicts_with", []):
            errors.append(f"claim {claim.get('claim_id')} conflicts with itself")
        if claim.get("claim_type") in synthetic_types and not claim.get("synthetic_basis"):
            errors.append(f"claim {claim.get('claim_id')} lacks synthetic_basis")

    status = value.get("status")
    claim_types = {claim.get("claim_type") for claim in claims if isinstance(claim, dict)}
    if status == "GROUNDED" and claim_types.intersection(synthetic_types):
        errors.append("GROUNDED persona contains synthetic or hypothesis claims")
    if status == "MIXED":
        if not claim_types.intersection(synthetic_types):
            errors.append("MIXED persona lacks a synthetic or hypothesis claim")
        if not claim_types.intersection({"OBSERVED", "USER_PROVIDED", "INFERRED"}):
            errors.append("MIXED persona lacks a grounded claim")
    if status == "SYNTHETIC_HYPOTHESIS" and not claim_types.intersection(synthetic_types):
        errors.append("SYNTHETIC_HYPOTHESIS persona lacks a synthetic or hypothesis claim")

    contradiction_pairs: set[frozenset[str]] = set()
    for contradiction in value.get("contradictions", []):
        ids = contradiction.get("claim_ids", []) if isinstance(contradiction, dict) else []
        unknown = set(ids) - claim_set
        if unknown:
            errors.append(f"contradiction references unknown claims: {sorted(unknown)}")
        contradiction_pairs.add(frozenset(ids))
        if contradiction.get("resolution") == "UNRESOLVED" and contradiction.get("governing_rule") is not None:
            errors.append(f"unresolved contradiction {contradiction.get('contradiction_id')} cannot claim a governing rule")
        if contradiction.get("resolution") == "RESOLVED" and not contradiction.get("governing_rule"):
            errors.append(f"resolved contradiction {contradiction.get('contradiction_id')} lacks governing_rule")
    for claim in claims:
        for other in claim.get("conflicts_with", []):
            if frozenset({claim["claim_id"], other}) not in contradiction_pairs:
                errors.append(f"conflict {claim['claim_id']} vs {other} lacks contradiction ledger entry")

    for field, items in stable.items():
        candidates = [items] if field == "communication" else items
        if not isinstance(candidates, list):
            errors.append(f"stable_profile.{field} must be grounded value data")
            continue
        for item in candidates:
            if not isinstance(item, dict):
                errors.append(f"stable_profile.{field} item is not an object")
                continue
            unknown = set(item.get("claim_ids", [])) - claim_set
            if unknown:
                errors.append(f"stable_profile.{field} has unknown claim_ids: {sorted(unknown)}")

    variables = dynamic.get("variables", [])
    variable_ids = [item.get("variable_id") for item in variables if isinstance(item, dict)]
    errors.extend(f"duplicate variable_id: {item}" for item in sorted(duplicates(variable_ids)))
    variable_map = {item["variable_id"]: item for item in variables if isinstance(item, dict) and item.get("variable_id")}
    for variable_id, variable in variable_map.items():
        baseline = variable.get("baseline")
        if not matches_variable(variable, baseline):
            errors.append(f"variable {variable_id} baseline type does not match {variable.get('value_type')}")
            continue
        if variable.get("value_type") in {"NUMBER", "INTEGER"}:
            minimum = variable.get("minimum")
            maximum = variable.get("maximum")
            if not is_number(minimum) or not is_number(maximum) or minimum > maximum:
                errors.append(f"variable {variable_id} has invalid numeric bounds")
            elif not bounded(variable, baseline):
                errors.append(f"variable {variable_id} baseline is outside bounds")
        elif variable.get("value_type") == "CATEGORY" and baseline not in variable.get("allowed_values", []):
            errors.append(f"variable {variable_id} baseline is outside allowed_values")

    transition_ids: list[Any] = []
    for transition in dynamic.get("transitions", []):
        transition_ids.append(transition.get("transition_id"))
        evidence_ids = set(transition.get("evidence_claim_ids", []))
        if evidence_ids - claim_set:
            errors.append(f"transition {transition.get('transition_id')} has unknown evidence claims")
        preconditions_by_variable: dict[str, list[dict[str, Any]]] = {}
        for item in transition.get("preconditions", []):
            variable = variable_map.get(item.get("variable_id"))
            if variable is None:
                errors.append(f"transition {transition.get('transition_id')} precondition references unknown variable")
                continue
            if not precondition_valid(variable, item.get("operator"), item.get("value")):
                errors.append(
                    f"transition {transition.get('transition_id')} precondition is incompatible with {item.get('variable_id')}"
                )
                continue
            preconditions_by_variable.setdefault(item["variable_id"], []).append(item)
        update_ids = [item.get("variable_id") for item in transition.get("updates", []) if isinstance(item, dict)]
        for repeated in sorted(duplicates(update_ids)):
            errors.append(f"transition {transition.get('transition_id')} updates {repeated} more than once")
        for update in transition.get("updates", []):
            variable_id = update.get("variable_id")
            variable = variable_map.get(variable_id)
            if variable is None:
                errors.append(f"transition {transition.get('transition_id')} update references unknown variable")
                continue
            operand = update.get("value")
            operation = update.get("operation")
            if variable.get("update_authority") == "IMMUTABLE":
                errors.append(f"transition {transition.get('transition_id')} updates immutable variable {variable_id}")
                continue
            if operation in {"INCREMENT", "DECREMENT"}:
                numeric_operand = is_number(operand)
                if variable.get("value_type") == "INTEGER":
                    numeric_operand = isinstance(operand, int) and not isinstance(operand, bool)
                if variable.get("value_type") not in {"NUMBER", "INTEGER"} or not numeric_operand:
                    errors.append(f"transition {transition.get('transition_id')} uses numeric update on incompatible variable")
                    continue
                domain = numeric_precondition_domain(variable, preconditions_by_variable.get(variable_id, []))
                if not domain:
                    errors.append(f"transition {transition.get('transition_id')} has unsatisfiable preconditions for {variable_id}")
                    continue
                candidates = [
                    current + operand if operation == "INCREMENT" else current - operand
                    for current in domain
                ]
            else:
                candidates = [operand]
            if any(not matches_variable(variable, candidate) or not bounded(variable, candidate) for candidate in candidates):
                errors.append(f"transition {transition.get('transition_id')} update leaves {variable_id} invalid")
    errors.extend(f"duplicate transition_id: {item}" for item in sorted(duplicates(transition_ids)))

    privacy = value.get("privacy", {})
    if privacy.get("identifiable_person") and privacy.get("classification") == "PUBLIC":
        errors.append("an identifiable-person persona cannot be PUBLIC")
    return sorted(set(errors))


def normalize_field_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def json_pointer_components(pointer: str) -> tuple[str, ...]:
    if not isinstance(pointer, str) or not pointer.startswith("/"):
        raise ValueError(f"prohibited field is not a canonical JSON Pointer: {pointer}")
    components: list[str] = []
    for raw in pointer[1:].split("/"):
        index = 0
        decoded = ""
        while index < len(raw):
            if raw[index] != "~":
                decoded += raw[index]
                index += 1
                continue
            if index + 1 >= len(raw) or raw[index + 1] not in {"0", "1"}:
                raise ValueError(f"prohibited field has invalid JSON Pointer escaping: {pointer}")
            decoded += "~" if raw[index + 1] == "0" else "/"
            index += 2
        components.append(decoded)
    return tuple(components)


def source_path_intersects_prohibition(source_path: str, pointers: list[str]) -> list[str]:
    components = tuple(source_path.split(".")) if source_path else ()
    intersections: list[str] = []
    for pointer in pointers:
        prohibited = json_pointer_components(pointer)
        shared = min(len(components), len(prohibited))
        if components[:shared] == prohibited[:shared]:
            intersections.append(pointer)
    return sorted(intersections)


def nested_forbidden_keys(value: Any, forbidden: set[str]) -> set[str]:
    normalized = {normalize_field_name(item) for item in forbidden}
    if isinstance(value, dict):
        found = {key for key in value if normalize_field_name(str(key)) in normalized}
        for item in value.values():
            found.update(nested_forbidden_keys(item, normalized))
        return found
    if isinstance(value, list):
        found: set[str] = set()
        for item in value:
            found.update(nested_forbidden_keys(item, forbidden))
        return found
    return set()


def resolve_path(value: Any, path: str) -> Any:
    current = value
    for component in path.split("."):
        if isinstance(current, dict) and component in current:
            current = current[component]
            continue
        if isinstance(current, list) and component.isdigit():
            index = int(component)
            if 0 <= index < len(current):
                current = current[index]
                continue
        raise KeyError(path)
    return current


def nested_claim_ids(value: Any) -> set[str]:
    if isinstance(value, dict):
        found: set[str] = set()
        if isinstance(value.get("claim_id"), str):
            found.add(value["claim_id"])
        for key in ("claim_ids", "evidence_claim_ids"):
            if isinstance(value.get(key), list):
                found.update(item for item in value[key] if isinstance(item, str))
        for item in value.values():
            found.update(nested_claim_ids(item))
        return found
    if isinstance(value, list):
        found: set[str] = set()
        for item in value:
            found.update(nested_claim_ids(item))
        return found
    return set()


def payload_terminal_paths(value: Any, prefix: str = "") -> set[str]:
    """Return every addressable payload leaf, including individual array members."""
    if isinstance(value, dict) and value:
        result: set[str] = set()
        for key, item in value.items():
            path = f"{prefix}.{key}" if prefix else str(key)
            result.update(payload_terminal_paths(item, path))
        return result
    if isinstance(value, list) and value:
        result: set[str] = set()
        for index, item in enumerate(value):
            path = f"{prefix}.{index}" if prefix else str(index)
            result.update(payload_terminal_paths(item, path))
        return result
    return {prefix} if prefix else set()


def projection_target_path(path: str) -> str:
    return path[len("payload."):] if path.startswith("payload.") else path


def target_schema_version(schema: dict[str, Any]) -> str | None:
    version = schema.get("properties", {}).get("schema_version", {}).get("const")
    return str(version) if version is not None else None


def validate_projection(
    value: dict[str, Any],
    *,
    source: dict[str, Any] | None = None,
    source_digest: str | None = None,
    target_schema: dict[str, Any] | None = None,
    target_schema_digest: str | None = None,
    target_validator_path: Path | None = None,
) -> list[str]:
    errors: list[str] = []
    if source is None or source_digest is None:
        errors.append("projection validation requires canonical source bytes and declared RFC 8785 digest")
    if target_schema is None or target_schema_digest is None:
        errors.append("projection validation requires target schema bytes and SHA-256 digest")
    forbidden = nested_forbidden_keys(
        value.get("payload"),
        {"mutable_run_state", "runtime_state", "state_journal", "current_emotion"},
    )
    if forbidden:
        errors.append(f"projection payload contains mutable runtime fields: {sorted(forbidden)}")
    privacy = value.get("source_privacy", {})
    if not privacy.get("permitted_consumer"):
        errors.append("target consumer is not permitted by source privacy")
    if privacy.get("classification") in {"CONFIDENTIAL", "RESTRICTED"}:
        if not privacy.get("destination") or not privacy.get("transfer_authorized"):
            errors.append("sensitive projection lacks authorized destination")
    if value.get("source_persona_status") in {"MIXED", "SYNTHETIC_HYPOTHESIS"} and not value.get("synthetic_disclosure"):
        errors.append("synthetic persona status is not disclosed")
    if value.get("immutable") is not True or value.get("mutable_state_owner") != "simulation-run":
        errors.append("projection does not preserve immutable canonical state")
    if source is not None and source_digest is not None:
        source_errors = validate_schema(source, PERSONA_SCHEMA) + validate_persona(source)
        errors.extend(f"canonical source invalid: {error}" for error in source_errors)
        try:
            recomputed = canonical_digest(source)
            if source_digest != recomputed:
                errors.append("declared source digest does not match RFC 8785 canonical source bytes")
            if value.get("source_persona_sha256") != recomputed:
                errors.append("projection source_persona_sha256 does not match canonical source bytes")
        except (OSError, ValueError, json.JSONDecodeError) as error:
            errors.append(str(error))
        for field, source_field in (
            ("source_persona_id", "persona_id"),
            ("source_persona_version", "version"),
            ("source_persona_status", "status"),
        ):
            if value.get(field) != source.get(source_field):
                errors.append(f"projection {field} does not match canonical source")

        claims = {
            claim.get("claim_id"): claim
            for claim in source.get("claims", [])
            if isinstance(claim, dict) and claim.get("claim_id")
        }
        target_paths: list[str] = []
        structural_roots = {"schema_version", "persona_id", "version", "status", "purpose", "population_scope", "sources"}
        policy_roots = {"permitted_uses", "prohibited_uses", "privacy", "uncertainty", "invalidation_rules", "contradictions"}
        claim_roots = {"claims", "stable_profile", "dynamic_model"}
        validation_kind = value.get("validation", {}).get("validation_kind")
        prohibited_pointers = source.get("privacy", {}).get("prohibited_fields", [])
        for mapping in value.get("field_mappings", []):
            target_path = projection_target_path(mapping.get("target_path", ""))
            target_paths.append(target_path)
            try:
                source_value = resolve_path(source, mapping.get("source_path", ""))
            except KeyError:
                errors.append(f"projection mapping source_path is absent: {mapping.get('source_path')}")
                continue
            source_root = mapping.get("source_path", "").split(".", 1)[0]
            try:
                intersections = source_path_intersects_prohibition(
                    mapping.get("source_path", ""),
                    prohibited_pointers,
                )
            except ValueError as error:
                errors.append(str(error))
                intersections = []
            if intersections:
                errors.append(
                    f"projection maps prohibited source paths {intersections}: {mapping.get('source_path')}"
                )
            basis = mapping.get("evidence_basis")
            mapping_ids = set(mapping.get("claim_ids", []))
            mapping_types = set(mapping.get("claim_types", []))
            if basis == "CLAIMS":
                if source_root not in claim_roots:
                    errors.append(f"CLAIMS mapping uses a non-claim source root: {mapping.get('source_path')}")
                unknown = mapping_ids - set(claims)
                if unknown:
                    errors.append(f"projection mapping has unknown claim_ids: {sorted(unknown)}")
                grounded_ids = nested_claim_ids(source_value)
                if not grounded_ids or mapping_ids != grounded_ids:
                    errors.append(
                        f"projection mapping claim_ids do not exactly cover source_path: {mapping.get('source_path')}"
                    )
                actual_types = {claims[claim_id].get("claim_type") for claim_id in mapping_ids if claim_id in claims}
                if mapping_types != actual_types:
                    errors.append(f"projection mapping claim_types drifted: {mapping.get('target_path')}")
            elif basis == "STRUCTURAL":
                if source_root not in structural_roots or mapping_ids or mapping_types:
                    errors.append(f"STRUCTURAL mapping has an invalid source or claim payload: {mapping.get('source_path')}")
            elif basis == "POLICY":
                if source_root not in policy_roots or mapping_ids or mapping_types:
                    errors.append(f"POLICY mapping has an invalid source or claim payload: {mapping.get('source_path')}")
            else:
                errors.append(f"projection mapping evidence_basis is invalid: {basis}")
            try:
                target_value = resolve_path(value.get("payload", {}), target_path)
            except KeyError:
                errors.append(f"projection mapping target_path is absent: {mapping.get('target_path')}")
            else:
                if validation_kind == "DECLARATIVE_MAPPING" and isinstance(target_value, (dict, list)):
                    errors.append(
                        f"declarative projection mapping must trace collection members individually: {mapping.get('target_path')}"
                    )
        if duplicates(target_paths):
            errors.append(f"projection has duplicate target paths: {sorted(duplicates(target_paths))}")
        for index, left in enumerate(target_paths):
            for right in target_paths[index + 1:]:
                if left.startswith(f"{right}.") or right.startswith(f"{left}."):
                    errors.append(f"projection has overlapping target paths: {left}, {right}")
        payload_paths = payload_terminal_paths(value.get("payload", {}))
        uncovered = sorted(
            path
            for path in payload_paths
            if not any(
                path == mapped
                or (
                    validation_kind == "DETERMINISTIC_SIMULATION_COMPILER"
                    and path.startswith(f"{mapped}.")
                )
                for mapped in target_paths
            )
        )
        if uncovered:
            errors.append(f"projection payload paths lack declared lineage: {uncovered}")

        canonical_privacy = source.get("privacy", {})
        if privacy.get("classification") != canonical_privacy.get("classification"):
            errors.append("projection privacy classification does not match canonical source")
        consumer_allowed = value.get("target_consumer") in canonical_privacy.get("allowed_consumers", [])
        if privacy.get("permitted_consumer") is not consumer_allowed or not consumer_allowed:
            errors.append("projection consumer permission does not match canonical source")
        destination = privacy.get("destination")
        if destination not in canonical_privacy.get("allowed_destinations", []):
            errors.append("projection destination is not allowed by canonical source")
        missing_omissions = set(canonical_privacy.get("prohibited_fields", [])) - set(
            privacy.get("omitted_sensitive_fields", [])
        )
        if missing_omissions:
            errors.append(f"projection does not record omitted prohibited fields: {sorted(missing_omissions)}")
        try:
            prohibited_leaf_names = {
                json_pointer_components(pointer)[-1]
                for pointer in canonical_privacy.get("prohibited_fields", [])
                if json_pointer_components(pointer)
            }
        except ValueError as error:
            errors.append(str(error))
            prohibited_leaf_names = set()
        leaked_prohibited = nested_forbidden_keys(value.get("payload"), prohibited_leaf_names)
        if leaked_prohibited:
            errors.append(f"projection payload contains prohibited fields: {sorted(leaked_prohibited)}")
        omission_ledger = {
            item.get("field")
            for item in value.get("omitted_fields", [])
            if isinstance(item, dict)
        }
        missing_ledger = set(canonical_privacy.get("prohibited_fields", [])) - omission_ledger
        if missing_ledger:
            errors.append(f"projection omission ledger lacks prohibited fields: {sorted(missing_ledger)}")

    if target_schema is not None and target_schema_digest is not None:
        target = value.get("target_schema", {})
        if target.get("sha256") != target_schema_digest:
            errors.append("projection target schema digest does not match supplied schema bytes")
        if target.get("id") != target_schema.get("$id"):
            errors.append("projection target schema ID does not match supplied schema")
        if target.get("version") != target_schema_version(target_schema):
            errors.append("projection target schema version does not match supplied schema")
        try:
            from jsonschema import Draft202012Validator

            payload_errors = sorted(
                Draft202012Validator(target_schema).iter_errors(value.get("payload")),
                key=lambda item: list(item.path),
            )
            errors.extend(f"projection payload target-schema failure: {error.message}" for error in payload_errors)
        except ImportError:
            errors.append("jsonschema dependency unavailable; run through uv --offline --with jsonschema")
    validation = value.get("validation", {})
    if source_digest is not None and validation.get("source_persona_sha256") != source_digest:
        errors.append("projection validation receipt source digest mismatch")
    if target_schema_digest is not None and validation.get("target_schema_sha256") != target_schema_digest:
        errors.append("projection validation receipt target-schema digest mismatch")
    try:
        if validation.get("payload_sha256") != canonical_digest(value.get("payload", {})):
            errors.append("projection validation receipt payload digest mismatch")
        kind = validation.get("validation_kind")
        expected_validation = projection_validation_receipt(
            value.get("payload", {}),
            field_mappings=value.get("field_mappings", []),
            source_digest=source_digest or "",
            target_schema_digest=target_schema_digest or "",
            validation_kind=kind,
            target_validator_path=target_validator_path,
        )
        if validation != expected_validation:
            errors.append("projection validation receipt is not the canonical validator-bound receipt")
        if kind == "DETERMINISTIC_SIMULATION_COMPILER":
            if value.get("target_consumer") != "simulation" or source is None:
                errors.append("deterministic simulation validation requires a simulation target and canonical source")
            else:
                from compile_simulation_persona import (
                    compile_persona,
                    installed_simulation_dependency,
                    simulation_field_mappings,
                )

                expected_payload = compile_persona(
                    source,
                    destination=value.get("source_privacy", {}).get("destination"),
                    transfer_authorized=value.get("source_privacy", {}).get("transfer_authorized") is True,
                )
                if canonical_digest(expected_payload) != canonical_digest(value.get("payload", {})):
                    errors.append("projection payload does not match the deterministic simulation compiler output")
                expected_mappings = simulation_field_mappings(source)
                if value.get("field_mappings") != expected_mappings:
                    errors.append("projection field_mappings do not match the deterministic compiler mapping table")

                simulation_root, _ = installed_simulation_dependency()
                trusted_schema = simulation_root / "skills" / "simulation-persona" / "references" / "persona.schema.json"
                trusted_validator = simulation_root / "skills" / "simulation-persona" / "scripts" / "validate_persona.py"
                if target_schema_digest != file_digest(trusted_schema):
                    errors.append("deterministic projection target schema is not the enabled Simulations schema")
                if target_validator_path is None or target_validator_path.resolve() != trusted_validator.resolve():
                    errors.append("deterministic projection target validator is not the enabled Simulations validator")
                else:
                    spec = importlib.util.spec_from_file_location(
                        "cascade_simulations_projection_validator",
                        target_validator_path,
                    )
                    if spec is None or spec.loader is None:
                        errors.append("deterministic projection target validator cannot be loaded")
                    else:
                        module = importlib.util.module_from_spec(spec)
                        try:
                            spec.loader.exec_module(module)
                            module.validate_cross_fields(value.get("payload", {}))
                        except SystemExit as error:
                            errors.append(f"deterministic projection target validator dependency unavailable: {error}")
                        except Exception as error:
                            if error.__class__.__module__ == module.__name__:
                                errors.append(f"deterministic projection target semantic validation failed: {error}")
                            else:
                                raise
    except (OSError, ValueError, KeyError, TypeError, RuntimeError) as error:
        errors.append(f"projection validation receipt cannot be verified: {error}")
    return sorted(set(errors))


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
    for field in ("producer", "consumer"):
        if not isinstance(value.get(field), str) or PLUGIN_ALIAS.fullmatch(value[field]) is None:
            errors.append(f"handoff {field} must be an exact cascade plugin skill alias")
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
    if failure.get("classification") != "NONE" and (not resume.get("owner") or not resume.get("next_action")):
        errors.append("failed handoff lacks closed resume ownership")
    if failure.get("classification") != "NONE":
        has_artifact = isinstance(resume.get("required_artifact"), str) and bool(resume["required_artifact"])
        has_not_applicable = isinstance(resume.get("not_applicable_reason"), str) and bool(resume["not_applicable_reason"])
        if has_artifact == has_not_applicable:
            errors.append("failed handoff resume must provide exactly one required_artifact or not_applicable_reason")
        if failure.get("classification") in {"MISSING_INPUT", "CONFLICT", "STALE", "SCHEMA_MISMATCH", "PERMISSION_DENIED"} and not has_artifact:
            errors.append(f"{failure.get('classification')} handoff must name the required artifact")
    if status == "PASS" and (
        not closure.get("requires_acknowledgment")
        or not closure.get("acknowledged")
        or not closure.get("acknowledgment_id")
    ):
        errors.append("PASS handoff lacks acknowledgment closure")
    return sorted(set(errors))


VALIDATORS = {
    "persona": validate_persona,
    "projection": validate_projection,
    "handoff": validate_handoff,
}


def validate_schema(value: Any, schema_path: Path) -> list[str]:
    try:
        from jsonschema import Draft202012Validator, FormatChecker
    except ImportError:
        return ["jsonschema dependency unavailable; run through uv --offline --with jsonschema"]
    schema = strict_json_file(schema_path)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    return [error.message for error in sorted(validator.iter_errors(value), key=lambda item: list(item.path))]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("kind", choices=sorted(VALIDATORS))
    parser.add_argument("artifact", type=Path)
    parser.add_argument("--schema", type=Path, required=True)
    parser.add_argument("--source-persona", type=Path)
    parser.add_argument("--source-digest")
    parser.add_argument("--target-schema", type=Path)
    parser.add_argument("--target-validator", type=Path)
    args = parser.parse_args(argv)
    try:
        value = strict_json_file(args.artifact)
        errors = validate_schema(value, args.schema)
        if not errors:
            if args.kind == "projection":
                source = strict_json_file(args.source_persona) if args.source_persona else None
                target_schema = strict_json_file(args.target_schema) if args.target_schema else None
                target_digest = hashlib.sha256(args.target_schema.read_bytes()).hexdigest() if args.target_schema else None
                errors = validate_projection(
                    value,
                    source=source,
                    source_digest=args.source_digest,
                    target_schema=target_schema,
                    target_schema_digest=target_digest,
                    target_validator_path=args.target_validator,
                )
            else:
                errors = VALIDATORS[args.kind](value)
        result = {"status": "PASS" if not errors else "INVALID", "kind": args.kind, "errors": errors}
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0 if not errors else 2
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(json.dumps({"status": "INVALID", "kind": args.kind, "errors": [str(error)]}, indent=2, sort_keys=True))
        return 2


if __name__ == "__main__":
    sys.exit(main())
