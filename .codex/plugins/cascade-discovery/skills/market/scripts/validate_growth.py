"""Cross-field checks for a planning-only growth strategy."""

from __future__ import annotations

from typing import Any


def validate_growth(value: dict[str, Any]) -> list[str]:
    """Run after the growth JSON schema; structure alone cannot prove outcomes."""
    errors: list[str] = []
    bindings = value["source_bindings"]
    sources = {item["id"]: item for item in bindings}
    if len(sources) != len(bindings):
        errors.append("duplicate growth source identity")
    for field, key in (("channels", "channel_id"), ("stages", "stage"), ("product_feedback", "feedback_id")):
        identities = [item[key] for item in value[field]]
        if len(set(identities)) != len(identities):
            errors.append(f"duplicate growth {key}")

    evidence_items = value["channels"] + value["stages"] + value["product_feedback"] + [value["economics"]]
    for item in evidence_items:
        for source_id in item["evidence_ids"]:
            source = sources.get(source_id)
            if source is None:
                errors.append(f"unknown growth evidence source: {source_id}")
            elif value["status"] == "READY" and source["status"] != "CURRENT":
                errors.append(f"READY growth strategy relies on stale evidence: {source_id}")

    observed_classes = {"OBSERVATION", "PAYMENT", "RETENTION"}
    for item in value["stages"] + [value["economics"]]:
        if item["status"] == "OBSERVED":
            evidence = [sources[source_id] for source_id in item["evidence_ids"] if source_id in sources]
            if not evidence or not any(source["evidence_class"] in observed_classes for source in evidence):
                errors.append("observed growth claim lacks observed evidence")
            if any(source["evidence_class"] in {"HYPOTHESIS", "INFERENCE"} for source in evidence):
                errors.append("hypothesis or inference used as observed growth evidence")
            required_class = {"PAYMENT": "PAYMENT", "RETURN": "RETENTION"}.get(item.get("stage"))
            if required_class and not any(source["evidence_class"] == required_class for source in evidence):
                errors.append(f"observed {item['stage'].lower()} lacks matching evidence class")

    if value["status"] == "READY" and not value["channels"]:
        errors.append("READY growth strategy lacks a reachable channel hypothesis")
    if value["decision"]["action"] == "TEST" and value["next_test"] is None:
        errors.append("TEST growth decision lacks its bounded test")
    if value["decision"]["action"] == "SCALE":
        if value["status"] != "READY":
            errors.append("SCALE requires a READY strategy")
        economics = value["economics"]
        if economics["status"] != "OBSERVED" or economics["net_contribution"] is None or economics["net_contribution"] <= 0:
            errors.append("SCALE requires observed positive net contribution")
        if economics["marginal_acquisition_cost"] is None:
            errors.append("SCALE requires marginal acquisition cost")
        stages = {item["stage"]: item for item in value["stages"]}
        required = {"ACTIVATION", "OUTCOME", "PAYMENT"}
        if value["scope"]["cadence"] in {"RECURRING", "CAPABILITY"}:
            required.add("RETURN")
        if value["scope"]["cadence"] == "UNKNOWN":
            errors.append("SCALE requires a known job cadence")
        for stage in sorted(required):
            if stages.get(stage, {}).get("status") != "OBSERVED":
                errors.append(f"SCALE lacks observed {stage.lower()} evidence")
    return sorted(set(errors))
