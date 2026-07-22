# Active Work

Use this table as the single thin registry of active lanes. For graph-shaped
lanes it is a derived projection: the lane Task Graph, gates, amendments, and
transition/repair history remain authoritative. Keep completed rows only while
they are useful for handoff; move durable details into reports.

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
| `W-003` | `OPEN` | Add graph-shaped workflow mechanics through reusable context rules and lane state, without a graph runtime | root `agent-engineer` | `AG-06` terminal validation and `TG-01` closeout | `WL-01` through `WL-05` accepted; documentation-impact inspection and terminal validation remain | `DG-00`, `AG-01` through `AG-05`, and `JG-CORE ACCEPTED`; attempt-1 join failure preserved; `AG-05` accepts authored/deterministic evidence only at `0e6ba3c`; 0 executed/accepted and 309 missing remain explicit; plan revision 4 / graph revision 3 unchanged | canonical lane: `docs/work/lanes/W-003-graph-shaped-workflow-mechanics.md`; task/status/merge packet: `docs/work/lanes/W-003-graph-shaped-workflow-implementation-packet.md`; receipts through `R-05C`; required join evidence `EV-JGCORE-STANDARDS-CE737F2`, `EV-JGCORE-SPEC-CE737F2`; independent WL-05 Standards/Spec review `PASS` |

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
