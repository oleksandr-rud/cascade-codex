# Archived Work Reports

This folder stores compact archive capsules and relocated frozen execution
artifacts for completed or explicitly superseded Cascade work.

Use `docs/work/` for active and recent execution. After a lane or graph
completes, `closeout` automatically invokes `archive-work`; this archive is
written only when eligibility, dependency, reference, and digest checks pass.
Blocked maintenance remains in `docs/work/` as `ARCHIVE_DEFERRED`.

## Rules

- Every archive set has one `AR-XXX` capsule.
- Relocated lane, graph, and report files remain detailed historical authority.
- Capsules preserve accepted outcomes and explicitly list failed, blocked,
  `NOT_RUN`, exhausted, and superseded history.
- Original work IDs and graph IDs remain reserved forever.
- Archived work is not active and cannot be resumed by editing archived files.
- Rehydration starts from the capsule and creates or references explicit current
  authority when new work is needed.

## Archive Sets

| Archive | Date | Scope | Final Status | Capsule | Detailed Artifacts |
|---|---|---|---|---|---|
| `AR-001` | 2026-07-24 | W-003 / CG-001 graph-shaped workflow mechanics | `COMPLETE`; `CG-TG-04 ACCEPTED` | [`2026-07-24-w003-cg001-archive.md`](2026-07-24-w003-cg001-archive.md) | [`W-003 plan`](2026-07-24-W-003-graph-shaped-workflow-mechanics.md), [`implementation packet`](2026-07-24-W-003-graph-shaped-workflow-implementation-packet.md), [`CG-001`](2026-07-24-CG-001-w003-coordination-graph.md), [`completion`](2026-07-24-2026-07-23-w003-completion.md), [`reconciliation`](2026-07-24-2026-07-23-w003-coordination-graph-reconciliation.md), [`canary blocker`](2026-07-24-2026-07-23-w003-terminal-canary-blocker.md), [`review exhaustion`](2026-07-24-2026-07-23-w003-final-review-exhaustion.md), [`revision-4 report`](2026-07-24-2026-07-22-graph-shaped-workflow-mechanics.md) |
| `AR-002` | 2026-07-24 | W-002 judged harness evaluations | `COMPLETE`; residual campaign limits preserved | [`2026-07-24-w002-judged-harness-evals-archive.md`](2026-07-24-w002-judged-harness-evals-archive.md) | [`lane`](2026-07-24-W-002-judged-harness-evals.md), [`judge-builder design`](2026-07-24-W-002-judge-eval-builder-design.md), [`completion report`](2026-07-24-2026-07-22-judged-harness-evaluations.md) |
