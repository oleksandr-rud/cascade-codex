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

## Retained Graphs

Retain superseded and completed graph entries when they carry revision,
receipt, evidence, reconciliation, or repair history. Remove only their active
projection after the owning closeout route preserves durable evidence. An
explicit `archive-work` operation may later move an eligible frozen set to
`docs/archive/work-reports/` and replace this row with an archive pointer.

| Graph | Final Status / Revision | Durable Report / Evidence | Superseded By / Retention Reason |
|---|---|---|---|
| [`CG-001`](CG-001-w003-coordination-graph.md) | `COMPLETE`; W-003 plan `24`; CG revision `4`; `CG-TG-04 ACCEPTED` | `../reports/2026-07-23-w003-completion.md`; eligible HX-031 target plus accepted outcome and trajectory judgments | completed W-003 authority with revision, repair, materialization, batch, integration, failure, and terminal history |
