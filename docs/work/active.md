# Active Work

Use this table as the single thin registry of active work. It is a derived
projection: lane-local state comes from a lane Task Graph when present, while
cross-workline state comes from the referenced work graph or first-class
Coordination Graph. Keep only active worklines and active graph projections
here; retain completed evidence in lane packets, durable reports, and archive
capsules.

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
| `W-004` | `OPEN` | Establish canonical cross-surface campaign, claim, policy, lifecycle, identity, artifact, execution/evaluation receipt, permission, cleanup, and composed-task contracts | `agent-engineer` | restore Bun 1.3.3, authorize, then `implement-change` at `IG-03` | shared task/campaign/claim/policy/oracle/metric/treatment/calibration/evaluation-profile schemas; simulation manifests; generated catalog; Bun runner, Codex evaluator, and target initializer; append-only execution/evaluation/calibration/aggregation artifacts; validator/docs integration | deterministic framework, collision-safe 19-file target bootstrap, and separate read-only Codex evaluation implemented; surface lanes own adapters, W-012 owns composed profiles/manifests, and W-004 owns shared contracts and final merge | pre-merge framework evidence is preserved but does not bind current `master@60fdc246`; current-HEAD Bun tests, catalog/self-tests, recovery/handoff/redaction/composition, and target calibration remain `OPEN`/`NOT_RUN` |
| `W-005` | `OPEN` | Assess and refactor the deterministic `command` task | `agent-engineer` | `implement-change after W-004 Gate A` | command adapter, process evidence, oracles, redaction, cleanup, fixtures | W-004 Gate A; publishes process-result seam for W-008 | a shared `direct-process` primitive exists; command manifests, failure/recovery fixtures, handoff evidence, and lane acceptance remain `NOT_RUN` |
| `W-006` | `OPEN` | Assess and refactor `browser` with deterministic Playwright and optional Computer Use drivers | `agent-engineer` | `implement-change after W-004 Gate A` | browser adapter, isolated Playwright, visual action policy, structured browser-tool seam, fixtures | W-004 Gate A; publishes visual interface for W-009 and browser-tool seam for W-012 composition | isolated Playwright harness tooling exists; campaign adapter, deterministic browser evidence, and Computer Use remain `NOT_RUN` |
| `W-007` | `OPEN` | Refactor `agent-response` for standalone Codex agents, Cascade harness profiles, and typed tool-event composition | `agent-engineer` | `implement-change after W-004 Gate A` | Codex adapter, normalized agent result/tool events, standalone and Cascade profiles, composition-profile seam | W-004 Gate A; preserve W-001 catalog, grading, judging, and coverage; publish the agent seam consumed by W-012 | W-004's read-only Codex evaluator exists; the W-007 agent task runtime, profiles, tool-event seam, and live canaries remain `NOT_RUN` |
| `W-008` | `OPEN` | Implement the `terminal` PTY/TUI task from the ground up | `agent-engineer` | `implement-change after W-005` | PTY adapter, typed terminal steps, transcripts/screens, fixtures | W-004 Gate A and W-005 process-result seam | `docs/work/lanes/W-008-terminal-task-ground-up.md`; implementation evidence `NOT_RUN` |
| `W-009` | `OPEN` | Implement isolated native `desktop` tasks with deterministic and Computer Use drivers | `agent-engineer` | `implement-change after W-006` | desktop environment provider, native adapter, controlled fixture, visual driver | W-004 Gate A and W-006 visual interface | `docs/work/lanes/W-009-desktop-task-ground-up.md`; implementation evidence `NOT_RUN` |
| `W-010` | `OPEN` | Implement Android-emulator and iOS-simulator `mobile` tasks with deterministic and Computer Use drivers | `agent-engineer` | `implement-change after W-004 Gate A and W-006 visual seam` | mobile environment providers, platform adapters, fixtures, coverage ledger | W-004 Gate A and W-006 visual-action seam; independent of W-009 desktop provider implementation | `docs/work/lanes/W-010-mobile-task-ground-up.md`; implementation evidence `NOT_RUN` |
| `W-012` | `OPEN` | Compose source-blind agents with command, browser, terminal, desktop, and mobile tool seams without hybrid task kinds | `agent-engineer` | `implement-change at IG-16 after IG-15` | composed profiles/manifests; fake five-contour matrix; tool-event linkage; joined results/claims; five live canary definitions | IG-15 integrated source and accepted W-005 through W-010 seams; W-004 owns shared contracts and merge; live canaries wait for IG-GB | `docs/work/lanes/W-012-agent-tool-composition.md`; implementation and live evidence `NOT_RUN` |

`W-004` through W-010 and W-012 are the only active worklines. Completed
worklines and completed work graphs remain available through their lane packets
and durable reports; they are intentionally absent from this active registry.
A deterministic local campaign runtime and framework fixtures exist. The
current implementation baseline is clean `master@60fdc246`; its generated
harness catalog contains 44 skills and 368 scenarios. Current-HEAD Bun
validation has not run because Bun 1.3.3 is unavailable on the active shell
`PATH`. Target-project calibration, package publication, accepted surface
adapters, composed agent-tool tasks, and live/platform execution remain
`NOT_RUN`.

For active work graph `IG-001`, W-004 prefers `root`; W-005 through W-010 and
W-012 prefer `internal-subagent`. The earlier W-004 implementation authorization
was consumed by the preserved framework attempt; no implementation is currently
dispatched and every active work-graph row is `NOT_AUTHORIZED`. The next
candidate is W-004 `IG-03`, which remains `PENDING` until Bun 1.3.3 is available,
the current source/catalog preflight passes, and implementation is explicitly
authorized.

The 2026-07-30 revision-9 reconciliation preserves the deterministic W-004
framework evidence as historical, source-bound evidence but does not accept it
for current `HEAD` or promote the lane to complete. Required current-source,
cross-surface, recovery, handoff, redaction, composition, and live/platform
evidence remains `OPEN`/`NOT_RUN`, so all eight lanes correctly remain `OPEN`.

Completed rows leave this registry in their owning closeout after durable
evidence is preserved and `archive-work` records `ARCHIVED`,
`ARCHIVE_DEFERRED`, or `NOT_APPLICABLE`.

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
