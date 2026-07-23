# Active Work

Use this table as the single thin registry of active lanes. It is a derived
projection: lane-local state comes from a lane Task Graph when present, while
cross-workline state comes from the referenced first-class Coordination Graph.
Keep completed rows only while useful for handoff; preserve durable details in
lane packets, graphs, and reports.

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
| `W-003` | `BLOCKED` | First-class graph-shaped workflow coordination without a graph runtime | root `agent-engineer`; cross-workline authority `CG-001@3` | explicit authority/amendment for another bounded WL-12 repair/review; canary prohibited meanwhile | legacy evidence preserved; `CG-AG-07..10`, `CG-AG-13..14`, `CG-MQ-13..14`, and `CG-BATCH-03` preserved; WL-12 review attempt `3/3` failed | W-003 plan 6; `CG-AM-03`; `CG-RP-05`; exact transports/materializations/batches/terminal owned only by `docs/work/graphs/CG-001-w003-coordination-graph.md` | final Spec review failed at `5c1fe931...`; `CG-AG-15`, `CG-AG-16`, and `CG-TG-03` remain blocked |

`W-003` is the only active lane. Completed W-001 and W-002 evidence remains in
their lane packets and indexed work reports.

When example lanes exist under `docs/work/examples/`, they are not active work
unless copied into `docs/work/lanes/` and registered above.

## Parallel Safety

- Independent lanes may proceed concurrently.
- Dependent work waits for the producer's named accepted gate, current evidence,
  immutable transport, and required consumer presence proof.
- Conflicting file writes require one owner or serialization.
- Shared product/design uncertainty blocks all lanes that depend on it.
- Dedicated-worktree changes enter the active worktree only through the
  Coordination Graph's root-owned Materialization Queue; materialization does
  not authorize a current-branch commit.
