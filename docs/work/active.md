# Active Work

Use this table as the single source of active work state. Keep completed rows
only while they are useful for handoff; move durable details into reports.

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
| `W-001` | `COMPLETE` | Complete live execution and golden evaluation for all 290 current Cascade harness scenarios | `agent-engineer` | none | `evals/harness/`; `scripts/run_harness_evals.py`; `.artifacts/harness-evals/`; harness evaluation report | one confirmed regression is intentionally unaccepted | `docs/work/lanes/W-001-harness-evaluation-lab.md`; `.artifacts/harness-evals/coverage-final-20260710.json`; `docs/work/reports/2026-07-09-harness-evaluation-lab.md` |

`W-001` is complete; there are no active lanes.

When example lanes exist under `docs/work/examples/`, they are not active work
unless copied into `docs/work/lanes/` and registered above.

## Parallel Safety

- Independent lanes may proceed concurrently.
- Dependent lanes wait for the producer lane to reach `READY_TO_MERGE` or
  `COMPLETE`.
- Conflicting file writes require one owner or serialization.
- Shared product/design uncertainty blocks all lanes that depend on it.
