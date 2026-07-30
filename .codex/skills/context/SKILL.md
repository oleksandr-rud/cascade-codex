---
name: context
description: Use at task start, resume, or handoff to snapshot branch state, active work lanes, recent reports, changed files, blockers, and the likely next action.
---

# Context Snapshot

Use this skill after a gap, when repository drift is high, or when the user asks
where the work stands.

## Source Order

1. Latest user request.
2. Git branch, working tree, recent commits.
3. Active work registry under `docs/work/active.md`.
4. Relevant lane packets under `docs/work/lanes/` when present.
5. Research memory entries under `docs/patterns/context-memory/index.md` when present.
6. Recent reports under `docs/work/reports/` when present.
7. High-priority backlog notes under `docs/backlog/` when configured.

## Checklist

1. Identify active work lanes and whether they still match the latest request.
2. When the user asks to check, refresh, or actualize task status, compare each
   in-scope lane with its current source, required criteria, and validation
   evidence. Route proven completion to `orchestrate-work -> closeout` for
   automatic registry reconciliation; do not leave a proven-complete lane open
   waiting for another confirmation.
3. Summarize branch state and local changes without reverting user work.
4. Identify blockers, stale context, and next likely workflow skill.
5. Keep the snapshot short; do not implement from this skill.

## Output

- active lanes;
- relevant research memory entries;
- current state;
- blockers or drift;
- recommended next entry point;
- residual risk.

Use `templates/snapshot.md` when the user asks for a formal snapshot.
