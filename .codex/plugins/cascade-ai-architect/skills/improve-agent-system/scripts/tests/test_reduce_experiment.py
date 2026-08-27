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
EVAL_REFERENCES = SKILL_DIR.parent / "prepare-agent-evaluation" / "references"
sys.path.insert(0, str(SCRIPT_DIR))

from reduce_experiment import reduce_experiment  # noqa: E402


CANONICAL_FILES = {
    "task-catalog": EVAL_REFERENCES / "task-catalog.json",
    "split-manifest": EVAL_REFERENCES / "split-manifest.json",
    "outcome-rubric": EVAL_REFERENCES / "rubrics" / "outcome-v1.md",
    "trajectory-rubric": EVAL_REFERENCES / "rubrics" / "trajectory-v1.md",
    "judge-profiles": EVAL_REFERENCES / "judge-profiles.json",
    "budget-policy": EVAL_REFERENCES / "budgets.json",
}
EVALUATION_RECEIPT_SCHEMA = (
    SKILL_DIR.parents[2]
    / "cascade-evals"
    / "skills"
    / "evaluate"
    / "references"
    / "evaluation-receipt.schema.json"
)
RUNTIME_KEYS = (
    "model-envelope",
    "environment",
    "adapter",
    "persona-actor",
    "brief",
    "outcome",
    "policy",
)
TEMP_EVIDENCE = tempfile.TemporaryDirectory(prefix="cascade-ai-architect-evidence-")


def canonical_json(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def digest_bytes(value: bytes) -> str:
    return "sha256:" + hashlib.sha256(value).hexdigest()


def digest_text(value: str) -> str:
    return digest_bytes(value.encode("utf-8"))


def side(
    name: str,
    case_id: str,
    index: int,
    rating: int,
    subject_digest: str,
    cost: float = 5.0,
    latency: float = 1000.0,
) -> dict:
    target_run_id = f"target-{name}-{index}"
    score = rating / 4
    passed = score >= 0.95 and rating >= 3
    judgments = [
        {
            "profile_id": profile,
            "profile_version": 1,
            "judge_identity": f"{profile}-{name}-{index}",
            "judge_context_id": f"context-{profile}-{name}-{index}",
            "score": score,
            "verdict": "PASS" if passed else "FAIL",
        }
        for profile in ("architecture-outcome", "architecture-trajectory")
    ]
    receipt = {
        "schema_version": 1,
        "evaluation_id": target_run_id,
        "bundle_sha256": "a" * 64,
        "subject": {
            "kind": "agent",
            "id": f"agent-architecture-{case_id}",
            "version": name,
            "digest": subject_digest.removeprefix("sha256:"),
        },
        "models": {
            "builder_model": "gpt-5.6-sol",
            "builder_reasoning_effort": "max",
            "target_model": "gpt-5.6-sol",
            "target_reasoning_effort": "max",
            "judge_model": "gpt-5.6-sol",
            "judge_reasoning_effort": "max",
            "explicit_comparison": True,
        },
        "mechanical_status": "PASS",
        "judgments": judgments,
        "conservative_score": score,
        "overall_status": "PASS" if passed else "FAIL",
        "evidence": [],
    }
    relative_path = Path("receipts") / f"{target_run_id}.json"
    receipt_path = Path(TEMP_EVIDENCE.name) / relative_path
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, sort_keys=True), encoding="utf-8")
    return {
        "target_run_id": target_run_id,
        "evaluation_receipt": {
            "relative_path": str(relative_path),
            "evaluation_id": target_run_id,
            "digest": digest_bytes(receipt_path.read_bytes()),
        },
        "usage": {
            "tokens": 1000,
            "cost": cost,
            "latency_ms": latency,
            "wall_seconds": 5.0,
            "tool_calls": 1,
            "turns": 2,
        },
    }


def reduce(experiment: dict) -> dict:
    return reduce_experiment(
        experiment, evaluation_receipt_schema_path=EVALUATION_RECEIPT_SCHEMA
    )


def mutate_receipt(side_record: dict, callback) -> None:
    descriptor = side_record["evaluation_receipt"]
    path = Path(TEMP_EVIDENCE.name) / descriptor["relative_path"]
    value = json.loads(path.read_text(encoding="utf-8"))
    callback(value)
    path.write_text(json.dumps(value, sort_keys=True), encoding="utf-8")
    descriptor["digest"] = digest_bytes(path.read_bytes())


def valid_experiment() -> dict:
    claim = "Improve architecture quality"
    baseline_digest = digest_text("baseline-v1 artifact")
    candidate_digest = digest_text("candidate-v1 patch")
    requirements = {
        "required_repetitions": 3,
        "minimum_quality": 0.95,
        "minimum_dimension_rating": 3,
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
                    "baseline": side("baseline", case_id, index, 3, baseline_digest),
                    "candidate": side(
                        "candidate",
                        case_id,
                        index,
                        4,
                        candidate_digest,
                        cost=4.5,
                        latency=950.0,
                    ),
                })
    bindings = {
        "claim": digest_text(claim),
        "baseline": baseline_digest,
        "candidate": candidate_digest,
        "stopping-rules": digest_bytes(canonical_json(requirements)),
    }
    bindings.update({name: digest_bytes(path.read_bytes()) for name, path in CANONICAL_FILES.items()})
    bindings["evaluation-receipt-schema"] = digest_bytes(
        EVALUATION_RECEIPT_SCHEMA.read_bytes()
    )
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
        receipt = reduce(valid_experiment())
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("ACCEPTED_TO_STAGING", "TARGET_MET"))
        self.assertFalse(receipt["promotion_authorized"])
        self.assertEqual(receipt["candidate_artifact_state"], "CANDIDATE_ONLY")

    def test_rejects_regression(self) -> None:
        experiment = valid_experiment()
        for index, comparison in enumerate(experiment["comparisons"], 1):
            case_id = comparison["case_id"]
            comparison["baseline"] = side(
                "baseline-reg", case_id, index, 4, experiment["baseline"]["digest"]
            )
            comparison["candidate"] = side(
                "candidate-reg",
                case_id,
                index,
                3,
                experiment["candidate"]["patch_digest"],
                cost=4.5,
            )
        receipt = reduce(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("REJECTED", "REGRESSION"))

    def test_missing_evaluation_receipt_is_inconclusive(self) -> None:
        experiment = valid_experiment()
        experiment["comparisons"][0]["candidate"]["evaluation_receipt"] = None
        receipt = reduce(experiment)
        self.assertEqual(
            (receipt["state"], receipt["stop_reason"]),
            ("INCONCLUSIVE", "MISSING_EVALUATION_RECEIPT"),
        )

    def test_stale_binding_is_invalid(self) -> None:
        experiment = valid_experiment()
        experiment["observed_bindings"]["policy"] = digest_text("changed-policy")
        receipt = reduce(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INVALID", "STALE_BINDING"))

    def test_timeout_is_not_run(self) -> None:
        experiment = valid_experiment()
        experiment["execution"] = {"status": "NOT_RUN", "timed_out": True}
        receipt = reduce(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("NOT_RUN", "TIMEOUT"))

    def test_explicit_not_run_stays_not_run(self) -> None:
        experiment = valid_experiment()
        experiment["execution"] = {"status": "NOT_RUN", "timed_out": False}
        self.assertEqual(reduce(experiment)["state"], "NOT_RUN")

    def test_hard_budget_is_fail_closed(self) -> None:
        experiment = valid_experiment()
        experiment["budgets"]["hard_used"]["runs"] = experiment["budgets"]["hard_limits"]["runs"]
        receipt = reduce(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INCONCLUSIVE", "HARD_BUDGET_EXHAUSTED"))

    def test_diagnostic_budget_is_fail_closed(self) -> None:
        experiment = valid_experiment()
        experiment["budgets"]["diagnostic_used"]["tokens"] = experiment["budgets"]["diagnostic_limits"]["tokens"]
        receipt = reduce(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INCONCLUSIVE", "DIAGNOSTIC_BUDGET_EXHAUSTED"))

    def test_full_schema_validator_unavailable_fails_closed(self) -> None:
        original_import = builtins.__import__

        def reject_jsonschema(name: str, *args: object, **kwargs: object) -> object:
            if name == "jsonschema":
                raise ImportError("simulated unavailable validator")
            return original_import(name, *args, **kwargs)

        with patch("builtins.__import__", side_effect=reject_jsonschema):
            receipt = reduce(valid_experiment())
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INVALID", "INVALID_SCHEMA"))
        self.assertIn("SCHEMA_VALIDATOR_UNAVAILABLE", receipt["failed_gates"][0])

    def test_schema_forbidden_field_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["automatic_promotion"] = True
        self.assertEqual(reduce(experiment)["state"], "INVALID")

    def test_matching_fake_canonical_bindings_cannot_accept(self) -> None:
        experiment = valid_experiment()
        fake = digest_text("fake-task-catalog")
        experiment["expected_bindings"]["task-catalog"] = fake
        experiment["observed_bindings"]["task-catalog"] = fake
        receipt = reduce(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INVALID", "STALE_BINDING"))

    def test_fake_evaluation_schema_binding_cannot_accept(self) -> None:
        experiment = valid_experiment()
        fake = digest_text("fake-receipt-schema")
        experiment["expected_bindings"]["evaluation-receipt-schema"] = fake
        experiment["observed_bindings"]["evaluation-receipt-schema"] = fake
        receipt = reduce(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INVALID", "STALE_BINDING"))

    def test_fake_runtime_digest_cannot_accept(self) -> None:
        experiment = valid_experiment()
        fake = digest_text("fake-runtime-adapter")
        experiment["runtime_evidence"]["adapter"]["digest"] = fake
        experiment["expected_bindings"]["adapter"] = fake
        experiment["observed_bindings"]["adapter"] = fake
        receipt = reduce(experiment)
        self.assertEqual(receipt["state"], "INVALID")
        self.assertTrue(any("RUNTIME_EVIDENCE_DIGEST_MISMATCH:adapter" in gate for gate in receipt["failed_gates"]))

    def test_missing_runtime_evidence_file_is_blocked(self) -> None:
        experiment = valid_experiment()
        experiment["runtime_evidence"]["policy"]["relative_path"] = "runtime/missing-policy.json"
        receipt = reduce(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("BLOCKED", "BLOCKED"))

    def test_self_signed_lower_quality_threshold_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["requirements"]["minimum_quality"] = 0
        signed = digest_bytes(canonical_json(experiment["requirements"]))
        experiment["expected_bindings"]["stopping-rules"] = signed
        experiment["observed_bindings"]["stopping-rules"] = signed
        receipt = reduce(experiment)
        self.assertEqual(receipt["state"], "INVALID")
        self.assertTrue(any("POLICY_THRESHOLD_MISMATCH:minimum_quality" in gate for gate in receipt["failed_gates"]))

    def test_self_signed_lower_dimension_threshold_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["requirements"]["minimum_dimension_rating"] = 0
        signed = digest_bytes(canonical_json(experiment["requirements"]))
        experiment["expected_bindings"]["stopping-rules"] = signed
        experiment["observed_bindings"]["stopping-rules"] = signed
        receipt = reduce(experiment)
        self.assertEqual(receipt["state"], "INVALID")
        self.assertTrue(any("POLICY_THRESHOLD_MISMATCH:minimum_dimension_rating" in gate for gate in receipt["failed_gates"]))

    def test_lowered_repetition_count_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["requirements"]["required_repetitions"] = 2
        signed = digest_bytes(canonical_json(experiment["requirements"]))
        experiment["expected_bindings"]["stopping-rules"] = signed
        experiment["observed_bindings"]["stopping-rules"] = signed
        self.assertEqual(reduce(experiment)["state"], "INVALID")

    def test_oversized_hard_limit_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["budgets"]["hard_limits"]["runs"] = 121
        receipt = reduce(experiment)
        self.assertEqual(receipt["state"], "INVALID")
        self.assertTrue(any("HARD_LIMIT_EXCEEDS_CANONICAL_MAX:runs" in gate for gate in receipt["failed_gates"]))

    def test_invented_case_id_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["comparisons"][0]["case_id"] = "invented-easy-case"
        self.assertEqual(reduce(experiment)["state"], "INVALID")

    def test_missing_frozen_case_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["comparisons"].pop()
        self.assertEqual(reduce(experiment)["state"], "INVALID")

    def test_zero_usage_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["comparisons"][0]["candidate"]["usage"]["tokens"] = 0
        self.assertEqual(reduce(experiment)["state"], "INVALID")

    def test_zero_budget_usage_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["budgets"]["hard_used"]["cost"] = 0
        self.assertEqual(reduce(experiment)["state"], "INVALID")

    def test_huge_per_side_usage_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["comparisons"][0]["candidate"]["usage"]["tokens"] = 30001
        receipt = reduce(experiment)
        self.assertEqual(receipt["state"], "INVALID")
        self.assertTrue(any("PER_CASE_USAGE_EXCEEDED" in gate for gate in receipt["failed_gates"]))

    def test_underreported_aggregate_usage_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["budgets"]["hard_used"]["tokens"] = 23999
        receipt = reduce(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INVALID", "INVALID_USAGE_RECONCILIATION"))

    def test_legacy_raw_judge_shape_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["comparisons"][0]["candidate"]["outcome"] = {"verdict": "PASS"}
        self.assertEqual(reduce(experiment)["state"], "INVALID")

    def test_receipt_digest_mismatch_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["comparisons"][0]["candidate"]["evaluation_receipt"]["digest"] = digest_text("tampered")
        receipt = reduce(experiment)
        self.assertEqual(receipt["state"], "INVALID")
        self.assertTrue(any("EVALUATION_RECEIPT_DIGEST_MISMATCH" in gate for gate in receipt["failed_gates"]))

    def test_receipt_subject_mismatch_cannot_accept(self) -> None:
        experiment = valid_experiment()
        candidate = experiment["comparisons"][0]["candidate"]
        mutate_receipt(candidate, lambda value: value["subject"].update({"digest": "b" * 64}))
        receipt = reduce(experiment)
        self.assertEqual(receipt["state"], "INVALID")
        self.assertTrue(any("subject_digest" in gate for gate in receipt["failed_gates"]))

    def test_receipt_profile_mismatch_cannot_accept(self) -> None:
        experiment = valid_experiment()
        candidate = experiment["comparisons"][0]["candidate"]
        mutate_receipt(
            candidate,
            lambda value: value["judgments"][0].update({"profile_id": "wrong-profile"}),
        )
        receipt = reduce(experiment)
        self.assertEqual(receipt["state"], "INVALID")
        self.assertTrue(any("EVALUATION_RECEIPT_PROFILE_MISMATCH" in gate for gate in receipt["failed_gates"]))

    def test_failed_candidate_receipt_cannot_accept(self) -> None:
        experiment = valid_experiment()
        candidate = experiment["comparisons"][0]["candidate"]

        def fail(value: dict) -> None:
            value["overall_status"] = "FAIL"
            value["conservative_score"] = 0.75
            for judgment in value["judgments"]:
                judgment["score"] = 0.75
                judgment["verdict"] = "FAIL"

        mutate_receipt(candidate, fail)
        receipt = reduce(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("REJECTED", "NO_IMPROVEMENT"))

    def test_zero_over_zero_calibration_cannot_accept(self) -> None:
        experiment = valid_experiment()
        experiment["calibration"]["accuracy"] = 0
        experiment["calibration"]["minimum_accuracy"] = 0
        self.assertEqual(reduce(experiment)["state"], "INVALID")

    def test_invalid_mechanical_evidence_stays_invalid(self) -> None:
        experiment = valid_experiment()
        experiment["mechanical"] = {"status": "INVALID", "failures": ["trace digest mismatch"]}
        receipt = reduce(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INVALID", "INVALID_MECHANICAL"))

    def test_legacy_mechanical_fail_state_is_schema_invalid(self) -> None:
        experiment = valid_experiment()
        experiment["mechanical"] = {"status": "FAIL", "failures": ["legacy state"]}
        receipt = reduce(experiment)
        self.assertEqual((receipt["state"], receipt["stop_reason"]), ("INVALID", "INVALID_SCHEMA"))

    def test_input_is_not_mutated(self) -> None:
        experiment = valid_experiment()
        original = copy.deepcopy(experiment)
        reduce(experiment)
        self.assertEqual(experiment, original)


if __name__ == "__main__":
    unittest.main()
