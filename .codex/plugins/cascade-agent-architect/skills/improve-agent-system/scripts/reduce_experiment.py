#!/usr/bin/env python3
"""Fail-closed deterministic reducer for offline agent improvement experiments."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import statistics
import sys
from pathlib import Path
from typing import Any, Iterable


SKILL_DIR = Path(__file__).resolve().parents[1]
DEFAULT_SCHEMA = SKILL_DIR / "references" / "experiment.schema.json"
EVAL_REFERENCES = SKILL_DIR.parent / "evaluate-agent-system" / "references"
CANONICAL_FILES = {
    "task-catalog": EVAL_REFERENCES / "task-catalog.json",
    "split-manifest": EVAL_REFERENCES / "split-manifest.json",
    "outcome-rubric": EVAL_REFERENCES / "rubrics" / "outcome-v1.md",
    "trajectory-rubric": EVAL_REFERENCES / "rubrics" / "trajectory-v1.md",
    "judge-profiles": EVAL_REFERENCES / "judge-profiles.json",
    "judge-response-schema": EVAL_REFERENCES / "judge-response.schema.json",
    "budget-policy": EVAL_REFERENCES / "budgets.json",
}
BINDING_KEYS = {
    "claim", "baseline", "candidate", "model-envelope", "environment",
    "adapter", "persona-actor", "brief", "outcome", "policy",
    *CANONICAL_FILES.keys(), "stopping-rules",
}
RUNTIME_KEYS = {
    "model-envelope", "environment", "adapter", "persona-actor", "brief",
    "outcome", "policy",
}
CANONICAL_CALIBRATION_FLOOR = 0.8
OUTCOME_WEIGHTS = {
    "task-fit": 25,
    "capability-coverage": 25,
    "behavioral-completeness": 20,
    "safety-operability": 20,
    "minimality-actionability": 10,
}
TRAJECTORY_WEIGHTS = {
    "source-selection-grounding": 20,
    "source-capability-derivation": 25,
    "cluster-boundary-quality": 20,
    "building-block-topology": 20,
    "adaptation-efficiency": 15,
}
METHODS = {
    "structured-expert-repair", "textual-gradient-edit",
    "instruction-demo-search", "trace-pareto-search", "reflexion-lesson",
    "allowlisted-workflow-mutation",
}
DIGEST = re.compile(r"^sha256:[0-9a-f]{64}$")


class InvalidExperiment(ValueError):
    pass


class BlockedExperiment(ValueError):
    pass


def _receipt(data: dict[str, Any], state: str, reason: str, failures: Iterable[str] = (), **extra: Any) -> dict[str, Any]:
    result = {
        "schema_version": "1.0",
        "experiment_id": data.get("experiment_id", "UNKNOWN"),
        "candidate_version": data.get("candidate", {}).get("version") if isinstance(data.get("candidate"), dict) else None,
        "candidate_artifact_state": "CANDIDATE_ONLY",
        "state": state,
        "stop_reason": reason,
        "promotion_authorized": False,
        "failed_gates": list(failures),
    }
    result.update(extra)
    return result


def _canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def _sha_bytes(value: bytes) -> str:
    return "sha256:" + hashlib.sha256(value).hexdigest()


def _sha_file(path: Path) -> str:
    return _sha_bytes(path.read_bytes())


def _sha_json(value: Any) -> str:
    return _sha_bytes(_canonical_json(value))


def _sha_text(value: str) -> str:
    return _sha_bytes(value.encode("utf-8"))


def _require_object(value: Any, name: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise InvalidExperiment(f"{name} must be an object")
    return value


def _load_json(path: Path, name: str) -> dict[str, Any]:
    try:
        return _require_object(json.loads(path.read_text(encoding="utf-8")), name)
    except (OSError, json.JSONDecodeError) as exc:
        raise InvalidExperiment(f"cannot load {name}: {exc}") from exc


def _full_schema_validate(data: dict[str, Any], schema_path: Path) -> Any:
    try:
        import jsonschema  # type: ignore
    except ImportError as exc:
        raise InvalidExperiment("SCHEMA_VALIDATOR_UNAVAILABLE: install jsonschema to run the full Draft 2020-12 gate") from exc
    schema = _load_json(schema_path, "experiment schema")
    try:
        jsonschema.Draft202012Validator.check_schema(schema)
        validator = jsonschema.Draft202012Validator(schema)
        errors = sorted(validator.iter_errors(data), key=lambda item: tuple(str(part) for part in item.absolute_path))
    except jsonschema.SchemaError as exc:
        raise InvalidExperiment(f"INVALID_EXPERIMENT_SCHEMA:{exc.message}") from exc
    if errors:
        error = errors[0]
        location = ".".join(str(part) for part in error.absolute_path) or "$"
        raise InvalidExperiment(f"SCHEMA_VALIDATION_FAILED:{location}:{error.message}")
    return jsonschema


def _validate_canonical_bindings(data: dict[str, Any], jsonschema_module: Any) -> tuple[dict[str, Any], dict[str, Any], dict[str, int], dict[str, int], dict[str, Any]]:
    expected = _require_object(data["expected_bindings"], "expected_bindings")
    observed = _require_object(data["observed_bindings"], "observed_bindings")
    if set(expected) != BINDING_KEYS or set(observed) != BINDING_KEYS:
        raise InvalidExperiment("BINDING_CONTRACT_MISMATCH: exact frozen binding keys are required")
    if expected != observed:
        raise InvalidExperiment("STALE_BINDING: expected and observed binding digests differ")
    if any(not isinstance(value, str) or not DIGEST.fullmatch(value) for value in expected.values()):
        raise InvalidExperiment("BINDING_CONTRACT_MISMATCH: every binding must be a sha256 digest")

    if expected["claim"] != _sha_text(data["claim"]):
        raise InvalidExperiment("BINDING_CONTRACT_MISMATCH: claim digest")
    if expected["baseline"] != data["baseline"]["digest"]:
        raise InvalidExperiment("BINDING_CONTRACT_MISMATCH: baseline digest")
    if expected["candidate"] != data["candidate"]["patch_digest"]:
        raise InvalidExperiment("BINDING_CONTRACT_MISMATCH: candidate digest")
    if expected["stopping-rules"] != _sha_json(data["requirements"]):
        raise InvalidExperiment("BINDING_CONTRACT_MISMATCH: stopping-rules digest")
    for key, path in CANONICAL_FILES.items():
        if expected[key] != _sha_file(path):
            raise InvalidExperiment(f"STALE_BINDING: canonical {key} digest")

    split = _load_json(CANONICAL_FILES["split-manifest"], "split manifest")
    catalog = _load_json(CANONICAL_FILES["task-catalog"], "task catalog")
    judge_schema = _load_json(CANONICAL_FILES["judge-response-schema"], "judge response schema")
    judge_profiles = _load_json(CANONICAL_FILES["judge-profiles"], "judge profiles")
    budget_policy = _load_json(CANONICAL_FILES["budget-policy"], "budget policy")
    try:
        jsonschema_module.Draft202012Validator.check_schema(judge_schema)
    except jsonschema_module.SchemaError as exc:
        raise InvalidExperiment(f"INVALID_CANONICAL_JUDGE_SCHEMA:{exc.message}") from exc
    acceptance = _require_object(judge_profiles.get("acceptance"), "judge profile acceptance")
    requirements = data["requirements"]
    canonical_thresholds = {
        "minimum_quality": acceptance.get("minimum_normalized_score"),
        "minimum_dimension_rating": acceptance.get("minimum_dimension_rating"),
        "required_repetitions": _require_object(budget_policy.get("per_case"), "budget policy per_case").get("fresh_runs"),
    }
    for key, canonical_value in canonical_thresholds.items():
        if requirements.get(key) != canonical_value:
            raise InvalidExperiment(f"POLICY_THRESHOLD_MISMATCH:{key}")

    suite = _require_object(budget_policy.get("suite"), "budget policy suite")
    hard_maxima = {
        "runs": suite.get("max_total_runs"),
        "tokens": suite.get("max_total_tokens"),
        "cost": suite.get("max_cost_usd"),
        "wall_seconds": suite.get("max_wall_seconds"),
        "iterations": suite.get("max_iterations"),
        "candidates": suite.get("max_candidate_versions"),
    }
    hard_limits = _require_object(data["budgets"].get("hard_limits"), "budgets.hard_limits")
    for resource, maximum in hard_maxima.items():
        if not isinstance(maximum, (int, float)) or hard_limits.get(resource, math.inf) > maximum:
            raise InvalidExperiment(f"HARD_LIMIT_EXCEEDS_CANONICAL_MAX:{resource}")

    profiles = judge_profiles.get("profiles")
    if not isinstance(profiles, list):
        raise InvalidExperiment("INVALID_CANONICAL_JUDGE_PROFILES")
    weights: dict[str, dict[str, int]] = {}
    for profile in profiles:
        if not isinstance(profile, dict) or profile.get("id") not in ("architecture-outcome", "architecture-trajectory"):
            continue
        dimensions = profile.get("dimensions")
        if not isinstance(dimensions, list):
            raise InvalidExperiment("INVALID_CANONICAL_JUDGE_PROFILES")
        profile_weights = {
            item.get("id"): item.get("weight")
            for item in dimensions
            if isinstance(item, dict)
        }
        if len(profile_weights) != 5 or any(not isinstance(key, str) or not isinstance(value, int) for key, value in profile_weights.items()):
            raise InvalidExperiment("INVALID_CANONICAL_JUDGE_PROFILES")
        weights[profile["id"]] = profile_weights
    if weights.get("architecture-outcome") != OUTCOME_WEIGHTS or weights.get("architecture-trajectory") != TRAJECTORY_WEIGHTS:
        raise InvalidExperiment("CANONICAL_JUDGE_PROFILE_DRIFT")
    return split, catalog, weights["architecture-outcome"], weights["architecture-trajectory"], _require_object(budget_policy["per_case"], "budget policy per_case")


def _validate_runtime_evidence(data: dict[str, Any]) -> None:
    root = Path(data["evidence_root"])
    if not root.is_absolute():
        raise InvalidExperiment("RUNTIME_EVIDENCE_ROOT_NOT_ABSOLUTE")
    if not root.exists() or not root.is_dir():
        raise BlockedExperiment("MISSING_RUNTIME_EVIDENCE_ROOT")
    root = root.resolve()
    evidence = _require_object(data["runtime_evidence"], "runtime_evidence")
    if set(evidence) != RUNTIME_KEYS:
        raise InvalidExperiment("RUNTIME_EVIDENCE_CONTRACT_MISMATCH")
    for artifact_type, descriptor_value in evidence.items():
        descriptor = _require_object(descriptor_value, f"runtime_evidence.{artifact_type}")
        relative = Path(descriptor["relative_path"])
        if relative.is_absolute() or ".." in relative.parts:
            raise InvalidExperiment(f"RUNTIME_EVIDENCE_PATH_ESCAPE:{artifact_type}")
        artifact_path = (root / relative).resolve()
        try:
            artifact_path.relative_to(root)
        except ValueError as exc:
            raise InvalidExperiment(f"RUNTIME_EVIDENCE_PATH_ESCAPE:{artifact_type}") from exc
        if not artifact_path.exists() or not artifact_path.is_file():
            raise BlockedExperiment(f"MISSING_RUNTIME_EVIDENCE:{artifact_type}")
        actual_digest = _sha_file(artifact_path)
        if descriptor["digest"] != actual_digest:
            raise InvalidExperiment(f"RUNTIME_EVIDENCE_DIGEST_MISMATCH:{artifact_type}")
        if data["expected_bindings"][artifact_type] != actual_digest or data["observed_bindings"][artifact_type] != actual_digest:
            raise InvalidExperiment(f"RUNTIME_BINDING_MISMATCH:{artifact_type}")
        artifact = _load_json(artifact_path, f"runtime evidence {artifact_type}")
        if artifact.get("artifact_type") != artifact_type:
            raise InvalidExperiment(f"RUNTIME_ARTIFACT_TYPE_MISMATCH:{artifact_type}")
        if artifact.get("artifact_id") != descriptor["artifact_id"]:
            raise InvalidExperiment(f"RUNTIME_ARTIFACT_ID_MISMATCH:{artifact_type}")


def _validate_frozen_partitions(data: dict[str, Any], split: dict[str, Any], catalog: dict[str, Any]) -> dict[str, list[str]]:
    split_partitions = _require_object(split.get("partitions"), "split manifest partitions")
    experiment_partitions = _require_object(data["partitions"], "partitions")
    required_names = {"build", "validation", "sealed-promotion", "shadow-regression"}
    if set(split_partitions) != required_names or set(experiment_partitions) != required_names:
        raise InvalidExperiment("PARTITION_CONTRACT_MISMATCH: exact four partitions are required")
    catalog_ids = {case.get("id") for case in catalog.get("cases", []) if isinstance(case, dict)}
    result: dict[str, list[str]] = {}
    for name in sorted(required_names):
        canonical = _require_object(split_partitions[name], f"split.{name}")
        case_ids = canonical.get("case_ids")
        if not isinstance(case_ids, list) or not case_ids or any(not isinstance(case_id, str) for case_id in case_ids):
            raise InvalidExperiment(f"PARTITION_CONTRACT_MISMATCH: canonical {name} case IDs")
        if len(case_ids) != len(set(case_ids)) or not set(case_ids).issubset(catalog_ids):
            raise InvalidExperiment(f"PARTITION_CONTRACT_MISMATCH: unknown or duplicate canonical {name} case")
        frozen = _require_object(experiment_partitions[name], f"partitions.{name}")
        if frozen.get("case_ids") != case_ids or frozen.get("digest") != _sha_json(canonical):
            raise InvalidExperiment(f"PARTITION_CONTRACT_MISMATCH: frozen {name} coverage or digest")
        result[name] = case_ids
    return result


def _budget_exhausted(limits: dict[str, Any], used: dict[str, Any]) -> list[str]:
    if set(limits) != set(used):
        raise InvalidExperiment("budget limit and usage resources differ")
    failures: list[str] = []
    for resource, limit in limits.items():
        value = used[resource]
        if isinstance(limit, bool) or not isinstance(limit, (int, float)) or limit <= 0:
            raise InvalidExperiment(f"invalid budget limit for {resource}")
        if isinstance(value, bool) or not isinstance(value, (int, float)) or value <= 0:
            raise InvalidExperiment(f"invalid or zero budget usage for {resource}")
        if value >= limit:
            failures.append(resource)
    return failures


def _normalize_judge(judge: Any, profile: str, case_id: str, target_run_id: str, weights: dict[str, int], label: str, judge_validator: Any, minimum_quality: float, minimum_dimension: int) -> tuple[float, int, str]:
    if judge is None:
        raise InvalidExperiment(f"MISSING_JUDGE:{label}")
    judge = _require_object(judge, label)
    errors = sorted(judge_validator.iter_errors(judge), key=lambda item: tuple(str(part) for part in item.absolute_path))
    if errors:
        error = errors[0]
        location = ".".join(str(part) for part in error.absolute_path) or "$"
        raise InvalidExperiment(f"INVALID_JUDGE_SCHEMA:{label}:{location}:{error.message}")
    if judge["profile_id"] != profile or judge["profile_version"] != "1.0.0":
        raise InvalidExperiment(f"INVALID_JUDGE_PROFILE:{label}")
    if judge["case_id"] != case_id or judge["run_id"] != target_run_id:
        raise InvalidExperiment(f"INVALID_JUDGE_BINDING:{label}")
    leakage = judge["leakage_check"]
    if leakage["blind"] is not True or leakage["excluded_inputs_seen"]:
        raise InvalidExperiment(f"INVALID_JUDGE_LEAKAGE:{label}")

    normalized: dict[str, int] = {}
    for rating in judge["ratings"]:
        dimension = rating["dimension_id"]
        if dimension in normalized:
            raise InvalidExperiment(f"INVALID_JUDGE_DIMENSIONS:{label}:duplicate {dimension}")
        normalized[dimension] = rating["rating"]
    if set(normalized) != set(weights):
        raise InvalidExperiment(f"INVALID_JUDGE_DIMENSIONS:{label}")
    score = sum(weights[key] * normalized[key] / 4 for key in weights) / 100
    minimum_rating = min(normalized.values())
    canonical_verdict = "PASS" if score >= minimum_quality and minimum_rating >= minimum_dimension else "FAIL"
    if judge["verdict"] != canonical_verdict:
        raise InvalidExperiment(f"JUDGE_VERDICT_RATING_CONTRADICTION:{label}:{judge['verdict']}!={canonical_verdict}")
    return score, minimum_rating, judge["judge_id"]


def _side_quality(side: dict[str, Any], case_id: str, label: str, judge_validator: Any, outcome_weights: dict[str, int], trajectory_weights: dict[str, int], requirements: dict[str, Any], per_case_limits: dict[str, Any]) -> tuple[float, int]:
    if side.get("mechanical") != "PASS":
        raise InvalidExperiment(f"MECHANICAL_INELIGIBLE:{label}")
    target_run_id = side.get("target_run_id")
    outcome_score, outcome_min, outcome_judge = _normalize_judge(
        side.get("outcome"), "architecture-outcome", case_id, target_run_id,
        outcome_weights, f"{label}.outcome", judge_validator,
        requirements["minimum_quality"], requirements["minimum_dimension_rating"],
    )
    trajectory_score, trajectory_min, trajectory_judge = _normalize_judge(
        side.get("trajectory"), "architecture-trajectory", case_id,
        target_run_id, trajectory_weights, f"{label}.trajectory",
        judge_validator, requirements["minimum_quality"],
        requirements["minimum_dimension_rating"],
    )
    if outcome_judge == trajectory_judge:
        raise InvalidExperiment(f"NONINDEPENDENT_JUDGES:{label}")
    usage = _require_object(side.get("usage"), f"{label}.usage")
    for resource, value in usage.items():
        minimum = 0 if resource == "tool_calls" else 1
        if isinstance(value, bool) or not isinstance(value, (int, float)) or value < minimum:
            raise InvalidExperiment(f"INVALID_USAGE:{label}.{resource}")
    usage_ceilings = {
        "tokens": per_case_limits["max_target_tokens"],
        "cost": per_case_limits["max_cost_usd"],
        "wall_seconds": per_case_limits["max_wall_seconds"],
        "tool_calls": per_case_limits["max_target_tool_calls"],
        "turns": per_case_limits["max_target_turns"],
    }
    for resource, ceiling in usage_ceilings.items():
        if usage[resource] > ceiling:
            raise InvalidExperiment(f"PER_CASE_USAGE_EXCEEDED:{label}.{resource}")
    return min(outcome_score, trajectory_score), min(outcome_min, trajectory_min)


def _lower_bound(values: list[float]) -> float:
    mean = statistics.fmean(values)
    return mean - 1.96 * statistics.stdev(values) / math.sqrt(len(values)) if len(values) >= 2 else -math.inf


def _relative_improvement(baseline: list[float], candidate: list[float]) -> float:
    base = statistics.fmean(baseline)
    return (base - statistics.fmean(candidate)) / base if base > 0 else 0.0


def _analyze_comparisons(data: dict[str, Any], partition_cases: dict[str, list[str]], judge_validator: Any, outcome_weights: dict[str, int], trajectory_weights: dict[str, int], per_case_limits: dict[str, Any]) -> dict[str, Any]:
    requirements = data["requirements"]
    repetitions = requirements["required_repetitions"]
    expected_pairs = {
        (partition, case_id): set(range(1, repetitions + 1))
        for partition in ("validation", "sealed-promotion")
        for case_id in partition_cases[partition]
    }
    actual_pairs: dict[tuple[str, str], set[int]] = {}
    records: dict[str, list[dict[str, float]]] = {"validation": [], "sealed-promotion": []}
    seen_comparisons: set[tuple[str, str, int, Any]] = set()
    target_run_ids: set[str] = set()
    order_counts = {key: {"AB": 0, "BA": 0} for key in expected_pairs}
    absolute_failures: list[str] = []
    critical_regressions: list[str] = []
    missing_judges: list[str] = []
    aggregate_usage = {"runs": 0, "tokens": 0, "cost": 0.0, "wall_seconds": 0.0}

    for index, comparison in enumerate(data["comparisons"]):
        partition = comparison["partition"]
        case_id = comparison["case_id"]
        pair_key = (partition, case_id)
        if pair_key not in expected_pairs:
            raise InvalidExperiment(f"INVENTED_OR_WRONG_PARTITION_CASE:{partition}:{case_id}")
        repetition = comparison["repetition"]
        binding = (partition, case_id, repetition)
        if binding in seen_comparisons:
            raise InvalidExperiment(f"duplicate comparison repetition: {binding}")
        seen_comparisons.add(binding)
        actual_pairs.setdefault(pair_key, set()).add(repetition)
        order_counts[pair_key][comparison["order"]] += 1

        baseline = comparison["baseline"]
        candidate = comparison["candidate"]
        for side_name, side in (("baseline", baseline), ("candidate", candidate)):
            target_run_id = side["target_run_id"]
            if target_run_id in target_run_ids:
                raise InvalidExperiment(f"reused target run ID: {target_run_id}")
            target_run_ids.add(target_run_id)
        try:
            baseline_quality, _ = _side_quality(baseline, case_id, f"comparisons[{index}].baseline", judge_validator, outcome_weights, trajectory_weights, requirements, per_case_limits)
            candidate_quality, candidate_min = _side_quality(candidate, case_id, f"comparisons[{index}].candidate", judge_validator, outcome_weights, trajectory_weights, requirements, per_case_limits)
        except InvalidExperiment as exc:
            if str(exc).startswith("MISSING_JUDGE:"):
                missing_judges.append(str(exc).split(":", 1)[1])
                continue
            raise
        if candidate_quality < requirements["minimum_quality"] or candidate_min < requirements["minimum_dimension_rating"]:
            absolute_failures.append(f"{partition}:{case_id}:{repetition}")
        effect = candidate_quality - baseline_quality
        if comparison["critical_slice"] and effect < -requirements["noninferiority_margin"]:
            critical_regressions.append(f"{partition}:{case_id}:{repetition}")
        records[partition].append({
            "effect": effect,
            "baseline_cost": baseline["usage"]["cost"],
            "candidate_cost": candidate["usage"]["cost"],
            "baseline_latency": baseline["usage"]["latency_ms"],
            "candidate_latency": candidate["usage"]["latency_ms"],
        })
        for side in (baseline, candidate):
            aggregate_usage["runs"] += 1
            aggregate_usage["tokens"] += side["usage"]["tokens"]
            aggregate_usage["cost"] += side["usage"]["cost"]
            aggregate_usage["wall_seconds"] += side["usage"]["wall_seconds"]

    if missing_judges:
        return {"missing_judges": missing_judges}
    if actual_pairs != expected_pairs:
        raise InvalidExperiment("FROZEN_CASE_COVERAGE_MISMATCH")
    for key, counts in order_counts.items():
        if not all(counts.values()) or abs(counts["AB"] - counts["BA"]) > 1:
            raise InvalidExperiment(f"comparison order is not balanced for {key[0]}:{key[1]}")

    summary: dict[str, Any] = {
        "missing_judges": [],
        "absolute_failures": absolute_failures,
        "critical_regressions": critical_regressions,
        "aggregate_usage": aggregate_usage,
        "partitions": {},
    }
    for partition, items in records.items():
        effects = [item["effect"] for item in items]
        summary["partitions"][partition] = {
            "comparisons": len(items),
            "mean_effect": statistics.fmean(effects),
            "lower_95_effect": _lower_bound(effects),
            "cost_improvement": _relative_improvement([i["baseline_cost"] for i in items], [i["candidate_cost"] for i in items]),
            "latency_improvement": _relative_improvement([i["baseline_latency"] for i in items], [i["candidate_latency"] for i in items]),
        }
    return summary


def reduce_experiment(raw: Any, schema_path: Path | None = None) -> dict[str, Any]:
    data = raw if isinstance(raw, dict) else {}
    try:
        data = _require_object(raw, "experiment")
        schema_path = schema_path or DEFAULT_SCHEMA
        jsonschema_module = _full_schema_validate(data, schema_path)
        split, catalog, outcome_weights, trajectory_weights, per_case_limits = _validate_canonical_bindings(data, jsonschema_module)
        _validate_runtime_evidence(data)
        partition_cases = _validate_frozen_partitions(data, split, catalog)
        judge_schema = _load_json(CANONICAL_FILES["judge-response-schema"], "judge response schema")
        judge_validator = jsonschema_module.Draft202012Validator(judge_schema)
    except BlockedExperiment as exc:
        return _receipt(data, "BLOCKED", "BLOCKED", [str(exc)])
    except (InvalidExperiment, OSError, json.JSONDecodeError) as exc:
        message = str(exc)
        reason = "STALE_BINDING" if message.startswith("STALE_BINDING:") else "INVALID_SCHEMA"
        return _receipt(data, "INVALID", reason, [message])

    budgets = data["budgets"]
    try:
        hard = _budget_exhausted(budgets["hard_limits"], budgets["hard_used"])
        diagnostic = _budget_exhausted(budgets["diagnostic_limits"], budgets["diagnostic_used"])
    except InvalidExperiment as exc:
        return _receipt(data, "INVALID", "INVALID_SCHEMA", [str(exc)])
    execution = data["execution"]
    if execution["timed_out"]:
        return _receipt(data, "NOT_RUN", "TIMEOUT", ["execution_timeout"])
    if execution["status"] == "NOT_RUN":
        return _receipt(data, "NOT_RUN", "INCONCLUSIVE", ["execution_not_run"])
    if execution["status"] == "BLOCKED":
        return _receipt(data, "BLOCKED", "BLOCKED", ["execution_blocked"])

    integrity = data["integrity"]
    if not integrity["sealed_uncontaminated"]:
        return _receipt(data, "INVALID", "CONTAMINATED", ["sealed_partition_contaminated"])
    fixed = [name for name in ("thresholds_fixed", "budgets_fixed", "candidate_count_fixed", "rollback_defined") if not integrity[name]]
    if fixed:
        return _receipt(data, "INVALID", "INVALID_SCHEMA", [f"integrity:{name}" for name in fixed])

    mechanical = data["mechanical"]
    if mechanical["status"] == "BLOCKED":
        return _receipt(data, "BLOCKED", "BLOCKED", mechanical["failures"])
    if mechanical["status"] == "INVALID" or mechanical["failures"]:
        return _receipt(data, "INVALID", "INVALID_MECHANICAL", mechanical["failures"] or ["mechanical_ineligible"])

    calibration = data["calibration"]
    if calibration["minimum_accuracy"] != CANONICAL_CALIBRATION_FLOOR:
        return _receipt(data, "INVALID", "INVALID_SCHEMA", ["CALIBRATION_POLICY_MISMATCH"])
    if calibration["status"] != "PASS" or calibration["accuracy"] < CANONICAL_CALIBRATION_FLOOR:
        return _receipt(data, "INCONCLUSIVE", "CALIBRATION_FAILED", ["judge_calibration_failed_or_missing"])

    try:
        analysis = _analyze_comparisons(data, partition_cases, judge_validator, outcome_weights, trajectory_weights, per_case_limits)
    except InvalidExperiment as exc:
        message = str(exc)
        if message.startswith("MISSING_JUDGE:"):
            return _receipt(data, "INCONCLUSIVE", "MISSING_JUDGE", [message])
        return _receipt(data, "INVALID", "INVALID_SCHEMA", [message])
    if analysis["missing_judges"]:
        return _receipt(data, "INCONCLUSIVE", "MISSING_JUDGE", [f"missing_judge:{item}" for item in analysis["missing_judges"]], analysis=analysis)
    hard_used = data["budgets"]["hard_used"]
    underreported = [
        resource for resource, observed in analysis["aggregate_usage"].items()
        if hard_used[resource] + 1e-9 < observed
    ]
    if hard_used["iterations"] < 1 or hard_used["candidates"] < 1:
        underreported.extend([resource for resource in ("iterations", "candidates") if hard_used[resource] < 1])
    if underreported:
        return _receipt(data, "INVALID", "INVALID_USAGE_RECONCILIATION", [f"underreported:{resource}" for resource in underreported], analysis=analysis)
    if hard:
        return _receipt(data, "INCONCLUSIVE", "HARD_BUDGET_EXHAUSTED", [f"hard_budget:{key}" for key in hard], analysis=analysis)
    if diagnostic:
        return _receipt(data, "INCONCLUSIVE", "DIAGNOSTIC_BUDGET_EXHAUSTED", [f"diagnostic_budget:{key}" for key in diagnostic], analysis=analysis)
    if analysis["critical_regressions"]:
        return _receipt(data, "REJECTED", "REGRESSION", analysis["critical_regressions"], analysis=analysis)
    if analysis["absolute_failures"]:
        return _receipt(data, "REJECTED", "NO_IMPROVEMENT", analysis["absolute_failures"], analysis=analysis)

    req = data["requirements"]
    accepted_partitions: list[str] = []
    regressed_partitions: list[str] = []
    for partition, summary in analysis["partitions"].items():
        effect_pass = summary["lower_95_effect"] >= req["minimum_effect"]
        noninferior = summary["lower_95_effect"] >= -req["noninferiority_margin"]
        efficiency_pass = summary["cost_improvement"] >= req["material_cost_improvement"] or summary["latency_improvement"] >= req["material_latency_improvement"]
        if summary["lower_95_effect"] < -req["noninferiority_margin"]:
            regressed_partitions.append(partition)
        if effect_pass or (noninferior and efficiency_pass):
            accepted_partitions.append(partition)
    if regressed_partitions:
        return _receipt(data, "REJECTED", "REGRESSION", [f"partition:{partition}" for partition in regressed_partitions], analysis=analysis)
    if set(accepted_partitions) != {"validation", "sealed-promotion"}:
        return _receipt(data, "REJECTED", "NO_IMPROVEMENT", ["effect_or_efficiency_gate_not_met"], analysis=analysis)
    return _receipt(data, "ACCEPTED_TO_STAGING", "TARGET_MET", [], analysis=analysis)


def _self_test() -> bool:
    return abs(_lower_bound([0.1, 0.1, 0.1]) - 0.1) < 1e-12 and _relative_improvement([10, 10], [8, 8]) == 0.2


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("experiment", nargs="?", type=Path)
    parser.add_argument("--schema", type=Path, default=DEFAULT_SCHEMA)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        ok = _self_test()
        print(json.dumps({"self_test": "PASS" if ok else "FAIL"}))
        return 0 if ok else 1
    if args.experiment is None:
        parser.error("experiment is required unless --self-test is used")
    try:
        data = json.loads(args.experiment.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(json.dumps(_receipt({}, "INVALID", "INVALID_SCHEMA", [str(exc)]), indent=2, sort_keys=True))
        return 2
    result = reduce_experiment(data, args.schema)
    rendered = json.dumps(result, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)
    return 0 if result["state"] == "ACCEPTED_TO_STAGING" else 1


if __name__ == "__main__":
    raise SystemExit(main())
