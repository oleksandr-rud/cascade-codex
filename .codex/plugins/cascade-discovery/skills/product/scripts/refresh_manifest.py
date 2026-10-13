#!/usr/bin/env python3
"""Generate or verify a plugin subject/evaluation/dependency manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from typing import Any


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def aggregate_digest(assets: list[dict[str, str]]) -> str:
    payload = "".join(
        f"{item['path']}\0{item['sha256']}\n"
        for item in sorted(assets, key=lambda item: item["path"])
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def local_assets(root: Path, paths: list[str]) -> list[dict[str, str]]:
    result: list[dict[str, str]] = []
    for relative in paths:
        path = root / relative
        if not path.is_file():
            raise ValueError(f"required asset is unavailable: {relative}")
        result.append({"path": relative, "sha256": sha256(path)})
    return result


def installed_plugins() -> dict[str, dict[str, Any]]:
    process = subprocess.run(
        ["codex", "plugin", "list", "--json"],
        check=True,
        capture_output=True,
        text=True,
    )
    document = json.loads(process.stdout)
    return {
        item["name"]: item
        for item in document.get("installed", [])
        if item.get("installed") and item.get("enabled")
    }


def dependency_assets(contract: dict[str, Any]) -> list[dict[str, str]]:
    installed = installed_plugins()
    result: list[dict[str, str]] = []
    for requirement in contract["required_dependency_artifacts"]:
        alias = requirement["alias"]
        plugin_name = alias.split(":", 1)[0]
        plugin = installed.get(plugin_name)
        if plugin is None:
            raise ValueError(f"required dependency is not installed and enabled: {plugin_name}")
        cache_root = (
            Path.home()
            / ".codex"
            / "plugins"
            / "cache"
            / plugin["marketplaceName"]
            / plugin_name
            / plugin["version"]
        )
        if not cache_root.is_dir():
            raise ValueError(
                f"immutable installed dependency cache is unavailable: {plugin_name} {plugin['version']}"
            )
        artifact_path = cache_root / requirement["path"]
        if not artifact_path.is_file():
            raise ValueError(f"dependency artifact is unavailable: {alias} {requirement['path']}")
        result.append({
            "alias": alias,
            "plugin_version": plugin["version"],
            "path": requirement["path"],
            "sha256": sha256(artifact_path),
        })
    return result


def build(root: Path) -> dict[str, Any]:
    contract = json.loads((root / "evals" / "evaluation-contract.json").read_text(encoding="utf-8"))
    subject = local_assets(root, contract["required_subject_assets"])
    evaluation = local_assets(root, contract["required_evaluation_assets"])
    return {
        "schema_version": 2,
        "manifest_id": f"{contract['plugin_id']}-evaluation-assets-v2",
        "plugin_id": contract["plugin_id"],
        "plugin_version": contract["version"],
        "digest_algorithm": "sha256",
        "subject_digest_algorithm": "sha256-path-digest-list-v1",
        "subject_digest": aggregate_digest(subject),
        "subject_assets": subject,
        "evaluation_assets": evaluation,
        "dependencies": dependency_assets(contract),
    }


def verify(root: Path, manifest: dict[str, Any]) -> list[str]:
    try:
        current = build(root)
    except (OSError, ValueError, subprocess.CalledProcessError, json.JSONDecodeError) as error:
        return [str(error)]
    fields = (
        "schema_version",
        "manifest_id",
        "plugin_id",
        "plugin_version",
        "digest_algorithm",
        "subject_digest_algorithm",
        "subject_digest",
        "subject_assets",
        "evaluation_assets",
        "dependencies",
    )
    return [f"manifest field drift: {field}" for field in fields if manifest.get(field) != current.get(field)]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output", type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    output = args.output or args.root / "evals" / "manifest.json"
    try:
        if args.check:
            manifest = json.loads(output.read_text(encoding="utf-8"))
            errors = verify(args.root, manifest)
            print(json.dumps({"status": "PASS" if not errors else "FAIL", "errors": errors}, indent=2))
            return 0 if not errors else 2
        manifest = build(args.root)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
        print(json.dumps({"status": "PASS", "subject_digest": manifest["subject_digest"], "output": str(output)}, indent=2))
        return 0
    except (OSError, ValueError, subprocess.CalledProcessError, json.JSONDecodeError) as error:
        print(json.dumps({"status": "INVALID", "reason": str(error)}, indent=2))
        return 2


if __name__ == "__main__":
    sys.exit(main())
