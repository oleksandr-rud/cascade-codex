---
name: architecture-review
description: Use before cross-boundary implementation or refactor work to review module boundaries, hidden consumers, public contracts, seams, data flow, and regression risk.
---

# Architecture Review

Use when the task has unclear blast radius, changes public contracts, touches
multiple modules, introduces or removes an abstraction, changes state-machine
behavior, or crosses integration boundaries.

## Source Order

1. Latest user request and plan.
2. Current code, imports, routes/entry points, public APIs, schemas, state, and
   generated artifacts.
3. Tests, fixtures, scenario docs, and validation commands.
4. `harness.config.yaml`, `docs/structure.md`, `docs/glossary.md`, and
   durable architecture patterns.
5. `docs/patterns/architecture-defaults/index.md` plus only the matching
   graph/spec pairs when architecture or stack selection, caching, tenancy,
   interfaces, a service, event-driven behavior, a frontend policy, native app,
   CLI, experiment, or SDK/library needs a reference default. Use the dedicated
   `frontend-architecture-defaults` pack for web frontend work.

## Checklist

1. Start one level above the requested change: name the product or codebase
   behavior, owning boundary, and public contract before naming files.
2. Classify scope: atomic, task, story, or epic.
3. Inventory direct and hidden consumers with source search for endpoint paths,
   model names, service methods, state keys, query keys, action types, public
   events, and scenario IDs when applicable.
4. Identify boundaries that must not be bypassed.
5. Evaluate whether existing modules are deep enough or too shallow, including
   the deletion test for new or suspect abstractions.
6. Classify dependency test strategy before adding or recommending a seam:
   in-process, local substitute, remote owned, or true external.
7. For persistence or data-shape changes, build an access-pattern matrix:
   actor, data owner, filter/query, sort/projection, write path, cardinality,
   freshness, lifecycle, and validation evidence.
8. Prefer existing codebase vocabulary and helper APIs.
9. When a matching architecture-default pair exists, classify it as `ADOPTED`,
   `ADAPTED`, `REJECTED`, or `GAP` from target evidence; never scaffold solely
   because it is marked `reference-default`.
10. Before stack selection, extract source-linked claims from project
    descriptions, requirements, operations constraints, current code, and
    explicit decisions. Derive applicable policies, classify each application
    unit as backend service, backend worker, web frontend, native app, CLI,
    experiment, or independently versioned/distributed library, and record
    `ELIGIBLE`, `REJECTED`, `PROOF_REQUIRED`, or `GAP` for each candidate.
11. When composing pairs, resolve architecture selection before stack. After
    the complete `stack-selection` profile is known, route application
    runtimes/frameworks/libraries through `app-stack` and the matching
    backend, frontend, native, CLI, experiment, or library extension. Route
    each application unit through the matching backend, frontend, native, CLI,
    experiment, or library infrastructure profile, then route each operated
    resource
    independently through `infrastructure` and only the compute, data,
    messaging, or delivery extension that owns it. Apply archetypes before
    extensions and verify `extends`, `requires`, `conflicts_with`, and
    `preserves` relationships. If a required pair is absent or not yet
    validated, report `GAP` or `NOT_RUN`; do not substitute another contour.
12. When new source structure is explicitly requested after adoption, preview
    a matching profile with `scripts/scaffold_architecture_default.py
    preview`. Use its `write` command only after reviewing every path; it must
    never overwrite or install dependencies.
13. Recommend smallest safe slice and validation gates.
14. Call out stale or duplicate paths that should be removed.
15. For stale, duplicate, replaced, or legacy pathways, prefer direct
    migration, replacement, deletion, and validation before recommending
    feature flags, dual paths, compatibility shims, or fallback branches.

## Output

- scope classification;
- ownership areas and hidden consumers;
- public contracts at risk;
- dependency test category for new or changed seams;
- data boundary and access-pattern findings when persistence is involved;
- source claims, applicable policies, application-unit classification, and
  candidate disposition when stack selection is involved;
- selected application-contour infrastructure profile and independently owned
  resource extensions when infrastructure is involved;
- recommended slice;
- validation gates;
- proceed, narrow, defer, or ask.

Use `checklists/deep-module-review.md` for story/epic scope or abstraction
pressure.

Load `docs/patterns/boundaries/index.md` for folder mapping, layer rules, API
contracts, adapters, seams, and agentic runtime invariants.

Use `bun scripts/cascade.ts patterns --pack
architecture-defaults --query <pair-topic>` to retrieve a matching reference
spec section before loading the graph and spec together.

For frontend work, use `bun scripts/cascade.ts patterns --pack
frontend-architecture-defaults --query <frontend-topic>` so backend, native,
CLI, experiment, and library archetypes are not loaded into the selection
context.

Use `stack-selection` as the selection authority. Use `app-stack`
as the application-contour router, then load only the matching technology
extension. Use `infrastructure` separately for compute, data, messaging, and
delivery resources. First select the matching `backend-infrastructure`,
`frontend-infrastructure`, `native-infrastructure`, `cli-infrastructure`,
`experiment-infrastructure`, or `library-infrastructure` application profile,
then load only the resource
extensions justified by its resource units. Do not treat named options as
mandatory parts of every architecture. Validate the combined
application/infrastructure evidence record with
`python3 scripts/validate_stack_selection_evidence.py validate
<stack-selection.json>`.

For a `library` unit, load `sdk-library`, `library-stack`, and
`library-infrastructure`. Require an independent owner plus a versioning,
release, distribution, or consumer boundary; do not reclassify ordinary
application-owned `src/libs` or `src/shared` folders. Default infrastructure
to no production runtime, and keep hosted APIs, data, cache, and messaging
under separate backend owners.
