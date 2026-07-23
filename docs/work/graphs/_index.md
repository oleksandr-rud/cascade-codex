# Coordination Graph Index

This folder contains first-class cross-workline Coordination Graph entries.
Use `docs/work/graph-template.md` to create `CG-XXX-slug.md` only when at least
two canonical worklines have a real dependency, evidence/batch join,
materialization or integrated-validation boundary, invalidation relationship,
or partial-repair route.

A Coordination Graph is not a workline, lane, generated/source spec, worker,
or runtime. It references authoritative definitions and lane packets rather
than copying them. `docs/work/active.md` and lane workline rows are derived
projections of graph state.

## Current Graphs

| Graph | Goal / Worklines | Owner | Plan / Graph Revision | Status | Terminal Gate | Next Gate |
|---|---|---|---|---|---|---|
| [`CG-001`](CG-001-w003-coordination-graph.md) | W-003 revision-6 repair coordination with WL-13/WL-14 transports, root no-commit materialization, current fixed point, and replacement canary | root `agent-engineer` | W-003 plan `6` / CG `3` | `BLOCKED`; WL-12 review attempt `3/3` failed | `CG-TG-03` | explicit authority/amendment before another repair/review |

## Retained Graphs

Retain superseded and completed graph entries when they carry revision,
receipt, evidence, reconciliation, or repair history. Remove only their active
projection after the owning closeout route preserves durable evidence.

| Graph | Final Status / Revision | Durable Report / Evidence | Superseded By / Retention Reason |
|---|---|---|---|
