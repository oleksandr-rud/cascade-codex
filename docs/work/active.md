# Active Work

Use this table as the single thin registry of active lanes. It is a derived
projection: lane-local state comes from a lane Task Graph when present, while
cross-workline state comes from the referenced first-class Coordination Graph.
Remove completed rows in their owning closeout. Preserve durable details in
the completion report and the automatic `archive-work` result.

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
No lanes are active. W-002 and W-003 were archived through the scoped
historical-cleanup route in `docs/archive/work-reports/`. W-001 predates the
automatic archive chain and remains retained pending explicit disposition of
its failed full-catalog acceptance gate.

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
