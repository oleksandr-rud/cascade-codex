#!/usr/bin/env python3
"""Preview or write a bounded architecture-default source scaffold."""

from __future__ import annotations

import argparse
import json
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = (
    ROOT
    / "docs"
    / "patterns"
    / "architecture-defaults"
    / "architecture-scaffold-profiles.json"
)
PORTABLE_IDENTIFIER = re.compile(r"^[a-z][a-z0-9_]*$")
EXPECTED_PROFILES = {
    "backend-bun",
    "backend-fastapi",
    "backend-go",
    "frontend-nextjs",
    "frontend-react-vite",
}
BACKEND_MARKERS = (
    "startup/",
    "modules/",
    "application/events/emitters",
    "application/events/subscribers",
    "src/libs/database/",
    "src/libs/cache/",
    "src/libs/messaging/",
    "src/libs/thirdparty/",
)
FRONTEND_MARKERS = ("src/app/", "src/features/", "src/shared/")


class ScaffoldError(RuntimeError):
    """Raised when a scaffold request is invalid or unsafe."""


@dataclass(frozen=True)
class RenderedFile:
    relative_path: PurePosixPath
    content: str


@dataclass(frozen=True)
class RenderedProfile:
    profile_id: str
    description: str
    pair_ids: tuple[str, ...]
    technology_node: str
    files: tuple[RenderedFile, ...]


def load_manifest(path: Path = MANIFEST_PATH) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ScaffoldError(f"profile manifest not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ScaffoldError(f"profile manifest is invalid JSON: {exc}") from exc
    validate_manifest(data)
    return data


def require_string(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ScaffoldError(f"{field} must be a non-empty string")
    return value


def validate_manifest(data: Any) -> None:
    if not isinstance(data, dict):
        raise ScaffoldError("profile manifest must be a JSON object")
    if data.get("schema_id") != "architecture-scaffold-profiles-v1":
        raise ScaffoldError("profile manifest has an unsupported schema_id")

    rules = data.get("rules")
    if not isinstance(rules, dict):
        raise ScaffoldError("profile manifest rules must be an object")
    if rules.get("default_mode") != "preview":
        raise ScaffoldError("profile manifest must keep preview as the default mode")
    for field in ("overwrite", "install_dependencies", "run_commands"):
        if rules.get(field) is not False:
            raise ScaffoldError(f"profile manifest rule {field} must remain false")
    if set(rules.get("required_placeholders", [])) != {
        "__APP_NAME__",
        "__MODULE_NAME__",
    }:
        raise ScaffoldError(
            "profile manifest must require __APP_NAME__ and __MODULE_NAME__"
        )

    profiles = data.get("profiles")
    if not isinstance(profiles, list) or not profiles:
        raise ScaffoldError("profile manifest must define profiles")

    seen: set[str] = set()
    for index, profile in enumerate(profiles):
        prefix = f"profiles[{index}]"
        if not isinstance(profile, dict):
            raise ScaffoldError(f"{prefix} must be an object")
        profile_id = require_string(profile.get("profile_id"), f"{prefix}.profile_id")
        if not re.fullmatch(r"[a-z][a-z0-9-]*", profile_id):
            raise ScaffoldError(f"{prefix}.profile_id is not a stable kebab-case ID")
        if profile_id in seen:
            raise ScaffoldError(f"duplicate profile_id: {profile_id}")
        seen.add(profile_id)
        require_string(profile.get("description"), f"{prefix}.description")
        require_string(profile.get("technology_node"), f"{prefix}.technology_node")

        pair_ids = profile.get("pair_ids")
        if not isinstance(pair_ids, list) or not all(
            isinstance(pair_id, str) and pair_id for pair_id in pair_ids
        ):
            raise ScaffoldError(f"{prefix}.pair_ids must be non-empty strings")
        if "app-stack" not in pair_ids:
            raise ScaffoldError(f"{profile_id} must include app-stack")
        required_stack_pair = (
            "backend-stack"
            if profile_id.startswith("backend-")
            else "frontend-stack"
        )
        if required_stack_pair not in pair_ids:
            raise ScaffoldError(
                f"{profile_id} must include {required_stack_pair}"
            )

        files = profile.get("files")
        if not isinstance(files, dict) or not files:
            raise ScaffoldError(f"{prefix}.files must be a non-empty object")
        for template_path, content in files.items():
            require_string(template_path, f"{prefix}.files path")
            if not isinstance(content, str):
                raise ScaffoldError(
                    f"{prefix}.files[{template_path!r}] must be a string"
                )
            validate_relative_template_path(template_path, profile_id)

        structure_markers = profile.get("structure_markers")
        if not isinstance(structure_markers, list) or not all(
            isinstance(marker, str) and marker for marker in structure_markers
        ):
            raise ScaffoldError(f"{prefix}.structure_markers must be strings")
        joined_paths = "\n".join(files)
        for marker in structure_markers:
            if marker not in joined_paths:
                raise ScaffoldError(
                    f"{profile_id} does not implement declared structure marker: {marker}"
                )
        required_markers: tuple[str, ...] = ()
        if profile_id.startswith("backend-"):
            required_markers = BACKEND_MARKERS
        elif profile_id.startswith("frontend-"):
            required_markers = FRONTEND_MARKERS
        for marker in required_markers:
            if marker not in joined_paths.replace("__APP_NAME__/", "").replace(
                "__MODULE_NAME__/", ""
            ):
                raise ScaffoldError(
                    f"{profile_id} does not preserve structure marker: {marker}"
                )

    missing = EXPECTED_PROFILES - seen
    if missing:
        raise ScaffoldError(
            "profile manifest is missing required profiles: " + ", ".join(sorted(missing))
        )


def validate_relative_template_path(template_path: str, profile_id: str) -> None:
    path = PurePosixPath(template_path)
    if path.is_absolute() or not path.parts or ".." in path.parts:
        raise ScaffoldError(f"{profile_id} has unsafe template path: {template_path}")
    if any(part in {"", "."} for part in path.parts):
        raise ScaffoldError(f"{profile_id} has invalid template path: {template_path}")


def profile_map(manifest: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        profile["profile_id"]: profile
        for profile in manifest["profiles"]
        if isinstance(profile, dict)
    }


def identifier_replacements(app_name: str, module_name: str) -> dict[str, str]:
    for field, value in (("app-name", app_name), ("module-name", module_name)):
        if not PORTABLE_IDENTIFIER.fullmatch(value):
            raise ScaffoldError(
                f"{field} must match {PORTABLE_IDENTIFIER.pattern}; "
                "use a portable lowercase identifier"
            )
    words = module_name.split("_")
    pascal = "".join(word[:1].upper() + word[1:] for word in words)
    camel = pascal[:1].lower() + pascal[1:]
    title = " ".join(word[:1].upper() + word[1:] for word in words)
    return {
        "__MODULE_NAME_PASCAL__": pascal,
        "__MODULE_NAME_CAMEL__": camel,
        "__MODULE_NAME_SNAKE__": module_name,
        "__MODULE_NAME_GO__": module_name.replace("_", ""),
        "__MODULE_NAME_TITLE__": title,
        "__MODULE_NAME__": module_name,
        "__APP_NAME__": app_name,
    }


def render_text(template: str, replacements: dict[str, str]) -> str:
    rendered = template
    for token in sorted(replacements, key=len, reverse=True):
        rendered = rendered.replace(token, replacements[token])
    unresolved = sorted(set(re.findall(r"__[A-Z][A-Z0-9_]*__", rendered)))
    if unresolved:
        raise ScaffoldError(
            "unresolved scaffold placeholder(s): " + ", ".join(unresolved)
        )
    return rendered


def render_profile(
    manifest: dict[str, Any],
    profile_id: str,
    app_name: str,
    module_name: str,
) -> RenderedProfile:
    profiles = profile_map(manifest)
    profile = profiles.get(profile_id)
    if profile is None:
        raise ScaffoldError(
            f"unknown profile {profile_id!r}; choose one of: "
            + ", ".join(sorted(profiles))
        )
    replacements = identifier_replacements(app_name, module_name)
    files: list[RenderedFile] = []
    seen_paths: set[PurePosixPath] = set()
    for template_path, content in sorted(profile["files"].items()):
        rendered_path_text = render_text(template_path, replacements)
        relative_path = PurePosixPath(rendered_path_text)
        validate_relative_template_path(rendered_path_text, profile_id)
        if relative_path in seen_paths:
            raise ScaffoldError(f"profile renders duplicate path: {relative_path}")
        for existing_path in seen_paths:
            if (
                existing_path in relative_path.parents
                or relative_path in existing_path.parents
            ):
                raise ScaffoldError(
                    "profile renders a file/directory collision: "
                    f"{existing_path} and {relative_path}"
                )
        seen_paths.add(relative_path)
        files.append(
            RenderedFile(
                relative_path=relative_path,
                content=render_text(content, replacements),
            )
        )
    return RenderedProfile(
        profile_id=profile_id,
        description=profile["description"],
        pair_ids=tuple(profile["pair_ids"]),
        technology_node=profile["technology_node"],
        files=tuple(files),
    )


def resolve_target(target_text: str) -> Path:
    target = Path(target_text).expanduser().resolve()
    if target == Path(target.anchor) or target == Path.home().resolve():
        raise ScaffoldError(f"refusing broad scaffold target: {target}")
    if target.exists() and not target.is_dir():
        raise ScaffoldError(f"scaffold target is not a directory: {target}")
    ancestor = target
    while not ancestor.exists():
        ancestor = ancestor.parent
    if not ancestor.is_dir():
        raise ScaffoldError(
            f"scaffold target has a non-directory ancestor: {ancestor}"
        )
    return target


def target_path(target: Path, relative_path: PurePosixPath) -> Path:
    target = target.resolve()
    destination = target.joinpath(*relative_path.parts).resolve()
    if not destination.is_relative_to(target):
        raise ScaffoldError(f"rendered path escapes target: {relative_path}")
    return destination


def preflight_write(target: Path, rendered: RenderedProfile) -> list[Path]:
    destinations = [target_path(target, item.relative_path) for item in rendered.files]
    conflicts = [path for path in destinations if path.exists()]
    for destination in destinations:
        parent = destination.parent
        while parent != target and parent.is_relative_to(target):
            if parent.exists() and not parent.is_dir():
                conflicts.append(parent)
                break
            parent = parent.parent
    if conflicts:
        unique = sorted({str(path) for path in conflicts})
        raise ScaffoldError(
            "write preflight found existing or invalid paths; nothing was written:\n  "
            + "\n  ".join(unique)
        )
    return destinations


def write_profile(target: Path, rendered: RenderedProfile) -> None:
    destinations = preflight_write(target, rendered)
    for item, destination in zip(rendered.files, destinations, strict=True):
        try:
            destination.parent.mkdir(parents=True, exist_ok=True)
            with destination.open("x", encoding="utf-8", newline="\n") as handle:
                handle.write(item.content)
        except FileExistsError as exc:
            raise ScaffoldError(
                f"concurrent conflict at {destination}; partial new files may exist"
            ) from exc
        except OSError as exc:
            raise ScaffoldError(
                f"write failed at {destination}; partial new files may exist: {exc}"
            ) from exc


def print_profile(rendered: RenderedProfile, target: Path, status: str) -> None:
    print(f"scaffold_status={status}")
    print(f"profile={rendered.profile_id}")
    print(f"technology_node={rendered.technology_node}")
    print(f"pair_ids={','.join(rendered.pair_ids)}")
    print(f"target={target}")
    print(f"files={len(rendered.files)}")
    for item in rendered.files:
        print(f"- {item.relative_path}")


def list_profiles(manifest: dict[str, Any]) -> None:
    print("scaffold_status=LIST")
    for profile in sorted(manifest["profiles"], key=lambda item: item["profile_id"]):
        print(
            f"{profile['profile_id']}\t{profile['technology_node']}\t"
            f"{profile['description']}"
        )


def self_test(manifest: dict[str, Any]) -> None:
    rendered_count = 0
    try:
        resolve_target(str(Path.home()))
    except ScaffoldError:
        pass
    else:
        raise ScaffoldError("self-test broad-target guard did not fail")
    try:
        render_profile(manifest, "backend-bun", "Invalid App", "example")
    except ScaffoldError:
        pass
    else:
        raise ScaffoldError("self-test identifier guard did not fail")
    with tempfile.TemporaryDirectory(prefix="cascade-architecture-scaffold-") as temp:
        root = Path(temp)
        for profile_id in sorted(profile_map(manifest)):
            rendered = render_profile(manifest, profile_id, "sample", "example_items")
            for item in rendered.files:
                if item.relative_path.suffix == ".py":
                    try:
                        compile(
                            item.content,
                            str(item.relative_path),
                            "exec",
                        )
                    except SyntaxError as exc:
                        raise ScaffoldError(
                            f"self-test Python syntax failed: "
                            f"{profile_id}:{item.relative_path}: {exc}"
                        ) from exc
            target = root / profile_id
            write_profile(target, rendered)
            rendered_count += len(rendered.files)
            if not all(
                target_path(target, item.relative_path).is_file()
                for item in rendered.files
            ):
                raise ScaffoldError(f"self-test did not write every file: {profile_id}")
            try:
                preflight_write(target, rendered)
            except ScaffoldError:
                pass
            else:
                raise ScaffoldError(
                    f"self-test overwrite guard did not fail: {profile_id}"
                )
    print(
        "architecture_scaffold_self_test=PASS "
        f"profiles={len(profile_map(manifest))} files={rendered_count}"
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Preview or write a selected Cascade architecture source profile. "
            "No command installs dependencies or overwrites files."
        )
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=MANIFEST_PATH,
        help="profile manifest path (defaults to the canonical Cascade manifest)",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("list", help="list available profiles")
    subparsers.add_parser("validate", help="validate the profile manifest")
    subparsers.add_parser("self-test", help="render and safely write every profile in a temporary directory")

    for command in ("preview", "write"):
        subparser = subparsers.add_parser(
            command,
            help=(
                "show the exact paths without writing"
                if command == "preview"
                else "write only after a full no-conflict preflight"
            ),
        )
        subparser.add_argument("--profile", required=True)
        subparser.add_argument("--target", required=True)
        subparser.add_argument("--app-name", required=True)
        subparser.add_argument("--module-name", required=True)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        manifest = load_manifest(args.manifest.resolve())
        if args.command == "list":
            list_profiles(manifest)
            return 0
        if args.command == "validate":
            print(
                "architecture_scaffold_manifest=PASS "
                f"profiles={len(profile_map(manifest))}"
            )
            return 0
        if args.command == "self-test":
            self_test(manifest)
            return 0

        rendered = render_profile(
            manifest,
            args.profile,
            args.app_name,
            args.module_name,
        )
        target = resolve_target(args.target)
        if args.command == "preview":
            print_profile(rendered, target, "PREVIEW")
            return 0
        write_profile(target, rendered)
        print_profile(rendered, target, "WRITTEN")
        return 0
    except ScaffoldError as exc:
        print(f"architecture_scaffold_status=FAIL\n{exc}")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
