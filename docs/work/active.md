# Active Work

Use this table as the single source of active work state. Keep only active
worklines and active work-graph projections here; retain completed evidence in
lane packets and durable reports.

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
| `W-004` | `OPEN` | Establish canonical cross-surface campaign, claim, policy, lifecycle, identity, artifact, execution/evaluation receipt, permission, cleanup, and composed-task contracts | `agent-engineer` | `functional-qa -> review-change -> validate-change` | shared task/campaign/claim/policy/oracle/metric/treatment/calibration/evaluation-profile schemas; simulation manifests; generated catalog; Bun runner, Codex evaluator, and target initializer; append-only execution/evaluation/calibration/aggregation artifacts; validator/docs integration | deterministic framework, collision-safe 19-file target bootstrap, and separate read-only Codex evaluation implemented; surface lanes own adapters, W-012 owns composed profiles/manifests, and W-004 owns shared contracts and final merge | 22 Bun tests pass; seven campaign graphs and catalog validate; fixture and Codex campaigns pass with `release_eligible=false`; stale/mismatched evaluator outputs and stale catalogs fail closed; cross-surface recovery/handoff/redaction/composition and target calibration remain `OPEN`/`NOT_RUN` |
| `W-005` | `OPEN` | Assess and refactor the deterministic `command` task | `agent-engineer` | `implement-change after W-004 Gate A` | command adapter, process evidence, oracles, redaction, cleanup, fixtures | W-004 Gate A; publishes process-result seam for W-008 | `docs/work/lanes/W-005-command-task-assessment-refactor.md`; implementation evidence `NOT_RUN` |
| `W-006` | `OPEN` | Assess and refactor `browser` with deterministic Playwright and optional Computer Use drivers | `agent-engineer` | `implement-change after W-004 Gate A` | browser adapter, isolated Playwright, visual action policy, structured browser-tool seam, fixtures | W-004 Gate A; publishes visual interface for W-009 and browser-tool seam for W-012 composition | `docs/work/lanes/W-006-browser-task-assessment-refactor.md`; implementation evidence `NOT_RUN` |
| `W-007` | `OPEN` | Refactor `agent-response` for standalone Codex agents, Cascade harness profiles, and typed tool-event composition | `agent-engineer` | `implement-change after W-004 Gate A` | Codex adapter, normalized agent result/tool events, standalone and Cascade profiles, composition-profile seam | W-004 Gate A; preserve W-001 catalog, grading, judging, and coverage; publish the agent seam consumed by W-012 | `docs/work/lanes/W-007-agent-response-task-assessment-refactor.md`; implementation evidence `NOT_RUN` |
| `W-008` | `OPEN` | Implement the `terminal` PTY/TUI task from the ground up | `agent-engineer` | `implement-change after W-005` | PTY adapter, typed terminal steps, transcripts/screens, fixtures | W-004 Gate A and W-005 process-result seam | `docs/work/lanes/W-008-terminal-task-ground-up.md`; implementation evidence `NOT_RUN` |
| `W-009` | `OPEN` | Implement isolated native `desktop` tasks with deterministic and Computer Use drivers | `agent-engineer` | `implement-change after W-006` | desktop environment provider, native adapter, controlled fixture, visual driver | W-004 Gate A and W-006 visual interface | `docs/work/lanes/W-009-desktop-task-ground-up.md`; implementation evidence `NOT_RUN` |
| `W-010` | `OPEN` | Implement Android-emulator and iOS-simulator `mobile` tasks with deterministic and Computer Use drivers | `agent-engineer` | `implement-change after W-004 Gate A and W-006 visual seam` | mobile environment providers, platform adapters, fixtures, coverage ledger | W-004 Gate A and W-006 visual-action seam; independent of W-009 desktop provider implementation | `docs/work/lanes/W-010-mobile-task-ground-up.md`; implementation evidence `NOT_RUN` |
| `W-012` | `OPEN` | Compose source-blind agents with command, browser, terminal, desktop, and mobile tool seams without hybrid task kinds | `agent-engineer` | `implement-change at IG-16 after IG-15` | composed profiles/manifests; fake five-contour matrix; tool-event linkage; joined results/claims; five live canary definitions | IG-15 integrated source and accepted W-005 through W-010 seams; W-004 owns shared contracts and merge; live canaries wait for IG-GB | `docs/work/lanes/W-012-agent-tool-composition.md`; implementation and live evidence `NOT_RUN` |

`W-004` through W-010 and W-012 are the only active worklines. Completed
worklines and completed work graphs remain available through their lane packets
and durable reports; they are intentionally absent from this active registry.
A deterministic local campaign runtime and framework fixtures now exist.
Target-project calibration, package publication, surface adapters, composed
agent-tool tasks, and live/platform execution remain `NOT_RUN`.

For active work graph `IG-001`, W-004 prefers `root`; W-005 through W-010 and
W-012 prefer `internal-subagent`. The user authorized root implementation for
W-004 on 2026-07-30; no delegation or user-visible task was created. Other
active work-graph rows remain `NOT_AUTHORIZED`.

The 2026-07-30 reconciliation accepts the new deterministic W-004 framework
evidence but does not promote the lane to complete. Required cross-surface,
recovery, handoff, redaction, composition, and live/platform evidence remains
`OPEN`/`NOT_RUN`, so all eight lanes correctly remain `OPEN`.

When example lanes exist under `docs/work/examples/`, they are not active work
unless copied into `docs/work/lanes/` and registered above.

## Parallel Safety

- Independent lanes may proceed concurrently.
- Dependent lanes wait for the producer lane to reach `READY_TO_MERGE` or
  `COMPLETE`.
- Conflicting file writes require one owner or serialization.
- Shared product/design uncertainty blocks all lanes that depend on it.
