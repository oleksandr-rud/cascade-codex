# Active Work

Use this table as the single thin registry of active lanes. For graph-shaped
lanes it is a derived projection: the lane Task Graph, gates, amendments, and
transition/repair history remain authoritative. Keep completed rows only while
they are useful for handoff; move durable details into reports.

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
| `W-003` | `OPEN` | Add graph-shaped workflow mechanics through reusable context rules and lane state, without a graph runtime | root `agent-engineer` | repair failed `JG-CORE` attempt 1, then reevaluate `AG-02`/`AG-03`/`AG-04` and the join | accepted semantic authority; bounded lane-template, revision-checklist, and evidence/review-receipt compatibility repairs; evaluation and closeout remain pending | `DG-00` and `AG-01 ACCEPTED`; first wave-2 branches merged at `5c4b267`; `JG-CORE FAILED` compatibility review and reopened only `WL-02`/`WL-03`/`WL-04`; plan revision 4 / graph revision 3 unchanged | canonical lane: `docs/work/lanes/W-003-graph-shaped-workflow-mechanics.md`; task/status/merge packet: `docs/work/lanes/W-003-graph-shaped-workflow-implementation-packet.md`; receipts `R-DG00`, `R-01A`, `R-01B`, `R-AG01`; `EV-JGCORE-STANDARDS-5C4B267`, `EV-JGCORE-SPEC-01` |

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
