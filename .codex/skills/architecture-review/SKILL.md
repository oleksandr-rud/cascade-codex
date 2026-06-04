---
name: architecture-review
description: Review module boundaries, hidden consumers, public contracts, seams, and regression risk before cross-boundary implementation or refactor work.
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
4. `docs/glossary.md` and durable architecture patterns.

## Checklist

1. Classify scope: atomic, task, story, or epic.
2. Inventory direct and hidden consumers.
3. Identify boundaries that must not be bypassed.
4. Evaluate whether existing modules are deep enough or too shallow.
5. Classify dependency test strategy before adding or recommending a seam:
   in-process, local substitute, remote owned, or true external.
6. Prefer existing codebase vocabulary and helper APIs.
7. Recommend smallest safe slice and validation gates.
8. Call out stale or duplicate paths that should be removed.

## Output

- scope classification;
- ownership areas and hidden consumers;
- public contracts at risk;
- dependency test category for new or changed seams;
- recommended slice;
- validation gates;
- proceed, narrow, defer, or ask.

Use `checklists/deep-module-review.md` for story/epic scope or abstraction
pressure.

Load `docs/patterns/boundaries.md` for folder mapping, layer rules, API
contracts, adapters, seams, and agentic runtime invariants.
