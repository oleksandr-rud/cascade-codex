# Work Lane: W-005 Command Task Assessment And Refactor

Status: `OPEN`
Owner: `agent-engineer`
Created: 2026-07-27
Lane Model: `single-lane`
Next Gate: `implement-change after W-004 Gate A`
Execution Surface: `internal-subagent`
Dispatch State: `NOT_AUTHORIZED`
Dispatch Authorization: `none`
Runtime Handle: `none`

## Request

Assess the candidate `command` campaign task and refactor it into a safe,
deterministic direct-process adapter with typed inputs, outputs, oracles,
evidence, errors, and cleanup.

## Acceptance Criteria

- Commands execute as argv arrays without an implicit shell.
- Working directories and declared input/output paths remain inside configured
  roots.
- Environment variables are explicit and sensitive values are redacted.
- Exit code, stdout, stderr, signals, timeout, and output-size limits are
  recorded.
- Task success requires all declared command oracles and evidence.
- Command claims reference W-004 policy and oracle IDs; exit zero alone supports
  execution only and cannot imply mechanical behavior, safety, portability, or
  release eligibility.
- Filesystem, environment, process, and network policy decisions plus the
  self-contained evidence body are preserved in the run package.
- Temporary directories, file effects, interruption, and cleanup are tested.
- If a command is interrupted after a potentially external side effect, the
  result records an unknown outcome and requires explicit disposition; it is
  never retried automatically.
- Interactive CLI/TUI behavior is rejected and routed to `terminal`.
- Existing deterministic campaign behavior is preserved or intentionally
  replaced with a recorded contract change.
- The accepted command seam can be exposed as a bounded typed tool to W-012
  without allowing an agent profile to change argv, cwd, environment,
  filesystem, process, or network policy.
- Every named command run is performed by `simulation-operator`; its claims
  are aggregated only after `simulation-evaluator` emits an identity-matched
  evaluation receipt from frozen evidence.

## Scope

In:

- candidate command execution and preflight behavior;
- command adapter, fixtures, oracles, redaction, and focused tests;
- CLI public-boundary evidence.

Out:

- PTY/TUI behavior owned by W-008;
- browser, desktop, mobile, or agent execution;
- target-specific production CLI implementation.

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| Program | W-004 Gate A and program report | shared task/result contract | pending canonical gate |
| Candidate | branch `scripts/cascade/campaigns.ts`; `harness-static-smoke.json` | current direct-process behavior | candidate branch snapshot |
| CLI pattern | `docs/patterns/architecture-defaults/cli.spec.md` | output, exit, safety, and functional contracts | current |
| Target config | `harness.config.yaml` validation commands | real command consumers | current checkout |

## Campaign Deliverables

| Campaign ID | Tier | Required Evidence Boundary | Status |
|---|---|---|---|
| `harness-static-smoke` | deterministic | Candidate static checks with exact argv, runtime/source identity, per-task logs, and required-task reduction | `OPEN` |
| `command-failure-recovery` | deterministic | Nonzero exit, timeout, missing output, denied effect, redaction, cleanup, retry lineage, claim ledger, and route receipt | `OPEN` |

Neither campaign covers interactive terminal behavior, platform portability
beyond the recorded runtime, or target-product correctness not asserted by its
declared oracles.

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `CMD-001` | Given a successful argv command, stdout, stderr, exit code, duration, and source digests are preserved. | command smoke artifact | `OPEN` |
| `CMD-002` | Given a command requiring shell expansion, validation rejects it unless the shell executable is itself explicit argv. | negative schema/adapter test | `OPEN` |
| `CMD-003` | Given a timeout, the owned process tree is stopped, cleanup runs, and status is `FAIL`. | timeout fixture | `OPEN` |
| `CMD-004` | Given a required output file is missing, exit zero does not produce `PASS`. | oracle failure fixture | `OPEN` |
| `CMD-005` | Given an interactive prompt, preflight returns a route error naming `terminal`. | negative capability fixture | `OPEN` |
| `CMD-006` | Given an exit-zero command with a denied filesystem effect, execution is recorded but safety and required behavior claims are `UNSUPPORTED`. | policy decision and claim ledger | `OPEN` |
| `CMD-007` | Given a command task routes follow-up to `terminal`, the handoff receipt binds the task result, evidence, cleanup state, and target gate. | command-to-terminal receipt | `OPEN` |
| `CMD-008` | Given a command loses its operator after a network or external side effect may have occurred, recovery cleans up owned resources and records uncertainty without automatically rerunning the command. | interrupted external-effect fixture and recovery receipt | `OPEN` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| Command campaigns | candidate branch | command adapter and command task fixtures | yes | deterministic argv execution | command adapter tests | `NOT_RUN` | `implement-change` |
| Static harness smoke | candidate branch | `harness-static-smoke` | yes | existing required checks and source digests | campaign replay | `NOT_RUN` | `functional-qa` |
| Terminal routing | W-008 | task capability validation | no | interactive commands never hang command tasks | negative prompt probe | `NOT_RUN` | `plan-change` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| command adapter module | W-005 | write | no shared schema edits |
| command fixtures and focused tests | W-005 | write | deterministic local data only |
| shared task schema/dispatcher | W-004 | read/merge-only | changes proposed to merge owner |
| terminal adapter | W-008 | read | capability boundary only |
| agent-command composition | W-012 | read | consumes the accepted command seam without adapter edits |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| local process runner | deterministic fixture execution | allowed in temp roots | exact stdout/stderr/status |
| network and external apps | none | forbidden in fixtures | policy violation is failure |

## Plan

1. Trace candidate preflight, process execution, evidence collection, and result
   reduction.
2. Enumerate command consumers and classify preserved versus missing behavior.
3. Implement the W-004 adapter interface with explicit argv, cwd, environment,
   timeout, signal, output-limit, and redaction handling.
4. Add file, JSON, text, and exit-code oracles only where they prove public
   behavior without duplicating the command under test.
5. Add success, nonzero, timeout, missing-output, out-of-root, secret-redaction,
   interruption, unknown-external-outcome, and cleanup fixtures.
6. Emit command-specific policy decisions and claim results through the W-004
   ledgers without creating a second reducer or artifact writer.
7. Author and validate `harness-static-smoke` and
   `command-failure-recovery` through the generated campaign catalog.
8. Replay both campaigns through the canonical campaign runner.
9. Publish the accepted bounded command-tool seam and fixture identity to
   W-012 for deterministic composition and the live agent-command canary.

## Parallel Dependencies

- Can run with: W-006 and W-007 after W-004 Gate A.
- Must wait for: W-004 Gate A.
- Conflicts with: W-004 shared runner/schema edits and W-008 shared process
  utility edits; W-005 publishes the process-result seam before W-008 starts.

## Handoff And Merge Contract

- Handoff summary: preserved command behavior, removed ambiguities, adapter API,
  and fixture verdicts.
- Required output: command adapter, focused deterministic fixtures, and an
  accepted command-tool seam for W-012.
- Merge owner: W-004.
- Merge target: canonical campaign foundation.
- Evidence to preserve: command manifests, policy decisions, claim ledger,
  frozen logs/outputs, oracle results, cleanup, and any route receipt.
- Stop condition: command task passes its focused suite and static smoke or
  reports a reproducible foundation blocker.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| Adapter unit/self-tests | focused command suite | `OPEN` |
| CLI functional fixtures | success/failure/timeout/interruption cases | `OPEN` |
| Claims and policies | exit-zero/oracle-fail, denied effect, frozen output, and command-to-terminal receipt cases | `OPEN` |
| Static campaign | canonical `harness-static-smoke` run | `OPEN` |
| Regression | full campaign schema/self-test and diff check | `OPEN` |

## Status Reconciliation

- Last checked: `2026-07-29`
- Source identity: current `master` working tree
- Completion disposition: `KEEP_OPEN`
- Reason: current source has no command campaign adapter, definitions,
  fixtures, or runner; candidate-branch files are not current implementation.
- Synchronized surfaces: lane, active registry, and IG-001 revision 7.

## Closeout

- Merge evidence: pending.
- Report: program report.
- Remaining risk: target-specific shells and platform signal behavior remain
  target evidence, not inferred portability.
