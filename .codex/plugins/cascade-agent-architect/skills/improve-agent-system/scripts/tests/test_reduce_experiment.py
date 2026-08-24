from __future__ import annotations

import builtins
import copy
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT_DIR = Path(__file__).resolve().parents[1]
SKILL_DIR = SCRIPT_DIR.parent
EVAL_REFERENCES = SKILL_DIR.parent / "evaluate-agent-system" / "references"
sys.path.insert(0, str(SCRIPT_DIR))

from reduce_experiment import reduce_experiment  # noqa: E402


OUTCOME_DIMENSIONS = (
    "task-fit",
    "capability-coverage",
    "behavioral-completeness",
    "safety-operability",
    "minimality-actionability",
)
TRAJECTORY_DIMENSIONS = (
    "source-selection-grounding",
    "source-capability-derivation",
    "cluster-boundary-quality",
    "building-block-topology",
    "adaptation-efficiency",
)
CANONICAL_FILES = {
    "task-catalog": EVAL_REFERENCES / "task-catalog.json",
    "split-manifest": EVAL_REFERENCES / "split-manifest.json",
    "outcome-rubric": EVAL_REFERENCES / "rubrics" / "outcome-v1.md",
    "trajectory-rubric": EVAL_REFERENCES / "rubrics" / "trajectory-v1.md",
    "judge-profiles": EVAL_REFERENCES / "judge-profiles.json",
    "judge-response-schema": EVAL_REFERENCES / "judge-response.schema.json",
    "budget-policy": EVAL_REFERENCES / "budgets.json",
}
RUNTIME_KEYS = (
    "model-envelope",
    "environment",
    "adapter",
    "persona-actor",
    "brief",
    "outcome",
    "policy",
)
TEMP_EVIDENCE = tempfile.TemporaryDirectory(prefix="cascade-agent-architect-evidence-")


def canonical_json(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def digest_bytes(value: bytes) -> str:
    return "sha256:" + hashlib.sha256(value).hexdigest()


def digest_text(value: str) -> str:
    return digest_bytes(value.encode("utf-8"))


def judge(kind: str, case_id: str, target_run_id: str, side_name: str, index: int, rating: int) -> dict:
    dimensions = OUTCOME_DIMENSIONS if kind == "outcome" else TRAJECTORY_DIMENSIONS
    profile = "architecture-outcome" if kind == "outcome" else "architecture-trajectory"
    return {
        "profile_id": profile,
        "profile_version": "1.0.0",
        "case_id": case_id,
        "run_id": target_run_id,
        "judge_id": f"{profile}-{side_name}-{index}",
        "ratings": [
            {
                "dimension_id": dimension,
                "rating": rating,
                "evidence": [f"trace://{target_run_id}/{dimension}"],
                "rationale": f"Evidence supports rating {rating} for {dimension}.",
            }
            for dimension in dimensions
        ],
        "verdict": "PASS" if rating >= 4 else "FAIL",
        "uncertainty": "Low; grounded in the frozen trace.",
        "leakage_check": {
            "blind": True,
            "blind_to_expected": True,
            "blind_to_peer": True,
            "excluded_inputs_seen": [],
        },
    }


def side(name: str, case_id: str, index: int, rating: int, cost: float = 5.0, latency: float = 1000.0) -> dict:
    target_run_id = f"target-{name}-{index}"
    return {
        "target_run_id": target_run_id,
        "mechanical": "PASS",
        "outcome": judge("outcome", case_id, target_run_id, name, index, rating),
        "trajectory": judge("trajectory", case_id, target_run_id, name, index, rating),
        "usage": {
            "tokens": 1000,
            "cost": cost,
            "latency_ms": latency,
            "wall_seconds": 5.0,
            "tool_calls": 1,
            "turns": 2,
        },
    }


def valid_experiment() -> dict:
    claim = "Improve architecture quality"
    requirements = {
        "required_repetitions": 3,
        "minimum_quality": 0.8,
        "minimum_dimension_rating": 2,
        "minimum_effect": 0.05,
        "noninferiority_margin": 0.02,
        "material_cost_improvement": 0.1,
        "material_latency_improvement": 0.1,
    }
    split = json.loads((EVAL_REFERENCES / "split-manifest.json").read_text(encoding="utf-8"))
    partitions = {
        name: {
            "digest": digest_bytes(canonical_json(partition)),
            "case_ids": partition["case_ids"],
        }
        for name, partition in split["partitions"].items()
    }
    comparisons = []
    index = 0
    for partition in ("validation", "sealed-promotion"):
        for case_id in split["partitions"][partition]["case_ids"]:
            for repetition in range(1, 4):
                index += 1
                comparisons.append({
                    "partition": partition,
                    "case_id": case_id,
                    "repetition": repetition,
                    "order": "AB" if repetition % 2 else "BA",
                    "seed": f"seed-{index}",
                    "critical_slice": True,
                    "baseline": side("baseline", case_id, index, 3),
                    "candidate": side("candidate", case_id, index, 4, cost=4.5, latency=950.0),
                })
    baseline_digest = digest_text("baseline-v1 artifact")
    candidate_digest = digest_text("candidate-v1 patch")
    bindings = {
        "claim": digest_text(claim),
        "baseline": baseline_digest,
        "candidate": candidate_digest,
        "stopping-rules": digest_bytes(canonical_json(requirements)),
    }
    bindings.update({name: digest_bytes(path.read_bytes()) for name, path in CANONICAL_FILES.items()})
    evidence_root = Path(TEMP_EVIDENCE.name)
    runtime_evidence = {}
    for artifact_type in RUNTIME_KEYS:
        relative_path = Path("runtime") / f"{artifact_type}.json"
        artifact_path = evidence_root / relative_path
        artifact_path.parent.mkdir(parents=True, exist_ok=True)
        artifact_id = f"test-{artifact_type}-v1"
        artifact_path.write_text(
            json.dumps({"artifact_type": artifact_type, "artifact_id": artifact_id, "payload": {"test": True}}, sort_keys=True),
            encoding="utf-8",
        )
        artifact_digest = digest_bytes(artifact_path.read_bytes())
        bindings[artifact_type] = artifact_digest
        runtime_evidence[artifact_type] = {
            "relative_path": str(relative_path),
            "artifact_type": artifact_type,
            "artifact_id": artifact_id,
            "digest": artifact_digest,
        }
    return {
        "schema_version": "1.0",
        "experiment_id": "EXP-test",
        "claim": claim,
        "baseline": {"version": "baseline-v1", "digest": baseline_digest},
        "candidate": {
            "version": "candidate-v1",
            "parent_version": "baseline-v1",
            "method": "structured-expert-repair",
            "hypothesis": "A localized contract repair improves measured quality",
            "patch_path": "artifacts/EXP-test/candidate.patch",
            "patch_digest": candidate_digest,
            "rollback_ref": "baseline-v1",
            "artifact_state": "CANDIDATE_ONLY",
        },
        "expected_bindings": copy.deepcopy(bindings),
        "observed_bindings": copy.deepcopy(bindings),
        "evidence_root": str(evidence_root),
        "runtime_evidence": runtime_evidence,
        "partitions": partitions,
        "integrity": {
            "sealed_uncontaminated": True,
            "thresholds_fixed": True,
            "budgets_fixed": True,
            "candidate_count_fixed": True,
            "rollback_defined": True,
        },
        "execution": {"status": "COMPLETE", "timed_out": False},
        "mechanical": {"status": "PASS", "failures": []},
        "calibration": {"status": "PASS", "accuracy": 0.9, "minimum_accuracy": 0.8, "corpus_digest": digest_text("calibration")},
        "requirements": requirements,
        "budgets": {
            "hard_limits": {"runs": 100, "tokens": 100000, "cost": 200.0, "wall_seconds": 7200, "iterations": 3, "candidates": 5},
            "hard_used": {"runs": 24, "tokens": 24000, "cost": 114.0, "wall_seconds": 120, "iterations": 1, "candidates": 1},
            "diagnostic_limits": {"runs": 20, "tokens": 20000, "cost": 20.0, "wall_seconds": 1800},
            "diagnostic_used": {"runs": 2, "tokens": 2000, "cost": 2.0, "wall_seconds": 60},
        },
        "comparisons": comparisons,
    }


class ReducerTests(unittest.TestCase):
    def test_accepts_canonical_evidence_only_to_staging(self) -> None:
        receipt = reduce_experiment(valid_experiment())
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("ACCEPTED_TO_STAGING", "TARGET_MET"))
        self.assertFalse(receipt["promotion_authorized"])
        self.assertEqual(receipt["candidate_artifact_state"], "CANDIDATE_ONLY")

    def test_rejects_regression(self) -> None:
        experiment = valid_experiment()
        for index, comparison in enumerate(experiment["comparisons"], 1):
            case_id = comparison["case_id"]
            comparison["baseline"] = side("baseline-reg", case_id, index, 4)
            comparison["candidate"] = side("candidate-reg", case_id, index, 3, cost=4.5)
        receipt = reduce_experiment(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("REJECTED", "REGRESSION"))

    def test_missing_judge_is_inconclusive(self) -> None:
        experiment = valid_experiment()
        experiment["comparisons"][0]["candidate"]["outcome"] = None
        receipt = reduce_experiment(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INCONCLUSIVE", "MISSING_JUDGE"))

    def test_stale_binding_is_invalid(self) -> None:
        experiment = valid_experiment()
        experiment["observed_bindings"]["policy"] = digest_text("changed-policy")
        receipt = reduce_experiment(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INVALID", "STALE_BINDING"))

    def test_timeout_is_not_run(self) -> None:
        experiment = valid_experiment()
        experiment["execution"] = {"status": "NOT_RUN", "timed_out": True}
        receipt = reduce_experiment(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("NOT_RUN", "TIMEOUT"))

    def test_explicit_not_run_stays_not_run(self) -> None:
        experiment = valid_experiment()
        experiment["execution"] = {"status": "NOT_RUN", "timed_out": False}
        self.assertEqual(reduce_experiment(experiment)["state"], "NOT_RUN")

    def test_hard_budget_is_fail_closed(self) -> None:
        experiment = valid_experiment()
        experiment["budgets"]["hard_used"]["runs"] = experiment["budgets"]["hard_limits"]["runs"]
        receipt = reduce_experiment(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INCONCLUSIVE", "HARD_BUDGET_EXHAUSTED"))

    def test_diagnostic_budget_is_fail_closed(self) -> None:
        experiment = valid_experiment()
        experiment["budgets"]["diagnostic_used"]["tokens"] = experiment["budgets"]["diagnostic_limits"]["tokens"]
        receipt = reduce_experiment(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INCONCLUSIVE", "DIAGNOSTIC_BUDGET_EXHAUSTED"))

    def test_full_schema_validator_unavailable_fails_closed(self) -> None:
        original_import = builtins.__import__

        def reject_jsonschema(name: str, *args: object, **kwargs: object) -> object:
            if name == "jsonschema":
                raise ImportError("simulated unavailable validator")
            return original_import(name, *args, **kwargs)

        with patch("builtins.__import__", side_effect=reject_jsonschema):
            receipt = reduce_experiment(valid_experiment())
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INVALID", "INVALID_SCHEMA"))
        self.assertIn("SCHEMA_VALIDATOR_UNAVAILABLE", receipt["failed_gates"][0])

    def test_schema_forbidden_field_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["automatic_promotion"] = True
        receipt = reduce_experiment(experiment)
        self.assertEqual(receipt["state"], "INVALID")

    def test_matching_fake_canonical_bindings_cannot_accept(self) -> None:
        experiment = valid_experiment()
        fake = digest_text("fake-task-catalog")
        experiment["expected_bindings"]["task-catalog"] = fake
        experiment["observed_bindings"]["task-catalog"] = fake
        receipt = reduce_experiment(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INVALID", "STALE_BINDING"))

    def test_fake_runtime_digest_cannot_accept(self) -> None:
        experiment = valid_experiment()
        fake = digest_text("fake-runtime-adapter")
        experiment["runtime_evidence"]["adapter"]["digest"] = fake
        experiment["expected_bindings"]["adapter"] = fake
        experiment["observed_bindings"]["adapter"] = fake
        receipt = reduce_experiment(experiment)
        self.assertEqual(receipt["state"], "INVALID")
        self.assertTrue(any("RUNTIME_EVIDENCE_DIGEST_MISMATCH:adapter" in gate for gate in receipt["failed_gates"]))

    def test_missing_runtime_evidence_file_is_blocked(self) -> None:
        experiment = valid_experiment()
        experiment["runtime_evidence"]["policy"]["relative_path"] = "runtime/missing-policy.json"
        receipt = reduce_experiment(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("BLOCKED", "BLOCKED"))

    def test_self_signed_lower_quality_threshold_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["requirements"]["minimum_quality"] = 0
        signed = digest_bytes(canonical_json(experiment["requirements"]))
        experiment["expected_bindings"]["stopping-rules"] = signed
        experiment["observed_bindings"]["stopping-rules"] = signed
        receipt = reduce_experiment(experiment)
        self.assertEqual(receipt["state"], "INVALID")
        self.assertTrue(any("POLICY_THRESHOLD_MISMATCH:minimum_quality" in gate for gate in receipt["failed_gates"]))

    def test_self_signed_lower_dimension_threshold_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["requirements"]["minimum_dimension_rating"] = 0
        signed = digest_bytes(canonical_json(experiment["requirements"]))
        experiment["expected_bindings"]["stopping-rules"] = signed
        experiment["observed_bindings"]["stopping-rules"] = signed
        receipt = reduce_experiment(experiment)
        self.assertEqual(receipt["state"], "INVALID")
        self.assertTrue(any("POLICY_THRESHOLD_MISMATCH:minimum_dimension_rating" in gate for gate in receipt["failed_gates"]))

    def test_lowered_repetition_count_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["requirements"]["required_repetitions"] = 2
        signed = digest_bytes(canonical_json(experiment["requirements"]))
        experiment["expected_bindings"]["stopping-rules"] = signed
        experiment["observed_bindings"]["stopping-rules"] = signed
        receipt = reduce_experiment(experiment)
        self.assertEqual(receipt["state"], "INVALID")

    def test_oversized_hard_limit_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["budgets"]["hard_limits"]["runs"] = 121
        receipt = reduce_experiment(experiment)
        self.assertEqual(receipt["state"], "INVALID")
        self.assertTrue(any("HARD_LIMIT_EXCEEDS_CANONICAL_MAX:runs" in gate for gate in receipt["failed_gates"]))

    def test_invented_case_id_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["comparisons"][0]["case_id"] = "invented-easy-case"
        receipt = reduce_experiment(experiment)
        self.assertEqual(receipt["state"], "INVALID")

    def test_missing_frozen_case_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["comparisons"].pop()
        receipt = reduce_experiment(experiment)
        self.assertEqual(receipt["state"], "INVALID")

    def test_zero_usage_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["comparisons"][0]["candidate"]["usage"]["tokens"] = 0
        receipt = reduce_experiment(experiment)
        self.assertEqual(receipt["state"], "INVALID")

    def test_zero_budget_usage_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["budgets"]["hard_used"]["cost"] = 0
        receipt = reduce_experiment(experiment)
        self.assertEqual(receipt["state"], "INVALID")

    def test_huge_per_side_usage_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["comparisons"][0]["candidate"]["usage"]["tokens"] = 30001
        receipt = reduce_experiment(experiment)
        self.assertEqual(receipt["state"], "INVALID")
        self.assertTrue(any("PER_CASE_USAGE_EXCEEDED" in gate for gate in receipt["failed_gates"]))

    def test_underreported_aggregate_usage_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["budgets"]["hard_used"]["tokens"] = 23999
        receipt = reduce_experiment(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INVALID", "INVALID_USAGE_RECONCILIATION"))

    def test_evidence_free_legacy_judge_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["comparisons"][0]["candidate"]["outcome"] = {
            "status": "COMPLETE",
            "run_id": "legacy",
            "identity": "legacy",
            "blind_to_expected": True,
            "blind_to_peer": True,
            "ratings": {dimension: 4 for dimension in OUTCOME_DIMENSIONS},
        }
        receipt = reduce_experiment(experiment)
        self.assertEqual(receipt["state"], "INVALID")

    def test_high_ratings_with_fail_verdict_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["comparisons"][0]["candidate"]["outcome"]["verdict"] = "FAIL"
        receipt = reduce_experiment(experiment)
        self.assertEqual(receipt["state"], "INVALID")
        self.assertTrue(any("JUDGE_VERDICT_RATING_CONTRADICTION" in gate for gate in receipt["failed_gates"]))

    def test_zero_over_zero_calibration_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["calibration"]["accuracy"] = 0
        experiment["calibration"]["minimum_accuracy"] = 0
        receipt = reduce_experiment(experiment)
        self.assertEqual(receipt["state"], "INVALID")

    def test_judge_leakage_cannot_accept(self) -> None:
        experiment = valid_experiment()
        judge_record = experiment["comparisons"][0]["candidate"]["outcome"]
        judge_record["leakage_check"]["excluded_inputs_seen"] = ["acceptance threshold"]
        receipt = reduce_experiment(experiment)
        self.assertEqual(receipt["state"], "INVALID")

    def test_invalid_mechanical_evidence_stays_invalid(self) -> None:
        experiment = valid_experiment()
        experiment["mechanical"] = {"status": "INVALID", "failures": ["trace digest mismatch"]}
        receipt = reduce_experiment(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INVALID", "INVALID_MECHANICAL"))

    def test_legacy_mechanical_fail_state_is_schema_invalid(self) -> None:
        experiment = valid_experiment()
        experiment["mechanical"] = {"status": "FAIL", "failures": ["legacy state"]}
        receipt = reduce_experiment(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INVALID", "INVALID_SCHEMA"))

    def test_input_is_not_mutated(self) -> None:
        experiment = valid_experiment()
        original = copy.deepcopy(experiment)
        reduce_experiment(experiment)
        self.assertEqual(experiment, original)


if __name__ == "__main__":
    unittest.main()
