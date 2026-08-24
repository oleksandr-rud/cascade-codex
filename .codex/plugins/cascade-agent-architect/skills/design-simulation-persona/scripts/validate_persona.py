#!/usr/bin/env python3
"""Validate a grounded or explicitly synthetic Cascade Agent Architect persona."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
    from jsonschema import Draft202012Validator
except ImportError as error:  # pragma: no cover
    raise SystemExit(
        "Missing dependencies. Run with: uv run --with pyyaml --with jsonschema "
        "python validate_persona.py <persona-file>"
    ) from error


class ValidationFailure(ValueError):
    pass


def load_document(path: Path) -> dict[str, Any]:
    try:
        text = path.read_text(encoding="utf-8")
        value = json.loads(text) if path.suffix.lower() == ".json" else yaml.safe_load(text)
    except (OSError, json.JSONDecodeError, yaml.YAMLError) as error:
        raise ValidationFailure(f"cannot load {path}: {error}") from error
    if not isinstance(value, dict):
        raise ValidationFailure(f"{path} must contain an object")
    return value


def validate_cross_fields(persona: dict[str, Any]) -> None:
    source_ids = [source["id"] for source in persona["sources"]]
    if len(source_ids) != len(set(source_ids)):
        raise ValidationFailure("sources have duplicate ids")
    known_sources = set(source_ids)
    for claim in persona["claims"]:
        unknown = sorted(set(claim["source_refs"]) - known_sources)
        if unknown:
            raise ValidationFailure("claim names unknown sources: " + ", ".join(unknown))
    for trait in persona["stable"]["traits"]:
        unknown = sorted(set(trait["source_refs"]) - known_sources)
        if unknown:
            raise ValidationFailure("trait names unknown sources: " + ", ".join(unknown))

    authorities = {source["authority"] for source in persona["sources"]}
    if persona["kind"] == "evidence-backed" and authorities <= {"hypothesis", "user-provided"}:
        raise ValidationFailure("evidence-backed persona requires a direct evidence source")
    if persona["kind"] == "synthetic-hypothesis" and "hypothesis" not in authorities:
        raise ValidationFailure("synthetic-hypothesis persona requires a hypothesis source")

    variables = persona["dynamic"]["variables"]
    names = [variable["name"] for variable in variables]
    if len(names) != len(set(names)):
        raise ValidationFailure("dynamic variables have duplicate names")
    allowed = {variable["name"]: set(variable["allowed_values"]) for variable in variables}
    for variable in variables:
        if variable["initial"] not in allowed[variable["name"]]:
            raise ValidationFailure(
                f"dynamic variable {variable['name']} initial value is not allowed"
            )
    for transition in persona["dynamic"]["transitions"]:
        for name, value in transition["set"].items():
            if name not in allowed:
                raise ValidationFailure(f"dynamic transition updates unknown variable {name}")
            if value not in allowed[name]:
                raise ValidationFailure(
                    f"dynamic transition gives {name} an unsupported value: {value}"
                )
    if not variables and persona["dynamic"]["transitions"]:
        raise ValidationFailure("dynamic transitions require declared variables")


def validate(path: Path) -> dict[str, Any]:
    persona = load_document(path)
    root = Path(__file__).resolve().parent.parent
    schema = json.loads((root / "references" / "persona.schema.json").read_text(encoding="utf-8"))
    errors = sorted(Draft202012Validator(schema).iter_errors(persona), key=lambda item: list(item.path))
    if errors:
        error = errors[0]
        location = ".".join(str(part) for part in error.path) or "root"
        raise ValidationFailure(f"persona.{location}: {error.message}")
    validate_cross_fields(persona)
    return persona


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("persona", type=Path)
    args = parser.parse_args(argv)
    try:
        persona = validate(args.persona)
    except ValidationFailure as error:
        print(f"persona_status=FAIL reason={error}", file=sys.stderr)
        return 1
    print(
        f"persona_status=PASS id={persona['id']} kind={persona['kind']} "
        f"sources={len(persona['sources'])} claims={len(persona['claims'])} "
        f"traits={len(persona['stable']['traits'])} "
        f"state_variables={len(persona['dynamic']['variables'])}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
