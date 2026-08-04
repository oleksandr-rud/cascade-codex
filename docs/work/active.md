# Active Work

Use this table as the single thin registry of active work. It is a derived
projection: lane-local state comes from a lane Task Graph when present, while
cross-workline state comes from the referenced work graph or first-class
Coordination Graph. Keep only active worklines and active graph projections
here; retain completed evidence in lane packets, durable reports, and archive
capsules.

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
| `W-004` | `IN_PROGRESS` | Establish canonical cross-surface campaign, claim, policy, lifecycle, identity, artifact, execution/evaluation receipt, permission, cleanup, and composed-task contracts | `agent-engineer` | independent current-source GF-004/GF-101 attempt-5 review | shared task/campaign/claim/policy/oracle/metric/treatment/calibration/evaluation-profile schemas; simulation manifests and intakes; generated catalog; Bun runner, Codex evaluator, target initializer, multi-surface session controller; segmented append-only execution/session/evaluation/calibration/aggregation artifacts; validator/docs integration | W-029 is terminal; surface lanes own real adapters, W-012 owns composed profiles/manifests, W-032 owns product-intake readiness, and W-004 owns shared contracts and final merge | plan revision 28/work-graph revision 12; local regression and immutable run `wg001-resume-hardening-20260804-r7` pass at catalog `73e0a208...` and manifest `58255c06...`; N18 is locally in review; independent review, Gate A, real-surface/live-platform proof, and release eligibility remain `NOT_RUN` |
| `W-005` | `OPEN` | Assess and refactor the deterministic `command` task | `agent-engineer` | `implement-change after W-004 Gate A` | command adapter, process evidence, oracles, redaction, cleanup, fixtures | W-004 Gate A; publishes process-result seam for W-008 | a shared `direct-process` primitive exists; command manifests, failure/recovery fixtures, handoff evidence, and lane acceptance remain `NOT_RUN` |
| `W-006` | `OPEN` | Assess and refactor `browser` with deterministic Playwright and optional Computer Use drivers | `agent-engineer` | `implement-change after W-004 Gate A` | browser adapter, isolated Playwright, visual action policy, structured browser-tool seam, fixtures | W-004 Gate A; publishes visual interface for W-009 and browser-tool seam for W-012 composition | isolated Playwright harness tooling exists; campaign adapter, deterministic browser evidence, and Computer Use remain `NOT_RUN` |
| `W-007` | `OPEN` | Refactor `agent-response` for standalone Codex agents, Cascade harness profiles, and typed tool-event composition | `agent-engineer` | `implement-change after W-004 Gate A` | Codex adapter, normalized agent result/tool events, standalone and Cascade profiles, composition-profile seam | W-004 Gate A; preserve W-001 catalog, grading, judging, and coverage; publish the agent seam consumed by W-012 | W-004's read-only Codex evaluator exists; the W-007 agent task runtime, profiles, tool-event seam, and live canaries remain `NOT_RUN` |
| `W-008` | `OPEN` | Implement the `terminal` PTY/TUI task from the ground up | `agent-engineer` | `implement-change after W-005` | PTY adapter, typed terminal steps, transcripts/screens, fixtures | W-004 Gate A and W-005 process-result seam | `docs/work/lanes/W-008-terminal-task-ground-up.md`; implementation evidence `NOT_RUN` |
| `W-009` | `OPEN` | Implement isolated native `desktop` tasks with deterministic and Computer Use drivers | `agent-engineer` | `implement-change after W-006` | desktop environment provider, native adapter, controlled fixture, visual driver | W-004 Gate A and W-006 visual interface | `docs/work/lanes/W-009-desktop-task-ground-up.md`; implementation evidence `NOT_RUN` |
| `W-010` | `OPEN` | Implement Android-emulator and iOS-simulator `mobile` tasks with deterministic and Computer Use drivers | `agent-engineer` | `implement-change after W-004 Gate A and W-006 visual seam` | mobile environment providers, platform adapters, fixtures, coverage ledger | W-004 Gate A and W-006 visual-action seam; independent of W-009 desktop provider implementation | `docs/work/lanes/W-010-mobile-task-ground-up.md`; implementation evidence `NOT_RUN` |
| `W-012` | `OPEN` | Compose source-blind agents with command, HTTP, browser, terminal, desktop, and mobile tool seams without hybrid task kinds | `agent-engineer` | `implement-change at WG-001-N16 after WG-001-N15` | composed profiles/manifests; fake six-contour matrix; tool-event linkage; joined results/claims; six live canary definitions | WG-001-N15 integrated source and accepted W-005 through W-010 seams plus the W-004 HTTP seam; W-004 owns shared contracts and merge; live canaries wait for WG-001-GB | `docs/work/lanes/W-012-agent-tool-composition.md`; implementation and live evidence `NOT_RUN` |
| `W-031` | `IN_PROGRESS` | Implement universal task admission, claim extraction, multi-axis workload profiling, policy compilation, proportional controls, and long-running reclassification | `agent-engineer` | finish continuation-inflection repair for N02/N03/N06, then independent GF-004/GF-008/GF-009/GF-101 and harness review | `.codex/task-admission/`; admission compiler/CLI/tests; harness admission evals; advisory and hard-control hooks; route/config/default consumers | W-032 consumes its Task Envelope; task-admission and campaign action-policy authorities remain separate | plan revision 5/lane graph revision 2; repair attempt 2 addresses `continue implementing` under-classification; prior 14/14 corpus and 19-test evidence is superseded pending current focused/full validation; live harness coverage and independent acceptance remain `NOT_RUN` |
| `W-032` | `IN_REVIEW` | Connect task admission, product context, simulation intake, exact campaign policies, separated agent handoffs, and explicit refinement routing | `agent-engineer` | independent integration, functional, security, and harness review for `WG-001-N18` | intake schema/compiler/CLI; campaign run gate; starter/templates; product brief/ledger; author/operator/evaluator role wiring | consumes W-031 Task Envelopes, W-030 briefs, and W-004 campaign contracts; gates only product-scoped WG-001-N17 entries | lane revision 3/work-graph revision 12; scope/path/decision and strict READY-check hardening, PB-002 fixed point, catalog `73e0a208...`, 49 focused tests, and 152-test regression pass; provider-backed product execution, independent semantic evaluation, promotion, merge/deploy, and release eligibility remain `NOT_RUN` |

The rows above are the complete active workline set. Completed
worklines and completed work graphs remain available through their lane packets
and durable reports; they are intentionally absent from this active registry.
A separate W-031 lane owns the implemented task-admission layer. W-032 consumes
that layer and adds `WG-001-N18` without reinterpreting W-004's
simulation-specific claim and policy authority. The project hook requires
normal first-use trust, never
accepts model-controlled tool arguments as authority, and never auto-approves
a hard action.
A deterministic local campaign runtime and framework fixtures exist. The
historical implementation base is `master@21ba5288`; W-025 through W-029 and
the session controller changed shared current sources. The user-authorized
attempt-5 implementation and combined current-source validation now pass
locally for WG-001-N03 through N05;
independent acceptance remains `NOT_RUN`.
Exact Bun 1.3.3 validation ran through `npx --yes bun@1.3.3`. The
generated harness catalog contains 44 skills and 368 scenarios. Target-product
calibration, package publication, accepted downstream surface adapters, composed
agent-tool tasks, and live/platform execution remain `NOT_RUN`.

For active work graph `WG-001`, W-004 prefers `root`; W-005 through W-010 and
W-012 prefer `internal-subagent`. The user's 2026-08-03 implementation
instruction explicitly replanned and authorized the narrow W-004 attempt-5
adapter/HTTP contract slice in the current root task. No downstream surface
implementation, live run, provider spend, commit, push, or publication is
authorized by that replan.

The 2026-07-31 plan-revision-13 repair produced N04/N05 fixed point
`0ccb25a3eb88d58289d47e920d5924e78390dd11b69e20b354c4ce53d069d940`
in root task `019fb3c2-bd84-7282-9df0-5477a8321233`. Artifact and policy
deterministic evidence plus generated-starter coverage passed historically,
but required attempt-4 GF-004/GF-101 reviews are `FAIL`, so both nodes remain
historically rejected. Attempt 5 supersedes the exhausted repair authority for
the narrow adapter/HTTP slice, but has no independent review receipt yet.
W-025 through W-030 validation does not compensate for either review state.
Cross-surface, specialized handoff, composition, Gate A, and live/platform
evidence remains blocked or `NOT_RUN`, so the eight WG-001 lanes remain active
and unaccepted. Archived W-030 was a separate serialized product-context lane
and did not change WG-001 topology or acceptance state.

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
