# Work Index

Use this folder as the active work memory for Orchestrator.

## Files

- `active.md`: active and recently closed work lanes.
- `lane-template.md`: template for a lane packet when one row is not enough.
- `lanes/`: optional per-lane packets for parallel work.
- `reports/`: durable reports and blocked/deferred handoffs.

## Rules

- Keep small work in `active.md` only.
- Create a lane packet when work needs more than a row: separate acceptance
  criteria, behavior examples, commands, blockers, or independent validation.
- Lanes may run in parallel only when they do not write the same files, require
  each other's output, or share an unresolved product decision.
- Merge lane evidence in `active.md` before closeout.

