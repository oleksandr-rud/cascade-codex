#!/usr/bin/env python3
"""Validate Cascade Market Intelligence artifacts and their bound dependencies."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import re
import subprocess
import sys
from typing import Any


PLUGIN_ALIAS = re.compile(r"^cascade-[a-z0-9-]+:[a-z0-9-]+$")
REAL_EVIDENCE_KINDS = {"OBSERVED_BEHAVIOR", "TRANSACTION", "RETENTION", "INTERVIEW", "SURVEY", "PUBLIC_FACT"}
BEHAVIOR_EVIDENCE_KINDS = {"OBSERVED_BEHAVIOR", "TRANSACTION", "RETENTION"}
NON_REAL_SOURCE_TYPES = {"INFERENCE", "HYPOTHESIS", "VENDOR_CLAIM"}
MAX_SAFE_INTEGER = 2**53 - 1
PERMITTED_USES = {
    "MARKET_RESEARCH",
    "OPPORTUNITY_SCORING",
    "PMF_ASSESSMENT",
    "EXPERIMENT_DESIGN",
    "PRODUCT_HANDOFF",
}


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
    """Return the RFC 8785 JCS digest through the package canonicalizer."""
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
    result = strict_json_loads(process.stdout)
    if result.get("algorithm") != "RFC8785-JCS+SHA-256":
        raise ValueError("canonicalizer algorithm identity mismatch")
    return str(result["sha256"])


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def validate_ledger(value: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    claims = [item for item in value.get("claims", []) if isinstance(item, dict)]
    contradictions = [item for item in value.get("contradictions", []) if isinstance(item, dict)]
    claim_ids = [item.get("claim_id") for item in claims]
    contradiction_ids = [item.get("contradiction_id") for item in contradictions]
    for claim_id in sorted(duplicates(claim_ids)):
        errors.append(f"duplicate claim_id: {claim_id}")
    for contradiction_id in sorted(duplicates(contradiction_ids)):
        errors.append(f"duplicate contradiction_id: {contradiction_id}")

    claims_by_id = {item.get("claim_id"): item for item in claims}
    contradictions_by_id = {item.get("contradiction_id"): item for item in contradictions}
    source_identities: dict[str, tuple[Any, Any]] = {}
    try:
        as_of = parse_time(value["as_of"])
    except (KeyError, TypeError, ValueError):
        as_of = None
        errors.append("ledger as_of timestamp is invalid")

    for claim in claims:
        claim_id = claim.get("claim_id")
        source_id = claim.get("source_id")
        identity = (claim.get("source_locator"), claim.get("source_sha256"))
        if source_id in source_identities and source_identities[source_id] != identity:
            errors.append(f"source_id has conflicting locator or digest: {source_id}")
        else:
            source_identities[source_id] = identity
        source_type = claim.get("source_type")
        evidence_kind = claim.get("evidence_kind")
        permitted_uses = claim.get("permitted_uses", [])
        if not isinstance(permitted_uses, list) or not permitted_uses:
            errors.append(f"claim lacks typed permitted uses: {claim_id}")
        else:
            unknown_uses = sorted(set(permitted_uses) - PERMITTED_USES)
            if unknown_uses:
                errors.append(f"claim has unknown permitted uses: {claim_id}->{unknown_uses}")
        if source_type == "HYPOTHESIS" and evidence_kind != "HYPOTHESIS":
            errors.append(f"hypothesis source has non-hypothesis evidence kind: {claim_id}")
        if source_type == "INFERENCE" and evidence_kind != "INFERENCE":
            errors.append(f"inference source has non-inference evidence kind: {claim_id}")
        if source_type == "VENDOR_CLAIM" and evidence_kind != "VENDOR_CLAIM":
            errors.append(f"vendor source has non-vendor evidence kind: {claim_id}")
        if source_type in {"HYPOTHESIS", "INFERENCE"} and claim.get("directness") != "INFERRED":
            errors.append(f"derived source is not marked INFERRED: {claim_id}")
        retrieved_raw = claim.get("retrieved_at")
        published_raw = claim.get("published_at")
        observed_raw = claim.get("observed_at")
        try:
            retrieved = parse_time(retrieved_raw) if retrieved_raw else None
            published = parse_time(published_raw) if published_raw else None
            observed = parse_time(observed_raw) if observed_raw else None
            if claim.get("freshness_status") == "CURRENT" and retrieved is None:
                errors.append(f"CURRENT claim lacks retrieved_at: {claim_id}")
            if published is not None and retrieved is not None and published > retrieved:
                errors.append(f"claim published_at is after retrieved_at: {claim_id}")
            if observed is not None and retrieved is not None and observed > retrieved:
                errors.append(f"claim observed_at is after retrieved_at: {claim_id}")
            if as_of is not None and retrieved is not None and retrieved > as_of:
                errors.append(f"claim retrieved_at is after ledger as_of: {claim_id}")
            if as_of is not None and observed is not None and observed > as_of:
                errors.append(f"claim observed_at is after ledger as_of: {claim_id}")
        except (TypeError, ValueError):
            errors.append(f"claim timestamps are invalid: {claim_id}")
        if evidence_kind in BEHAVIOR_EVIDENCE_KINDS:
            if not claim.get("entity_id") or not claim.get("event_id") or not observed_raw:
                errors.append(f"behavior claim lacks entity, event, or observation identity: {claim_id}")
        for contradiction_id in claim.get("contradiction_ids", []):
            contradiction = contradictions_by_id.get(contradiction_id)
            if contradiction is None:
                errors.append(f"claim references missing contradiction: {claim_id}->{contradiction_id}")
            elif claim_id not in contradiction.get("claim_ids", []):
                errors.append(f"claim/contradiction reference is not reciprocal: {claim_id}->{contradiction_id}")

    for contradiction in contradictions:
        contradiction_id = contradiction.get("contradiction_id")
        referenced = contradiction.get("claim_ids", [])
        if len(referenced) != len(set(referenced)):
            errors.append(f"contradiction must reference distinct claims: {contradiction_id}")
        for claim_id in referenced:
            claim = claims_by_id.get(claim_id)
            if claim is None:
                errors.append(f"contradiction references missing claim: {contradiction_id}->{claim_id}")
            elif contradiction_id not in claim.get("contradiction_ids", []):
                errors.append(f"contradiction/claim reference is not reciprocal: {contradiction_id}->{claim_id}")
        referenced_claims = [claims_by_id[item] for item in referenced if item in claims_by_id]
        statements = {
            " ".join(str(item.get("statement", "")).lower().split())
            for item in referenced_claims
            if item.get("statement")
        }
        sources = {
            (item.get("source_locator"), item.get("source_sha256"))
            for item in referenced_claims
        }
        if len(statements) < 2 or len(sources) < 2:
            errors.append(f"contradiction lacks substantively distinct claims and sources: {contradiction_id}")
        if contradiction.get("resolution_status") == "RESOLVED" and not contradiction.get("governing_rule"):
            errors.append(f"resolved contradiction lacks governing rule: {contradiction_id}")
        if contradiction.get("resolution_status") == "UNRESOLVED" and contradiction.get("governing_rule") is not None:
            errors.append(f"unresolved contradiction cannot claim a governing rule: {contradiction_id}")

    if value.get("status") == "READY":
        if value.get("gaps"):
            errors.append("READY ledger contains gaps")
        unresolved = [item.get("contradiction_id") for item in contradictions if item.get("resolution_status") == "UNRESOLVED"]
        if unresolved:
            errors.append(f"READY ledger has unresolved contradictions: {sorted(unresolved)}")
        direct_current = [
            claim for claim in claims
            if claim.get("freshness_status") == "CURRENT"
            and claim.get("directness") == "DIRECT"
            and claim.get("source_type") not in NON_REAL_SOURCE_TYPES
            and claim.get("evidence_kind") not in {"INFERENCE", "HYPOTHESIS"}
        ]
        if not direct_current:
            errors.append("READY ledger lacks current direct non-hypothesis evidence")
    elif value.get("status") in {"GAP", "BLOCKED"} and not value.get("gaps"):
        errors.append(f"{value.get('status')} ledger lacks explicit gaps")
    return sorted(set(errors))


def _real_claim(claim: dict[str, Any]) -> bool:
    return (
        claim.get("source_type") not in NON_REAL_SOURCE_TYPES
        and claim.get("evidence_kind") in REAL_EVIDENCE_KINDS
        and claim.get("freshness_status") == "CURRENT"
    )


def _permitted(claim: dict[str, Any], use: str) -> bool:
    permitted = claim.get("permitted_uses", [])
    return isinstance(permitted, list) and use in permitted


def validate_opportunity(
    value: dict[str, Any],
    *,
    ledger: dict[str, Any],
    ledger_digest: str,
) -> list[str]:
    errors: list[str] = []
    ledger_errors = validate_ledger(ledger)
    errors.extend(f"supplied ledger is invalid: {error}" for error in ledger_errors)
    if value.get("ledger_id") != ledger.get("ledger_id") or value.get("ledger_version") != ledger.get("version"):
        errors.append("opportunity does not bind the supplied ledger identity and version")
    computed_digest = canonical_digest(ledger)
    if ledger_digest != computed_digest:
        errors.append("supplied ledger digest does not match RFC 8785 canonical bytes")
    if value.get("ledger_sha256") != computed_digest:
        errors.append("opportunity ledger_sha256 does not match the supplied ledger")

    criteria = [item for item in value.get("criteria", []) if isinstance(item, dict)]
    criterion_ids = [item.get("criterion_id") for item in criteria]
    for criterion_id in sorted(duplicates(criterion_ids)):
        errors.append(f"duplicate criterion_id: {criterion_id}")
    weights = [float(item.get("weight", 0)) for item in criteria]
    if abs(sum(weights) - 1.0) > 1e-9:
        errors.append("criterion weights must sum to 1")
    claims = {item.get("claim_id"): item for item in ledger.get("claims", []) if isinstance(item, dict)}
    rated_weight = 0.0
    computed_score = 0.0
    incomplete = False
    failed_floor = False
    criteria_without_real_evidence: list[str] = []
    for criterion in criteria:
        claim_ids = criterion.get("evidence_claim_ids", [])
        missing = sorted({claim_id for claim_id in claim_ids if claim_id not in claims})
        if missing:
            errors.append(f"criterion {criterion.get('criterion_id')} references missing ledger claims: {missing}")
        rating = criterion.get("rating")
        floor = criterion.get("floor")
        disallowed = sorted(
            claim_id for claim_id in claim_ids
            if claim_id in claims and not _permitted(claims[claim_id], "OPPORTUNITY_SCORING")
        )
        if disallowed:
            errors.append(f"criterion {criterion.get('criterion_id')} uses claims without OPPORTUNITY_SCORING permission: {disallowed}")
        if rating is None or not claim_ids or missing or disallowed:
            incomplete = True
            continue
        if not any(_real_claim(claims[claim_id]) for claim_id in claim_ids if claim_id in claims):
            criteria_without_real_evidence.append(str(criterion.get("criterion_id")))
        weight = float(criterion.get("weight", 0))
        rated_weight += weight
        computed_score += weight * float(rating) / 4.0
        if floor is not None and rating < floor:
            failed_floor = True
    declared_coverage = value.get("coverage")
    if isinstance(declared_coverage, (int, float)) and abs(float(declared_coverage) - rated_weight) > 1e-9:
        errors.append("coverage does not equal the sum of evidence-backed rated criterion weights")
    triggered = any(item.get("triggered") for item in value.get("disqualifiers", []) if isinstance(item, dict))
    disqualifier_ids: list[Any] = []
    for item in value.get("disqualifiers", []):
        if not isinstance(item, dict):
            continue
        disqualifier_ids.append(item.get("rule_id"))
        missing = sorted(set(item.get("evidence_claim_ids", [])) - set(claims))
        if missing:
            errors.append(f"disqualifier {item.get('rule_id')} references missing ledger claims: {missing}")
        disallowed = sorted(
            claim_id for claim_id in item.get("evidence_claim_ids", [])
            if claim_id in claims and not _permitted(claims[claim_id], "OPPORTUNITY_SCORING")
        )
        if disallowed:
            errors.append(f"disqualifier {item.get('rule_id')} uses claims without OPPORTUNITY_SCORING permission: {disallowed}")
    for rule_id in sorted(duplicates(disqualifier_ids)):
        errors.append(f"duplicate disqualifier rule_id: {rule_id}")
    status = value.get("decision_status")
    score = value.get("score")
    minimum_coverage = value.get("minimum_coverage")
    decision_rule = value.get("decision_rule", {})
    if status == "READY":
        if ledger.get("status") != "READY":
            errors.append("READY opportunity requires a READY ledger")
        if incomplete or value.get("gaps"):
            errors.append("READY opportunity requires complete evidence-backed coverage and no gaps")
        if criteria_without_real_evidence:
            errors.append(
                f"READY opportunity criteria lack current real non-vendor evidence: {sorted(criteria_without_real_evidence)}"
            )
        if not isinstance(minimum_coverage, (int, float)) or rated_weight < float(minimum_coverage):
            errors.append("READY opportunity does not meet the frozen minimum coverage")
        if triggered or failed_floor:
            errors.append("READY opportunity violates a disqualifier or criterion floor")
        if score is None or abs(float(score) - computed_score) > 1e-9:
            errors.append("opportunity score does not match the frozen weighted formula")
        elif float(score) < float(decision_rule.get("minimum_score", 1.0)):
            errors.append("READY opportunity score is below the frozen decision rule")
    elif status in {"ABSTAIN", "BLOCKED"}:
        if score is not None:
            errors.append(f"{status} opportunity must leave score null")
        if not value.get("gaps"):
            errors.append(f"{status} opportunity lacks explicit gaps")

    pmf_ids = value.get("pmf_evidence_claim_ids", [])
    missing_pmf = sorted({claim_id for claim_id in pmf_ids if claim_id not in claims})
    if missing_pmf:
        errors.append(f"PMF state references missing ledger claims: {missing_pmf}")
    disallowed_pmf = sorted(
        claim_id for claim_id in pmf_ids
        if claim_id in claims and not _permitted(claims[claim_id], "PMF_ASSESSMENT")
    )
    if disallowed_pmf:
        errors.append(f"PMF state uses claims without PMF_ASSESSMENT permission: {disallowed_pmf}")
    pmf_claims = [
        claims[claim_id] for claim_id in pmf_ids
        if claim_id in claims and _permitted(claims[claim_id], "PMF_ASSESSMENT")
    ]
    real_pmf = [claim for claim in pmf_claims if _real_claim(claim)]
    behavior_pmf = [claim for claim in real_pmf if claim.get("evidence_kind") in BEHAVIOR_EVIDENCE_KINDS]
    cohort = value.get("pmf_cohort", {})
    window = value.get("pmf_observation_window", {})
    window_start: datetime | None = None
    window_end: datetime | None = None
    try:
        window_start = parse_time(window["start"])
        window_end = parse_time(window["end"])
        if window_end <= window_start:
            errors.append("PMF observation window end must be after start")
        if parse_time(ledger["as_of"]) < window_end:
            errors.append("PMF observation window extends beyond ledger as_of")
    except (KeyError, TypeError, ValueError):
        errors.append("PMF cohort observation window is invalid")
    scoped_behavior: list[dict[str, Any]] = []
    for claim in behavior_pmf:
        try:
            observed = parse_time(claim["observed_at"])
        except (KeyError, TypeError, ValueError):
            continue
        if (
            window_start is not None
            and window_end is not None
            and window_start <= observed <= window_end
            and claim.get("entity_segment") == cohort.get("segment")
            and claim.get("geography") == cohort.get("geography")
        ):
            scoped_behavior.append(claim)
    state = value.get("pmf_state")
    if state == "UNTESTED" and pmf_ids:
        errors.append("UNTESTED PMF state cannot cite entry evidence")
    if state == "EARLY_SIGNAL" and not scoped_behavior:
        errors.append("EARLY_SIGNAL lacks current observed behavioral evidence in the declared cohort and window")
    if state == "REPEATED_BEHAVIOR":
        minimum_entities = max(2, int(cohort.get("minimum_distinct_entities", 2)))
        minimum_events = max(2, int(cohort.get("minimum_events_per_entity", 2)))
        events_by_entity: dict[str, set[str]] = {}
        for claim in scoped_behavior:
            if isinstance(claim.get("entity_id"), str) and isinstance(claim.get("event_id"), str):
                events_by_entity.setdefault(claim["entity_id"], set()).add(claim["event_id"])
        qualified = [entity for entity, events in events_by_entity.items() if len(events) >= minimum_events]
        if len(qualified) < minimum_entities:
            errors.append("REPEATED_BEHAVIOR does not meet the declared cohort/window entity rule")
    if state == "VALIDATED_FOR_SCOPE":
        kinds = {claim.get("evidence_kind") for claim in scoped_behavior}
        if not {"TRANSACTION", "RETENTION"}.issubset(kinds):
            errors.append("VALIDATED_FOR_SCOPE requires current transaction and retention evidence in the declared cohort/window")
        minimum_entities = max(1, int(cohort.get("minimum_distinct_entities", 1)))
        minimum_events = max(2, int(cohort.get("minimum_events_per_entity", 2)))
        kinds_by_entity: dict[str, set[str]] = {}
        events_by_entity: dict[str, set[str]] = {}
        for claim in scoped_behavior:
            entity_id = claim.get("entity_id")
            event_id = claim.get("event_id")
            if isinstance(entity_id, str) and isinstance(event_id, str):
                kinds_by_entity.setdefault(entity_id, set()).add(str(claim.get("evidence_kind")))
                events_by_entity.setdefault(entity_id, set()).add(event_id)
        qualified = [
            entity_id for entity_id, kinds_for_entity in kinds_by_entity.items()
            if {"TRANSACTION", "RETENTION"}.issubset(kinds_for_entity)
            and len(events_by_entity.get(entity_id, set())) >= minimum_events
        ]
        if len(qualified) < minimum_entities:
            errors.append("VALIDATED_FOR_SCOPE does not meet the declared distinct-entity rule")
        if status != "READY" or rated_weight < float(minimum_coverage or 1.0) or value.get("gaps"):
            errors.append("VALIDATED_FOR_SCOPE requires a READY, fully covered, gap-free assessment")
    try:
        expires_at = parse_time(value["expires_at"]) if value.get("expires_at") else None
        ledger_as_of = parse_time(ledger["as_of"])
        if status == "READY" and (expires_at is None or expires_at <= ledger_as_of):
            errors.append("READY opportunity expiry must be after the ledger as_of timestamp")
    except (KeyError, TypeError, ValueError):
        errors.append("opportunity or ledger time binding is invalid")
    return sorted(set(errors))


def _condition_interval(operator: str, value: float) -> tuple[float, bool, float, bool]:
    if operator == "GT":
        return value, False, float("inf"), False
    if operator == "GTE":
        return value, True, float("inf"), False
    if operator == "LT":
        return float("-inf"), False, value, False
    if operator == "LTE":
        return float("-inf"), False, value, True
    return value, True, value, True


def _conditions_overlap(a_operator: str, a_value: float, b_operator: str, b_value: float) -> bool:
    a_low, a_low_inc, a_high, a_high_inc = _condition_interval(a_operator, a_value)
    b_low, b_low_inc, b_high, b_high_inc = _condition_interval(b_operator, b_value)
    low = max(a_low, b_low)
    high = min(a_high, b_high)
    if low < high:
        return True
    if low > high:
        return False
    a_contains = (low > a_low or (low == a_low and a_low_inc)) and (low < a_high or (low == a_high and a_high_inc))
    b_contains = (low > b_low or (low == b_low and b_low_inc)) and (low < b_high or (low == b_high and b_high_inc))
    return a_contains and b_contains


def _digest_without(value: dict[str, Any], field: str = "sha256") -> str:
    return canonical_digest({key: item for key, item in value.items() if key != field})


def validate_experiment(value: dict[str, Any], *, now: datetime | None = None) -> list[str]:
    errors: list[str] = []
    effective_now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    success = value.get("success_criteria", [])
    kill = value.get("kill_criteria", [])
    overlap = sorted(set(success).intersection(kill))
    if overlap:
        errors.append(f"success and kill criteria overlap: {overlap}")
    metrics = [value.get("primary_metric")] + list(value.get("guardrail_metrics", []))
    metrics = [item for item in metrics if isinstance(item, dict)]
    metric_ids = [item.get("metric_id") for item in metrics]
    for metric_id in sorted(duplicates(metric_ids)):
        errors.append(f"duplicate metric_id: {metric_id}")
    for metric in metrics:
        try:
            if _conditions_overlap(
                metric.get("success_operator"),
                float(metric.get("success_value")),
                metric.get("kill_operator"),
                float(metric.get("kill_value")),
            ):
                errors.append(f"metric success and kill thresholds overlap: {metric.get('metric_id')}")
        except (TypeError, ValueError):
            errors.append(f"metric thresholds are invalid: {metric.get('metric_id')}")

    inputs = [item for item in value.get("input_artifacts", []) if isinstance(item, dict)]
    input_ids = [item.get("id") for item in inputs]
    for artifact_id in sorted(duplicates(input_ids)):
        errors.append(f"duplicate experiment input artifact: {artifact_id}")
    known_inputs = set(input_ids)
    missing_hypothesis_inputs = sorted(set(value.get("hypothesis_evidence_ids", [])) - known_inputs)
    if missing_hypothesis_inputs:
        errors.append(f"experiment hypothesis references missing inputs: {missing_hypothesis_inputs}")
    unusable_inputs = [
        item.get("id") for item in inputs
        if item.get("permitted_use") != "EXPERIMENT_DESIGN"
        or item.get("status") not in {"READY", "PASS", "APPROVED"}
    ]
    if unusable_inputs:
        errors.append(f"experiment depends on inputs not eligible for EXPERIMENT_DESIGN: {unusable_inputs}")
    if not value.get("recruitment", {}).get("eligibility_rule"):
        errors.append("experiment lacks an operational recruitment rule")
    if not value.get("instrument", {}).get("sha256"):
        errors.append("experiment lacks a versioned instrument digest")
    if not value.get("instrumentation"):
        errors.append("experiment lacks typed instrumentation events")
    if not value.get("contamination_controls"):
        errors.append("experiment lacks contamination controls")
    try:
        start = parse_time(value["duration"]["start"])
        end = parse_time(value["duration"]["end"])
        if end <= start:
            errors.append("experiment duration end must be after start")
    except (KeyError, TypeError, ValueError):
        errors.append("experiment duration is invalid")

    state = value.get("execution_state")
    receipt = value.get("receipt")
    permissions = value.get("permissions", {})
    operator = value.get("operator", {})
    privacy = value.get("privacy_plan", {})
    if state == "NOT_RUN" and (value.get("evidence_location") is not None or receipt is not None):
        errors.append("NOT_RUN experiment cannot contain execution evidence or a receipt")
    if state == "RECEIPT_SUPPLIED":
        if not isinstance(receipt, dict):
            errors.append("RECEIPT_SUPPLIED experiment lacks a receipt")
        else:
            if receipt.get("operator") != operator.get("owner"):
                errors.append("experiment receipt operator does not match the declared operator owner")
            if receipt.get("experiment_id") != value.get("experiment_id") or receipt.get("experiment_version") != value.get("version"):
                errors.append("experiment receipt does not bind the experiment identity and version")
            if receipt.get("destination") != operator.get("destination") or receipt.get("destination") != privacy.get("destination"):
                errors.append("experiment receipt destination does not match the declared operator and privacy plan")
            if receipt.get("budget_reference") != operator.get("budget_reference"):
                errors.append("experiment receipt budget reference does not match the declared operator")
            authority_receipt = permissions.get("authority_receipt")
            if not isinstance(authority_receipt, dict):
                errors.append("experiment receipt lacks a typed execution authority receipt")
            else:
                try:
                    if authority_receipt.get("sha256") != _digest_without(authority_receipt):
                        errors.append("execution authority receipt digest is invalid")
                except (TypeError, ValueError):
                    errors.append("execution authority receipt cannot be canonicalized")
                if receipt.get("authority_receipt_sha256") != authority_receipt.get("sha256"):
                    errors.append("experiment receipt does not bind the execution authority receipt")
                if authority_receipt.get("subject") != operator.get("owner"):
                    errors.append("execution authority receipt subject does not match the operator")
                if authority_receipt.get("destination") != operator.get("destination"):
                    errors.append("execution authority receipt destination does not match the operator")
                if authority_receipt.get("budget_reference") != operator.get("budget_reference"):
                    errors.append("execution authority receipt budget does not match the operator")
                if "EXECUTE_MARKET_EXPERIMENT" not in authority_receipt.get("scopes", []):
                    errors.append("execution authority receipt lacks the required scope")
            if receipt.get("status") not in {"PASS", "FAIL"} or receipt.get("completeness_status") != "COMPLETE":
                errors.append("experiment receipt is partial or invalid rather than terminal and complete")
            if receipt.get("issuer") != operator.get("owner"):
                errors.append("experiment receipt issuer does not match the operator")
            raw_outcome = receipt.get("raw_outcome")
            if not isinstance(raw_outcome, dict):
                errors.append("experiment receipt lacks embedded raw outcome metadata")
            else:
                try:
                    if receipt.get("raw_outcome_sha256") != canonical_digest(raw_outcome):
                        errors.append("experiment receipt raw outcome digest is invalid")
                except (TypeError, ValueError):
                    errors.append("experiment raw outcome cannot be canonicalized")
                if raw_outcome.get("metric_id") != value.get("primary_metric", {}).get("metric_id"):
                    errors.append("experiment raw outcome does not bind the primary metric")
                unit = str(value.get("primary_metric", {}).get("unit", "")).lower()
                if any(token in unit for token in ("fraction", "proportion", "rate")):
                    try:
                        record_count = int(raw_outcome.get("record_count"))
                        observed_value = float(raw_outcome.get("observed_value"))
                        if not 0 <= observed_value <= 1:
                            errors.append("experiment rate outcome is outside 0 through 1")
                        elif abs(observed_value * record_count - round(observed_value * record_count)) > 1e-9:
                            errors.append("experiment rate outcome has no integer numerator for record_count")
                    except (TypeError, ValueError):
                        errors.append("experiment rate outcome denominator or value is invalid")
            cleanup_proof = receipt.get("cleanup_proof")
            if receipt.get("cleanup_status") == "FAIL":
                errors.append("experiment receipt reports failed cleanup")
            if receipt.get("cleanup_status") == "PASS":
                if not isinstance(cleanup_proof, dict):
                    errors.append("experiment receipt cleanup PASS lacks proof")
                else:
                    try:
                        if receipt.get("cleanup_proof_sha256") != canonical_digest(cleanup_proof):
                            errors.append("experiment cleanup proof digest is invalid")
                    except (TypeError, ValueError):
                        errors.append("experiment cleanup proof cannot be canonicalized")
            if receipt.get("cleanup_status") == "NOT_APPLICABLE" and not receipt.get("cleanup_not_applicable_reason"):
                errors.append("experiment receipt cleanup NOT_APPLICABLE lacks a reason")
            if privacy.get("cleanup_required") and receipt.get("cleanup_status") != "PASS":
                errors.append("experiment privacy plan requires successful cleanup proof")
            if receipt.get("status") == "PASS" and receipt.get("failures"):
                errors.append("experiment PASS receipt contains execution failures")
            budget_limit = operator.get("budget_limit")
            actual_cost = receipt.get("actual_cost")
            if isinstance(budget_limit, dict) and isinstance(actual_cost, dict):
                if actual_cost.get("currency") != budget_limit.get("currency"):
                    errors.append("experiment receipt cost currency does not match the approved budget")
                try:
                    if float(actual_cost.get("amount")) > float(budget_limit.get("amount")):
                        errors.append("experiment receipt cost exceeds the approved budget")
                except (TypeError, ValueError):
                    errors.append("experiment receipt cost is invalid")
            else:
                errors.append("experiment receipt lacks typed approved and actual cost")
            try:
                executed_at = parse_time(receipt["executed_at"])
                expires_at = parse_time(receipt["expires_at"])
                if executed_at > effective_now:
                    errors.append("experiment receipt executed_at is in the future")
                if expires_at <= executed_at or expires_at <= effective_now:
                    errors.append("experiment receipt is stale or has an invalid validity window")
                if isinstance(authority_receipt, dict):
                    issued_at = parse_time(authority_receipt["issued_at"])
                    authority_expires = parse_time(authority_receipt["expires_at"])
                    if issued_at > executed_at or authority_expires <= executed_at or authority_expires <= effective_now:
                        errors.append("execution authority was not valid for the execution and receipt window")
            except (KeyError, TypeError, ValueError):
                errors.append("experiment receipt timestamps are invalid")
            try:
                if receipt.get("sha256") != _digest_without(receipt):
                    errors.append("experiment receipt digest is invalid")
            except (TypeError, ValueError):
                errors.append("experiment receipt cannot be canonicalized")
        if not all(permissions.get(field) for field in (
            "external_execution_authorized", "data_destination_approved", "cost_budget_approved"
        )):
            errors.append("supplied execution receipt is not backed by all required permissions")
        if not all(operator.get(field) for field in ("owner", "destination", "budget_reference", "budget_limit")):
            errors.append("supplied execution receipt lacks operator, destination, or typed budget binding")
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


def validate_handoff(value: dict[str, Any], *, now: datetime | None = None) -> list[str]:
    errors: list[str] = []
    effective_now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    mode = value.get("mode")
    status = value.get("status")
    authority = value.get("authority", {})
    policy = value.get("data_policy", {})
    freshness = value.get("freshness", {})
    failure = value.get("failure", {})
    resume = value.get("resume", {})
    closure = value.get("closure", {})
    budget = value.get("budget", {})
    expected_output = value.get("expected_output", {})
    producer = value.get("producer")
    consumer = value.get("consumer")
    consumer_type = value.get("consumer_type")
    if not isinstance(producer, str) or PLUGIN_ALIAS.fullmatch(producer) is None:
        errors.append("handoff producer must be an exact cascade plugin skill alias")
    elif not producer.startswith("cascade-market-intelligence:"):
        errors.append("Market handoff producer must be owned by Cascade Market Intelligence")
    if consumer_type == "CASCADE_PLUGIN":
        if not isinstance(consumer, str) or PLUGIN_ALIAS.fullmatch(consumer) is None:
            errors.append("CASCADE_PLUGIN handoff consumer must be an exact plugin skill alias")
    elif consumer_type == "EXTERNAL_OPERATOR":
        if not isinstance(consumer, str) or re.fullmatch(r"external-operator:[a-z0-9-]+", consumer) is None:
            errors.append("EXTERNAL_OPERATOR handoff consumer must be a named external operator")
    else:
        errors.append("handoff consumer_type is invalid")
    try:
        versions = contract_alias_versions()
        expected_producer_version = versions.get(producer)
        if expected_producer_version is None:
            errors.append(f"handoff producer alias is not bound by the frozen package manifest: {producer}")
        elif value.get("producer_version") != expected_producer_version:
            errors.append(
                f"handoff producer_version does not match the frozen package manifest: "
                f"{value.get('producer_version')} != {expected_producer_version}"
            )
        if consumer_type == "CASCADE_PLUGIN":
            expected_consumer_version = versions.get(consumer)
            if expected_consumer_version is None:
                errors.append(f"handoff consumer alias is not bound by the frozen package manifest: {consumer}")
            elif value.get("consumer_version") != expected_consumer_version:
                errors.append(
                    f"handoff consumer_version does not match the frozen package manifest: "
                    f"{value.get('consumer_version')} != {expected_consumer_version}"
                )
        elif not isinstance(value.get("consumer_version"), str) or re.fullmatch(
            r"\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?", value["consumer_version"]
        ) is None:
            errors.append("external operator consumer_version must be an exact semantic version")
    except (OSError, ValueError, KeyError, TypeError) as error:
        errors.append(f"handoff alias/version registry cannot be verified: {error}")
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
    if not expected_output.get("artifact_id") or not expected_output.get("artifact_version") or "sha256" not in expected_output:
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
    if mode == "EXECUTE" and (
        not isinstance(producer, str)
        or not producer.startswith("cascade-market-intelligence:")
        or consumer_type != "EXTERNAL_OPERATOR"
        or not isinstance(consumer, str)
        or not consumer.startswith("external-operator:")
    ):
        errors.append("Market EXECUTE handoff must delegate only to a named external operator")
    if mode == "EXECUTE" and isinstance(consumer, str) and consumer.startswith("cascade-market-intelligence:"):
        errors.append("Cascade Market Intelligence cannot be the execution consumer")
    try:
        produced = parse_time(freshness["produced_at"])
        expires = parse_time(freshness["expires_at"]) if freshness.get("expires_at") else None
        if expires is not None and expires <= produced:
            errors.append("handoff expires_at is not after produced_at")
        if freshness.get("status") == "CURRENT" and expires is not None and expires <= effective_now:
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
    parser.add_argument("kind", choices=("ledger", "opportunity", "experiment", "handoff"))
    parser.add_argument("artifact", type=Path)
    parser.add_argument("--schema", type=Path, required=True)
    parser.add_argument("--ledger", type=Path)
    parser.add_argument("--ledger-digest")
    args = parser.parse_args(argv)
    try:
        value = strict_json_file(args.artifact)
        errors = validate_schema(value, args.schema)
        if not errors:
            if args.kind == "ledger":
                errors = validate_ledger(value)
            elif args.kind == "opportunity":
                if args.ledger is None or args.ledger_digest is None:
                    errors = ["opportunity validation requires --ledger and --ledger-digest"]
                else:
                    ledger = strict_json_file(args.ledger)
                    errors = validate_opportunity(value, ledger=ledger, ledger_digest=args.ledger_digest)
            elif args.kind == "experiment":
                errors = validate_experiment(value)
            else:
                errors = validate_handoff(value)
        result = {
            "status": "PASS" if not errors else "INVALID",
            "kind": args.kind,
            "artifact_sha256": canonical_digest(value),
            "errors": errors,
        }
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0 if not errors else 2
    except (OSError, ValueError, json.JSONDecodeError, KeyError, TypeError, AttributeError) as error:
        print(json.dumps({"status": "INVALID", "kind": args.kind, "errors": [str(error)]}, indent=2, sort_keys=True))
        return 2


if __name__ == "__main__":
    sys.exit(main())
