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
4. Current work/spec docs under `docs/work/` or `docs/specs/`, including the
   authoritative `docs/work/graphs/CG-XXX-*.md` entry when cross-workline state
   already exists.
5. Product/design context under `docs/product/`, `docs/design/`, and
   `docs/brand/`, plus any `docs-impact-map` report for current source docs.
6. Feature Impact Matrix rows from the current work lane when present.
7. `docs/glossary.md` and durable patterns.
8. `docs/structure.md` and `docs/patterns/workflow/index.md` when the plan changes
   active work lanes or write targets.
9. `docs/patterns/workflow/fragments/_index.md` and the applicable
   `GF-*.fragment.json` definitions when non-atomic work may need product,
   design, implementation, integration, test, or assurance composition.
10. `docs/patterns/context-memory/index.md` when the plan must survive compaction,
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
- Use `reconcile-work-graph` before creating or amending a Coordination Graph
  from existing lanes/worklines whose identity, duplication, staleness,
  completion, ownership, or inbound consumers have not been reconciled.
- Derive worklines through `orchestrate-work` from inspected boundaries. Do not
  ask the user to choose a number of plans or worklines unless that number is
  itself a delivery constraint.
- Evaluate reusable graph fragments before final workline selection. Fragment
  evaluation does not force graph creation: record `SELECTED`, `MERGED`,
  `NOT_APPLICABLE`, or `BLOCKED`, and instantiate only the smallest applicable
  nodes, skill calls, tests, gates, and repair routes.
- Prefer replacement and cleanup for stale or duplicate paths unless the user
  asks for staged compatibility.

## Planning States

- `DRAFT`: source coverage, definitions, or boundary decisions remain open.
- `DEFINITION_READY`: important terms, authority, boundaries, lifecycle, and
  failure behavior are coherent.
- `IMPLEMENTATION_READY`: worklines, slices, writes, dependencies, validation,
  and stop conditions are mapped; any applicable Coordination Graph also has
  authoritative dispatch, immutable transport, materialization, batch,
  integrated-evidence, repair, and terminal-gate contracts.
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
   Decide Task Graph and Coordination Graph applicability separately. Atomic
   work with one obligation and no useful dependency, join, repair, or revision
   structure may omit graph sections. A Coordination Graph requires at least
   two real worklines plus a cross-workline dependency, evidence/batch join,
   materialization/integrated-validation boundary, invalidation relationship,
   or partial-repair route that direct references cannot represent safely.
   Several unrelated worklines do not qualify. No bypass removes normal
   planning, permission, review, validation, or closeout.
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
13. Run the delivery-surface and assurance-overlay audit from
   `docs/patterns/workflow/fragments/`. For each fragment, record activation
   evidence, disposition/reason, required/provided ports, actor capabilities,
   skill calls, tests, evaluator authority, and omission consequence. Bind
   selected required ports to selected producers, authoritative external
   sources, or explicit conditional omissions. Unsupported required actor,
   skill, test-command, fixture, environment, or evaluator capability is
   `BLOCKED`, not an implied fallback.
14. Use `orchestrate-work` to compose selected fragments and discover candidate
   worklines from outcomes,
   criteria, boundaries, writes, dependencies, and validation seams. Select the
   smallest coherent set; do not target a count. Give every criterion one
   primary workline owner and every provided port one primary producer; record
   connected consumers. Merge fragments that share one owner, write scope, and
   acceptance seam. Split only for independently meaningful ownership, writes,
   handoff, or evidence.
15. Convert selected worklines into implementation slices that name their
   inputs, files/contracts, output, evidence, and repair or stop boundary.
16. Run a traceability pass from request and definitions through selected
   fragments, worklines,
   slices, artifacts, and checks. Orphan rows keep the plan in `DRAFT`.
17. Map regressions across touched boundaries and Feature Impact Matrix rows.
18. Name functional and automated validation before editing. Resolve every
   selected fragment's abstract test strategy to exact target commands,
   fixtures, environments, evidence locus, and evaluator authority; explicitly
   justify conditional tests that remain `NOT_RUN`.
19. Persist durable decisions only when they are hard to reverse, surprising
   without context, and the result of a real trade-off.
20. For material replanning, increment the plan revision and append what was
   preserved, changed, added, invalidated, or superseded before replacing
   current projections. Re-evaluate affected fragments, worklines, and evidence
   only.
21. Update `docs/work/active.md`, a lane packet, or an authoritative
   Coordination Graph only when the plan changes its owned active state. Keep
   generated/source specs free of graph boilerplate and use stable references
   to their narrow owners.
22. Check the plan with `checklists/planning-completeness.md` before claiming
   `DEFINITION_READY` or `IMPLEMENTATION_READY`.

## Graph-Shaped Planning When Applicable

- Treat selected fragments as planning inputs, not active graph state. Generate
  stable instance IDs only after composition and preserve each instance's source
  fragment ID/version, disposition, port bindings, resolved actor/skills/tests,
  owning workline, and omission or invalidation rule.
- Synthesize only selected and merged fragment obligations. Atomic work emits no
  fragment graph; one-lane connected work emits a lane-local Task Graph;
  qualifying cross-workline joins emit one first-class Coordination Graph.
  Omitted fragments contribute no nodes, gates, tests, or terminal evidence.
- Synthesize the terminal gate from current required fragment and overlay gates.
  Reject dangling ports, duplicate primary producers or criteria owners,
  unsupported required skill/actor/evaluator bindings, unresolved test
  strategies, contradictory dispositions, and cycles before readiness.
- Preserve lane-local Task Graph authority for obligations within a lane. Name
  its lane-state owner and distinguish authoritative nodes, gates, amendments,
  and transition/repair records from derived frontier, registry, and status
  projections.
- For qualifying cross-workline state, create or amend one first-class
  entry matching `docs/work/graphs/CG-*.md`. Name one coordination-state/
  materialization owner and keep the canonical workline registry, typed edges,
  cross-workline gates, dispatch ledger, immutable transports, materialization
  queue/receipts, batch matrix, integrated evidence, repair history, and
  terminal gate there. Workers and evidence producers emit receipts or
  proposals; they do not self-record shared state.
- Treat graph creation as a direct authority cutover. Migrate existing
  cross-workline edges/gates/queues once, record preserved and invalidated
  evidence, and leave lane packets and `active.md` as read-only references or
  projections. Do not plan a dual authoritative copy or fallback path.
- Define each legal transition with its prior and next state, transition owner,
  preconditions, required evidence, invalidation condition, and deterministic
  failure or resume route.
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
  current evidence/version, compatible integration/materialization ownership,
  and invalidation route. Under a Coordination Graph, a dependent worktree also
  requires one immutable producer transport identity (preferred accepted
  commit set, otherwise content-addressed patch/diff digest), consumer base SHA,
  and proof the exact transport is present. A producer completion claim,
  unaccepted receipt, or uncommitted active-worktree diff is insufficient.
- When execution uses dedicated worktrees, plan thread, branch, worktree, base
  SHA, allowed writes, producer gate, attempt, input versions, immutable
  transport/presence proof, worker receipt, and invalidation/stop route for each
  dispatch.
- Define the Materialization Queue and its canonical lifecycle: `QUEUED`,
  `APPLYING`, `APPLIED`, `VALIDATING`, `ACCEPTED`, `FAILED`, `BLOCKED`, and
  `SUPERSEDED`. Bind source receipt/transport, target active worktree and branch,
  target HEAD before/after, baseline and pre-existing dirty paths, allowed/
  applied paths, transport method, combined diff fingerprint, staged state,
  focused checks, and repair/rollback route. Unexplained dirty-path overlap is a
  blocker.
- State the no-commit boundary explicitly: materialization makes accepted
  changes appear in the active worktree but does not imply clean/reset, broad
  stage, commit, push, publish, or any current-branch history change. Those
  actions require separate user authority. Equal target HEAD before/after is
  valid when the bound diff proves presence.
- Define every Batch Evaluation Matrix with required workline/materialization
  gates, producer transports, target HEAD plus combined diff fingerprint,
  input/definition and runner/model/environment/rubric versions, shards and
  expected coverage, requirement levels, missing/duplicate policy, aggregation,
  and failure/partial-repair route. Required missing, `FAIL`, `BLOCKED`, `GAP`,
  or `NOT_RUN` evidence prevents acceptance.
- Separate worker-local from materialized and integrated evidence. The terminal
  gate consumes only current workline, materialization, batch, integrated, and
  residual-risk inputs bound to the same graph revision and combined state.
- Record plan revision and graph revision separately. Definitions, planning
  knowledge, workline boundaries, or implementation decisions change plan
  revision. Topology, dependencies, actors, ownership, or gates change graph
  revision. An unchanged-topology retry changes attempt/history only.
  An instantiated graph-only amendment does not also increment plan revision
  unless it changes planning knowledge, definitions, workline boundaries, or
  implementation decisions.
- An ownership transfer increments graph revision and blocks authoritative
  mutation by both the prior and incoming owner until an explicit handoff
  acceptance record binds the incoming owner and new revision.
- Recalculate readiness and the derived frontier after blocker resolution,
  repair, evidence/input invalidation, cross-lane change, materialization or
  batch failure, or graph amendment. Failed or unblocked work returns through
  `PENDING` or the affected queue item through `QUEUED` before readiness is
  recalculated. Reopen only the earliest responsible workline and consumers/
  materializations/batches whose named inputs changed.

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
- Task Graph and Coordination Graph applicability, graph path/revision, state
  owner, direct-cutover status, authoritative sources, and derived-frontier
  rule when applicable;
- compact source, definition/decision, question, and boundary ledgers;
- behavior examples;
- affected and protected feature contracts;
- codebase context and slice boundary;
- graph-fragment selection ledger, port bindings, resolved actor/role and skill
  calls, per-fragment test/evaluator strategy, and omission reasons;
- adaptively derived workline map with one primary owner per criterion;
- implementation slices and request-to-evidence traceability;
- chosen approach and rejected alternatives when relevant;
- risks and deferred items;
- replanning preservation and invalidation delta when applicable;
- validation plan; and
- dedicated-worktree dispatch, immutable transport/presence, materialization,
  batch/integrated-evidence, dirty-target, no-commit, and partial-repair
  contracts when applicable.
