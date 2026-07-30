---
name: context
description: Use at task start, resume, replanning, or handoff to rehydrate compact source and decision context, active worklines, revision state, changed files, evidence, blockers, drift, and the next action.
---

# Context Snapshot

Use this skill after a gap, when repository drift is high, or when the user asks
where the work stands.

## Source Order

1. Latest user request.
2. Git branch, working tree, recent commits.
3. Active work registry under `docs/work/active.md`.
4. Relevant first-class Coordination Graphs under `docs/work/graphs/`, including
   their current graph revision, authoritative owner, dispatch/materialization
   records, batch matrix, and terminal gate.
5. Relevant lane packets under `docs/work/lanes/`, including their latest plan
   revision, compact source/definition ledgers, workline map, and replanning
   history when present.
6. Authoritative sources referenced by the active plan or graph when freshness
   or drift can affect the next action.
7. Planning and compaction rules under
   `docs/patterns/context-memory/index.md` and
   `docs/patterns/workflow/index.md` when present.
8. `docs/patterns/workflow/graph-shaped-work.md` when a lane uses a Task Graph,
   worklines use a Coordination Graph, or applicability must be re-evaluated.
9. Research memory entries under `docs/patterns/context-memory/index.md` when present.
10. Recent reports under `docs/work/reports/` when present.
11. Relevant archive capsules under `docs/archive/work-reports/` only when the
    request names historical completed work or a live source points there.
12. High-priority backlog notes under `docs/backlog/` when configured.

## Rehydration And Compression Rules

- Treat the latest request, current code, owner docs, active lane, evidence
  artifacts, and revision history as authority. A prior snapshot is a derived
  projection.
- Preserve compact source IDs and freshness; accepted definitions and
  decisions; negative constraints and non-goals; assumptions, open questions,
  and superseded facts; workline ownership and dependencies; changed
  artifacts; evidence status; blockers; and the next gate.
- Compress repeated rationale, completed-step narration, and raw evidence that
  already has a stable artifact reference.
- Never compress `BLOCKED`, `GAP`, `NOT_RUN`, authored-only, historical, or
  unaccepted evidence into a pass or completion claim.
- On resume, compare the snapshot with current sources and files. Classify
  saved knowledge as current, invalidated, superseded, blocked, or unknown
  before recommending execution.
- On replanning, report the latest revision plus preserved, changed, added, and
  invalidated definitions/worklines/evidence. Do not reconstruct the plan only
  from conversation memory.
- Treat an archive capsule as the compact historical entrypoint and its
  relocated originals as detailed frozen authority. Do not scan archived work
  as active context or mutate it to resume work.

## Graph-Shaped Rehydration

First classify the authority as no graph, a lane-local Task Graph, a
cross-workline Coordination Graph, or both with non-overlapping authority.
Atomic work with one bounded obligation and no useful dependency, join, repair,
or revision structure may omit graph state, but still follows normal planning,
permission, review, validation, and closeout rules. A Coordination Graph applies
only to two or more worklines with a real cross-workline dependency, evidence or
batch join, materialization/integrated-validation boundary, invalidation
relationship, or partial-repair route.

When graph-shaped state applies:

1. Rehydrate plan revision and graph revision separately. Plan revision tracks
   planning knowledge and workline decisions; graph revision tracks topology,
   dependencies, actors, ownership, and gates. An ordinary retry changes the
   attempt, not either revision.
2. For a Task Graph, resolve the lane-state owner, node/gate records, latest
   amendment, and transition/repair history. For a Coordination Graph, resolve
   the `CG-XXX` path, coordination-state/materialization owner, canonical
   worklines and edges, accepted workline gates, dispatch ledger, immutable
   producer transports, materialization queue/receipts, Batch Evaluation Matrix,
   integrated active-worktree evidence, terminal gate, and histories. Do not
   reconstruct migrated cross-workline authority from a lane packet.
3. Treat Current Frontier, status boards, active-registry rows, summaries, and
   queue views as derived projections. The authoritative materialization queue
   remains in the Coordination Graph even when a status view copies it.
4. Reject or report `BLOCKED` for duplicate node/gate/graph IDs, dependency cycles,
   undefined transitions or resume destinations, critical open definitions,
   dangling workline or evidence subjects, invalid recorded transitions, dual
   authority after cutover, or an incomplete ownership handoff. Do not repair an
   invalid graph from conversation memory.
5. Recompute each candidate's readiness from typed prerequisite nodes, typed
   acceptance gates, external conditions, named input/source versions,
   permissions and tools, write/integration ownership, attempt maximum, repair and
   exhaustion routes, and paid/live or mutating-work bounds when applicable.
   For cross-lane inputs, require the named producer lane, accepted producer
   gate, current evidence/version, and non-conflicting integration owner. For a
   dependent worktree, also require the accepted immutable producer transport
   and proof that the exact transport is present in the consumer worktree; an
   uncommitted active-worktree materialization is not a Git base.
6. Rehydrate materialization by binding source receipt/transport, target path and
   branch, target HEAD before/after, active baseline, preserved dirty paths,
   applied paths, combined diff fingerprint, staged state, checks, and current
   lifecycle state. Equal target HEAD values are valid for no-commit
   materialization; the current diff binding proves presence. Unexplained dirty
   overlap is `BLOCKED`.
7. Rehydrate every batch from its matrix: required workline/materialization
   gates, producer transports, target HEAD plus combined diff, definition and
   runner/environment versions, shards, requirement levels, missing/duplicate
   policy, aggregation, and repair route. Keep local, materialized, integrated,
   authored, executed, reviewed, judged, calibrated, historical, and accepted
   evidence meanings distinct.
8. Compare the recomputed frontier with every saved projection. Record drift
   and repair the projection from authority before recommending execution.
   Output or a completed worker turn is not readiness or acceptance evidence.
9. Preserve receipts and conflicting proposals as evidence/history. Only the
   lane-state owner records Task Graph transitions; only the coordination-state/
   materialization owner records Coordination Graph, queue, batch, and terminal
   transitions. Workers and evidence producers return version-bound receipts and
   proposed transitions only.

## Checklist

1. Identify active work lanes/worklines and whether they still cover the latest
   request.
2. Rehydrate the latest plan revision, authoritative source references,
   accepted decisions, negative constraints, workline map, and open questions.
3. Summarize branch state and local changes without reverting user work.
4. Compare saved sources, decisions, worklines, and evidence with current state;
   name invalidation or unknown freshness instead of assuming continuity.
5. For graph-shaped work, reconcile Task Graph and Coordination Graph authority
   separately, including revisions, owners, gates, dispatch/transport bindings,
   materialization and batch state, amendments/repair history, typed readiness,
   integrated evidence, and the derived frontier.
6. Identify blockers, stale context, orphan criteria, and the next likely
   workflow skill.
7. Keep the snapshot short by referencing owners; do not implement from this
   skill.
8. When a status refresh proves an in-scope lane complete against current
   source, criteria, dependencies, and validation evidence, route it to
   `orchestrate-work -> closeout` for registry reconciliation without waiting
   for another confirmation.

## Output

- active lanes and connected worklines;
- current plan revision, graph applicability/revision when present, and compact
  source/decision context;
- relevant research memory entries;
- current state;
- preserved, invalidated, superseded, blocked, or unknown knowledge;
- authoritative Task Graph and/or Coordination Graph owner/state, reconciled
  frontier, next ready workline/node/materialization, local-versus-integrated
  evidence state, active target HEAD/diff binding, blockers, or drift when
  graph-shaped work applies;
- recommended next entry point;
- residual risk.

Use `templates/snapshot.md` when the user asks for a formal snapshot.
