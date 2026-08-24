#!/usr/bin/env python3
"""Verify content-addressed mechanical evidence without semantic scoring."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path, PurePosixPath
from typing import Any, Mapping

try:
    from jsonschema import Draft202012Validator
except ImportError:  # Fail closed at runtime; do not implement a partial validator.
    Draft202012Validator = None  # type: ignore[assignment]


ROOT = Path(__file__).resolve().parents[1]
REFERENCES = ROOT / "references"
INPUT_SCHEMA = REFERENCES / "eligibility-input.schema.json"
RECEIPT_SCHEMA = REFERENCES / "eligibility-receipt.schema.json"
CATALOG = REFERENCES / "task-catalog.json"
SPLITS = REFERENCES / "split-manifest.json"
INTERNAL_BINDINGS = {
    "catalog_digest": CATALOG,
    "split_digest": SPLITS,
    "budgets_digest": REFERENCES / "budgets.json",
    "outcome_rubric_digest": REFERENCES / "rubrics" / "outcome-v1.md",
    "trajectory_rubric_digest": REFERENCES / "rubrics" / "trajectory-v1.md",
}
EVIDENCE_KINDS = {
    "trace": "trace",
    "references": "references",
    "ownership": "ownership",
    "permissions": "permissions",
    "actions": "actions",
    "simulation_review": "simulation-review",
}
EXPECTED_SKILLS = {
    "simulate_skill": ("cascade-simulations:simulate", "simulate"),
    "review_skill": ("cascade-simulations:simulation-review", "simulation-review"),
}


def digest_bytes(data: bytes) -> str:
    return f"sha256:{hashlib.sha256(data).hexdigest()}"


def canonical_digest(value: Any) -> str:
    data = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return digest_bytes(data)


def invalid(*reasons: str) -> dict[str, Any]:
    return {"status": "INVALID", "eligible": False, "reasons": list(reasons)}


def blocked(*reasons: str) -> dict[str, Any]:
    return {"status": "BLOCKED", "eligible": False, "reasons": list(reasons)}


def _loads_strict(text: str) -> Any:
    def unique_object(pairs):
        value = {}
        for key, item in pairs:
            if key in value:
                raise ValueError(f"duplicate JSON key: {key}")
            value[key] = item
        return value

    return json.loads(text, object_pairs_hook=unique_object)


def _load_json(path: Path) -> Any:
    return _loads_strict(path.read_text(encoding="utf-8"))


def _schema_errors(value: Any, schema: Any) -> list[str]:
    if Draft202012Validator is None:
        return ["Draft 2020-12 schema validation unavailable: install jsonschema"]
    try:
        Draft202012Validator.check_schema(schema)
        validator = Draft202012Validator(schema)
    except Exception as exc:
        return [f"invalid Draft 2020-12 schema: {exc}"]
    errors = sorted(validator.iter_errors(value), key=lambda item: list(item.absolute_path))
    return [f"{'.'.join(map(str, error.absolute_path)) or '$'}: {error.message}" for error in errors]


def _safe_relative_path(value: str) -> bool:
    path = PurePosixPath(value)
    return bool(value) and not path.is_absolute() and ".." not in path.parts and "\\" not in value


def _read_evidence(
    relative: str,
    evidence_root: Path | None,
    artifact_map: Mapping[str, bytes] | None,
) -> tuple[bytes | None, str | None]:
    if evidence_root is None:
        return None, "explicit evidence root is unavailable"
    if not _safe_relative_path(relative):
        return None, f"artifact path escapes evidence root: {relative}"
    if artifact_map is not None:
        data = artifact_map.get(relative)
        return (data, None) if data is not None else (None, f"artifact unavailable: {relative}")
    root = evidence_root.resolve()
    candidate = (root / relative).resolve()
    if not candidate.is_relative_to(root):
        return None, f"artifact path escapes evidence root: {relative}"
    try:
        return candidate.read_bytes(), None
    except OSError:
        return None, f"artifact unavailable: {relative}"


def _load_schemas() -> tuple[Any | None, Any | None, list[str]]:
    if Draft202012Validator is None:
        return None, None, ["Draft 2020-12 schema validation unavailable: install jsonschema"]
    try:
        return _load_json(INPUT_SCHEMA), _load_json(RECEIPT_SCHEMA), []
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        return None, None, [f"eligibility schema unavailable or malformed: {exc}"]


def _catalog_case(case_id: str) -> tuple[dict[str, Any] | None, str | None]:
    try:
        catalog = _load_json(CATALOG)
        splits = _load_json(SPLITS)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        return None, f"catalog or split manifest unavailable: {exc}"
    cases = [item for item in catalog.get("cases", []) if item.get("id") == case_id]
    split_occurrences = sum(
        partition.get("case_ids", []).count(case_id)
        for partition in splits.get("partitions", {}).values()
    )
    if len(cases) != 1 or split_occurrences != 1:
        return None, "case_id is not canonically bound exactly once in catalog and split manifest"
    return cases[0], None


def _verify_external_skill(
    binding_name: str,
    binding: dict[str, Any],
    evidence_root: Path | None,
    artifact_map: Mapping[str, bytes] | None,
) -> tuple[str | None, str | None]:
    expected_identity, expected_frontmatter_name = EXPECTED_SKILLS[binding_name]
    if binding.get("identity") != expected_identity:
        return "INVALID", f"{binding_name} identity mismatch"
    artifact = binding["artifact"]
    data, load_error = _read_evidence(artifact["path"], evidence_root, artifact_map)
    if load_error:
        return "BLOCKED", load_error
    assert data is not None
    if digest_bytes(data) != artifact["digest"]:
        return "INVALID", f"{binding_name} artifact digest mismatch"
    text = data.decode("utf-8", errors="replace")
    if not re.search(rf"(?m)^name:\s*{re.escape(expected_frontmatter_name)}\s*$", text):
        return "INVALID", f"{binding_name} artifact does not declare the expected skill"
    return None, None


def _verify_evidence_pair(
    field: str,
    pair: dict[str, Any],
    identity: dict[str, str],
    receipt_schema: Any,
    evidence_root: Path | None,
    artifact_map: Mapping[str, bytes] | None,
) -> tuple[dict[str, Any] | None, str | None, str | None]:
    receipt_ref = pair["receipt"]
    raw_ref = pair["raw_artifact"]
    receipt_bytes, receipt_error = _read_evidence(receipt_ref["path"], evidence_root, artifact_map)
    raw_bytes, raw_error = _read_evidence(raw_ref["path"], evidence_root, artifact_map)
    if receipt_error or raw_error:
        return None, "BLOCKED", receipt_error or raw_error
    assert receipt_bytes is not None and raw_bytes is not None
    if digest_bytes(receipt_bytes) != receipt_ref["digest"]:
        return None, "INVALID", f"{field} receipt digest mismatch"
    if digest_bytes(raw_bytes) != raw_ref["digest"]:
        return None, "INVALID", f"{field} raw artifact digest mismatch"
    try:
        receipt = _loads_strict(receipt_bytes.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
        return None, "INVALID", f"{field} receipt is not valid JSON"
    schema_errors = _schema_errors(receipt, receipt_schema)
    if schema_errors:
        return None, "INVALID", f"{field} receipt schema failed: {schema_errors[0]}"
    expected = {
        "kind": EVIDENCE_KINDS[field],
        "case_id": identity["case_id"],
        "case_digest": identity["case_digest"],
        "run_id": identity["run_id"],
        "target_digest": identity["target_digest"],
        "raw_artifact_digest": raw_ref["digest"],
    }
    mismatches = [key for key, value in expected.items() if receipt.get(key) != value]
    if mismatches:
        return None, "INVALID", f"{field} receipt identity mismatch: {', '.join(mismatches)}"
    return receipt["findings"], None, None


def check(
    record: Any,
    evidence_root: Path | None = None,
    artifact_map: Mapping[str, bytes] | None = None,
) -> dict[str, Any]:
    input_schema, receipt_schema, schema_load_errors = _load_schemas()
    if schema_load_errors:
        return invalid(*schema_load_errors)
    assert input_schema is not None and receipt_schema is not None
    schema_errors = _schema_errors(record, input_schema)
    if schema_errors:
        return invalid(*schema_errors)

    case, case_error = _catalog_case(record["case_id"])
    if case_error:
        return invalid(case_error)
    assert case is not None
    actual_case_digest = canonical_digest(case)
    if record.get("case_digest") is not None and record["case_digest"] != actual_case_digest:
        return invalid("case_digest does not match the canonical catalog case")

    if record["phase_status"] == "NOT_RUN":
        return {"status": "NOT_RUN", "eligible": False, "reasons": ["execution was not attempted"]}
    if record["phase_status"] == "BLOCKED":
        return blocked(*record["blocked_reasons"])

    invalid_reasons: list[str] = []
    blocked_reasons: list[str] = []
    bindings = record["bindings"]
    for binding_name, path in INTERNAL_BINDINGS.items():
        try:
            actual = digest_bytes(path.read_bytes())
        except OSError:
            blocked_reasons.append(f"binding source unavailable: {binding_name}")
            continue
        if bindings[binding_name] != actual:
            invalid_reasons.append(f"{binding_name} does not match the current bound source")

    target_ref = record["target_artifact"]
    target_bytes, target_error = _read_evidence(
        target_ref["path"], evidence_root, artifact_map
    )
    if target_error:
        blocked_reasons.append(target_error)
    elif target_bytes is not None:
        actual_target_digest = digest_bytes(target_bytes)
        if actual_target_digest != target_ref["digest"] or actual_target_digest != record["target_digest"]:
            invalid_reasons.append("target artifact digest or target identity mismatch")

    for binding_name in EXPECTED_SKILLS:
        status, reason = _verify_external_skill(
            binding_name, bindings[binding_name], evidence_root, artifact_map
        )
        if status == "INVALID" and reason:
            invalid_reasons.append(reason)
        elif status == "BLOCKED" and reason:
            blocked_reasons.append(reason)

    identity = {
        "case_id": record["case_id"],
        "case_digest": record["case_digest"],
        "run_id": record["run_id"],
        "target_digest": record["target_digest"],
    }
    findings: dict[str, dict[str, Any]] = {}
    for field in EVIDENCE_KINDS:
        value, status, reason = _verify_evidence_pair(
            field,
            record[field],
            identity,
            receipt_schema,
            evidence_root,
            artifact_map,
        )
        if status == "INVALID" and reason:
            invalid_reasons.append(reason)
        elif status == "BLOCKED" and reason:
            blocked_reasons.append(reason)
        elif value is not None:
            findings[field] = value

    if record["run_id"] != record["trace"]["raw_artifact"]["digest"]:
        invalid_reasons.append("run_id must equal the frozen trace artifact digest")

    if invalid_reasons:
        return invalid(*invalid_reasons)
    if blocked_reasons:
        return blocked(*blocked_reasons)

    for source in ("dependencies", "inputs", "authority"):
        if record[source]["missing"]:
            blocked_reasons.append(
                f"{source} missing: {', '.join(record[source]['missing'])}"
            )
    if blocked_reasons:
        return blocked(*blocked_reasons)

    trace_failed = [key for key, value in findings["trace"].items() if value is not True]
    if trace_failed:
        invalid_reasons.append(f"trace gates failed: {', '.join(sorted(trace_failed))}")
    if findings["references"]["unresolved"]:
        invalid_reasons.append("unresolved references remain")
    ownership = findings["ownership"]
    for key in ("unowned_capabilities", "duplicate_capability_owners", "overlapping_mutation_authority"):
        if ownership[key]:
            invalid_reasons.append(f"ownership.{key} is not empty")
    if ownership["final_output_owners"] != 1:
        invalid_reasons.append("exactly one final output owner is required")
    permission_failed = [key for key, value in findings["permissions"].items() if value is not True]
    if permission_failed:
        invalid_reasons.append(f"permission gates failed: {', '.join(sorted(permission_failed))}")
    prohibited = [key for key, value in findings["actions"].items() if value is not False]
    if prohibited:
        invalid_reasons.append(f"prohibited action gates failed: {', '.join(sorted(prohibited))}")
    review = findings["simulation_review"]
    if review["verification_status"] != "PASS" or review["frozen_run"] is not True:
        invalid_reasons.append("simulation review integrity did not pass")

    if invalid_reasons:
        return invalid(*invalid_reasons)
    return {"status": "PASS", "eligible": True, "reasons": []}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("record", type=Path)
    parser.add_argument("--evidence-root", type=Path, required=True)
    args = parser.parse_args()
    try:
        record = _loads_strict(args.record.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        result = invalid(str(exc))
    else:
        result = check(record, evidence_root=args.evidence_root)
    print(json.dumps(result, indent=2))
    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
