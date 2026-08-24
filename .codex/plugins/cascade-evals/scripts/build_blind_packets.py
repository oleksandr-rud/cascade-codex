#!/usr/bin/env python3
"""Build deterministic target and redacted judge packets from a subject case suite."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from typing import Any

from validate_judge import ContractError, require, validate_profile


PLUGIN_ROOT = Path(__file__).resolve().parent.parent
JUDGE_PACKET_SCHEMA = PLUGIN_ROOT / "skills" / "evaluate" / "references" / "judge-packet.schema.json"


EXCLUDED_FIELDS = [
    "expected_status",
    "oracle",
    "mechanical_assertions",
    "threshold",
    "minimum_dimension",
    "peer_judgments",
    "builder_context",
]


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode("utf-8")


def digest_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def write_json(path: Path, value: Any) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(canonical_bytes(value) + b"\n")
    return digest_bytes(path.read_bytes())


def artifact(path: Path, *, relative_to: Path) -> dict[str, str]:
    return {
        "path": os.path.relpath(path.resolve(), relative_to.resolve()),
        "sha256": digest_bytes(path.read_bytes()),
    }


def nested_keys(value: Any) -> set[str]:
    if isinstance(value, dict):
        return set(value).union(*(nested_keys(item) for item in value.values()))
    if isinstance(value, list):
        return set().union(*(nested_keys(item) for item in value))
    return set()


def sealed_packet(
    suite: dict[str, Any],
    *,
    evaluation_id: str,
    subject_digest: str,
) -> dict[str, Any]:
    policy = suite["packet_contract"]
    return {
        "schema_version": 1,
        "evaluation_id": evaluation_id,
        "subject_digest": subject_digest,
        "cases": [
            {
                "case_id": case["case_id"],
                **{key: case[key] for key in policy["sealed_fields"]},
            }
            for case in suite["cases"]
        ],
    }


def validate_judge_packet(packet: dict[str, Any], schema_path: Path = JUDGE_PACKET_SCHEMA) -> None:
    from jsonschema import Draft202012Validator

    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    schema_errors = sorted(Draft202012Validator(schema).iter_errors(packet), key=lambda item: list(item.path))
    require(not schema_errors, f"judge packet schema failure: {[error.message for error in schema_errors]}")
    require(
        set(packet)
        == {
            "schema_version",
            "evaluation_id",
            "subject",
            "profile",
            "target_packet",
            "target_output",
            "blindness",
            "response_schema",
        },
        "judge packet top-level shape is invalid",
    )
    require(packet["schema_version"] == 1, "judge packet schema_version is invalid")
    require(packet["response_schema"] == "cascade-evals:judge-response-v1", "judge packet response schema is invalid")
    profile = packet["profile"]
    require(not set(profile).intersection({"threshold", "minimum_dimension"}), "judge profile leaks acceptance policy")
    require(profile.get("dimensions"), "judge packet dimensions are required")
    require(
        abs(sum(float(item["weight"]) for item in profile["dimensions"]) - 1.0) <= 1e-9,
        "judge packet dimension weights must sum to one",
    )
    require(packet["blindness"]["excluded_fields"] == EXCLUDED_FIELDS, "judge packet exclusion list drifted")
    require(packet["blindness"]["leakage_check"] == "PASS", "judge packet leakage check failed")
    require(
        packet["blindness"]["sealed_state_during_judging"] == "HELD_IN_CONTROLLER_MEMORY",
        "sealed state must remain in controller memory during judging",
    )
    leaked = nested_keys(packet).intersection(EXCLUDED_FIELDS)
    require(not leaked, f"judge packet leaks excluded keys: {sorted(leaked)}")


def build_packets(
    suite: dict[str, Any],
    profiles: list[dict[str, Any]],
    *,
    evaluation_id: str,
    subject_id: str,
    subject_version: str,
    subject_digest: str,
    output_dir: Path,
    target_output: Path | None = None,
    judge_packet_schema: Path = JUDGE_PACKET_SCHEMA,
) -> dict[str, Any]:
    require(re.fullmatch(r"[a-f0-9]{64}", subject_digest) is not None, "subject digest is invalid")
    cases = suite.get("cases")
    require(isinstance(cases, list) and cases, "case suite must contain cases")
    policy = suite.get("packet_contract")
    require(isinstance(policy, dict), "case suite packet_contract is required")
    require(policy.get("target_fields") == ["case_id", "request", "fixture"], "target_fields must be exact")
    require(policy.get("sealed_fields") == ["skill", "expected_status", "oracle", "mechanical_assertions"], "sealed_fields must be exact")
    require(
        policy.get("judge_builder") == "cascade-evals/scripts/build_blind_packets.py",
        "judge_builder must bind the installed Cascade Evals packet builder",
    )
    require(
        policy.get("judge_schema") == "cascade-evals/skills/evaluate/references/judge-packet.schema.json",
        "judge_schema must bind the installed Cascade Evals judge-packet schema",
    )
    require(judge_packet_schema.resolve() == JUDGE_PACKET_SCHEMA.resolve(), "judge packet validator schema path is not trusted")
    membership = suite.get("split_membership")
    require(
        isinstance(membership, list)
        and membership
        and membership == [case.get("case_id") for case in cases],
        "split_membership must list every case exactly once in execution order",
    )

    target_cases: list[dict[str, Any]] = []
    for case in cases:
        require(isinstance(case, dict), "each case must be an object")
        target = {key: case[key] for key in policy["target_fields"]}
        leaked = nested_keys(target).intersection(EXCLUDED_FIELDS)
        require(not leaked, f"target packet leaks sealed fields: {case.get('case_id')} {sorted(leaked)}")
        target_cases.append(target)

    subject = {"id": subject_id, "version": subject_version, "digest": subject_digest}
    target_packet = {
        "schema_version": 1,
        "evaluation_id": evaluation_id,
        "suite_id": suite.get("suite_id"),
        "split_id": suite.get("split_id"),
        "subject": subject,
        "cases": target_cases,
    }
    target_path = output_dir / "target-packet.json"
    target_digest = write_json(target_path, target_packet)
    sealed_digest = digest_bytes(
        canonical_bytes(
            sealed_packet(
                suite,
                evaluation_id=evaluation_id,
                subject_digest=subject_digest,
            )
        ) + b"\n"
    )

    judge_paths: list[dict[str, str]] = []
    if target_output is not None:
        require(target_output.is_file(), "target output is unavailable")
        for raw_profile in profiles:
            profile = validate_profile(raw_profile)
            redacted = {
                key: value
                for key, value in profile.items()
                if key not in {"schema_version", "threshold", "minimum_dimension"}
            }
            judge_path = output_dir / "judges" / profile["profile_id"] / "judge-packet.json"
            packet = {
                "schema_version": 1,
                "evaluation_id": evaluation_id,
                "subject": subject,
                "profile": redacted,
                "target_packet": artifact(target_path, relative_to=judge_path.parent),
                "target_output": artifact(target_output, relative_to=judge_path.parent),
                "blindness": {
                    "excluded_fields": EXCLUDED_FIELDS,
                    "leakage_check": "PASS",
                    "sealed_state_during_judging": "HELD_IN_CONTROLLER_MEMORY",
                },
                "response_schema": "cascade-evals:judge-response-v1",
            }
            validate_judge_packet(packet, judge_packet_schema)
            judge_paths.append({
                "path": str(judge_path.relative_to(output_dir)),
                "sha256": write_json(judge_path, packet),
            })

    receipt = {
        "schema_version": 1,
        "evaluation_id": evaluation_id,
        "target_packet": {"path": str(target_path.relative_to(output_dir)), "sha256": target_digest},
        "sealed_packet": {
            "state": "HELD_IN_CONTROLLER_MEMORY",
            "path": None,
            "sha256": sealed_digest,
        },
        "judge_packets": judge_paths,
        "blindness": "PASS",
    }
    write_json(output_dir / "packet-build-receipt.json", receipt)
    return receipt


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", type=Path, required=True)
    parser.add_argument("--profile", type=Path, action="append", default=[])
    parser.add_argument("--evaluation-id", required=True)
    parser.add_argument("--subject-id", required=True)
    parser.add_argument("--subject-version", required=True)
    parser.add_argument("--subject-digest", required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--target-output", type=Path)
    args = parser.parse_args(argv)
    try:
        suite = json.loads(args.cases.read_text(encoding="utf-8"))
        profiles = [json.loads(path.read_text(encoding="utf-8")) for path in args.profile]
        receipt = build_packets(
            suite,
            profiles,
            evaluation_id=args.evaluation_id,
            subject_id=args.subject_id,
            subject_version=args.subject_version,
            subject_digest=args.subject_digest,
            output_dir=args.output_dir,
            target_output=args.target_output,
        )
        print(json.dumps(receipt, indent=2, sort_keys=True))
        return 0
    except (OSError, json.JSONDecodeError, ContractError, KeyError) as error:
        print(json.dumps({"status": "INVALID", "reason": str(error)}, indent=2, sort_keys=True))
        return 2


if __name__ == "__main__":
    sys.exit(main())
