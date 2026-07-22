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
7. Research memory entries under `docs/patterns/context-memory/index.md` when present.
8. Recent reports under `docs/work/reports/` when present.
9. High-priority backlog notes under `docs/backlog/` when configured.

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

## Checklist

1. Identify active work lanes/worklines and whether they still cover the latest
   request.
2. Rehydrate the latest plan revision, authoritative source references,
   accepted decisions, negative constraints, workline map, and open questions.
3. Summarize branch state and local changes without reverting user work.
4. Compare saved sources, decisions, worklines, and evidence with current state;
   name invalidation or unknown freshness instead of assuming continuity.
5. Identify blockers, stale context, orphan criteria, and the next likely
   workflow skill.
6. Keep the snapshot short by referencing owners; do not implement from this
   skill.

## Output

- active lanes and connected worklines;
- current plan revision and compact source/decision context;
- relevant research memory entries;
- current state;
- preserved, invalidated, superseded, blocked, or unknown knowledge;
- evidence state, blockers, or drift;
- recommended next entry point;
- residual risk.

Use `templates/snapshot.md` when the user asks for a formal snapshot.
