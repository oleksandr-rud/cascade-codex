#!/usr/bin/env python3
"""Apply deterministic status and typed Market artifact eligibility.

Narrative or self-reported signals never establish semantic correctness.
Independent Cascade Evals judges own that decision.
"""

from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Any


from validate_artifact import (
    canonical_digest,
    strict_json_file,
    strict_json_loads,
    validate_experiment,
    validate_growth,
    validate_handoff,
    validate_ledger,
    validate_opportunity,
    validate_schema,
)


PLUGIN_ROOT = Path(__file__).resolve().parent.parent
LEDGER_SCHEMA = PLUGIN_ROOT / "schemas" / "evidence-ledger.schema.json"
OPPORTUNITY_SCHEMA = PLUGIN_ROOT / "schemas" / "opportunity-assessment.schema.json"
EXPERIMENT_SCHEMA = PLUGIN_ROOT / "schemas" / "experiment-contract.schema.json"
GROWTH_SCHEMA = PLUGIN_ROOT / "schemas" / "growth-strategy.schema.json"
HANDOFF_SCHEMA = PLUGIN_ROOT / "schemas" / "handoff-envelope.schema.json"
SUPPORTED_ASSERTIONS = {
    "status_matches_expected",
    "selected_skill_matches_expected",
    "market_artifact_valid",
    "brand_output_valid",
}


ARTIFACT_CONTRACTS = {
    "research-market": ("EVIDENCE_LEDGER", LEDGER_SCHEMA),
    "evaluate-market-opportunity": ("OPPORTUNITY_ASSESSMENT", OPPORTUNITY_SCHEMA),
    "design-market-experiments": ("EXPERIMENT_CONTRACT", EXPERIMENT_SCHEMA),
    "plan-growth": ("GROWTH_STRATEGY", GROWTH_SCHEMA),
}

BRAND_TOP_LEVEL_FIELDS = {
    "disposition",
    "content",
    "source_bindings",
    "authority_boundaries",
    "handoffs",
}
BRAND_SOURCE_FIELDS = {
    "kind",
    "id",
    "version",
    "sha256",
    "status",
    "supports",
    "limitations",
}
BRAND_HANDOFF_FIELDS = {
    "owner",
    "required_artifact",
    "next_action",
    "status",
}


def _digest_without(value: dict[str, Any], field: str = "sha256") -> str:
    return canonical_digest({key: item for key, item in value.items() if key != field})


def _artifact_identity(skill: str | None, artifact: dict[str, Any]) -> tuple[Any, Any]:
    fields = {
        "research-market": ("ledger_id", "version"),
        "evaluate-market-opportunity": ("assessment_id", "version"),
        "design-market-experiments": ("experiment_id", "version"),
        "plan-growth": ("strategy_id", "version"),
    }.get(skill)
    if fields is None:
        return None, None
    return artifact.get(fields[0]), artifact.get(fields[1])


def finalize_target(suite: dict[str, Any], target_output: dict[str, Any]) -> dict[str, Any]:
    """Compile computable digest leaves without repairing model-authored semantics."""
    cases = {
        case.get("case_id"): case
        for case in suite.get("cases", [])
        if isinstance(case, dict) and isinstance(case.get("case_id"), str)
    }
    for actual in target_output.get("cases", []):
        if not isinstance(actual, dict):
            continue
        case = cases.get(actual.get("case_id"), {})
        try:
            envelope = strict_json_loads(actual.get("response", ""))
        except (TypeError, json.JSONDecodeError, ValueError):
            continue
        if not isinstance(envelope, dict):
            continue

        supporting = envelope.get("supporting_artifacts")
        dependency_by_kind: dict[str, dict[str, Any]] = {}
        if isinstance(supporting, list):
            for wrapper in supporting:
                if not isinstance(wrapper, dict) or not isinstance(wrapper.get("artifact"), dict):
                    continue
                dependency = wrapper["artifact"]
                if isinstance(wrapper.get("sha256"), str):
                    try:
                        wrapper["sha256"] = canonical_digest(dependency)
                    except ValueError:
                        pass
                if isinstance(wrapper.get("kind"), str):
                    dependency_by_kind[wrapper["kind"]] = wrapper

        artifact = envelope.get("artifact")
        if isinstance(artifact, dict):
            receipt_identity: tuple[Any, Any] = (None, None)
            receipt_digest: str | None = None
            if case.get("skill") == "evaluate-market-opportunity":
                ledger_wrapper = dependency_by_kind.get("EVIDENCE_LEDGER")
                if isinstance(ledger_wrapper, dict) and isinstance(ledger_wrapper.get("artifact"), dict):
                    ledger = ledger_wrapper["artifact"]
                    if (
                        artifact.get("ledger_id") == ledger.get("ledger_id")
                        and artifact.get("ledger_version") == ledger.get("version")
                        and isinstance(artifact.get("ledger_sha256"), str)
                        and isinstance(ledger_wrapper.get("sha256"), str)
                    ):
                        artifact["ledger_sha256"] = ledger_wrapper["sha256"]
            if case.get("skill") == "design-market-experiments":
                permissions = artifact.get("permissions")
                receipt = artifact.get("receipt")
                authority = permissions.get("authority_receipt") if isinstance(permissions, dict) else None
                if isinstance(authority, dict) and isinstance(authority.get("sha256"), str):
                    try:
                        authority["sha256"] = _digest_without(authority)
                    except ValueError:
                        pass
                if isinstance(receipt, dict):
                    if (
                        isinstance(authority, dict)
                        and isinstance(authority.get("sha256"), str)
                        and isinstance(receipt.get("authority_receipt_sha256"), str)
                    ):
                        receipt["authority_receipt_sha256"] = authority["sha256"]
                    raw_outcome = receipt.get("raw_outcome")
                    if isinstance(raw_outcome, dict) and isinstance(receipt.get("raw_outcome_sha256"), str):
                        try:
                            receipt["raw_outcome_sha256"] = canonical_digest(raw_outcome)
                        except ValueError:
                            pass
                    cleanup_proof = receipt.get("cleanup_proof")
                    if isinstance(cleanup_proof, dict) and isinstance(receipt.get("cleanup_proof_sha256"), str):
                        try:
                            receipt["cleanup_proof_sha256"] = canonical_digest(cleanup_proof)
                        except ValueError:
                            pass
                    if isinstance(receipt.get("sha256"), str):
                        try:
                            receipt["sha256"] = _digest_without(receipt)
                        except ValueError:
                            pass
                    receipt_identity = (receipt.get("receipt_id"), receipt.get("version"))
                    if isinstance(receipt.get("sha256"), str):
                        receipt_digest = receipt["sha256"]

            artifact_digest: str | None = None
            try:
                artifact_digest = canonical_digest(artifact)
            except ValueError:
                pass
            if artifact_digest is not None and isinstance(envelope.get("artifact_sha256"), str):
                envelope["artifact_sha256"] = artifact_digest

            identity = _artifact_identity(case.get("skill"), artifact)
            handoffs = envelope.get("handoffs")
            if isinstance(handoffs, list):
                for wrapper in handoffs:
                    if not isinstance(wrapper, dict) or not isinstance(wrapper.get("artifact"), dict):
                        continue
                    handoff = wrapper["artifact"]
                    if artifact_digest is not None and all(isinstance(item, str) for item in identity):
                        for input_artifact in handoff.get("input_artifacts", []):
                            if (
                                isinstance(input_artifact, dict)
                                and (input_artifact.get("id"), input_artifact.get("version")) == identity
                                and isinstance(input_artifact.get("sha256"), str)
                            ):
                                input_artifact["sha256"] = artifact_digest
                        for output in handoff.get("output_artifacts", []):
                            if (
                                isinstance(output, dict)
                                and (output.get("id"), output.get("version")) == identity
                                and isinstance(output.get("sha256"), str)
                            ):
                                output["sha256"] = artifact_digest
                    if receipt_digest is not None and all(isinstance(item, str) for item in receipt_identity):
                        for input_artifact in handoff.get("input_artifacts", []):
                            if (
                                isinstance(input_artifact, dict)
                                and (input_artifact.get("id"), input_artifact.get("version")) == receipt_identity
                                and isinstance(input_artifact.get("sha256"), str)
                            ):
                                input_artifact["sha256"] = receipt_digest
                    if isinstance(wrapper.get("sha256"), str):
                        try:
                            wrapper["sha256"] = canonical_digest(handoff)
                        except ValueError:
                            pass

        actual["response"] = json.dumps(envelope, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    return target_output


def market_artifact_errors(case: dict[str, Any], actual: dict[str, Any]) -> list[str]:
    try:
        envelope = strict_json_loads(actual.get("response", ""))
    except (TypeError, json.JSONDecodeError, ValueError):
        return ["response is not a strict I-JSON Market artifact envelope"]
    if not isinstance(envelope, dict) or set(envelope) != {"artifact", "artifact_sha256", "supporting_artifacts", "handoffs"}:
        return ["Market artifact envelope fields are invalid"]
    artifact = envelope.get("artifact")
    if not isinstance(artifact, dict):
        return ["Market artifact is missing"]
    contract = case.get("fixture", {}).get("output_contract", {})
    expected_kind, schema_path = ARTIFACT_CONTRACTS.get(case.get("skill"), (None, None))
    errors: list[str] = []
    if contract.get("artifact_kind") != expected_kind or schema_path is None or contract.get("artifact_schema") != schema_path.relative_to(PLUGIN_ROOT).as_posix():
        errors.append("case output contract does not match the selected Market skill")
    if schema_path is None:
        errors.append("selected skill has no typed Market artifact contract")
    else:
        errors.extend(validate_schema(artifact, schema_path))
    supporting = envelope.get("supporting_artifacts")
    if not isinstance(supporting, list):
        errors.append("supporting_artifacts must be an array")
        supporting = []
    dependency_by_kind: dict[str, dict[str, Any]] = {}
    for index, item in enumerate(supporting):
        if not isinstance(item, dict) or set(item) != {"kind", "artifact", "sha256"} or not isinstance(item.get("artifact"), dict):
            errors.append(f"supporting artifact wrapper {index} is invalid")
            continue
        try:
            digest = canonical_digest(item["artifact"])
        except (TypeError, ValueError) as error:
            errors.append(f"supporting artifact {index}: {error}")
        else:
            if item.get("sha256") != digest:
                errors.append(f"supporting artifact {index}: RFC 8785 digest mismatch")
        if isinstance(item.get("kind"), str):
            if item["kind"] in dependency_by_kind:
                errors.append(f"duplicate supporting artifact kind: {item['kind']}")
            dependency_by_kind[item["kind"]] = item
    for expected in case.get("fixture", {}).get("frozen_inputs", []):
        if not isinstance(expected, dict) or not isinstance(expected.get("kind"), str):
            errors.append("case contains an invalid frozen input contract")
            continue
        actual_dependency = dependency_by_kind.get(expected["kind"])
        if (
            actual_dependency is None
            or actual_dependency.get("sha256") != expected.get("sha256")
            or actual_dependency.get("artifact") != expected.get("artifact")
        ):
            errors.append(f"supporting artifact does not exactly match frozen input: {expected['kind']}")
    if expected_kind == "EVIDENCE_LEDGER":
        errors.extend(validate_ledger(artifact))
    elif expected_kind == "GROWTH_STRATEGY":
        if not validate_schema(artifact, GROWTH_SCHEMA):
            errors.extend(validate_growth(artifact))
    elif expected_kind == "OPPORTUNITY_ASSESSMENT":
        ledger_wrapper = dependency_by_kind.get("EVIDENCE_LEDGER")
        if ledger_wrapper is None:
            errors.append("opportunity assessment lacks its frozen evidence ledger")
        else:
            ledger = ledger_wrapper["artifact"]
            errors.extend(validate_schema(ledger, LEDGER_SCHEMA))
            errors.extend(validate_opportunity(artifact, ledger=ledger, ledger_digest=ledger_wrapper["sha256"]))
    elif expected_kind == "EXPERIMENT_CONTRACT":
        errors.extend(validate_experiment(artifact))
        frozen_inputs = case.get("fixture", {}).get("frozen_inputs", [])
        if frozen_inputs:
            instrument = artifact.get("instrument")
            instrument_matches = [
                wrapper for wrapper in supporting
                if isinstance(wrapper, dict)
                and isinstance(wrapper.get("artifact"), dict)
                and isinstance(instrument, dict)
                and wrapper.get("sha256") == instrument.get("sha256")
                and wrapper["artifact"].get("id") == instrument.get("id")
                and wrapper["artifact"].get("version") == instrument.get("version")
                and wrapper["artifact"].get("kind") == instrument.get("kind")
            ]
            if len(instrument_matches) != 1:
                errors.append("experiment instrument must resolve exactly once to frozen supporting bytes")
            for event in artifact.get("instrumentation", []):
                event_matches = [
                    wrapper for wrapper in supporting
                    if isinstance(wrapper, dict)
                    and isinstance(wrapper.get("artifact"), dict)
                    and isinstance(event, dict)
                    and wrapper.get("sha256") == event.get("schema_sha256")
                    and wrapper["artifact"].get("event_id") == event.get("event_id")
                ]
                if len(event_matches) != 1:
                    errors.append(
                        f"instrumentation event {event.get('event_id')} must resolve exactly once to frozen schema bytes"
                    )
        frozen_experiment = case.get("fixture", {}).get("frozen_experiment")
        if isinstance(frozen_experiment, dict) and isinstance(frozen_experiment.get("artifact"), dict):
            frozen = frozen_experiment["artifact"]
            immutable_fields = (
                "experiment_id", "version", "segment", "geography", "instrument",
                "primary_metric", "sample_rule", "stopping_rule", "analysis_method",
                "operator", "decision_routes",
            )
            for field in immutable_fields:
                if artifact.get(field) != frozen.get(field):
                    errors.append(f"experiment drifted from frozen governing field: {field}")
            frozen_input_matches = [
                item for item in artifact.get("input_artifacts", [])
                if isinstance(item, dict)
                and item.get("id") == frozen.get("experiment_id")
                and item.get("version") == frozen.get("version")
                and item.get("sha256") == frozen_experiment.get("sha256")
                and item.get("status") == "READY"
                and item.get("evidence_class") == "SUPPLIED"
                and item.get("permitted_use") == "EXPERIMENT_DESIGN"
            ]
            if len(frozen_input_matches) != 1:
                errors.append("experiment must bind the frozen governing terms exactly once")
    status_fields = {
        "EVIDENCE_LEDGER": "status",
        "OPPORTUNITY_ASSESSMENT": "decision_status",
        "EXPERIMENT_CONTRACT": "execution_state",
        "GROWTH_STRATEGY": "status",
    }
    status_field = status_fields.get(expected_kind)
    expected_artifact_status = contract.get("expected_artifact_status")
    if status_field and artifact.get(status_field) != expected_artifact_status:
        errors.append(f"artifact {status_field}={artifact.get(status_field)} expected={expected_artifact_status}")
    try:
        digest = canonical_digest(artifact)
    except ValueError as error:
        errors.append(str(error))
    else:
        if envelope.get("artifact_sha256") != digest:
            errors.append("Market artifact RFC 8785 digest mismatch")
    handoffs = envelope.get("handoffs")
    if not isinstance(handoffs, list):
        errors.append("handoffs must be an array")
        return sorted(set(errors))
    require_handoff = bool(case.get("fixture", {}).get("output_contract", {}).get("require_handoff"))
    if require_handoff and not handoffs:
        errors.append("case requires a schema-valid Market handoff")
    for index, item in enumerate(handoffs):
        if not isinstance(item, dict) or set(item) != {"artifact", "sha256"} or not isinstance(item.get("artifact"), dict):
            errors.append(f"handoff wrapper {index} is invalid")
            continue
        handoff = item["artifact"]
        errors.extend(f"handoff {index}: {error}" for error in validate_schema(handoff, HANDOFF_SCHEMA))
        errors.extend(f"handoff {index}: {error}" for error in validate_handoff(handoff))
        if handoff.get("status") != case.get("expected_status"):
            errors.append(f"handoff {index}: status does not match the case status")
        try:
            digest = canonical_digest(handoff)
        except ValueError as error:
            errors.append(f"handoff {index}: {error}")
        else:
            if item.get("sha256") != digest:
                errors.append(f"handoff {index}: RFC 8785 digest mismatch")
    if require_handoff and case.get("expected_status") == "READY":
        artifact_identity = _artifact_identity(case.get("skill"), artifact)
        artifact_digest = envelope.get("artifact_sha256")
        output_matches = [
            (handoff_index, output)
            for handoff_index, wrapper in enumerate(handoffs)
            if isinstance(wrapper, dict) and isinstance(wrapper.get("artifact"), dict)
            for output in wrapper["artifact"].get("output_artifacts", [])
            if isinstance(output, dict)
            and (output.get("id"), output.get("version")) == artifact_identity
            and output.get("sha256") == artifact_digest
        ]
        if len(output_matches) != 1:
            errors.append("required READY handoff must bind the Market artifact identity and finalized digest exactly once")
        if expected_kind == "EXPERIMENT_CONTRACT" and artifact.get("execution_state") == "RECEIPT_SUPPLIED":
            receipt = artifact.get("receipt")
            receipt_identity = (
                receipt.get("receipt_id"),
                receipt.get("version"),
            ) if isinstance(receipt, dict) else (None, None)
            receipt_digest = receipt.get("sha256") if isinstance(receipt, dict) else None
            receipt_matches = [
                (handoff_index, input_artifact)
                for handoff_index, wrapper in enumerate(handoffs)
                if isinstance(wrapper, dict)
                and isinstance(wrapper.get("artifact"), dict)
                and wrapper["artifact"].get("consumer") == "cascade-product:manage-product-lifecycle"
                for input_artifact in wrapper["artifact"].get("input_artifacts", [])
                if isinstance(input_artifact, dict)
                and (input_artifact.get("id"), input_artifact.get("version")) == receipt_identity
                and input_artifact.get("sha256") == receipt_digest
                and input_artifact.get("evidence_class") == "RECEIPT"
            ]
            if len(receipt_matches) != 1:
                errors.append("Product handoff must bind the embedded operator receipt identity and finalized digest exactly once")
    if require_handoff and case.get("expected_status") == "BLOCKED":
        artifact_identity = _artifact_identity(case.get("skill"), artifact)
        artifact_digest = envelope.get("artifact_sha256")
        blocked_matches = [
            (handoff_index, input_artifact)
            for handoff_index, wrapper in enumerate(handoffs)
            if isinstance(wrapper, dict) and isinstance(wrapper.get("artifact"), dict)
            for input_artifact in wrapper["artifact"].get("input_artifacts", [])
            if isinstance(input_artifact, dict)
            and (input_artifact.get("id"), input_artifact.get("version")) == artifact_identity
            and input_artifact.get("sha256") == artifact_digest
            and input_artifact.get("evidence_class") == "DERIVED"
            and input_artifact.get("status") == "BLOCKED"
        ]
        if len(blocked_matches) != 1:
            errors.append("required BLOCKED handoff must bind the Market artifact identity and finalized digest exactly once")
    return sorted(set(errors))


def _nonempty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _sha256_or_null(value: Any) -> bool:
    return value is None or (
        isinstance(value, str)
        and len(value) == 64
        and all(character in "0123456789abcdef" for character in value)
    )


def brand_output_errors(case: dict[str, Any], actual: dict[str, Any]) -> list[str]:
    try:
        output = strict_json_loads(actual.get("response", ""))
    except (TypeError, json.JSONDecodeError, ValueError):
        return ["response is not strict I-JSON Brand output"]
    if not isinstance(output, dict) or set(output) != BRAND_TOP_LEVEL_FIELDS:
        return ["Brand output top-level fields are invalid"]

    errors: list[str] = []
    contract_fields = set(case.get("fixture", {}).get("output_contract", {}).get("required_response_fields", []))
    if contract_fields != BRAND_TOP_LEVEL_FIELDS:
        errors.append("case output contract does not match the Brand output contract")
    if output.get("disposition") != case.get("expected_status"):
        errors.append("Brand disposition does not match the sealed case status")
    if not isinstance(output.get("content"), dict) or not output["content"]:
        errors.append("Brand content must be a non-empty object")

    source_bindings = output.get("source_bindings")
    if not isinstance(source_bindings, list):
        errors.append("Brand source_bindings must be an array")
        source_bindings = []
    actual_identities: list[str] = []
    for index, binding in enumerate(source_bindings):
        if not isinstance(binding, dict) or set(binding) != BRAND_SOURCE_FIELDS:
            errors.append(f"Brand source binding {index} fields are invalid")
            continue
        if not _nonempty_string(binding.get("kind")) or not _nonempty_string(binding.get("status")):
            errors.append(f"Brand source binding {index} kind/status is invalid")
        for field in ("id", "version"):
            if binding.get(field) is not None and not _nonempty_string(binding.get(field)):
                errors.append(f"Brand source binding {index} {field} is invalid")
        if not _sha256_or_null(binding.get("sha256")):
            errors.append(f"Brand source binding {index} sha256 is invalid")
        supports = binding.get("supports")
        if not isinstance(supports, list) or not all(_nonempty_string(item) for item in supports):
            errors.append(f"Brand source binding {index} supports is invalid")
        if not _nonempty_string(binding.get("limitations")):
            errors.append(f"Brand source binding {index} limitations is invalid")
        actual_identities.append(json.dumps(
            [binding.get(field) for field in ("kind", "id", "version", "sha256", "status")],
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        ))
    if len(actual_identities) != len(set(actual_identities)):
        errors.append("Brand source identities must be unique")
    for frozen in case.get("fixture", {}).get("frozen_sources", []):
        expected_identity = json.dumps(
            [frozen.get(field) for field in ("kind", "id", "version", "sha256", "status")],
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        )
        if actual_identities.count(expected_identity) != 1:
            errors.append(f"Brand output must bind frozen source exactly once: {frozen.get('kind')}")

    boundaries = output.get("authority_boundaries")
    if (
        not isinstance(boundaries, dict)
        or not boundaries
        or not all(_nonempty_string(key) and _nonempty_string(value) for key, value in boundaries.items())
    ):
        errors.append("Brand authority_boundaries must be a non-empty string map")

    handoffs = output.get("handoffs")
    if not isinstance(handoffs, list):
        errors.append("Brand handoffs must be an array")
        handoffs = []
    owners: list[Any] = []
    for index, handoff in enumerate(handoffs):
        if not isinstance(handoff, dict) or set(handoff) != BRAND_HANDOFF_FIELDS:
            errors.append(f"Brand handoff {index} fields are invalid")
            continue
        if not all(_nonempty_string(handoff.get(field)) for field in BRAND_HANDOFF_FIELDS):
            errors.append(f"Brand handoff {index} contains an empty field")
        if handoff.get("status") != "NOT_RUN":
            errors.append(f"Brand handoff {index} must remain NOT_RUN")
        owners.append(handoff.get("owner"))
    required_owners = case.get("fixture", {}).get("required_handoff_owners", [])
    valid_owners = [owner for owner in owners if isinstance(owner, str)]
    if (
        len(valid_owners) != len(owners)
        or len(valid_owners) != len(set(valid_owners))
        or set(valid_owners) != set(required_owners)
    ):
        errors.append("Brand handoff owners do not exactly match the visible fixture")
    return sorted(set(errors))


def evaluate(suite: dict[str, Any], target_output: dict[str, Any]) -> dict[str, Any]:
    catalog = suite.get("assertion_catalog", {})
    expected_cases = suite.get("cases", [])
    actual_cases = target_output.get("cases", [])
    actual_by_id = {
        item.get("case_id"): item
        for item in actual_cases
        if isinstance(item, dict) and isinstance(item.get("case_id"), str)
    }
    findings: list[dict[str, Any]] = []
    passed = len(actual_cases) == len(expected_cases) == len(actual_by_id)
    unsupported = set(catalog) - SUPPORTED_ASSERTIONS
    if unsupported:
        passed = False
        findings.append({
            "case_id": "suite",
            "assertion_id": "unsupported_assertions",
            "status": "FAIL",
            "evidence_identity": "ME-suite-unsupported",
            "observed": f"unsupported mechanical assertions: {sorted(unsupported)}",
        })
    for case in expected_cases:
        case_id = case["case_id"]
        actual = actual_by_id.get(case_id)
        if actual is None:
            passed = False
            findings.append({
                "case_id": case_id,
                "assertion_id": "case_result_present",
                "status": "FAIL",
                "evidence_identity": f"ME-{case_id}-result",
                "observed": "missing case result",
            })
            continue
        for assertion_id in case["mechanical_assertions"]:
            assertion = catalog.get(assertion_id, {})
            if assertion_id == "status_matches_expected":
                ok = actual.get("status") == case["expected_status"]
                observed = f"status={actual.get('status')} expected={case['expected_status']}"
            elif assertion_id == "selected_skill_matches_expected":
                ok = actual.get("selected_skill") == case.get("skill")
                observed = f"selected_skill={actual.get('selected_skill')} expected={case.get('skill')}"
            elif assertion_id == "market_artifact_valid":
                errors = market_artifact_errors(case, actual)
                ok = not errors
                observed = "schema+cross-field+JCS=PASS" if ok else "; ".join(errors)
            elif assertion_id == "brand_output_valid":
                errors = brand_output_errors(case, actual)
                ok = not errors
                observed = "typed-brand-output=PASS" if ok else "; ".join(errors)
            else:
                ok = False
                observed = "unsupported mechanical assertion"
            passed = passed and ok
            findings.append({
                "case_id": case_id,
                "assertion_id": assertion_id,
                "status": "PASS" if ok else "FAIL",
                "evidence_identity": assertion.get("evidence_identity", "ME-{case_id}-unsupported").replace("{case_id}", case_id),
                "observed": observed,
            })
    return {
        "schema_version": 1,
        "evaluation_id": target_output.get("evaluation_id"),
        "subject_digest": target_output.get("subject_digest"),
        "status": "PASS" if passed else "INVALID",
        "semantic_status": "NOT_RUN",
        "semantic_owner": "cascade-evals:independent-judges",
        "case_count": len(expected_cases),
        "findings": findings,
    }


def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[1:]
    if len(argv) != 2:
        print("usage: evaluate_case_assertions.py CASES.json TARGET_OUTPUT.json", file=sys.stderr)
        return 2
    suite = strict_json_file(Path(argv[0]))
    target = strict_json_file(Path(argv[1]))
    receipt = evaluate(suite, target)
    print(json.dumps(receipt, indent=2, sort_keys=True))
    return 0 if receipt["status"] == "PASS" else 2


if __name__ == "__main__":
    sys.exit(main())
