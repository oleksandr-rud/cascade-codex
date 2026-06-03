# Active Work

Use this table as the single source of active work state. Keep completed rows
only while they are useful for handoff; move durable details into reports.

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
| W-001 | `<OPEN | IN_PROGRESS | BLOCKED | READY_TO_MERGE | COMPLETE>` | `<REQUEST>` | `<PULSE | ROLE | USER>` | `<SKILL_OR_COMMAND>` | `<FILES_OR_AREAS>` | `<LANE_OR_DECISION>` | `<COMMAND_OR_REPORT>` |

## Parallel Safety

- Independent lanes may proceed concurrently.
- Dependent lanes wait for the producer lane to reach `READY_TO_MERGE` or
  `COMPLETE`.
- Conflicting file writes require one owner or serialization.
- Shared product/design uncertainty blocks all lanes that depend on it.

