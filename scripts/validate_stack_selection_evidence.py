#!/usr/bin/env python3
"""Validate a project stack-selection evidence record and its references."""

from __future__ import annotations

import argparse
import json
import re
import tempfile
from pathlib import Path
from typing import Any


STABLE_ID = re.compile(r"^[a-z][a-z0-9-]*$")
CLAIM_ID = re.compile(r"^SC-[0-9]{3,}$")
POLICY_ID = re.compile(r"^SP-[0-9]{3,}$")
SOURCE_KINDS = {
    "project-description",
    "product-requirement",
    "architecture-note",
    "policy",
    "operations",
    "existing-code",
    "human-decision",
}
CLAIM_CLASSES = {
    "product-capability",
    "interface-rendering",
    "workload-performance",
    "data-consistency",
    "realtime",
    "platform-device",
    "distribution",
    "operations",
    "team-lifecycle",
    "security-compliance",
}
CLAIM_STATUSES = {"EXPLICIT", "INFERRED", "UNKNOWN", "CONFLICTING"}
CONFIDENCE = {"HIGH", "MEDIUM", "LOW"}
POLICY_MODES = {"REQUIRED", "PREFERRED", "FORBIDDEN", "PROOF_REQUIRED"}
APP_TYPES = {
    "backend-service",
    "backend-worker",
    "web-frontend",
    "native-app",
    "cli",
    "experiment",
    "library",
}
CANDIDATE_STATUSES = {"ELIGIBLE", "REJECTED", "PROOF_REQUIRED", "GAP"}
POLICY_OUTCOMES = {
    "SATISFIED",
    "VIOLATED",
    "NOT_APPLICABLE",
    "PROOF_PENDING",
}
INFRASTRUCTURE_RESOURCE_KINDS = {
    "compute",
    "data",
    "cache",
    "messaging",
    "network-edge",
    "delivery",
    "secrets",
    "observability",
    "artifact-storage",
}
LIBRARY_UNIT_PROFILE = {
    "archetype_id": "sdk-library",
    "stack_extension_id": "library-stack",
    "infrastructure_profile_id": "library-infrastructure",
}
LIBRARY_CANDIDATE_FAMILIES = {
    "generated-api-sdk",
    "hand-authored-sdk",
    "internal-library",
    "public-library",
    "platform-sdk",
    "wasm-ffi-binary-binding",
}
LIBRARY_RESOURCE_ROLES_BY_KIND = {
    "compute": {
        "build",
        "generation",
        "contract-test",
        "documentation-build",
        "signing",
    },
    "network-edge": {"documentation", "release"},
    "delivery": {
        "package-registry",
        "artifact",
        "signing",
        "provenance",
        "documentation",
        "release",
        "browser-bundle",
    },
    "secrets": {"signing"},
    "observability": {"release-observability"},
    "artifact-storage": {
        "artifact",
        "provenance",
        "documentation",
        "browser-bundle",
    },
}
LIBRARY_RESOURCE_LIFECYCLES_BY_KIND = {
    "compute": {
        "bounded-build",
        "bounded-generation",
        "bounded-test",
        "bounded-documentation",
        "bounded-signing",
    },
    "network-edge": {"distribution-resource", "external-managed"},
    "delivery": {"distribution-resource", "external-managed"},
    "secrets": {"distribution-resource", "external-managed"},
    "observability": {"distribution-resource", "external-managed"},
    "artifact-storage": {"distribution-resource", "external-managed"},
}
SENSITIVE_TEXT_PATTERNS = (
    (
        re.compile(
            r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
            re.IGNORECASE,
        ),
        "private-key material",
    ),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "cloud access key"),
    (
        re.compile(
            r"\b(?:api[_-]?key|client[_-]?secret|password|"
            r"access[_-]?token|refresh[_-]?token)\s*[:=]\s*"
            r"[^\s,;]{6,}",
            re.IGNORECASE,
        ),
        "credential assignment",
    ),
    (
        re.compile(
            r"\bauthorization\s*:\s*bearer\s+\S{8,}",
            re.IGNORECASE,
        ),
        "bearer credential",
    ),
)


class EvidenceError(RuntimeError):
    """Raised for invalid stack-selection evidence."""


def require_mapping(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise EvidenceError(f"{label} must be an object")
    return value


def require_list(value: Any, label: str) -> list[Any]:
    if not isinstance(value, list):
        raise EvidenceError(f"{label} must be an array")
    return value


def require_string(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise EvidenceError(f"{label} must be a non-empty string")
    for pattern, description in SENSITIVE_TEXT_PATTERNS:
        if pattern.search(value):
            raise EvidenceError(
                f"{label} contains prohibited {description}; use a redacted "
                "reference, identifier, or digest"
            )
    return value


def validate_no_sensitive_text(value: Any, label: str) -> None:
    if isinstance(value, dict):
        for key, nested in value.items():
            validate_no_sensitive_text(nested, f"{label}.{key}")
        return
    if isinstance(value, list):
        for index, nested in enumerate(value):
            validate_no_sensitive_text(nested, f"{label}[{index}]")
        return
    if isinstance(value, str):
        for pattern, description in SENSITIVE_TEXT_PATTERNS:
            if pattern.search(value):
                raise EvidenceError(
                    f"{label} contains prohibited {description}; use a "
                    "redacted reference, identifier, or digest"
                )


def require_string_list(value: Any, label: str) -> list[str]:
    items = require_list(value, label)
    if not all(isinstance(item, str) and item for item in items):
        raise EvidenceError(f"{label} must contain only non-empty strings")
    return items


def unique_records(
    records: list[Any],
    id_field: str,
    label: str,
    pattern: re.Pattern[str] | None = None,
) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for index, raw_record in enumerate(records):
        record = require_mapping(raw_record, f"{label}[{index}]")
        record_id = require_string(record.get(id_field), f"{label}[{index}].{id_field}")
        if pattern is not None and not pattern.fullmatch(record_id):
            raise EvidenceError(f"{label}[{index}].{id_field} has invalid format")
        if record_id in result:
            raise EvidenceError(f"duplicate {label} ID: {record_id}")
        result[record_id] = record
    return result


def require_references(
    references: list[str],
    known: set[str],
    label: str,
) -> None:
    unknown = sorted(set(references) - known)
    if unknown:
        raise EvidenceError(f"{label} references unknown IDs: {', '.join(unknown)}")


def validate_candidate_policy_outcomes(
    *,
    candidate_id: str,
    status: str,
    candidate_claims: list[str],
    policy_evaluation_value: Any,
    allowed_policy_ids: set[str],
    claims: dict[str, dict[str, Any]],
    policies: dict[str, dict[str, Any]],
) -> None:
    policy_evaluations = unique_records(
        require_list(
            policy_evaluation_value,
            f"candidate.{candidate_id}.policy_evaluations",
        ),
        "policy_id",
        f"candidate.{candidate_id}.policy_evaluations",
        POLICY_ID,
    )
    require_references(
        list(policy_evaluations),
        allowed_policy_ids,
        f"candidate.{candidate_id}.policy_evaluations",
    )
    missing_policy_ids = sorted(allowed_policy_ids - set(policy_evaluations))
    if missing_policy_ids:
        raise EvidenceError(
            f"candidate.{candidate_id}.policy_evaluations missing policies: "
            f"{', '.join(missing_policy_ids)}"
        )

    hard_violation = False
    proof_pending = False
    for policy_id, evaluation in policy_evaluations.items():
        outcome = require_string(
            evaluation.get("outcome"),
            f"candidate.{candidate_id}.policy_evaluations.{policy_id}.outcome",
        )
        if outcome not in POLICY_OUTCOMES:
            raise EvidenceError(
                f"candidate.{candidate_id}.policy_evaluations."
                f"{policy_id}.outcome is invalid"
            )
        mode = policies[policy_id]["mode"]
        if mode in {"REQUIRED", "FORBIDDEN"}:
            if outcome == "VIOLATED":
                hard_violation = True
            elif outcome != "SATISFIED":
                raise EvidenceError(
                    f"candidate.{candidate_id} hard policy {policy_id} "
                    "must be SATISFIED or VIOLATED"
                )
        if mode == "PROOF_REQUIRED":
            if outcome == "PROOF_PENDING":
                proof_pending = True
            elif outcome == "SATISFIED":
                require_string(
                    evaluation.get("evidence"),
                    f"candidate.{candidate_id}.policy_evaluations."
                    f"{policy_id}.evidence",
                )
            else:
                raise EvidenceError(
                    f"candidate.{candidate_id} proof policy {policy_id} "
                    "must be SATISFIED or PROOF_PENDING"
                )

    unresolved_claims = sorted(
        claim_id
        for claim_id in candidate_claims
        if claims[claim_id]["status"] in {"UNKNOWN", "CONFLICTING"}
    )
    if unresolved_claims and status != "GAP":
        raise EvidenceError(
            f"candidate.{candidate_id} has unresolved claims "
            f"{', '.join(unresolved_claims)} and must be GAP"
        )
    if not unresolved_claims and hard_violation and status != "REJECTED":
        raise EvidenceError(
            f"candidate.{candidate_id} violates a hard policy and must be REJECTED"
        )
    if (
        not unresolved_claims
        and not hard_violation
        and proof_pending
        and status != "PROOF_REQUIRED"
    ):
        raise EvidenceError(
            f"candidate.{candidate_id} has pending proof and must be PROOF_REQUIRED"
        )
    if status == "ELIGIBLE" and (
        hard_violation or proof_pending or unresolved_claims
    ):
        raise EvidenceError(
            f"candidate.{candidate_id} is not eligible from its claims "
            "and policy evaluations"
        )


def validate_evidence(data: Any) -> dict[str, int]:
    validate_no_sensitive_text(data, "evidence")
    root = require_mapping(data, "evidence")
    if root.get("schema_version") != "stack-selection-evidence.v1":
        raise EvidenceError("schema_version must be stack-selection-evidence.v1")
    require_string(root.get("project_id"), "project_id")

    sources = unique_records(
        require_list(root.get("sources"), "sources"),
        "source_id",
        "sources",
        STABLE_ID,
    )
    claims = unique_records(
        require_list(root.get("claims"), "claims"),
        "claim_id",
        "claims",
        CLAIM_ID,
    )
    policies = unique_records(
        require_list(root.get("policies"), "policies"),
        "policy_id",
        "policies",
        POLICY_ID,
    )
    units = unique_records(
        require_list(root.get("application_units"), "application_units"),
        "unit_id",
        "application_units",
        STABLE_ID,
    )
    if not units:
        raise EvidenceError("application_units must not be empty")

    source_ids = set(sources)
    claim_ids = set(claims)
    policy_ids = set(policies)
    unit_ids = set(units)

    for source_id, source in sources.items():
        require_string(source.get("path"), f"sources.{source_id}.path")
        source_kind = require_string(source.get("kind"), f"sources.{source_id}.kind")
        if source_kind not in SOURCE_KINDS:
            raise EvidenceError(f"sources.{source_id}.kind is invalid")

    for claim_id, claim in claims.items():
        source_id = require_string(claim.get("source_id"), f"claims.{claim_id}.source_id")
        require_references([source_id], source_ids, f"claims.{claim_id}.source_id")
        require_string(claim.get("source_anchor"), f"claims.{claim_id}.source_anchor")
        require_string(claim.get("statement"), f"claims.{claim_id}.statement")
        claim_class = require_string(
            claim.get("claim_class"),
            f"claims.{claim_id}.claim_class",
        )
        if claim_class not in CLAIM_CLASSES:
            raise EvidenceError(f"claims.{claim_id}.claim_class is invalid")
        status = require_string(claim.get("status"), f"claims.{claim_id}.status")
        if status not in CLAIM_STATUSES:
            raise EvidenceError(f"claims.{claim_id}.status is invalid")
        confidence = require_string(
            claim.get("confidence"),
            f"claims.{claim_id}.confidence",
        )
        if confidence not in CONFIDENCE:
            raise EvidenceError(f"claims.{claim_id}.confidence is invalid")
        affected_units = require_string_list(
            claim.get("application_units"),
            f"claims.{claim_id}.application_units",
        )
        require_references(
            affected_units,
            unit_ids,
            f"claims.{claim_id}.application_units",
        )

    for policy_id, policy in policies.items():
        policy_sources = require_string_list(
            policy.get("source_ids"),
            f"policies.{policy_id}.source_ids",
        )
        if not policy_sources:
            raise EvidenceError(f"policies.{policy_id}.source_ids must not be empty")
        require_references(
            policy_sources,
            source_ids,
            f"policies.{policy_id}.source_ids",
        )
        mode = require_string(policy.get("mode"), f"policies.{policy_id}.mode")
        if mode not in POLICY_MODES:
            raise EvidenceError(f"policies.{policy_id}.mode is invalid")
        require_string(policy.get("predicate"), f"policies.{policy_id}.predicate")
        require_string(policy.get("consequence"), f"policies.{policy_id}.consequence")

    for unit_id, unit in units.items():
        app_type = require_string(
            unit.get("app_type"),
            f"application_units.{unit_id}.app_type",
        )
        if app_type not in APP_TYPES:
            raise EvidenceError(f"application_units.{unit_id}.app_type is invalid")
        if app_type == "library":
            for field, expected in LIBRARY_UNIT_PROFILE.items():
                actual = require_string(
                    unit.get(field),
                    f"application_units.{unit_id}.{field}",
                )
                if actual != expected:
                    raise EvidenceError(
                        f"application_units.{unit_id}.{field} must be "
                        f"{expected} for app_type library"
                    )
        unit_claims = require_string_list(
            unit.get("claim_ids"),
            f"application_units.{unit_id}.claim_ids",
        )
        unit_policies = require_string_list(
            unit.get("policy_ids"),
            f"application_units.{unit_id}.policy_ids",
        )
        require_references(
            unit_claims,
            claim_ids,
            f"application_units.{unit_id}.claim_ids",
        )
        require_references(
            unit_policies,
            policy_ids,
            f"application_units.{unit_id}.policy_ids",
        )
        for claim_id in unit_claims:
            claim_units = claims[claim_id].get("application_units", [])
            if unit_id not in claim_units:
                raise EvidenceError(
                    f"application_units.{unit_id} uses {claim_id}, but the claim "
                    "does not include that unit"
                )

    infrastructure_scopes = unique_records(
        require_list(
            root.get("infrastructure_scopes", []),
            "infrastructure_scopes",
        ),
        "scope_id",
        "infrastructure_scopes",
        STABLE_ID,
    )
    scope_ids = set(infrastructure_scopes)
    for scope_id, scope in infrastructure_scopes.items():
        require_string(
            scope.get("environment"),
            f"infrastructure_scopes.{scope_id}.environment",
        )
        if "regions" in scope:
            require_string_list(
                scope.get("regions"),
                f"infrastructure_scopes.{scope_id}.regions",
            )
        scope_units = require_string_list(
            scope.get("application_units"),
            f"infrastructure_scopes.{scope_id}.application_units",
        )
        if not scope_units:
            raise EvidenceError(
                f"infrastructure_scopes.{scope_id}.application_units "
                "must not be empty"
            )
        require_references(
            scope_units,
            unit_ids,
            f"infrastructure_scopes.{scope_id}.application_units",
        )
        scope_claims = require_string_list(
            scope.get("claim_ids"),
            f"infrastructure_scopes.{scope_id}.claim_ids",
        )
        scope_policies = require_string_list(
            scope.get("policy_ids"),
            f"infrastructure_scopes.{scope_id}.policy_ids",
        )
        require_references(
            scope_claims,
            claim_ids,
            f"infrastructure_scopes.{scope_id}.claim_ids",
        )
        require_references(
            scope_policies,
            policy_ids,
            f"infrastructure_scopes.{scope_id}.policy_ids",
        )
        for claim_id in scope_claims:
            claim_units = set(claims[claim_id].get("application_units", []))
            if not claim_units.intersection(scope_units):
                raise EvidenceError(
                    f"infrastructure_scopes.{scope_id} uses {claim_id}, but "
                    "the claim does not include a consuming application unit"
                )

    infrastructure_resources = unique_records(
        require_list(
            root.get("infrastructure_resources", []),
            "infrastructure_resources",
        ),
        "resource_id",
        "infrastructure_resources",
        STABLE_ID,
    )
    resource_ids = set(infrastructure_resources)
    for resource_id, resource in infrastructure_resources.items():
        scope_id = require_string(
            resource.get("scope_id"),
            f"infrastructure_resources.{resource_id}.scope_id",
        )
        require_references(
            [scope_id],
            scope_ids,
            f"infrastructure_resources.{resource_id}.scope_id",
        )
        resource_kind = require_string(
            resource.get("resource_kind"),
            f"infrastructure_resources.{resource_id}.resource_kind",
        )
        if resource_kind not in INFRASTRUCTURE_RESOURCE_KINDS:
            raise EvidenceError(
                f"infrastructure_resources.{resource_id}.resource_kind is invalid"
            )
        require_string(
            resource.get("owner"),
            f"infrastructure_resources.{resource_id}.owner",
        )
        lifecycle = require_string(
            resource.get("lifecycle"),
            f"infrastructure_resources.{resource_id}.lifecycle",
        )
        resource_units = require_string_list(
            resource.get("application_units"),
            f"infrastructure_resources.{resource_id}.application_units",
        )
        if not resource_units:
            raise EvidenceError(
                f"infrastructure_resources.{resource_id}.application_units "
                "must not be empty"
            )
        require_references(
            resource_units,
            set(infrastructure_scopes[scope_id]["application_units"]),
            f"infrastructure_resources.{resource_id}.application_units",
        )
        library_consumers = {
            unit_id
            for unit_id in resource_units
            if units[unit_id]["app_type"] == "library"
        }
        if library_consumers:
            resource_role = require_string(
                resource.get("resource_role"),
                f"infrastructure_resources.{resource_id}.resource_role",
            )
            allowed_roles = LIBRARY_RESOURCE_ROLES_BY_KIND.get(resource_kind)
            if allowed_roles is None or resource_role not in allowed_roles:
                raise EvidenceError(
                    f"infrastructure_resources.{resource_id} gives library "
                    f"units {', '.join(sorted(library_consumers))} prohibited "
                    f"{resource_kind}/{resource_role} ownership"
                )
            allowed_lifecycles = LIBRARY_RESOURCE_LIFECYCLES_BY_KIND.get(
                resource_kind
            )
            if (
                allowed_lifecycles is None
                or lifecycle not in allowed_lifecycles
            ):
                raise EvidenceError(
                    f"infrastructure_resources.{resource_id} gives library "
                    f"units {', '.join(sorted(library_consumers))} prohibited "
                    f"{resource_kind}/{resource_role}/{lifecycle} lifecycle"
                )
            require_string(
                resource.get("teardown"),
                f"infrastructure_resources.{resource_id}.teardown",
            )
        resource_claims = require_string_list(
            resource.get("claim_ids"),
            f"infrastructure_resources.{resource_id}.claim_ids",
        )
        resource_policies = require_string_list(
            resource.get("policy_ids"),
            f"infrastructure_resources.{resource_id}.policy_ids",
        )
        require_references(
            resource_claims,
            set(infrastructure_scopes[scope_id]["claim_ids"]),
            f"infrastructure_resources.{resource_id}.claim_ids",
        )
        require_references(
            resource_policies,
            set(infrastructure_scopes[scope_id]["policy_ids"]),
            f"infrastructure_resources.{resource_id}.policy_ids",
        )

    candidate_count = 0
    infrastructure_candidate_count = 0
    selection = root.get("selection")
    if selection is not None:
        selection_record = require_mapping(selection, "selection")
        candidate_records = require_list(
            selection_record.get("candidate_results"),
            "selection.candidate_results",
        )
        candidate_count = len(candidate_records)
        candidates_by_unit: dict[str, dict[str, dict[str, Any]]] = {}
        for index, raw_candidate in enumerate(candidate_records):
            candidate = require_mapping(
                raw_candidate,
                f"selection.candidate_results[{index}]",
            )
            candidate_id = require_string(
                candidate.get("candidate_id"),
                f"selection.candidate_results[{index}].candidate_id",
            )
            unit_id = require_string(
                candidate.get("unit_id"),
                f"candidate.{candidate_id}.unit_id",
            )
            require_references(
                [unit_id],
                unit_ids,
                f"candidate.{candidate_id}.unit_id",
            )
            if units[unit_id]["app_type"] == "library":
                candidate_family = require_string(
                    candidate.get("candidate_family"),
                    f"candidate.{candidate_id}.candidate_family",
                )
                if candidate_family not in LIBRARY_CANDIDATE_FAMILIES:
                    raise EvidenceError(
                        f"candidate.{candidate_id}.candidate_family is not a "
                        "supported library-stack family"
                    )
            status = require_string(
                candidate.get("status"),
                f"candidate.{candidate_id}.status",
            )
            if status not in CANDIDATE_STATUSES:
                raise EvidenceError(f"candidate.{candidate_id}.status is invalid")
            if status == "PROOF_REQUIRED":
                require_string(
                    candidate.get("proof"),
                    f"candidate.{candidate_id}.proof",
                )
            if status in {"REJECTED", "GAP"}:
                require_string(
                    candidate.get("reason"),
                    f"candidate.{candidate_id}.reason",
                )
            candidate_claims = require_string_list(
                candidate.get("claim_ids"),
                f"candidate.{candidate_id}.claim_ids",
            )
            require_references(
                candidate_claims,
                set(units[unit_id]["claim_ids"]),
                f"candidate.{candidate_id}.claim_ids",
            )
            unit_policy_ids = set(units[unit_id]["policy_ids"])
            validate_candidate_policy_outcomes(
                candidate_id=candidate_id,
                status=status,
                candidate_claims=candidate_claims,
                policy_evaluation_value=candidate.get("policy_evaluations"),
                allowed_policy_ids=unit_policy_ids,
                claims=claims,
                policies=policies,
            )
            unit_candidates = candidates_by_unit.setdefault(unit_id, {})
            if candidate_id in unit_candidates:
                raise EvidenceError(
                    f"duplicate candidate for {unit_id}: {candidate_id}"
                )
            unit_candidates[candidate_id] = candidate

        selected = selection_record.get("selected_by_unit", {})
        selected_map = require_mapping(selected, "selection.selected_by_unit")
        for unit_id, candidate_id_value in selected_map.items():
            require_references([unit_id], unit_ids, "selection.selected_by_unit")
            candidate_id = require_string(
                candidate_id_value,
                f"selection.selected_by_unit.{unit_id}",
            )
            candidate = candidates_by_unit.get(unit_id, {}).get(candidate_id)
            if candidate is None:
                raise EvidenceError(
                    f"selected candidate {candidate_id} does not belong to {unit_id}"
                )
            if candidate.get("status") != "ELIGIBLE":
                raise EvidenceError(
                    f"selected candidate {candidate_id} must be ELIGIBLE"
                )

        infrastructure_candidate_records = require_list(
            selection_record.get("infrastructure_candidate_results", []),
            "selection.infrastructure_candidate_results",
        )
        infrastructure_candidate_count = len(infrastructure_candidate_records)
        candidates_by_resource: dict[str, dict[str, dict[str, Any]]] = {}
        for index, raw_candidate in enumerate(infrastructure_candidate_records):
            candidate = require_mapping(
                raw_candidate,
                f"selection.infrastructure_candidate_results[{index}]",
            )
            candidate_id = require_string(
                candidate.get("candidate_id"),
                "selection.infrastructure_candidate_results"
                f"[{index}].candidate_id",
            )
            resource_id = require_string(
                candidate.get("resource_id"),
                f"candidate.{candidate_id}.resource_id",
            )
            require_references(
                [resource_id],
                resource_ids,
                f"candidate.{candidate_id}.resource_id",
            )
            status = require_string(
                candidate.get("status"),
                f"candidate.{candidate_id}.status",
            )
            if status not in CANDIDATE_STATUSES:
                raise EvidenceError(f"candidate.{candidate_id}.status is invalid")
            if status == "PROOF_REQUIRED":
                require_string(
                    candidate.get("proof"),
                    f"candidate.{candidate_id}.proof",
                )
            if status in {"REJECTED", "GAP"}:
                require_string(
                    candidate.get("reason"),
                    f"candidate.{candidate_id}.reason",
                )
            candidate_claims = require_string_list(
                candidate.get("claim_ids"),
                f"candidate.{candidate_id}.claim_ids",
            )
            resource = infrastructure_resources[resource_id]
            require_references(
                candidate_claims,
                set(resource["claim_ids"]),
                f"candidate.{candidate_id}.claim_ids",
            )
            validate_candidate_policy_outcomes(
                candidate_id=candidate_id,
                status=status,
                candidate_claims=candidate_claims,
                policy_evaluation_value=candidate.get("policy_evaluations"),
                allowed_policy_ids=set(resource["policy_ids"]),
                claims=claims,
                policies=policies,
            )
            resource_candidates = candidates_by_resource.setdefault(
                resource_id,
                {},
            )
            if candidate_id in resource_candidates:
                raise EvidenceError(
                    f"duplicate candidate for {resource_id}: {candidate_id}"
                )
            resource_candidates[candidate_id] = candidate

        selected_resources = selection_record.get("selected_by_resource", {})
        selected_resource_map = require_mapping(
            selected_resources,
            "selection.selected_by_resource",
        )
        for resource_id, candidate_id_value in selected_resource_map.items():
            require_references(
                [resource_id],
                resource_ids,
                "selection.selected_by_resource",
            )
            candidate_id = require_string(
                candidate_id_value,
                f"selection.selected_by_resource.{resource_id}",
            )
            candidate = candidates_by_resource.get(resource_id, {}).get(candidate_id)
            if candidate is None:
                raise EvidenceError(
                    f"selected candidate {candidate_id} does not belong to "
                    f"{resource_id}"
                )
            if candidate.get("status") != "ELIGIBLE":
                raise EvidenceError(
                    f"selected candidate {candidate_id} must be ELIGIBLE"
                )

    return {
        "sources": len(sources),
        "claims": len(claims),
        "policies": len(policies),
        "application_units": len(units),
        "infrastructure_scopes": len(infrastructure_scopes),
        "infrastructure_resources": len(infrastructure_resources),
        "candidates": candidate_count,
        "infrastructure_candidates": infrastructure_candidate_count,
    }


def valid_fixture() -> dict[str, Any]:
    return {
        "schema_version": "stack-selection-evidence.v1",
        "project_id": "sample-project",
        "sources": [
            {
                "source_id": "project-brief",
                "path": "docs/product/requirements.md",
                "kind": "product-requirement",
            }
        ],
        "claims": [
            {
                "claim_id": "SC-001",
                "source_id": "project-brief",
                "source_anchor": "Public application",
                "statement": "The web application needs server-rendered public routes.",
                "claim_class": "interface-rendering",
                "status": "EXPLICIT",
                "confidence": "HIGH",
                "application_units": ["public-web"],
            },
            {
                "claim_id": "SC-002",
                "source_id": "project-brief",
                "source_anchor": "Availability",
                "statement": "The public application needs an operated production delivery path.",
                "claim_class": "operations",
                "status": "EXPLICIT",
                "confidence": "HIGH",
                "application_units": ["public-web"],
            }
        ],
        "policies": [
            {
                "policy_id": "SP-001",
                "source_ids": ["project-brief"],
                "mode": "REQUIRED",
                "predicate": "Supports server rendering.",
                "consequence": "Reject client-only profiles.",
            },
            {
                "policy_id": "SP-002",
                "source_ids": ["project-brief"],
                "mode": "REQUIRED",
                "predicate": "Has an owned production delivery and rollback path.",
                "consequence": "Reject unmanaged delivery candidates.",
            }
        ],
        "application_units": [
            {
                "unit_id": "public-web",
                "app_type": "web-frontend",
                "claim_ids": ["SC-001"],
                "policy_ids": ["SP-001"],
            }
        ],
        "infrastructure_scopes": [
            {
                "scope_id": "production",
                "environment": "production",
                "regions": ["primary"],
                "application_units": ["public-web"],
                "claim_ids": ["SC-002"],
                "policy_ids": ["SP-002"],
            }
        ],
        "infrastructure_resources": [
            {
                "resource_id": "web-delivery",
                "scope_id": "production",
                "resource_kind": "delivery",
                "application_units": ["public-web"],
                "claim_ids": ["SC-002"],
                "policy_ids": ["SP-002"],
                "owner": "platform-team",
                "lifecycle": "production",
            }
        ],
        "selection": {
            "candidate_results": [
                {
                    "candidate_id": "frontend-nextjs",
                    "unit_id": "public-web",
                    "status": "ELIGIBLE",
                    "claim_ids": ["SC-001"],
                    "policy_evaluations": [
                        {
                            "policy_id": "SP-001",
                            "outcome": "SATISFIED",
                        }
                    ],
                }
            ],
            "selected_by_unit": {
                "public-web": "frontend-nextjs"
            },
            "infrastructure_candidate_results": [
                {
                    "candidate_id": "managed-web-delivery",
                    "resource_id": "web-delivery",
                    "status": "ELIGIBLE",
                    "claim_ids": ["SC-002"],
                    "policy_evaluations": [
                        {
                            "policy_id": "SP-002",
                            "outcome": "SATISFIED",
                        }
                    ],
                }
            ],
            "selected_by_resource": {
                "web-delivery": "managed-web-delivery"
            },
        },
    }


def valid_library_fixture() -> dict[str, Any]:
    fixture = valid_fixture()
    fixture["claims"][0]["statement"] = (
        "The SDK is independently versioned and distributed to named consumers."
    )
    fixture["claims"][0]["application_units"] = ["client-sdk"]
    fixture["claims"][1]["statement"] = (
        "The SDK needs an operated package publication and rollback path."
    )
    fixture["claims"][1]["application_units"] = ["client-sdk"]
    fixture["application_units"][0] = {
        "unit_id": "client-sdk",
        "app_type": "library",
        "archetype_id": "sdk-library",
        "stack_extension_id": "library-stack",
        "infrastructure_profile_id": "library-infrastructure",
        "claim_ids": ["SC-001"],
        "policy_ids": ["SP-001"],
    }
    fixture["policies"][0]["predicate"] = (
        "Has a stable public package and compatibility contract."
    )
    fixture["policies"][0]["consequence"] = (
        "Reject package profiles without compatibility ownership."
    )
    fixture["policies"][1]["predicate"] = (
        "Has an owned package publication and rollback path."
    )
    fixture["policies"][1]["consequence"] = (
        "Reject unmanaged distribution candidates."
    )
    fixture["infrastructure_scopes"][0]["application_units"] = ["client-sdk"]
    fixture["infrastructure_resources"][0]["resource_id"] = (
        "package-distribution"
    )
    fixture["infrastructure_resources"][0]["application_units"] = [
        "client-sdk"
    ]
    fixture["infrastructure_resources"][0]["resource_role"] = (
        "package-registry"
    )
    fixture["infrastructure_resources"][0]["lifecycle"] = (
        "distribution-resource"
    )
    fixture["infrastructure_resources"][0]["teardown"] = (
        "Revoke publication access and retire the package channel."
    )
    fixture["selection"]["candidate_results"][0]["candidate_id"] = (
        "library-profile"
    )
    fixture["selection"]["candidate_results"][0]["unit_id"] = "client-sdk"
    fixture["selection"]["candidate_results"][0]["candidate_family"] = (
        "generated-api-sdk"
    )
    fixture["selection"]["selected_by_unit"] = {
        "client-sdk": "library-profile"
    }
    fixture["selection"]["infrastructure_candidate_results"][0][
        "candidate_id"
    ] = "managed-package-distribution"
    fixture["selection"]["infrastructure_candidate_results"][0][
        "resource_id"
    ] = "package-distribution"
    fixture["selection"]["selected_by_resource"] = {
        "package-distribution": "managed-package-distribution"
    }
    return fixture


def require_invalid_fixture(fixture: dict[str, Any], label: str) -> None:
    try:
        validate_evidence(fixture)
    except EvidenceError:
        return
    raise EvidenceError(f"self-test {label} guard did not fail")


def self_test() -> None:
    result = validate_evidence(valid_fixture())
    if result["candidates"] != 1:
        raise EvidenceError("self-test valid fixture count mismatch")
    if result["infrastructure_candidates"] != 1:
        raise EvidenceError("self-test infrastructure fixture count mismatch")
    library_result = validate_evidence(valid_library_fixture())
    if library_result["application_units"] != 1:
        raise EvidenceError("self-test library fixture count mismatch")
    invalid = valid_fixture()
    invalid["selection"]["candidate_results"][0]["claim_ids"] = ["SC-999"]
    try:
        validate_evidence(invalid)
    except EvidenceError:
        pass
    else:
        raise EvidenceError("self-test unknown-reference guard did not fail")

    invalid_policy = valid_fixture()
    invalid_policy["selection"]["candidate_results"][0][
        "policy_evaluations"
    ][0]["outcome"] = "VIOLATED"
    try:
        validate_evidence(invalid_policy)
    except EvidenceError:
        pass
    else:
        raise EvidenceError("self-test hard-policy status guard did not fail")

    invalid_proof = valid_fixture()
    invalid_proof["policies"].append(
        {
            "policy_id": "SP-003",
            "source_ids": ["project-brief"],
            "mode": "PROOF_REQUIRED",
            "predicate": "Runs on the selected deployment platform.",
            "consequence": "Hold adoption until the deployment proof passes.",
        }
    )
    invalid_proof["application_units"][0]["policy_ids"].append("SP-003")
    invalid_proof["selection"]["candidate_results"][0][
        "policy_evaluations"
    ].append(
        {
            "policy_id": "SP-003",
            "outcome": "PROOF_PENDING",
        }
    )
    try:
        validate_evidence(invalid_proof)
    except EvidenceError:
        pass
    else:
        raise EvidenceError("self-test proof-required status guard did not fail")

    invalid_claim = valid_fixture()
    invalid_claim["claims"][0]["status"] = "CONFLICTING"
    try:
        validate_evidence(invalid_claim)
    except EvidenceError:
        pass
    else:
        raise EvidenceError("self-test unresolved-claim status guard did not fail")

    invalid_resource = valid_fixture()
    invalid_resource["selection"]["infrastructure_candidate_results"][0][
        "resource_id"
    ] = "unknown-resource"
    try:
        validate_evidence(invalid_resource)
    except EvidenceError:
        pass
    else:
        raise EvidenceError(
            "self-test infrastructure resource reference guard did not fail"
        )

    invalid_consumers = valid_fixture()
    invalid_consumers["infrastructure_resources"][0]["application_units"] = []
    try:
        validate_evidence(invalid_consumers)
    except EvidenceError:
        pass
    else:
        raise EvidenceError(
            "self-test infrastructure consumer guard did not fail"
        )

    invalid_library_profile = valid_library_fixture()
    invalid_library_profile["application_units"][0]["archetype_id"] = (
        "web-frontend"
    )
    require_invalid_fixture(
        invalid_library_profile,
        "library archetype routing",
    )

    invalid_library_candidate = valid_library_fixture()
    invalid_library_candidate["selection"]["candidate_results"][0][
        "candidate_family"
    ] = "frontend-framework"
    require_invalid_fixture(
        invalid_library_candidate,
        "library candidate-family routing",
    )

    invalid_library_compute = valid_library_fixture()
    invalid_library_compute["infrastructure_resources"][0][
        "resource_kind"
    ] = "compute"
    invalid_library_compute["infrastructure_resources"][0][
        "resource_role"
    ] = "service-runtime"
    require_invalid_fixture(
        invalid_library_compute,
        "library hosted-runtime ownership",
    )

    invalid_library_lifecycle = valid_library_fixture()
    invalid_library_lifecycle["infrastructure_resources"][0][
        "resource_kind"
    ] = "compute"
    invalid_library_lifecycle["infrastructure_resources"][0][
        "resource_role"
    ] = "build"
    invalid_library_lifecycle["infrastructure_resources"][0][
        "lifecycle"
    ] = "24x7-production-service-runtime"
    require_invalid_fixture(
        invalid_library_lifecycle,
        "library contradictory compute lifecycle",
    )

    for prohibited_kind in ("data", "cache", "messaging"):
        invalid_library_resource = valid_library_fixture()
        invalid_library_resource["infrastructure_resources"][0][
            "resource_kind"
        ] = prohibited_kind
        invalid_library_resource["infrastructure_resources"][0][
            "resource_role"
        ] = "production-service"
        require_invalid_fixture(
            invalid_library_resource,
            f"library {prohibited_kind} ownership",
        )

    invalid_sensitive_evidence = valid_library_fixture()
    invalid_sensitive_evidence["claims"][0]["statement"] = (
        "api_key=secret-value"
    )
    require_invalid_fixture(
        invalid_sensitive_evidence,
        "sensitive evidence",
    )

    with tempfile.TemporaryDirectory(prefix="cascade-stack-evidence-") as temp:
        path = Path(temp) / "stack-selection.json"
        path.write_text(json.dumps(valid_fixture()), encoding="utf-8")
        validate_evidence(json.loads(path.read_text(encoding="utf-8")))
    print("stack_selection_evidence_self_test=PASS")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Validate source-linked stack claims, policies, units, and candidate results."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    validate_parser = subparsers.add_parser("validate")
    validate_parser.add_argument("path", type=Path)
    subparsers.add_parser("self-test")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        if args.command == "self-test":
            self_test()
            return 0
        data = json.loads(args.path.read_text(encoding="utf-8"))
        counts = validate_evidence(data)
        print(
            "stack_selection_evidence=PASS "
            + " ".join(f"{key}={value}" for key, value in counts.items())
        )
        return 0
    except (EvidenceError, FileNotFoundError, json.JSONDecodeError) as exc:
        print(f"stack_selection_evidence=FAIL\n{exc}")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
