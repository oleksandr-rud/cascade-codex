#!/usr/bin/env python3
"""Maintain one bounded Codex-host simulation run without owning target tools."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

from validate_simulation import (
    ValidationFailure,
    load_document,
    stable_json,
    validate,
    validate_schema,
    value_digest,
)


TERMINAL_STATUSES = {
    "ACHIEVED",
    "FAILED",
    "BLOCKED",
    "TIMED_OUT",
    "BUDGET_EXHAUSTED",
    "CANCELLED",
    "UNKNOWN_OUTCOME",
}
STEP_OUTCOMES = {"PASS", "FAIL", "BLOCKED", "CANCELLED", "UNKNOWN_OUTCOME"}
RECORDED_EVIDENCE_STATUSES = {"SUPPORTED", "UNSUPPORTED", "UNKNOWN"}
CLEANUP_STATUSES = {"VERIFIED", "NOT_REQUIRED", "FAILED", "UNKNOWN"}


class RuntimeFailure(ValueError):
    pass


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def atomic_json(path: Path, value: object) -> None:
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    with temporary.open("x", encoding="utf-8") as handle:
        handle.write(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, path)


def run_files(run_dir: Path) -> tuple[Path, Path, Path]:
    return run_dir / "contract.json", run_dir / "events.jsonl", run_dir / "result.json"


def event_digest(event: dict[str, Any]) -> str:
    return value_digest({key: value for key, value in event.items() if key != "event_digest"})


def read_events(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        raise RuntimeFailure(f"missing event journal: {path}")
    events: list[dict[str, Any]] = []
    previous: str | None = None
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            raise RuntimeFailure(f"blank journal line at {line_number}")
        try:
            event = json.loads(line)
        except json.JSONDecodeError as error:
            raise RuntimeFailure(f"invalid journal JSON at line {line_number}: {error}") from error
        if not isinstance(event, dict):
            raise RuntimeFailure(f"journal line {line_number} must be an object")
        if event.get("sequence") != len(events):
            raise RuntimeFailure(f"journal sequence is invalid at line {line_number}")
        if event.get("previous_event_digest") != previous:
            raise RuntimeFailure(f"journal chain is invalid at line {line_number}")
        if event.get("event_digest") != event_digest(event):
            raise RuntimeFailure(f"journal digest is invalid at line {line_number}")
        previous = event["event_digest"]
        events.append(event)
    if not events or events[0].get("event_type") != "SESSION_STARTED":
        raise RuntimeFailure("journal must begin with SESSION_STARTED")
    terminal_indexes = [
        index for index, event in enumerate(events) if event.get("event_type") == "SESSION_TERMINATED"
    ]
    if len(terminal_indexes) > 1 or (terminal_indexes and terminal_indexes[0] != len(events) - 1):
        raise RuntimeFailure("terminal event must be unique and final")
    return events


def append_event(path: Path, events: list[dict[str, Any]], event_type: str, payload: dict[str, Any]) -> dict[str, Any]:
    event: dict[str, Any] = {
        "schema_version": 1,
        "sequence": len(events),
        "event_type": event_type,
        "at": utc_now(),
        "payload": payload,
        "previous_event_digest": events[-1]["event_digest"] if events else None,
    }
    event["event_digest"] = event_digest(event)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(stable_json(event) + "\n")
        handle.flush()
        os.fsync(handle.fileno())
    events.append(event)
    return event


def load_contract(run_dir: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    contract_path, events_path, _ = run_files(run_dir)
    if not contract_path.is_file():
        raise RuntimeFailure(f"missing run contract: {contract_path}")
    contract = json.loads(contract_path.read_text(encoding="utf-8"))
    if not isinstance(contract, dict) or contract.get("schema_version") != 1:
        raise RuntimeFailure("run contract is invalid")
    root = Path(__file__).resolve().parent.parent
    validate_schema(contract["simulation"], root / "references" / "simulation.schema.json", "simulation")
    validate_schema(contract["adapter"], root / "references" / "adapter.schema.json", "adapter")
    if contract["source_digests"].get("simulation") != value_digest(contract["simulation"]):
        raise RuntimeFailure("frozen simulation digest is invalid")
    if contract["source_digests"].get("adapter") != value_digest(contract["adapter"]):
        raise RuntimeFailure("frozen adapter digest is invalid")
    events = read_events(events_path)
    if events[0]["payload"].get("run_id") != contract.get("run_id"):
        raise RuntimeFailure("journal run identity does not match contract")
    return contract, events


def start_run(
    simulation_path: Path,
    adapter_path: Path,
    run_dir: Path,
    run_id: str,
    available_bindings: dict[str, str],
) -> dict[str, Any]:
    simulation, adapter = validate(simulation_path, adapter_path)
    required_bindings = adapter["driver"]["bindings"]
    missing = sorted(set(required_bindings) - set(available_bindings))
    if missing:
        raise RuntimeFailure(f"adapter preflight missing Codex host bindings: {', '.join(missing)}")
    extra = sorted(set(available_bindings) - set(required_bindings))
    if extra:
        raise RuntimeFailure(f"adapter preflight received undeclared host bindings: {', '.join(extra)}")
    mismatched = sorted(
        capability
        for capability, tool_identity in required_bindings.items()
        if available_bindings.get(capability) != tool_identity
    )
    if mismatched:
        raise RuntimeFailure(
            "adapter preflight Codex host binding mismatch: " + ", ".join(mismatched)
        )
    if run_dir.exists():
        raise RuntimeFailure(f"run directory already exists: {run_dir}")
    run_dir.mkdir(parents=True)
    contract_path, events_path, _ = run_files(run_dir)
    contract = {
        "schema_version": 1,
        "run_id": run_id,
        "created_at": utc_now(),
        "simulation": simulation,
        "adapter": adapter,
        "host_bindings": dict(sorted(available_bindings.items())),
        "source_digests": {
            "simulation": value_digest(simulation),
            "adapter": value_digest(adapter),
        },
    }
    atomic_json(contract_path, contract)
    events_path.touch(exist_ok=False)
    events: list[dict[str, Any]] = []
    append_event(
        events_path,
        events,
        "SESSION_STARTED",
        {
            "run_id": run_id,
            "simulation_id": simulation["id"],
            "adapter_id": adapter["id"],
            "surface": adapter["surface"],
            "target": adapter["target"],
            "source_digests": contract["source_digests"],
        },
    )
    return run_status(run_dir)


def completed_tokens(events: list[dict[str, Any]]) -> set[str]:
    return {
        event["payload"]["dispatch_token"]
        for event in events
        if event["event_type"] == "ACTION_COMPLETED"
    }


def pending_dispatch(events: list[dict[str, Any]]) -> dict[str, Any] | None:
    completed = completed_tokens(events)
    pending = [
        event
        for event in events
        if event["event_type"] == "ACTION_DISPATCHED"
        and event["payload"]["dispatch_token"] not in completed
    ]
    if len(pending) > 1:
        raise RuntimeFailure("journal contains multiple unmatched dispatches")
    return pending[0] if pending else None


def run_projection(contract: dict[str, Any], events: list[dict[str, Any]]) -> dict[str, Any]:
    dispatches = [event for event in events if event["event_type"] == "ACTION_DISPATCHED"]
    completions = [event for event in events if event["event_type"] == "ACTION_COMPLETED"]
    recovery_count = sum(bool(event["payload"].get("recovery")) for event in dispatches)
    evidence_by_condition: dict[str, list[dict[str, str]]] = {}
    observations: list[str] = []
    completed_work: list[str] = []
    actor_state = {
        item["name"]: item["initial"]
        for item in contract["simulation"]["actor"].get("state_variables", [])
    }
    state_history: list[dict[str, str]] = []
    for event in completions:
        payload = event["payload"]
        event_reference = f"event:{event['sequence']}:{event['event_digest']}"
        observations.append(
            f"{event_reference} observation:{payload['observation_name']} {payload['observation']}"
        )
        if payload["outcome"] == "PASS":
            completed_work.append(payload["action"])
        actor_state = payload.get("actor_state", actor_state)
        if payload.get("state_transition"):
            state_history.append(
                {
                    "reference": event_reference,
                    "transition": payload["state_transition"],
                    "evidence": payload["state_evidence"],
                }
            )
        for item in payload.get("evidence", []):
            evidence_by_condition.setdefault(item["condition"], []).append(
                {
                    **item,
                    "reference": event_reference,
                    "observation_name": payload["observation_name"],
                }
            )
    required_conditions = contract["simulation"]["outcome"]["achieved_when"]
    outcome_evidence: list[dict[str, str]] = []
    for condition in required_conditions:
        records = evidence_by_condition.get(condition, [])
        statuses = {item["status"] for item in records}
        if "SUPPORTED" in statuses and "UNSUPPORTED" in statuses:
            status = "CONFLICTING"
        elif "UNSUPPORTED" in statuses:
            status = "UNSUPPORTED"
        elif "SUPPORTED" in statuses:
            status = "SUPPORTED"
        else:
            status = "UNKNOWN"
        evidence_text = " | ".join(
            f"{item['reference']} observation:{item['observation_name']} {item['evidence']}"
            for item in records
            if item["evidence"].strip()
        )
        outcome_evidence.append(
            {"condition": condition, "status": status, "evidence": evidence_text}
        )
    terminal = events[-1] if events[-1]["event_type"] == "SESSION_TERMINATED" else None
    end_time = parse_time(terminal["at"]) if terminal else datetime.now(timezone.utc)
    elapsed = max(0.0, (end_time - parse_time(contract["created_at"])).total_seconds())
    limits = contract["simulation"]["limits"]
    pending = pending_dispatch(events)
    unsafe_completion = next(
        (
            event
            for event in reversed(completions)
            if event["payload"]["outcome"] in {"CANCELLED", "UNKNOWN_OUTCOME"}
        ),
        None,
    )
    if terminal:
        status = terminal["payload"]["status"]
    elif pending:
        status = "UNKNOWN_OUTCOME"
    elif unsafe_completion:
        status = unsafe_completion["payload"]["outcome"]
    elif all(item["status"] == "SUPPORTED" and item["evidence"].strip() for item in outcome_evidence):
        status = "ACHIEVED"
    elif len(dispatches) >= limits["max_steps"] or sum(
        event["payload"]["expected_tool_calls"] for event in dispatches
    ) >= limits["max_tool_calls"]:
        status = "BUDGET_EXHAUSTED"
    elif elapsed >= limits["max_duration_seconds"]:
        status = "TIMED_OUT"
    else:
        status = "RUNNING"
    return {
        "run_id": contract["run_id"],
        "simulation_id": contract["simulation"]["id"],
        "status": status,
        "pending_dispatch": pending["payload"] if pending else None,
        "outcome_evidence": outcome_evidence,
        "observations": observations,
        "work_completed": completed_work,
        "actor_state": actor_state,
        "state_history": state_history,
        "usage": {
            "steps": len(dispatches),
            "tool_calls": sum(event["payload"]["expected_tool_calls"] for event in dispatches),
            "duration_seconds": round(elapsed, 3),
            "recoveries": recovery_count,
        },
        "event_tail_digest": events[-1]["event_digest"],
    }


def run_status(run_dir: Path) -> dict[str, Any]:
    contract, events = load_contract(run_dir)
    return run_projection(contract, events)


def validated_actor_state(
    contract: dict[str, Any],
    current: dict[str, str],
    proposed: dict[str, Any] | None,
    transition_text: str | None,
    state_evidence: str | None,
) -> dict[str, str]:
    variables = contract["simulation"]["actor"].get("state_variables", [])
    allowed = {item["name"]: set(item["allowed_values"]) for item in variables}
    if not allowed:
        if proposed is not None or transition_text or state_evidence:
            raise RuntimeFailure("actor state was supplied but the actor declares no state variables")
        return {}

    candidate = dict(current) if proposed is None else proposed
    if set(candidate) != set(allowed):
        raise RuntimeFailure("actor state must exactly cover the declared state variables")
    for name, value in candidate.items():
        if not isinstance(value, str) or value not in allowed[name]:
            raise RuntimeFailure(f"actor state gives {name} an unsupported value: {value}")

    changed = candidate != current
    if not changed:
        if transition_text or state_evidence:
            raise RuntimeFailure("unchanged actor state must not claim a transition")
        return dict(candidate)
    if not transition_text:
        raise RuntimeFailure("changed actor state requires an exact declared transition")
    transitions = {
        item["when"]: item
        for item in contract["simulation"]["actor"].get("state_transitions", [])
    }
    if transition_text not in transitions:
        raise RuntimeFailure("actor state transition is not declared by the fixed actor contract")
    expected = dict(current)
    expected.update(transitions[transition_text]["set"])
    if candidate != expected:
        raise RuntimeFailure("actor state change does not match the declared transition")
    if not state_evidence or not state_evidence.strip():
        raise RuntimeFailure("actor state transition requires grounded state evidence")
    return dict(candidate)


def authorize_action(
    run_dir: Path,
    action_name: str,
    action_input: dict[str, Any],
    confirmed: bool,
    idempotency_key: str | None,
    expected_tool_calls: int,
) -> dict[str, Any]:
    contract, events = load_contract(run_dir)
    projection = run_projection(contract, events)
    cleanup_action = contract["adapter"]["cleanup"]["action"]
    completed_cleanup = any(
        event["event_type"] == "ACTION_COMPLETED"
        and event["payload"]["action"] == cleanup_action
        for event in events
    ) if cleanup_action is not None else False
    if completed_cleanup:
        raise RuntimeFailure("cleanup already completed; no further target action is allowed")
    cleanup_after_achievement = projection["status"] == "ACHIEVED" and action_name == cleanup_action
    if projection["status"] != "RUNNING" and not cleanup_after_achievement:
        raise RuntimeFailure(f"run cannot dispatch from status {projection['status']}")
    if expected_tool_calls < 1:
        raise RuntimeFailure("expected_tool_calls must be positive")
    limits = contract["simulation"]["limits"]
    if projection["usage"]["steps"] + 1 > limits["max_steps"]:
        raise RuntimeFailure("step budget would be exceeded")
    if projection["usage"]["tool_calls"] + expected_tool_calls > limits["max_tool_calls"]:
        raise RuntimeFailure("tool-call budget would be exceeded")
    actions = {action["name"]: action for action in contract["adapter"]["actions"]}
    action = actions.get(action_name)
    if action is None:
        raise RuntimeFailure(f"adapter action is not declared: {action_name}")
    authority = contract["simulation"]["authority"]
    if action_name not in authority["allowed_actions"]:
        raise RuntimeFailure(f"action {action_name} is outside the frozen authority scope")
    if action["capability"] not in contract["host_bindings"]:
        raise RuntimeFailure(f"Codex host binding is unavailable: {action['capability']}")
    recovery = action["purpose"] == "recovery"
    if recovery:
        recovery_action = contract["adapter"]["recovery"]["action"]
        if action_name != recovery_action:
            raise RuntimeFailure(
                f"recovery must use the declared adapter action: {recovery_action}"
            )
        if projection["usage"]["recoveries"] + 1 > limits["max_recoveries"]:
            raise RuntimeFailure("recovery budget would be exceeded")
    input_schema = action.get("input")
    if input_schema:
        errors = sorted(Draft202012Validator(input_schema).iter_errors(action_input), key=lambda item: list(item.path))
        if errors:
            location = ".".join(str(part) for part in errors[0].path) or "root"
            raise RuntimeFailure(f"action input {location}: {errors[0].message}")
    confirmation = action["confirmation"]
    if confirmation == "always" and not confirmed:
        raise RuntimeFailure(f"action {action_name} requires explicit confirmation")
    if action["idempotency"] == "key-required" and not idempotency_key:
        raise RuntimeFailure(f"action {action_name} requires an idempotency key")
    idempotency_key = idempotency_key or f"{contract['run_id']}:{action_name}:{projection['usage']['steps'] + 1}"
    key_digest = sha256_text(idempotency_key)
    prior_keys = {
        event["payload"]["idempotency_key_digest"]
        for event in events
        if event["event_type"] == "ACTION_DISPATCHED"
    }
    if key_digest in prior_keys:
        raise RuntimeFailure("idempotency key was already dispatched")
    token = uuid.uuid4().hex
    event = append_event(
        run_files(run_dir)[1],
        events,
        "ACTION_DISPATCHED",
        {
            "dispatch_token": token,
            "action": action_name,
            "capability": action["capability"],
            "risk": action["risk"],
            "authority_source": authority["source"],
            "authority_scope": authority["scope"],
            "confirmed": confirmed,
            "recovery": recovery,
            "idempotency_key_digest": key_digest,
            "input": action_input,
            "input_digest": value_digest(action_input),
            "expected_tool_calls": expected_tool_calls,
        },
    )
    return {
        "status": "AUTHORIZED_FOR_IMMEDIATE_DISPATCH",
        "dispatch_token": token,
        "action": action_name,
        "capability": action["capability"],
        "event_digest": event["event_digest"],
    }


def validate_evidence(
    evidence: list[dict[str, Any]],
    outcome: dict[str, Any],
    observation_name: str,
) -> None:
    conditions = outcome["achieved_when"]
    observation_paths = {
        item["condition"]: set(item["observe_via"])
        for item in outcome["evidence"]
    }
    for item in evidence:
        if set(item) != {"condition", "status", "evidence"}:
            raise RuntimeFailure("each evidence item requires condition, status, and evidence only")
        if item["condition"] not in conditions:
            raise RuntimeFailure(f"evidence names an unknown outcome condition: {item['condition']}")
        if item["status"] not in RECORDED_EVIDENCE_STATUSES:
            raise RuntimeFailure(f"invalid evidence status: {item['status']}")
        if observation_name not in observation_paths[item["condition"]]:
            raise RuntimeFailure(
                f"observation {observation_name} is not allowed evidence for condition: {item['condition']}"
            )
        if item["status"] == "SUPPORTED" and not str(item["evidence"]).strip():
            raise RuntimeFailure("SUPPORTED evidence requires a non-empty observation reference")


def record_action(
    run_dir: Path,
    dispatch_token: str,
    outcome: str,
    observation_name: str,
    observation: str,
    evidence: list[dict[str, Any]],
    duration_seconds: float,
    actor_state: dict[str, Any] | None = None,
    state_transition: str | None = None,
    state_evidence: str | None = None,
) -> dict[str, Any]:
    contract, events = load_contract(run_dir)
    pending = pending_dispatch(events)
    if pending is None:
        raise RuntimeFailure("no dispatched action is awaiting a result")
    if pending["payload"]["dispatch_token"] != dispatch_token:
        raise RuntimeFailure("dispatch token does not match the pending action")
    if outcome not in STEP_OUTCOMES:
        raise RuntimeFailure(f"invalid action outcome: {outcome}")
    observations = {
        item["name"]: set(item["produced_by"])
        for item in contract["adapter"]["observations"]
    }
    if observation_name not in observations:
        raise RuntimeFailure(f"adapter observation is not declared: {observation_name}")
    action_name = pending["payload"]["action"]
    if action_name not in observations[observation_name]:
        raise RuntimeFailure(
            f"observation {observation_name} is not produced by action {action_name}"
        )
    if not observation.strip():
        raise RuntimeFailure("action result requires a grounded observation")
    if duration_seconds < 0:
        raise RuntimeFailure("action duration cannot be negative")
    if duration_seconds > contract["simulation"]["limits"]["max_action_duration_seconds"] and outcome == "PASS":
        raise RuntimeFailure("an action exceeding its duration bound cannot be recorded as PASS")
    validate_evidence(evidence, contract["simulation"]["outcome"], observation_name)
    projection = run_projection(contract, events)
    next_actor_state = validated_actor_state(
        contract,
        projection["actor_state"],
        actor_state,
        state_transition,
        state_evidence,
    )
    event = append_event(
        run_files(run_dir)[1],
        events,
        "ACTION_COMPLETED",
        {
            "dispatch_token": dispatch_token,
            "action": pending["payload"]["action"],
            "outcome": outcome,
            "observation_name": observation_name,
            "observation": observation,
            "evidence": evidence,
            "actor_state": next_actor_state,
            "state_transition": state_transition,
            "state_evidence": state_evidence,
            "duration_seconds": duration_seconds,
            "recovery": bool(pending["payload"]["recovery"]),
        },
    )
    projection = run_projection(contract, events)
    projection["recorded_event_digest"] = event["event_digest"]
    return projection


def finish_run(
    run_dir: Path,
    status: str,
    reason: str,
    cleanup_status: str,
    cleanup_details: str,
    unresolved_risk: list[str],
    next_safe_action: str | None = None,
) -> dict[str, Any]:
    if status not in TERMINAL_STATUSES:
        raise RuntimeFailure(f"invalid terminal status: {status}")
    if cleanup_status not in CLEANUP_STATUSES:
        raise RuntimeFailure(f"invalid cleanup status: {cleanup_status}")
    if not reason.strip():
        raise RuntimeFailure("terminal reason must be non-empty")
    contract, events = load_contract(run_dir)
    if events[-1]["event_type"] == "SESSION_TERMINATED":
        raise RuntimeFailure("run is already terminal")
    projection = run_projection(contract, events)
    if projection["pending_dispatch"] and status != "UNKNOWN_OUTCOME":
        raise RuntimeFailure("an unmatched dispatch requires UNKNOWN_OUTCOME")
    if status == "ACHIEVED" and projection["status"] != "ACHIEVED":
        raise RuntimeFailure("ACHIEVED requires supported evidence for every outcome condition")
    if projection["status"] in {"TIMED_OUT", "BUDGET_EXHAUSTED"} and status != projection["status"]:
        raise RuntimeFailure(f"run must terminate as {projection['status']}")
    cleanup = contract["adapter"]["cleanup"]
    cleanup_action = cleanup["action"]
    cleanup_completions = [
        event
        for event in events
        if event["event_type"] == "ACTION_COMPLETED"
        and event["payload"]["action"] == cleanup_action
        and event["payload"]["outcome"] == "PASS"
    ] if cleanup_action is not None else []
    if cleanup_status == "VERIFIED":
        if not cleanup_completions:
            raise RuntimeFailure("VERIFIED cleanup requires a successful dispatched cleanup action")
        last_completion = next(
            event for event in reversed(events) if event["event_type"] == "ACTION_COMPLETED"
        )
        if last_completion["payload"]["action"] != cleanup_action:
            raise RuntimeFailure("VERIFIED cleanup must be the final completed target action")
        if last_completion["payload"]["observation_name"] != cleanup["verification_observation"]:
            raise RuntimeFailure("VERIFIED cleanup requires its declared verification observation")
    if cleanup["required"] and cleanup_status == "NOT_REQUIRED":
        raise RuntimeFailure("adapter requires cleanup; NOT_REQUIRED is invalid")
    if cleanup["required"] and status == "ACHIEVED" and cleanup_status != "VERIFIED":
        raise RuntimeFailure("ACHIEVED requires VERIFIED cleanup when adapter cleanup is required")
    terminal_payload: dict[str, Any] = {
        "status": status,
        "reason": reason,
        "cleanup": {"status": cleanup_status, "details": cleanup_details},
        "unresolved_risk": unresolved_risk,
    }
    if next_safe_action:
        terminal_payload["next_safe_action"] = next_safe_action
    terminal = append_event(
        run_files(run_dir)[1],
        events,
        "SESSION_TERMINATED",
        terminal_payload,
    )
    projection = run_projection(contract, events)
    result: dict[str, Any] = {
        "schema_version": 2,
        "run_id": contract["run_id"],
        "simulation_id": contract["simulation"]["id"],
        "status": status,
        "reason": reason,
        "source_digests": {
            **contract["source_digests"],
            "event_tail": terminal["event_digest"],
        },
        "work_completed": projection["work_completed"],
        "outcome_evidence": projection["outcome_evidence"],
        "observations": projection["observations"],
        "usage": projection["usage"],
        "cleanup": terminal_payload["cleanup"],
        "unresolved_risk": terminal_payload["unresolved_risk"],
        "final_actor_state": projection["actor_state"],
    }
    if next_safe_action:
        result["next_safe_action"] = next_safe_action
    root = Path(__file__).resolve().parent.parent
    validate_schema(result, root / "references" / "result.schema.json", "result")
    if status == "ACHIEVED" and any(
        item["status"] != "SUPPORTED" or not item["evidence"].strip()
        for item in result["outcome_evidence"]
    ):
        raise RuntimeFailure("ACHIEVED result lacks complete grounded evidence")
    result_path = run_files(run_dir)[2]
    if result_path.exists():
        raise RuntimeFailure(f"result already exists: {result_path}")
    atomic_json(result_path, result)
    return result


def verify_run(run_dir: Path) -> dict[str, Any]:
    contract, events = load_contract(run_dir)
    projection = run_projection(contract, events)
    result_path = run_files(run_dir)[2]
    result_status = "NOT_RUN"
    if result_path.is_file():
        result = load_document(result_path)
        root = Path(__file__).resolve().parent.parent
        validate_schema(result, root / "references" / "result.schema.json", "result")
        if result["run_id"] != contract["run_id"] or result["simulation_id"] != contract["simulation"]["id"]:
            raise RuntimeFailure("result identity does not match frozen contract")
        if result["source_digests"] != {
            **contract["source_digests"],
            "event_tail": events[-1]["event_digest"],
        }:
            raise RuntimeFailure("result digests do not match frozen run")
        if events[-1]["event_type"] != "SESSION_TERMINATED":
            raise RuntimeFailure("result exists without a terminal journal event")
        if result["status"] != events[-1]["payload"]["status"]:
            raise RuntimeFailure("result status differs from terminal journal event")
        terminal_payload = events[-1]["payload"]
        expected_fields = {
            "reason": terminal_payload["reason"],
            "work_completed": projection["work_completed"],
            "outcome_evidence": projection["outcome_evidence"],
            "observations": projection["observations"],
            "usage": projection["usage"],
            "cleanup": terminal_payload["cleanup"],
            "unresolved_risk": terminal_payload["unresolved_risk"],
            "final_actor_state": projection["actor_state"],
        }
        for field, expected in expected_fields.items():
            if result[field] != expected:
                raise RuntimeFailure(f"result {field} differs from frozen journal projection")
        if result.get("next_safe_action") != terminal_payload.get("next_safe_action"):
            raise RuntimeFailure("result next_safe_action differs from terminal journal event")
        result_status = "PASS"
    return {
        "verification": "PASS",
        "run_id": contract["run_id"],
        "events": len(events),
        "event_tail_digest": events[-1]["event_digest"],
        "runtime_status": projection["status"],
        "result": result_status,
    }


def parse_json_object(value: str, label: str) -> dict[str, Any]:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as error:
        raise RuntimeFailure(f"{label} is invalid JSON: {error}") from error
    if not isinstance(parsed, dict):
        raise RuntimeFailure(f"{label} must be a JSON object")
    return parsed


def parse_json_list(value: str, label: str) -> list[Any]:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as error:
        raise RuntimeFailure(f"{label} is invalid JSON: {error}") from error
    if not isinstance(parsed, list):
        raise RuntimeFailure(f"{label} must be a JSON array")
    return parsed


def parse_bindings(values: list[str]) -> dict[str, str]:
    bindings: dict[str, str] = {}
    for value in values:
        capability, separator, tool_identity = value.partition("=")
        if not separator or not capability.strip() or not tool_identity.strip():
            raise RuntimeFailure("binding must use <capability>=<exact-host-tool-identity>")
        capability = capability.strip()
        if capability in bindings:
            raise RuntimeFailure(f"duplicate host binding: {capability}")
        bindings[capability] = tool_identity.strip()
    return bindings


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)

    start = commands.add_parser("start")
    start.add_argument("--simulation", required=True, type=Path)
    start.add_argument("--adapter", required=True, type=Path)
    start.add_argument("--run-dir", required=True, type=Path)
    start.add_argument("--run-id", required=True)
    start.add_argument("--binding", action="append", default=[])

    status = commands.add_parser("status")
    status.add_argument("--run-dir", required=True, type=Path)

    authorize = commands.add_parser("authorize")
    authorize.add_argument("--run-dir", required=True, type=Path)
    authorize.add_argument("--action", required=True)
    authorize.add_argument("--input-json", default="{}")
    authorize.add_argument("--confirmed", action="store_true")
    authorize.add_argument("--idempotency-key")
    authorize.add_argument("--expected-tool-calls", type=int, default=1)

    record = commands.add_parser("record")
    record.add_argument("--run-dir", required=True, type=Path)
    record.add_argument("--dispatch-token", required=True)
    record.add_argument("--outcome", choices=sorted(STEP_OUTCOMES), required=True)
    record.add_argument("--observation-name", required=True)
    record.add_argument("--observation", required=True)
    record.add_argument("--evidence-json", default="[]")
    record.add_argument("--actor-state-json")
    record.add_argument("--state-transition")
    record.add_argument("--state-evidence")
    record.add_argument("--duration-seconds", type=float, default=0)

    finish = commands.add_parser("finish")
    finish.add_argument("--run-dir", required=True, type=Path)
    finish.add_argument("--status", choices=sorted(TERMINAL_STATUSES), required=True)
    finish.add_argument("--reason", required=True)
    finish.add_argument("--cleanup-status", choices=sorted(CLEANUP_STATUSES), required=True)
    finish.add_argument("--cleanup-details", default="")
    finish.add_argument("--unresolved-risk", action="append", default=[])
    finish.add_argument("--next-safe-action")

    verify = commands.add_parser("verify")
    verify.add_argument("--run-dir", required=True, type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "start":
            result = start_run(
                args.simulation,
                args.adapter,
                args.run_dir,
                args.run_id,
                parse_bindings(args.binding),
            )
        elif args.command == "status":
            result = run_status(args.run_dir)
        elif args.command == "authorize":
            result = authorize_action(
                args.run_dir,
                args.action,
                parse_json_object(args.input_json, "action input"),
                args.confirmed,
                args.idempotency_key,
                args.expected_tool_calls,
            )
        elif args.command == "record":
            result = record_action(
                args.run_dir,
                args.dispatch_token,
                args.outcome,
                args.observation_name,
                args.observation,
                parse_json_list(args.evidence_json, "evidence"),
                args.duration_seconds,
                parse_json_object(args.actor_state_json, "actor state")
                if args.actor_state_json is not None
                else None,
                args.state_transition,
                args.state_evidence,
            )
        elif args.command == "finish":
            result = finish_run(
                args.run_dir,
                args.status,
                args.reason,
                args.cleanup_status,
                args.cleanup_details,
                args.unresolved_risk,
                args.next_safe_action,
            )
        else:
            result = verify_run(args.run_dir)
    except (RuntimeFailure, ValidationFailure, OSError, KeyError, TypeError) as error:
        print(f"simulation_runtime_status=FAIL reason={error}", file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
