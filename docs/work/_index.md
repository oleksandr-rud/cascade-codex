# Work Index

Use this folder as the active work memory for Orchestrator.

## Files

- `active.md`: active work lanes and active work-graph projection only.
- `lane-template.md`: template for a lane packet when one row is not enough.
- `work-graph-template.md`: defaults for multi-workline dependency, dispatch,
  evidence, invalidation, and closeout graphs.
- `lanes/`: optional per-lane packets for parallel work.
- `examples/`: optional non-active lane examples when the harness ships any.
- `reports/`: durable reports, completed work graphs, and blocked/deferred
  handoffs.

## Rules

- Keep small work in `active.md` only.
- Create a lane packet when work needs more than a row: separate acceptance
  criteria, behavior examples, commands, blockers, or independent validation.
- Copy from `examples/` only when a relevant example exists; do not treat
  example lanes as active work.
- Lanes may run in parallel only when they do not write the same files, require
  each other's output, or share an unresolved product decision.
- Merge lane evidence in `active.md` before closeout.
- Use a work graph only when several worklines, dependency gates, merge
  ownership, dispatch surfaces, or evidence joins need explicit coordination.
  A work graph is declarative and never dispatches itself.
- Preserve durable reports and receipts, then remove completed worklines and
  completed or superseded work-graph projections from `active.md` in the same
  closeout.
- For research-heavy work, add detailed evidence to `reports/` and add compact
  durable research-memory entries to `docs/patterns/context-memory/index.md`.
