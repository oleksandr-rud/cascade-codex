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
4. Relevant lane packets under `docs/work/lanes/`, including their latest plan
   revision, compact source/definition ledgers, workline map, and replanning
   history when present.
5. Authoritative sources referenced by the active plan when freshness or drift
   can affect the next action.
6. Planning and compaction rules under
   `docs/patterns/context-memory/index.md` and
   `docs/patterns/workflow/index.md` when present.
7. `docs/patterns/workflow/graph-shaped-work.md` when the active lane uses a
   task graph or applicability must be re-evaluated.
8. Research memory entries under `docs/patterns/context-memory/index.md` when present.
9. Recent reports under `docs/work/reports/` when present.
10. High-priority backlog notes under `docs/backlog/` when configured.

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

## Graph-Shaped Rehydration

First classify whether graph-shaped state applies. Atomic work with one bounded
obligation and no useful dependency, join, repair, or revision structure may
omit it, but still follows normal planning, permission, review, validation, and
closeout rules. When a lane instantiates a task graph:

1. Rehydrate plan revision and graph revision separately. Plan revision tracks
   planning knowledge and workline decisions; graph revision tracks topology,
   dependencies, actors, ownership, and gates. An ordinary retry changes the
   attempt, not either revision.
2. Resolve the lane-state owner and authoritative Task Graph, gate records,
   latest graph amendment, and transition/repair history. Treat Current
   Frontier, status boards, merge queues, active-registry rows, and prior
   snapshots as derived projections.
3. Reject or report `BLOCKED` for duplicate node/gate IDs, dependency cycles,
   undefined transitions or resume destinations, critical open definitions,
   invalid recorded transitions, or an incomplete ownership handoff. Do not
   repair an invalid graph from conversation memory.
4. Recompute each candidate's readiness from typed prerequisite nodes, typed
   acceptance gates, external conditions, named input/source versions,
   permissions and tools, write/merge ownership, attempt maximum, repair and
   exhaustion routes, and paid/live or mutating-work bounds when applicable.
   For cross-lane inputs, require the named producer lane, accepted producer
   gate, current evidence/version, and non-conflicting merge owner.
5. Compare the recomputed frontier with every saved projection. Record drift
   and repair the projection from authority before recommending execution.
   Output or a completed worker turn is not readiness or acceptance evidence.
6. Preserve receipts and conflicting proposals as evidence/history. Only the
   lane-state owner records an authoritative transition; a worker or evidence
   producer may return a version-bound receipt and proposed transition only.

## Checklist

1. Identify active work lanes/worklines and whether they still cover the latest
   request.
2. Rehydrate the latest plan revision, authoritative source references,
   accepted decisions, negative constraints, workline map, and open questions.
3. Summarize branch state and local changes without reverting user work.
4. Compare saved sources, decisions, worklines, and evidence with current state;
   name invalidation or unknown freshness instead of assuming continuity.
5. For graph-shaped work, reconcile graph revision, lane-state owner,
   authoritative node/gate state, amendments and repair history, typed
   readiness, cross-lane evidence, and the derived frontier.
6. Identify blockers, stale context, orphan criteria, and the next likely
   workflow skill.
7. Keep the snapshot short by referencing owners; do not implement from this
   skill.

## Output

- active lanes and connected worklines;
- current plan revision, graph applicability/revision when present, and compact
  source/decision context;
- relevant research memory entries;
- current state;
- preserved, invalidated, superseded, blocked, or unknown knowledge;
- authoritative graph owner/state, reconciled frontier, next ready node,
  evidence state, blockers, or drift when graph-shaped work applies;
- recommended next entry point;
- residual risk.

Use `templates/snapshot.md` when the user asks for a formal snapshot.
