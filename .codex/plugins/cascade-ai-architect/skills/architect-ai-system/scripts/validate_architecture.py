#!/usr/bin/env python3
"""Validate a Cascade AI architecture packet without third-party packages."""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path
from typing import Any


SKILL_DIR = Path(__file__).resolve().parents[1]
SCHEMA_PATH = SKILL_DIR / "references" / "architecture.schema.json"
SLUG_RE = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$")
OPAQUE_ID_RE = re.compile(
    r"^(?:c|cap|capability|claim|cluster|agent|role|skill|workflow|prompt|tool|eval|decision|gap)-?\d+$",
    re.IGNORECASE,
)
BEHAVIOR_BLOCKS = {
    "objective",
    "input_contract",
    "output_contract",
    "loop",
    "state",
    "context",
    "memory",
    "tools",
    "skills",
    "roles",
    "failure",
    "observability",
    "evaluation",
    "rollout",
}
COMPONENT_KINDS = ("agents", "roles", "tools", "skills", "workflows", "prompts", "evaluations")
LIMIT_KEYS = ("turns", "time_seconds", "tool_calls", "tokens", "cost_usd")


def load_packet(path: Path) -> dict[str, Any]:
    """Load the portable JSON-compatible subset of YAML 1.2."""
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"{path}: architecture.yaml must use the packaged JSON-compatible YAML subset: {exc}"
        ) from exc
    if not isinstance(value, dict):
        raise ValueError(f"{path}: packet root must be an object")
    return value


def load_schema() -> dict[str, Any]:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def _type_matches(value: Any, expected: str) -> bool:
    return {
        "object": isinstance(value, dict),
        "array": isinstance(value, list),
        "string": isinstance(value, str),
        "number": isinstance(value, (int, float)) and not isinstance(value, bool),
        "integer": isinstance(value, int) and not isinstance(value, bool),
        "boolean": isinstance(value, bool),
        "null": value is None,
    }.get(expected, False)


def _resolve_ref(root: dict[str, Any], ref: str) -> dict[str, Any]:
    if not ref.startswith("#/"):
        raise ValueError(f"unsupported non-local schema reference: {ref}")
    value: Any = root
    for part in ref[2:].split("/"):
        value = value[part.replace("~1", "/").replace("~0", "~")]
    if not isinstance(value, dict):
        raise ValueError(f"schema reference is not an object: {ref}")
    return value


def _schema_errors(value: Any, rule: dict[str, Any], root: dict[str, Any], path: str) -> list[str]:
    if "$ref" in rule:
        return _schema_errors(value, _resolve_ref(root, rule["$ref"]), root, path)

    errors: list[str] = []
    expected = rule.get("type")
    if expected is not None and not _type_matches(value, expected):
        return [f"{path}: expected {expected}, got {type(value).__name__}"]
    if "const" in rule and value != rule["const"]:
        errors.append(f"{path}: expected constant {rule['const']!r}")
    if "enum" in rule and value not in rule["enum"]:
        errors.append(f"{path}: value {value!r} is not in {rule['enum']!r}")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in rule and value < rule["minimum"]:
            errors.append(f"{path}: value {value!r} is below minimum {rule['minimum']!r}")
    if isinstance(value, str):
        if len(value) < rule.get("minLength", 0):
            errors.append(f"{path}: string is shorter than {rule['minLength']}")
        if "pattern" in rule and re.fullmatch(rule["pattern"], value) is None:
            errors.append(f"{path}: value {value!r} does not match {rule['pattern']}")
    if isinstance(value, list):
        if len(value) < rule.get("minItems", 0):
            errors.append(f"{path}: requires at least {rule['minItems']} items")
        item_rule = rule.get("items")
        if isinstance(item_rule, dict):
            for index, item in enumerate(value):
                errors.extend(_schema_errors(item, item_rule, root, f"{path}[{index}]"))
    if isinstance(value, dict):
        if len(value) < rule.get("minProperties", 0):
            errors.append(f"{path}: requires at least {rule['minProperties']} properties")
        properties = rule.get("properties", {})
        for required in rule.get("required", []):
            if required not in value:
                errors.append(f"{path}: missing required field {required!r}")
        if rule.get("additionalProperties") is False:
            for key in value:
                if key not in properties:
                    errors.append(f"{path}: unknown field {key!r}")
        for key, child_rule in properties.items():
            if key in value:
                errors.extend(_schema_errors(value[key], child_rule, root, f"{path}.{key}"))
    return errors


def _index(items: Any, kind: str, errors: list[str]) -> dict[str, dict[str, Any]]:
    indexed: dict[str, dict[str, Any]] = {}
    if not isinstance(items, list):
        return indexed
    for position, item in enumerate(items):
        if not isinstance(item, dict) or not isinstance(item.get("slug"), str):
            continue
        slug = item["slug"]
        if slug in indexed:
            errors.append(f"components.{kind}[{position}]: duplicate slug {slug!r}")
        else:
            indexed[slug] = item
    return indexed


def _check_refs(values: Any, allowed: set[str], path: str, errors: list[str]) -> None:
    if not isinstance(values, list):
        return
    for value in values:
        if isinstance(value, str) and value not in allowed:
            errors.append(f"{path}: unresolved reference {value!r}")


def _check_limits(limits: Any, path: str, errors: list[str]) -> None:
    if not isinstance(limits, dict):
        return
    for key in LIMIT_KEYS:
        value = limits.get(key)
        if (
            not isinstance(value, (int, float))
            or isinstance(value, bool)
            or not math.isfinite(value)
            or value <= 0
        ):
            errors.append(f"{path}.{key}: must be a finite positive number")


def validate_packet(packet: dict[str, Any], schema: dict[str, Any] | None = None) -> list[str]:
    """Return all deterministic schema and cross-reference errors."""
    schema = schema or load_schema()
    errors = _schema_errors(packet, schema, schema, "packet")

    slug_locations: dict[str, str] = {}

    def register(slug: Any, path: str) -> None:
        if not isinstance(slug, str):
            return
        if not SLUG_RE.fullmatch(slug):
            errors.append(f"{path}: slug {slug!r} must be descriptive lower-kebab with at least two terms")
        if OPAQUE_ID_RE.fullmatch(slug):
            errors.append(f"{path}: opaque ordinal identifier {slug!r} is forbidden")
        previous = slug_locations.get(slug)
        if previous:
            errors.append(f"{path}: slug {slug!r} duplicates {previous}")
        else:
            slug_locations[slug] = path

    register(packet.get("packet_slug"), "packet.packet_slug")
    capabilities = _index(packet.get("capabilities"), "capabilities", errors)
    clusters = _index(packet.get("clusters"), "clusters", errors)
    for slug in capabilities:
        register(slug, f"packet.capabilities[{slug}]")
    for slug in clusters:
        register(slug, f"packet.clusters[{slug}]")

    components = packet.get("components") if isinstance(packet.get("components"), dict) else {}
    indexes = {kind: _index(components.get(kind), kind, errors) for kind in COMPONENT_KINDS}
    for kind, indexed in indexes.items():
        for slug in indexed:
            register(slug, f"packet.components.{kind}[{slug}]")
    for index, gap in enumerate(packet.get("gaps", [])):
        if isinstance(gap, dict):
            register(gap.get("slug"), f"packet.gaps[{index}].slug")
    for index, decision in enumerate(packet.get("decisions", [])):
        if isinstance(decision, dict):
            register(decision.get("slug"), f"packet.decisions[{index}].slug")

    sources = packet.get("source_snapshot", {}).get("sources", []) if isinstance(packet.get("source_snapshot"), dict) else []
    source_locators: set[str] = set()
    for index, source in enumerate(sources if isinstance(sources, list) else []):
        locator = source.get("locator") if isinstance(source, dict) else None
        if isinstance(locator, str):
            if locator in source_locators:
                errors.append(f"packet.source_snapshot.sources[{index}]: duplicate locator {locator!r}")
            source_locators.add(locator)

    owner_slugs = set(indexes["agents"]) | set(indexes["workflows"])
    capability_slugs = set(capabilities)
    cluster_slugs = set(clusters)
    for slug, capability in capabilities.items():
        for input_index, item in enumerate(capability.get("inputs", [])):
            locator = item.get("source_locator") if isinstance(item, dict) else None
            if isinstance(locator, str) and locator not in source_locators:
                errors.append(f"capability {slug!r} input {input_index}: unknown source locator {locator!r}")
        cluster = capability.get("cluster")
        if cluster not in cluster_slugs:
            errors.append(f"capability {slug!r}: unresolved cluster {cluster!r}")
        owner = capability.get("primary_owner")
        if owner not in owner_slugs:
            errors.append(f"capability {slug!r}: unresolved primary owner {owner!r}")
        elif slug not in indexes["agents"].get(owner, indexes["workflows"].get(owner, {})).get("capabilities", []):
            errors.append(f"capability {slug!r}: primary owner {owner!r} does not declare the capability")

    memberships: dict[str, list[str]] = {slug: [] for slug in capability_slugs}
    for slug, cluster in clusters.items():
        refs = cluster.get("capabilities", [])
        _check_refs(refs, capability_slugs, f"cluster {slug!r}.capabilities", errors)
        for ref in refs if isinstance(refs, list) else []:
            if ref in memberships:
                memberships[ref].append(slug)
        if cluster.get("recovery_owner") not in owner_slugs:
            errors.append(f"cluster {slug!r}: unresolved recovery owner {cluster.get('recovery_owner')!r}")
    for slug, member_of in memberships.items():
        if member_of != [capabilities[slug].get("cluster")]:
            errors.append(f"capability {slug!r}: must appear exactly once in declared cluster; found {member_of!r}")

    output_contract = packet.get("behavior_blocks", {}).get("output_contract", {}) if isinstance(packet.get("behavior_blocks"), dict) else {}
    if isinstance(output_contract, dict) and output_contract.get("primary_owner") not in owner_slugs:
        errors.append(f"behavior_blocks.output_contract.primary_owner: unresolved owner {output_contract.get('primary_owner')!r}")

    agents, roles, tools = indexes["agents"], indexes["roles"], indexes["tools"]
    skills, workflows = indexes["skills"], indexes["workflows"]
    prompts, evaluations = indexes["prompts"], indexes["evaluations"]
    for slug, agent in agents.items():
        _check_refs(agent.get("capabilities"), capability_slugs, f"agent {slug!r}.capabilities", errors)
        for capability_slug in agent.get("capabilities", []):
            capability = capabilities.get(capability_slug)
            if capability is not None and capability.get("primary_owner") != slug:
                errors.append(
                    f"agent {slug!r}.capabilities: {capability_slug!r} is primarily owned by "
                    f"{capability.get('primary_owner')!r}"
                )
        _check_refs(agent.get("tools"), set(tools), f"agent {slug!r}.tools", errors)
        _check_refs(agent.get("skills"), set(skills), f"agent {slug!r}.skills", errors)
        _check_refs(agent.get("workflows"), set(workflows), f"agent {slug!r}.workflows", errors)
        _check_refs(agent.get("prompts"), set(prompts), f"agent {slug!r}.prompts", errors)
        _check_refs(agent.get("evaluations"), set(evaluations), f"agent {slug!r}.evaluations", errors)
        if agent.get("state_owner") not in workflows:
            errors.append(f"agent {slug!r}.state_owner: unresolved workflow {agent.get('state_owner')!r}")
        _check_limits(agent.get("limits"), f"agent {slug!r}.limits", errors)
    mutation_owners: dict[str, str] = {}
    role_agents: set[str] = set()
    for slug, role in roles.items():
        if role.get("agent") not in agents:
            errors.append(f"role {slug!r}.agent: unresolved agent {role.get('agent')!r}")
        else:
            role_agents.add(role["agent"])
        _check_refs(role.get("capabilities"), capability_slugs, f"role {slug!r}.capabilities", errors)
        for scope in role.get("mutation_scope", []):
            prior = mutation_owners.get(scope)
            if prior:
                errors.append(f"role {slug!r}.mutation_scope: {scope!r} already owned by role {prior!r}")
            else:
                mutation_owners[scope] = slug
    for slug in agents:
        if slug not in role_agents:
            errors.append(f"agent {slug!r}: must be referenced by at least one role")

    topology = packet.get("topology") if isinstance(packet.get("topology"), dict) else {}
    topology_kind = topology.get("kind")
    agent_count = len(agents)
    if topology_kind == "deterministic_workflow" and agent_count != 0:
        errors.append("topology deterministic_workflow requires exactly zero agents")
    elif topology_kind in {"single_agent", "single_agent_with_skills"} and agent_count != 1:
        errors.append(f"topology {topology_kind} requires exactly one agent; found {agent_count}")
    elif topology_kind in {"manager_with_specialists", "decentralized_handoffs", "evaluator_optimizer"} and agent_count < 2:
        errors.append(f"topology {topology_kind} requires at least two role-backed agents; found {agent_count}")
    for slug, tool in tools.items():
        if tool.get("effect") != "read_only":
            for field in ("permission_rule", "confirmation_rule"):
                value = tool.get(field)
                if not isinstance(value, str) or not value.strip() or value.strip().lower() in {"none", "n/a", "na"}:
                    errors.append(f"tool {slug!r}.{field}: state-changing tools require an explicit rule")
    for slug, skill in skills.items():
        _check_refs(skill.get("capabilities"), capability_slugs, f"skill {slug!r}.capabilities", errors)
    for slug, workflow in workflows.items():
        _check_refs(workflow.get("capabilities"), capability_slugs, f"workflow {slug!r}.capabilities", errors)
        if workflow.get("state_owner") not in workflows:
            errors.append(f"workflow {slug!r}.state_owner: unresolved workflow {workflow.get('state_owner')!r}")
    for slug, prompt in prompts.items():
        if prompt.get("owner") not in owner_slugs:
            errors.append(f"prompt {slug!r}.owner: unresolved owner {prompt.get('owner')!r}")
    for slug, evaluation in evaluations.items():
        if evaluation.get("owner") not in owner_slugs:
            errors.append(f"evaluation {slug!r}.owner: unresolved owner {evaluation.get('owner')!r}")

    behavior = packet.get("behavior_blocks")
    if isinstance(behavior, dict):
        missing = BEHAVIOR_BLOCKS - set(behavior)
        for name in sorted(missing):
            errors.append(f"packet.behavior_blocks: missing block {name!r}")
        loop = behavior.get("loop")
        if isinstance(loop, dict):
            _check_limits(loop.get("budgets"), "behavior_blocks.loop.budgets", errors)
        state = behavior.get("state")
        if isinstance(state, dict) and state.get("owner") not in workflows:
            errors.append(f"behavior_blocks.state.owner: unresolved workflow {state.get('owner')!r}")
        tool_block = behavior.get("tools")
        if isinstance(tool_block, dict):
            _check_refs(tool_block.get("references"), set(tools), "behavior_blocks.tools.references", errors)
        skill_block = behavior.get("skills")
        if isinstance(skill_block, dict):
            _check_refs(skill_block.get("references"), set(skills), "behavior_blocks.skills.references", errors)
            _check_refs(
                skill_block.get("prompt_references"),
                set(prompts),
                "behavior_blocks.skills.prompt_references",
                errors,
            )
        role_block = behavior.get("roles")
        if isinstance(role_block, dict):
            for field in ("primary_owner", "merge_authority"):
                if role_block.get(field) not in owner_slugs:
                    errors.append(f"behavior_blocks.roles.{field}: unresolved owner {role_block.get(field)!r}")
            if (
                isinstance(output_contract, dict)
                and role_block.get("primary_owner") != output_contract.get("primary_owner")
            ):
                errors.append("behavior_blocks.roles.primary_owner: must match final output primary owner")
        failure_block = behavior.get("failure")
        if isinstance(failure_block, dict) and failure_block.get("recovery_owner") not in owner_slugs:
            errors.append(
                f"behavior_blocks.failure.recovery_owner: unresolved owner {failure_block.get('recovery_owner')!r}"
            )
        evaluation_block = behavior.get("evaluation")
        if isinstance(evaluation_block, dict):
            _check_refs(
                evaluation_block.get("references"),
                set(evaluations),
                "behavior_blocks.evaluation.references",
                errors,
            )

    gaps = packet.get("gaps", []) if isinstance(packet.get("gaps"), list) else []
    active_gap_affects = {
        affected
        for gap in gaps
        if isinstance(gap, dict) and gap.get("status") in {"OPEN", "BLOCKED"}
        for affected in gap.get("affects", [])
        if isinstance(affected, str)
    }
    known_entities = capability_slugs | cluster_slugs | owner_slugs | set(slug_locations)
    for index, gap in enumerate(gaps):
        if isinstance(gap, dict):
            _check_refs(gap.get("affects"), known_entities, f"gap {index}.affects", errors)
    for slug, capability in capabilities.items():
        evidence = capability.get("evidence_status")
        if evidence in {"assumed", "unresolved"} and slug not in active_gap_affects:
            errors.append(f"capability {slug!r}: {evidence} evidence requires an active gap")
        if evidence == "unresolved" and packet.get("packet_status") not in {"GAP", "BLOCKED"}:
            errors.append(f"capability {slug!r}: unresolved evidence requires packet status GAP or BLOCKED")

    for index, decision in enumerate(packet.get("decisions", [])):
        if isinstance(decision, dict):
            for locator in decision.get("source_locators", []):
                if locator not in source_locators:
                    errors.append(f"decision {index}: unknown source locator {locator!r}")

    return list(dict.fromkeys(errors))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("packet", type=Path, help="JSON-compatible YAML architecture packet")
    args = parser.parse_args(argv)
    try:
        packet = load_packet(args.packet)
        errors = validate_packet(packet)
    except (OSError, ValueError, KeyError) as exc:
        print(f"INVALID: {exc}", file=sys.stderr)
        return 2
    if errors:
        print(f"INVALID: {len(errors)} error(s)", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"VALID: {args.packet}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
