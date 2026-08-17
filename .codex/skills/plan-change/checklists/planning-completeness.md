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
      current evidence/version, integration/materialization owner, and
      invalidation route.
- [ ] Concurrent actors cannot mutate the same authoritative state without one
      declared state or integration/materialization owner.
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

## Slice Composition And Delivery Handoff

- [ ] A proportional impact scan decided whether reusable fragment definitions
      were needed; bounded single-surface work records why catalog loading adds
      no useful structure.
- [ ] Every materially plausible delivery fragment and assurance overlay is
      `SELECTED`, `MERGED`, `NOT_APPLICABLE`, or `BLOCKED` with activation
      evidence and an omission consequence.
- [ ] Every selected required port binds a selected producer, authoritative
      external source, or explicit conditional omission; no dangling required
      port remains.
- [ ] Every provided port and request criterion has one primary owner; named
      consumers do not create duplicate authority.
- [ ] Actor capabilities resolve to existing roles or explicitly authorized
      worker routes; planning does not invent dynamic agents.
- [ ] Required skill calls exist and are wired to the selected role, or an
      explicit cross-role support exception is recorded.
- [ ] Selected test strategies resolve to exact commands/checks, fixtures,
      environments, evidence locus, and evaluator/reviewer authority from the
      target repository.
- [ ] Assurance overlays attach only to selected affected fragments and become
      separate worklines only for independent ownership, writes, handoff, or
      evidence.
- [ ] The assembled flow contains only selected or merged obligations and its
      terminal join contains no evidence from omitted fragments.
- [ ] Composition rejects duplicate ownership, dangling ports, unsupported
      required capabilities, contradictory dispositions, unresolved required
      tests, and cycles before readiness.

- [ ] Implementation slices were derived from outcomes, criteria, boundaries,
      writes, dependencies, and validation seams rather than a target count.
- [ ] The planner did not ask for a number of slices or candidate worklines
      unless the number itself is a user constraint.
- [ ] Slices that share unresolved decisions, state machines, public contracts,
      or inseparable validation were merged or ordered.
- [ ] Every request criterion has exactly one primary slice owner; protected
      consumers and dependencies are visible.
- [ ] Multi-horizon scope routes to `plan-iterations`; only its committed
      first-iteration scope may route to `orchestrate-work` for active
      worklines.
- [ ] Creating slices or future candidates does not imply delegation, active
      lane creation, graph state, or parallel execution.
- [ ] New discoveries trigger another boundary pass; the original slice or
      candidate count is not treated as fixed.

## Implementation Readiness

- [ ] Every implementation slice references the definitions, criteria,
      trajectories, and boundaries it implements.
- [ ] Inputs, changed files/contracts, expected output, validation, and
      repair/stop boundary are explicit for each slice.
- [ ] File ownership, integration/materialization ownership, actor/skill
      bindings, tool/permission needs, and conflicts are known before edits.
- [ ] Required validation is defined before implementation and missing required
      evidence cannot pass.
- [ ] A traceability pass found no orphan request criterion, accepted
      definition, boundary contract, implementation slice, or required check.
- [ ] The highest useful validation seam proves behavior without coupling only
      to private implementation shape.
- [ ] The plan identifies either one current coherent slice or a required
      `plan-iterations` handoff; future scope is not treated as active work.

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
