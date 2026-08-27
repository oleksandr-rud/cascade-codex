# Cascade Project Management capability map

| Moved capability | Former harness source | New owner | Host remainder |
| --- | --- | --- | --- |
| Tracker-ready issue, bug, story, task, enabler, or experiment definition | `issue-intake` | `define-work-item` | Search, file, assign, or mutate the target tracker only with host authority |
| Horizon, Agile MVP, version, iteration, story, and task forecasting | `plan-iterations` | `plan-project` | Bind only the accepted current iteration to target execution when applicable |
| Durable coordination and dependency joins | `orchestrate-work` | `manage-project` | Persist authorized target state and dispatch through host tools |
| Duplicate, stale, and conflicting work reconciliation | `reconcile-work-graph` | `manage-project` reconciliation mode | Read/write the target registry under user authority |
| Completion and retention readiness | `archive-work` plus closeout rules | `close-project` | Move exact files and update target indexes only when authorized |

`plan-change`, `context`, `implement-change`, `validate-change`, and target
closeout remain host capabilities because they bind current source, mutations,
commands, evidence, and durable paths. Architecture and change review route
directly to Cascade Architect.
