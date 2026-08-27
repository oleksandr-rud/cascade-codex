# Lean Agile delivery rules

## Smallest useful hierarchy

Use `version -> iteration -> story -> task`. Do not add epics, themes,
ceremonies, estimates, points, or parallel backlog records unless a supplied
source makes them necessary.

- A version is an accepted delivery outcome. Exactly one version is the MVP;
  later versions are increments or options.
- An iteration is a coherent step toward one version. It is not a timebox
  unless cadence and dates are supplied by current capacity evidence.
- A story is an observable behavior, enabler, or experiment with acceptance
  references.
- A task is the smallest target-host action needed for one story. It carries no
  execution authority.

## MVP-first planning

Product owns MVP content and ordering. Project Management decomposes only an
accepted MVP. A `READY` Agile delivery plan has:

- one MVP version at sequence 1 with version acceptance references;
- one first MVP iteration at sequence 1 with current capacity and acceptance
  references;
- at least one vertical `USER_STORY` with actor, need, value, outcome, and
  acceptance references; and
- at least one grounded, acceptance-bound task for every first-iteration story.

For a `READY` plan, `capacity_ref` is exactly a current `SRC-*` ID or the full
supplied digest-qualified capacity identity. Every story in the first MVP
iteration and every task under those stories is `READY`; an assessment,
enabler, experiment, or QA-related task is not exempt from that state rule.

Each acceptance reference in a `READY` plan resolves to a current `SRC-*`
source or a digest-qualified acceptance artifact. An undigested label is a gap,
not a release or iteration gate.

Split `NAME@sha256:value` into source `identity: NAME` and
`digest: sha256:value`; do not store the already-qualified string as the
identity and then add the digest again. Acceptance references may use the
source ID or the exact original qualified string. A current external dependency
also needs its exact qualified identity in a version/story `artifact_refs` and
a `DECIDED` satisfaction decision bound to its source ID.

Later versions need a promotion condition and remain `PROPOSED`. Fully
decompose the first MVP iteration; keep later scope at the highest useful level
until learning, priority, and capacity are current. This progressive
elaboration reduces stale tasks and false commitments.

## Dependencies and state

Story dependencies contain only story IDs. Task dependencies contain only task
IDs. Parent references (`version_id`, `iteration_id`, and `story_id`) carry the
hierarchy. External product, research, quality, or evidence artifacts remain in
artifact or acceptance references, not graph-local dependencies.

The plan may be `READY`, `PROPOSED`, `GAP`, or `BLOCKED`. It never activates a
version, iteration, story, or task. The target host separately accepts and
executes the first frontier; `cascade-project-management:manage-project`
assesses the resulting state and receipts.

## QA boundary

QA is conditional per accepted behavior or material risk. A story acceptance
reference can route to `cascade-qa:plan-quality` or `cascade-qa:design-tests`
when quality scope is missing. A current digest-bound quality artifact is
consumed directly. Agile vocabulary alone does not create a QA handoff.
