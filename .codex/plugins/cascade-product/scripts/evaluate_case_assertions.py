#!/usr/bin/env python3
"""Apply deterministic status, routing, schema, cross-field, and digest gates.

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
    validate_decision,
    validate_handoff,
    validate_schema,
    validate_work_product,
)


PLUGIN_ROOT = Path(__file__).resolve().parent.parent
DECISION_SCHEMA = PLUGIN_ROOT / "schemas" / "product-decision.schema.json"
HANDOFF_SCHEMA = PLUGIN_ROOT / "schemas" / "handoff-envelope.schema.json"
WORK_PRODUCT_SCHEMA = PLUGIN_ROOT / "schemas" / "product-work-product.schema.json"
SUPPORTED_ASSERTIONS = {
    "status_matches_expected",
    "selected_skill_matches_expected",
    "product_artifacts_validate",
}


def parse_artifact_response(actual: dict[str, Any]) -> tuple[dict[str, Any] | None, list[str]]:
    try:
        value = strict_json_loads(actual.get("response", ""))
    except (TypeError, json.JSONDecodeError, ValueError):
        return None, ["response is not a JSON Product artifact envelope"]
    if not isinstance(value, dict):
        return None, ["response Product artifact envelope is not an object"]
    required = {
        "product_artifact",
        "product_artifact_sha256",
        "decision",
        "decision_sha256",
        "handoffs",
    }
    if set(value) != required:
        return None, [f"response Product artifact envelope fields drifted: {sorted(set(value))}"]
    if not isinstance(value.get("decision"), dict):
        return None, ["decision artifact is missing"]
    if not isinstance(value.get("product_artifact"), dict):
        return None, ["typed Product work product is missing"]
    if not isinstance(value.get("handoffs"), list):
        return None, ["handoffs must be an array"]
    return value, []


def finalize_target(suite: dict[str, Any], target_output: dict[str, Any]) -> dict[str, Any]:
    """Compile digest leaves from model-authored semantics without repairing semantics."""
    del suite
    for actual in target_output.get("cases", []):
        if not isinstance(actual, dict):
            continue
        try:
            envelope = strict_json_loads(actual.get("response", ""))
        except (TypeError, json.JSONDecodeError, ValueError):
            continue
        if not isinstance(envelope, dict):
            continue
        product_artifact = envelope.get("product_artifact")
        product_digest: str | None = None
        if isinstance(product_artifact, dict):
            try:
                product_digest = canonical_digest(product_artifact)
            except ValueError:
                product_digest = None
            if product_digest is not None and isinstance(envelope.get("product_artifact_sha256"), str):
                envelope["product_artifact_sha256"] = product_digest
        decision = envelope.get("decision")
        if isinstance(decision, dict) and product_digest is not None and isinstance(product_artifact, dict):
            identity = (
                product_artifact.get("artifact_id"),
                product_artifact.get("version"),
                product_artifact.get("status"),
            )
            work_product = decision.get("work_product")
            if (
                isinstance(work_product, dict)
                and (
                    work_product.get("artifact_id"),
                    work_product.get("version"),
                    work_product.get("status"),
                )
                == identity
                and isinstance(work_product.get("sha256"), str)
            ):
                work_product["sha256"] = product_digest
            for evidence in decision.get("evidence", []):
                if (
                    isinstance(evidence, dict)
                    and (evidence.get("artifact_id"), evidence.get("version")) == identity[:2]
                    and isinstance(evidence.get("sha256"), str)
                ):
                    evidence["sha256"] = product_digest
        if isinstance(decision, dict) and isinstance(envelope.get("decision_sha256"), str):
            try:
                envelope["decision_sha256"] = canonical_digest(decision)
            except ValueError:
                pass
        handoffs = envelope.get("handoffs")
        if isinstance(handoffs, list):
            for wrapper in handoffs:
                if not isinstance(wrapper, dict):
                    continue
                artifact = wrapper.get("artifact")
                if not isinstance(artifact, dict):
                    continue
                if product_digest is not None and isinstance(product_artifact, dict):
                    identity = (
                        product_artifact.get("artifact_id"),
                        product_artifact.get("version"),
                        product_artifact.get("status"),
                    )
                    for output in artifact.get("output_artifacts", []):
                        if (
                            isinstance(output, dict)
                            and (output.get("id"), output.get("version"), output.get("status")) == identity
                            and isinstance(output.get("sha256"), str)
                        ):
                            output["sha256"] = product_digest
                    expected_output = artifact.get("expected_output")
                    if (
                        isinstance(expected_output, dict)
                        and (
                            expected_output.get("artifact_id"),
                            expected_output.get("artifact_version"),
                            expected_output.get("status"),
                        )
                        == identity
                        and isinstance(expected_output.get("sha256"), str)
                    ):
                        expected_output["sha256"] = product_digest
                if isinstance(wrapper.get("sha256"), str):
                    try:
                        wrapper["sha256"] = canonical_digest(artifact)
                    except ValueError:
                        pass
        actual["response"] = json.dumps(envelope, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    return target_output


def artifact_errors(case: dict[str, Any], envelope: dict[str, Any]) -> list[str]:
    decision = envelope["decision"]
    errors = validate_schema(decision, DECISION_SCHEMA)
    if not errors:
        try:
            errors.extend(validate_decision(decision))
        except (AttributeError, KeyError, TypeError, ValueError) as error:
            errors.append(f"decision cross-field validation failed closed: {error}")
    try:
        digest = canonical_digest(decision)
    except ValueError as error:
        errors.append(str(error))
    else:
        if envelope.get("decision_sha256") != digest:
            errors.append("decision RFC 8785 digest mismatch")
    expected = case.get("expected_status")
    if expected in {"READY", "GAP", "BLOCKED", "INVALID"}:
        if decision.get("gate_status") != expected:
            errors.append("case status does not match decision gate_status")
    elif expected in {"PROPOSED", "PENDING_APPROVAL", "APPROVED", "REJECTED", "DEFERRED"}:
        if decision.get("approval_status") != expected:
            errors.append("case status does not match decision approval_status")
    else:
        errors.append(f"unsupported Product case status: {expected}")

    product_artifact = envelope["product_artifact"]
    product_schema_errors = validate_schema(product_artifact, WORK_PRODUCT_SCHEMA)
    errors.extend(product_schema_errors)
    if not product_schema_errors:
        try:
            errors.extend(validate_work_product(product_artifact))
        except (AttributeError, KeyError, TypeError, ValueError) as error:
            errors.append(f"Product work-product cross-field validation failed closed: {error}")
    expected_kind = {
        "define-product": "PRODUCT_DEFINITION",
        "manage-product-lifecycle": "LIFECYCLE_RECORD",
        "validate-product": "VALIDATION_REPORT",
    }.get(case.get("skill"))
    if product_artifact.get("kind") != expected_kind:
        errors.append(f"Product work-product kind does not match owning skill: {product_artifact.get('kind')} != {expected_kind}")
    if product_artifact.get("status") != expected:
        errors.append("case status does not match Product work-product status")
    if product_artifact.get("decision_id") != decision.get("decision_id"):
        errors.append("Product work product is not bound to the decision_id")
    try:
        product_digest = canonical_digest(product_artifact)
    except ValueError as error:
        errors.append(str(error))
        product_digest = None
    else:
        if envelope.get("product_artifact_sha256") != product_digest:
            errors.append("Product work-product RFC 8785 digest mismatch")
        decision_binding = decision.get("work_product", {})
        if not (
            isinstance(decision_binding, dict)
            and decision_binding.get("artifact_id") == product_artifact.get("artifact_id")
            and decision_binding.get("version") == product_artifact.get("version")
            and decision_binding.get("status") == product_artifact.get("status")
            and decision_binding.get("sha256") == product_digest
        ):
            errors.append("decision work_product does not exactly bind the typed Product work product")

    handoffs = envelope["handoffs"]
    require_handoff = bool(case.get("fixture", {}).get("output_contract", {}).get("require_handoff"))
    if require_handoff and not handoffs:
        errors.append("case requires a schema-valid handoff artifact")
    product_binding_count = 0
    expected_product_binding_count = 0
    for index, item in enumerate(handoffs):
        if not isinstance(item, dict) or set(item) != {"artifact", "sha256"} or not isinstance(item.get("artifact"), dict):
            errors.append(f"handoff wrapper {index} is invalid")
            continue
        artifact = item["artifact"]
        schema_errors = validate_schema(artifact, HANDOFF_SCHEMA)
        errors.extend(f"handoff {index}: {error}" for error in schema_errors)
        if not schema_errors:
            try:
                errors.extend(f"handoff {index}: {error}" for error in validate_handoff(artifact))
            except (AttributeError, KeyError, TypeError, ValueError) as error:
                errors.append(f"handoff {index}: cross-field validation failed closed: {error}")
        try:
            digest = canonical_digest(artifact)
        except ValueError as error:
            errors.append(f"handoff {index}: {error}")
        else:
            if item.get("sha256") != digest:
                errors.append(f"handoff {index}: RFC 8785 digest mismatch")
        if require_handoff and expected in {"READY", "PROPOSED", "PENDING_APPROVAL", "APPROVED"} and product_digest is not None:
            matches = [
                output
                for output in artifact.get("output_artifacts", [])
                if isinstance(output, dict)
                and output.get("id") == product_artifact.get("artifact_id")
                and output.get("version") == product_artifact.get("version")
                and output.get("status") == product_artifact.get("status")
                and output.get("sha256") == product_digest
            ]
            product_binding_count += len(matches)
            expected_output = artifact.get("expected_output", {})
            if (
                isinstance(expected_output, dict)
                and expected_output.get("artifact_id") == product_artifact.get("artifact_id")
                and expected_output.get("artifact_version") == product_artifact.get("version")
                and expected_output.get("status") == product_artifact.get("status")
                and expected_output.get("sha256") == product_digest
            ):
                expected_product_binding_count += 1
        if expected in {"READY", "PROPOSED", "PENDING_APPROVAL", "APPROVED"} and artifact.get("status") in {
            "NEEDS_INPUT", "GAP", "BLOCKED", "INVALID", "NOT_RUN", "FAIL"
        }:
            errors.append(f"handoff {index}: failed dependency contradicts forward Product status {expected}")
    if (
        require_handoff
        and expected in {"READY", "PROPOSED", "PENDING_APPROVAL", "APPROVED"}
        and product_binding_count != 1
    ):
        errors.append("required handoff set does not contain exactly one binding to the typed Product work product")
    if (
        require_handoff
        and expected in {"READY", "PROPOSED", "PENDING_APPROVAL", "APPROVED"}
        and expected_product_binding_count != 1
    ):
        errors.append("required handoff set does not contain exactly one expected_output binding to the typed Product work product")
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
        envelope, envelope_errors = parse_artifact_response(actual)
        for assertion_id in case["mechanical_assertions"]:
            assertion = catalog.get(assertion_id, {})
            if assertion_id == "status_matches_expected":
                ok = actual.get("status") == case["expected_status"]
                observed = f"status={actual.get('status')} expected={case['expected_status']}"
            elif assertion_id == "selected_skill_matches_expected":
                ok = actual.get("selected_skill") == case.get("skill")
                observed = f"selected_skill={actual.get('selected_skill')} expected={case.get('skill')}"
            elif assertion_id == "product_artifacts_validate":
                errors = envelope_errors if envelope is None else envelope_errors + artifact_errors(case, envelope)
                ok = not errors
                observed = "schema+cross-field+JCS=PASS" if ok else "; ".join(errors)
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
