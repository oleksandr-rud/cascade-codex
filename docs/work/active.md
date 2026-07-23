# Active Work

Use this table as the single thin registry of active lanes. It is a derived
projection: lane-local state comes from a lane Task Graph when present, while
cross-workline state comes from the referenced first-class Coordination Graph.
Keep completed rows only while useful for handoff; preserve durable details in
lane packets, graphs, and reports.

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
| `W-003` | `IN_PROGRESS` | First-class graph-shaped workflow coordination without a graph runtime | root `agent-engineer`; cross-workline authority `CG-001@4` | complete current-head `CG-AG-17`; then execute the one gated `HX-031` target and both judges under `CG-AG-18` | legacy evidence preserved; `CG-AG-07..10`, `CG-AG-13..14`, and `CG-MQ-13..14` accepted; WL-12 attempt `12/12` binds HEAD `230d67a...` plus current repair digest | W-003 plan 15; `CG-AM-12`; `CG-RP-14`; exact gates, batches, integration, terminal, and transitions owned only by `docs/work/graphs/CG-001-w003-coordination-graph.md` | plan-14 architecture/Spec PASS and Standards FAIL retained historically; current `CG-BATCH-05`, `CG-IV-03`, three reviews, `CG-BATCH-06`, and `CG-TG-04` pending |

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
