---
name: archive-work
description: Use when completed Cascade lanes, worklines, Coordination Graphs, or work reports should be compacted, moved out of docs/work, archived under docs/archive/work-reports, or audited for safe historical retention.
---

# Archive Work

Compact completed execution history without erasing definitions, failed
attempts, receipts, or graph evidence. Keep active and recent execution under
`docs/work/`; move only eligible frozen artifacts to
`docs/archive/work-reports/`.

This is an explicit maintenance route after `closeout`, not an automatic part
of every closeout. It does not complete work, accept gates, resolve stale
projections, delete evidence, rewrite frozen records, commit, or publish.

## Source Order

1. Latest user request and exact requested archive scope.
2. Current branch, diff, untracked files, and archive-target overlap.
3. `docs/work/active.md`.
4. Candidate lane packets under `docs/work/lanes/`.
5. Candidate Coordination Graphs and `docs/work/graphs/_index.md`.
6. Candidate reports and `docs/work/reports/_index.md`.
7. Every inbound reference to the candidate IDs and paths.
8. `docs/patterns/workflow/index.md` and
   `docs/patterns/workflow/graph-shaped-work.md`.
9. `docs/archive/work-reports/_index.md` and existing archive capsules.
10. Current validation evidence and repository validator.

Use `templates/archive-capsule.md` for every archive set. Use
`checklists/archive-readiness.md` before moving any artifact.

## Scope And Anti-Scope

Archive one coherent completed set: a lane and its reports, or a completed
Coordination Graph plus its connected completed lane packets and reports.
Several unrelated completed lanes require separate capsules.

Route elsewhere when:

- work is active, blocked without a completed replacement, or awaiting a gate:
  return to the owning lane or `orchestrate-work`;
- identities, duplicates, stale projections, or replacement authority are
  unresolved: use `reconcile-work-graph`;
- completion evidence or terminal acceptance is missing: use
  `validate-change` and `closeout`;
- only an active-registry row should be removed: use `closeout`;
- source/spec/product/design/brand docs are being retired: use their owning
  workflow; this skill archives execution memory only.

## Eligibility Gate

Classify every requirement as `PASS`, `BLOCKED`, or `NOT_APPLICABLE`. Archive
only when all required rows pass:

1. The candidate has a stable lane or graph ID and final status.
2. Every required lane/workline gate is accepted, or an explicitly preserved
   superseded/failed path has a named accepted replacement.
3. A Coordination Graph terminal gate is accepted for its final graph
   revision, or the graph is explicitly superseded by another retained
   authority.
4. No candidate appears as active in `docs/work/active.md`.
5. No active lane, graph, backlog item, or current plan depends on a live-path
   copy of the candidate.
6. Current graph, lane, active, and report indexes agree with source authority.
7. A durable completion or supersession report exists.
8. Every moved file is inside the requested scope, readable, and free of
   unexplained dirty overlap.
9. Every inbound reference has a disposition: update to archive path, preserve
   as an execution-era path inside a frozen artifact, or block.
10. The archive ID and destination filenames do not collide.

`BLOCKED`, `GAP`, `NOT_RUN`, exhausted attempts, and rejected paths may be
archived only as preserved history inside an otherwise eligible completed or
superseded set. Never compact those meanings into `PASS`.

## Archive Contract

Use a flat archive folder:

```text
docs/archive/work-reports/
  _index.md
  YYYY-MM-DD-<scope>-archive.md
  YYYY-MM-DD-<original-filename>.md
```

The `*-archive.md` capsule is the compact rehydration entrypoint. It records:

- archive ID, date, scope, final status, owner, and archive reason;
- lane, workline, graph, plan, and terminal identities;
- accepted outcomes plus preserved failed, blocked, superseded, and `NOT_RUN`
  history;
- source-to-archive path mapping and SHA-256 for every moved file;
- surviving external evidence and artifact references;
- active dependency and inbound-reference audit;
- validation evidence;
- rehydration order and invalidation rules.

Move frozen originals byte-for-byte. Do not rewrite their internal historical
paths, revisions, receipts, timestamps, or evidence records. The capsule maps
execution-era paths to archive paths. Update only live indexes, live routing
docs, and non-frozen inbound references.

The capsule is a compact index, not a replacement authority. The relocated raw
lane, graph, and report artifacts remain the historical authority for their
detailed records.

## Workflow

1. Inventory candidate files, statuses, gates, dependencies, reports, dirty
   state, and all inbound references.
2. Reconcile stale projections before evaluating archive eligibility. Do not
   silently repair conflicting authority inside the archive operation.
3. Fill the readiness checklist and stop on any required `BLOCKED` row.
4. Select the smallest coherent archive set and assign an `AR-XXX` ID.
5. Compute SHA-256 for every source file before moving it.
6. Create the archive capsule and add its row to
   `docs/archive/work-reports/_index.md`.
7. Move eligible originals without content edits. Preserve Git rename history
   when practical.
8. Remove live index rows for moved artifacts and add archive pointers.
9. Update non-frozen inbound references to the capsule or relocated artifact.
10. Search for stale live paths. Classify hits inside relocated frozen
    artifacts as historical; every other hit blocks completion.
11. Recompute SHA-256 after the move and require exact equality.
12. Run the Cascade validator, harness catalog check when skill routing
    changed, and `git diff --check`.
13. Report files moved, capsule path, hashes, preserved historical failures,
    checks, and any publication action as `NOT_REQUESTED`.

## Safety Rules

- Require explicit archive or compaction intent; never archive merely because
  a status says `COMPLETE`.
- Prefer a move over copy-and-delete so history remains reviewable.
- Do not archive ignored runtime evidence unless the user explicitly requests
  it and retention policy permits it.
- Do not delete a lane or graph after writing only a summary.
- Do not mutate `.artifacts/`, worktrees, branches, commits, or external
  systems.
- Preserve unrelated dirty files and stop on destination overlap.
- Keep IDs reserved forever. Archived `W-XXX`, `WL-XX`, `CG-XXX`, gate, receipt,
  and evidence IDs must never be reused.
- Rehydrating archived work does not make it active. A new lane or graph
  revision must explicitly reference the archive capsule and establish current
  authority.

## Output

- archive eligibility verdict and blocker table;
- archive ID and compact capsule path;
- exact source-to-destination map with pre/post SHA-256;
- preserved accepted, failed, blocked, superseded, and `NOT_RUN` meanings;
- updated active/current/retained/archive indexes and inbound references;
- validation commands and results;
- Git publication status and rehydration route.
