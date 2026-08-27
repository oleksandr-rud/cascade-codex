# Reconciliation rules

## Authority

Read-only audit is the default. A project record, plan, or graph never grants
mutation, delegation, execution, release, or archive authority.

## Comparison axes

Compare every candidate on outcome, owner, dependencies, produced artifacts,
acceptance criteria, evidence boundaries, consumers, and completion rule.

## Dispositions

- `KEEP`: current and independently necessary.
- `UPDATE`: same authority, but its projection or bindings are stale.
- `MERGE_INTO`: true duplicate; migrate every unique obligation first.
- `SUPERSEDE_BY`: replaced by a newer authority while retained as history.
- `RETIRE_PROPOSED`: terminal and eligible for an explicit closeout decision.
- `BLOCKED_REVIEW`: ownership, evidence, or authority cannot be resolved.

Never merge because paths overlap. Never preserve duplicates merely because
identifiers differ. Plan revision and dependency-topology revision remain
separate concepts.

## Artifact status

The reconciliation artifact is `READY` when the current evidence supports one
survivor, every inspected record has a disposition, invalidation is scoped,
and the next host owner is explicit. Unapplied host mutation does not make the
read-only artifact merely `PROPOSED`. Use `BLOCKED` for an ambiguous survivor,
unresolved authority collision, dangling consumer, or unsafe resolution.
