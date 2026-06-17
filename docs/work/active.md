# Active Work

Use this table as the single source of active work state. Keep completed rows
only while they are useful for handoff; move durable details into reports.

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|

No active lanes.

When example lanes exist under `docs/work/examples/`, they are not active work
unless copied into `docs/work/lanes/` and registered above.

## Parallel Safety

- Independent lanes may proceed concurrently.
- Dependent lanes wait for the producer lane to reach `READY_TO_MERGE` or
  `COMPLETE`.
- Conflicting file writes require one owner or serialization.
- Shared product/design uncertainty blocks all lanes that depend on it.
