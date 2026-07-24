# Active Work

Use this table as the single thin registry of active lanes. It is a derived
projection: lane-local state comes from a lane Task Graph when present, while
cross-workline state comes from the referenced first-class Coordination Graph.
Keep completed rows only while useful for handoff; preserve durable details in
lane packets, graphs, and reports.

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
No lanes are active. Completed W-001, W-002, and W-003 evidence remains in
their lane packets, Coordination Graph, and indexed work reports.

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
