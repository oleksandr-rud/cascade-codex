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
| `AR-003` | 2026-08-03 | WG-002 stack naming migration / W-013-W-017 | `COMPLETE`; unrelated dirty-checkout failure and live limits preserved | [`2026-08-03-wg002-stack-naming-archive.md`](2026-08-03-wg002-stack-naming-archive.md) | [`WG-002`](2026-08-03-stack-naming-work-graph.md), [`W-013`](2026-08-03-W-013-stack-naming-integration.md), [`W-014`](2026-08-03-W-014-app-stack-migration.md), [`W-015`](2026-08-03-W-015-infrastructure-stack-migration.md), [`W-016`](2026-08-03-W-016-stack-retrieval-docs-migration.md), [`W-017`](2026-08-03-W-017-stack-migration-validation-closeout.md) |
| `AR-004` | 2026-08-03 | WG-003 contour infrastructure / W-018-W-024 | `COMPLETE`; provider, deployment, and release limits preserved | [`2026-08-03-wg003-contour-infrastructure-archive.md`](2026-08-03-wg003-contour-infrastructure-archive.md) | [`WG-003`](2026-08-03-contour-infrastructure-work-graph.md), [`W-018`](2026-08-03-W-018-contour-infrastructure-integration.md), [`W-019`](2026-08-03-W-019-frontend-fullstack-infrastructure.md), [`W-020`](2026-08-03-W-020-backend-infrastructure.md), [`W-021`](2026-08-03-W-021-native-cli-experiment-infrastructure.md), [`W-022`](2026-08-03-W-022-infrastructure-retrieval-docs.md), [`W-023`](2026-08-03-W-023-infrastructure-profile-validation-closeout.md), [`W-024`](2026-08-03-W-024-sdk-library-application-contour.md) |
| `AR-005` | 2026-08-03 | W-025 persona simulation refinement loop | `COMPLETE`; live effectiveness and promotion limits preserved | [`2026-08-03-w025-persona-refinement-archive.md`](2026-08-03-w025-persona-refinement-archive.md) | [`lane`](2026-08-03-W-025-persona-simulation-refinement-loop.md), [`completion`](2026-08-03-persona-simulation-refinement-loop-completion.md) |
| `AR-006` | 2026-08-03 | W-026 persona provenance and defaults hardening | `COMPLETE`; live refinement quality, promotion, calibration, and release limits preserved | [`2026-08-03-w026-persona-provenance-defaults-hardening-archive.md`](2026-08-03-w026-persona-provenance-defaults-hardening-archive.md) | [`lane`](2026-08-03-W-026-persona-provenance-defaults-hardening.md), [`completion`](2026-08-03-persona-provenance-defaults-hardening.md) |
| `AR-007` | 2026-08-03 | W-027 harness/product simulation separation | `COMPLETE`; target execution, calibration, release, and W-004 limits preserved | [`2026-08-03-w027-harness-product-simulation-separation-archive.md`](2026-08-03-w027-harness-product-simulation-separation-archive.md) | [`lane`](2026-08-03-W-027-harness-product-simulation-separation.md), [`completion`](2026-08-03-harness-product-simulation-separation.md) |
| `AR-008` | 2026-08-03 | W-028 top-level evaluation root separation | `COMPLETE`; product execution, calibration, release, and W-004 limits preserved | [`2026-08-03-w028-top-level-evaluation-root-separation-archive.md`](2026-08-03-w028-top-level-evaluation-root-separation-archive.md) | [`lane`](2026-08-03-W-028-top-level-evaluation-root-separation.md), [`completion`](2026-08-03-top-level-evaluation-root-separation.md) |
| `AR-009` | 2026-08-04 | W-029 persona and simulation gap closure | `COMPLETE`; real persona, target simulation, model-backed generation, independent review, and release limits preserved | [`2026-08-04-w029-persona-simulation-gap-closure-archive.md`](2026-08-04-w029-persona-simulation-gap-closure-archive.md) | [`lane`](2026-08-04-W-029-persona-simulation-gap-closure.md), [`completion`](2026-08-04-persona-simulation-gap-closure.md) |
| `AR-010` | 2026-08-04 | W-030 product context brief generation | `COMPLETE`; real persona, target simulation, human calibration, independent product validation, and release limits preserved | [`2026-08-04-w030-product-context-brief-generation-archive.md`](2026-08-04-w030-product-context-brief-generation-archive.md) | [`lane`](2026-08-04-W-030-product-context-brief-generation.md), [`completion`](2026-08-04-product-context-brief-generation.md) |
