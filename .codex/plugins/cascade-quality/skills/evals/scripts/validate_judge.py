#!/usr/bin/env python3
"""Validate one Cascade Evals judge profile and optional response."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys
from typing import Any


SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class ContractError(ValueError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ContractError(message)


def validate_profile(profile: Any) -> dict[str, Any]:
    require(isinstance(profile, dict), "profile must be an object")
    require(profile.get("schema_version") == 1, "profile schema_version must be 1")
    profile_id = profile.get("profile_id")
    require(isinstance(profile_id, str) and SLUG.fullmatch(profile_id) is not None, "profile_id must be lower kebab case")
    require(isinstance(profile.get("version"), int) and profile["version"] >= 1, "profile version must be a positive integer")
    require(profile.get("role") in {"outcome", "trajectory", "safety", "claim-support", "other"}, "profile role is invalid")
    for field in ("decision", "population", "model"):
        require(isinstance(profile.get(field), str) and profile[field].strip(), f"profile {field} is required")
    threshold = profile.get("threshold")
    floor = profile.get("minimum_dimension")
    require(isinstance(threshold, (int, float)) and not isinstance(threshold, bool) and 0 <= threshold <= 1, "threshold must be between 0 and 1")
    require(isinstance(floor, int) and not isinstance(floor, bool) and 0 <= floor <= 4, "minimum_dimension must be an integer from 0 to 4")
    dimensions = profile.get("dimensions")
    require(isinstance(dimensions, list) and dimensions, "profile needs at least one dimension")
    ids: set[str] = set()
    total_weight = 0.0
    for index, dimension in enumerate(dimensions):
        require(isinstance(dimension, dict), f"dimension {index} must be an object")
        dimension_id = dimension.get("dimension_id")
        require(isinstance(dimension_id, str) and SLUG.fullmatch(dimension_id) is not None, f"dimension {index} has an invalid id")
        require(dimension_id not in ids, f"duplicate dimension_id: {dimension_id}")
        ids.add(dimension_id)
        require(isinstance(dimension.get("description"), str) and dimension["description"].strip(), f"{dimension_id}: description is required")
        weight = dimension.get("weight")
        require(isinstance(weight, (int, float)) and not isinstance(weight, bool) and 0 < weight <= 1, f"{dimension_id}: weight must be in (0, 1]")
        total_weight += float(weight)
        anchors = dimension.get("anchors")
        require(isinstance(anchors, dict) and set(anchors) == {"0", "1", "2", "3", "4"}, f"{dimension_id}: anchors 0 through 4 are required")
        require(all(isinstance(value, str) and value.strip() for value in anchors.values()), f"{dimension_id}: anchors must be non-empty")
    require(abs(total_weight - 1.0) <= 1e-9, f"dimension weights must sum to 1.0, got {total_weight}")
    blindness = profile.get("blindness")
    require(isinstance(blindness, list) and blindness and len(blindness) == len(set(blindness)), "blindness rules must be a non-empty unique list")
    require(all(isinstance(item, str) and item.strip() for item in blindness), "blindness rules must be non-empty strings")
    return profile


def validate_response(profile: dict[str, Any], response: Any) -> dict[str, Any]:
    require(isinstance(response, dict), "response must be an object")
    require(response.get("schema_version") == 1, "response schema_version must be 1")
    require(response.get("profile_id") == profile["profile_id"], "response profile_id does not match")
    require(response.get("profile_version") == profile["version"], "response profile_version does not match")
    for field in ("evaluation_id", "judge_identity", "judge_context_id"):
        require(isinstance(response.get(field), str) and response[field].strip(), f"response {field} is required")
    require(isinstance(response.get("subject_digest"), str) and re.fullmatch(r"[a-f0-9]{64}", response["subject_digest"]) is not None, "response subject_digest is invalid")
    require(response.get("leakage_check") == "PASS", "judge leakage check did not pass")
    require(response.get("verdict") in {"PASS", "FAIL"}, "judge verdict must be PASS or FAIL")
    result = score_ratings(profile, response.get("ratings"))
    require(response["verdict"] == ("PASS" if result["passed"] else "FAIL"), "judge verdict disagrees with harness-recomputed score or dimension floor")
    return result


def score_ratings(profile: dict[str, Any], ratings: Any) -> dict[str, Any]:
    """Validate evidence-bearing ratings and recompute the controller decision."""
    require(isinstance(ratings, list), "response ratings must be an array")
    expected = {item["dimension_id"] for item in profile["dimensions"]}
    actual: dict[str, int] = {}
    for item in ratings:
        require(isinstance(item, dict), "every rating must be an object")
        dimension_id = item.get("dimension_id")
        require(isinstance(dimension_id, str) and dimension_id in expected, f"unexpected dimension rating: {dimension_id}")
        require(dimension_id not in actual, f"duplicate rating: {dimension_id}")
        rating = item.get("rating")
        require(isinstance(rating, int) and not isinstance(rating, bool) and 0 <= rating <= 4, f"{dimension_id}: rating must be an integer from 0 to 4")
        evidence = item.get("evidence")
        require(isinstance(evidence, list) and evidence and all(isinstance(value, str) and value.strip() for value in evidence), f"{dimension_id}: evidence is required")
        require(isinstance(item.get("rationale"), str) and item["rationale"].strip(), f"{dimension_id}: rationale is required")
        actual[dimension_id] = rating
    require(set(actual) == expected, "response must rate every profile dimension exactly once")
    score = sum(float(item["weight"]) * actual[item["dimension_id"]] / 4 for item in profile["dimensions"])
    passed = score >= float(profile["threshold"]) and all(value >= profile["minimum_dimension"] for value in actual.values())
    return {"score": score, "passed": passed, "ratings": actual}


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as stream:
        return json.load(stream)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("profile", type=Path)
    parser.add_argument("response", nargs="?", type=Path)
    args = parser.parse_args(argv)
    try:
        profile = validate_profile(load_json(args.profile))
        result: dict[str, Any] = {"status": "PASS", "profile_id": profile["profile_id"], "version": profile["version"]}
        if args.response:
            result["response"] = validate_response(profile, load_json(args.response))
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0
    except (OSError, json.JSONDecodeError, ContractError) as error:
        print(json.dumps({"status": "INVALID", "reason": str(error)}, indent=2, sort_keys=True))
        return 2


if __name__ == "__main__":
    sys.exit(main())
