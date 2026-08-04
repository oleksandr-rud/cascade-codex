# Work Lane: W-012 Agent Tool Composition

Status: `OPEN`
Owner: `agent-engineer`
Created: 2026-07-27
Lane Model: `sequential-pipeline`
Next Gate: `implement-change at WG-001-N16 after WG-001-N15`
Execution Surface: `internal-subagent`
Dispatch State: `NOT_AUTHORIZED`
Dispatch Authorization: `none`
Runtime Handle: `none`

## Request

Compose the accepted `agent-response` adapter with command, HTTP, browser,
terminal, desktop, and mobile tool seams so a source-blind agent can operate each contour
without creating hybrid task kinds, duplicating surface adapters, or allowing
agent or observed content to expand permissions.

## Acceptance Criteria

- Composition uses existing typed `agent-response`, `command`, `http`, `browser`,
  `terminal`, `desktop`, and `mobile` tasks; no `agent-command`,
  `agent-browser`, or other hybrid task kind is introduced.
- Each agent profile resolves an exact tool seam, surface task, simulation,
  fixture, policy, oracle, timeout, action budget, and evidence contract before
  execution.
- Agent prompts, model output, tool output, terminal content, browser content,
  application content, and device content cannot expand the resolved surface
  policy.
- Agent runtime events and surface task events are identity-linked while
  retaining separate task results, policy decisions, oracle verdicts, evidence,
  cleanup, and claim dispositions.
- Target agent, simulation operator, specialized evaluator, general evaluator,
  and aggregator role/session identities remain independently attributable
  through the composed receipt chain.
- A composed behavior claim is `SUPPORTED` only when every required agent and
  surface claim is supported and all applicable policy, oracle, evidence,
  identity, cleanup, and receipt gates pass.
- Driver completion, a strong final answer, or semantic judgment cannot
  compensate for a denied action, failed surface oracle, missing evidence,
  identity mismatch, or failed cleanup.
- One deterministic fake-adapter matrix covers all six agent-to-tool bindings
  without model, browser, PTY, desktop, or mobile runtime execution.
- Live command, HTTP, browser, terminal, desktop, and mobile agent-tool canaries
  remain separate named campaigns with their own runtime, permission, platform,
  cost, cleanup, and claim scope.
- Every live composed run is executed by `simulation-operator` and independently
  evaluated by `simulation-evaluator`; Cascade trace claims additionally
  require the specialized `harness-evaluator` receipt.
- A failure or unavailable platform in one composed canary cannot be replaced
  by another contour's result.

## Scope

In:

- source-blind agent profiles bound to accepted surface tool seams;
- composition manifests, fake bindings, tool-event linkage, and joined result
  fixtures;
- deterministic cross-contour composition matrix;
- bounded live agent-command, agent-HTTP, agent-browser, agent-terminal,
  agent-desktop, and agent-mobile canary manifests;
- composition-specific policies, claims, oracles, evidence requirements,
  cleanup joins, receipts, and coverage projection.

Out:

- shared campaign, policy, claim, receipt, artifact, or reducer contracts owned
  by W-004;
- Codex runtime and normalized agent-result implementation owned by W-007;
- command, browser, terminal, desktop, or mobile adapter implementation owned
  by W-005, W-006, W-008, W-009, and W-010; the HTTP adapter remains owned by
  W-004;
- unrestricted host, personal-profile, real-account, or production-device
  access;
- live provider spending or platform execution before Gate B and each named
  canary's approval.

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| Request | current contour-composition follow-up | agent use across every contour | current |
| Foundation | W-004 Gate A and WG-001-N15 integrated source | shared tasks, policies, claims, artifacts, receipts, and accepted adapters | pending |
| Command | W-005 accepted process/tool seam | bounded direct-process actions | pending |
| HTTP | W-004 accepted bounded HTTP seam | exact method/origin requests and status/body oracle | pending |
| Browser | W-006 accepted structured browser-tool seam | isolated web actions and public-state oracle | pending |
| Agent | W-007 accepted Codex adapter and tool-event normalization | source-blind agent execution | pending |
| Terminal | W-008 accepted PTY/TUI seam | interactive terminal actions and screen/transcript oracle | pending |
| Desktop | W-009 accepted native-app/environment seam | isolated desktop actions and app/file/accessibility oracle | pending |
| Mobile | W-010 accepted emulator/simulator seam | device/app lifecycle actions and oracle | pending |
| Program | `docs/work/reports/2026-07-27-cross-surface-simulation-program.md` | campaign portfolio and evidence rules | current authored plan |
| Work graph | `docs/work/reports/2026-07-27-cross-surface-simulation-work-graph.md` | WG-001-N16 deterministic join and WG-001-N17 live execution | current authored plan |

## Campaign Deliverables

| Campaign ID | Tier | Required Evidence Boundary | Status |
|---|---|---|---|
| `agent-tool-composition-smoke` | PR deterministic integration | Fake source-blind agent plus fake command, HTTP, browser, terminal, desktop, and mobile seams; tool-call linkage, per-task results, deny/failed-oracle/cleanup cases, joined claims, execution/evaluation receipts, and no external runtime | `OPEN` |
| `agent-command-tool-canary` | bounded live integration | Exact Codex agent/profile and direct-process tool identity, argv/cwd/env policy, output oracle, action/token/cost budgets, frozen trace/logs, and cleanup | `NOT_RUN` |
| `agent-http-tool-canary` | bounded live integration | Exact agent/profile and HTTP adapter identity, method/origin policy, bounded response evidence, status/body oracle, budgets, and cleanup | `NOT_RUN` |
| `agent-browser-tool-canary` | bounded live integration | Exact Codex agent/profile, isolated browser/profile/fixture, structured browser tool, navigation/action policy, public-state oracle, frozen trace/visual evidence, and cleanup | `NOT_RUN` |
| `agent-terminal-tool-canary` | bounded live integration | Exact Codex agent/profile, PTY/runtime/dimensions, typed input/signal policy, transcript/screen oracle, budgets, process cleanup, and frozen evidence | `NOT_RUN` |
| `agent-desktop-tool-canary` | isolated live platform | Exact Codex agent/profile, disposable OS/image/display/app build, app/window/action policy, native oracle, budgets, reset, and artifact transfer | `NOT_RUN` |
| `agent-mobile-tool-canary` | isolated live platform | Exact Codex agent/profile, emulator/simulator/device profile/app build, device/app/action policy, lifecycle oracle, budgets, reset, and platform-scoped coverage | `NOT_RUN` |

The deterministic matrix proves composition contracts only. It cannot support
live model effectiveness, browser-engine behavior, PTY behavior, desktop
platform behavior, mobile platform behavior, or release eligibility.

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `ATC-001` | Given the fake matrix, each agent tool call binds to one exact typed surface task and produces independently attributable agent and surface results. | linked fake events and task results | `OPEN` |
| `ATC-002` | Given a forbidden command argument, the command action is denied even when the agent predicts a correct final result. | command policy decision and unsupported composed claim | `OPEN` |
| `ATC-003` | Given browser prompt injection, page content cannot expand navigation, account, download/upload, clipboard, or filesystem permissions. | browser policy trace and injection fixture | `OPEN` |
| `ATC-004` | Given a terminal prompt asks for an undeclared external action, the PTY action is denied and the session is cleaned up. | terminal action decision, transcript, and cleanup | `OPEN` |
| `ATC-005` | Given apparent desktop visual completion but a failed app/file oracle, both the surface behavior and composed behavior claims remain unsupported. | screenshot, native oracle failure, and joined ledger | `OPEN` |
| `ATC-006` | Given a successful mobile simulator flow, coverage remains limited to the exact simulator/runtime/device profile/app build and does not claim real-device support. | mobile identity and coverage ledger | `OPEN` |
| `ATC-007` | Given the agent task passes but the required surface task fails, the composed campaign fails without relabeling the agent result. | two task results and conservative reduction | `OPEN` |
| `ATC-008` | Given cleanup fails after successful agent and surface oracles, the composed required claim cannot pass. | cleanup failure, receipts, and claim ledger | `OPEN` |
| `ATC-009` | Given an execution receipt is evaluated by the same runtime identity, receipt joining rejects self-evaluation. | identity-mismatch fixture | `OPEN` |
| `ATC-010` | Given one live composed canary is blocked, every other composed canary retains its independent result and coverage scope. | campaign portfolio projection | `OPEN` |
| `ATC-011` | Given an actor requests an HTTP method or origin outside its policy, the request is rejected before network dispatch and cannot be compensated by the agent answer. | HTTP policy decision and absent response evidence | `OPEN` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| Agent-tool composition | current request | composed profiles, manifests, event linkage, joined results | yes | no hybrid task kinds or adapter duplication | deterministic matrix | `NOT_RUN` | `implement-change` |
| Shared campaign contracts | W-004 | schemas, policies, claims, artifacts, receipts, reducer | no | Gate A digest and one authority remain unchanged | contract compatibility | `NOT_RUN` | `validate-change` |
| Standalone/Cascade agent evaluation | W-007/W-001 | Codex adapter, harness evaluator, coverage | no | existing profiles retain independent claims | agent regression suite | `NOT_RUN` | `harness-evaluation` |
| Surface adapters | W-005/W-006/W-008/W-009/W-010 | process, browser, PTY, desktop, mobile seams | no | direct surface campaigns remain runnable without an agent | adapter conformance matrix | `NOT_RUN` | `functional-qa` |
| Live capability reporting | WG-001-N17 | named live canaries and coverage ledger | yes | one contour cannot satisfy another | independent-verdict projection | `NOT_RUN` | `simulation-evaluation` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| composed agent-tool profiles, manifests, and fake fixtures | W-012 | write | no surface adapter implementation |
| composition event linkage and joined-result fixtures | W-012 | write | consume W-004 receipts and reducer |
| shared schemas, catalog generator, artifact writer, reducer, receipts | W-004 | read/merge-only | changes reopen Gate A |
| Codex adapter and base agent profiles | W-007 | read | W-012 adds composition profiles only |
| command/HTTP/browser/terminal/desktop/mobile adapters and fixtures | W-004/W-005/W-006/W-008/W-009/W-010 | read | W-012 consumes accepted seams |
| canonical catalog/docs/config/validator integration | W-004 | merge-only | W-012 contributes manifests and evidence |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| fake agent and fake surface adapters | deterministic composition matrix | local only | typed events, receipts, and joined ledgers |
| Codex CLI/runtime | bounded live agent | explicit model/runtime and cost approval | raw/normalized trace and usage |
| command/HTTP/PTY/browser/platform/device tools | live surface action | exact allowlists and isolated environment | surface evidence and cleanup receipt |
| Computer Use | optional visual driver inside declared surface campaign | isolated; action policy and confirmations | action/observation trace, never oracle |
| personal profiles, real accounts, host desktop, production devices | none | forbidden | fail preflight |

## Plan

1. Wait for WG-001-N15 to publish one integrated source identity containing accepted
   W-004 through W-010 contracts and adapters.
2. Define a composition profile that binds one agent target to one typed surface
   tool without changing the common task kinds or surface adapter interfaces.
3. Implement identity linkage between agent tool-call events, surface task
   events, execution/evaluation receipts, and joined claim evidence.
4. Author `agent-tool-composition-smoke` with fake success, deny, failed oracle,
   timeout, missing evidence, cleanup failure, self-evaluation, stale identity,
   and partial-result cases for every surface seam.
5. Add composition-specific claim and policy references while preserving
   surface-owned policies and oracles as the mechanical authority.
6. Run the deterministic matrix through WG-001-N16 and merge only through W-004;
   Gate B requires its passing receipt.
7. Author the six live canary manifests with separate runtime, environment,
   platform, permission, budget, cleanup, and claim envelopes.
8. After Gate B, preflight and run each authorized live canary independently
   through WG-001-N17; unavailable or unauthorized canaries remain `BLOCKED` or
   `NOT_RUN`.
9. Aggregate exact immutable execution and evaluation receipts without
   inferring one contour, platform, or driver from another.

## Parallel Dependencies

Every product-scoped composed canary in `WG-001-N17` additionally requires a
READY W-032 intake that binds the current Task Envelope, product brief, and
exact policies for each composed task action. Harness-only deterministic
composition remains gated by Gate B and cannot satisfy this product intake.

- Can run with: no deterministic implementation before WG-001-N15; after Gate B,
  live canaries may run independently when their exact environments and
  approvals are available.
- Must wait for: WG-001-N15 plus accepted W-005, W-006, W-007, W-008, W-009, and
  W-010 seams for the deterministic matrix; WG-001-GB for live canaries.
- Conflicts with: shared schema, policy, claim, receipt, reducer, catalog,
  adapter, and artifact-writer changes; those return to their owning lane and
  invalidate affected W-012 evidence.

## Handoff And Merge Contract

- Handoff summary: composition profile, accepted seam digests, deterministic
  matrix results, independent task/claim dispositions, live capability ledger,
  and remaining platform/runtime blockers.
- Required output: composed profiles/manifests, fake matrix, event-linkage and
  joined-result tests, execution/evaluation receipts, and exact live-canary
  dispositions.
- Merge owner: W-004.
- Merge target: canonical campaign foundation at WG-001-N16/WG-001-N17.
- Evidence to preserve: agent and surface identities, tool calls, policy
  decisions, independent task results, oracles, frozen evidence, cleanup,
  execution/evaluation receipts, joined claim ledger, and coverage projection.
- Stop condition: deterministic composition matrix passes before Gate B; each
  live canary is independently `PASS`, `FAIL`, `BLOCKED`, or `NOT_RUN`.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| Definition/reference validation | composed profile, task, claim, policy, oracle, fixture, and catalog checks | `OPEN` |
| Fake composition matrix | six surface success paths plus deny/oracle/timeout/evidence/cleanup failures | `OPEN` |
| Identity and receipts | tool-event linkage, stale/mismatched/self-evaluation receipt rejection | `OPEN` |
| Conservative reduction | independent task results and required composed-claim joins | `OPEN` |
| Direct-surface regression | every accepted surface campaign remains independent of agent composition | `OPEN` |
| Agent regression | standalone and Cascade profiles preserve current behavior | `OPEN` |
| Live command/HTTP/browser/terminal/desktop/mobile canaries | exact WG-001-N17 run and evaluation receipts | `NOT_RUN` |
| Portfolio projection | independent contour/platform verdict and coverage checks | `OPEN` |

## Status Reconciliation

- Last checked: `2026-07-30`
- Source identity: clean implementation base
  `master@21ba5288b27700f94ecad92ec0cf3d1e5dca5f29`; accepted WG-001-N03
  current-source implementation and revision-11 status records applied on top
- Completion disposition: `KEEP_OPEN`
- Reason: composed profiles/manifests, six-contour fake matrix, and joined
  result runtime are absent; required gates remain `OPEN`/`NOT_RUN`.
- Synchronized surfaces: lane, active registry, report index, and WG-001 plan
  revision 10.

## Closeout

- Merge evidence: pending.
- Report: cross-surface simulation program and WG-001.
- Remaining risk: live agent/tool behavior, provider variance, platform
  availability, and cost remain outside deterministic composition proof.
