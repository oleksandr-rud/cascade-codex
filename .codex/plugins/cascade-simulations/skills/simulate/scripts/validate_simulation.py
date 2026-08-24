#!/usr/bin/env python3
"""Validate a compact Cascade simulation and its action-level adapter."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
    from jsonschema import Draft202012Validator
except ImportError as error:  # pragma: no cover - exercised by installation environment
    raise SystemExit(
        "Missing dependencies. Run with: uv run --with pyyaml --with jsonschema "
        "python validate_simulation.py --simulation <file> --adapter <file>"
    ) from error


class ValidationFailure(ValueError):
    pass


def stable_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def value_digest(value: object) -> str:
    return hashlib.sha256(stable_json(value).encode("utf-8")).hexdigest()


def load_document(path: Path) -> dict[str, Any]:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as error:
        raise ValidationFailure(f"cannot read {path}: {error}") from error
    try:
        value = json.loads(text) if path.suffix.lower() == ".json" else yaml.safe_load(text)
    except (json.JSONDecodeError, yaml.YAMLError) as error:
        raise ValidationFailure(f"cannot parse {path}: {error}") from error
    if not isinstance(value, dict):
        raise ValidationFailure(f"{path} must contain an object")
    return value


def validate_schema(value: dict[str, Any], schema_path: Path, label: str) -> None:
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    errors = sorted(Draft202012Validator(schema).iter_errors(value), key=lambda item: list(item.path))
    if errors:
        error = errors[0]
        location = ".".join(str(part) for part in error.path) or "root"
        raise ValidationFailure(f"{label}.{location}: {error.message}")


def unique_names(items: list[dict[str, Any]], label: str) -> None:
    names = [item["name"] for item in items]
    duplicates = sorted({name for name in names if names.count(name) > 1})
    if duplicates:
        raise ValidationFailure(f"{label} has duplicate names: {', '.join(duplicates)}")


def validate_cross_contract(simulation: dict[str, Any], adapter: dict[str, Any]) -> None:
    interface = simulation["interface"]
    if interface["adapter_id"] != adapter["id"]:
        raise ValidationFailure("simulation interface adapter_id does not match adapter id")
    if interface["surface"] != adapter["surface"]:
        raise ValidationFailure("simulation interface surface does not match adapter surface")
    if interface["target"] != adapter["target"]:
        raise ValidationFailure("simulation interface target does not match adapter target")

    persona = simulation["persona"]
    kind = persona["source_kind"]
    if kind == "evidence-backed" and (not persona.get("persona_id") or not persona["source_refs"]):
        raise ValidationFailure("evidence-backed persona requires persona_id and source_refs")
    if kind == "synthetic-hypothesis" and persona.get("persona_id"):
        raise ValidationFailure("synthetic-hypothesis persona must not claim a durable persona_id")
    if kind == "none" and (persona.get("persona_id") or persona["source_refs"]):
        raise ValidationFailure("persona source_kind none must not claim persona identity or sources")
    if bool(persona.get("profile_ref")) != bool(persona.get("profile_digest")):
        raise ValidationFailure("persona profile_ref and profile_digest must be supplied together")

    actor = simulation["actor"]
    state_variables = actor.get("state_variables", [])
    state_names = [item["name"] for item in state_variables]
    if len(state_names) != len(set(state_names)):
        raise ValidationFailure("actor state_variables have duplicate names")
    allowed_state = {
        item["name"]: set(item["allowed_values"])
        for item in state_variables
    }
    for item in state_variables:
        if item["initial"] not in allowed_state[item["name"]]:
            raise ValidationFailure(
                f"actor state variable {item['name']} initial value is not allowed"
            )
    for transition in actor.get("state_transitions", []):
        for name, value in transition["set"].items():
            if name not in allowed_state:
                raise ValidationFailure(f"actor state transition updates unknown variable {name}")
            if value not in allowed_state[name]:
                raise ValidationFailure(
                    f"actor state transition gives {name} an unsupported value: {value}"
                )
    if not state_variables and actor.get("state_transitions"):
        raise ValidationFailure("actor state transitions require declared state variables")

    if simulation["limits"]["max_tool_calls"] < simulation["limits"]["max_steps"]:
        raise ValidationFailure("max_tool_calls must be at least max_steps")
    if simulation["limits"]["max_action_duration_seconds"] > simulation["limits"]["max_duration_seconds"]:
        raise ValidationFailure("max_action_duration_seconds cannot exceed max_duration_seconds")

    unique_names(adapter["observations"], "adapter observations")
    unique_names(adapter["actions"], "adapter actions")
    capabilities = set(adapter["driver"]["required_capabilities"])
    bindings = set(adapter["driver"]["bindings"])
    if bindings != capabilities:
        missing_bindings = sorted(capabilities - bindings)
        extra_bindings = sorted(bindings - capabilities)
        details = []
        if missing_bindings:
            details.append("missing " + ", ".join(missing_bindings))
        if extra_bindings:
            details.append("extra " + ", ".join(extra_bindings))
        raise ValidationFailure("driver bindings must exactly cover required capabilities: " + "; ".join(details))
    actions = {action["name"]: action for action in adapter["actions"]}
    for observation in adapter["observations"]:
        for action_name in observation["produced_by"]:
            if action_name not in actions:
                raise ValidationFailure(
                    f"observation {observation['name']} names undeclared producer action {action_name}"
                )
    observation_producers = {
        action_name
        for observation in adapter["observations"]
        for action_name in observation["produced_by"]
    }
    missing_observation_output = sorted(set(actions) - observation_producers)
    if missing_observation_output:
        raise ValidationFailure(
            "adapter actions lack a declared observation output: "
            + ", ".join(missing_observation_output)
        )
    for action in adapter["actions"]:
        if action["capability"] not in capabilities:
            raise ValidationFailure(
                f"action {action['name']} uses undeclared capability {action['capability']}"
            )
        risk = action["risk"]
        confirmation = action["confirmation"]
        if risk in {"external", "privileged", "destructive"} and confirmation == "never":
            raise ValidationFailure(f"{risk} action {action['name']} cannot disable confirmation")
        if risk == "destructive" and confirmation != "always":
            raise ValidationFailure(f"destructive action {action['name']} requires confirmation always")
        if risk == "destructive" and action["idempotency"] == "safe-retry":
            raise ValidationFailure(f"destructive action {action['name']} cannot be safe-retry")

    recovery_action = adapter["recovery"]["action"]
    if recovery_action is not None and recovery_action not in actions:
        raise ValidationFailure(f"recovery names undeclared action {recovery_action}")
    recovery_actions = {name for name, action in actions.items() if action["purpose"] == "recovery"}
    expected_recovery_actions = {recovery_action} if recovery_action is not None else set()
    if recovery_actions != expected_recovery_actions:
        raise ValidationFailure("exactly the declared recovery action must use purpose recovery")
    cleanup = adapter["cleanup"]
    cleanup_action = cleanup["action"]
    cleanup_observation = cleanup["verification_observation"]
    if cleanup["required"] and cleanup_action is None:
        raise ValidationFailure("required cleanup must name a declared action")
    if cleanup_action is not None and cleanup_action not in actions:
        raise ValidationFailure(f"cleanup names undeclared action {cleanup_action}")
    cleanup_actions = {name for name, action in actions.items() if action["purpose"] == "cleanup"}
    expected_cleanup_actions = {cleanup_action} if cleanup_action is not None else set()
    if cleanup_actions != expected_cleanup_actions:
        raise ValidationFailure("exactly the declared cleanup action must use purpose cleanup")
    observation_producers_by_name = {
        observation["name"]: set(observation["produced_by"])
        for observation in adapter["observations"]
    }
    if cleanup_action is None and cleanup_observation is not None:
        raise ValidationFailure("cleanup without an action cannot name a verification observation")
    if cleanup_action is not None and cleanup_observation is None:
        raise ValidationFailure("cleanup action requires a verification observation")
    if cleanup_observation is not None:
        if cleanup_observation not in observation_producers_by_name:
            raise ValidationFailure(
                f"cleanup names undeclared verification observation {cleanup_observation}"
            )
        if cleanup_action not in observation_producers_by_name[cleanup_observation]:
            raise ValidationFailure(
                "cleanup verification observation is not produced by the cleanup action"
            )

    allowed_actions = simulation["authority"]["allowed_actions"]
    unknown_authority_actions = sorted(set(allowed_actions) - set(actions))
    if unknown_authority_actions:
        raise ValidationFailure(
            "simulation authority names undeclared actions: " + ", ".join(unknown_authority_actions)
        )

    source_ids = [source["id"] for source in simulation["brief"]["sources"]]
    if len(source_ids) != len(set(source_ids)):
        raise ValidationFailure("brief sources have duplicate ids")
    known_sources = set(source_ids)
    for field in ("context", "rules"):
        for item in simulation["brief"][field]:
            unknown_sources = sorted(set(item["source_refs"]) - known_sources)
            if unknown_sources:
                raise ValidationFailure(
                    f"brief {field} claim names unknown sources: {', '.join(unknown_sources)}"
                )

    conditions = simulation["outcome"]["achieved_when"]
    evidence_conditions = [item["condition"] for item in simulation["outcome"]["evidence"]]
    if len(evidence_conditions) != len(set(evidence_conditions)) or set(evidence_conditions) != set(conditions):
        raise ValidationFailure("outcome evidence must map every achieved_when condition exactly once")
    observations = {item["name"] for item in adapter["observations"]}
    for item in simulation["outcome"]["evidence"]:
        unknown_observations = sorted(set(item["observe_via"]) - observations)
        if unknown_observations:
            raise ValidationFailure(
                f"outcome evidence names unknown observations: {', '.join(unknown_observations)}"
            )


def validate(
    simulation_path: Path,
    adapter_path: Path,
) -> tuple[dict[str, Any], dict[str, Any]]:
    root = Path(__file__).resolve().parent.parent
    simulation = load_document(simulation_path)
    adapter = load_document(adapter_path)
    validate_schema(simulation, root / "references" / "simulation.schema.json", "simulation")
    validate_schema(adapter, root / "references" / "adapter.schema.json", "adapter")
    validate_cross_contract(simulation, adapter)
    return simulation, adapter


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--simulation", required=True, type=Path)
    parser.add_argument("--adapter", required=True, type=Path)
    args = parser.parse_args(argv)
    try:
        simulation, adapter = validate(args.simulation, args.adapter)
    except ValidationFailure as error:
        print(f"simulation_status=FAIL reason={error}", file=sys.stderr)
        return 1
    print(
        "simulation_status=PASS "
        f"simulation={simulation['id']} adapter={adapter['id']} "
        f"surface={adapter['surface']} actions={len(adapter['actions'])} "
        "result=USE_RUNTIME_VERIFY"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
