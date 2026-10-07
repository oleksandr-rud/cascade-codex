# Project planning rules

## Horizons

- `FIRST`: feasible current outcome proposed or committed by a named authority.
- `NEXT`: next candidate after an explicit promotion condition.
- `LATER`: unscheduled option retained without active state.
- `DEFERRED`: intentionally held with a reconsideration condition.
- `REMOVED`: excluded by a sourced decision.

Future candidates receive no active ID, dispatch state, readiness claim, or
execution authority.

## Feasibility

Evaluate aggregate capacity, dependency critical path, role-specific load, and
write or resource serialization independently. Unknown material capacity keeps
the plan `PROPOSED`; a violated bound makes it `BLOCKED`.

## Work-item minimum

One work item contains only:

`id`, `outcome`, `owner`, `state`, `horizon`, `depends_on`, `artifact_refs`,
`acceptance_ref`, and `next_action`.

Keep requirements, strategy, tests, evidence bodies, and long rationale in
their owning artifacts. A project plan references those artifacts rather than
copying them.

A current digest-bound quality gate is already a quality-scope artifact. Do
not create a completed `plan-quality` handoff for it; retain the gate reference
and add only a later assessment route when that is the real next boundary.

`depends_on` is graph-local and accepts only another work-item ID. Put external
artifact and source identities in `artifact_refs`. A safe plan with missing
priority or authority may leave `work_items` empty instead of manufacturing a
placeholder node.

An external artifact described as a dependency remains outside `depends_on`.
For a `READY` plan, bind its digest-qualified identity in `artifact_refs` and
record a `DECIDED` decision whose `source_ref` is the dependency's `SRC-*` ID.
The decision must say that the dependency is current and satisfied for the
planned frontier and identify revision change as a replanning condition.
Unknown external ordering or satisfaction keeps the plan non-ready.

## Plan artifact status

`READY` means the plan artifact is grounded and actionable; it does not mean a
host activated work or mutated project state. When accepted objective,
decision owner, delivery owner, current sufficient capacity, one observable
`FIRST` outcome, graph-local dependencies, satisfied external preconditions,
and next owner are all present, use `READY`.
Every non-null human or team owner must have a current source entry. Preserve
`PROPOSED` for unresolved planning inputs such as material capacity.

## When to create a graph

Use a graph only when at least two work items have a real predecessor,
evidence join, separate owner handoff, shared constrained resource, or partial
repair path. Similar titles, overlapping files, or separate validation
commands are not enough.
