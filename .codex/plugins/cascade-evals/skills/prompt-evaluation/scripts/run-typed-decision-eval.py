#!/usr/bin/env python3
"""Evaluate frozen Laya, Laya Vision, or Jev typed questions against labeled cases."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path
from typing import Any


API_URL = "https://api.typesafe.ai/v1/systemone"


def canonical(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def digest(value: Any) -> str:
    return hashlib.sha256(canonical(value)).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def probability(value: Any, name: str) -> float:
    require(type(value) in (int, float) and math.isfinite(value) and 0 <= value <= 1,
            f"{name} must be a finite probability")
    return float(value)


def validate_pack(pack: Any) -> dict[str, Any]:
    require(isinstance(pack, dict) and pack.get("schema_version") == 1, "pack schema_version must be 1")
    require(isinstance(pack.get("corpus_id"), str) and pack["corpus_id"], "corpus_id required")
    require(type(pack.get("corpus_version")) is int and pack["corpus_version"] > 0, "corpus_version required")
    require(pack.get("split") in ("development", "held_out"), "split must be development or held_out")
    require(isinstance(pack.get("label_provenance"), str) and pack["label_provenance"], "label_provenance required")
    cases, sets, arms = pack.get("cases"), pack.get("question_sets"), pack.get("arms")
    require(isinstance(cases, list) and cases, "nonempty cases required")
    require(isinstance(sets, dict) and sets, "nonempty question_sets required")
    require(isinstance(arms, list) and arms, "nonempty arms required")
    ids = [case.get("id") for case in cases if isinstance(case, dict)]
    require(len(ids) == len(cases) and len(set(ids)) == len(ids) and all(isinstance(i, str) and i for i in ids),
            "case IDs must be distinct nonempty strings")
    for name, questions in sets.items():
        require(isinstance(name, str) and name and isinstance(questions, dict) and questions,
                "question set must have a name and questions")
        for qid, question in questions.items():
            require(isinstance(qid, str) and qid and isinstance(question, dict), f"{name}: invalid question")
            kind = question.get("type")
            require(kind in ("choice", "score", "noul"), f"{name}/{qid}: invalid type")
            require(isinstance(question.get("instructions"), (str, dict, list)) and question["instructions"],
                    f"{name}/{qid}: instructions required")
            criteria = question.get("criteria")
            if kind == "choice":
                require(isinstance(criteria, dict) and 2 <= len(criteria) <= 255,
                        f"{name}/{qid}: choice needs 2-255 options")
                require(all(isinstance(k, str) and k for k in criteria), f"{name}/{qid}: invalid option")
            elif kind == "score":
                require(isinstance(criteria, list) and 2 <= len(criteria) <= 10,
                        f"{name}/{qid}: score needs 2-10 levels")
            elif criteria is not None:
                require(isinstance(criteria, dict) and set(criteria) == {"true", "false"},
                        f"{name}/{qid}: noul criteria need true and false")
    arm_ids = []
    for arm in arms:
        require(isinstance(arm, dict) and isinstance(arm.get("id"), str) and arm["id"], "arm ID required")
        arm_ids.append(arm["id"])
        require(arm.get("question_set") in sets, f"{arm['id']}: unknown question_set")
        fields = arm.get("state_fields")
        require(isinstance(fields, list) and fields and len(fields) == len(set(fields)) and
                all(isinstance(field, str) and field for field in fields), f"{arm['id']}: state_fields required")
    require(len(set(arm_ids)) == len(arm_ids), "arm IDs must be distinct")
    for case in cases:
        require(isinstance(case.get("state"), dict) and isinstance(case.get("gold"), dict),
                f"{case['id']}: state and gold objects required")
        for arm in arms:
            require(set(arm["state_fields"]) <= set(case["state"]),
                    f"{case['id']}/{arm['id']}: missing state field")
            questions = sets[arm["question_set"]]
            require(set(case["gold"]) == set(questions), f"{case['id']}/{arm['id']}: gold/question mismatch")
            for qid, q in questions.items():
                gold = case["gold"][qid]
                if q["type"] == "choice":
                    require(type(gold) is str and gold in q["criteria"], f"{case['id']}/{qid}: invalid Choice gold")
                elif q["type"] == "noul":
                    require(type(gold) is bool, f"{case['id']}/{qid}: Noul gold must be boolean")
                else:
                    require(type(gold) is int and 0 <= gold < len(q["criteria"]),
                            f"{case['id']}/{qid}: Score gold must be a level index")
    thresholds = pack.get("analysis_thresholds", {})
    require(isinstance(thresholds, dict), "analysis_thresholds must be an object")
    for qid, value in thresholds.items():
        probability(value, f"analysis_thresholds/{qid}")
        require(all(qid in questions and questions[qid]["type"] == "noul" for questions in sets.values()),
                f"analysis_thresholds/{qid}: only a shared Noul question is supported")
    return pack


def image_asset(pack_path: Path, descriptor: Any) -> tuple[Path, bytes]:
    """Resolve and verify a pack-local image before its bytes reach the VLM."""
    require(isinstance(descriptor, dict) and set(descriptor) == {"path", "sha256"},
            "image must have only path and sha256")
    relative, expected = descriptor["path"], descriptor["sha256"]
    require(isinstance(relative, str) and relative and isinstance(expected, str) and
            len(expected) == 64 and all(char in "0123456789abcdef" for char in expected),
            "image path and lowercase sha256 are required")
    require(not Path(relative).is_absolute() and not Path(relative).drive,
            "image path must be relative to the pack")
    root = pack_path.resolve().parent
    asset = (root / relative).resolve()
    require(asset.is_relative_to(root) and asset.is_file(), "image must be a file inside the pack directory")
    content = asset.read_bytes()
    require(hashlib.sha256(content).hexdigest() == expected, f"image sha256 mismatch: {relative}")
    return asset, content


def validate_image_assets(pack: dict[str, Any], pack_path: Path) -> None:
    for case in pack["cases"]:
        if "image" in case["state"]:
            image_asset(pack_path, case["state"]["image"])


def validate_answer(response: Any, questions: dict[str, Any], *, reject_truncation: bool = False) -> dict[str, Any]:
    require(isinstance(response, dict) and isinstance(response.get("answers"), dict), "answers object missing")
    answers = response["answers"]
    require(set(answers) == set(questions), "answer IDs differ from question IDs")
    values = {}
    for qid, question in questions.items():
        answer, kind = answers[qid], question["type"]
        require(isinstance(answer, dict) and answer.get("type") == kind, f"{qid}: answer type mismatch")
        if reject_truncation:
            require("truncated" not in answer, f"{qid}: input was truncated")
        if kind == "noul":
            values[qid] = probability(answer.get("noul"), f"{qid}/noul")
            continue
        probabilities = answer.get("probabilities")
        require(isinstance(probabilities, dict), f"{qid}: probabilities missing")
        expected = set(question["criteria"]) if kind == "choice" else {str(i) for i in range(len(question["criteria"]))}
        require(set(probabilities) == expected, f"{qid}: probability keys differ from criteria")
        for key, value in probabilities.items():
            probability(value, f"{qid}/probabilities/{key}")
        require(abs(sum(probabilities.values()) - 1) <= 0.03, f"{qid}: probabilities do not sum to one")
        probability(answer.get("confidence"), f"{qid}/confidence")
        if kind == "choice":
            choice = answer.get("choice")
            require(choice in expected, f"{qid}: Choice label outside criteria")
            require(probabilities[choice] >= max(probabilities.values()) - 0.02,
                    f"{qid}: Choice label conflicts with probabilities")
            values[qid] = choice
        else:
            score = answer.get("score")
            require(type(score) in (int, float) and math.isfinite(score) and 0 <= score <= len(expected) - 1,
                    f"{qid}: Score outside rubric")
            require(isinstance(answer.get("legend"), dict) and set(answer["legend"]) == expected,
                    f"{qid}: Score legend mismatch")
            values[qid] = float(score)
    return values


def jev_predict(request: dict[str, Any], timeout: float) -> dict[str, Any]:
    token = os.environ.get("TYPESAFE_API_KEY")
    require(bool(token), "TYPESAFE_API_KEY is required for Jev")
    http = urllib.request.Request(API_URL, data=canonical(request), method="POST",
                                  headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(http, timeout=timeout) as result:
                return json.load(result)
        except urllib.error.HTTPError as error:
            if error.code not in (429, 529) or attempt == 2:
                raise RuntimeError(f"Jev HTTP {error.code}") from None
            time.sleep(min(2 ** attempt, 4))
    raise RuntimeError("Jev retry budget exhausted")


def package_version(name: str) -> str | None:
    try:
        return version(name)
    except PackageNotFoundError:
        return None


def build_request(case: dict[str, Any], arm: dict[str, Any], pack: dict[str, Any], model: str) -> dict[str, Any]:
    return {
        "model": model,
        "state": {key: case["state"][key] for key in arm["state_fields"]},
        "questions": pack["question_sets"][arm["question_set"]],
    }


def vision_predict(agent: Any, request: dict[str, Any], pack_path: Path) -> dict[str, Any]:
    state = dict(request["state"])
    _, state["image"] = image_asset(pack_path, state["image"])
    return agent.predict(state, request["questions"], strict=True)


def metrics(rows: list[dict[str, Any]], pack: dict[str, Any]) -> dict[str, Any]:
    summary: dict[str, Any] = {}
    for arm in pack["arms"]:
        questions = pack["question_sets"][arm["question_set"]]
        arm_rows = [row for row in rows if row["arm_id"] == arm["id"]]
        arm_summary: dict[str, Any] = {"cases": len(arm_rows), "valid": sum(row["status"] == "VALID" for row in arm_rows),
                                       "invalid": sum(row["status"] != "VALID" for row in arm_rows), "questions": {}}
        for qid, question in questions.items():
            valid = [(row["values"][qid], row["gold"][qid]) for row in arm_rows if row["status"] == "VALID"]
            kind = question["type"]
            if kind == "choice":
                arm_summary["questions"][qid] = {
                    "type": kind, "correct": sum(answer == gold for answer, gold in valid), "count": len(valid),
                    "confusion": {label: {actual: sum(gold == label and answer == actual for answer, gold in valid)
                                          for actual in question["criteria"]} for label in question["criteria"]},
                }
            elif kind == "score":
                arm_summary["questions"][qid] = {"type": kind, "count": len(valid),
                    "ordinal_mae": sum(abs(answer - gold) for answer, gold in valid) / len(valid) if valid else None}
            else:
                positives = [answer for answer, gold in valid if gold]
                negatives = [answer for answer, gold in valid if not gold]
                pairs = [1.0 if pos > neg else 0.5 if pos == neg else 0.0
                         for pos in positives for neg in negatives]
                result = {"type": kind, "count": len(valid), "positive_count": len(positives),
                          "negative_count": len(negatives), "pairwise_auc": sum(pairs) / len(pairs) if pairs else None,
                          "positive_mean": sum(positives) / len(positives) if positives else None,
                          "negative_mean": sum(negatives) / len(negatives) if negatives else None}
                if pack["split"] == "development" and positives and negatives:
                    largest_negative, smallest_positive = max(negatives), min(positives)
                    result["observed_separation"] = {
                        "largest_negative": largest_negative,
                        "smallest_positive": smallest_positive,
                        "exploratory_midpoint": ((largest_negative + smallest_positive) / 2
                                                  if len(valid) == len(arm_rows) and largest_negative < smallest_positive
                                                  else None),
                        "complete_case_set": len(valid) == len(arm_rows),
                    }
                threshold = pack.get("analysis_thresholds", {}).get(qid)
                if threshold is not None:
                    result["exploratory_threshold"] = {"value": threshold,
                        "true_positive": sum(answer >= threshold and gold for answer, gold in valid),
                        "false_positive": sum(answer >= threshold and not gold for answer, gold in valid),
                        "true_negative": sum(answer < threshold and not gold for answer, gold in valid),
                        "false_negative": sum(answer < threshold and gold for answer, gold in valid)}
                arm_summary["questions"][qid] = result
        summary[arm["id"]] = arm_summary
    return summary


def run(pack_path: Path, provider: str, model: str, output: Path, timeout: float, max_calls: int,
        revision: str | None = None) -> dict[str, Any]:
    pack_bytes = pack_path.read_bytes()
    pack = validate_pack(json.loads(pack_bytes))
    require(provider in ("laya", "laya-vision", "jev"), "provider must be laya, laya-vision, or jev")
    require(revision is None or (provider == "laya-vision" and isinstance(revision, str) and revision),
            "revision is supported only for laya-vision")
    require(timeout > 0, "timeout must be positive")
    require(type(max_calls) is int and max_calls > 0, "max_calls must be positive")
    require(len(pack["cases"]) * len(pack["arms"]) <= max_calls,
            f"pack needs {len(pack['cases']) * len(pack['arms'])} calls, above max_calls={max_calls}")
    if provider == "laya-vision":
        require(all("image" in arm["state_fields"] for arm in pack["arms"]),
                "every laya-vision arm must include image")
        require(all("image" in case["state"] for case in pack["cases"]),
                "every laya-vision case must include image")
        validate_image_assets(pack, pack_path)
    else:
        require(all("image" not in arm["state_fields"] for arm in pack["arms"]),
                "image state requires laya-vision provider")
    if provider == "jev":
        require(bool(os.environ.get("TYPESAFE_API_KEY")), "TYPESAFE_API_KEY is required for Jev")
    elif provider == "laya":
        try:
            from laya import Router
        except ImportError as error:
            raise ValueError("Laya is not installed in this Python environment") from error
        router = Router(max_loaded=2)
        try:
            laya_model_key = router.route({}, model=model)["model"]
        except (KeyError, ValueError) as error:
            raise ValueError(f"unknown Laya checkpoint: {model}") from error
    else:
        try:
            import laya
        except ImportError as error:
            raise ValueError("Laya Vision fork is not installed in this Python environment") from error
        require(callable(getattr(laya, "load_vlm", None)),
                "installed laya lacks load_vlm; install the independent Laya Vision fork")
        vision_agent = laya.load_vlm(model, revision=revision)
    output.mkdir(parents=True, exist_ok=False)
    started_at = datetime.now(timezone.utc).isoformat()
    manifest = {"schema_version": 1, "status": "RUNNING", "started_at": started_at,
                "provider": provider, "requested_model": model,
                "sdk_version": (getattr(laya, "__version__", None) if provider == "laya-vision" else
                                package_version("laya") if provider == "laya" else None),
                "corpus_id": pack["corpus_id"], "corpus_version": pack["corpus_version"],
                "split": pack["split"], "label_provenance": pack["label_provenance"],
                "runner_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                "python_version": sys.version.split()[0], "max_calls": max_calls,
                "pack_sha256": hashlib.sha256(pack_bytes).hexdigest(), "cases_sha256": digest(pack["cases"]),
                "question_sets_sha256": {name: digest(questions) for name, questions in pack["question_sets"].items()},
                "arms_sha256": digest(pack["arms"]), "analysis_thresholds": pack.get("analysis_thresholds", {})}
    if provider == "laya-vision":
        manifest["checkpoint"] = {"repo": model, "requested_revision": revision,
                                  "loaded_source": getattr(vision_agent, "source", None),
                                  "strict_truncation": True}
        manifest["image_sha256"] = {case["id"]: case["state"]["image"]["sha256"]
                                    for case in pack["cases"]}
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    rows = []
    for arm in pack["arms"]:
        for case in pack["cases"]:
            request = build_request(case, arm, pack, model)
            if provider == "laya-vision":
                request["predict_options"] = {"strict": True}
            prefix = f"{len(rows):04d}"
            (output / f"{prefix}-request.json").write_text(json.dumps(request, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            started = time.perf_counter()
            response = None
            try:
                if provider == "laya":
                    response = router.predict(request["state"], request["questions"], model=model)
                elif provider == "laya-vision":
                    response = vision_predict(vision_agent, request, pack_path)
                else:
                    response = jev_predict(request, timeout)
                values = validate_answer(response, request["questions"], reject_truncation=provider == "laya-vision")
                status, error = "VALID", None
            except Exception as failure:
                values, status, error = {}, "INVALID", f"{type(failure).__name__}: {failure}"
            if response is not None:
                (output / f"{prefix}-response.json").write_text(json.dumps(response, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            row = {"arm_id": arm["id"], "case_id": case["id"], "status": status,
                   "request_sha256": digest(request), "response_sha256": digest(response) if response is not None else None,
                   "returned_model": response.get("model") if isinstance(response, dict) else None,
                   "routing": response.get("routing") if isinstance(response, dict) else None,
                   "usage": response.get("usage") if isinstance(response, dict) else None,
                   "latency_ms": round((time.perf_counter() - started) * 1000, 2),
                   "values": values, "gold": case["gold"], "error": error}
            (output / f"{prefix}-result.json").write_text(json.dumps(row, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            rows.append(row)
    invalid_count = sum(row["status"] != "VALID" for row in rows)
    manifest["status"] = ("EXECUTED_WITH_INVALID" if invalid_count else
                          "EXECUTED_EXPLORATORY" if pack["split"] == "development" else "EXECUTED_HELD_OUT_UNREVIEWED")
    if provider == "laya" and any(row["status"] == "VALID" for row in rows):
        agent = router.load(laya_model_key)
        manifest["checkpoint"] = {"repo": str(router.models[laya_model_key]), "revision": "UNPINNED",
                                  "device": str(agent.device), "max_len": agent.cfg.get("max_len"),
                                  "head_max_len": agent.cfg.get("head_max_len"),
                                  "temperature_applied": agent.temperature,
                                  "temperature_shipped": agent.temperature_raw}
    manifest["completed_at"] = datetime.now(timezone.utc).isoformat()
    summary = {"manifest": manifest, "metrics": metrics(rows, pack),
               "quality_claim": "No threshold or automatic action is qualified by this runner.",
               "invalid_results": invalid_count}
    (output / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    validate = sub.add_parser("validate")
    validate.add_argument("--pack", type=Path, required=True)
    execute = sub.add_parser("run")
    execute.add_argument("--pack", type=Path, required=True)
    execute.add_argument("--provider", choices=("laya", "laya-vision", "jev"), required=True)
    execute.add_argument("--model", required=True)
    execute.add_argument("--revision", help="Optional pinned Hub checkpoint revision for laya-vision")
    execute.add_argument("--output", type=Path, required=True)
    execute.add_argument("--timeout", type=float, default=30)
    execute.add_argument("--max-calls", type=int, default=200)
    args = parser.parse_args()
    try:
        if args.command == "validate":
            pack = validate_pack(json.loads(args.pack.read_text(encoding="utf-8")))
            validate_image_assets(pack, args.pack)
            print(json.dumps({"status": "VALIDATED", "corpus_id": pack["corpus_id"],
                              "cases": len(pack["cases"]), "arms": len(pack["arms"])}))
        else:
            summary = run(args.pack, args.provider, args.model, args.output, args.timeout, args.max_calls,
                          args.revision)
            print(json.dumps({"status": summary["manifest"]["status"], "output": str(args.output.resolve()),
                              "metrics": summary["metrics"], "invalid_results": summary["invalid_results"]}))
            if summary["invalid_results"]:
                return 3
        return 0
    except (ValueError, OSError, json.JSONDecodeError) as error:
        print(f"BLOCKED: {error}", file=sys.stderr)
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
