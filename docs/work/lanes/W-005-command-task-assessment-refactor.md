# Work Lane: W-005 Command Task Assessment And Refactor

Status: `IN_PROGRESS`
Owner: `agent-engineer`
Created: 2026-07-27
Lane Model: `single-lane`
Next Gate: `obtain focused review and Gate A acceptance for the strict direct-process candidate`
Execution Surface: `root`
Dispatch State: `RUNNING`
Dispatch Authorization: explicit user authorization for delegated workline implementation, 2026-08-05
Runtime Handle: `current root task`

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
| Program | W-004 Gate I, Gate A, and program report | provisional implementation seam and separate acceptance gate | Gate I accepted for candidate work; Gate A open |
| Candidate | branch `scripts/cascade/campaigns.ts`; `harness-static-smoke.json` | current direct-process behavior | candidate branch snapshot |
| CLI pattern | `docs/patterns/architecture-defaults/cli.spec.md` | output, exit, safety, and functional contracts | current |
| Target config | `harness.config.yaml` validation commands | real command consumers | current checkout |

## Campaign Deliverables

| Campaign ID | Tier | Required Evidence Boundary | Status |
|---|---|---|---|
| `harness-static-smoke` | deterministic | Candidate static checks with exact argv, runtime/source identity, per-task logs, and required-task reduction | `PASS_CANDIDATE`; immutable `w005-harness-static-smoke-20260808-r8` is `VALID`/`COMPLETED`/`FRESH` |
| `command-failure-recovery` | deterministic | Nonzero exit, timeout, missing output, denied effect, redaction, cleanup, retry lineage, claim ledger, and route receipt | `PASS_CANDIDATE` for the W-005-owned boundary; immutable `w005-command-failure-recovery-20260808-r10` preserves required exit-one `PASS`, optional missing-output `FAIL`, and verified cleanup; the cross-lane route receipt remains W-008-owned/open |

Neither campaign covers interactive terminal behavior, platform portability
beyond the recorded runtime, or target-product correctness not asserted by its
declared oracles.

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `CMD-001` | Given a successful argv command, stdout, stderr, exit code, duration, and source digests are preserved. | command smoke artifact | `PASS_CANDIDATE` |
| `CMD-002` | Given a command requiring shell expansion, validation rejects it unless the shell executable is itself explicit argv. | negative schema/adapter test | `PASS_SCHEMA` |
| `CMD-003` | Given a timeout, the owned process tree is stopped, cleanup runs, and status is `FAIL`. | timeout fixture | `PASS_CANDIDATE` |
| `CMD-004` | Given a required output file is missing, exit zero does not produce `PASS`. | oracle failure fixture | `PASS_CANDIDATE`; optional negative task exits zero but fails the `task-file-exists` oracle in immutable r10 |
| `CMD-005` | Given an interactive prompt, preflight returns a route error naming `terminal`. | negative capability fixture | `PASS_SCHEMA`; v3 rejects interactive execution and names `terminal` |
| `CMD-006` | Given an exit-zero command with a denied filesystem effect, execution is recorded but safety and required behavior claims are `UNSUPPORTED`. | policy decision and claim ledger | `PASS_CANDIDATE`; focused test proves out-of-root write and listener denial |
| `CMD-007` | Given a command task routes follow-up to `terminal`, the handoff receipt binds the task result, evidence, cleanup state, and target gate. | command-to-terminal receipt | `OPEN` |
| `CMD-008` | Given a command loses its operator after a network or external side effect may have occurred, recovery cleans up owned resources and records uncertainty without automatically rerunning the command. | interrupted external-effect fixture and recovery receipt | `NOT_APPLICABLE_STRICT_V3`; network and out-of-root writes are denied, so this candidate cannot authorize the premise; any future broader policy must add unknown-outcome evidence before dispatch |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| Command campaigns | candidate branch | command adapter and command task fixtures | yes | deterministic argv execution | command adapter tests | `PASS_CANDIDATE` | `implement-change` |
| Static harness smoke | candidate branch | `harness-static-smoke` | yes | existing required checks and source digests | campaign replay | `PASS_CANDIDATE` | `functional-qa` |
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

- Can run with: W-006 and W-007 candidate implementation after W-004 Gate I.
- Must wait for: W-004 Gate A before lane acceptance or integration.
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
| Adapter unit/self-tests | focused command suite | `PASS`; explicit/secret env, redaction, isolation, timeout, and cleanup |
| CLI functional fixtures | success/failure/timeout/interruption cases | `PASS_CANDIDATE` for the strict direct-process boundary; success, expected nonzero, timeout, missing-output, isolation, redaction, and cleanup pass their exact expectations; external-effect interruption is not applicable to strict v3 |
| Claims and policies | exit-zero/oracle-fail, denied effect, frozen output, and command-to-terminal receipt cases | `PARTIAL_PASS`; execution/oracle and denied-effect cases pass; command-to-terminal receipt waits for N07/W-008 |
| Static campaign | canonical `harness-static-smoke` run | `PASS`; immutable `w005-harness-static-smoke-20260808-r8` verifies 121 files at manifest `c672b52bd448383356761b62835db99edfd5235b860b8f834115f75eeaf91621` |
| Failure campaign | canonical `command-failure-recovery` run | `PASS`; immutable `w005-command-failure-recovery-20260808-r10` verifies 139 files at manifest `0616c24dc24927669bbbd1e1d5272249f2f285b0f469059c18f5943203842a5d` |
| Regression | campaign schema/self-test and focused lifecycle suite | `PASS`; 12-entry catalog is current and focused campaign lifecycle suite passes 55/55 |

## Status Reconciliation

- Last checked: `2026-08-08`
- Source identity: immutable r57 provisional baseline plus the current W-005
  direct-process v3 and task-root oracle candidate source
- Completion disposition: `KEEP_OPEN`
- Reason: strict argv, explicit and secret-reference environment handling,
  redaction, task-root write isolation, network deny, non-interactive routing,
  duration/signal evidence, timeout termination, and verified cleanup are
  implemented. Both named campaigns pass and verify fresh at immutable r8/r10;
  exit zero with a missing required task output deterministically fails. The
  prior combined r59 subject is now historical because W-006/W-007 and shared
  runtime source changed. The N07/W-008 command-to-terminal receipt,
  independent review, and Gate A acceptance remain open.
- Synchronized surfaces: lane, active registry, and WG-001 plan revision 79 /
  graph revision 14.

## Closeout

- Merge evidence: pending.
- Report: program report.
- Remaining risk: target-specific shells and platform signal behavior remain
  target evidence, not inferred portability.
