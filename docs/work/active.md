# Active Work

Use this table as the single thin registry of active work. It is a derived
projection: lane-local state comes from a lane Task Graph when present, while
cross-workline state comes from the referenced work graph or first-class
Coordination Graph. Keep only active worklines and active graph projections
here; retain completed evidence in lane packets, durable reports, and archive
capsules.

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
| `W-004` | `BLOCKED` | Establish canonical cross-surface campaign, claim, policy, lifecycle, identity, artifact, execution/evaluation receipt, permission, cleanup, and composed-task contracts | `agent-engineer` | explicit human replan before attempt-5 repair | shared task/campaign/claim/policy/oracle/metric/treatment/calibration/evaluation-profile schemas; simulation manifests; generated catalog; Bun runner, Codex evaluator, and target initializer; append-only execution/evaluation/calibration/aggregation artifacts; validator/docs integration | accepted WG-001-N03; N04/N05 remain unaccepted; surface lanes own adapters, W-012 owns composed profiles/manifests, and W-004 owns shared contracts and final merge | required attempt-4 GF-004/GF-101 receipts are `FAIL`; N04/N05 exhausted attempt 4 of 4; N06 and Gate A remain blocked |
| `W-005` | `OPEN` | Assess and refactor the deterministic `command` task | `agent-engineer` | `implement-change after W-004 Gate A` | command adapter, process evidence, oracles, redaction, cleanup, fixtures | W-004 Gate A; publishes process-result seam for W-008 | a shared `direct-process` primitive exists; command manifests, failure/recovery fixtures, handoff evidence, and lane acceptance remain `NOT_RUN` |
| `W-006` | `OPEN` | Assess and refactor `browser` with deterministic Playwright and optional Computer Use drivers | `agent-engineer` | `implement-change after W-004 Gate A` | browser adapter, isolated Playwright, visual action policy, structured browser-tool seam, fixtures | W-004 Gate A; publishes visual interface for W-009 and browser-tool seam for W-012 composition | isolated Playwright harness tooling exists; campaign adapter, deterministic browser evidence, and Computer Use remain `NOT_RUN` |
| `W-007` | `OPEN` | Refactor `agent-response` for standalone Codex agents, Cascade harness profiles, and typed tool-event composition | `agent-engineer` | `implement-change after W-004 Gate A` | Codex adapter, normalized agent result/tool events, standalone and Cascade profiles, composition-profile seam | W-004 Gate A; preserve W-001 catalog, grading, judging, and coverage; publish the agent seam consumed by W-012 | W-004's read-only Codex evaluator exists; the W-007 agent task runtime, profiles, tool-event seam, and live canaries remain `NOT_RUN` |
| `W-008` | `OPEN` | Implement the `terminal` PTY/TUI task from the ground up | `agent-engineer` | `implement-change after W-005` | PTY adapter, typed terminal steps, transcripts/screens, fixtures | W-004 Gate A and W-005 process-result seam | `docs/work/lanes/W-008-terminal-task-ground-up.md`; implementation evidence `NOT_RUN` |
| `W-009` | `OPEN` | Implement isolated native `desktop` tasks with deterministic and Computer Use drivers | `agent-engineer` | `implement-change after W-006` | desktop environment provider, native adapter, controlled fixture, visual driver | W-004 Gate A and W-006 visual interface | `docs/work/lanes/W-009-desktop-task-ground-up.md`; implementation evidence `NOT_RUN` |
| `W-010` | `OPEN` | Implement Android-emulator and iOS-simulator `mobile` tasks with deterministic and Computer Use drivers | `agent-engineer` | `implement-change after W-004 Gate A and W-006 visual seam` | mobile environment providers, platform adapters, fixtures, coverage ledger | W-004 Gate A and W-006 visual-action seam; independent of W-009 desktop provider implementation | `docs/work/lanes/W-010-mobile-task-ground-up.md`; implementation evidence `NOT_RUN` |
| `W-012` | `OPEN` | Compose source-blind agents with command, browser, terminal, desktop, and mobile tool seams without hybrid task kinds | `agent-engineer` | `implement-change at WG-001-N16 after WG-001-N15` | composed profiles/manifests; fake five-contour matrix; tool-event linkage; joined results/claims; five live canary definitions | WG-001-N15 integrated source and accepted W-005 through W-010 seams; W-004 owns shared contracts and merge; live canaries wait for WG-001-GB | `docs/work/lanes/W-012-agent-tool-composition.md`; implementation and live evidence `NOT_RUN` |

`W-004` through W-010 and W-012 are the only active worklines. Completed
worklines and completed work graphs remain available through their lane packets
and durable reports; they are intentionally absent from this active registry.
A deterministic local campaign runtime and framework fixtures exist. The
current implementation base is `master@21ba5288` plus preserved current-source
work; WG-001-N03 is accepted, while implemented WG-001-N04/N05 are in review.
Exact Bun 1.3.3 validation ran through an ephemeral `pnpm dlx` runner. The
generated harness catalog contains 44 skills and 368 scenarios. Target-project
calibration, package publication, accepted surface adapters, composed
agent-tool tasks, and live/platform execution remain `NOT_RUN`.

For active work graph `WG-001`, W-004 prefers `root`; W-005 through W-010 and
W-012 prefer `internal-subagent`. The current W-004 authorization was consumed
by completed N04/N05 implementation attempts in root task
`019fb3c2-bd84-7282-9df0-5477a8321233`. No later implementation node is
dispatched or authorized.

The 2026-07-31 plan-revision-13 repair produced N04/N05 fixed point
`0ccb25a3eb88d58289d47e920d5924e78390dd11b69e20b354c4ce53d069d940`
in root task `019fb3c2-bd84-7282-9df0-5477a8321233`. Artifact and policy
deterministic evidence plus generated-starter coverage pass, but independent
GF-004/GF-101 review is `NOT_RUN`,
so both nodes remain `REVIEW`. Cross-surface, specialized handoff,
composition, Gate A, and live/platform evidence remains `OPEN`/`NOT_RUN`, so
all eight lanes correctly remain `OPEN`.

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
