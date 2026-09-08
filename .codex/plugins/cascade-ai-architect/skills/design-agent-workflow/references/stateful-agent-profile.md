# Stateful-agent profile: design-agent-workflow

Load only for an explicitly requested or already adopted Analyzer–Policy Engine–Composer
architecture. These obligations specialize that architecture, not every agent system.
Resolve links relative to this reference; commands run from the skill directory.

For stateful conversational blueprints, consume the
[Analyzer–Policy Engine–Composer contract](../../design-agent-blueprint/references/analyzer-policy-composer.md).
Bind its delta → policy/reducer → context → canonical response path, optional
research return through analysis, and voice epoch/order rules to concrete
workflow phases. Do not substitute a direct Analyzer tool call or pass raw
deltas to a Composer. The generic loop below must preserve these boundaries.

Use [event projections and authoring rules](../../design-agent-blueprint/references/event-projections-and-context-format.md)
for checkpoint-owned processing groups, direct current-state context builders,
and optional accepted-event batches/projection cursors. Distinguish semantic replay from live
re-analysis and dispatch. Bind the configured JSON/YAML ingress gate and block-text egress gate;
state/context grouping does not require a separate persisted TurnState object.

For record-level updates and context handoffs, bind
[StateDelta, policy data, and role projections](../../design-agent-blueprint/references/state-delta-policy-projection.md):
atomic groups, registered fields, derived evaluations, per-role projection
contracts, no-op processing checkpoints, and summary coverage/invalidation.
Bind deferred-choice resolution, plan supersession, blocking/nonblocking research
and one-transaction admission to the versioned wire contracts; validate candidate
examples with the blueprint skill's contract checker.
Apply the [architecture checklist](../../design-agent-blueprint/references/architecture-best-practices.md):
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
Bind [schema/value issuance](../../design-agent-blueprint/references/executable-projections.md)
to each admitted step: `issue(request, snapshot)` then `assemble(slice, request)`,
with current host admission at both boundaries. Preserve one snapshot, schema
order, complete-input token accounting and cancellation/dispatch rechecks.
