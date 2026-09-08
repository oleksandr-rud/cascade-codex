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

For stateful conversational blueprints, consume the
[Analyzer–Policy Engine–Composer contract](../design-agent-blueprint/references/analyzer-policy-composer.md).
Bind its delta → policy/reducer → context → canonical response path, optional
research return through analysis, and voice epoch/order rules to concrete
workflow phases. Do not substitute a direct Analyzer tool call or pass raw
deltas to a Composer. The generic loop below must preserve these boundaries.

Use [event projections and authoring rules](../design-agent-blueprint/references/event-projections-and-context-format.md)
for checkpoint-owned processing groups, direct current-state context builders,
and optional accepted-event batches/projection cursors. Distinguish semantic replay from live
re-analysis and dispatch. Bind the configured JSON/YAML ingress gate and block-text egress gate;
state/context grouping does not require a separate persisted TurnState object.

For record-level updates and context handoffs, bind
[StateDelta, policy data, and role projections](../design-agent-blueprint/references/state-delta-policy-projection.md):
atomic groups, registered fields, derived evaluations, per-role projection
contracts, no-op processing checkpoints, and summary coverage/invalidation.
Bind deferred-choice resolution, plan supersession, blocking/nonblocking research
and one-transaction admission to the versioned wire contracts; validate candidate
examples with the blueprint skill's contract checker.
Apply the [architecture checklist](../design-agent-blueprint/references/architecture-best-practices.md):
stage -> current-state transaction -> Policy Engine/admission issues role/task
policy-state slice -> compiler formats issued input -> eligible dispatch; projection
failure does not undo committed state. Budget all retries, summaries, interim
messages and voice under the task limit. Bind current-dependency checks before
publication, whole-response validation or an explicit incremental-release protocol,
and channel receipt ownership. Optional status cannot close the turn; main-answer
readiness cancels queued status. Cache reuse still passes freshness/access gates.
Use ordinary handlers/processors for vertical use cases. A distinct lifecycle
does not require an event bus, generic workflow engine or separate service.
Apply the same issuance boundary before the first Analyzer call and after research,
policy or step-state changes. Frontend updates use a separate admitted client/task
slice; WebSocket transport neither selects state nor authorizes a transition.
Bind [schema/value issuance](../design-agent-blueprint/references/executable-projections.md)
to each admitted step: `issue(request, snapshot)` then `assemble(slice, request)`,
with current host admission at both boundaries. Preserve one snapshot, schema
order, complete-input token accounting and cancellation/dispatch rechecks.

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
