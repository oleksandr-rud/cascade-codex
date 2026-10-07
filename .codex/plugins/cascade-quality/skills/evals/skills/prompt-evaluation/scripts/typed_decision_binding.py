"""Exact typed-runner routing; legacy evidence never becomes a new v2 binding."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

V2_FILE = "run-typed-decision-eval-v2.py"
LEGACY_FILE = "run-typed-decision-eval.py"
ADAPTER_ID = "cascade-quality:typed-decisions-v2"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def canonical(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def resolve_runner_binding(requested_runner: str = "v2", *, scripts_root: Path | None = None,
                           expected_binding_sha256: str | None = None) -> dict[str, Any]:
    require(requested_runner in ("v2", V2_FILE),
            "legacy or unknown runner is not eligible for new execution; use the pinned v2 entrypoint")
    root = (scripts_root or Path(__file__).resolve().parent).resolve()
    binding_file = root.parent / "references/typed-decision-entrypoint.json"
    require(not binding_file.is_symlink(), "binding file must not be a symlink")
    raw = binding_file.read_bytes()
    binding_sha = hashlib.sha256(raw).hexdigest()
    require(expected_binding_sha256 is None or expected_binding_sha256 == binding_sha,
            "binding manifest differs from frozen binding digest")
    binding = json.loads(raw)
    require(isinstance(binding, dict) and type(binding.get("schema_version")) is int and
            binding["schema_version"] == 1 and type(binding.get("contract_version")) is int and
            binding["contract_version"] == 2 and binding.get("adapter_id") == ADAPTER_ID,
            "binding must declare the typed-decision v2 contract")
    require(binding.get("legacy_execution_policy") == "INSPECTION_ONLY", "legacy execution policy must be inspection only")
    runner = binding.get("runner")
    require(isinstance(runner, dict) and runner.get("file") == V2_FILE, "binding must select the exact v2 runner")
    runner_path = root / V2_FILE
    require(not runner_path.is_symlink() and runner_path.resolve().parent == root, "runner must remain in the script root")
    actual_sha = hashlib.sha256(runner_path.read_bytes()).hexdigest()
    require(runner.get("sha256") == actual_sha, "v2 runner digest differs from declared binding; no legacy fallback")
    return {"schema_version": 1, "adapter_id": ADAPTER_ID, "contract_version": 2,
            "binding_manifest_sha256": binding_sha, "runner_file": V2_FILE,
            "runner_sha256": actual_sha, "action_authority": "NONE"}


def validate_execution_manifest(manifest: Any, *, scripts_root: Path | None = None,
                                expected_binding_sha256: str | None = None) -> dict[str, Any]:
    binding = resolve_runner_binding(scripts_root=scripts_root, expected_binding_sha256=expected_binding_sha256)
    require(isinstance(manifest, dict), "execution manifest must be an object")
    require(type(manifest.get("typed_decision_contract_version")) is int and
            manifest["typed_decision_contract_version"] == 2, "legacy or missing execution contract cannot establish a v2 binding")
    require(manifest.get("runner_sha256") == binding["runner_sha256"], "execution runner differs from pinned v2 runner")
    require(canonical(manifest.get("entrypoint_binding")) == canonical(binding), "execution entrypoint binding differs from the frozen contract")
    return {"status": "VALID_BOUND_V2", "binding_verified": True, "action_authority": "NONE",
            "quality_acceptance": "NOT_ESTABLISHED", "binding": binding}


def inspect_legacy_manifest(manifest: Any, *, scripts_root: Path | None = None,
                            expected_binding_sha256: str | None = None) -> dict[str, Any]:
    root = (scripts_root or Path(__file__).resolve().parent).resolve()
    resolve_runner_binding(scripts_root=root, expected_binding_sha256=expected_binding_sha256)
    binding = json.loads((root.parent / "references/typed-decision-entrypoint.json").read_bytes())
    legacy = binding.get("legacy")
    require(isinstance(legacy, dict) and legacy.get("file") == LEGACY_FILE, "preserved legacy identity is missing")
    legacy_path = root / LEGACY_FILE
    require(not legacy_path.is_symlink(), "legacy inspection requires the preserved regular file")
    digest = hashlib.sha256(legacy_path.read_bytes()).hexdigest()
    require(legacy.get("sha256") == digest, "preserved legacy source changed")
    require(isinstance(manifest, dict) and manifest.get("runner_sha256") == digest,
            "manifest does not bind the preserved legacy runner")
    return {"status": "LEGACY_COMPATIBILITY_ONLY", "eligible_for_new_binding": False,
            "runner_sha256": digest, "action_authority": "NONE", "source_execution": "NOT_PERFORMED"}
