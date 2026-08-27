#!/usr/bin/env python3
"""Validate a Cascade Project Management artifact and its invariants."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
from typing import Any

from jsonschema import Draft202012Validator


SKILL_KINDS = {
    "define-work-item": {"WORK_ITEM_DEFINITION"},
    "plan-project": {"PROJECT_PLAN", "AGILE_DELIVERY_PLAN"},
    "manage-project": {"PROJECT_STATUS", "RECONCILIATION"},
    "close-project": {"CLOSEOUT"},
}


def canonical_capability_owner(value: str) -> bool:
    return value == "target-host" or value.startswith("target-host:") or (
        value.startswith("cascade-") and ":" in value
    )


def owner_is_grounded(value: Any, current_source_identities: list[str]) -> bool:
    if value is None:
        return True
    owner = str(value).strip().casefold()
    if not owner:
        return False
    if canonical_capability_owner(owner):
        return True
    return any(owner in identity for identity in current_source_identities)


def source_is_state_bearing(source: dict[str, Any]) -> bool:
    identity = str(source.get("identity", "")).strip().casefold()
    if canonical_capability_owner(identity):
        return False
    descriptor = " ".join(
        str(source.get(field, "")).strip().casefold()
        for field in ("kind", "identity")
    )
    descriptive_tokens = (
        "owner",
        "authority",
        "instruction",
        "request",
        "untrusted",
        "unsafe",
        "claim",
        "label",
        "title",
        "candidate",
    )
    return not any(token in descriptor for token in descriptive_tokens)


def strict_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=strict_object)


def dependency_graph_errors(items: list[dict[str, Any]], label: str) -> list[str]:
    errors: list[str] = []
    item_ids = [item.get("id") for item in items]
    if len(item_ids) != len(set(item_ids)):
        errors.append(f"{label} IDs must be unique")
    item_id_set = set(item_ids)
    graph: dict[str, set[str]] = {}
    for item in items:
        item_id = item.get("id")
        dependencies = set(item.get("depends_on", []))
        unknown = sorted(dependencies - item_id_set)
        if unknown:
            errors.append(f"{item_id} references unknown {label} dependencies: {unknown}")
        if item_id in dependencies:
            errors.append(f"{item_id} cannot depend on itself")
        graph[str(item_id)] = dependencies & item_id_set

    visiting: set[str] = set()
    visited: set[str] = set()
    cycle_found = False

    def visit(node: str) -> None:
        nonlocal cycle_found
        if node in visiting:
            cycle_found = True
            return
        if node in visited:
            return
        visiting.add(node)
        for dependency in graph.get(node, set()):
            visit(dependency)
        visiting.remove(node)
        visited.add(node)

    for node in graph:
        visit(node)
    if cycle_found:
        errors.append(f"{label} dependency graph contains a cycle")
    return errors


def agile_delivery_errors(artifact: dict[str, Any]) -> tuple[list[str], list[tuple[str, Any]]]:
    errors: list[str] = []
    owner_fields: list[tuple[str, Any]] = []
    agile = artifact.get("agile_delivery")
    if not isinstance(agile, dict):
        return ["AGILE_DELIVERY_PLAN requires agile_delivery details"], owner_fields
    if artifact.get("work_items"):
        errors.append("AGILE_DELIVERY_PLAN keeps work_items empty; versions, iterations, stories, and tasks are canonical")
    if artifact.get("status") not in {"PROPOSED", "READY", "BLOCKED", "GAP"}:
        errors.append("AGILE_DELIVERY_PLAN status must be PROPOSED, READY, BLOCKED, or GAP")

    versions = [item for item in agile.get("versions", []) if isinstance(item, dict)]
    iterations = [item for item in agile.get("iterations", []) if isinstance(item, dict)]
    stories = [item for item in agile.get("stories", []) if isinstance(item, dict)]
    tasks = [item for item in agile.get("tasks", []) if isinstance(item, dict)]

    version_ids = [item.get("id") for item in versions]
    iteration_ids = [item.get("id") for item in iterations]
    story_ids = [item.get("id") for item in stories]
    task_ids = [item.get("id") for item in tasks]
    for label, identifiers in (
        ("version", version_ids),
        ("iteration", iteration_ids),
        ("story", story_ids),
        ("task", task_ids),
    ):
        if len(identifiers) != len(set(identifiers)):
            errors.append(f"agile {label} IDs must be unique")

    version_id_set = set(version_ids)
    iteration_id_set = set(iteration_ids)
    story_id_set = set(story_ids)
    mvp_version_id = agile.get("mvp_version_id")
    mvp_versions = [item for item in versions if item.get("stage") == "MVP"]
    if artifact.get("status") != "GAP":
        if len(mvp_versions) != 1:
            errors.append("actionable AGILE_DELIVERY_PLAN requires exactly one MVP version")
        if mvp_version_id not in version_id_set:
            errors.append("mvp_version_id must reference one version")
        if len(mvp_versions) == 1 and mvp_versions[0].get("id") != mvp_version_id:
            errors.append("mvp_version_id must identify the version whose stage is MVP")
    elif mvp_version_id is not None and mvp_version_id not in version_id_set:
        errors.append("mvp_version_id must be null or reference one version")

    version_sequences = [item.get("sequence") for item in versions]
    if len(version_sequences) != len(set(version_sequences)):
        errors.append("agile version sequences must be unique")
    for version in versions:
        version_id = version.get("id")
        if version.get("stage") == "MVP":
            if version.get("sequence") != 1:
                errors.append(f"{version_id}: the MVP version must have sequence 1")
        else:
            if version.get("state") != "PROPOSED":
                errors.append(f"{version_id}: later versions remain PROPOSED until promoted")
            if not version.get("promotion_condition"):
                errors.append(f"{version_id}: later versions require a promotion_condition")

    iteration_sequences: set[tuple[Any, Any]] = set()
    for iteration in iterations:
        iteration_id = iteration.get("id")
        version_id = iteration.get("version_id")
        if version_id not in version_id_set:
            errors.append(f"{iteration_id} references unknown version_id {version_id}")
        sequence_key = (version_id, iteration.get("sequence"))
        if sequence_key in iteration_sequences:
            errors.append(f"{version_id}: iteration sequences must be unique within one version")
        iteration_sequences.add(sequence_key)

    for story in stories:
        story_id = story.get("id")
        if story.get("iteration_id") not in iteration_id_set:
            errors.append(f"{story_id} references unknown iteration_id {story.get('iteration_id')}")
        if story.get("kind") == "USER_STORY" and not all(story.get(field) for field in ("actor", "need", "value")):
            errors.append(f"{story_id}: USER_STORY requires actor, need, and value")
    errors.extend(dependency_graph_errors(stories, "story"))

    for task in tasks:
        task_id = task.get("id")
        if task.get("story_id") not in story_id_set:
            errors.append(f"{task_id} references unknown story_id {task.get('story_id')}")
        owner_fields.append((f"agile_delivery.tasks[{task_id}].owner", task.get("owner")))
    errors.extend(dependency_graph_errors(tasks, "task"))

    mvp_iterations = [item for item in iterations if item.get("version_id") == mvp_version_id]
    first_iteration = min(mvp_iterations, key=lambda item: item.get("sequence", 0), default=None)
    first_iteration_id = first_iteration.get("id") if first_iteration else None
    if artifact.get("status") != "GAP" and first_iteration is None:
        errors.append("actionable AGILE_DELIVERY_PLAN requires at least one MVP iteration")
    if first_iteration is not None and first_iteration.get("sequence") != 1:
        errors.append(f"{first_iteration_id}: the first MVP iteration must have sequence 1")

    first_story_ids = {
        item.get("id") for item in stories if item.get("iteration_id") == first_iteration_id
    }
    first_task_ids = {
        item.get("id") for item in tasks if item.get("story_id") in first_story_ids
    }
    for iteration in iterations:
        if iteration.get("id") != first_iteration_id and iteration.get("state") != "PROPOSED":
            errors.append(f"{iteration.get('id')}: only the first MVP iteration may be READY or BLOCKED")
    for story in stories:
        if story.get("id") not in first_story_ids and story.get("state") != "PROPOSED":
            errors.append(f"{story.get('id')}: future stories remain PROPOSED")
    for task in tasks:
        if task.get("id") not in first_task_ids and task.get("state") != "PROPOSED":
            errors.append(f"{task.get('id')}: future tasks remain PROPOSED")

    if artifact.get("status") == "READY":
        known_source_refs: set[str] = set()
        for source in artifact.get("sources", []):
            if not isinstance(source, dict):
                continue
            source_id = source.get("source_id")
            identity = source.get("identity")
            digest = source.get("digest")
            if source.get("status") != "CURRENT":
                continue
            if source_id:
                known_source_refs.add(str(source_id))
            if identity and digest:
                known_source_refs.add(f"{identity}@{digest}")
        mvp_version = mvp_versions[0] if len(mvp_versions) == 1 else None
        if mvp_version is None or mvp_version.get("state") != "READY":
            errors.append("READY AGILE_DELIVERY_PLAN requires a READY MVP version")
        if mvp_version is not None and not mvp_version.get("acceptance_refs"):
            errors.append("READY AGILE_DELIVERY_PLAN requires MVP acceptance_refs")
        if first_iteration is None or first_iteration.get("state") != "READY":
            errors.append("READY AGILE_DELIVERY_PLAN requires a READY first MVP iteration")
        if first_iteration is not None and not first_iteration.get("capacity_ref"):
            errors.append("READY AGILE_DELIVERY_PLAN requires current capacity_ref for the first MVP iteration")
        if first_iteration is not None and first_iteration.get("capacity_ref") not in known_source_refs:
            errors.append("READY AGILE_DELIVERY_PLAN capacity_ref must identify a current source or digest-qualified artifact")
        if first_iteration is not None and not first_iteration.get("acceptance_refs"):
            errors.append("READY AGILE_DELIVERY_PLAN requires first-iteration acceptance_refs")
        first_stories = [item for item in stories if item.get("id") in first_story_ids]
        if not any(item.get("kind") == "USER_STORY" for item in first_stories):
            errors.append("READY AGILE_DELIVERY_PLAN requires a vertical USER_STORY in the first MVP iteration")
        for story in first_stories:
            story_id = story.get("id")
            if story.get("state") != "READY":
                errors.append(f"{story_id}: first-iteration stories must be READY")
            if not story.get("acceptance_refs"):
                errors.append(f"{story_id}: READY story requires acceptance_refs")
            story_tasks = [item for item in tasks if item.get("story_id") == story_id]
            if not story_tasks:
                errors.append(f"{story_id}: first-iteration story requires at least one task")
            for task in story_tasks:
                task_id = task.get("id")
                if task.get("state") != "READY":
                    errors.append(f"{task_id}: first-iteration tasks must be READY")
                if not task.get("owner"):
                    errors.append(f"{task_id}: READY task requires a grounded owner")
                if not task.get("acceptance_ref"):
                    errors.append(f"{task_id}: READY task requires acceptance_ref")
        acceptance_refs = []
        if mvp_version is not None:
            acceptance_refs.extend(mvp_version.get("acceptance_refs", []))
        if first_iteration is not None:
            acceptance_refs.extend(first_iteration.get("acceptance_refs", []))
        for story in first_stories:
            acceptance_refs.extend(story.get("acceptance_refs", []))
        acceptance_refs.extend(
            task.get("acceptance_ref")
            for task in tasks
            if task.get("id") in first_task_ids and task.get("acceptance_ref")
        )
        for ref in sorted(set(acceptance_refs)):
            if ref not in known_source_refs:
                errors.append(f"READY AGILE_DELIVERY_PLAN acceptance reference {ref} must identify a current source or digest-qualified artifact")
    return errors, owner_fields


def cross_field_errors(artifact: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    selected = artifact.get("selected_skill")
    kind = artifact.get("artifact_kind")
    if kind not in SKILL_KINDS.get(selected, set()):
        errors.append("selected_skill does not own artifact_kind")

    source_ids = [item.get("source_id") for item in artifact.get("sources", []) if isinstance(item, dict)]
    if len(source_ids) != len(set(source_ids)):
        errors.append("source_id values must be unique")
    current_source_identities = [
        str(item.get("identity", "")).strip().casefold()
        for item in artifact.get("sources", [])
        if isinstance(item, dict) and item.get("status") == "CURRENT"
    ]
    undigested_identity_to_id = {
        str(item.get("identity")): str(item.get("source_id"))
        for item in artifact.get("sources", [])
        if isinstance(item, dict) and not item.get("digest")
    }
    for item in artifact.get("sources", []):
        if (
            isinstance(item, dict)
            and item.get("status") == "CURRENT"
            and source_is_state_bearing(item)
            and not item.get("digest")
        ):
            errors.append(f"current state-bearing source {item.get('source_id')} requires an immutable digest")

    owner_fields: list[tuple[str, Any]] = [
        ("subject.decision_owner", artifact.get("subject", {}).get("decision_owner"))
    ]

    if kind == "AGILE_DELIVERY_PLAN":
        agile_errors, agile_owners = agile_delivery_errors(artifact)
        errors.extend(agile_errors)
        owner_fields.extend(agile_owners)
    elif "agile_delivery" in artifact:
        errors.append("agile_delivery details are allowed only for AGILE_DELIVERY_PLAN")

    work_items = [item for item in artifact.get("work_items", []) if isinstance(item, dict)]
    work_ids = [item.get("id") for item in work_items]
    if len(work_ids) != len(set(work_ids)):
        errors.append("work item IDs must be unique")
    work_id_set = set(work_ids)
    graph: dict[str, set[str]] = {}
    for item in work_items:
        item_id = item.get("id")
        owner_fields.append((f"work_items[{item_id}].owner", item.get("owner")))
        next_action = item.get("next_action", {})
        if isinstance(next_action, dict):
            owner_fields.append((f"work_items[{item_id}].next_action.owner", next_action.get("owner")))
        dependencies = set(item.get("depends_on", []))
        unknown = sorted(dependencies - work_id_set)
        if unknown:
            errors.append(f"{item_id} references unknown dependencies: {unknown}")
        if item_id in dependencies:
            errors.append(f"{item_id} cannot depend on itself")
        graph[str(item_id)] = dependencies & work_id_set
        if item.get("horizon") != "FIRST" and item.get("state") == "ACTIVE":
            errors.append(f"{item_id}: only FIRST work may be ACTIVE")
        if item.get("state") == "COMPLETE" and not item.get("acceptance_ref"):
            errors.append(f"{item_id}: COMPLETE work requires acceptance_ref")

    definition = artifact.get("work_item_definition")
    if kind == "WORK_ITEM_DEFINITION":
        if not isinstance(definition, dict):
            errors.append("WORK_ITEM_DEFINITION requires work_item_definition details")
        else:
            owner_fields.append(("work_item_definition.owner_hint", definition.get("owner_hint")))
            if len(work_items) != 1:
                errors.append("WORK_ITEM_DEFINITION requires exactly one summary work item")
            elif work_items[0].get("id") != definition.get("id"):
                errors.append("work_item_definition.id must match the summary work item ID")
            if any(item.get("depends_on") for item in work_items):
                errors.append("WORK_ITEM_DEFINITION cannot create graph-local dependencies")
            if artifact.get("status") not in {"READY", "GAP", "BLOCKED"}:
                errors.append("WORK_ITEM_DEFINITION status must be READY, GAP, or BLOCKED")
            if artifact.get("status") == "READY":
                if definition.get("filing_status") != "CANDIDATE":
                    errors.append("READY WORK_ITEM_DEFINITION requires CANDIDATE filing_status")
                if not work_items or work_items[0].get("state") != "READY":
                    errors.append("READY WORK_ITEM_DEFINITION requires a READY summary work item")
                if work_items:
                    next_action = work_items[0].get("next_action", {})
                    if (
                        next_action.get("owner") != "target-host"
                        or not next_action.get("adapter_id")
                        or next_action.get("input_ref") != artifact.get("artifact_id")
                    ):
                        errors.append(
                            "READY WORK_ITEM_DEFINITION requires a closed target-host next_action bound to artifact_id"
                        )
                candidate_handoffs = [
                    handoff
                    for handoff in artifact.get("handoffs", [])
                    if isinstance(handoff, dict)
                    and handoff.get("route") == "target-host"
                    and handoff.get("status") in {"OPTIONAL", "REQUIRED"}
                    and artifact.get("artifact_id") in handoff.get("input_refs", [])
                ]
                if not candidate_handoffs:
                    errors.append(
                        "READY WORK_ITEM_DEFINITION requires an authority-gated target-host candidate handoff"
                    )
                if not definition.get("evidence_refs"):
                    errors.append("READY WORK_ITEM_DEFINITION requires inspectable evidence_refs")
                if not definition.get("acceptance_criteria"):
                    errors.append("READY WORK_ITEM_DEFINITION requires acceptance_criteria")
                if definition.get("item_type") in {"BUG", "ISSUE"} and (
                    not definition.get("expected_behavior") or not definition.get("actual_behavior")
                ):
                    errors.append("READY BUG or ISSUE requires expected_behavior and actual_behavior")
                if definition.get("item_type") == "STORY" and any(
                    not definition.get(field) for field in ("actor", "need", "value")
                ):
                    errors.append("READY STORY requires actor, need, and value")
                known_evidence_refs = {
                    str(source.get("source_id"))
                    for source in artifact.get("sources", [])
                    if isinstance(source, dict) and source.get("status") == "CURRENT"
                }
                known_evidence_refs.update(
                    f"{source.get('identity')}@{source.get('digest')}"
                    for source in artifact.get("sources", [])
                    if isinstance(source, dict)
                    and source.get("status") == "CURRENT"
                    and source.get("identity")
                    and source.get("digest")
                )
                unknown_evidence = sorted(
                    set(definition.get("evidence_refs", [])) - known_evidence_refs
                )
                if unknown_evidence:
                    errors.append(
                        f"READY WORK_ITEM_DEFINITION has unknown evidence_refs: {unknown_evidence}"
                    )
            elif definition.get("filing_status") != "BLOCKED":
                errors.append("non-ready WORK_ITEM_DEFINITION requires BLOCKED filing_status")
    elif "work_item_definition" in artifact:
        errors.append("work_item_definition details are allowed only for WORK_ITEM_DEFINITION")

    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(node: str) -> None:
        if node in visiting:
            errors.append("work item dependency graph contains a cycle")
            return
        if node in visited:
            return
        visiting.add(node)
        for dependency in graph.get(node, set()):
            visit(dependency)
        visiting.remove(node)
        visited.add(node)

    for node in graph:
        visit(node)

    if kind == "PROJECT_STATUS" and artifact.get("status") != "BLOCKED" and any(
        item.get("horizon") == "FIRST" and item.get("state") == "BLOCKED"
        for item in work_items
    ):
        errors.append("PROJECT_STATUS must be BLOCKED when a required FIRST work item is BLOCKED")

    if artifact.get("status") in {"READY", "ACTIVE", "COMPLETE"} and kind != "RECONCILIATION":
        bad_sources = [source_id for source_id, item in zip(source_ids, artifact.get("sources", [])) if item.get("status") in {"MISSING", "CONFLICTING"}]
        if bad_sources:
            errors.append(f"passing project status cannot depend on missing or conflicting sources: {bad_sources}")

    if kind == "PROJECT_PLAN" and artifact.get("status") in {"PROPOSED", "READY", "ACTIVE", "COMPLETE"} and not work_items:
        errors.append("actionable PROJECT_PLAN requires at least one lean work item")
    if kind == "PROJECT_PLAN" and artifact.get("status") == "READY" and any(
        item.get("horizon") == "FIRST" and not item.get("owner") for item in work_items
    ):
        errors.append("READY PROJECT_PLAN requires a grounded owner for every FIRST work item")
    if kind in {"PROJECT_PLAN", "AGILE_DELIVERY_PLAN"} and artifact.get("status") == "READY" and not artifact.get("subject", {}).get("decision_owner"):
        errors.append(f"READY {kind} requires a grounded decision owner")
    if kind == "RECONCILIATION" and not artifact.get("reconciliation"):
        errors.append("RECONCILIATION requires reconciliation details")
    if kind != "RECONCILIATION" and "reconciliation" in artifact:
        errors.append("reconciliation details are allowed only for RECONCILIATION")
    if kind == "CLOSEOUT" and not artifact.get("closeout"):
        errors.append("CLOSEOUT requires closeout details")
    if kind == "CLOSEOUT" and artifact.get("status") not in {"BLOCKED", "GAP", "COMPLETE", "SUPERSEDED"}:
        errors.append("CLOSEOUT status must be BLOCKED, GAP, COMPLETE, or SUPERSEDED")
    if kind != "CLOSEOUT" and "closeout" in artifact:
        errors.append("closeout details are allowed only for CLOSEOUT")
    if kind == "CLOSEOUT" and artifact.get("status") == "COMPLETE" and not artifact.get("subject", {}).get("decision_owner"):
        errors.append("COMPLETE CLOSEOUT requires a source-bound acceptance authority")

    closeout = artifact.get("closeout", {})
    if isinstance(closeout, dict) and closeout:
        criteria = closeout.get("criteria", [])
        nonpassing = [item for item in criteria if item.get("status") != "PASS"]
        all_pass_terminal = bool(criteria) and not nonpassing and not closeout.get("blockers") and closeout.get("completion_status") != "SUPERSEDED"
        if all_pass_terminal and closeout.get("completion_status") != "PASS":
            errors.append("all-pass closeout criteria require PASS completion")
        if all_pass_terminal and artifact.get("status") != "COMPLETE":
            errors.append("all-pass closeout criteria require top-level COMPLETE status")
        if closeout.get("completion_status") == "PASS" and nonpassing:
            errors.append("PASS closeout cannot contain non-passing required criteria")
        if closeout.get("completion_status") == "PASS" and artifact.get("status") != "COMPLETE":
            errors.append("PASS closeout requires top-level COMPLETE status")
        if artifact.get("status") == "COMPLETE" and closeout.get("completion_status") != "PASS":
            errors.append("top-level COMPLETE requires PASS closeout completion")
        if closeout.get("retention_action") == "RETIRE_PROPOSED":
            if closeout.get("completion_status") not in {"PASS", "SUPERSEDED"}:
                errors.append("RETIRE_PROPOSED requires PASS or SUPERSEDED completion")
            if closeout.get("blockers"):
                errors.append("RETIRE_PROPOSED cannot retain unresolved blockers")

    for index, risk in enumerate(artifact.get("risks", [])):
        if isinstance(risk, dict):
            owner_fields.append((f"risks[{index}].owner", risk.get("owner")))
    for index, decision in enumerate(artifact.get("decisions", [])):
        if isinstance(decision, dict):
            owner_fields.append((f"decisions[{index}].owner", decision.get("owner")))
            source_ref = decision.get("source_ref")
            if source_ref is not None and source_ref not in source_ids:
                errors.append(f"decisions[{index}].source_ref must be one known source_id")

    if kind in {"PROJECT_PLAN", "AGILE_DELIVERY_PLAN"} and artifact.get("status") == "READY":
        decisions = [item for item in artifact.get("decisions", []) if isinstance(item, dict)]
        all_artifact_refs = {
            str(ref)
            for item in work_items
            for ref in item.get("artifact_refs", [])
        }
        agile = artifact.get("agile_delivery", {})
        if isinstance(agile, dict):
            all_artifact_refs.update(
                str(ref)
                for collection in (agile.get("versions", []), agile.get("stories", []))
                for item in collection
                if isinstance(item, dict)
                for ref in item.get("artifact_refs", [])
            )
        for source in artifact.get("sources", []):
            if not isinstance(source, dict):
                continue
            if source.get("status") != "CURRENT" or "dependency" not in str(source.get("kind", "")).casefold():
                continue
            identity = str(source.get("identity", ""))
            digest = source.get("digest")
            qualified_identity = f"{identity}@{digest}" if digest else identity
            if qualified_identity not in all_artifact_refs:
                errors.append(
                    f"READY {kind} must reference external dependency {qualified_identity} in artifact_refs"
                )
            if not any(
                decision.get("status") == "DECIDED"
                and decision.get("decision")
                and decision.get("source_ref") == source.get("source_id")
                for decision in decisions
            ):
                errors.append(
                    f"READY {kind} requires a source-bound satisfaction decision for external dependency {source.get('source_id')}"
                )

    for index, handoff in enumerate(artifact.get("handoffs", [])):
        if not isinstance(handoff, dict):
            continue
        route = str(handoff.get("route", ""))
        owner_fields.append((f"handoffs[{index}].route", route))
        for ref in handoff.get("input_refs", []):
            if ref in undigested_identity_to_id and ref != undigested_identity_to_id[ref]:
                errors.append(f"handoffs[{index}].input_refs must use source_id for undigested source {undigested_identity_to_id[ref]}")
        agile = artifact.get("agile_delivery", {})
        agile_acceptance = any(
            item.get("acceptance_refs")
            for item in agile.get("stories", [])
            if isinstance(agile, dict) and isinstance(item, dict)
        ) if isinstance(agile, dict) else False
        if route == "cascade-qa:plan-quality" and not any(item.get("acceptance_ref") for item in work_items) and not agile_acceptance:
            errors.append("QA planning handoff requires an acceptance or quality reference")
        if route == "cascade-qa:plan-quality" and any(
            isinstance(source, dict)
            and source.get("status") == "CURRENT"
            and source.get("digest")
            and "quality-gate" in str(source.get("kind", "")).casefold()
            for source in artifact.get("sources", [])
        ):
            errors.append("QA planning handoff is redundant when a current digest-bound quality gate already defines scope")

    closeout_refs: list[str] = []
    if isinstance(closeout, dict):
        closeout_refs.extend(closeout.get("evidence_refs", []))
        for criterion in closeout.get("criteria", []):
            if isinstance(criterion, dict):
                closeout_refs.extend(criterion.get("evidence_refs", []))
    for ref in closeout_refs:
        if ref in undigested_identity_to_id and ref != undigested_identity_to_id[ref]:
            errors.append(f"closeout evidence must use source_id for undigested source {undigested_identity_to_id[ref]}")

    for field, owner in owner_fields:
        if not owner_is_grounded(owner, current_source_identities):
            errors.append(f"{field} must be a current source-bound owner or canonical capability route")
    return sorted(set(errors))


def validate_artifact(schema: dict[str, Any], artifact: dict[str, Any]) -> list[str]:
    errors = [
        f"schema {'.'.join(str(item) for item in error.absolute_path) or '<root>'}: {error.message}"
        for error in Draft202012Validator(schema).iter_errors(artifact)
    ]
    errors.extend(cross_field_errors(artifact))
    return sorted(set(errors))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("artifact", type=Path)
    parser.add_argument("--schema", type=Path, default=Path(__file__).resolve().parents[1] / "schemas" / "project-management-artifact.schema.json")
    args = parser.parse_args(argv)
    try:
        schema = read_json(args.schema)
        artifact = read_json(args.artifact)
        if not isinstance(schema, dict) or not isinstance(artifact, dict):
            raise ValueError("schema and artifact must be JSON objects")
        errors = validate_artifact(schema, artifact)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        errors = [str(error)]
    print(json.dumps({"status": "PASS" if not errors else "INVALID", "errors": errors}, indent=2))
    return 0 if not errors else 2


if __name__ == "__main__":
    sys.exit(main())
