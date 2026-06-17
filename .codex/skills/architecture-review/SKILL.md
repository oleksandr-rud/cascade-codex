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
9. Recommend smallest safe slice and validation gates.
10. Call out stale or duplicate paths that should be removed.
11. For stale, duplicate, replaced, or legacy pathways, prefer direct
    migration, replacement, deletion, and validation before recommending
    feature flags, dual paths, compatibility shims, or fallback branches.

## Output

- scope classification;
- ownership areas and hidden consumers;
- public contracts at risk;
- dependency test category for new or changed seams;
- data boundary and access-pattern findings when persistence is involved;
- recommended slice;
- validation gates;
- proceed, narrow, defer, or ask.

Use `checklists/deep-module-review.md` for story/epic scope or abstraction
pressure.

Load `docs/patterns/boundaries.md` for folder mapping, layer rules, API
contracts, adapters, seams, and agentic runtime invariants.
