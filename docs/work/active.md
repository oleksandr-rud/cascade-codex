# Active Work

Use this table as the single thin registry of active work. It is a derived
projection: lane-local state comes from a lane Task Graph when present, while
cross-workline state comes from the referenced work graph or first-class
Coordination Graph. Keep only active worklines and active graph projections
here; retain completed evidence in lane packets, durable reports, and archive
capsules.

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
| `W-004` | `IN_PROGRESS` | Establish canonical cross-surface campaign, claim, policy, lifecycle, identity, artifact, execution/evaluation receipt, permission, cleanup, and composed-task contracts | `agent-engineer` | replan the receiver-authenticated handoff boundary after the N07 GF-101 rejection | shared task/campaign/claim/policy/oracle/metric/treatment/calibration/evaluation-profile schemas; simulation manifests and intakes; generated catalog; Bun runner, Codex evaluator, target initializer, multi-surface session controller; segmented append-only execution/session/evaluation/calibration/aggregation artifacts; validator/docs integration | W-029 is terminal; N06 is accepted; surface lanes own real adapters, W-012 owns composed profiles/manifests, W-032 owns product-intake readiness, and W-004 owns shared contracts and final merge | N07 revision-82 r75/r76 is `VALID`/`COMPLETED`/`FRESH`; architecture/functional and reducer/evaluator accept, but GF-101 rejects receiver self-impersonation. N08 deterministic r77/r78 passes and remains release-false, but review and Gate A wait for N07 acceptance |
| `W-005` | `IN_PROGRESS` | Assess and refactor the deterministic `command` task | `agent-engineer` | obtain focused review and Gate A acceptance for the strict direct-process candidate | command adapter, process evidence, oracles, redaction, cleanup, fixtures | W-004 Gate I implementation baseline; Gate A acceptance; publishes process-result seam for W-008 | strict argv, explicit environment, isolation, timeout/cleanup, expected nonzero, and missing-output oracle behavior pass in fresh immutable r8/r10; W-008 handoff receipt, independent review, and Gate A acceptance remain open |
| `W-006` | `IN_PROGRESS` | Assess and refactor `browser` with deterministic Playwright and optional Computer Use drivers | `agent-engineer` | obtain focused review, live Computer Use disposition, and Gate A acceptance | browser adapter, isolated Playwright, visual action policy, structured browser-tool seam, fixtures | W-004 Gate I implementation baseline and Gate A acceptance; publishes visual interface for W-009 and browser-tool seam for W-012 composition | deterministic Playwright plus pre-dispatch denial, external-request interception, missing-effect failure, injection resistance, and bounded Computer Use batch seam pass in fresh immutable r18/local tests; live Computer Use, W-012 composition, review, and Gate A remain open |
| `W-007` | `IN_REVIEW` | Refactor `agent-response` for standalone Codex agents, Cascade harness profiles, and typed tool-event composition | `agent-engineer` | obtain focused fixed-point review and Gate A acceptance for the completed standalone and Cascade-profile candidates | Codex adapter, normalized agent result/tool events, standalone and Cascade profiles, composition-profile seam | W-004 Gate I implementation baseline and Gate A acceptance; preserve W-001 catalog, grading, judging, and coverage; publish the agent seam consumed by W-012 | provider-neutral fixture r5 and standalone r4 pass; exact Cascade-profile r4 is `VALID`/`COMPLETED`/`FRESH`, independently scores 100/100 for outcome and trajectory, passes general evaluation, and remains release-false; named custom-agent selection stays fail-closed, W-012 owns composed tools, and Gate A acceptance remains open |
| `W-008` | `IN_REVIEW` | Implement the `terminal` PTY/TUI task from the ground up | `agent-engineer` | focused fixed-point review; W-005 and Gate A acceptance remain required for W-008 acceptance | PTY adapter, typed terminal steps, transcripts/screens, fixtures | Gate I/current W-005 candidate permit candidate work; W-004 Gate A and accepted W-005 seam still gate acceptance | immutable Darwin/arm64 r3 is `VALID`/`COMPLETED`/`FRESH`, prompt/resize/signal/timeout cleanup pass, secret redaction passes focused tests, release false; other platforms and Computer Use `NOT_RUN` |
| `W-009` | `IN_PROGRESS` | Implement isolated native `desktop` tasks with deterministic and Computer Use drivers | `agent-engineer` | restore Docker provider start health; rerun r5; then focused review and W-006/Gate A acceptance | desktop environment provider, native adapter, controlled fixture, visual driver | candidate work uses Gate I/current W-006; acceptance still requires W-004 Gate A and accepted W-006 visual interface | schema v7 and pinned Docker/Xvfb adapter implemented; immutable r5 is `VALID`/`BLOCKED`/`FRESH` after provider dispatch timed out, with verified cleanup and no residual resources; deterministic pass, Computer Use, macOS, and Windows remain `NOT_RUN` |
| `W-010` | `IN_PROGRESS` | Implement Android-emulator and iOS-simulator `mobile` tasks with deterministic and Computer Use drivers | `agent-engineer` | provision exact Android device/app/snapshot runner; rerun provider campaign; then focused review and W-006/Gate A acceptance | mobile environment providers, platform adapters, fixtures, coverage ledger | candidate work uses Gate I/current W-006; acceptance still requires W-004 Gate A and accepted W-006 visual-action seam; independent of W-009 | schema v8, exact provider preflight, policy/oracle/claim surfaces implemented; immutable r2 is `VALID`/`BLOCKED`/`FRESH` because adb is unavailable; Android/iOS execution and Computer Use remain `NOT_RUN` |
| `W-012` | `OPEN` | Compose source-blind agents with command, HTTP, browser, terminal, desktop, and mobile tool seams without hybrid task kinds | `agent-engineer` | `implement-change at WG-001-N16 after WG-001-N15` | composed profiles/manifests; fake six-contour matrix; tool-event linkage; joined results/claims; six live canary definitions | WG-001-N15 integrated source and accepted W-005 through W-010 seams plus the W-004 HTTP seam; W-004 owns shared contracts and merge; live canaries wait for WG-001-GB | `docs/work/lanes/W-012-agent-tool-composition.md`; implementation and live evidence `NOT_RUN` |
| `W-031` | `IN_PROGRESS` | Implement universal task admission, claim extraction, multi-axis workload profiling, policy compilation, proportional controls, and long-running reclassification | `agent-engineer` | freeze one new current-source immutable subject for revision-41, then obtain exact architecture/harness, functional, and GF-101 receipts against that subject and workspace binding | `.codex/task-admission/`; admission compiler/CLI/tests; harness admission evals; advisory and hard-control hooks; route/config/default consumers | W-032 consumes its Task Envelope; task-admission and campaign action-policy authorities remain separate | revision-41 attempt-2 at v41/`cascade-core@42` passes corpus `981/981`, persistence `587/587`, claims `789/789`, and zero over/under-control; immutable r64 is preserved but has nine current-source drift items, so all G1-G6 remain unaccepted |
| `W-032` | `IN_PROGRESS` | Connect task admission, product context, simulation intake, exact campaign policies, separated agent handoffs, and explicit refinement routing | `agent-engineer` | join revision-24 to the next current-source W-031 revision-41 immutable subject, then run G1-G4 review against that exact intake-v6/action-binding-v2 and v41/core@42 producer binding; W-031-G6 and integrated G6/GT remain open; G5 stays accepted | intake-v6/seed schema/compiler/CLI; action-binding-v2; campaign run gate; starter/templates; product brief/ledger; author/operator/evaluator role wiring | consumes accepted W-031 admission gates, accepted W-030-GT, WG-001-N02/N05, and W-004 campaign contracts; `W-032-GT` gates only product-scoped WG-001-N17 entries through N18 | revision-24 preserves intake-v6/action-binding-v2 behavior, proportional routing, and v41/core@42 producer parity; immutable r64 is preserved but no longer current, so G1-G4/G6/GT remain open or blocked and G5 stays accepted |

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
the session controller changed shared current sources. WG-001-N03/N04/N05 are
accepted. N06 revision 66 and W-031 revision 32 failed independent review at
immutable r47; revision-67/revision-33 failed at r49; revision-68/revision-34
failed at r50; and revision-69/revision-35 failed their required joins at r51.
Revision-70/revision-36 were reviewed at immutable r52: the N06 reducer and
GF-101 receipts accepted, N06 architecture rejected, and all three W-031
receipts rejected. Revision-71/revision-37 were reviewed at immutable r53:
N06 architecture and GF-101 rejected, its reducer review accepted its bounded
subject, W-031 architecture and functional rejected, and W-031 GF-101 was not
run before repair. All three N06 receipts and W-031 architecture/functional
receipts rejected immutable r54; W-031 GF-101 was not run. N06 revision-73
attempt-44 repaired session history/resume, revision-74 attempt-45 repaired safe
action binding, intake-v6, and secret references, and W-031 revision-39 attempt-1
is root-integrated with them at immutable r55. That fixture remains historical.
The last reviewed candidate was frozen at run
`wg001-n06-r76-w031-r41-w032-r24-w005-r2-w006-r2-w007-r4-w008-r3-w009-r4-w010-r2-scheduler-r1-review-20260808-r64`,
binding revision-76/revision-41/revision-24 plus the then-current W-005 through W-010 and scheduler source.
At freeze time it verified 121 files at manifest
`d2a2611b5abddcd4794114fe0e07777c12739ea110d51adca59b476c011c1141`,
as a `VALID`/`COMPLETED`/`FRESH` fixture with `PASS` evaluation,
`NOT_RUN` calibration, and `release_eligible=false`. It now has nine
current-source drift items and is historical only. All three exact N06 reviews
rejected that subject.
Revision-77 attempt-48 immutable r65 was rejected by architecture/functional
and GF-101 review while reducer/evaluator accepted that frozen packet only.
Immutable r67 accepted N06 through all three exact review lanes. It remains
the accepted N06 source identity, while N07 revision-80 attempt-1 is active
unfrozen work. The r64 W-005
execution claim is supported; W-006 and
W-007 have
separate current deterministic browser proof at
`w006-browser-simulation-smoke-20260808-r18` and agent proof at fixture r5 plus standalone/Cascade r4, but N06 does not open N07,
and W-032 does not accept the producer, until this exact identity plus the
current workspace binding passes fresh independent reviews.
Passing reducer, hook, receipt, and
security controls remain positive regression evidence rather than acceptance.
Exact Bun 1.3.3 validation ran through `npx --yes bun@1.3.3`. The
generated harness catalog contains 45 skills and 386 scenarios. Target-product
calibration, package publication, accepted downstream surface adapters,
composed agent-tool tasks, Computer Use, and platform execution remain
`NOT_RUN`; the standalone and exact Cascade-profile Codex canaries are narrow
live exceptions and are not release evidence.

For active work graph `WG-001`, W-004 through the current W-008 slice use the
current `root` task; W-009, W-010, and W-012 are not dispatched. The
user's instructions authorize local workline implementation and independent
reviews.
Gate I permits candidate W-005/W-006/W-007 implementation and, under graph
revision 15, provisional W-008 implementation against the current W-005
candidate seam, while Gate A and accepted W-005 identity still
serializes their acceptance and integration;
additional live/provider runs, commit, push, and publication remain separate
actions.

Historical rejected attempts remain in the W-004 lane and WG-001 report rather
than this active projection. r64 and revision-77 r65 are rejected historical
evidence. Revision-78 is active repair evidence only. N06 and W-031 independent acceptance, N07/N08, Gate A, downstream
surfaces, composition, and live/platform evidence remain open, blocked, or
`NOT_RUN`. Archived W-030 was a separate serialized product-context lane and
did not change WG-001 topology or acceptance state.

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
