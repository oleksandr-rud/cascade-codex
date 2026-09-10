---
name: design-agent-workflow
description: Design or audit the executable behavior flow for an AI agent or agentic system, including act-observe-update loops, explicit state, deterministic routing, typed handoffs, recovery, budgets, and stop rules. Use when an agent blueprint needs a workflow contract, when multi-agent orchestration or delegation must be made reviewable, or when an existing agent loop is incomplete, unsafe, or prone to cycling.
---

# Design Agent Workflow

Turn a capability map and agent blueprint into a reviewable workflow contract. Define behavior; do not dispatch agents, call target tools, or mutate a runtime.

## Inputs

Collect:

- capability clusters and their success oracles;
- selected topology and role ownership;
- authoritative inputs, state owner, tools, permissions, and confirmation rules;
- output contract, failure constraints, and evaluation requirements;
- hard limits for time, turns, tokens, tools, retries, delegation, and cost.

Mark missing material authority as `GAP`. Ask only questions whose answers can change routing, permissions, completion, or topology. Do not fill those gaps with plausible defaults.

## Design procedure

When dependencies, branches or joins make execution structure material, use
[graph workflow authoring](../design-agent-blueprint/references/graph-workflow-authoring.md).
Recommend it only for a concrete boundary benefit; bind each step's context and
prompt handoff along with its routes. Static/dynamic choice, branch membership,
join failure behavior and admission remain explicit target decisions.

Only when the user explicitly requests the Analyzer–Policy Engine–Composer
family (including `schema-values-text@1`) or an accepted target architecture
already adopts it, read [the stateful-agent profile](references/stateful-agent-profile.md).
A generic agent, tool, memory, or conversational request does not select this profile.

1. Start from the smallest loop that can complete the goal:
   `accept -> assemble context -> select next action -> authorize -> act -> observe -> validate -> update state -> complete or recover`.
2. Name every durable state, event, and transition. Keep application state in the harness or target system, not only in prompt history.
3. For each route, specify its condition, priority, decision owner, destination, and fallback. Make permission, schema, budget, and known state checks deterministic; reserve model judgment for semantic choices.
4. Add parallel branches only when they are independent, read-safe, and have a deterministic merge owner. Serialize conflicting writes.
5. Add a typed handoff only when responsibility transfers. Include goal, accepted inputs, evidence references, completed work, current state, unresolved risks, allowed tools, expected output, success oracle, timeout, return, and escalation routes.
6. Classify failures and bind each to one bounded response: retry, alternate path, compensate, request input, escalate, or stop. Never use an unbounded retry or reflection loop.
7. Define completion from observable state or evidence. Add stops for success, user cancellation, unsafe action, missing authority, policy denial, exhausted budget, repeated-state cycling, and unrecoverable failure.
8. Trace state transitions, route decisions, tool attempts, observations, handoffs, budget usage, failures, and terminal reason with sensitive-data redaction.

## Required contract

Use [assets/workflow.yaml](assets/workflow.yaml) as the candidate artifact. Also produce a concise diagram or narrative for human review when the flow is not obvious.

The workflow must include:

- entry conditions and accepted inputs;
- terminal outcomes including `COMPLETED`, `BLOCKED`, `CANCELLED`, `BUDGET_EXHAUSTED`, and `FAILED`;
- loop phases with preconditions, actions, observations, postconditions, and next routes;
- state definitions and the authoritative state owner;
- routing table with deterministic versus model-controlled decisions;
- concurrency, ordering, idempotency, and merge rules;
- handoff packets and ownership transfer rules;
- failure taxonomy, retry ceilings, backoff, recovery, and escalation;
- numeric time, turn, tool, token, cost, retry, and delegation budgets, or an explicit `GAP` for each material unknown;
- loop detection and stop rules;
- trace events and workflow-level evaluation assertions.

## Review gates

Reject or mark `GAP` when:

- a route has no exclusive condition or fallback;
- two roles can mutate the same state without serialization and one merge owner;
- a handoff omits success, return, timeout, or escalation behavior;
- a retry, delegation, reflection, or evaluator loop lacks a hard ceiling;
- completion depends only on an agent saying it is done;
- a state-changing action lacks permission and confirmation policy;
- a terminal condition cannot be distinguished in evidence.

Return the workflow as a versioned `CANDIDATE`. Registration, runtime wiring, and execution require separate authorization.

Keep the user-facing answer concise. Output requirements specify information,
not extra headings. Preserve required schemas, evidence and permissions. Avoid
duplicate artifact prose, empty sections, unsolicited variants and extra files
unless needed for the requested delivery or an actual handoff.
