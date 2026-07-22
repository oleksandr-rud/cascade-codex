# Planning Completeness Checklist

Use before marking a non-atomic plan `DEFINITION_READY`, before marking it
`IMPLEMENTATION_READY`, and after material replanning.

## Knowledge Preservation

- [ ] Authoritative source IDs, paths, versions, and freshness are recorded.
- [ ] Summaries point to detailed owners instead of replacing them.
- [ ] Accepted definitions, decisions, negative constraints, and rejected paths
      that prevent repeated mistakes are preserved.
- [ ] Assumptions, questions, blockers, deferred decisions, and superseded facts
      have explicit status and owner or resolution route.
- [ ] Replanning records what was preserved, changed, invalidated, and added.
- [ ] Compression removed duplicated explanation, not identity, status,
      provenance, constraints, or evidence meaning.

## Definition Readiness

- [ ] Important entities and terms have unambiguous definitions and owners.
- [ ] Every duplicated or derived field names its authority and invalidation
      rule.
- [ ] State, transition, dependency, permission, and lifecycle behavior is
      defined when the change touches those concerns.
- [ ] Boundary producers, consumers, input/output contracts, compatibility, and
      required checks are explicit.
- [ ] Negative, stale-state, permission, blocked, resume, failure, and adjacent
      trajectories are included when relevant.
- [ ] No critical definition or boundary question remains `OPEN` while the plan
      claims `DEFINITION_READY`.

## Operational Semantics When Applicable

- [ ] Graph applicability is explicit. Atomic bypass is used only for one
      bounded obligation with no useful dependency, join, repair, or revision
      structure and does not bypass normal workflow gates.
- [ ] Stateful entities and important fields have stable identity, one source
      of truth, mutation authority, derivation rule, and lifecycle/retention.
- [ ] One lane-state owner records authoritative transitions; workers and
      evidence producers return receipts or proposals only.
- [ ] Every legal transition names its actor, preconditions, required evidence,
      invalidation condition, and failure, block, reopen, or resume behavior.
- [ ] Prerequisite nodes, acceptance gates, and external conditions use separate
      fields and satisfaction rules.
- [ ] The dependency order was walked end to end and contains no cycle or gate
      that requires a downstream consumer before accepting its producer.
- [ ] Node and gate IDs are unique and never reused; critical open definitions,
      undefined transitions/resume destinations, and invalid transition paths
      prevent readiness.
- [ ] Aggregate/terminal gates are distinct from per-producer acceptance when a
      downstream node depends on that producer.
- [ ] Join or gate statuses, required/optional inputs, reopening, and evidence
      invalidation are complete when joins or gates exist.
- [ ] Retry/loop attempts, time/token/tool/cost bounds when relevant,
      idempotency/cleanup, and exhaustion routes are explicit.
- [ ] Readiness requires current versioned inputs, typed accepted nodes/gates,
      external conditions, permissions/tools, write or merge ownership,
      attempts, repair/exhaustion routes, and paid/live bounds when applicable.
- [ ] Cross-lane readiness names the producer lane, accepted producer gate,
      current evidence/version, merge owner, and invalidation route.
- [ ] Concurrent actors cannot mutate the same authoritative state without one
      declared state or merge owner.
- [ ] Ownership transfer increments graph revision and blocks both prior and
      incoming owners from authoritative mutation until explicit handoff
      acceptance records the incoming owner and new revision.
- [ ] Plan revision increments for material changes to planning knowledge,
      definitions, workline boundaries, or implementation decisions.
- [ ] Graph revision increments for changes to instantiated topology,
      dependencies, actors, ownership, or gates.
- [ ] An instantiated graph-only change does not require a plan-revision
      increment unless it also changes a plan-revision trigger.
- [ ] An unchanged-topology retry changes attempt/history only; it increments
      neither plan revision nor graph revision.

## Adaptive Workline Discovery

- [ ] Candidate worklines were derived from outcomes, criteria, boundaries,
      writes, dependencies, and validation seams rather than a target count.
- [ ] The planner did not ask for a number of worklines unless the number itself
      is a user constraint.
- [ ] Candidates that share unresolved decisions, state machines, public
      contracts, or conflicting writes were merged or serialized.
- [ ] Selected worklines have independently meaningful outputs or validation
      seams and a deterministic merge owner.
- [ ] Every request criterion has exactly one primary workline owner; protected
      consumers and cross-workline dependencies are visible.
- [ ] Creating several worklines does not imply delegation or parallel
      execution without authorization and safety.
- [ ] New discoveries trigger another boundary pass; the original workline
      count is not treated as fixed.

## Implementation Readiness

- [ ] Every implementation slice references the definitions, criteria,
      trajectories, and boundaries it implements.
- [ ] Inputs, changed files/contracts, expected output, validation, and
      repair/stop boundary are explicit for each slice.
- [ ] File ownership, merge ownership, tool/permission needs, and conflicts are
      known before edits.
- [ ] Required validation is defined before implementation and missing required
      evidence cannot pass.
- [ ] A traceability pass found no orphan request criterion, accepted
      definition, boundary contract, implementation slice, or required check.
- [ ] The highest useful validation seam proves behavior without coupling only
      to private implementation shape.

## Replanning And Handoff

- [ ] Revision history increments only the revision whose trigger changed;
      graph-only dependency, actor, ownership, gate, or topology changes do not
      force a plan revision unless planning knowledge, definitions, workline
      boundaries, or implementation decisions also changed.
- [ ] Invalidated downstream slices and evidence are named; unaffected accepted
      knowledge is preserved.
- [ ] The compact resume contract contains sources, decisions, constraints,
      worklines, evidence, blockers, drift, and the next gate.
- [ ] Current projections can be reconstructed from authoritative sources and
      revision history rather than conversation memory.
