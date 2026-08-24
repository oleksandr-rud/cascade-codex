#!/usr/bin/env python3
"""Regression tests for content-addressed mechanical eligibility."""

from __future__ import annotations

import importlib.util
import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).with_name("check_eligibility.py")
SPEC = importlib.util.spec_from_file_location("check_eligibility", SCRIPT)
assert SPEC and SPEC.loader
CHECKER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CHECKER)
EVIDENCE_ROOT = Path("/evidence")


def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


def fixture():
    catalog = json.loads(CHECKER.CATALOG.read_text(encoding="utf-8"))
    case = catalog["cases"][0]
    case_id = case["id"]
    case_digest = CHECKER.canonical_digest(case)
    trace_raw = b"raw evidence for trace\n"
    run_id = CHECKER.digest_bytes(trace_raw)
    target_bytes = b"target architecture"
    target_digest = CHECKER.digest_bytes(target_bytes)
    artifacts = {
        "bindings/simulate.SKILL.md": b"---\nname: simulate\n---\n",
        "bindings/simulation-review.SKILL.md": b"---\nname: simulation-review\n---\n",
        "target/architecture.yaml": target_bytes,
    }
    record = {
        "phase_status": "EXECUTED",
        "case_id": case_id,
        "case_digest": case_digest,
        "run_id": run_id,
        "target_digest": target_digest,
        "target_artifact": {"path": "target/architecture.yaml", "digest": target_digest},
        "dependencies": {"missing": []},
        "inputs": {"missing": []},
        "authority": {"missing": []},
        "bindings": {
            key: CHECKER.digest_bytes(path.read_bytes())
            for key, path in CHECKER.INTERNAL_BINDINGS.items()
        },
    }
    record["bindings"].update(
        {
            "simulation_plugin_version": "0.2.0",
            "simulate_skill": {
                "identity": "cascade-simulations:simulate",
                "artifact": {
                    "path": "bindings/simulate.SKILL.md",
                    "digest": CHECKER.digest_bytes(artifacts["bindings/simulate.SKILL.md"]),
                },
            },
            "review_skill": {
                "identity": "cascade-simulations:simulation-review",
                "artifact": {
                    "path": "bindings/simulation-review.SKILL.md",
                    "digest": CHECKER.digest_bytes(artifacts["bindings/simulation-review.SKILL.md"]),
                },
            },
        }
    )
    findings = {
        "trace": {"thread_started": True, "terminal_event": True, "structured_output": True, "digest_match": True},
        "references": {"unresolved": []},
        "ownership": {"unowned_capabilities": [], "duplicate_capability_owners": [], "final_output_owners": 1, "overlapping_mutation_authority": []},
        "permissions": {"state_changes_all_declared": True, "confirmation_rules_complete": True, "recovery_rules_complete": True},
        "actions": {"undeclared_write": False, "undeclared_network": False, "undeclared_delegation": False, "undeclared_promotion": False, "prohibited_shortcut": False},
        "simulation_review": {"verification_status": "PASS", "frozen_run": True},
    }
    for field, kind in CHECKER.EVIDENCE_KINDS.items():
        raw_path = f"raw/{field}.jsonl"
        receipt_path = f"receipts/{field}.json"
        raw = trace_raw if field == "trace" else f"raw evidence for {field}\n".encode("utf-8")
        artifacts[raw_path] = raw
        receipt = {
            "receipt_version": "1.0.0",
            "kind": kind,
            "case_id": case_id,
            "case_digest": case_digest,
            "run_id": run_id,
            "target_digest": target_digest,
            "raw_artifact_digest": CHECKER.digest_bytes(raw),
            "findings": findings[field],
        }
        receipt_bytes = encoded(receipt)
        artifacts[receipt_path] = receipt_bytes
        record[field] = {
            "receipt": {"path": receipt_path, "digest": CHECKER.digest_bytes(receipt_bytes)},
            "raw_artifact": {"path": raw_path, "digest": CHECKER.digest_bytes(raw)},
        }
    return record, artifacts


class EligibilityTests(unittest.TestCase):
    def test_receipt_bound_record_passes(self):
        record, artifacts = fixture()
        result = CHECKER.check(record, EVIDENCE_ROOT, artifacts)
        self.assertEqual("PASS", result["status"])
        self.assertTrue(result["eligible"])

    def test_not_run_is_preserved(self):
        result = CHECKER.check(
            {"phase_status": "NOT_RUN", "case_id": "single-agent-support-triage"},
            EVIDENCE_ROOT,
            {},
        )
        self.assertEqual("NOT_RUN", result["status"])

    def test_missing_authority_is_blocked(self):
        record, artifacts = fixture()
        record["authority"]["missing"] = ["production write grant"]
        self.assertEqual("BLOCKED", CHECKER.check(record, EVIDENCE_ROOT, artifacts)["status"])

    def test_missing_artifact_is_blocked(self):
        record, artifacts = fixture()
        artifacts.pop(record["trace"]["raw_artifact"]["path"])
        self.assertEqual("BLOCKED", CHECKER.check(record, EVIDENCE_ROOT, artifacts)["status"])

    def test_digest_or_receipt_identity_mismatch_is_invalid(self):
        record, artifacts = fixture()
        artifacts[record["trace"]["raw_artifact"]["path"]] += b"tampered"
        self.assertEqual("INVALID", CHECKER.check(record, EVIDENCE_ROOT, artifacts)["status"])

        record, artifacts = fixture()
        receipt_path = record["trace"]["receipt"]["path"]
        receipt = json.loads(artifacts[receipt_path])
        receipt["target_digest"] = CHECKER.digest_bytes(b"other target")
        artifacts[receipt_path] = encoded(receipt)
        record["trace"]["receipt"]["digest"] = CHECKER.digest_bytes(artifacts[receipt_path])
        self.assertEqual("INVALID", CHECKER.check(record, EVIDENCE_ROOT, artifacts)["status"])

    def test_trace_failure_is_invalid(self):
        record, artifacts = fixture()
        receipt_path = record["trace"]["receipt"]["path"]
        receipt = json.loads(artifacts[receipt_path])
        receipt["findings"]["terminal_event"] = False
        artifacts[receipt_path] = encoded(receipt)
        record["trace"]["receipt"]["digest"] = CHECKER.digest_bytes(artifacts[receipt_path])
        self.assertEqual("INVALID", CHECKER.check(record, EVIDENCE_ROOT, artifacts)["status"])

    def test_exact_self_assertion_probe_cannot_pass(self):
        probes = []
        record, artifacts = fixture()
        record["case_id"] = "invented-case"
        probes.append((record, artifacts))

        record, artifacts = fixture()
        record["target_digest"] = "sha256:not-a-digest"
        probes.append((record, artifacts))

        record, artifacts = fixture()
        record["bindings"]["catalog_digest"] = "sha256:" + "0" * 64
        probes.append((record, artifacts))

        record, artifacts = fixture()
        record["trace"] = {"thread_started": True, "terminal_event": True, "structured_output": True, "digest_match": True}
        probes.append((record, artifacts))

        for record, artifacts in probes:
            with self.subTest(case=record.get("case_id"), target=record.get("target_digest")):
                self.assertEqual("INVALID", CHECKER.check(record, EVIDENCE_ROOT, artifacts)["status"])

    def test_missing_schema_engine_fails_closed(self):
        record, artifacts = fixture()
        validator = CHECKER.Draft202012Validator
        try:
            CHECKER.Draft202012Validator = None
            self.assertEqual("INVALID", CHECKER.check(record, EVIDENCE_ROOT, artifacts)["status"])
        finally:
            CHECKER.Draft202012Validator = validator

    def test_cli_reads_confined_artifacts_and_recomputes_digests(self):
        record, artifacts = fixture()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for relative, data in artifacts.items():
                path = root / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
            record_path = root / "eligibility.json"
            record_path.write_text(json.dumps(record), encoding="utf-8")
            stdout = io.StringIO()
            with patch.object(
                sys,
                "argv",
                ["check_eligibility.py", str(record_path), "--evidence-root", str(root)],
            ), redirect_stdout(stdout):
                exit_code = CHECKER.main()
            self.assertEqual(0, exit_code)
            self.assertEqual("PASS", json.loads(stdout.getvalue())["status"])


if __name__ == "__main__":
    unittest.main()
