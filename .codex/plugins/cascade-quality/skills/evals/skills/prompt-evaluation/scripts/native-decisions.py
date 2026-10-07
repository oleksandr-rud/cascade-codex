#!/usr/bin/env python3
"""Bounded native scoring: first-party Intern engine / reviewed Imajev scorer."""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import sys
import time

PINS = {
    ("intern", "2b"): ("internlm/Intern-Decision-2B", "8797836c65fc91a2435b1fb6850b5f0aabd75cc3"),
    ("intern", "4b"): ("internlm/Intern-Decision-4B", "0e5e6aa7d6d750e2b1504ba11a8136cb58aeb3cd"),
    ("imajev", "2b"): ("mohit67890/imajev-2b", "0426f7b1c73804b64fab5802e04f401420ec774c"),
    ("imajev", "4b"): ("mohit67890/imajev-4b", "c9e5f132465da85d31735ec502d5557982671a7d"),
}
IMAJEV_SOURCE = "ccf586d43d2a580319b6535c893668904d909eb9"


def require(condition, message):
    if not condition: raise ValueError(message)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False,
        separators=(",", ":"), allow_nan=False).encode("utf-8")).hexdigest()


def file_digest(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def verify_assets(root, files):
    root = Path(root).resolve()
    require(root.is_dir() and isinstance(files, dict) and files, "native assets are unavailable")
    for relative, expected in files.items():
        path = (root / relative).resolve()
        require(not Path(relative).is_absolute() and not Path(relative).drive
                and path.is_relative_to(root) and path.is_file(), "native asset path is invalid")
        require(file_digest(path) == expected, "native asset digest drift: " + relative)
    consumed = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()
        and ".cache" not in p.relative_to(root).parts
        and p.suffix in {".safetensors", ".json", ".jinja", ".txt"}}
    require(consumed <= set(files), "native loader inventory contains unbound files")
    return root


def probability(value):
    require(type(value) in (int, float) and math.isfinite(value) and 0 <= value <= 1, "invalid native probability")
    return float(value)


def validate_answer(response, questions, family, expected_model):
    require(family in {"intern", "imajev"} and isinstance(response, dict), "native family/response invalid")
    require(response.get("model") == expected_model, "native returned model identity mismatch")
    require(isinstance(response.get("answers"), dict) and set(response["answers"]) == set(questions),
            "native question cardinality mismatch")
    values = {}
    for qid, question in questions.items():
        answer = response["answers"][qid]
        kind = question["type"]
        require(answer.get("type") == kind and kind in {"choice", "score", "noul"}, "native primitive mismatch")
        unknown = probability(answer.get("unknown_probability")) if family == "imajev" else 0.0
        abstained = answer.get("abstained", False)
        require(type(abstained) is bool and (family == "imajev" or not abstained), "invalid native abstention status")
        if kind == "noul":
            value = probability(answer.get("noul"))
            if family == "intern":
                probs = answer.get("probabilities")
                require(isinstance(probs, dict) and set(probs) == {"yes", "no"}, "Intern Noul candidate mapping mismatch")
                distribution = {k: probability(p) for k, p in probs.items()}
                require(abs(sum(distribution.values()) - 1) <= 1e-5 and abs(value - distribution["yes"]) <= 1e-5,
                        "Intern Noul must be native P(yes)")
                require(abs(probability(answer.get("confidence")) - max(distribution.values())) <= 1e-5,
                        "Intern confidence must be maximum candidate probability")
                require(answer.get("decision") in distribution
                        and abs(distribution[answer["decision"]] - max(distribution.values())) <= 1e-5,
                        "Intern native Noul decision conflicts with its distribution")
            else:
                yes = value - .5 * unknown
                require(-1e-5 <= yes <= 1 - unknown + 1e-5, "Imajev Noul conflicts with native unknown mass")
                distribution = {"yes": yes, "no": 1 - unknown - yes}
                known = answer.get("probabilities")
                require(isinstance(known, dict) and set(known) == {"true", "false"}, "Imajev Noul candidates invalid")
                mass = 1 - unknown
                require(abs(sum(probability(p) for p in known.values()) - 1) <= 1e-5
                        and abs(probability(known["true"]) * mass - yes) <= 1e-5,
                        "Imajev Noul must retain native yes and unknown mass")
        else:
            expected = list(question["criteria"]) if kind == "choice" else [str(i) for i in range(len(question["criteria"]))]
            require(2 <= len(expected) <= 254 and len(set(expected)) == len(expected), "native candidate count invalid")
            probs = answer.get("probabilities")
            require(isinstance(probs, dict) and set(probs) == set(expected), "native option/level mapping mismatch")
            distribution = {k: probability(probs[k]) for k in expected}
            require(abs(sum(distribution.values()) - 1) <= 1e-5, "native distribution is not normalized")
            confidence = probability(answer.get("confidence"))
            native_confidence = max(distribution.values()) if family == "intern" else (
                max(0, (len(expected) * max(distribution.values()) - 1) / (len(expected) - 1)) * (1 - unknown))
            require(abs(confidence - native_confidence) <= 1e-5, "native confidence semantics mismatch")
            if kind == "choice":
                value = answer.get("choice")
                require(value in distribution and abs(distribution[value] - max(distribution.values())) <= 1e-5,
                        "native Choice must preserve argmax")
            else:
                value = answer.get("score")
                require(type(value) in (int, float) and math.isfinite(value)
                        and abs(value - sum(int(k) * p for k, p in distribution.items())) <= 1e-5,
                        "native Score must be the probability-weighted expectation")
                require(answer.get("legend") == {str(i): level for i, level in enumerate(question["criteria"])},
                        "native Score legend mismatch")
            if family == "intern":
                require(answer.get("decision") in distribution, "Intern native decision is missing")
                require(abs(distribution[answer["decision"]] - max(distribution.values())) <= 1e-5,
                        "Intern native decision conflicts with its distribution")
        unconditional = {k: p * (1 - unknown) for k, p in distribution.items()} if kind != "noul" else distribution
        if family == "imajev":
            largest = max(unconditional.values())
            require((unknown >= largest - 1e-5) if abstained else (unknown <= largest + 1e-5),
                    "Imajev native abstention conflicts with the unconditional distribution")
            require(answer.get("status") == ("abstained" if abstained else "answered"), "Imajev status drift")
        values[qid] = {"value": None if abstained else value, "reported_value": value,
                       "unknown_probability": unknown, "abstained": abstained,
                       "unconditional_probabilities": unconditional,
                       "action_authority": "NONE"}
    return values


def load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    require(spec is not None and spec.loader is not None, "official native module is unavailable")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def execute(binding, request, request_root, output):
    family, size = binding.get("family"), binding.get("size")
    require(binding.get("schema_version") == 2 and (family, size) in PINS, "native binding version/family/size invalid")
    require((binding.get("checkpoint_id"), binding.get("checkpoint_revision")) == PINS[family, size],
            "native checkpoint differs from the inspected release")
    require(binding.get("device") == "cuda" and binding.get("dtype") == "bfloat16",
            "this native arm requires CUDA/BF16; no implicit fallback")
    require(binding.get("max_input_tokens") == 4096, "native input budget must be frozen at 4096")
    cases = request.get("cases")
    require(isinstance(cases, list) and 1 <= len(cases) <= 6, "native pack must contain 1..6 cases")
    require(len({c["case_id"] for c in cases}) == len(cases), "native case identities must be unique")
    require(not output.exists(), "native output must be a new directory")
    output.mkdir(parents=True)
    started = time.monotonic()
    receipt = {"schema_version": 2, "status": "BLOCKED", "family": family, "size": size,
        "binding_digest": digest(binding), "request_digest": digest(request), "cases": [],
        "quality_claim": "Native-path diagnostic only; accuracy, calibration and action gates are unqualified."}
    def save():
        receipt["elapsed_seconds"] = time.monotonic() - started
        (output / "receipt.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    # A stalled GPU load/forward is a failure, never an implicit alternate backend.
    import threading
    stopped = threading.Event()
    deadline = [time.monotonic() + 300, "model-load"]
    def watchdog():
        while not stopped.wait(1):
            if time.monotonic() > min(deadline[0], started + 900):
                receipt.update(status="BLOCKED", error="NATIVE_DEADLINE_EXHAUSTED", phase=deadline[1])
                save()
                os._exit(3)
    threading.Thread(target=watchdog, daemon=True).start()
    try:
        weights = verify_assets(binding["weights_root"], binding["weights_files"])
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
        os.environ["HF_HOME"] = str(output / "isolated-hf-cache")
        import torch
        require(torch.cuda.is_available(), "pinned native CUDA backend unavailable")
        from native_scoring_backend import Intern, Imajev
        if family == "intern":
            source = Path(binding["source_file"]).resolve()
            require(file_digest(source) == binding["source_digest"], "Intern first-party source digest drift")
            engine = Intern(size=size, weights=weights, source=source, execution_root=output,
                            media_root=request_root, max_input_tokens=4096)
        else:
            require(binding.get("source_revision") == IMAJEV_SOURCE, "Imajev inspected source revision mismatch")
            adapter = verify_assets(binding["adapter_root"], binding["adapter_files"])
            engine = Imajev(size=size, weights=weights, adapter=adapter, max_input_tokens=4096,
                            rotations=4, temperature_mode="native")
        receipt["model_load_seconds"] = time.monotonic() - started
        receipt["provenance"] = engine.provenance
        for index, case in enumerate(cases):
            deadline[:] = [time.monotonic() + 180, case["case_id"]]
            require(isinstance(case["questions"], dict) and len(case["questions"]) == 1,
                    "native diagnostics execute one bound question per case")
            qid, question = next(iter(case["questions"].items()))
            images = []
            for descriptor in case.get("images", []):
                require(isinstance(descriptor, dict) and set(descriptor) == {"path", "sha256"}, "image binding invalid")
                image = (request_root / descriptor["path"]).resolve()
                require(image.is_relative_to(request_root.resolve()) and image.is_file(), "image path escape or missing file")
                require(file_digest(image) == descriptor["sha256"], "image digest drift")
                images.append(image)
            before = time.monotonic()
            native_request, raw = engine.predict(case["state"], question, images)
            raw["answers"] = {qid: raw["answers"]["decision"]}
            # Retain native bytes before any arithmetic validation can reject them.
            raw_path = output / f"case-{index + 1}-raw.json"
            raw_path.write_text(json.dumps(raw, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            values = validate_answer(raw, case["questions"], family, binding["expected_model"])
            receipt["cases"].append({"case_id": case["case_id"], "status": "PASS",
                "request_digest": digest(case), "response_digest": digest(raw), "values": values,
                "raw_file": raw_path.name, "raw_sha256": file_digest(raw_path),
                "elapsed_seconds": time.monotonic() - before})
            save()
        receipt.update(status="NATIVE_DIAGNOSTIC_COMPLETE", native_inference=True, generic_generation=False,
            qualification=False, action_authority="NONE",
            environment={"python": sys.version.split()[0], "torch": torch.__version__,
                         "cuda_build": torch.version.cuda, "device": "cuda"})
    except Exception as error:
        receipt.update(status="BLOCKED", error=f"{type(error).__name__}: {error}")
    finally:
        stopped.set()
        save()
    return receipt


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--binding", type=Path, required=True)
    parser.add_argument("--request", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = execute(json.loads(args.binding.read_text()), json.loads(args.request.read_text()), args.request.parent, args.output)
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result["status"] == "NATIVE_DIAGNOSTIC_COMPLETE" else 3


if __name__ == "__main__": raise SystemExit(main())
