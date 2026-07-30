# Work Lane: W-008 Terminal Task Ground-Up Implementation

Status: `OPEN`
Owner: `agent-engineer`
Created: 2026-07-27
Lane Model: `single-lane`
Next Gate: `implement-change after W-005`
Execution Surface: `internal-subagent`
Dispatch State: `NOT_AUTHORIZED`
Dispatch Authorization: `none`
Runtime Handle: `none`

## Request

Implement a first-class `terminal` task for interactive CLIs and TUIs using a
bounded PTY, reproducible key/input sequences, terminal-state observations,
and optional Computer Use only when visual terminal interaction is itself the
behavior under test.

## Acceptance Criteria

- `terminal` is distinct from non-interactive `command`.
- The adapter owns PTY creation, dimensions, encoding, input, resize, signals,
  timeout, process-tree termination, and cleanup.
- Deterministic tasks can wait for observable terminal text/state and send
  bounded key sequences without arbitrary sleeps.
- ANSI output is preserved raw and normalized into a reviewable terminal
  transcript or screen representation.
- Prompts, secrets, passwords, and typed input follow explicit redaction rules.
- A Computer Use driver may operate an isolated visible terminal, but a PTY
  oracle still verifies command/TUI outcomes when possible.
- Terminal claims bind the executable/build, terminal runtime, dimensions,
  driver, transcript/screen oracle, policy set, and tested platform.
- Process, filesystem, network, secret-input, signal, and visible-terminal
  actions emit W-004 policy decisions and preserve redacted frozen evidence.
- Hanging prompts, alternate-screen applications, resize, interruption,
  broken-pipe, and cleanup paths have fixtures.
- Operator interruption records the PTY/process-tree state and permits only
  cleanup/finalization recovery; the interactive session is never resumed
  implicitly.
- Every named terminal run is performed by `simulation-operator`; its claims
  are aggregated only after `simulation-evaluator` emits an identity-matched
  evaluation receipt from frozen evidence.
- The accepted PTY seam can be exposed as a bounded typed tool to W-012 without
  allowing an agent profile to bypass terminal input, signal, secret,
  filesystem, process, or network policy.

## Scope

In:

- portable PTY dependency assessment and adapter;
- deterministic terminal script/state DSL or equivalent typed contract;
- terminal evidence, oracle, budgets, and fixture application;
- optional isolated visible-terminal Computer Use canary.

Out:

- ordinary non-interactive commands owned by W-005;
- SSH to real hosts, personal shell profiles, or real credentials;
- platform-native app automation outside the terminal window.

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| Program | W-004 Gate A | common lifecycle/result | pending |
| Command lane | W-005 process-result seam | avoid duplicate process policy | pending |
| CLI default | `docs/patterns/architecture-defaults/cli.spec.md` | TTY, output, exit, interruption expectations | current |
| Target runtimes | configured shell/platform inventory | portability constraints | target-specific |

## Campaign Deliverables

| Campaign ID | Tier | Required Evidence Boundary | Status |
|---|---|---|---|
| `terminal-pty-smoke` | deterministic | PTY/runtime/dimension identity, prompt/TUI/resize/signal events, raw and redacted transcript/screens, oracle, process cleanup, and platform-scoped claims | `OPEN` |
| `terminal-computer-use-canary` | isolated live canary | Visible-terminal action/observation loop, policy decisions, PTY/public-state oracle, budgets, screenshots, and isolated-session cleanup | `NOT_RUN` |

The visible-terminal campaign is separate because it requires a display,
Computer Use runtime, and visual-action permissions. It does not replace the
PTY smoke or broaden terminal/platform coverage.

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `TERM-001` | Given an interactive confirmation prompt, the task waits for the prompt, sends the declared answer, and verifies completion. | PTY events and final oracle | `OPEN` |
| `TERM-002` | Given a full-screen TUI, alternate-screen frames are captured and the final screen contains the expected state. | raw stream and normalized frames | `OPEN` |
| `TERM-003` | Given a resize, the child receives the new dimensions and redraws without corrupting the state oracle. | resize event and frame | `OPEN` |
| `TERM-004` | Given a hung prompt, the step budget expires, the process tree is stopped, and cleanup is verified. | timeout/cleanup trace | `OPEN` |
| `TERM-005` | Given a secret input field, the input value is absent from committed logs and task summaries. | redaction probe | `OPEN` |
| `TERM-006` | Given a non-interactive CLI, validation recommends `command` rather than PTY execution. | capability negative test | `OPEN` |
| `TERM-007` | Given a TUI passes on one OS/runtime/dimension tuple, its claim ledger does not imply other terminals or platforms. | scoped terminal coverage row | `OPEN` |
| `TERM-008` | Given a task routes an interactive case from `command`, the receipt binds the originating evidence and accepted terminal task identity. | accepted command-to-terminal receipt | `OPEN` |
| `TERM-009` | Given the operator disappears while a PTY owns child processes, recovery terminates the owned process tree, preserves partial terminal evidence, and finalizes without sending further input. | orphan-process recovery fixture | `OPEN` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| Interactive CLI/TUI | current request | terminal adapter and task fixtures | yes | terminal semantics and signals | PTY journey suite | `NOT_RUN` | `implement-change` |
| Direct command | W-005 | process result and capability routing | no | non-interactive path stays simpler | command regression | `NOT_RUN` | `validate-change` |
| Computer Use terminal | program plan | visible-terminal driver | yes | PTY oracle remains authority | isolated canary | `NOT_RUN` | `functional-qa` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| terminal adapter and PTY fixtures | W-008 | write | new implementation |
| shared process-result utilities | W-005/W-004 | read; changes through merge owner | no duplicate execution policy |
| shared action/result schema | W-004 | merge-only | terminal-specific events extend typed union |
| agent-terminal composition | W-012 | read | consumes the accepted PTY seam without adapter edits |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| local PTY runtime | interactive fixture execution | disposable temp environment | raw and normalized terminal evidence |
| Computer Use | optional visible-terminal canary | isolated VM/user only | screenshot/action trace |
| real SSH/accounts | none | forbidden | fail preflight |

## Plan

1. Compare maintained PTY libraries and platform APIs against Bun/runtime,
   licensing, packaging, and process-tree cleanup requirements.
2. Adopt the narrowest PTY adapter whose public contract hides dependency
   details and supports required platforms.
3. Define typed terminal steps such as wait-for, type, keypress, resize,
   signal, capture, and finish with explicit budgets.
4. Preserve raw byte/event output and derive a bounded redacted transcript and
   terminal-screen representation.
5. Create a local fixture TUI covering prompt, alternate screen, resize,
   interruption, timeout, and cleanup.
6. Emit scoped terminal claims, policy decisions, frozen raw/redacted evidence,
   and command/terminal handoff receipts through W-004.
7. Author both terminal manifests after W-005 publishes the process-result
   seam and validate them through the campaign catalog.
8. Add an optional Computer Use visible-terminal driver only after the PTY
   deterministic path and oracle pass.
9. Publish the accepted PTY tool seam and fixture identity to W-012 for the
   deterministic composition matrix and live agent-terminal canary.

## Parallel Dependencies

- Can run with: W-009 after W-005 publishes the process-result seam.
- Must wait for: W-004 Gate A and W-005 adapter contract.
- Conflicts with: changes to shared process termination, event schema, and
  artifact writer.

## Handoff And Merge Contract

- Handoff summary: chosen PTY seam, platform support, event model, redaction,
  fixtures, and blocked platforms.
- Required output: terminal adapter, fixture TUI, deterministic suite, accepted
  PTY tool seam for W-012, and optional Computer Use canary evidence.
- Merge owner: W-004.
- Merge target: canonical campaign foundation.
- Evidence to preserve: raw/redacted transcripts, terminal frames, signals,
  policy decisions, scoped claims, oracle, cleanup, and handoff receipt.
- Stop condition: deterministic PTY suite passes and unavailable platform/live
  evidence is explicitly classified.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| PTY lifecycle | prompt, TUI, resize, signal, timeout suite | `OPEN` |
| Redaction | secret-input fixture | `OPEN` |
| Process cleanup | child-tree termination and temp cleanup | `OPEN` |
| Computer Use terminal | isolated visual canary | `NOT_RUN` |
| Cross-platform | supported-platform matrix | `OPEN` |
| Claims/handoffs | platform-scoped claims and command-to-terminal receipt verification | `OPEN` |

## Status Reconciliation

- Last checked: `2026-07-30`
- Source identity: clean implementation baseline
  `master@60fdc2464b9782a689d3f53ffa8fc177f486e6a8`; revision-9 planning diff
  applied on top
- Completion disposition: `KEEP_OPEN`
- Reason: terminal PTY task, fixtures, transcript handling, and cleanup runtime
  are absent; required gates remain `OPEN`/`NOT_RUN`.
- Synchronized surfaces: lane, active registry, report index, and IG-001 plan
  revision 9.

## Closeout

- Merge evidence: pending.
- Report: program report.
- Remaining risk: terminal rendering and signal behavior vary by OS and must be
  claimed per tested platform.
