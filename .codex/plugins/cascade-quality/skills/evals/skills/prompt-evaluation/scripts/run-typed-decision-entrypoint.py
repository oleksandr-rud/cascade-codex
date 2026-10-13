#!/usr/bin/env python3
"""Route new typed evaluations to pinned v2; inspect legacy evidence without executing it."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import types
from pathlib import Path
from typing import Any

from typed_decision_binding import inspect_legacy_manifest, resolve_runner_binding, validate_execution_manifest


def load_runner(binding: dict[str, Any]) -> types.ModuleType:
    path = Path(__file__).resolve().parent / binding["runner_file"]
    source = path.read_bytes()
    if hashlib.sha256(source).hexdigest() != binding["runner_sha256"]:
        raise ValueError("runner changed before loading; no legacy fallback")
    module = types.ModuleType("cascade_typed_decision_v2")
    module.__file__ = str(path)
    module._verified_source_sha256 = binding["runner_sha256"]
    exec(compile(source, str(path), "exec"), module.__dict__)
    return module


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runner", choices=("v2", "legacy"), default="v2")
    parser.add_argument("--binding-sha256", help="Expected SHA-256 of the frozen entrypoint binding")
    parser.add_argument("command", choices=("run", "validate", "validate-manifest", "inspect-legacy"))
    parser.add_argument("arguments", nargs=argparse.REMAINDER)
    args = parser.parse_args(argv)
    try:
        if args.command == "inspect-legacy":
            detail = argparse.ArgumentParser(prog="inspect-legacy")
            detail.add_argument("--manifest", type=Path, required=True)
            options = detail.parse_args(args.arguments)
            result = inspect_legacy_manifest(json.loads(options.manifest.read_bytes()),
                                             expected_binding_sha256=args.binding_sha256)
            print(json.dumps(result))
            return 0
        binding = resolve_runner_binding(args.runner, expected_binding_sha256=args.binding_sha256)
        if args.command == "validate-manifest":
            detail = argparse.ArgumentParser(prog="validate-manifest")
            detail.add_argument("--manifest", type=Path, required=True)
            options = detail.parse_args(args.arguments)
            result = validate_execution_manifest(json.loads(options.manifest.read_bytes()),
                                                 expected_binding_sha256=args.binding_sha256)
            print(json.dumps(result))
            return 0
        return load_runner(binding).main(["--binding-sha256", binding["binding_manifest_sha256"],
                                          args.command, *args.arguments])
    except (ValueError, OSError, json.JSONDecodeError) as error:
        print(f"BLOCKED: {error}", file=sys.stderr)
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
