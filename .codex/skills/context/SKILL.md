---
name: context
description: Lightweight repository snapshot for active work lanes, branch state, recent handoff memory, and likely next action.
---

# Context Snapshot

Use this skill after a gap, when repository drift is high, or when the user asks
where the work stands.

## Source Order

1. Latest user request.
2. Git branch, working tree, recent commits.
3. Active work registry under `docs/work/active.md`.
4. Relevant lane packets under `docs/work/lanes/` when present.
5. Recent reports under `docs/work/reports/` when present.
6. High-priority backlog notes under `docs/backlog/` when configured.

## Checklist

1. Identify active work lanes and whether they still match the latest request.
2. Summarize branch state and local changes without reverting user work.
3. Identify blockers, stale context, and next likely workflow skill.
4. Keep the snapshot short; do not implement from this skill.

## Output

- active lanes;
- current state;
- blockers or drift;
- recommended next entry point;
- residual risk.

Use `templates/snapshot.md` when the user asks for a formal snapshot.
