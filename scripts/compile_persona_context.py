#!/usr/bin/env python3
"""Compile the persona semantic-core package into a Markdown context bundle."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PACKAGE = (
    ROOT
    / "docs"
    / "specs"
    / "persona-context-compiler"
    / "persona-semantic-core.package.yaml"
)
ITEM_ID_LINE = re.compile(r"^\s*-\s+id:\s*(?P<value>.+?)\s*(?:#.*)?$")
ITEM_FIELD_LINE = re.compile(
    r"^\s*(?P<key>path|summary):\s*(?P<value>.+?)\s*(?:#.*)?$"
)


@dataclass(frozen=True)
class PackageReference:
    id: str
    path: str
    summary: str


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def clean_yaml_scalar(value: str) -> str:
    value = value.strip()
    if (value.startswith('"') and value.endswith('"')) or (
        value.startswith("'") and value.endswith("'")
    ):
        return value[1:-1]
    return value


def extract_references(package_text: str) -> list[PackageReference]:
    refs: list[PackageReference] = []
    seen: set[str] = set()

    current: dict[str, str] | None = None

    def flush_current() -> None:
        if current is None:
            return
        path = current.get("path")
        if not path or path.startswith(("http://", "https://")) or path in seen:
            return
        refs.append(
            PackageReference(
                id=current.get("id", ""),
                path=path,
                summary=current.get("summary", ""),
            )
        )
        seen.add(path)

    for line in package_text.splitlines():
        item_match = ITEM_ID_LINE.match(line)
        if item_match:
            flush_current()
            current = {"id": clean_yaml_scalar(item_match.group("value"))}
            continue
        if current is None:
            continue
        match = ITEM_FIELD_LINE.match(line)
        if not match:
            continue
        current[match.group("key")] = clean_yaml_scalar(match.group("value"))

    flush_current()
    return refs


def extract_referenced_paths(package_text: str) -> list[str]:
    return [ref.path for ref in extract_references(package_text)]


def render_source(path: Path) -> str:
    if not path.is_file():
        return (
            f"--- BEGIN WARNING: {rel(path) if path.is_absolute() and ROOT in path.parents else path}\n"
            "missing referenced file\n"
            f"--- END WARNING\n"
        )
    relative = rel(path)
    return (
        f"--- BEGIN SOURCE: {relative}\n"
        f"{read_text(path).rstrip()}\n"
        f"--- END SOURCE: {relative}\n"
    )


def compile_context(package_path: Path) -> str:
    package_path = package_path.resolve()
    package_text = read_text(package_path)
    references = extract_references(package_text)

    sections = [
        "# Compiled Persona Context",
        "",
        "## Package Manifest",
        "",
        render_source(package_path).rstrip(),
        "",
        "## Referenced Sources",
        "",
    ]

    for ref in references:
        source_path = (ROOT / ref.path).resolve()
        sections.append(render_source(source_path).rstrip())
        sections.append("")

    sections.extend(
        [
            "## Context Map",
            "",
            "| ID | Path | Status | Summary |",
            "|---|---|---|---|",
        ]
    )
    for ref in references:
        source_path = (ROOT / ref.path).resolve()
        status = "included" if source_path.is_file() else "missing"
        sections.append(f"| `{ref.id}` | `{ref.path}` | {status} | {ref.summary} |")

    return "\n".join(sections).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compile persona semantic-core package files into Markdown context."
    )
    parser.add_argument(
        "package",
        nargs="?",
        default=str(DEFAULT_PACKAGE),
        help="Path to persona semantic-core package YAML.",
    )
    args = parser.parse_args()

    package_path = Path(args.package)
    if not package_path.is_absolute():
        package_path = ROOT / package_path
    if not package_path.is_file():
        print(f"missing package file: {package_path}", file=sys.stderr)
        return 1

    sys.stdout.write(compile_context(package_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
