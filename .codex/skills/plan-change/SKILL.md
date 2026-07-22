---
name: plan-change
description: Use before or during replanning of non-atomic implementation, bug fixes, refactors, public contracts, state changes, or product-visible behavior to preserve definitions, boundaries, workline coverage, behavior examples, implementation slices, risks, and validation.
---

# Plan Change

Use before non-trivial implementation, bug fixes, refactors, public-contract
work, state changes, agent/runtime changes, or product-visible UI/API flows.

This skill turns customer pain and product/design intent into behavior examples
and validation evidence before editing. It uses codebase-specific terms instead
of generic modeling vocabulary and borrows only the useful product-side ideas:
user outcome, boundary of responsibility, and names that make current code
easier to navigate.

## Source Order

1. Latest user request and explicit constraints.
2. Current code and tests.
3. `AGENTS.md`, `CODEX.md`, and relevant skills or role contracts.
4. Current work/spec docs under `docs/work/` or `docs/specs/`.
5. Product/design context under `docs/product/`, `docs/design/`, and
   `docs/brand/`, plus any `docs-impact-map` report for current source docs.
6. Feature Impact Matrix rows from the current work lane when present.
7. `docs/glossary.md` and durable patterns.
8. `docs/structure.md` and `docs/patterns/workflow/index.md` when the plan changes
   active work lanes or write targets.
9. `docs/patterns/context-memory/index.md` when the plan must survive compaction,
   handoff, or material replanning.

If code and docs disagree, follow code and report the drift.

## Scope Rules

- Skip only for atomic mechanical edits.
- Use `architecture-review` when the change crosses major boundaries, changes a
  public contract, or has unclear hidden consumers.
- Use `discover` when product/design context is too thin to safely define
  behavior examples.
- Use `market-validation` when product intent depends on long market,
  competitor, pain, economics, segment, or experiment research.
- Use `synthesis-to-spec` when PRD, persona, requirement, journey, scenario,
  non-goal, success-metric, spec-packet, or backlog synthesis is missing
  for evidence-backed product intent.
- Use `compose-spec` when product/spec synthesis exists but durable
  PRD, persona, requirement, journey, scenario, spec-packet, or backlog
  artifacts have not been written.
- Use `brand-positioning` when naming, tone, content hierarchy, visual
  direction, or copy rules are missing for product-visible behavior.
- Use `design-system` when token, component, accessibility, layout, responsive,
  interaction-state, or visual evidence rules are missing.
- Use `ingest-spec` when incoming specs must be normalized before planning.
- Use `docs-impact-map` when source docs changed and sibling product, design,
  brand, spec, backlog, glossary, or pattern effects have not been checked.
- Use `orchestrate-work` when the work may split into parallel lanes or needs
  dependency/conflict tracking.
- Derive worklines through `orchestrate-work` from inspected boundaries. Do not
  ask the user to choose a number of plans or worklines unless that number is
  itself a delivery constraint.
- Prefer replacement and cleanup for stale or duplicate paths unless the user
  asks for staged compatibility.

## Planning States

- `DRAFT`: source coverage, definitions, or boundary decisions remain open.
- `DEFINITION_READY`: important terms, authority, boundaries, lifecycle, and
  failure behavior are coherent.
- `IMPLEMENTATION_READY`: worklines, slices, writes, dependencies, validation,
  and stop conditions are mapped.
- `BLOCKED`: a required source, decision, permission, or validation
  precondition is unavailable.
- `SUPERSEDED`: a later revision replaced the plan while preserving its
  identity and disposition.

Do not mark a plan `IMPLEMENTATION_READY` directly from a phase list. It must
first satisfy the definition-readiness and traceability checks in
`checklists/planning-completeness.md`.

## Checklist

1. State customer pain, intended behavior, assumptions, success criteria, and
   non-goals.
2. For each problem, requirement, or gap, run several trajectory passes per
   `docs/patterns/workflow/index.md#trajectory-coverage`; every trajectory must cover
   a real problem, requirement, or gap, and the final plan must synthesize those
   trajectories losslessly without omitting major or minor inspected details.
3. Build a compact source ledger with stable IDs, authority, path or reference,
   version/freshness, supported criteria or decisions, and status. Keep long
   source bodies in their authoritative owner.
4. Build a definition and decision ledger for important terms, identities,
   invariants, sources of truth, mutation authority, constraints, consumers,
   status, and invalidation rules. For stateful or graph-shaped work, define
   transitions, typed node/gate/external dependencies, cycle-free ordering,
   retry/resource bounds, and exhaustion behavior. Record assumptions, open
   questions, rejected paths, and deferred decisions when losing them could
   change implementation.
   Decide graph applicability explicitly: atomic work with one obligation and
   no useful dependency, join, repair, or revision structure may omit graph
   sections, but cannot bypass normal planning, permission, review, validation,
   or closeout.
5. Map codebase context: entry points, modules, state, data, adapters,
   generated clients, tests, and user paths.
6. Identify affected and protected feature contracts: the directly changed
   feature or flow, source docs/spec IDs, touched code/public contracts,
   adjacent behavior to preserve, required checks, and route for gaps or
   failures.
7. Write behavior examples in plain language or Given/When/Then form.
8. Include negative, stale-state, permission, follow-up, resume, failure,
   concurrent, or adjacent-mode
   examples when touched behavior makes them likely.
9. Map producer/consumer boundaries, input/output contracts, authority,
   compatibility, invalidation, and required checks.
10. Ask one blocker question at a time, include a recommended answer, and
   inspect code/docs instead of asking when available evidence can answer it.
11. Compare implementation approaches only when credible alternatives exist.
12. Name the highest useful test seam: the public/product boundary where a check
   can prove behavior without coupling to private helper shape.
13. Use `orchestrate-work` to discover candidate worklines from outcomes,
   criteria, boundaries, writes, dependencies, and validation seams. Select the
   smallest coherent set; do not target a count. Give every criterion one
   primary workline owner and record connected consumers.
14. Convert selected worklines into implementation slices that name their
   inputs, files/contracts, output, evidence, and repair or stop boundary.
15. Run a traceability pass from request and definitions through worklines,
   slices, artifacts, and checks. Orphan rows keep the plan in `DRAFT`.
16. Map regressions across touched boundaries and Feature Impact Matrix rows.
17. Name functional and automated validation before editing.
18. Persist durable decisions only when they are hard to reverse, surprising
   without context, and the result of a real trade-off.
19. For material replanning, increment the plan revision and append what was
   preserved, changed, added, invalidated, or superseded before replacing
   current projections. Re-evaluate affected worklines and evidence only.
20. Update `docs/work/active.md` or a lane packet only when the plan changes
   active work state.
21. Check the plan with `checklists/planning-completeness.md` before claiming
   `DEFINITION_READY` or `IMPLEMENTATION_READY`.

## Graph-Shaped Planning When Applicable

- Name one lane-state owner and distinguish authoritative Task Graph, gate,
  amendment, and transition/repair records from derived frontier, registry,
  status-board, and merge-queue projections. Workers and evidence producers
  emit receipts or transition proposals; they do not self-record shared state.
- Give nodes and gates stable, never-reused IDs and reject duplicate IDs,
  dependency cycles, undefined transitions/resume destinations, invalid legal
  transition paths, and critical open definitions before claiming
  `DEFINITION_READY` or `IMPLEMENTATION_READY`.
- Define readiness from accepted prerequisite nodes/gates; current external
  conditions and named input/source versions; objective, actor, receipt, write
  scope, tools/permissions, per-node gate, attempt/maximum, repair and
  exhaustion routes; absence of blockers; and any paid/live cost,
  idempotency, or cleanup bounds.
- For cross-lane readiness, require the producer lane, accepted producer gate,
  current evidence/version, compatible merge ownership, and invalidation
  route. A producer completion claim or unaccepted receipt is insufficient.
- Record plan revision and graph revision separately. Definitions, planning
  knowledge, workline boundaries, or implementation decisions change plan
  revision. Topology, dependencies, actors, ownership, or gates change graph
  revision. An unchanged-topology retry changes attempt/history only.
- Recalculate readiness and the derived frontier after blocker resolution,
  repair, evidence/input invalidation, cross-lane change, or graph amendment.
  Failed or unblocked work returns to `PENDING` before it can become `READY`.

## Compression And Replanning Rules

- Compress repeated explanation, completed-step narration, and raw evidence
  already stored elsewhere.
- Preserve source and decision IDs, authority, freshness, negative constraints,
  status, boundary ownership, workline dependencies, evidence meaning, and the
  next gate.
- A plan summary is a derived projection, never a replacement for its source,
  code, active lane, evidence artifact, or revision history.
- Do not silently delete an invalidated decision. Mark it `SUPERSEDED` or record
  it in the replanning history so downstream repairs remain explainable.
- Replanning may add, merge, serialize, split, or supersede worklines when new
  evidence changes a boundary. The original workline count is not a contract.

## Templates

- `templates/definition-ready-plan.md`: compact definition, boundary,
  workline, traceability, replanning, and resume contract for complex work.

## Checklists

- `checklists/planning-completeness.md`: definition-readiness,
  implementation-readiness, adaptive-workline, and rehydration gate.

## Output

- intended behavior and assumptions;
- planning status and revision;
- graph applicability, graph revision, state owner, authoritative graph sources,
  and derived-frontier rule when applicable;
- compact source, definition/decision, question, and boundary ledgers;
- behavior examples;
- affected and protected feature contracts;
- codebase context and slice boundary;
- adaptively derived workline map with one primary owner per criterion;
- implementation slices and request-to-evidence traceability;
- chosen approach and rejected alternatives when relevant;
- risks and deferred items;
- replanning preservation and invalidation delta when applicable;
- validation plan.
