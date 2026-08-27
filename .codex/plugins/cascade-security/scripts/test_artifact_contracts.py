#!/usr/bin/env python3

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("validate_artifact", ROOT / "scripts" / "validate_artifact.py")
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
SCHEMA = json.loads((ROOT / "schemas" / "security-review.schema.json").read_text(encoding="utf-8"))


def base(skill: str, status: str = "READY") -> dict:
    return {
        "schema_version": 1,
        "status": status,
        "selected_skill": skill,
        "scope": {
            "objective": "Review the bounded security surface.",
            "review_only": True,
            "assumptions": [],
        },
        "sources": [{
            "source_id": "SRC-REQUEST",
            "kind": "user-request",
            "authority": "AUTHORITATIVE",
            "status": "AVAILABLE",
            "locator": "test request",
        }],
        "coverage": {},
        "findings": [{
            "finding_id": "F-TEST-001",
            "classification": "control" if status == "READY" else "gap",
            "severity": "INFO" if status == "READY" else "P2",
            "statement": "A bounded security conclusion.",
            "evidence_refs": ["SRC-REQUEST"],
            "required_action": "Preserve the reviewed control." if status == "READY" else "Supply the missing evidence.",
            "next_gate": "stop" if status == "READY" else "host-evidence",
        }],
        "handoffs": [] if status == "READY" else [{
            "route": "host-evidence",
            "status": "REQUIRED" if status == "GAP" else "BLOCKED",
            "reason": "Current target evidence is incomplete.",
            "required_input": "Current target source and validation evidence.",
            "expected_output": "A source-bound security review.",
        }],
        "authority": {
            "review_only": True,
            "secrets_redacted": True,
            "runtime_mutation": False,
            "compliance_attestation": False,
            "release_approval": False,
        },
    }


def codebase_artifact(status: str = "READY") -> dict:
    artifact = base("codebase-audit", status)
    artifact["coverage"] = {
        "kind": "codebase",
        "trajectories": ["auth and tenant boundaries", "secrets and providers"],
        "inventory": {
            "scanner": "bundled" if status == "READY" else "not-run",
            "content_read": False,
            "scanned_files": 42 if status == "READY" else 0,
            "truncated": False,
        },
    }
    return artifact


def auth_artifact(status: str = "READY") -> dict:
    artifact = base("auth-analysis", status)
    artifact["coverage"] = {
        "kind": "auth",
        "checks": [
            "session-lifecycle",
            "server-side-authorization",
            "tenant-isolation",
            "client-storage",
            "route-parity",
            "audit-events",
        ] if status == "READY" else ["session-lifecycle"],
    }
    return artifact


def design_artifact(status: str = "READY") -> dict:
    artifact = base("secure-design", status)
    artifact["coverage"] = {
        "kind": "design",
        "assets": ["tenant records"],
        "trust_boundaries": ["application to provider"],
        "abuse_cases": ["cross-tenant export"],
        "required_controls": ["server-side tenant and role enforcement"],
    }
    return artifact


class ArtifactContractTests(unittest.TestCase):
    def test_each_skill_has_a_valid_ready_artifact(self) -> None:
        for artifact in (codebase_artifact(), auth_artifact(), design_artifact()):
            with self.subTest(skill=artifact["selected_skill"]):
                self.assertEqual(MODULE.validate_artifact(SCHEMA, artifact), [])

    def test_skill_and_coverage_kind_must_match(self) -> None:
        artifact = codebase_artifact()
        artifact["selected_skill"] = "auth-analysis"
        self.assertIn("selected_skill does not match coverage.kind", MODULE.validate_artifact(SCHEMA, artifact))

    def test_unknown_evidence_reference_is_rejected(self) -> None:
        artifact = design_artifact()
        artifact["findings"][0]["evidence_refs"] = ["SRC-UNKNOWN"]
        self.assertTrue(any("unknown sources" in error for error in MODULE.validate_artifact(SCHEMA, artifact)))

    def test_ready_auth_requires_core_checks(self) -> None:
        artifact = auth_artifact()
        artifact["coverage"]["checks"] = ["session-lifecycle"]
        self.assertTrue(any("missing core checks" in error for error in MODULE.validate_artifact(SCHEMA, artifact)))

    def test_ready_codebase_requires_completed_inventory(self) -> None:
        artifact = codebase_artifact()
        artifact["coverage"]["inventory"]["scanner"] = "not-run"
        self.assertIn("READY codebase audit requires a completed filename inventory", MODULE.validate_artifact(SCHEMA, artifact))

    def test_blocked_artifact_with_recovery_is_valid(self) -> None:
        self.assertEqual(MODULE.validate_artifact(SCHEMA, codebase_artifact("BLOCKED")), [])

    def test_assumption_source_requires_assumption_authority(self) -> None:
        artifact = design_artifact()
        artifact["sources"][0]["kind"] = "assumption"
        self.assertIn("assumption sources must declare ASSUMPTION authority", MODULE.validate_artifact(SCHEMA, artifact))

    def test_compliance_attestation_is_rejected(self) -> None:
        artifact = design_artifact()
        artifact["authority"]["compliance_attestation"] = True
        errors = MODULE.validate_artifact(SCHEMA, artifact)
        self.assertTrue(any("compliance" in error for error in errors))

    def test_handoff_input_cannot_repeat_output(self) -> None:
        artifact = design_artifact("GAP")
        artifact["handoffs"][0]["required_input"] = "Same packet"
        artifact["handoffs"][0]["expected_output"] = "Same packet"
        self.assertTrue(any("repeats expected output" in error for error in MODULE.validate_artifact(SCHEMA, artifact)))


if __name__ == "__main__":
    unittest.main()
