#!/usr/bin/env python3
"""Deterministically validate the compact agent-architecture eval pack."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
REFERENCES = ROOT / "references"
ASSETS = ROOT / "assets"
EXPECTED_PARTITIONS = {
    "build",
    "validation",
    "sealed-promotion",
    "shadow-regression",
}
EXPECTED_PROFILES = {
    "architecture-outcome": {
        "task-fit": 25,
        "capability-coverage": 25,
        "behavioral-completeness": 20,
        "safety-operability": 20,
        "minimality-actionability": 10,
    },
    "architecture-trajectory": {
        "source-selection-grounding": 20,
        "source-capability-derivation": 25,
        "cluster-boundary-quality": 20,
        "building-block-topology": 20,
        "adaptation-efficiency": 15,
    },
}
FORBIDDEN_CORPUS_KEYS = {
    "expected_answer",
    "expected_output",
    "human_label",
    "reference_answer",
    "score",
}


def load_json(path: Path, errors: list[str]) -> Any:
    def unique_object(pairs):
        value = {}
        for key, item in pairs:
            if key in value:
                raise ValueError(f"duplicate key: {key}")
            value[key] = item
        return value

    try:
        return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique_object)
    except FileNotFoundError:
        errors.append(f"missing file: {path.relative_to(ROOT)}")
    except json.JSONDecodeError as exc:
        errors.append(f"invalid JSON {path.relative_to(ROOT)}: {exc}")
    except ValueError as exc:
        errors.append(f"invalid JSON {path.relative_to(ROOT)}: {exc}")
    return None


def find_forbidden_keys(value: Any, path: str = "$") -> list[str]:
    hits: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if key in FORBIDDEN_CORPUS_KEYS:
                hits.append(child_path)
            hits.extend(find_forbidden_keys(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            hits.extend(find_forbidden_keys(child, f"{path}[{index}]"))
    return hits


def validate_catalog(catalog: Any, errors: list[str]) -> set[str]:
    if not isinstance(catalog, dict) or not isinstance(catalog.get("cases"), list):
        errors.append("task-catalog.json must contain a cases array")
        return set()
    cases = catalog["cases"]
    if not 6 <= len(cases) <= 8:
        errors.append("task catalog must contain 6-8 cases")
    ids: list[str] = []
    required = {
        "id",
        "title",
        "risk",
        "prompt",
        "observable_output",
        "required_slices",
        "prohibited_actions",
    }
    for index, case in enumerate(cases):
        if not isinstance(case, dict):
            errors.append(f"case {index} must be an object")
            continue
        missing = sorted(required - set(case))
        if missing:
            errors.append(f"case {index} missing fields: {', '.join(missing)}")
        case_id = case.get("id")
        if not isinstance(case_id, str) or not case_id:
            errors.append(f"case {index} has invalid id")
        else:
            ids.append(case_id)
        if case.get("risk") not in {"low", "medium", "high", "critical"}:
            errors.append(f"case {case_id or index} has invalid risk")
        if not case.get("required_slices") or not case.get("prohibited_actions"):
            errors.append(f"case {case_id or index} needs required_slices and prohibited_actions")
    if len(ids) != len(set(ids)):
        errors.append("task catalog case IDs must be unique")
    for hit in find_forbidden_keys(catalog):
        errors.append(f"catalog leaks evaluator-only field at {hit}")
    return set(ids)


def validate_splits(manifest: Any, case_ids: set[str], errors: list[str]) -> None:
    if not isinstance(manifest, dict) or not isinstance(manifest.get("partitions"), dict):
        errors.append("split-manifest.json must contain partitions")
        return
    partitions = manifest["partitions"]
    if set(partitions) != EXPECTED_PARTITIONS:
        errors.append("split manifest must define exactly build, validation, sealed-promotion, and shadow-regression")
    seen: list[str] = []
    for name in EXPECTED_PARTITIONS:
        partition = partitions.get(name)
        if not isinstance(partition, dict) or not isinstance(partition.get("case_ids"), list):
            errors.append(f"partition {name} must contain case_ids")
            continue
        if not partition["case_ids"]:
            errors.append(f"partition {name} must not be empty")
        if name != "build" and partition.get("candidate_visible") is not False:
            errors.append(f"partition {name} must not be candidate-visible")
        if name == "build" and partition.get("candidate_visible") is not True:
            errors.append("build partition must be candidate-visible")
        seen.extend(partition["case_ids"])
    if len(seen) != len(set(seen)):
        errors.append("case IDs must not overlap across partitions")
    if set(seen) != case_ids:
        missing = sorted(case_ids - set(seen))
        unknown = sorted(set(seen) - case_ids)
        errors.append(f"split coverage mismatch; missing={missing}, unknown={unknown}")
    sealing = manifest.get("sealing_contract", {})
    if sealing.get("expected_answers_in_plugin") is not False or sealing.get("labels_in_plugin") is not False:
        errors.append("sealing contract must exclude answers and labels from the plugin")
    if sealing.get("execution_without_external_sealing") != "NOT_RUN":
        errors.append("unsealed execution must be NOT_RUN")
    for hit in find_forbidden_keys(manifest):
        errors.append(f"split manifest leaks evaluator-only field at {hit}")


def validate_profiles(profiles: Any, errors: list[str]) -> None:
    if not isinstance(profiles, dict) or not isinstance(profiles.get("profiles"), list):
        errors.append("judge-profiles.json must contain profiles")
        return
    by_id = {profile.get("id"): profile for profile in profiles["profiles"] if isinstance(profile, dict)}
    if set(by_id) != set(EXPECTED_PROFILES):
        errors.append("judge profiles must define exactly independent outcome and trajectory profiles")
    for profile_id, expected in EXPECTED_PROFILES.items():
        profile = by_id.get(profile_id)
        if not profile:
            continue
        if profile.get("version") != "1.0.0" or profile.get("independent") is not True:
            errors.append(f"profile {profile_id} must be independent version 1.0.0")
        dimensions = profile.get("dimensions", [])
        if len(dimensions) != 5:
            errors.append(f"profile {profile_id} must define exactly five dimensions")
        actual = {
            item.get("id"): item.get("weight")
            for item in dimensions
            if isinstance(item, dict)
        }
        if len(actual) != len(dimensions):
            errors.append(f"profile {profile_id} dimension IDs must be unique")
        if actual != expected:
            errors.append(f"profile {profile_id} dimensions or weights differ from the specification")
        if sum(weight for weight in actual.values() if isinstance(weight, int)) != 100:
            errors.append(f"profile {profile_id} weights must sum to 100")
        rubric = profile.get("rubric")
        if not isinstance(rubric, str) or not (REFERENCES / rubric).is_file():
            errors.append(f"profile {profile_id} rubric does not resolve")
    acceptance = profiles.get("acceptance", {})
    if acceptance.get("minimum_normalized_score") != 0.8:
        errors.append("minimum normalized score must be 0.8")
    if acceptance.get("minimum_dimension_rating") != 2:
        errors.append("minimum dimension rating must be 2")
    if acceptance.get("both_profiles_required") is not True:
        errors.append("both independent profiles must be required")


def validate_budgets(budgets: Any, errors: list[str]) -> None:
    if not isinstance(budgets, dict) or budgets.get("fixed_before_run") is not True:
        errors.append("budgets must be fixed before a run")
        return
    for section in ("per_case", "suite"):
        values = budgets.get(section)
        if not isinstance(values, dict) or not values:
            errors.append(f"budgets missing {section}")
            continue
        for key, value in values.items():
            if isinstance(value, bool) or not isinstance(value, (int, float)) or value <= 0:
                errors.append(f"budget {section}.{key} must be positive")
    if budgets.get("on_exhaustion") != "INCONCLUSIVE":
        errors.append("budget exhaustion must be INCONCLUSIVE")


def validate_schema(schema: Any, errors: list[str]) -> None:
    if not isinstance(schema, dict):
        errors.append("judge response schema is missing")
        return
    if schema.get("additionalProperties") is not False:
        errors.append("judge response schema must reject extra top-level properties")
    properties = schema.get("properties", {})
    if "total_score" in properties or "normalized_score" in properties:
        errors.append("judge response schema must not accept model-supplied aggregate scores")
    rating = (
        properties.get("ratings", {})
        .get("items", {})
        .get("properties", {})
        .get("rating", {})
    )
    if rating.get("type") != "integer" or rating.get("minimum") != 0 or rating.get("maximum") != 4:
        errors.append("judge ratings must be anchored integers from 0 to 4")
    ratings = properties.get("ratings", {})
    item_properties = ratings.get("items", {}).get("properties", {})
    if ratings.get("type") != "array" or ratings.get("minItems") != 5 or ratings.get("maxItems") != 5:
        errors.append("judge ratings must preserve the canonical five-row array shape")
    evidence = item_properties.get("evidence", {})
    if evidence.get("type") != "array" or evidence.get("minItems") != 1:
        errors.append("every canonical rating row must preserve evidence locators")
    leakage_required = set(properties.get("leakage_check", {}).get("required", []))
    if not {"blind", "blind_to_expected", "blind_to_peer", "excluded_inputs_seen"} <= leakage_required:
        errors.append("judge response must expose reducer-compatible blind identity checks")
    if len(schema.get("allOf", [])) != 2:
        errors.append("judge schema must bind dimension IDs to both canonical profiles")


def validate_label_template(template: Any, errors: list[str]) -> None:
    if not isinstance(template, dict):
        errors.append("human label template is missing")
        return
    if template.get("status") != "NOT_RUN":
        errors.append("blank human label template must start as NOT_RUN")
    if template.get("verdict") or template.get("labeler_id"):
        errors.append("human label template must not fabricate a label")


def validate(root: Path = ROOT) -> list[str]:
    global ROOT, REFERENCES, ASSETS
    ROOT = root
    REFERENCES = ROOT / "references"
    ASSETS = ROOT / "assets"
    errors: list[str] = []
    catalog = load_json(REFERENCES / "task-catalog.json", errors)
    manifest = load_json(REFERENCES / "split-manifest.json", errors)
    budgets = load_json(REFERENCES / "budgets.json", errors)
    profiles = load_json(REFERENCES / "judge-profiles.json", errors)
    schema = load_json(REFERENCES / "judge-response.schema.json", errors)
    eligibility_schema = load_json(REFERENCES / "eligibility-input.schema.json", errors)
    receipt_schema = load_json(REFERENCES / "eligibility-receipt.schema.json", errors)
    label_template = load_json(ASSETS / "human-label-template.json", errors)
    case_ids = validate_catalog(catalog, errors)
    validate_splits(manifest, case_ids, errors)
    validate_budgets(budgets, errors)
    validate_profiles(profiles, errors)
    validate_schema(schema, errors)
    if not isinstance(eligibility_schema, dict) or eligibility_schema.get("additionalProperties") is not False:
        errors.append("eligibility input schema must exist and reject extra top-level properties")
    if not isinstance(receipt_schema, dict) or receipt_schema.get("additionalProperties") is not False:
        errors.append("eligibility receipt schema must exist and reject extra top-level properties")
    validate_label_template(label_template, errors)
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    errors = validate(args.root.resolve())
    result = {"status": "PASS" if not errors else "FAIL", "errors": errors}
    if args.json:
        print(json.dumps(result, indent=2))
    elif errors:
        for error in errors:
            print(f"FAIL: {error}")
    else:
        print("PASS: compact architecture evaluation pack is structurally valid")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
