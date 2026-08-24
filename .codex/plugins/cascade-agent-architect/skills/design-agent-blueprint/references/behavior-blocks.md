# Complete behavior blocks

Define every block at system level and refine it for each agent where behavior differs.

1. **Objective:** represented users, measurable objective, non-goals, autonomy, risk, and completion.
2. **Input contract:** accepted types, source authority, conflict and ambiguity policy, validation, and prompt-injection boundary.
3. **Output contract:** schema, final owner, destinations, observable completion, partial-result behavior, and provenance.
4. **Loop:** act-observe-update sequence, planning policy, turn/time/tool/token/cost budgets, and stop conditions.
5. **State:** explicit states and transitions, durable owner, invariants, concurrency, idempotency, and recovery checkpoints.
6. **Context:** assembly order, relevance selection, retrieval, freshness, compaction, rehydration, and untrusted-content treatment.
7. **Memory:** working, episodic, and durable memory; provenance, retention, invalidation, conflict resolution, privacy, and write authority.
8. **Tools:** typed interfaces, adapter contour, effect class, errors, timeouts, retry/idempotency, permissions, confirmation, and least privilege.
9. **Skills and prompts:** focused capability package, trigger, dependencies, target model capability envelope, variables, schemas, and prompt tests.
10. **Roles and handoffs:** one owner per capability and final output; contributor scope, delegation packet, merge authority, timeout, return, and escalation.
11. **Failure behavior:** taxonomy, retry limit, alternatives, partial-result rules, recovery owner, escalation, and terminal stop.
12. **Observability:** trace identity, version/digests, structured events, tool receipts, usage, latency, cost, redaction, and operational alerts.
13. **Evaluation:** mechanical gates, task/outcome/trajectory/safety/regression cases, independent judge authority, thresholds, variance, and `NOT_RUN` handling.
14. **Lifecycle:** rollout stages, shadowing, feature gates, migration, rollback, version compatibility, evidence invalidation, and retirement.

## Handoff packet

A handoff contains only typed, task-relevant state: goal, accepted inputs, source references, completed work, current state, unresolved decisions, allowed tools and permissions, expected output, oracle, timeout, return, and escalation route. The harness remains the authoritative state owner; prompt history is not a durable database.

## Topology evidence

For each topology candidate, record benefits, cost, additional failure surfaces, context/tool boundary, evaluator, and evidence. Select the least complex candidate that covers the capabilities. A manager-worker split is appropriate only when specialists perform bounded independently checkable work and the manager owns integration. A decentralized handoff is appropriate only when control and user-facing responsibility genuinely transfer. An evaluator-optimizer loop requires a fixed oracle, finite candidate budget, protected evaluation data, and a non-self-authorizing promotion path.
