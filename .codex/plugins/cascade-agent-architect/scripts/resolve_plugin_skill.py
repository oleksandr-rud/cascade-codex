#!/usr/bin/env python3
"""Resolve one installed Codex plugin skill without cache searching or fallback."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from typing import Any


EXIT_AVAILABLE = 0
EXIT_BLOCKED = 2
EXIT_INVALID = 3
SKILL_NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_digest(value: Any) -> str:
    encoded = json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def receipt(
    status: str,
    code: str,
    reason: str,
    *,
    plugin: str,
    skill: str,
    marketplace: str | None,
    resolved_at: str,
    inventory_source: str,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "status": status,
        "code": code,
        "reason": reason,
        "request": {
            "plugin": plugin,
            "skill": skill,
            "marketplace": marketplace,
        },
        "resolved_at": resolved_at,
        "inventory_source": inventory_source,
    }
    if details:
        result.update(details)
    return result


def read_inventory(path: str | None, timeout_seconds: float) -> tuple[Any, str]:
    if path == "-":
        return json.load(sys.stdin), "stdin"
    if path:
        inventory_path = Path(path).expanduser().resolve()
        with inventory_path.open("r", encoding="utf-8") as stream:
            return json.load(stream), str(inventory_path)

    completed = subprocess.run(
        ["codex", "plugin", "list", "--json"],
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout_seconds,
    )
    if completed.returncode != 0:
        stderr = completed.stderr.strip()
        raise RuntimeError(
            f"codex plugin list --json exited {completed.returncode}"
            + (f": {stderr}" if stderr else "")
        )
    return json.loads(completed.stdout), "codex plugin list --json"


def frontmatter_name(skill_path: Path) -> str | None:
    with skill_path.open("r", encoding="utf-8") as stream:
        lines = stream.read(16384).splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if line.startswith("name:"):
            return line.split(":", 1)[1].strip().strip("\"'")
    return None


def resolve(
    inventory: Any,
    *,
    plugin_name: str,
    skill_name: str,
    marketplace: str | None,
    resolved_at: str,
    inventory_source: str,
) -> tuple[dict[str, Any], int]:
    base = {
        "plugin": plugin_name,
        "skill": skill_name,
        "marketplace": marketplace,
        "resolved_at": resolved_at,
        "inventory_source": inventory_source,
    }
    if not SKILL_NAME_RE.fullmatch(skill_name):
        return (
            receipt(
                "BLOCKED",
                "INVALID_SKILL_NAME",
                "Skill name must be lowercase hyphen-case.",
                **base,
            ),
            EXIT_BLOCKED,
        )
    if not isinstance(inventory, dict) or not isinstance(inventory.get("installed"), list):
        return (
            receipt(
                "BLOCKED",
                "MALFORMED_INVENTORY",
                "Plugin inventory must contain an installed array.",
                **base,
            ),
            EXIT_BLOCKED,
        )

    matches = []
    malformed_matches = []
    for item in inventory["installed"]:
        if not isinstance(item, dict):
            continue
        if item.get("name") != plugin_name:
            continue
        if marketplace is not None and item.get("marketplaceName") != marketplace:
            continue
        if not isinstance(item.get("pluginId"), str):
            malformed_matches.append(item)
        else:
            matches.append(item)

    if malformed_matches:
        return (
            receipt(
                "BLOCKED",
                "MALFORMED_PLUGIN_ENTRY",
                "Matching plugin inventory entry has no pluginId.",
                **base,
            ),
            EXIT_BLOCKED,
        )
    if not matches:
        return (
            receipt(
                "BLOCKED",
                "PLUGIN_NOT_INSTALLED",
                "No exact installed plugin entry matched the request.",
                **base,
            ),
            EXIT_BLOCKED,
        )
    if len(matches) != 1:
        return (
            receipt(
                "BLOCKED",
                "AMBIGUOUS_PLUGIN",
                "More than one installed plugin entry matched; specify a marketplace.",
                **base,
                details={"matching_plugin_ids": sorted(item["pluginId"] for item in matches)},
            ),
            EXIT_BLOCKED,
        )

    item = matches[0]
    if item.get("installed") is not True:
        return (
            receipt(
                "BLOCKED",
                "PLUGIN_NOT_INSTALLED",
                "The matching plugin entry is not installed.",
                **base,
                details={"plugin_id": item["pluginId"]},
            ),
            EXIT_BLOCKED,
        )
    if item.get("enabled") is not True:
        return (
            receipt(
                "BLOCKED",
                "PLUGIN_DISABLED",
                "The matching installed plugin is disabled.",
                **base,
                details={"plugin_id": item["pluginId"]},
            ),
            EXIT_BLOCKED,
        )

    source = item.get("source")
    source_path_value = source.get("path") if isinstance(source, dict) else None
    version = item.get("version")
    if not isinstance(source_path_value, str) or not source_path_value or not isinstance(version, str):
        return (
            receipt(
                "BLOCKED",
                "MALFORMED_PLUGIN_ENTRY",
                "The enabled plugin entry must advertise a source path and version.",
                **base,
                details={"plugin_id": item["pluginId"]},
            ),
            EXIT_BLOCKED,
        )

    source_path = Path(source_path_value).expanduser().resolve()
    if not source_path.is_dir() or not os.access(source_path, os.R_OK | os.X_OK):
        return (
            receipt(
                "BLOCKED",
                "SOURCE_UNAVAILABLE",
                "The advertised plugin source path is not a readable directory.",
                **base,
                details={"plugin_id": item["pluginId"], "source_path": str(source_path)},
            ),
            EXIT_BLOCKED,
        )

    manifest_path = (source_path / ".codex-plugin" / "plugin.json").resolve()
    if not manifest_path.is_file() or not os.access(manifest_path, os.R_OK):
        return (
            receipt(
                "BLOCKED",
                "MANIFEST_NOT_AVAILABLE",
                "The advertised plugin source has no readable plugin manifest.",
                **base,
                details={"plugin_id": item["pluginId"], "source_path": str(source_path)},
            ),
            EXIT_BLOCKED,
        )
    try:
        with manifest_path.open("r", encoding="utf-8") as stream:
            manifest = json.load(stream)
    except (OSError, json.JSONDecodeError) as error:
        return (
            receipt(
                "INVALID",
                "INVALID_PLUGIN_MANIFEST",
                f"The resolved plugin manifest is not valid JSON: {error}",
                **base,
                details={"plugin_id": item["pluginId"], "manifest_path": str(manifest_path)},
            ),
            EXIT_INVALID,
        )

    manifest_name = manifest.get("name") if isinstance(manifest, dict) else None
    manifest_version = manifest.get("version") if isinstance(manifest, dict) else None
    if manifest_name != plugin_name or manifest_version != version:
        return (
            receipt(
                "INVALID",
                "PLUGIN_IDENTITY_MISMATCH",
                "The resolved manifest name or version does not match installed inventory.",
                **base,
                details={
                    "plugin_id": item["pluginId"],
                    "inventory_version": version,
                    "manifest_name": manifest_name,
                    "manifest_version": manifest_version,
                    "manifest_path": str(manifest_path),
                },
            ),
            EXIT_INVALID,
        )

    declared_skills_root = manifest.get("skills")
    if not isinstance(declared_skills_root, str) or not declared_skills_root.strip():
        return (
            receipt(
                "INVALID",
                "MANIFEST_SKILLS_INVALID",
                "The resolved plugin manifest must declare a non-empty relative skills path.",
                **base,
                details={
                    "plugin_id": item["pluginId"],
                    "manifest_path": str(manifest_path),
                    "declared_skills_root": declared_skills_root,
                },
            ),
            EXIT_INVALID,
        )
    if (
        Path(declared_skills_root).is_absolute()
        or re.match(r"^[A-Za-z]:[\\/]", declared_skills_root)
        or declared_skills_root.startswith("\\\\")
    ):
        return (
            receipt(
                "INVALID",
                "MANIFEST_SKILLS_INVALID",
                "The manifest-declared skills path must be relative to the plugin source.",
                **base,
                details={
                    "plugin_id": item["pluginId"],
                    "manifest_path": str(manifest_path),
                    "declared_skills_root": declared_skills_root,
                },
            ),
            EXIT_INVALID,
        )

    skills_root = (source_path / declared_skills_root).resolve()
    try:
        skills_root.relative_to(source_path)
    except ValueError:
        return (
            receipt(
                "INVALID",
                "MANIFEST_SKILLS_PATH_ESCAPE",
                "The manifest-declared skills path resolves outside the plugin source.",
                **base,
                details={
                    "plugin_id": item["pluginId"],
                    "source_path": str(source_path),
                    "manifest_path": str(manifest_path),
                    "declared_skills_root": declared_skills_root,
                    "resolved_skills_root": str(skills_root),
                },
            ),
            EXIT_INVALID,
        )
    if not skills_root.is_dir() or not os.access(skills_root, os.R_OK | os.X_OK):
        return (
            receipt(
                "INVALID",
                "SKILLS_ROOT_UNAVAILABLE",
                "The manifest-declared skills path is not a readable directory.",
                **base,
                details={
                    "plugin_id": item["pluginId"],
                    "source_path": str(source_path),
                    "manifest_path": str(manifest_path),
                    "declared_skills_root": declared_skills_root,
                    "resolved_skills_root": str(skills_root),
                },
            ),
            EXIT_INVALID,
        )

    skill_path = (skills_root / skill_name / "SKILL.md").resolve()
    try:
        skill_path.relative_to(skills_root)
    except ValueError:
        return (
            receipt(
                "INVALID",
                "SKILL_PATH_ESCAPE",
                "The requested skill resolves outside the manifest-declared skills root.",
                **base,
                details={
                    "plugin_id": item["pluginId"],
                    "source_path": str(source_path),
                    "declared_skills_root": declared_skills_root,
                    "resolved_skills_root": str(skills_root),
                    "resolved_skill_path": str(skill_path),
                },
            ),
            EXIT_INVALID,
        )
    if not skill_path.is_file() or not os.access(skill_path, os.R_OK):
        return (
            receipt(
                "BLOCKED",
                "SKILL_NOT_AVAILABLE",
                "The requested skill is absent or unreadable under the manifest-declared skills root.",
                **base,
                details={
                    "plugin_id": item["pluginId"],
                    "source_path": str(source_path),
                    "declared_skills_root": declared_skills_root,
                    "resolved_skills_root": str(skills_root),
                    "expected_skill_path": str(skill_path),
                },
            ),
            EXIT_BLOCKED,
        )

    declared_skill_name = frontmatter_name(skill_path)
    if declared_skill_name != skill_name:
        return (
            receipt(
                "INVALID",
                "SKILL_IDENTITY_MISMATCH",
                "The resolved SKILL.md frontmatter name does not match the requested skill.",
                **base,
                details={
                    "plugin_id": item["pluginId"],
                    "skill_path": str(skill_path),
                    "declared_skill_name": declared_skill_name,
                },
            ),
            EXIT_INVALID,
        )

    manifest_sha256 = sha256_file(manifest_path)
    skill_sha256 = sha256_file(skill_path)
    dependency_identity = {
        "plugin_id": item["pluginId"],
        "plugin_name": plugin_name,
        "marketplace": item.get("marketplaceName"),
        "version": version,
        "manifest_sha256": manifest_sha256,
        "declared_skills_root": declared_skills_root,
        "resolved_skills_root": str(skills_root),
        "skill_name": skill_name,
        "skill_sha256": skill_sha256,
    }
    result = receipt(
        "AVAILABLE",
        "RESOLVED",
        "Exact installed and enabled plugin skill resolved from advertised source.",
        **base,
        details={
            "plugin": {
                "name": plugin_name,
                "plugin_id": item["pluginId"],
                "marketplace": item.get("marketplaceName"),
                "version": version,
                "source_path": str(source_path),
                "manifest_path": str(manifest_path),
                "manifest_sha256": manifest_sha256,
                "declared_skills_root": declared_skills_root,
                "resolved_skills_root": str(skills_root),
            },
            "skill": {
                "name": skill_name,
                "path": str(skill_path),
                "sha256": skill_sha256,
            },
            "dependency_sha256": canonical_digest(dependency_identity),
        },
    )
    return result, EXIT_AVAILABLE


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Resolve one skill from an installed and enabled Codex plugin."
    )
    parser.add_argument("--plugin", required=True, help="Exact plugin name.")
    parser.add_argument("--skill", required=True, help="Exact skill folder/name.")
    parser.add_argument("--marketplace", help="Optional exact marketplace name.")
    parser.add_argument(
        "--inventory",
        help="Read fixture inventory JSON from this path, or '-' for stdin. Defaults to Codex CLI.",
    )
    parser.add_argument(
        "--timeout-seconds", type=float, default=15.0, help="Codex CLI timeout."
    )
    parser.add_argument(
        "--resolved-at", help="Inject an ISO-8601 time for deterministic fixtures."
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    resolved_at = args.resolved_at or utc_now()
    try:
        inventory, inventory_source = read_inventory(args.inventory, args.timeout_seconds)
        result, exit_code = resolve(
            inventory,
            plugin_name=args.plugin,
            skill_name=args.skill,
            marketplace=args.marketplace,
            resolved_at=resolved_at,
            inventory_source=inventory_source,
        )
    except (OSError, json.JSONDecodeError, subprocess.TimeoutExpired, RuntimeError) as error:
        result = receipt(
            "BLOCKED",
            "INVENTORY_UNAVAILABLE",
            str(error),
            plugin=args.plugin,
            skill=args.skill,
            marketplace=args.marketplace,
            resolved_at=resolved_at,
            inventory_source=args.inventory or "codex plugin list --json",
        )
        exit_code = EXIT_BLOCKED

    print(json.dumps(result, indent=2 if args.pretty else None, sort_keys=True))
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
