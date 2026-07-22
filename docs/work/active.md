# Active Work

Use this table as the single source of active work state. Keep completed rows
only while they are useful for handoff; move durable details into reports.

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
| `W-003` | `OPEN` | Add graph-shaped workflow mechanics through reusable context rules and lane state, without a graph runtime | root `agent-engineer` | `AG-01` durable semantics and selective context | wave 1 semantic thread; parallel wave 2 lane/execution/evidence threads; root integration join; evaluation and closeout threads | `DG-00 ACCEPTED` at `28d69ec70396a31125b7b989e5066149eff8a8ae`; `WL-01` ready; plan revision 4 / graph revision 3 remains current | canonical lane: `docs/work/lanes/W-003-graph-shaped-workflow-mechanics.md`; task/status/merge packet: `docs/work/lanes/W-003-graph-shaped-workflow-implementation-packet.md`; receipt `R-DG00` |

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
