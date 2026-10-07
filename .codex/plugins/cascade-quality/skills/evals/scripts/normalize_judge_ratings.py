#!/usr/bin/env python3
"""Versioned blind ratings transport; only the controller owns acceptance."""

from __future__ import annotations

import copy
import hashlib
import json
import re
from typing import Any

from validate_judge import require, score_ratings, validate_profile, validate_response

PROTOCOL = "ratings-only-controller-v2"
BINDING_FIELDS = {
    "evaluation_id", "subject_digest", "profile_id", "profile_version",
    "judge_identity", "judge_context_id", "model", "reasoning_effort",
}


def digest(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"),
                                     ensure_ascii=False, allow_nan=False).encode("utf-8")).hexdigest()


def normalize_ratings(profile: dict[str, Any], raw: Any,
                      binding: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Reject legacy/model-owned identity or verdict fields, then bind host data."""
    validate_profile(profile)
    require(isinstance(raw, dict) and set(raw) == {"schema_version", "ratings", "leakage_check"},
            "ratings transport v2 admits only schema_version, ratings and leakage_check")
    require(type(raw["schema_version"]) is int and raw["schema_version"] == 2,
            "ratings transport schema_version must be 2")
    require(raw["leakage_check"] == "PASS", "judge leakage check did not pass")
    require(isinstance(binding, dict) and set(binding) == BINDING_FIELDS,
            "controller judge binding fields are invalid")
    for field in ("evaluation_id", "judge_identity", "judge_context_id", "model", "reasoning_effort"):
        require(isinstance(binding[field], str) and binding[field].strip(), f"controller {field} is required")
    require(isinstance(binding["subject_digest"], str)
            and re.fullmatch(r"[a-f0-9]{64}", binding["subject_digest"]) is not None,
            "controller subject_digest is invalid")
    require(binding["profile_id"] == profile["profile_id"], "controller profile_id mismatch")
    require(type(binding["profile_version"]) is int and binding["profile_version"] == profile["version"],
            "controller profile_version mismatch")
    require(binding["model"] == profile["model"], "controller judge model mismatch")
    require(isinstance(raw["ratings"], list), "response ratings must be an array")
    for rating in raw["ratings"]:
        require(isinstance(rating, dict) and set(rating) == {"dimension_id", "rating", "evidence", "rationale"},
                "ratings transport item fields are invalid")
    scored = score_ratings(profile, raw["ratings"])
    response = {
        "schema_version": 1,
        **{key: binding[key] for key in BINDING_FIELDS - {"model", "reasoning_effort"}},
        "ratings": copy.deepcopy(raw["ratings"]),
        "leakage_check": "PASS",
        "verdict": "PASS" if scored["passed"] else "FAIL",
    }
    validate_response(profile, response)
    receipt = {
        "schema_version": 2, "protocol": PROTOCOL, "status": "PASS",
        "raw_response_digest": digest(raw), "profile_digest": digest(profile),
        "binding": copy.deepcopy(binding), "binding_digest": digest(binding),
        "normalized_response_digest": digest(response), "score": scored["score"],
        "verdict": response["verdict"],
        "acceptance_owner": "CONTROLLER", "legacy_response_migration": "REJECTED",
    }
    return response, receipt
