---
name: build-agent-roles
description: Generate or audit reviewable role contracts for a single-agent or multi-agent architecture, with exclusive responsibilities, source and tool boundaries, outputs, handoffs, failure behavior, and evaluation assertions. Use when a selected topology needs target-harness agent definitions, when role ownership or mutation authority is ambiguous, or when deciding whether proposed specialist agents should be collapsed or retained. This skill does not register, spawn, or activate agents.
---

# Build Agent Roles

Compile capability clusters and the selected topology into candidate role contracts. A role is an executable responsibility boundary, not a job title or personality.

## Admission

Require a capability map, topology decision, workflow reference, and tool/permission boundaries. If they are absent, return the missing material as `GAP` and route architecture discovery back to the owning skill.

Retain a separate role only when it has an independently goal-directed and evaluable responsibility plus a material context, tool, permission, parallelism, recovery, or evaluator boundary. Collapse roles that merely mirror phases, documents, capabilities, or human departments.

## Build the contracts

1. Assign every capability to exactly one primary role. Contributors may assist, but cannot share final mutation or completion authority.
2. Assign one owner for the final system output and one merge owner for every parallel branch.
3. For each role, define mission, activation condition, owned capabilities, non-goals, accepted inputs, source authority, decisions, tools, permissions, state access, target model capability envelope, output, and observable done condition.
4. Bind the role to workflow phases and budgets. Define which errors it may recover, which it must return, and which it must escalate.
5. Define delegation and handoff packets. State whether control returns to the caller or transfers to a new user-facing owner.
6. Bind prompt, skill, trace, and evaluation references without embedding their full content.
7. Mark inferred design choices and unresolved permissions. Do not invent access, tools, or operating authority.

Use [assets/role.yaml](assets/role.yaml) once per retained role. Produce a role-boundary index that maps capability ownership, state mutation authority, handoffs, and final-output ownership across all roles.

## Contract checks

A role contract is invalid when:

- its exclusive responsibility or observable done condition is missing;
- it duplicates another role's primary capability or mutation authority;
- it can access sources, tools, memory, or permissions not justified by its work;
- it delegates without allowed targets, a typed packet, timeout, and return or escalation route;
- it can approve or evaluate its own safety-critical output without independent authority;
- its prompt history is treated as authoritative application state;
- its role exists only because an agent name was requested.

Return `CANDIDATE` role files and a boundary index. Do not write target agent registries, edit harness routing, spawn a role, or claim it is executable until the target harness validates and explicitly activates it.
