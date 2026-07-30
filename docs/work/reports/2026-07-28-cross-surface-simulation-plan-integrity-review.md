# Cross-Surface Simulation Plan Integrity Review

Date: 2026-07-28
Status: `PLANNING_ACCEPTED`; implementation `NOT_STARTED`
Graph: `IG-001`, revision 4
Scope: W-004 through W-010 plus W-012
Next executable node: `IG-01`

Historical review boundary: this report records the revision-4 integrity
review. The current active authority is the revision-7
[`Cross-Surface Simulation Work Graph`](2026-07-27-cross-surface-simulation-work-graph.md);
do not use this report's revision number as current execution state.

## Verdict

The requested workflow is included in the plan:

```text
simulation-campaigns
  -> simulation-operator / simulation-execution
  -> harness-evaluator, only for Cascade route or trace claims
  -> simulation-evaluator / simulation-evaluation
  -> campaign aggregation
```

The plan also includes CLI, terminal/TUI, browser, native desktop, mobile,
standalone Codex-agent, Cascade-harness, Computer Use, and agent-to-tool
composition variants.

After the corrections recorded below, the graph is structurally coherent:

- one shared foundation owns schemas, claims, policies, oracles, rubrics,
  identities, artifacts, receipts, recovery, reduction, and aggregation;
- each public interaction contour has one adapter workline;
- existing command, browser, and agent-response work is assessed and
  refactored;
- missing terminal, desktop, and mobile work is implemented from the ground
  up;
- W-012 composes accepted agent and surface seams without creating duplicate
  hybrid task kinds;
- deterministic implementation gates and live/platform capability gates are
  separate;
- mobile and desktop are independent consumers of the browser visual-action
  seam and may be implemented in parallel.

This is a plan-readiness result, not a runtime-readiness result. The current
checkout contains the skills, roles, worklines, and design documents, but not
the canonical campaign runner, schemas, adapters, receipt store, or live run
evidence. The only safe next step is `IG-01`; claiming that the system works
before Gate A, Gate B, and the relevant live canary would be unsupported.

## Current Implementation Boundary

| Layer | Current state | What that state proves |
|---|---|---|
| Campaign, execution, and evaluation skill contracts | `IMPLEMENTED` | routing and responsibility are authored |
| Simulation operator and evaluator role contracts | `IMPLEMENTED` | intended mutable/read-only permission separation is authored |
| W-004–W-010 and W-012 worklines | `PLANNED` | scope, ownership, acceptance, and dependencies exist |
| `IG-001` revision 4 | `PLANNED` | implementation order, gates, invalidation, and merge ownership exist |
| Current `evals/campaigns/`, tasks, claims, policies, oracles, and rubrics | `GAP` | no current canonical runtime definitions exist |
| Current runner and typed adapters | `GAP` | no current command, browser, agent, PTY, desktop, or mobile execution path exists |
| Immutable run and receipt artifacts | `NOT_RUN` | no current execution/evaluation chain has been produced |
| Computer Use, Codex, desktop, Android, and iOS canaries | `NOT_RUN` | no live capability or platform coverage is established |

The candidate branch is an `IG-01` source input, not current authority. Its
minimal command/browser runner can inform the cutover, but its shallow schema,
non-atomic run creation, external evidence references, and lack of
claim/policy/oracle/receipt/recovery boundaries are insufficient as the final
foundation.

## Integrity Of The Work Graph

### Dependency proof

| Stage | Dependency | Integrity judgment |
|---|---|---|
| `IG-01` | current checkout, candidate branch, dirty-work ownership, W-011 overlap | correct fixed-point starting gate |
| `IG-02` | `IG-01` | schemas and registries cannot be frozen before canonical source selection |
| `IG-03`–`IG-05` | `IG-02` | lifecycle, artifact identity, and policy decisions share definitions but can be internally sectioned |
| `IG-06`–`IG-07` | lifecycle, identity/artifact, and policy seams | evaluation and receipt joining correctly follow their producer contracts |
| `IG-08` / Gate A | all W-004 foundation seams | failure injection precedes every real surface adapter |
| `IG-09`–`IG-11` | Gate A | command, browser, and agent work can proceed in parallel with disjoint ownership |
| `IG-12` | accepted command process-result seam | PTY cleanup and result handling reuse process foundations |
| `IG-13` | accepted browser visual-action seam | desktop reuses action/observation vocabulary, not browser behavior |
| `IG-14` | Gate A plus accepted browser visual-action seam | mobile reuses visual actions but not the desktop provider |
| `IG-15` | exact dispositions from all six task seams | one merge owner performs direct canonical cutover |
| `IG-16` | `IG-15` and all accepted seams | composition follows, rather than invents, surface contracts |
| Gate B | integrated deterministic evidence | proves implementation only |
| `IG-17` | Gate B plus per-campaign readiness | live and platform evidence stays capability-scoped |

The graph has 19 unique node or gate IDs: `IG-01` through `IG-17`, `IG-GA`,
and `IG-GB`. No new workline is needed for the integrity corrections because
each correction belongs to an existing W-004 foundation invariant or its
owning surface lane.

### Parallelism and serialization

- Serialize `IG-01` and W-004 shared-contract work.
- After Gate A, run W-005, W-006, and W-007 in parallel only when each writes
  its own adapter, fixtures, and manifests.
- After the producer seams accept, W-008, W-009, and W-010 may run in
  parallel. W-009 and W-010 do not depend on each other.
- Serialize `IG-15` canonical cutover and `IG-16` composition.
- After Gate B, live campaigns may run independently; one result never
  substitutes for another contour, driver, runtime, or platform.

## Workline Coverage

| Workline | Change class | Coverage | Readiness judgment |
|---|---|---|---|
| W-004 shared foundation | assessment and foundation refactor | schemas, catalog, claims, policies, oracles, rubrics, lifecycle, policy decisions, identities, artifacts, recovery, receipts, reduction, aggregation | complete plan; highest structural risk |
| W-005 command | assessment and refactor | direct process, argv/cwd/env policy, output/files, timeout, signals, cleanup, unknown external outcome | complete plan |
| W-006 browser | assessment and refactor | Playwright, Computer Use, isolated profiles, navigation/action policy, visual and public-state evidence | complete plan |
| W-007 agent response | assessment and refactor | provider-neutral result, standalone Codex, Cascade specialization, tool events, trace/judge receipts | complete plan with named-agent capability gate |
| W-008 terminal | ground-up | PTY/TUI, screen/transcript, resize/signals, redaction, orphan cleanup, optional visual driver | complete plan |
| W-009 desktop | ground-up | isolated Linux fixture first, native automation, Computer Use, exclusive lease, crash/reset | complete plan; macOS and Windows deferred |
| W-010 mobile | ground-up | Android emulator first, iOS Simulator gate, lifecycle, permissions, logs, reset, exclusive lease, Computer Use | complete plan; real devices deferred |
| W-012 agent-tool composition | integration | one source-blind agent with each accepted command, browser, terminal, desktop, and mobile seam | complete plan; no hybrid task kinds |

## Assumption Register

`CONFIRMED` means the plan or current repository establishes the assumption.
`TO_PROVE` means implementation must demonstrate it at the named gate.
`GATED` means the capability is legitimate but cannot be assumed available.

| ID | Assumption | State | Required proof or failure disposition |
|---|---|---|---|
| A-01 | One canonical runner can replace candidate and current fragments without a compatibility path. | `TO_PROVE` | `IG-01` selects a direct cutover base; otherwise `BLOCKED` |
| A-02 | One common task/result envelope can represent all six contours without hiding contour-specific lifecycle rules. | `TO_PROVE` | Gate A fake-adapter conformance matrix |
| A-03 | Claims match policies, oracles, and evidence by stable ID, supported version, digest, declared scope, and applicability—not by prose similarity. | `CONFIRMED` in plan; `TO_PROVE` in code | unresolved, stale, ambiguous, or inapplicable references fail before provisioning |
| A-04 | Policy decisions can be repeated at action time after preflight. | `TO_PROVE` | allow/deny/confirmation/default-deny fixtures at Gate A |
| A-05 | Deterministic oracles can remain independent from the driver that performed the action. | `TO_PROVE` | failed-oracle fixtures for every adapter |
| A-06 | The local filesystem can support practical evidence freezing. | `TO_PROVE` | copy or content-address evidence bodies, hash them, atomically finalize, prohibit normal writer mutation, and verify later; this is application-enforced immutability, not WORM storage |
| A-07 | A future remote artifact store can preserve the same contract. | `GATED` | requires a new storage adapter with atomic reservation and append-only semantics; local success does not prove it |
| A-08 | Run IDs and receipt IDs can be reserved atomically under concurrent operators. | `TO_PROVE` | reservation-race fixture; losing operator emits no target action |
| A-09 | The runtime exposes stable target, operator, specialized evaluator, general evaluator, and aggregator role/session identities. | `TO_PROVE` | receipt acceptance rejects missing, reused, or mismatched identities |
| A-10 | An interrupted external action may have an unknowable outcome. | `CONFIRMED` as a safety assumption | finalize as unknown, perform cleanup-only recovery, and never auto-retry |
| A-11 | Each stage can write to an append-only sibling namespace without modifying the execution package. | `TO_PROVE` | digest-chain and overwrite-negative fixtures |
| A-12 | Aggregation can reduce receipts mechanically without executing or re-judging the target. | `TO_PROVE` | Gate A receipt-chain fixtures and Gate B campaign projection |
| A-13 | Direct command execution can be bounded by argv, cwd, env, timeout, effects, and cleanup. | `TO_PROVE` | W-005 deterministic campaigns |
| A-14 | Playwright can provide the first deterministic browser seam. | `GATED` | W-006 dependency/tool preflight; unavailable runtime is `BLOCKED`, not a pass |
| A-15 | Computer Use can be safely mediated as a driver. | `GATED` | isolated browser/VM, untrusted-content handling, per-action policy validation, ordered batch execution, and confirmation for high-impact actions |
| A-16 | The first standalone Codex canary can run non-interactively with a digest-bound instruction source, JSONL events, and an output schema. | `GATED` | W-007 isolated `codex exec --ephemeral --json --output-schema` capability probe |
| A-17 | A named Codex custom agent can be invoked with a stable machine-readable identity. | `GATED` | keep the named-agent variant `BLOCKED` until the exact invocation seam is documented and proven; do not invent an unsupported flag |
| A-18 | Cascade-specific trace grading can remain outside the provider-neutral agent schema. | `CONFIRMED` in architecture; `TO_PROVE` in integration | W-007 emits the specialized receipt only for Cascade profiles |
| A-19 | A portable PTY library can provide bounded resize, signal, screen, and orphan-process behavior. | `GATED` | `IG-01` selects the dependency; W-008 deterministic fixtures prove behavior |
| A-20 | A disposable Linux desktop fixture is available before broader native platforms. | `GATED` | W-009 provider preflight; macOS/Windows remain `DEFERRED` without controlled providers |
| A-21 | Android emulator automation is the first practical mobile path. | `GATED` | exact SDK, emulator image, device, and app-build identity plus reset verification |
| A-22 | iOS Simulator execution is available only on a matching controlled macOS host. | `CONFIRMED` as a platform gate | unavailable host reports `BLOCKED`; Android evidence cannot replace it |
| A-23 | Mobile Computer Use can reuse visual action vocabulary without reusing the desktop provider. | `TO_PROVE` | W-010 consumes W-006 visual seam and owns its own device lifecycle/provider |
| A-24 | Source-blind agent-to-tool composition can preserve independent agent and surface results. | `TO_PROVE` | W-012 fake five-contour matrix before any live composed canary |
| A-25 | Noninteractive runs cannot obtain interactive approval automatically. | `CONFIRMED` as a runtime constraint | approval-required action is `BLOCKED` unless a declared confirmation channel exists |
| A-26 | Redaction can occur before immutable freeze without making required evidence unusable. | `TO_PROVE` | secret fixture must fail closed when safe required evidence cannot be produced |
| A-27 | Runtime, provider, token, action, cost, time, and artifact-size budgets can be known before a live run. | `GATED` | missing approval or budget blocks only the affected campaign |
| A-28 | Retention and disk capacity are sufficient for screenshots, video, traces, and logs. | `TO_PROVE` | W-004 defines size limits and retention; preflight blocks insufficient capacity |
| A-29 | Schema evolution can use one canonical current representation. | `TO_PROVE` | supported migrations normalize once; unsupported or ambiguous versions fail before execution |
| A-30 | Exact handoff ownership can be known at every terminal state. | `TO_PROVE` | accepted, rejected, pending, stale, retry, recovery, and not-applicable receipt fixtures |

## Claims And Policy Matching Integrity

The planned matcher is intentionally deterministic:

1. Resolve each campaign, task, claim, policy, oracle, rubric, fixture, and
   runtime definition by stable ID.
2. Validate its schema version and canonicalize only through an explicitly
   supported migration.
3. Bind the resolved definition digest into the execution source manifest.
4. Evaluate policy applicability against the exact contour, driver, runtime,
   platform, action, account, and environment identity.
5. Record every `ALLOW`, `DENY`, `REQUIRE_CONFIRMATION`, or
   `NOT_APPLICABLE` decision with its policy version and observation.
6. Run required independent oracles over frozen evidence.
7. Accept semantic judgments only from the required identity-matched receipt.
8. Reduce each claim separately. Missing evidence, denied policy, failed
   oracle, cleanup failure, identity mismatch, or unsupported coverage cannot
   be compensated by good model prose.

Campaign definitions must declare these relationships before execution. The
simulation may analyze whether claims are supported, but it must not generate
new claims or silently choose new policies after seeing the result. Suggested
claims may be emitted as review proposals only and require a new authored
campaign version before they can be executed.

## Identity, Receipt, And Handoff Integrity

| Stage | Mutable target access | Required producer identity | Stored output |
|---|---|---|---|
| Campaign resolution | no target execution | campaign author/coordinator | approved selection and source digest |
| Execution | yes, within declared permissions | target actor plus simulation operator | immutable execution package and execution receipt |
| Cascade specialization | no | harness evaluator | specialized evaluation receipt |
| General evaluation | no | simulation evaluator distinct from actor/operator | evaluation receipt |
| Aggregation | no target execution | aggregator | aggregation receipt and scoped projection |

Receipt acceptance requires:

- exact run, campaign version, source, environment, and parent receipt IDs;
- digest verification of every required input and frozen artifact;
- role and session identity separation;
- terminal cleanup and recovery state;
- no mutation of an earlier namespace;
- exact next owner, required inputs, and accepted, rejected, pending, stale,
  retry, recovery, or not-applicable disposition.

The operator and evaluator must differ. For Cascade profiles, the specialized
harness evaluator and the general simulation evaluator also remain separately
attributable. The aggregator may share the campaign-owning role, but it cannot
act as the operator or evaluator for the receipt it projects.

## Corrections Made By This Review

1. Added atomic run reservation, execution leases, finalization, and explicit
   interrupted-run recovery.
2. Added target actor and operator identities to execution receipts and all
   stage identities to evaluation and aggregation linkage.
3. Split execution, specialized evaluation, general evaluation, and
   aggregation into append-only sibling namespaces.
4. Added canonical `evals/oracles/` and `evals/rubrics/` source authorities.
5. Added schema migration, reservation race, unknown outcome, unsafe evidence,
   receipt-chain, and batched Computer Use failure cases.
6. Required per-action validation of Computer Use action batches and stopping
   before the first denied or confirmation-required action.
7. Changed the initial standalone Codex canary to a documented isolated
   noninteractive seam and gated named-agent invocation until it is proven.
8. Removed the stale desktop-to-mobile dependency from the lane graph and
   ownership table.
9. Expanded Gate A and Gate B to require identity-matched receipt-chain
   evidence rather than only task completion.
10. Updated the operator/evaluator design, campaign skill design, glossary,
    active lane, graph revision, and report index to the same authority.

## Complexity Score

Scoring uses five equally weighted dimensions, each from 1 to 10:

- boundary breadth;
- external runtime/platform variance;
- persistent state, concurrency, and recovery;
- permissions, safety, and isolation;
- novelty and integration uncertainty.

The reported score is the rounded average, with a one-point criticality uplift
when corruption, duplicate external effects, or unsafe host control is a
credible failure mode.

| Workline or gate | Breadth | Runtime variance | State/recovery | Safety | Novelty | Overall | Class |
|---|---:|---:|---:|---:|---:|---:|---|
| W-004 foundation | 10 | 5 | 10 | 9 | 9 | **10/10** | critical |
| W-005 command | 5 | 4 | 6 | 6 | 4 | **5/10** | medium |
| W-006 browser | 7 | 7 | 7 | 9 | 7 | **8/10** | high |
| W-007 agent response | 8 | 8 | 7 | 8 | 9 | **8/10** | high |
| W-008 terminal | 6 | 7 | 8 | 7 | 7 | **7/10** | high |
| W-009 desktop | 8 | 9 | 9 | 10 | 9 | **9/10** | very high |
| W-010 mobile | 9 | 10 | 10 | 10 | 10 | **10/10** | critical |
| W-012 composition | 10 | 9 | 9 | 10 | 10 | **10/10** | critical |
| Gate A deterministic foundation | 9 | 3 | 9 | 8 | 8 | **7/10** | high |
| Gate B deterministic integration | 10 | 6 | 9 | 9 | 9 | **9/10** | very high |
| IG-17 live/platform rollout | 10 | 10 | 9 | 10 | 10 | **10/10** | critical |

Overall program complexity is **10/10 (critical)**. This does not mean the
plan is unimplementable. It means implementation must remain staged: prove the
small shared deterministic foundation, accept each contour independently,
integrate once, and only then spend on isolated live/platform evidence.

## Validation Evidence

| Check | Result | Evidence boundary |
|---|---|---|
| Three simulation skill packages | `PASS` | `quick_validate.py` passed for campaign, execution, and evaluation packages in a PyYAML-capable environment |
| Harness catalog | `PASS` | 41 skills, 319 scenarios, digest `f975c361819767d05319b7f4b636fa8b9e211e3c56b2005de930dd4d665d6552` |
| Harness evaluator self-test | `PASS` | 15 cases |
| Python compilation and harness JSON parsing | `PASS` | validator, harness runner, generated scenarios, and skill cases |
| Dependency-excluded simulation source | `PASS` | the aggregate validator produced no current source-file finding |
| Aggregate Cascade validator | `FAIL` | 36 findings, all under the root and `.codex/harness-tooling` Playwright `node_modules` trees |
| Diff whitespace and stale graph references | `PASS` | no whitespace error, revision-3 reference, or desktop-to-mobile dependency remains in the simulation planning slice |
| Campaign runner, schemas, adapters, receipts, and deterministic campaigns | `NOT_RUN` | W-004 through W-012 implementation has not started |
| Computer Use, Codex, desktop, Android, and iOS live/platform evidence | `NOT_RUN` | `IG-17` remains behind Gate B and per-campaign readiness |

The aggregate failure is not converted into a planning pass. It is reported
separately because the 36 findings are dependency scanner leakage rather than
simulation source findings.

## Remaining Risks And Stop Conditions

| Risk | Severity | Containment |
|---|---|---|
| Shared schema changes after surface work begins | critical | reopen Gate A and invalidate only consuming evidence |
| Duplicate external effects after timeout/crash | critical | unknown outcome, cleanup-only recovery, no automatic retry |
| Unsafe host, account, or network control | critical | isolated environment, default deny, explicit confirmation |
| Secret leakage into immutable evidence | critical | redact before freeze; fail closed when safe evidence is impossible |
| Candidate runner imported as a second authority | high | `IG-01` direct cutover decision; no fallback path |
| Named Codex-agent invocation assumed without a supported seam | high | keep named-agent capability `BLOCKED`; use explicit instruction source first |
| Desktop or mobile environment unavailable | high | exact `BLOCKED` platform disposition; no substitute coverage |
| Evaluator judges mutable or mismatched evidence | high | append-only namespaces and digest/identity verification |
| Composition hides a failing surface result | high | preserve independent results and non-compensating joined reduction |
| Artifact volume exceeds local capacity | medium | declared size/retention budgets and preflight |

Stop implementation and reopen the owning gate when a shared contract cannot
represent a real adapter without ambiguity, an environment cannot be reset
and verified, an identity cannot be attributed, required evidence cannot be
frozen safely, or an external outcome is unknown.

## Implementation Recommendation

Proceed with `IG-01` only:

1. inventory the current checkout, candidate branch, ignored campaign
   artifacts, W-011 overlap, and dirty-file owners;
2. select the canonical runner base and direct-cutover boundary;
3. publish the allowed-write map and exact Gate A implementation slice;
4. implement W-004 through fake adapters and failure injection;
5. do not start a surface adapter until Gate A has one accepted schema and
   interface digest.

No additional simulation workline should be added now. Add a new lane only if
`IG-01` discovers a genuinely separate authority, such as a remote artifact
service implementation or a real-device lab provider, rather than another
contour variant that belongs to an existing lane.

## Sources

- Current checkout, worklines, skill and role contracts, and `IG-001`
  revision 4.
- Candidate branch `agent/w003-integration-r4-g3`, inspected only as a
  fixed-point input.
- OpenAI Computer Use guide:
  <https://developers.openai.com/api/docs/guides/tools-computer-use>.
- Current Codex CLI documentation for noninteractive execution, JSONL output,
  output schemas, ephemeral sessions, and custom-agent configuration.
