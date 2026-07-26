# Work Archive Readiness Checklist

## Authority

- [ ] Archive scope is bound to the exact current closeout set, or a direct
      historical-cleanup request names the scope.
- [ ] Candidate lane, workline, graph, report, revision, and owner identities
      are known.
- [ ] Final lane and graph source files agree with their live indexes.
- [ ] Required terminal gates are accepted, or supersession authority is
      explicit.
- [ ] Historical `FAIL`, `BLOCKED`, `NOT_RUN`, exhausted, and superseded
      records have not been relabeled.

## Activity And Dependencies

- [ ] No candidate row remains active in `docs/work/active.md`.
- [ ] No active lane, graph, plan, backlog item, or current consumer requires
      the candidate at its live path.
- [ ] Duplicate, stale, or conflicting identity was resolved through
      `reconcile-work-graph`.
- [ ] A durable completion or supersession report exists.

## Files And References

- [ ] Current diff and untracked files were inspected.
- [ ] Every candidate source file and destination path was enumerated.
- [ ] Destination filenames do not collide.
- [ ] Every inbound reference is classified as update, frozen historical
      provenance, or blocker.
- [ ] Pre-move SHA-256 is recorded for every file.

## Archive And Validation

- [ ] One compact `AR-XXX` capsule uses `templates/archive-capsule.md`.
- [ ] Frozen originals moved without content edits.
- [ ] Post-move SHA-256 equals pre-move SHA-256 for every original.
- [ ] Live indexes no longer present moved artifacts as current or retained.
- [ ] `docs/archive/work-reports/_index.md` links the capsule and raw artifacts.
- [ ] Non-frozen inbound references point to the archive.
- [ ] Stale live-path search has no unexplained hits.
- [ ] Cascade validator passes.
- [ ] Harness catalog passes when skill or route wiring changed.
- [ ] `git diff --check` passes.
- [ ] Commit, push, and publication remain separate authority.
- [ ] Final closeout reports `ARCHIVED`, `ARCHIVE_DEFERRED`, or
      `NOT_APPLICABLE` separately from lane/graph completion.
