# Work Lane: W-007 Agent Response Task Assessment And Refactor

Status: `OPEN`
Owner: `agent-engineer`
Created: 2026-07-27
Lane Model: `evaluator-optimizer`
Next Gate: `implement-change after W-004 Gate A`
Execution Surface: `internal-subagent`
Dispatch State: `NOT_AUTHORIZED`
Dispatch Authorization: `none`
Runtime Handle: `none`

## Request

Make `agent-response` usable for standalone Codex agents and for Cascade
harness evaluation without putting the common task contract inside Codex or
requiring Cascade-specific fields.

## Acceptance Criteria

- The common task schema describes an agent target, runtime adapter, prompt,
  output contract, permissions, budgets, and evaluation profile.
- A standalone Codex target can run from a digest-bound explicit instruction
  source without a Cascade scenario ID; named custom-agent selection is
  accepted only after its exact invocation and identity seam is proven.
- A Cascade harness profile can reference a current scenario and reuse
  normalization, deterministic hard gates, coverage, and optional judging.
- Codex-specific command construction and JSONL parsing stay inside the Codex
  adapter.
- Target prompts do not receive golden expectations or prior run results.
- Deterministic schema, trace, route, permission, and mutation failures cannot
  be overridden by semantic judgment.
- Material response claims are recorded individually with supporting trace and
  source evidence; their deterministic eligibility, semantic support, safety,
  coverage, and release dispositions remain separate.
- Standalone and Cascade profiles resolve versioned permission policies before
  execution; model or judge prose cannot expand tool authority.
- A composition profile may reference an accepted W-005, W-006, W-008, W-009,
  or W-010 tool seam, but surface permissions, fixtures, budgets, and evidence
  requirements resolve before execution and remain surface-policy decisions.
- Unsupported agent providers fail closed; no speculative provider adapters are
  presented as implemented.
- Offline tests distinguish adapter readiness from live model effectiveness.
- `simulation-operator` invokes only the selected target agent and cannot
  evaluate its own run; `simulation-evaluator` consumes frozen evidence and
  emits the general evaluation receipt.
- A Cascade profile additionally requires an identity-matched specialized
  receipt from `harness-evaluator`; a standalone agent profile does not invent
  Cascade trace fields or require that specialized receipt.

## Scope

In:

- candidate `agent-response` task shape;
- provider-neutral normalized agent result;
- Codex runtime adapter;
- standalone-agent and Cascade-harness evaluation profiles;
- fake runtime fixtures, live canaries, and evidence linkage.

Out:

- changes to Codex product internals;
- implementations for non-Codex runtimes without a real consumer;
- weakening W-001 accepted coverage or replacing current scenario authority.

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| Annotation 1 | current response annotation | standalone versus Cascade requirement | current |
| Program | W-004 Gate A and program report | common task/result contract | pending canonical gate |
| Existing eval | `scripts/cascade/evals.ts`; `evals/harness/` | Codex trace, grading, catalog, and self-test coverage | current checkout |
| Candidate | branch `scripts/cascade/evals.ts`; campaign task kind | Bun/Codex adapter candidate | candidate branch snapshot |
| W-001 | lane and report | current regression and evidence rules | executed snapshot |

## Campaign Deliverables

| Campaign ID | Tier | Required Evidence Boundary | Status |
|---|---|---|---|
| `agent-response-fake-smoke` | PR deterministic | Fake-runtime lifecycle, provider-neutral schema/result, policy/claim reduction, judge-input package, and handoff contract | `OPEN` |
| `agent-standalone-codex-canary` | bounded live canary | Named agent/instruction identity, prompt and output-schema digests, Codex runtime/model identity, raw/normalized trace, claims, grade, and usage | `NOT_RUN` |
| `agent-cascade-harness-canary` | bounded live canary | Exact current scenario/source manifest, deterministic eligibility, independent outcome/trajectory judgments, conservative score, and coverage disposition | `NOT_RUN` |

Standalone and Cascade canaries share the Codex adapter but not target
definitions, evaluation profiles, or coverage claims. The fake campaign proves
adapter contracts only and cannot support live model effectiveness.

W-007 publishes the source-blind agent-profile seam and Codex tool-event
normalization to W-012. W-012 owns composed profiles and manifests across
command, browser, terminal, desktop, and mobile; they do not replace the
standalone-agent or Cascade-harness canaries.

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `AR-001` | Given a named Codex custom agent and prompt schema, the task runs and grades its response without a Cascade scenario. | raw/normalized Codex trace and response grade | `OPEN` |
| `AR-002` | Given a Cascade scenario profile, the task exact-matches the current scenario object before claiming coverage. | selected scenario, trace, coverage row | `OPEN` |
| `AR-003` | Given golden text present in the target prompt, validation rejects the task definition. | leakage negative test | `OPEN` |
| `AR-004` | Given a mutation attempt in a read-only profile, deterministic grading fails regardless of answer quality. | hard-gate result | `OPEN` |
| `AR-005` | Given an unsupported adapter, preflight returns `BLOCKED` rather than silently using Codex. | adapter negative test | `OPEN` |
| `AR-006` | Given an offline fake-adapter pass, reporting says adapter contract passed and live effectiveness is `NOT_RUN`. | split-status summary | `OPEN` |
| `AR-007` | Given a response with several material claims, each claim links to exact trace/source evidence and receives its own semantic disposition. | claim ledger and judge evidence | `OPEN` |
| `AR-008` | Given a semantically strong answer that violates its read-only policy, safety and release claims are `UNSUPPORTED` and judging cannot compensate. | policy decision, hard gate, and claim reduction | `OPEN` |
| `AR-009` | Given a proposed `next_route`, the result preserves it as a proposal until a matching digest-bound handoff receipt is accepted. | response, grade, and handoff receipt | `OPEN` |
| `AR-010` | Given a source-blind agent receives an allowlisted typed tool, the trace binds each tool call to the selected surface task identity and cannot expand its policy from prompt or observed content. | agent trace, tool-call linkage, surface policy decisions, and joined claim ledger | `OPEN` |
| `AR-011` | Given the initial standalone canary, Codex runs non-interactively in an isolated temporary Git workspace with ephemeral JSONL output, a final output schema, least privileges, and only the digest-bound instruction/input package. | invocation manifest, JSONL, structured result, sandbox/approval identity, and isolation probe | `OPEN` |
| `AR-012` | Given a named project custom agent cannot be selected and attributed through a proven stable invocation seam, preflight reports that target mode `BLOCKED` rather than asking a parent agent to approximate it. | capability preflight and zero target execution events | `OPEN` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| Standalone agent eval | Annotation 1 | agent task and Codex adapter | yes | no Cascade scenario dependency | standalone canary | `NOT_RUN` | `implement-change` |
| Cascade harness eval | W-001 | scenario, trace, grade, judge, coverage | yes | exact current-definition coverage and known regression | harness regression suite | `NOT_RUN` | `harness-evaluation` |
| Semantic judge | W-001 | judge profile and result | no | hard gates remain non-overridable | invalid/failing fixtures | `NOT_RUN` | `validate-change` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| agent-response adapter/profile modules | W-007 | write | no shared schema ownership |
| standalone agent fixtures | W-007 | write | source-blind synthetic tasks |
| Cascade eval runner/catalog | W-001 authority | read or narrow adapter seam | preserve current evidence |
| common task schema/dispatcher | W-004 | merge-only | Cascade fields remain profile-local |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| Codex CLI | standalone and Cascade live canaries | isolated temporary Git workspace; ephemeral; least sandbox; bounded model use | raw JSONL, structured final output, invocation identity, and normalized trace |
| fake agent adapter | deterministic offline self-tests | local only | fixture outputs |
| network/connectors/browser | target-profile dependent; default forbidden | explicit profile only | policy events |

## Plan

1. Extract the provider-neutral agent-task result from existing Cascade-specific
   scenario/trace behavior.
2. Define the Codex adapter around isolated `codex exec --ephemeral --json
   --output-schema` invocation, JSONL normalization, output-schema validation,
   tool/permission events, usage, terminal state, sandbox/approval identity,
   and credential isolation.
3. Implement the first standalone target from a digest-bound explicit
   instruction source. Add named custom-agent resolution only after a stable
   selection mechanism proves the exact selected configuration and target
   session identity; otherwise fail preflight.
4. Implement the Cascade-harness evaluation profile as an adapter over current
   scenario selection, grading, judging, and coverage rather than duplicating
   them.
5. Add fake-adapter tests for success, malformed output, missing terminal event,
   mutation, timeout, unsupported adapter, and leakage.
6. Map deterministic eligibility, response claims, semantic judgments, policy
   decisions, coverage, and handoffs into the W-004 ledgers without duplicating
   Cascade scenario authority.
7. Author all three agent-response manifests and validate target/profile,
   runtime, permission, and claim references in the campaign catalog.
8. Run standalone Codex-agent and Cascade scenario canaries separately and
   report their evidence separately.
9. Publish the source-blind composition-profile seam and normalized tool-call
   linkage to W-012; preserve agent and surface task results separately.

## Parallel Dependencies

- Can run with: W-005 and W-006 after W-004 Gate A.
- Must wait for: W-004 Gate A and a fixed current harness catalog.
- Conflicts with: concurrent edits to eval schemas, trace normalization,
  coverage acceptance, Codex command construction, or judge profiles.

## Handoff And Merge Contract

- Handoff summary: adapter boundary, standalone versus Cascade profiles,
  deterministic gates, live canary verdicts, and costs.
- Required output: Codex adapter, normalized result, two profiles, fixtures,
  and replay commands.
- Integration output: source-blind composition-profile seam and normalized
  tool-call linkage for W-012.
- Merge owner: W-004, with W-001 evaluation authority preserved.
- Merge target: canonical campaign foundation and current harness evaluator.
- Evidence to preserve: full selected target object, prompt digest, runtime
  identity, raw trace, policy decisions, per-claim evidence, grade, judgment,
  coverage disposition, and handoff receipt.
- Stop condition: offline adapter suite passes and each live canary is reported
  exactly as run, blocked, failed, or not run.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| Fake adapter | deterministic agent lifecycle suite | `OPEN` |
| Standalone Codex agent | one source-blind custom-agent canary | `NOT_RUN` |
| Cascade profile | focused current-scenario run and regrade | `NOT_RUN` |
| Harness regressions | catalog, self-test, known failing handoff preservation | `OPEN` |
| Leakage/safety | golden-source and mutation negative probes | `OPEN` |
| Claims/handoffs | multi-claim evidence, semantic non-compensation, and proposed-versus-accepted route fixtures | `OPEN` |

## Status Reconciliation

- Last checked: `2026-07-30`
- Source identity: clean implementation baseline
  `master@60fdc2464b9782a689d3f53ffa8fc177f486e6a8`; revision-9 planning diff
  applied on top
- Completion disposition: `KEEP_OPEN`
- Reason: provider-neutral agent task runtime, profiles, and tool-event
  composition seam are absent; required gates remain `OPEN`/`NOT_RUN`.
- Synchronized surfaces: lane, active registry, report index, and IG-001 plan
  revision 9.

## Closeout

- Merge evidence: pending.
- Report: program report and W-001 follow-up only if current evidence changes.
- Remaining risk: model/runtime variance remains separate from adapter
  correctness.
