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
projection after the owning closeout route preserves durable evidence.
`closeout` then automatically invokes `archive-work`; an eligible frozen set
moves to `docs/archive/work-reports/`, while `ARCHIVE_DEFERRED` retains this row
with its blocker.

| Graph | Final Status / Revision | Durable Report / Evidence | Superseded By / Retention Reason |
|---|---|---|---|

## Archived Graphs

| Graph | Archive | Final Status / Revision | Detailed Authority |
|---|---|---|---|
| `CG-001` | [`AR-001`](../../archive/work-reports/2026-07-24-w003-cg001-archive.md) | `COMPLETE`; W-003 plan `24`; graph revision `4`; `CG-TG-04 ACCEPTED` | archived graph, lane packets, completion report, blocker history, receipts, and focused dual-judge evidence |
