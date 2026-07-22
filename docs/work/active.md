# Active Work

Use this table as the single thin registry of active lanes. For graph-shaped
lanes it is a derived projection: the lane Task Graph, gates, amendments, and
transition/repair history remain authoritative. Keep completed rows only while
they are useful for handoff; move durable details into reports.

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
| `W-003` | `BLOCKED` | Add graph-shaped workflow mechanics through reusable context rules and lane state, without a graph runtime | root `agent-engineer` | explicit authority for required `AG-05` bounded canary | `WL-01` through `WL-04` accepted; authored/deterministic WL-05 and merged WL-06 outputs preserved; `AG-06`/`TG-01` are affected consumers | `DG-00`, `AG-01` through `AG-04`, and `JG-CORE ACCEPTED`; required target/evaluate/judge evidence is `NOT_RUN` without spend authority; coverage 0 executed/accepted and 309 missing; plan revision 4 / graph revision 3 unchanged | canonical lane and task packet; partial `R-05C`; `R-06A`/`R-06B`; closeout report `docs/work/reports/2026-07-22-graph-shaped-workflow-mechanics.md`; failed terminal reviews preserved and must be refreshed after the blocker clears |

`W-003` is the only active lane. Completed W-001 and W-002 evidence remains in
their lane packets and indexed work reports.

When example lanes exist under `docs/work/examples/`, they are not active work
unless copied into `docs/work/lanes/` and registered above.

## Parallel Safety

- Independent lanes may proceed concurrently.
- Dependent lanes wait for the producer lane to reach `READY_TO_MERGE` or
  `COMPLETE`.
- Conflicting file writes require one owner or serialization.
- Shared product/design uncertainty blocks all lanes that depend on it.
