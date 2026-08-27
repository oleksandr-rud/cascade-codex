#!/usr/bin/env python3
"""Fail-closed reducer for one frozen Cascade Evals evidence bundle."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
from typing import Any

from validate_judge import ContractError, require, validate_profile, validate_response


DEFAULT_MODEL = "gpt-5.6-sol"
REASONING_EFFORTS = {"low", "medium", "high", "xhigh", "max", "ultra"}


def canonical_digest(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def confined(root: Path, relative: str) -> Path:
    require(isinstance(relative, str) and relative and not Path(relative).is_absolute(), "evidence path must be a non-empty relative path")
    candidate = (root / relative).resolve()
    try:
        candidate.relative_to(root)
    except ValueError as error:
        raise ContractError(f"evidence path escapes root: {relative}") from error
    return candidate


def validate_models(models: Any) -> dict[str, Any]:
    require(isinstance(models, dict), "models must be an object")
    for field in ("builder_model", "target_model", "judge_model"):
        require(isinstance(models.get(field), str) and models[field], f"{field} is required")
        require(models[field] != "gpt-5.5", "gpt-5.5 is forbidden")
    for field in ("builder_reasoning_effort", "target_reasoning_effort", "judge_reasoning_effort"):
        require(models.get(field) in REASONING_EFFORTS, f"{field} is invalid")
    explicit = models.get("explicit_comparison", False)
    require(isinstance(explicit, bool), "explicit_comparison must be boolean")
    if not explicit:
        require(all(models[field] == DEFAULT_MODEL for field in ("builder_model", "target_model", "judge_model")), "default evaluation models must be gpt-5.6-sol")
        require(all(models[field] == "max" for field in ("builder_reasoning_effort", "target_reasoning_effort", "judge_reasoning_effort")), "default evaluation reasoning effort must be max")
    return models


def reduce_bundle(bundle: Any) -> dict[str, Any]:
    require(isinstance(bundle, dict), "bundle must be an object")
    require(bundle.get("schema_version") == 1, "bundle schema_version must be 1")
    require(isinstance(bundle.get("evaluation_id"), str) and bundle["evaluation_id"], "evaluation_id is required")
    subject = bundle.get("subject")
    require(isinstance(subject, dict), "subject is required")
    require(subject.get("kind") in {"prompt", "agent", "simulation", "harness", "other"}, "subject kind is invalid")
    for field in ("id", "version"):
        require(isinstance(subject.get(field), str) and subject[field], f"subject {field} is required")
    require(isinstance(subject.get("digest"), str) and re.fullmatch(r"[a-f0-9]{64}", subject["digest"]) is not None, "subject digest is invalid")
    models = validate_models(bundle.get("models"))
    mechanical = bundle.get("mechanical_status")
    require(mechanical in {"PASS", "NOT_RUN", "BLOCKED", "INVALID"}, "mechanical_status is invalid")
    root = Path(bundle.get("evidence_root", "")).expanduser().resolve()
    require(root.is_dir(), "evidence_root must be a readable directory")
    evidence = bundle.get("evidence")
    require(isinstance(evidence, list), "evidence must be an array")
    verified_evidence: list[dict[str, str]] = []
    seen_paths: set[str] = set()
    for item in evidence:
        require(isinstance(item, dict), "evidence entry must be an object")
        relative = item.get("path")
        declared = item.get("sha256")
        require(isinstance(declared, str) and re.fullmatch(r"[a-f0-9]{64}", declared) is not None, f"evidence digest is invalid: {relative}")
        require(relative not in seen_paths, f"duplicate evidence path: {relative}")
        seen_paths.add(relative)
        path = confined(root, relative)
        require(path.is_file(), f"evidence file is unavailable: {relative}")
        actual = sha256_file(path)
        require(actual == declared, f"evidence digest mismatch: {relative}")
        verified_evidence.append({"path": relative, "sha256": actual})
    required = bundle.get("required_profile_ids")
    judgments = bundle.get("judgments")
    require(isinstance(required, list) and len(required) == len(set(required)), "required_profile_ids must be a unique array")
    require(all(isinstance(item, str) and item for item in required), "required profile IDs must be non-empty strings")
    require(isinstance(judgments, list), "judgments must be an array")
    if mechanical != "PASS":
        require(not judgments, "semantic judgments cannot run after mechanical ineligibility")
        return {
            "schema_version": 1,
            "evaluation_id": bundle["evaluation_id"],
            "bundle_sha256": canonical_digest(bundle),
            "subject": subject,
            "models": models,
            "mechanical_status": mechanical,
            "judgments": [],
            "conservative_score": None,
            "overall_status": mechanical,
            "evidence": verified_evidence,
        }
    require(required, "mechanically eligible evaluation needs at least one required judge profile")
    reduced: list[dict[str, Any]] = []
    by_profile: dict[str, dict[str, Any]] = {}
    identities: set[str] = set()
    contexts: set[str] = set()
    for judgment in judgments:
        require(isinstance(judgment, dict), "judgment must be an object")
        profile = validate_profile(judgment.get("profile"))
        response = judgment.get("response")
        result = validate_response(profile, response)
        require(profile["model"] == models["judge_model"], "judge profile model does not match bundle")
        require(response["evaluation_id"] == bundle["evaluation_id"], "judge evaluation_id does not match bundle")
        require(response["subject_digest"] == subject["digest"], "judge subject_digest does not match bundle")
        require(profile["profile_id"] not in by_profile, f"duplicate judge profile: {profile['profile_id']}")
        require(response["judge_identity"] not in identities, "required judges must have distinct identities")
        require(response["judge_context_id"] not in contexts, "required judges must have distinct contexts")
        identities.add(response["judge_identity"])
        contexts.add(response["judge_context_id"])
        item = {
            "profile_id": profile["profile_id"],
            "profile_version": profile["version"],
            "judge_identity": response["judge_identity"],
            "judge_context_id": response["judge_context_id"],
            "score": result["score"],
            "verdict": "PASS" if result["passed"] else "FAIL",
        }
        by_profile[profile["profile_id"]] = item
        reduced.append(item)
    require(set(by_profile) == set(required), "judgments must contain every and only required profile exactly once")
    conservative = min(item["score"] for item in reduced)
    overall = "PASS" if all(item["verdict"] == "PASS" for item in reduced) else "FAIL"
    return {
        "schema_version": 1,
        "evaluation_id": bundle["evaluation_id"],
        "bundle_sha256": canonical_digest(bundle),
        "subject": subject,
        "models": models,
        "mechanical_status": mechanical,
        "judgments": sorted(reduced, key=lambda item: item["profile_id"]),
        "conservative_score": conservative,
        "overall_status": overall,
        "evidence": verified_evidence,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args(argv)
    try:
        with args.bundle.open("r", encoding="utf-8") as stream:
            receipt = reduce_bundle(json.load(stream))
        encoded = json.dumps(receipt, indent=2, sort_keys=True) + "\n"
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(encoded, encoding="utf-8")
        else:
            print(encoded, end="")
        return 0
    except (OSError, json.JSONDecodeError, ContractError) as error:
        print(json.dumps({"status": "INVALID", "reason": str(error)}, indent=2, sort_keys=True))
        return 2


if __name__ == "__main__":
    sys.exit(main())
