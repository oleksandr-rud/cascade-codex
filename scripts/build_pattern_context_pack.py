#!/usr/bin/env python3
"""Build text previews from docs/patterns context-pack metadata."""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
PATTERNS_ROOT = ROOT / "docs" / "patterns"


class PackError(RuntimeError):
    """Raised when a pattern pack cannot be parsed or compiled."""


@dataclass(frozen=True)
class SourceLine:
    number: int
    indent: int
    text: str


def parse_scalar(value: str) -> Any:
    raw = value.strip()
    if raw in {"", "null", "None"}:
        return ""
    if raw in {"true", "True"}:
        return True
    if raw in {"false", "False"}:
        return False
    if (raw.startswith('"') and raw.endswith('"')) or (
        raw.startswith("'") and raw.endswith("'")
    ):
        return raw[1:-1]
    return raw


def looks_like_mapping_item(value: str) -> bool:
    if value.startswith(('"', "'")):
        return False
    if ":" not in value:
        return False
    key = value.split(":", 1)[0].strip()
    return bool(key) and " " not in key


def load_simple_yaml(path: Path) -> Any:
    """Parse the small YAML subset used by pattern pack metadata.

    Supported forms: mappings, lists, scalar strings, quoted strings, booleans,
    and nested list-of-mapping blocks. This avoids adding a runtime dependency
    just to compile controlled repository metadata.
    """

    lines: list[SourceLine] = []
    for number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        lines.append(SourceLine(number, indent, raw.strip()))
    if not lines:
        return {}

    def parse_block(index: int, indent: int) -> tuple[int, Any]:
        if index >= len(lines):
            return index, {}
        current = lines[index]
        if current.indent < indent:
            return index, {}
        if current.text.startswith("- "):
            return parse_list(index, indent)
        return parse_map(index, indent)

    def parse_map(index: int, indent: int) -> tuple[int, dict[str, Any]]:
        result: dict[str, Any] = {}
        while index < len(lines):
            line = lines[index]
            if line.indent < indent:
                break
            if line.indent > indent:
                raise PackError(
                    f"{path}:{line.number}: unexpected indentation under mapping"
                )
            if line.text.startswith("- "):
                break
            if ":" not in line.text:
                raise PackError(f"{path}:{line.number}: expected key: value")
            key, value = line.text.split(":", 1)
            key = key.strip()
            value = value.strip()
            index += 1
            if value:
                result[key] = parse_scalar(value)
                continue
            if index >= len(lines) or lines[index].indent <= indent:
                result[key] = {}
                continue
            index, nested = parse_block(index, lines[index].indent)
            result[key] = nested
        return index, result

    def parse_list(index: int, indent: int) -> tuple[int, list[Any]]:
        result: list[Any] = []
        while index < len(lines):
            line = lines[index]
            if line.indent < indent:
                break
            if line.indent > indent:
                raise PackError(f"{path}:{line.number}: unexpected list indentation")
            if not line.text.startswith("- "):
                break
            item_text = line.text[2:].strip()
            index += 1
            if not item_text:
                if index >= len(lines) or lines[index].indent <= indent:
                    result.append("")
                    continue
                index, nested = parse_block(index, lines[index].indent)
                result.append(nested)
                continue
            if looks_like_mapping_item(item_text):
                key, value = item_text.split(":", 1)
                item: dict[str, Any] = {key.strip(): parse_scalar(value.strip())}
                if index < len(lines) and lines[index].indent > indent:
                    index, nested = parse_block(index, lines[index].indent)
                    if not isinstance(nested, dict):
                        raise PackError(
                            f"{path}:{line.number}: list mapping continuation must be a mapping"
                        )
                    item.update(nested)
                result.append(item)
                continue
            result.append(parse_scalar(item_text))
        return index, result

    _, parsed = parse_block(0, lines[0].indent)
    return parsed


def discover_pack_paths(patterns_root: Path) -> list[Path]:
    return sorted(patterns_root.glob("*/*.pack.yaml"))


def load_pack(path: Path) -> dict[str, Any]:
    data = load_simple_yaml(path)
    if not isinstance(data, dict):
        raise PackError(f"{path}: pack must be a mapping")
    for key in [
        "pack_id",
        "entry_id",
        "title",
        "kind",
        "owner",
        "summary",
        "routing",
        "documents",
    ]:
        if key not in data:
            raise PackError(f"{path}: missing required key {key}")
    if not isinstance(data["documents"], list):
        raise PackError(f"{path}: documents must be a list")
    return data


def pack_key(path: Path) -> str:
    name = path.name
    if name.endswith(".pack.yaml"):
        return name[: -len(".pack.yaml")]
    return path.stem


def select_pack_paths(args: argparse.Namespace) -> list[Path]:
    all_paths = discover_pack_paths(args.patterns_root)
    selected: list[Path] = []
    wanted = set(args.pack or [])
    entries = set(args.entry or [])

    if not wanted and not entries:
        return all_paths

    loaded_cache: dict[Path, dict[str, Any]] = {}
    for path in all_paths:
        data = loaded_cache.setdefault(path, load_pack(path))
        candidates = {
            str(path),
            path.as_posix(),
            path.relative_to(ROOT).as_posix() if path.is_relative_to(ROOT) else path.as_posix(),
            pack_key(path),
            str(data.get("pack_id", "")),
        }
        if wanted.intersection(candidates):
            selected.append(path)
            continue
        if entries and path.parent.name in entries:
            selected.append(path)

    missing = wanted - {
        candidate
        for path in selected
        for candidate in {
            str(path),
            path.as_posix(),
            path.relative_to(ROOT).as_posix() if path.is_relative_to(ROOT) else path.as_posix(),
            pack_key(path),
            str(load_pack(path).get("pack_id", "")),
        }
    }
    if missing:
        raise PackError(f"unknown pack selector(s): {', '.join(sorted(missing))}")
    return selected


def text_blob(value: Any) -> str:
    if isinstance(value, dict):
        return " ".join(text_blob(item) for item in value.values())
    if isinstance(value, list):
        return " ".join(text_blob(item) for item in value)
    return str(value)


def iter_documents(data: dict[str, Any]) -> list[dict[str, Any]]:
    documents = data.get("documents", [])
    return [document for document in documents if isinstance(document, dict)]


def iter_sections(data: dict[str, Any]) -> list[tuple[dict[str, Any], dict[str, Any]]]:
    sections: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for document in iter_documents(data):
        for section in document.get("sections", []) or []:
            if isinstance(section, dict):
                sections.append((document, section))
    return sections


def section_matches(
    document: dict[str, Any], section: dict[str, Any], args: argparse.Namespace
) -> bool:
    wanted_sections = set(args.section or [])
    wanted_tags = set(args.tag or [])
    query = " ".join(args.query or []).strip().lower()

    if wanted_sections and str(section.get("id", "")) not in wanted_sections:
        return False

    tags = {str(tag) for tag in section.get("tags", [])}
    if wanted_tags and not wanted_tags.intersection(tags):
        return False

    if query:
        haystack = text_blob(
            {
                "document_path": document.get("path", ""),
                "document_kind": document.get("kind", ""),
                "document_description": document.get("description", ""),
                "document_trigger_when": document.get("trigger_when", []),
                "id": section.get("id", ""),
                "title": section.get("title", ""),
                "summary": section.get("summary", ""),
                "routing_description": section.get("routing_description", ""),
                "tags": section.get("tags", []),
            }
        ).lower()
        tokens = [token for token in query.split() if token]
        if not all(token in haystack for token in tokens):
            return False

    return True


def extract_section(source: Path, anchor: str) -> str:
    if not source.is_file():
        raise PackError(f"missing source file: {source}")
    lines = source.read_text(encoding="utf-8").splitlines()
    start: int | None = None
    heading_level = 0
    for index, line in enumerate(lines):
        if line.strip() == anchor:
            start = index
            heading_level = len(line) - len(line.lstrip("#"))
            break
    if start is None:
        raise PackError(f"{source}: anchor not found: {anchor}")
    end = len(lines)
    for index in range(start + 1, len(lines)):
        line = lines[index]
        stripped = line.lstrip("#")
        level = len(line) - len(stripped)
        if level and line.startswith("#") and level <= heading_level:
            end = index
            break
    return "\n".join(lines[start:end]).strip()


def relative(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def render_scalar_list(title: str, values: Any) -> list[str]:
    if not values:
        return []
    lines = [f"### {title}", ""]
    if isinstance(values, list):
        for value in values:
            if isinstance(value, dict):
                route = value.get("route", "item")
                use_when = value.get("use_when", text_blob(value))
                lines.append(f"- {route}: {use_when}")
            else:
                lines.append(f"- {value}")
    else:
        lines.append(f"- {values}")
    lines.append("")
    return lines


def render_pack_metadata(data: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    routing = data.get("routing", {})
    if isinstance(routing, dict):
        lines.extend(["", "## Routing", ""])
        for key, title in [
            ("use_when", "Use When"),
            ("do_not_use_when", "Do Not Use When"),
            ("load_when", "Load When"),
            ("write_when", "Write When"),
            ("defer_when", "Defer When"),
            ("primary_skills", "Primary Skills"),
            ("related_roles", "Related Roles"),
        ]:
            lines.extend(render_scalar_list(title, routing.get(key)))
    documents = iter_documents(data)
    if documents:
        lines.extend(["## Documents", ""])
        for document in documents:
            path = document.get("path", "")
            kind = document.get("kind", "")
            description = document.get("description", "")
            lines.append(f"- {path} ({kind}): {description}")
            triggers = document.get("trigger_when", [])
            if isinstance(triggers, list) and triggers:
                lines.append(
                    "  triggers: "
                    + "; ".join(str(trigger) for trigger in triggers)
                )
            sections = [
                str(section.get("id", ""))
                for section in document.get("sections", []) or []
                if isinstance(section, dict)
            ]
            if sections:
                lines.append(f"  sections: {', '.join(sections)}")
        lines.append("")
    return lines


def filters_supplied(args: argparse.Namespace) -> bool:
    return bool(args.section or args.tag or args.query)


def section_source(document: dict[str, Any]) -> Path:
    return ROOT / str(document.get("path", ""))


def render_pack(path: Path, args: argparse.Namespace) -> str:
    data = load_pack(path)
    sections = iter_sections(data)
    selected_sections = [
        (document, section)
        for document, section in sections
        if section_matches(document, section, args)
    ]
    if filters_supplied(args) and not selected_sections:
        raise PackError(f"{relative(path)}: no sections matched the supplied filters")

    lines = [
        f"# Pattern Context Pack: {data['title']}",
        "",
        f"- pack_id: {data['pack_id']}",
        f"- entry_id: {data['entry_id']}",
        f"- kind: {data['kind']}",
        f"- owner: {data['owner']}",
        f"- source: {relative(path)}",
        f"- summary: {data['summary']}",
    ]
    if data.get("description"):
        lines.append(f"- description: {data['description']}")
    lines.extend(render_pack_metadata(data))
    lines.extend(["", "## Sections"])

    for document, section_meta in selected_sections:
        section_id = section_meta.get("id", "")
        lines.extend(
            [
                "",
                f"### {section_id}: {section_meta.get('title', section_id)}",
                "",
                f"- document: {document.get('path', '')}",
                f"- document_kind: {document.get('kind', '')}",
                f"- anchor: {section_meta.get('anchor', '')}",
                f"- summary: {section_meta.get('summary', '')}",
                f"- routing: {section_meta.get('routing_description', '')}",
                f"- tags: {', '.join(str(tag) for tag in section_meta.get('tags', []))}",
            ]
        )
        if args.summary_only:
            continue
        source = section_source(document)
        section_body = extract_section(source, str(section_meta.get("anchor", "")))
        fence = "````" if "```" in section_body else "```"
        lines.extend(["", f"{fence}markdown", section_body, fence])
    return "\n".join(lines).rstrip() + "\n"


def list_packs(paths: list[Path]) -> str:
    lines = ["pack_id\tentry_id\tkind\tpath\tsummary"]
    for path in paths:
        data = load_pack(path)
        lines.append(
            f"{data['pack_id']}\t{data['entry_id']}\t{data['kind']}\t"
            f"{relative(path)}\t{data['summary']}"
        )
    return "\n".join(lines) + "\n"


def list_sections(paths: list[Path]) -> str:
    lines = ["pack_id\tdocument\tsection_id\ttags\tsummary"]
    for path in paths:
        data = load_pack(path)
        for document, section_meta in iter_sections(data):
            lines.append(
                f"{data['pack_id']}\t{document.get('path', '')}\t"
                f"{section_meta.get('id', '')}\t"
                f"{','.join(str(tag) for tag in section_meta.get('tags', []))}\t"
                f"{section_meta.get('summary', '')}"
            )
    return "\n".join(lines) + "\n"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Build text previews from docs/patterns/*.pack.yaml metadata."
    )
    parser.add_argument("--patterns-root", type=Path, default=PATTERNS_ROOT)
    parser.add_argument("--pack", action="append", help="Pack ID, file stem, or path.")
    parser.add_argument("--entry", action="append", help="Pattern entry folder name.")
    parser.add_argument(
        "--section",
        dest="section",
        action="append",
        help="Section ID to include.",
    )
    parser.add_argument(
        "--part",
        dest="section",
        action="append",
        help="Compatibility alias for --section.",
    )
    parser.add_argument("--tag", action="append", help="Section tag to include.")
    parser.add_argument(
        "--query",
        action="append",
        help="Require query tokens to appear in document or section metadata.",
    )
    parser.add_argument(
        "--summary-only",
        action="store_true",
        help="Render pack, document, and section metadata without Markdown section bodies.",
    )
    parser.add_argument("--list-packs", action="store_true")
    parser.add_argument(
        "--list-sections",
        dest="list_sections",
        action="store_true",
    )
    parser.add_argument(
        "--list-parts",
        dest="list_sections",
        action="store_true",
        help="Compatibility alias for --list-sections.",
    )
    return parser


def main(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    args.patterns_root = args.patterns_root.resolve()

    try:
        paths = select_pack_paths(args)
        if args.list_packs:
            sys.stdout.write(list_packs(paths))
            return 0
        if args.list_sections:
            sys.stdout.write(list_sections(paths))
            return 0
        sys.stdout.write("\n".join(render_pack(path, args) for path in paths))
        return 0
    except PackError as exc:
        print(f"pattern_context_pack_error={exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
