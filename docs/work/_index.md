# Work Index

Use this folder as the active work memory for Orchestrator.

## Files

- `active.md`: active and recently closed work lanes.
- `lane-template.md`: template for a lane packet when one row is not enough.
- `graph-template.md`: template for a first-class cross-workline Coordination
  Graph when real dependency, join, materialization, invalidation, or repair
  relationships exist.
- `.codex/skills/plan-change/templates/definition-ready-plan.md`: reusable
  planning overlay for preserving definitions, boundaries, adaptive worklines,
  traceability, and replanning history inside a lane or returned plan.
- `lanes/`: optional per-lane packets for parallel work.
- `graphs/`: versioned cross-workline Coordination Graph entries and their
  index; these are separate work entities, not lanes or specs.
- `examples/`: optional non-active lane examples when the harness ships any.
- `reports/`: durable reports and blocked/deferred handoffs.

## Rules

- Keep small work in `active.md` only.
- Treat `active.md` as a derived projection. A lane packet owns lane-local Task
  Graph state; a `graphs/CG-XXX-slug.md` entry owns cross-workline topology,
  joins, worktree dispatch, materialization, integrated validation, repair,
  and terminal aggregation when applicable.
- Create a lane packet when work needs more than a row: separate acceptance
  criteria, behavior examples, definitions, connected worklines, commands,
  blockers, or independent validation.
- Derive the number of worklines from inspected outcomes and boundaries. Do not
  require the user to specify a count; materialize only worklines that need
  independent state, ownership, validation, merge, or handoff.
- Preserve compact source, definition/decision, constraint, boundary,
  traceability, and replanning ledgers; keep detailed content in its
  authoritative owner.
- Copy from `examples/` only when a relevant example exists; do not treat
  example lanes as active work.
- Lanes may run in parallel only when they do not write the same files, require
  each other's output, or share an unresolved product decision.
- Create a Coordination Graph only for two or more worklines with at least one
  real cross-workline dependency, evidence/batch join, materialization or
  integrated-validation boundary, invalidation relationship, or partial-repair
  route. Several unrelated worklines do not require one.
- Keep graph boilerplate out of product, design, brand, source, and generated
  spec documents; graphs reference their stable IDs, versions, and paths.
- Use one coordination-state/materialization owner and a direct authority
  cutover. Do not keep duplicate authoritative graph state in lane packets.
- Join lane evidence through the Coordination Graph when one exists, then
  reconcile its derived `active.md` projection before closeout.
- For research-heavy work, add detailed evidence to `reports/` and add compact
  durable research-memory entries to `docs/patterns/context-memory/index.md`.
