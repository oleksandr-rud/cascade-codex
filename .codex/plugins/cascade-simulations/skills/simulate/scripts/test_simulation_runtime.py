#!/usr/bin/env python3

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import yaml

from simulation_runtime import (
    RuntimeFailure,
    authorize_action,
    finish_run,
    record_action,
    run_status,
    start_run,
    verify_run,
)
from validate_simulation import load_document


ROOT = Path(__file__).resolve().parent.parent
SIMULATION = ROOT / "assets" / "simulation.yaml"
ADAPTER = ROOT / "assets" / "adapter.yaml"
BINDINGS = load_document(ADAPTER)["driver"]["bindings"]


class SimulationRuntimeTest(unittest.TestCase):
    def start(self, root: Path) -> Path:
        run_dir = root / "run"
        status = start_run(SIMULATION, ADAPTER, run_dir, "run-001", BINDINGS)
        self.assertEqual(status["status"], "RUNNING")
        return run_dir

    def test_missing_host_binding_blocks_preflight(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaisesRegex(RuntimeFailure, "missing Codex host bindings"):
                start_run(
                    SIMULATION,
                    ADAPTER,
                    Path(temp) / "run",
                    "run-001",
                    {"browser.observe": BINDINGS["browser.observe"]},
                )

    def test_mismatched_host_binding_blocks_preflight(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            bindings = dict(BINDINGS)
            bindings["browser.observe"] = "codex-host/wrong-tool"
            with self.assertRaisesRegex(RuntimeFailure, "host binding mismatch"):
                start_run(SIMULATION, ADAPTER, Path(temp) / "run", "run-001", bindings)

    def test_unmatched_dispatch_is_unknown_and_not_replayed(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            run_dir = self.start(Path(temp))
            receipt = authorize_action(
                run_dir,
                "interact",
                {},
                False,
                "interaction-1",
                1,
            )
            status = run_status(run_dir)
            self.assertEqual(status["status"], "UNKNOWN_OUTCOME")
            self.assertEqual(status["pending_dispatch"]["dispatch_token"], receipt["dispatch_token"])
            with self.assertRaisesRegex(RuntimeFailure, "cannot dispatch"):
                authorize_action(run_dir, "inspect", {}, False, None, 1)
            result = finish_run(
                run_dir,
                "UNKNOWN_OUTCOME",
                "The dispatched interaction has no reliable result",
                "UNKNOWN",
                "Target state may have changed",
                ["Possible unobserved write"],
                "Reconcile target state before another write",
            )
            self.assertEqual(result["status"], "UNKNOWN_OUTCOME")
            self.assertEqual(verify_run(run_dir)["result"], "PASS")

    def test_confirmation_and_idempotency_are_enforced(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            run_dir = self.start(Path(temp))
            with self.assertRaisesRegex(RuntimeFailure, "explicit confirmation"):
                authorize_action(run_dir, "submit", {}, False, "submit-1", 1)
            receipt = authorize_action(run_dir, "interact", {}, False, "interaction-1", 1)
            record_action(
                run_dir,
                receipt["dispatch_token"],
                "PASS",
                "page_state",
                "The visible form accepted the prepared value",
                [],
                1.2,
            )
            with self.assertRaisesRegex(RuntimeFailure, "already dispatched"):
                authorize_action(run_dir, "interact", {}, False, "interaction-1", 1)

    def test_actor_state_changes_only_through_declared_transition(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            run_dir = self.start(Path(temp))
            receipt = authorize_action(run_dir, "inspect", {}, False, None, 1)
            transition = load_document(SIMULATION)["actor"]["state_transitions"][0]["when"]
            status = record_action(
                run_dir,
                receipt["dispatch_token"],
                "PASS",
                "page_state",
                "The visible evidence independently confirms the suspected cause",
                [],
                1.0,
                {"confidence": "high"},
                transition,
                "The fresh page_state observation confirms the cause",
            )
            self.assertEqual(status["actor_state"], {"confidence": "high"})
            self.assertEqual(status["state_history"][0]["transition"], transition)

        with tempfile.TemporaryDirectory() as temp:
            run_dir = self.start(Path(temp))
            receipt = authorize_action(run_dir, "inspect", {}, False, None, 1)
            with self.assertRaisesRegex(RuntimeFailure, "unsupported value"):
                record_action(
                    run_dir,
                    receipt["dispatch_token"],
                    "PASS",
                    "page_state",
                    "A page was observed",
                    [],
                    1.0,
                    {"confidence": "certain"},
                )

    def test_achieved_requires_exact_supported_outcome_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            run_dir = self.start(Path(temp))
            receipt = authorize_action(run_dir, "submit", {}, True, "submit-1", 1)
            conditions = load_document(SIMULATION)["outcome"]["achieved_when"]
            evidence = [
                {
                    "condition": condition,
                    "status": "SUPPORTED",
                    "evidence": f"Visible target observation supports: {condition}",
                }
                for condition in conditions
            ]
            status = record_action(
                run_dir,
                receipt["dispatch_token"],
                "PASS",
                "page_state",
                "Final visible work-order state and persisted details were re-observed",
                evidence,
                2.0,
            )
            self.assertEqual(status["status"], "ACHIEVED")
            cleanup_receipt = authorize_action(
                run_dir,
                "cleanup",
                {},
                False,
                "cleanup-1",
                1,
            )
            cleanup_status = record_action(
                run_dir,
                cleanup_receipt["dispatch_token"],
                "PASS",
                "page_state",
                "The original browser context remains and no run-owned temporary surface is open",
                [],
                0.5,
            )
            self.assertEqual(cleanup_status["status"], "ACHIEVED")
            with self.assertRaisesRegex(RuntimeFailure, "cleanup already completed"):
                authorize_action(run_dir, "inspect", {}, False, None, 1)
            result = finish_run(
                run_dir,
                "ACHIEVED",
                "Every required outcome condition has grounded visible evidence",
                "VERIFIED",
                "The dispatched cleanup action verified no owned temporary surface remains",
                [],
            )
            self.assertEqual(result["source_digests"]["event_tail"], verify_run(run_dir)["event_tail_digest"])

    def test_journal_tampering_fails_verification(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            run_dir = self.start(Path(temp))
            events_path = run_dir / "events.jsonl"
            event = json.loads(events_path.read_text(encoding="utf-8"))
            event["payload"]["target"] = "tampered"
            events_path.write_text(json.dumps(event) + "\n", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeFailure, "journal digest"):
                verify_run(run_dir)

    def test_result_tampering_fails_verification(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            run_dir = self.start(Path(temp))
            finish_run(
                run_dir,
                "BLOCKED",
                "Required target evidence is unavailable",
                "NOT_REQUIRED",
                "No temporary target resource was created",
                [],
            )
            result_path = run_dir / "result.json"
            result = json.loads(result_path.read_text(encoding="utf-8"))
            result["reason"] = "tampered"
            result_path.write_text(json.dumps(result), encoding="utf-8")
            with self.assertRaisesRegex(RuntimeFailure, "differs from frozen journal projection"):
                verify_run(run_dir)

    def test_unknown_action_result_stops_further_dispatch(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            run_dir = self.start(Path(temp))
            receipt = authorize_action(run_dir, "interact", {}, False, "interaction-1", 1)
            status = record_action(
                run_dir,
                receipt["dispatch_token"],
                "UNKNOWN_OUTCOME",
                "page_state",
                "The control may have accepted the value before the browser context was lost",
                [],
                1.0,
            )
            self.assertEqual(status["status"], "UNKNOWN_OUTCOME")
            with self.assertRaisesRegex(RuntimeFailure, "cannot dispatch"):
                authorize_action(run_dir, "inspect", {}, False, None, 1)

    def test_verified_cleanup_requires_dispatched_cleanup_action(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            run_dir = self.start(Path(temp))
            with self.assertRaisesRegex(RuntimeFailure, "successful dispatched cleanup action"):
                finish_run(
                    run_dir,
                    "BLOCKED",
                    "No safe next target action",
                    "VERIFIED",
                    "Unsupported cleanup assertion",
                    [],
                )

    def test_conflicting_condition_evidence_cannot_be_achieved(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            run_dir = self.start(Path(temp))
            condition = load_document(SIMULATION)["outcome"]["achieved_when"][0]
            first = authorize_action(run_dir, "inspect", {}, False, None, 1)
            record_action(
                run_dir,
                first["dispatch_token"],
                "PASS",
                "page_state",
                "The visible state appears to satisfy the condition",
                [{"condition": condition, "status": "SUPPORTED", "evidence": "Visible allowed state"}],
                0.5,
            )
            second = authorize_action(run_dir, "interact", {}, False, "interaction-2", 1)
            status = record_action(
                run_dir,
                second["dispatch_token"],
                "PASS",
                "page_state",
                "A later visible state contradicts the earlier support",
                [{"condition": condition, "status": "UNSUPPORTED", "evidence": "Visible disallowed state"}],
                0.5,
            )
            finding = next(item for item in status["outcome_evidence"] if item["condition"] == condition)
            self.assertEqual(finding["status"], "CONFLICTING")
            self.assertIn("event:", finding["evidence"])
            self.assertNotEqual(status["status"], "ACHIEVED")

    def test_evidence_requires_declared_observation_path(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            run_dir = self.start(Path(temp))
            condition = load_document(SIMULATION)["outcome"]["achieved_when"][0]
            receipt = authorize_action(run_dir, "inspect", {}, False, None, 1)
            with self.assertRaisesRegex(RuntimeFailure, "not allowed evidence"):
                record_action(
                    run_dir,
                    receipt["dispatch_token"],
                    "PASS",
                    "navigation_state",
                    "Only the navigation identity was observed",
                    [{"condition": condition, "status": "SUPPORTED", "evidence": "URL only"}],
                    0.5,
                )

    def test_recovery_intent_is_bound_before_dispatch(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            run_dir = self.start(Path(temp))
            receipt = authorize_action(run_dir, "reconcile", {}, False, None, 1)
            status = record_action(
                run_dir,
                receipt["dispatch_token"],
                "PASS",
                "page_state",
                "The same stable browser context was reconciled",
                [],
                0.5,
            )
            self.assertEqual(status["usage"]["recoveries"], 1)

    def test_unmatched_recovery_dispatch_still_consumes_budget(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            run_dir = self.start(Path(temp))
            authorize_action(run_dir, "reconcile", {}, False, None, 1)
            status = run_status(run_dir)
            self.assertEqual(status["status"], "UNKNOWN_OUTCOME")
            self.assertEqual(status["usage"]["recoveries"], 1)

    def test_action_outside_frozen_authority_is_blocked(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            simulation = load_document(SIMULATION)
            simulation["authority"]["allowed_actions"] = ["inspect"]
            simulation_path = root / "simulation.yaml"
            simulation_path.write_text(yaml.safe_dump(simulation, sort_keys=False), encoding="utf-8")
            run_dir = root / "run"
            start_run(simulation_path, ADAPTER, run_dir, "run-001", BINDINGS)
            with self.assertRaisesRegex(RuntimeFailure, "outside the frozen authority scope"):
                authorize_action(run_dir, "interact", {}, False, "interaction-1", 1)


if __name__ == "__main__":
    unittest.main()
