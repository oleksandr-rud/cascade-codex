# Work Lane: W-004 Cross-Surface Simulation Foundation

Status: `IN_PROGRESS`
Owner: `agent-engineer`
Created: 2026-07-27
Lane Model: `orchestrator-workers`
Planning Status: `N07_R82_A2_GF101_FAILED`; N08 deterministic candidate retained
Plan Revision: `82`
Next Gate: replan the receiver-authenticated handoff boundary after the N07 GF-101 rejection
Execution Surface: `root`
Dispatch State: `RUNNING`
Dispatch Authorization: explicit user authorization for subagents and delegated workline implementation, 2026-08-05
Runtime Handle: current root task
Implementation Base: `master@4226bfa1f69f069407b5f383e8c72dd39aa5abed` plus the preserved active worktree

## Request

Establish the canonical shared campaign task, adapter, execution lifecycle,
claim, policy, result, evidence, identity, runtime handoff, permission, and
cleanup contracts needed by command, HTTP, terminal, browser, desktop, mobile,
and agent-response tasks.

## Current Fixed Point

N06 revision 79 attempt 50 remains accepted against immutable r67. N07
revision 82 attempt 2 preserves operation-bound multi-interruption recovery and
manifest-pinned retry-parent reads. Immutable parent r75 and retry r76 are
`VALID`/`COMPLETED`/`FRESH`; r76 verifies 128 files at manifest
`9a00031ae1b697b3bf3048aeee72f751e776ab6adb0a3e58ace00800b5b89514`.
Architecture/functional and reducer/evaluator reviews accept r76, but GF-101
rejects it because the operator can mint a receiver-labelled store and both
the receiving evidence and `ACCEPTED` handoff. N07 therefore remains open.
N08 r77/r78 retains passing deterministic, release-false evidence, but its
review and Gate A remain blocked on an accepted N07 boundary.

## Acceptance Criteria

- Current `master`, its dirty work, and the campaign implementation on
  `agent/w003-integration-r4-g3` are compared before source changes.
- One canonical runner replaces duplicate or stale campaign paths directly.
- Task kind and driver are separate typed fields.
- All seven task kinds share one bounded lifecycle and result envelope.
- One goal-driven session can coordinate several typed surfaces, journal each
  dispatch, checkpoint each completed batch, roll bounded episodes, renew its
  lease, and terminate conservatively when its goal remains unmet.
- Each adapter owns preflight, execution, evidence, oracle, and cleanup details
  behind a smaller shared interface.
- Required-task failure, blocked preflight, oracle failure, unsafe action, and
  cleanup failure reduce conservatively.
- Claims are declared before execution with stable IDs, classes, coverage
  scopes, required policy IDs, oracle IDs, and evidence requirements.
- Versioned policies resolve before execution and record digest-bound
  applicability plus allow, deny, confirmation, or not-applicable decisions.
- A generated per-task claim ledger cannot promote authored, executed,
  mechanically verified, semantically judged, safety-compliant, covered, or
  release-eligible states into one generic pass.
- Task, fixture, campaign, source, environment, and adapter identities are
  digest-bound in immutable run artifacts.
- Run IDs and stage receipt IDs are atomically reserved; execution,
  specialized evaluation, general evaluation, and aggregation occupy separate
  append-only namespaces.
- Target actor, simulation operator, specialized evaluator, general evaluator,
  and aggregator role/session identities remain independently attributable;
  self-evaluation is rejected mechanically.
- Required evidence bodies are frozen inside the run package rather than
  referenced only through mutable shared paths.
- Cancellation, operator crash, cleanup-only recovery, and unknown external
  outcomes are terminally recorded; recovery never resumes or silently retries
  target actions.
- Every terminal task result records an accepted, rejected, pending, or
  not-applicable runtime handoff receipt with exact artifact digests.
- Validator and self-tests reject unknown kinds/drivers, invalid combinations,
  unbounded inputs, unresolved claim/policy/oracle references, missing evidence,
  invalid handoffs, duplicate IDs, stale catalogs, unsupported schema versions,
  and ambiguous migrations.
- A generated campaign catalog inventories manifest digest, owner lane,
  contour, driver, execution tier, runtime, and claim/policy/oracle references;
  stale or inconsistent entries fail closed.
- Campaign selection is explicit and preserves independent deterministic,
  isolated-live, platform, and release-reporting evidence.
- Cross-contour campaigns may compose existing typed tasks without creating a
  hybrid task kind; the composed result retains each task, policy, oracle,
  evidence, cleanup, and claim disposition independently.
- The `simulation-campaigns` skill owns campaign authoring, selection,
  dispatch planning, replay planning, receipt aggregation, and reporting.
- The `simulation-execution` skill and `simulation-operator` agent own one
  approved mutable run, immutable evidence capture, cleanup, and its execution
  receipt.
- The read-only `simulation-evaluation` skill and `simulation-evaluator` agent
  own evidence, policy, oracle, claim-ledger, and evaluation-receipt judgment;
  Cascade route/trace evaluation first produces a specialized
  `harness-evaluator` receipt.
- Campaign aggregation requires identity-matched execution and evaluation
  receipts and rejects self-evaluation, mismatched identities, or missing
  required specialized receipts.

## Scope

In:

- campaign/task schemas and loaders;
- campaign catalog generation, selection, and contour/driver/tier validation;
- claim, policy, oracle, and rubric schemas, registries, resolvers, and
  ledgers;
- simulation manifests with controlled fixture identity;
- task dispatcher and adapter interface;
- shared lifecycle/result/evidence contracts;
- permission, budgets, redaction, atomic reservation/finalization, artifact
  identity, runtime handoff, execution/specialized-evaluation/general-
  evaluation/aggregation receipts, role separation, recovery, and cleanup
  policy;
- canonical docs/config/validator wiring;
- merge integration for W-005 through W-010 and W-012.

Out:

- task-kind-specific driver implementation owned by W-005 through W-010;
- agent-to-tool composition profiles and manifests owned by W-012;
- real user accounts, host desktop control, production mobile devices;
- live model effectiveness claims.

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| Request | current task and Annotation 1 | task kinds, mobile extension, agent boundary | current |
| Current checkout | `master`; dirty diff; `docs/work/active.md` | preserve active architecture and PR-contract work | current |
| Work graph | `docs/work/reports/2026-07-27-cross-surface-simulation-work-graph.md` | executable nodes, gates, waves, invalidation, and partial repair | current authored plan |
| Campaign candidate | `agent/w003-integration-r4-g3`: `scripts/cascade/campaigns.ts`; `product-evals/tasks/`; `product-evals/campaigns/` | existing task/campaign implementation | branch snapshot; must reconcile |
| Evaluation authority | `scripts/cascade/evals.ts`; `harness-evals/` | current trace, grading, catalog, and self-test behavior | current checkout |
| Architecture | `docs/patterns/boundaries/index.md`; architecture defaults | adapter and platform boundaries | current dirty work |
| Provider reference | OpenAI Computer Use guide | screenshot/action loop and isolation | fetched 2026-07-27 |

## Campaign Deliverables

| Campaign ID | Tier | Required Evidence Boundary | Status |
|---|---|---|---|
| `simulation-contract-smoke` | PR deterministic | Fake adapters for every declared contour; lifecycle, identity, claim/policy/oracle resolution, artifact, cleanup, and conservative result reduction | `OPEN` |
| `cross-contour-handoff-smoke` | PR deterministic | Typed task results and accepted, rejected, pending, stale, retry, and not-applicable handoff receipts without external runtimes | `OPEN` |

W-004 also generates and validates
`product-evals/campaigns/catalog.generated.json`. It does not own the surface campaign
behavior: W-005 through W-010 own their named manifests and adapter fixtures
after Gate A, while W-004 remains merge owner for catalog, schema, selection,
artifact, joined reduction, and release-projection contracts. W-012 owns
agent-to-tool composition profiles, manifests, and fixtures after WG-001-N15 while
consuming the accepted surface and agent seams.

### 2026-07-30 Framework Implementation Evidence

The canonical local foundation now includes population, scenario, stateful
world, partitioned dataset, metric, treatment, calibration, campaign, task,
claim, policy, and oracle schemas; a Bun runner and generated catalog; frozen
source/evidence artifacts; distinct operator/evaluator/aggregator identities;
and deterministic claim/calibration reduction.

Seven campaign manifests validate. `simulation-contract-smoke` and
`simulation-calibration-ranking-smoke` executed under new immutable run IDs
with execution/evaluation/calibration/aggregation receipts. The
`simulation-codex-evaluation-smoke` canary also executed through a separate
Sol/high read-only evaluator context with a frozen 72-file input packet,
packet-manifest echo, complete JSONL trace, schema-v2 receipt, and
digest-matched aggregation. All three passed their bounded framework scope and
remained
`release_eligible=false`. A preserved failed Codex attempt proves provider
failure blocks before aggregation.

W-004 remains `OPEN`: all-seven-contour fake coverage, reservation-race,
cleanup-only recovery, redaction, runtime handoff, specialized evaluation,
cross-contour composition, and surface adapter acceptance are not yet proven.

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `SF-001` | Given an unknown kind/driver pair, validation fails before execution. | `simulation-definitions.test.ts`: mismatched surface/driver rejection | `REVIEW` |
| `SF-002` | Given missing required inputs, preflight returns `BLOCKED` and emits no execution events. | `campaigns.test.ts`: preflight block without dispatch | `REVIEW` |
| `SF-003` | Given a successful driver but failed oracle, the required task and campaign fail. | `campaigns.test.ts`: oracle exception failure with cleanup | `REVIEW` |
| `SF-004` | Given cleanup failure after a successful oracle, the task fails with cleanup as the earliest unresolved gate. | cleanup self-test | `OPEN` |
| `SF-005` | Given a retry, the original artifact tree remains unchanged and the retry uses a new run ID. | digest comparison | `OPEN` |
| `SF-006` | Given a required claim with an unknown policy or oracle, validation returns `INVALID` before provisioning. | definition/reference-resolution tests | `REVIEW` |
| `SF-007` | Given an evidence producer writes to a shared path, the artifact writer freezes the evidence body inside each run before reduction. | `campaign-artifacts.test.ts`: bounded frozen-file evidence | `REVIEW` |
| `SF-008` | Given authored, executed, exact-oracle, semantic, safety, coverage, and release claims, the claim ledger reports each independently and reduces required claims conservatively. | claim-ledger fixture | `OPEN` |
| `SF-009` | Given a completed task with a next gate, the run records a digest-bound accepted, rejected, pending, or not-applicable handoff receipt. | handoff receipt self-test | `OPEN` |
| `SF-010` | Given a campaign manifest changes without catalog regeneration, catalog validation fails before execution. | catalog drift self-test | `OPEN` |
| `SF-011` | Given one contour has deterministic and live drivers, selection preserves separate campaign IDs, permission gates, evidence, and claims. | selection matrix self-test | `OPEN` |
| `SF-012` | Given release reporting selects several completed campaigns, aggregation references immutable run IDs and retains every independent failure/blocker. | release-projection fixture | `OPEN` |
| `SF-013` | Given a campaign composes two typed tasks, it retains separate task results and supports a composed claim only when every required task claim, policy, oracle, evidence, cleanup, and receipt gate passes. | generic composition fixture | `OPEN` |
| `SF-014` | Given one composed task requests an action denied by the referenced surface policy, later task completion or semantic judgment cannot support the affected safety or behavior claim. | generic cross-contour policy and reduction fixture | `OPEN` |
| `SF-015` | Given two operators race on one requested run ID, one reservation wins atomically and the loser produces no target event or artifact overwrite. | concurrency/reservation fixture | `OPEN` |
| `SF-016` | Given an operator is interrupted after a possibly external action, an explicit recovery identity performs cleanup and finalization without resuming target execution or auto-retrying the unknown outcome. | crash/recovery fixture | `OPEN` |
| `SF-017` | Given all evaluation stages complete, execution, specialized evaluation, general evaluation, and aggregation receipts occupy separate append-only namespaces and form one digest-verified chain. | receipt-chain fixture | `OPEN` |
| `SF-018` | Given the operator and evaluator share a role or session identity, evaluation receipt acceptance fails before claim reduction. | role/session identity negative fixture | `OPEN` |
| `SF-019` | Given required evidence contains an unredactable secret, freezing fails closed and neither execution nor safety claims pass. | evidence-redaction fixture | `OPEN` |
| `SF-020` | Given an unsupported schema version, validation emits no execution events; a supported migration yields one canonical current definition without a legacy runtime path. | schema migration fixture | `OPEN` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| Campaign tasks | current request | task/campaign schemas and runner | yes | stable IDs, explicit argv, required-task reduction | schema and self-tests | `NOT_RUN` | `implement-change` |
| Campaign portfolio | contour follow-up | generated catalog, explicit selection, and release projection | yes | independent contour/driver/platform verdicts | catalog drift and selection tests | `NOT_RUN` | `implement-change` |
| Harness evaluation | W-001 | eval runner, scenarios, coverage | yes | historical 290-case run evidence, current 368-case catalog, and conservative grading | catalog/self-test/coverage probes | `NOT_RUN` | `harness-evaluation` |
| Target onboarding | W-002/W-003 | config, validator, architecture defaults | no | dirty source and completed architecture work | full Cascade validator | `NOT_RUN` | `validate-change` |
| Claim/policy/oracle/rubric authority | simulation audit | `product-evals/claims/`; `product-evals/policies/`; `product-evals/oracles/`; `product-evals/rubrics/`; resolvers and ledgers | yes | hard gates remain non-compensating | schema, reference, decision, oracle, rubric, and reduction tests | `NOT_RUN` | `implement-change` |
| Artifact evidence | program plan | `.artifacts/product-evals/` self-contained run contract; `.artifacts/campaigns/` historical only | yes | immutable failed runs, frozen evidence bodies, and digest linkage | overwrite/retry artifact fixture tests | `NOT_RUN` | `functional-qa` |
| Runtime handoff | simulation audit | task result and handoff receipt schema | yes | `next_route` remains a proposal until receipt | accepted/rejected/pending receipt tests | `NOT_RUN` | `validate-change` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| shared task/campaign schemas | W-004 | write | no surface lane edits |
| campaign catalog generator and selection/release projection | W-004 | write | surface lanes contribute manifests only |
| `product-evals/claims/`, `product-evals/policies/`, `product-evals/oracles/`, `product-evals/rubrics/`, simulation manifest schema | W-004 | write | one canonical authority |
| shared campaign dispatcher/result/lifecycle | W-004 | write | adapter calls only |
| artifact writer, identity envelope, claim reducer, handoff receipts | W-004 | write | no surface-specific duplicate writers |
| shared composed-task and joined-result contracts | W-004 | write | no composition-specific profile or manifest ownership |
| agent-to-tool profiles, manifests, and joined-result fixtures | W-012 | read/merge-only | consume accepted task seams; W-004 merges catalog and shared-contract evidence |
| canonical docs/config/validator | W-004 | merge-only | integrate surface-lane evidence |
| surface adapter modules and fixtures | W-005 through W-010 | read | merged through declared adapter interface |
| existing dirty architecture/PR work | current user work | preserve | reopen before overlapping edits |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| Git | compare current checkout and candidate branch | read-only | fixed-point source inventory |
| OpenAI developer docs | current Computer Use loop and isolation | read-only | URL and design constraints only |
| local validators | schema and repository checks | allowed | exact command evidence |
| live Computer Use/model tools | none in foundation implementation | forbidden until surface canaries | report `NOT_RUN` |

## Plan

1. Execute `WG-001-N01`: inventory the current and candidate runner, schemas,
   fixtures, docs, config, validator, artifact consumers, generated catalogs,
   W-011 overlap, and current dirty-work owners.
2. Select and record the canonical integration base; preserve dirty work and
   reject broad branch integration that overwrites current authorities.
3. Define common task, driver, claim, policy, permission, budget, oracle,
   rubric, cleanup, result, identity, evidence, runtime-handoff, execution,
   specialized-evaluation, general-evaluation, and aggregation-receipt schemas
   with explicit valid combinations and actor/operator/evaluator/aggregator
   identity separation.
4. Define `product-evals/claims/`, `product-evals/policies/`, `product-evals/oracles/`,
   `product-evals/rubrics/`, and `product-evals/simulations/<harness|product>/<simulation-id>/` as canonical
   source authorities and reject unresolved, stale, or unsupported-version
   references before provisioning.
5. Define the campaign contour/driver/execution-tier rules, generated catalog,
   explicit selection, and immutable-run release projection.
6. Split the runner into lifecycle/dispatcher, atomic identity/lease manager,
   self-contained namespaced artifact writer, policy decision engine, claim
   reducer, receipt-chain/aggregation writer, recovery/cleanup coordinator, and
   task adapters only where each module owns real invariants.
7. Add fake adapters, fake operator/evaluator receipts, and failure-injection
   self-tests for reservation races, interruption/recovery, unknown external
   outcome, unsafe evidence, self-evaluation, receipt mismatch, and missing
   specialized receipts before surface adapters.
8. Publish Gate A when schemas, catalog generation, selection, reference
   resolution, identity, frozen artifact,
   conservative claim reduction, role separation, matching execution/evaluation
   receipts, and handoff interfaces pass without any live runtime.
9. Merge W-005 through W-010 adapters and named campaign manifests without
   allowing them to change shared
   contracts independently.
10. Merge W-012's `agent-tool-composition-smoke` profiles, manifests, and
    evidence only after WG-001-N15 publishes the accepted agent and five surface
    seams; retain every task result and surface policy independently.
11. Run cross-kind campaign, composition matrix, claim/policy coverage, artifact immutability,
    handoff, validator, and regression checks; publish Gate B.
12. After Gate B, aggregate W-012's separately authorized live agent-command,
    agent-browser, agent-terminal, agent-desktop, and agent-mobile canary
    dispositions without inferring one from another.

## WG-001-N03 Implementation Receipt

WG-001-N03 was implemented from the current `master` source only. No candidate-branch
commit, archived patch, overwritten implementation, or historical run artifact
was imported.

| Binding | Current value |
|---|---|
| Plan / node | `WG-001` plan revision 11 / work-graph revision 11 / `WG-001-N03` |
| State / attempt | `ACCEPTED`; attempt 3 of 3 |
| Objective | finish the bounded lifecycle and adapter seam, including typed result events, cleanup, cancellation/recovery, and unknown-outcome behavior |
| Required inputs | accepted `WG-001-N02` definitions; clean base `master@21ba5288`; seven-entry campaign catalog; 44-skill/368-scenario harness catalog |
| Actual implementation writes | `scripts/cascade/campaigns.ts`, `scripts/cascade/campaigns.test.ts`, `scripts/cascade/common.ts`, `scripts/cascade/common.test.ts`, and generated `product-evals/campaigns/catalog.generated.json` |
| Scope amendment | add the generated campaign catalog because every catalog entry binds the current runner source digest; the generated delta changes only seven source digests and the aggregate digest |
| Protected paths | W-005 through W-010 and W-012 lane-owned manifests/adapters; architecture-default sources; archived receipts; live/provider/platform artifacts |
| Required tool / permission | exact Bun 1.3.3 through ephemeral `npx bun@1.3.3`; local implementation and deterministic tests only; no live provider, Computer Use, platform, publication, or spending permission |
| Output | `WG001-N03-EXEC-20260730-A3`; `PENDING -> IN_PROGRESS -> REVIEW -> ACCEPTED` after independent review |
| Acceptance owner | independent architecture/contract reviewer, then W-004 lane-state owner through `validate-change` |
| Repair / exhaustion | attempts 1 and 2 failed independent review; plan revision 11 authorized attempt 3, which passed; any new invalidation returns to `PENDING`, while another unchanged retry is `BLOCKED` pending `plan-change` and user escalation |

Receipt binding:

- source base: `21ba5288b27700f94ecad92ec0cf3d1e5dca5f29`;
- implementation diff digest:
  `a964ee6a736727b13a7e25fef18fc87f13a8128b119f8863a42de2c620e71491`;
- actor/thread: Agent Engineer through root task
  `019fb3c2-bd84-7282-9df0-5477a8321233`;
- deterministic run: `wg001-n03-attempt3-20260730-r1`;
- source-manifest digest:
  `7794a9083f4a6c93567ffc29e03cf9ed1a3f361532170d5469e85b9b7cba3300`;
- task-result digest:
  `c3252df0174d4fe8b78faeb192b4a57cd68cc60c18fb19d26c161621d62df0f5`;
- execution-receipt digest:
  `741ea8956d5c80add273d97af17a55e22a568a32ece30e927d9a42c835caa801`;
- campaign catalog digest:
  `5228269b97beac38bb77fb0e254bc1b2a1244404b0f69ea8685bca6c23f250a8`;
- invalidation: source-base, implementation-diff, adapter/result contract, or
  generated-catalog change reopens WG-001-N03 and its downstream consumers.

Fragment evaluation for this slice selects `GF-004` version 1 as the shared
contract boundary. Product, design, frontend, migration, integration, E2E, and
assurance fragments are `NOT_APPLICABLE` to WG-001-N03 because this slice changes
only the internal campaign lifecycle seam; WG-001-N05, WG-001-N08, surface lanes, and
their later validation gates retain the policy, integration, and public-run
evidence obligations.

Required validation after implementation:

```bash
bun test scripts/cascade/campaigns.test.ts scripts/cascade/simulation-definitions.test.ts scripts/cascade/common.test.ts
bun test --max-concurrency 4 scripts/cascade
bun scripts/cascade.ts campaign catalog --check
bun scripts/cascade.ts campaign self-test
bun scripts/cascade.ts validate
bun scripts/cascade.ts eval catalog --check
bun scripts/cascade.ts eval self-test
git diff --check
```

WG-001-N03's acceptance condition is satisfied. Gate A and downstream surface
work remain closed.

## WG-001-N04 And WG-001-N05 Preparation

Plan revision 12 prepares both open frontier nodes without dispatching or
implementing them. The version-bound implementation packets, architecture
review, security review, fragment disposition ledger, file allowlists,
protected paths, behavior examples, exact checks, attempt bounds, and repair
routes are recorded in
`docs/work/reports/2026-07-30-wg001-next-frontier-preparation.md`.

- N04 receipt: `WG001-N04-PREP-20260730-R12`;
  `PENDING`/`IMPLEMENTATION_READY`/`NOT_AUTHORIZED`.
- N05 receipt: `WG001-N05-PREP-20260730-R12`;
  `PENDING`/`IMPLEMENTATION_READY`/`NOT_AUTHORIZED`.
- Execution order: authorize and accept N04 first, then refresh N05's source
  fingerprints and authorize it separately.
- Work Graph Revision remains 11 because node identities, dependencies,
  actors, ownership, and gates did not change.
- Preparation is not implementation, test execution for the new behavior,
  review acceptance, Gate A evidence, or live/platform evidence.

## WG-001-N04 And WG-001-N05 Implementation

The authorized implementation completed in the root task and is recorded in
`docs/work/reports/2026-07-30-wg001-n04-n05-implementation.md`.

- N04 receipt: `WG001-N04-EXEC-20260730-A1`; state `REVIEW`.
- N05 receipt: `WG001-N05-EXEC-20260730-A1`; state `REVIEW`.
- Fixed-point digest:
  `3d58dc883166880fc0c3499216a980c2af63cd5570153a6a3b3228f5df999598`.
- Focused tests: 48 pass. Aggregate tests: 61 pass.
- Deterministic run `wg001-frontier-20260730-r2`: `PASS`; terminal 72-file
  manifest verification: `VALID`; release eligibility remains false.
- Independent GF-004/GF-101 reviews: `NOT_RUN`; the nodes are implemented but
  not accepted.
- N06 through N08, Gate A, surfaces, and live/platform work remain unopened.

## WG-001-N04 And WG-001-N05 Independent-Review Repair

Plan revision 14 records all four required attempt-2 independent receipts as
`FAIL`. The reviewed source-set digest was
`34c4b495ab5e01d7c312e8e90e649295ea99ced22bac03e0f04a9f42f2dda065`.
The exhausted nodes route through `BLOCKED -> PENDING -> READY -> IN_PROGRESS`
at attempt 3 of 4. The repair is limited to lease/recovery fencing, sole
artifact authority and terminal integrity, filesystem containment, exact
confirmation authority, cumulative budgets, shared applicability, redaction,
and bounded process output. N06 through N08 remain dependency-blocked until
fresh independent GF-004 and GF-101 receipts pass.

## Plan Revision 13 Scenario-Building Repair

The user-authorized review repair consumed attempt 2 for N04 and N05 without
changing Work Graph Revision 11 or opening N06 through N08.

- Repair receipts: `WG001-N04-REPAIR-EXEC-20260731-A2` and
  `WG001-N05-REPAIR-EXEC-20260731-A2`; both return to `REVIEW`.
- Fixed-point digest:
  `0ccb25a3eb88d58289d47e920d5924e78390dd11b69e20b354c4ce53d069d940`.
- The generated starter policy now binds its exact smoke campaign and
  definition resolution rejects zero applicable referenced policies before
  provisioning.
- Frozen source evidence, task results, source manifests, and execution
  receipts bind the selected platform.
- The scenario design template and quality checklist surface the N04/N05
  reservation, identity, policy, confirmation, budget, redaction, platform,
  finalization, verification, and retry-parentage controls.
- 52 focused and 62 aggregate tests pass. Deterministic run
  `wg001-frontier-repair-20260731-r1` passes on `darwin-local`; its 72-file
  terminal manifest is `VALID`.
- Independent GF-004/GF-101 review remains `NOT_RUN`; neither node is accepted.

## Parallel Dependencies

- Can run with: no surface implementation before Gate A; after Gate A, W-005,
  W-006, and W-007 may run in parallel; W-012 waits for WG-001-N15.
- Must wait for: fixed-point comparison of current checkout and candidate
  branch.
- Conflicts with: any concurrent edit to shared schemas, campaign dispatcher,
  validator wiring, config paths, or canonical campaign documentation.

## Handoff And Merge Contract

- Handoff summary: Gate A schema/interface digest, permitted kind/driver
  combinations and execution tiers, campaign catalog/selection contract,
  claim/policy/oracle reference rules, identity envelope, self-contained
  artifact layout, receipt contract, adapter ownership, and open platform
  blockers.
- Required output: canonical campaign foundation, fake-adapter tests, shared
  claim/policy/evidence/result/identity/handoff schemas, W-012 composition
  integration receipt, and integration report.
- Merge owner: Agent Engineer through W-004.
- Merge target: current implementation branch selected by fixed-point review.
- Evidence to preserve: pre/post source inventory, schema tests, artifact
  digests, failed probes, and dirty-work preservation check.
- Work graph: `WG-001`; update its frontier only from current lane
  and validation evidence, never from planned status.
- Stop condition: Gate A is published for surface lanes, then Gate B is
  accepted only after all required lane evidence is merged.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| Responsible skill/docs contract | campaign, execution, and evaluation skill packages; Agent Engineer, operator, evaluator, and specialized harness-evaluator wiring; adjacent-skill boundaries; route/structure/glossary docs; validator surfaces; and route-collision cases | `PASS` |
| Skill package | skill-creator `quick_validate.py` with a PyYAML-capable environment | `PASS` |
| Operator/evaluator role contracts | authored skills, agent metadata, permissions, checklists, and receipt templates | `PASS`; runtime conformance `NOT_RUN` |
| Execution/evaluation separation | self-evaluation rejection, identity-matched receipts, frozen-evidence packet digest, provider trace/output digest verification, fail-closed Codex attempt, and specialized-receipt requirements | `PARTIAL`; general Codex path passes, specialized receipt integration remains open |
| Baseline reconciliation | fixed-point `master` versus candidate-branch inventory | `PASS` |
| Schema and lifecycle | current artifact/policy/lifecycle/definition/common/starter tests and 195 aggregate tests | `PASS` for implemented N03/N04/N05 behavior; broader Gate A work remains open |
| Campaign catalog/selection | seven-entry generated catalog and self-test; digest `e1e82b2de692889dfdba0865937595ae729cfe057963afe1cd2b1c54b77f6605` | `PASS`; generated exact policy/campaign binding passes, broader selection matrix open |
| Claim/policy reduction | scoped default deny, ambiguity block, exact confirmation receipts, budgets, redaction controls, required artifacts/oracles/metrics, and fixture calibration release refusal | `PASS` for N05; claim/evaluator and composed-policy work remains open |
| Failure reduction | unsupported adapter, cancellation/timeouts, non-cooperative bounds, policy ambiguity/confirmation/budget/redaction, unsafe evidence, tamper, oracle, and cleanup probes | `PARTIAL`; N03/N04/N05 paths pass, WG-001-N08 joined failure matrix remains open |
| Artifact immutability | exclusive reservation/stage writes, safe content-addressed freeze, atomic finalization, terminal lock, and digest verification | `PASS` for N04; joined receipt-chain acceptance remains open |
| Concurrency and recovery | reservation race, retry overwrite refusal, explicit recovery identity/finalization, sticky cancellation, bounded recovery/cleanup, cleanup, and unknown outcome | `PASS` for N03/N04; WG-001-N08 joined crash fixtures remain open |
| Receipt chain | actor/operator/evaluator/aggregator identity separation, append-only stage namespaces, frozen evaluator input, and trace/receipt digest verification | `PARTIAL`; general evaluation chain passes, specialized chain remains open |
| Runtime handoff | accepted, rejected, pending, not-applicable, stale-digest, and retry-lineage receipt tests | `OPEN` |
| Generic composition contract | independent task results, denied surface policy, failed oracle, partial evidence, cleanup, receipt, and composed-claim reduction | `OPEN` |
| W-012 agent-tool composition | deterministic six-contour matrix receipt | `OPEN` |
| W-012 live agent-tool canaries | five exact WG-001-N17 capability dispositions | `NOT_RUN` |
| Existing harness | current 44-skill, 368-scenario catalog check and 21-case harness self-test | `PASS` |
| Repository source | `npx --yes bun@1.3.3 scripts/cascade.ts validate` | `PASS` |
| Target-project bootstrap | `npx --yes bun@1.3.3 scripts/cascade.ts target self-test` | `PASS`; 26 cases |
| Repository mechanics | JSON parsing and `git diff --check` | `PASS` |
| Repository aggregate | `npx --yes bun@1.3.3 test scripts/cascade` | `PASS`; 195 tests, 834 expectations |
| Deterministic functional run | `simulation-contract-smoke`, run `wg001-attempt9-review-20260805-r18` plus `campaign verify` | `PASS`; fixture evaluation `PASS`, 90-file manifest `37ddf460...` valid, release eligibility remains false |
| Independent review | N03 Standards/Spec/GF-004 receipts pass; N04/N05 GF-004/GF-101 receipts required | `NOT_RUN` for N04/N05 |

## Status Reconciliation

- Last checked: `2026-08-05`
- Historical source identity: base
  `master@21ba5288b27700f94ecad92ec0cf3d1e5dca5f29`; accepted WG-001-N03
  implementation diff
  `a964ee6a736727b13a7e25fef18fc87f13a8128b119f8863a42de2c620e71491`;
  N04/N05 fixed point
  `0ccb25a3eb88d58289d47e920d5924e78390dd11b69e20b354c4ce53d069d940`
- Completion disposition: `KEEP_OPEN`
- Reason: historical WG-001-N03 acceptance is stale after W-025/W-026 shared-source
  through W-028 changes and current-source revalidation is `NOT_RUN`; N04/N05 required
  reviews failed and attempt 4 of 4 is exhausted. Remaining specialized
  evaluation, handoff, composition, N08 join, and Gate A criteria are blocked
  or `NOT_RUN`.
- Synchronized surfaces: lane, active registry, W-025 archive, AR-006, and
  WG-001 plan revision 17.

## Closeout

- Merge evidence: historical WG-001-N03 acceptance and WG-001-N04/N05
  implementation/validation receipts retained; none is current terminal
  acceptance after the recorded invalidation and failed reviews.
- Report: synchronized in
  `docs/work/reports/2026-07-27-cross-surface-simulation-program.md`.
- Remaining risk: pending adapter, composition, and platform evidence from
  W-005 through W-010 and W-012.

## Attempt 4 Review Failure And Exhaustion

Required receipts `WG001-N04-N05-GF004-REVIEW-20260731-A4` and
`WG001-N04-N05-GF101-REVIEW-20260731-A4` reject the attempt-4 source digest
`711d0ecf0881977d1fae9aa62371fe55a41c73c95f9bee15cdd681577c5c2876`.
N04/N05 are `BLOCKED` after attempt 4 of 4. The passing deterministic matrix
and valid run remain evidence, but they cannot compensate for stale-lock
ownership, hollow receipt-contract, producer-identity, bounded-I/O, and
pre-task child-environment findings. A new repair requires an explicit human
replan decision.

## Attempt 3 Independent Review And Plan-Revision-15 Route

Attempt-3 independent receipts
`WG001-N04-N05-GF004-REVIEW-20260731-A3` and
`WG001-N04-N05-GF101-REVIEW-20260731-A3` are required `FAIL` against source
digest
`83094f89e10695a051fdc3c93095e2e945b8bc0304bc45fea86ed0e7f706aec0`.

The final authorized attempt repairs the writer/finalizer race, placeholder
terminal receipts, missing unknown-outcome recovery evidence, symlinked source
ancestors, policy schema/runtime drift, stale generated catalog, confirmation
key exposure, and known-key persistence. N04/N05 are `IN_PROGRESS`, attempt 4
of 4; N06 through N08 and Gate A remain blocked until fresh independent
receipts pass.

## Plan Revision 16 Shared-Source Invalidation

W-025 completed a separately authorized product-persona/synthetic-persona
framework slice on 2026-08-03. It changed shared campaign definitions,
evaluation, artifact storage, campaign orchestration, generated catalog input,
and workflow contracts while preserving their conservative safety semantics.

WG-001-N03's accepted attempt-3 receipt explicitly reopens when its source,
lifecycle contract, catalog source digest, or producer/consumer binding
changes. Its historical acceptance remains valid for the earlier fixed point,
but it is no longer current acceptance evidence. N03 therefore moves
`ACCEPTED -> PENDING` with its gate reopened. N04/N05 remain `BLOCKED` after
attempt 4 of 4; no attempt 5, W-004 repair, or downstream dispatch is
authorized. Work Graph Revision remains 11 because topology, dependencies,
actors, owners, and gates did not change.

Current W-025 framework validation is evidence for W-025 only. It does not
revalidate WG-001-N03, repair the failed N04/N05 reviews, open Gate A, or prove
live/platform capability.

## Plan Revision 17 W-026 Provenance Hardening Invalidation

W-026 repairs persona status eligibility, allocation semantics, generator
input binding, evaluation proposal receipts, terminal refinement evidence, and
their reusable defaults. Those changes touch the same shared campaign source
set already stale after W-025. WG-001-N03 therefore remains `PENDING` with
current-source revalidation `NOT_RUN`; N04/N05 remain `BLOCKED` after exhausted
attempt 4. Work Graph Revision remains 11 because no topology, owner,
dependency, actor, or gate changed. W-026 validation is scoped evidence and
does not authorize N03 execution, attempt 5, downstream dispatch, provider
spend, commit, push, or publication.

## Plan Revision 18 W-027 Simulation-Scope Invalidation

W-027 separates framework fixtures from target-product simulations through
typed `harness`/`product` roots, scope-aware resolution, catalog projection,
target initializer defaults, and repository validation. Those changes touch
WG-001's shared simulation schema, resolver, initializer, validator, fixtures,
campaign manifests, and generated catalog source set. WG-001-N03 therefore
remains `PENDING` with current-source revalidation `NOT_RUN`; N04/N05 remain
`BLOCKED` after exhausted attempt 4. Work Graph Revision remains 11 because no
topology, owner, dependency, actor, or gate changed. W-027 validation is scoped
evidence and does not authorize N03 execution, attempt 5, downstream dispatch,
provider spend, commit, push, or publication.

## Plan Revision 19 W-028 Top-Level Evaluation-Root Invalidation

W-028 replaces the mixed legacy `evals/` source root with peer
`harness-evals/` and `product-evals/` authorities, moves new campaign evidence
to `.artifacts/product-evals/`, updates path bounds/defaults/catalog identities,
and rejects a live legacy root. These changes touch WG-001's named shared source
set, so WG-001-N03 remains `PENDING` with current-source revalidation
`NOT_RUN`; N04/N05 remain `BLOCKED` after exhausted attempt 4. Work Graph
Revision remains 11 because topology, owner, dependency, actor, and gate
definitions did not change. W-028 validation is scoped evidence and does not
authorize N03 execution, attempt 5, downstream dispatch, provider spend,
commit, push, or publication.

## Plan Revision 20 Explicit Attempt-5 Replan

The user's 2026-08-03 instruction to implement the researched changes is the
explicit human replan required by revision 19. It authorizes one narrow
current-source attempt-5 slice in root after the migrated W-028 focused
baseline passed 69/69 tests. Work Graph Revision remains 11 because node
identity, ownership, dependencies, actors, and gates do not change.

This slice owns adapter identity/version/capability and preflight evidence,
exact adapter selection through the existing `driver.adapter` field, typed
surface observations, and an application-neutral HTTP contour. The HTTP
adapter must use exact method-and-origin policy scope, manual redirect
handling, bounded/redacted response capture, cancellation, conservative
unknown-outcome reduction, cleanup evidence, and an independent status oracle.
Fake and direct-process behavior remain protected. Browser, PTY, desktop,
mobile, and agent-runtime implementations remain in W-005 through W-010 and
W-012; this replan does not claim their execution, acceptance, or release
eligibility.

Success requires focused schema/lifecycle/HTTP conformance tests, regenerated
campaign catalog evidence, the repository validation gates, and a separate
readiness assessment for multi-screen and long-running simulations. Passing
this implementation slice does not by itself accept N04/N05, open Gate A, or
authorize live/platform execution.

Current attempt-5 implementation evidence: 90/90 aggregate Bun tests pass;
repository validation, the 44-skill/368-scenario harness catalog check, the
20-case harness self-test, the 26-case target self-test, the seven-entry
campaign catalog check (digest
`e410f1dc844c8375e11b3443aefc3372dd4bbf9c5b70c42b0d53df9e6dfe7b9f`),
campaign self-test, JSON parsing, and diff whitespace all pass. Independent
review, Gate A acceptance, live/platform execution, and release eligibility
remain `NOT_RUN`.

## Plan Revision 21 W-029 Persona/Simulation Governance Invalidation

The user's 2026-08-04 instruction authorizes W-029 to close the audited
persona/simulation gaps. W-029 changes persona derivation and population
contracts, claim authority, refinement artifacts, templates, validators,
runtime sources, and generated campaign identities that belong to W-004's
attempt-5 fixed source set.

Attempt-5 local behavior and validation remain historical evidence for their
recorded digest, but independent review must not target that stale identity.
W-004 therefore waits for W-029 terminal validation, then requires fresh
current-source validation and independent GF-004/GF-101 review. Gate A and all
downstream surface work remain `NOT_RUN`. Work Graph Revision stays 11 because
node identity, topology, ownership, dependencies, actors, and gates do not
change.

## Plan Revision 23 W-029 Terminal Revalidation

W-029 reached `W-029-GT ACCEPTED` after the concurrent plan-revision-22 session
controller changes. Combined current-source validation passes 102/102 Bun
tests, repository validation, both catalogs, all self-tests, JSON parsing,
artifact cleanup, and whitespace checks. The current campaign catalog digest is
`006fd8ad45d0b51c8544cdfe5ef1b6788afd5f474053eda46a757f5011dea236`.
Current-source public run `session-runtime-smoke-20260804-r3` reached
`ACHIEVED`, verified cleanup, and froze a valid 87-file manifest with digest
`2a73060fae9a9d43384b781bdc5ee6a85582d7baf82a2d98b45eea08eccace68`.

This clears the W-029 invalidation blocker but does not accept W-004. The next
gate is independent GF-004/GF-101 review over this exact current source. Gate A,
surface/platform execution, target calibration, deployment, and release
eligibility remain `NOT_RUN`. Work Graph Revision stays 11.

## Plan Revision 22 Multi-Surface Session Controller

The user's 2026-08-04 instruction authorizes the W-004 shared-runtime slice
needed to coordinate several screens or contours until a declared purpose is
achieved. Work Graph Revision remains 11: the implementation extends existing
N03 lifecycle, N04 artifact/lease, and N08 deterministic-fixture obligations
without changing node identity, topology, ownership, dependencies, or gates.

Implemented current-source behavior:

- a generic goal-driven session controller and typed surface registry;
- sequential or conflict-safe parallel step batches across command, HTTP,
  terminal, browser, desktop, mobile, and agent-response surface identities;
- append-only hash-linked dispatch journal, revisioned checkpoints, exact
  idempotency accounting, per-episode rollover, bounded duration/steps/
  parallelism/checkpoint size, and conservative terminal states;
- renewable operator leases with monotonic heartbeat generations;
- campaign-runner integration that records session status, surface inventory,
  episode count, step count, and checkpoint digest in the execution receipt;
- fail-closed restart semantics: a verified completed checkpoint may continue
  under valid authority, while an unmatched dispatched action becomes
  `UNKNOWN_OUTCOME` and is never replayed.

Deterministic local evidence includes a 120-step, three-surface, ten-episode
soak and public run `session-runtime-smoke-20260804-r3`, whose frozen artifact
verification passed. This does not implement or prove Playwright multi-page,
PTY, native desktop, Android/iOS, Computer Use, or provider-backed agent
drivers. W-029 completion, fresh combined current-source validation,
independent GF-004/GF-101 review, Gate A, and live/platform canaries remain
required and `NOT_RUN` or blocked.

## Plan Revision 24 Bounded-Session Hardening

The user's 2026-08-04 implementation instruction reopens the attempt-5
current-source review target before any independent receipt is produced. Work
Graph Revision remains 11 because node identities, topology, dependencies,
actors, ownership, and gates do not change.

This bounded repair routes WG-001-N03 and WG-001-N04 through
`PENDING -> READY -> IN_PROGRESS`; WG-001-N05 remains implemented but its
joint independent-review input is invalidated until the new fixed point is
frozen. The selected GF-004 v1 shared-contract fragment and GF-101 v1 security
overlay require contract compatibility plus independent architecture and
security review after implementation.

Allowed writes are limited to the multi-surface session contract/controller,
campaign definition/schema/defaults, campaign artifact persistence and public
resume/recovery seam when implemented, focused tests, generated campaign
catalog, and the W-004/WG-001 projections. Downstream surface adapters,
provider execution, publication, commit, and push remain outside this repair.

Required behavior:

- enforce a finite per-step watchdog in addition to total duration;
- bind journal dispatches to the exact session contract and digest-only step
  identity without persisting raw payloads;
- verify checkpoint-to-journal continuity before continuation;
- bound dynamic surface cardinality explicitly;
- preserve fail-closed `UNKNOWN_OUTCOME` behavior for dispatched work whose
  completion cannot be proven; and
- add failure-first tests before refreshing the independent-review target.

Current-source implementation and validation result:

- the session contract now bounds each dispatched step and total surface
  cardinality in addition to total duration, steps, episode size,
  parallelism, and checkpoint bytes;
- journal events bind the exact session contract plus digest-only step
  identity/payload inputs, checkpoint resumes must bind an existing journal
  event, and ambiguous optional work terminates conservatively too;
- journals and checkpoints roll into 1,000-entry persistence segments, and
  append validation reads only the bounded durable predecessor rather than
  rescanning an unbounded history;
- the public campaign scheduler batches genuinely independent tasks up to
  `max_parallel_steps` while serializing shared policy budgets, HTTP origins,
  and non-fixture driver instances;
- all repository/catalog/self-test gates and 118/118 aggregate Bun tests pass;
  the generated campaign catalog digest is
  `1a495c670e2e29ea345c3b5be343cf5975ba46a03205c38573e320d1be057d37`;
- public deterministic run `session-hardening-smoke-20260804-r3` reached
  `ACHIEVED`, verified cleanup, remained `release_eligible=false`, and froze a
  valid 87-file manifest with digest
  `9f084cb7d156666b1239d3e58d459b216d2e91212a31eae45e9b7f35ec7fd5d0`.

This made WG-001-N03 through N05 locally review-ready at plan revision 24, not
independently accepted. Plan revision 25 subsequently closed the public
process-resume/takeover gap; actor-driven runtime behavior, real browser/PTY/
desktop/mobile/agent adapters, and provider/platform soaks remain separate
`NOT_RUN` boundaries.

## Plan Revision 25 Public Process Resume And Lease Takeover

The user's continuing implementation instruction reopens WG-001-N03 and N04
for the public process-resume seam already reserved by plan revision 24. The
bounded slice must preserve exact source, identity, contract, journal,
checkpoint, policy-budget, and terminal-artifact bindings across a process
restart. It adds no node, owner, dependency, actor, or gate, so Work Graph
Revision remains 11.

Behavior examples:

- Given a non-finalized run with an unexpired reserved operator lease and a
  valid checkpoint, `campaign resume <run-id>` continues only incomplete tasks
  and retains prior campaign-wide policy consumption.
- Given an expired lease, only the exact reserved recovery identity may issue a
  monotonic replacement lease and append-only takeover receipt before the
  operator continues.
- Given an active foreign lease, finalized run, changed source digest, changed
  session contract, mismatched result digest, or dispatched step without a
  durable completion checkpoint, resume fails closed or records
  `UNKNOWN_OUTCOME`; it never replays the ambiguous step.
- Given a session that became terminal before evaluation/finalization, resume
  completes only missing idempotent stages and verifies any existing stage
  before reuse.

Current implementation result:

- `campaign resume <run-id>` validates the exact reservation, campaign/source
  manifest, session contract, journal/checkpoint chain, and persisted result
  digests before lease mutation or dispatch;
- active-lease continuation requires the exact lease ID; expired takeover
  requires the reserved recovery identity, a fresh lease ID, a monotonic
  generation, and an append-only receipt that embeds and hashes the complete
  previous lease;
- campaign-wide policy budgets are reconstructed from digest-bound task
  results and compared with checkpointed usage before continuation;
- existing terminal execution, calibration, evaluation, aggregation, and
  summary artifacts are reused only when every non-temporal field matches;
- ambiguous provider evaluation without a durable receipt is never replayed;
  finalized runs, stale source, active foreign leases, and unbound checkpoints
  fail closed;
- the current seven-entry campaign catalog digest is
  `73e0a208c94ab44509d99952816c3132d925a3668ba6ba6408fe82e504ae5d40`;
- immutable fixture run `wg001-resume-hardening-20260804-r7` reached
  `ACHIEVED`, verified cleanup, remained `release_eligible=false`, and verified
  an 89-file manifest at digest
  `58255c06c714415ca6fa0b587b71d7e180e98e9941e3e9c6cd2c9c38de3b0ceb`.

This returns WG-001-N03 through N05 to `REVIEW`; it does not satisfy their
independent GF-004/GF-101 gate, Gate A, real-adapter evidence, live platform
proof, or release eligibility.

The allowed write set is limited to the campaign CLI/orchestrator, artifact
lease authority, session checkpoint state, focused tests, generated catalog,
usage/docs, and current W-004/WG-001 projections. N06 through N17, Gate A/B,
real adapters, provider-backed execution, commit, push, and publication remain
protected. Local success returns N03 through N05 to `REVIEW`; it cannot satisfy
their independent GF-004/GF-101 acceptance gate.

## Plan Revision 26 Product Simulation Intake Bridge

W-032 adds a product-execution prerequisite without replacing W-004's shared
campaign, action-policy, runtime, evidence, or merge authority. Product
campaigns now reference a scope-correct intake compiled from the current W-031
Task Envelope, one current reviewed/approved product brief, and exact
action-policy applicability. DRAFT, BLOCKED, stale, cross-scope, or mismatched
product intakes cannot execute.

WG-001 Graph Revision 12 adds `WG-001-N18` and gates only product-scoped
entries within `WG-001-N17`. Harness mechanics, Gate A, Gate B, and unrelated
live/platform entries preserve their prior dependencies. N18 is locally
`REVIEW`; independent integration, functional, security, and harness review,
provider-backed product execution, and release eligibility remain `NOT_RUN`.

## Plan Revision 27 Product Intake Trust Hardening

W-032 fixed cross-scope READY bindings, forged or blocking action decisions,
exact task/action policy equality, and stale admission bundle identity without
changing WG-001 topology. N18 remains locally `REVIEW`; independent acceptance
and product/provider execution remain `NOT_RUN`.

## Plan Revision 28 Strict READY Check Fixed Point

`simulation intake --check` now strictly resolves the current envelope
snapshot, product brief, action policies, and digests after deterministic
equality. The campaign catalog is current at
`73e0a208c94ab44509d99952816c3132d925a3668ba6ba6408fe82e504ae5d40`;
immutable run `wg001-resume-hardening-20260804-r7` verifies 89 files at manifest
`58255c06c714415ca6fa0b587b71d7e180e98e9941e3e9c6cd2c9c38de3b0ceb`.
Work Graph Revision remains 12, and independent review remains the next gate.

## Plan Revision 29 Stale Lease Fixture Fixed Point

The aggregate regression exposed test drift rather than a runtime lease
regression: the recovery-takeover fixture created its replacement lease at a
fixed 2026 instant and then exercised the real wall-clock expiry check. The
fixture now uses the repository's existing far-future deterministic clock
convention. Runtime lease authority, expiry, takeover, and append-only receipt
semantics are unchanged.

The focused artifact suite passed three consecutive 21/21 runs, the complete
Cascade suite passed 153/153, and all repository, admission, catalog, brief,
harness, target, and campaign gates pass locally. Immutable run
`wg001-resume-hardening-20260804-r9` reached `ACHIEVED`, verified cleanup,
retained `release_eligible=false`, and verified 89 files at manifest digest
`5da7cfe6a5b1ff47f72c9f9d140cca81a4f41e5435012b1aae843f47d2e6207b`.
WG-001-N03 through N05 remain `REVIEW` on attempt 5; this test-only fixed point
does not consume a new runtime repair attempt or satisfy independent review.

## Plan Revision 30 Intake Gate Reconciliation

WG-001 Work Graph Revision 13 makes the W-032 integration dependency
executable: `WG-001-N18` requires accepted `W-031-G6`, accepted archived
`W-030-GT`, complete `WG-001-N02`, accepted `WG-001-N05`, and accepted
`W-032-GT`. N18 is therefore `BLOCKED` while those current producer and
independent-review gates remain open.

The W-032 implementation, focused 50-test receipt, 153-test aggregate receipt,
catalog `73e0a208...`, and r9 immutable run remain valid local candidate
evidence. This graph-only dependency correction does not alter W-004 runtime,
consume a repair attempt, accept N03 through N05, Gate A/B, or any provider,
platform, promotion, deployment, or release gate.

## Plan Revision 31 Bounded Structured Artifact Repair

A current-source security review found that the segmented session persistence
added after the earlier artifact hardening read journals and checkpoints with
unbounded structured-file operations. The same audit found remaining
reservation, lease, receipt, lifecycle, and finalization reads that could
allocate unbounded input before contract validation. This reopens
WG-001-N04 for a bounded repair inside attempt 5; node identity, ownership,
dependencies, and gates are unchanged, so Work Graph Revision remains 13.

The artifact store now opens every structured run artifact without following
the final symlink, rejects non-regular or larger-than-10-MiB files before
parsing, bounds the read itself against growth races, and reports controlled
JSON errors. Session journal segments use the same control, and regression
coverage proves both an oversized reservation and oversized journal fail
closed.

The generated seven-entry campaign catalog was also stale against current
source definitions. It was regenerated to digest
`92e7e3fe338884f0343f1612b10d641ffb2eef9360ed2cd742af07106f8a6f7d`.
The complete repository suite passes `154/154`; every validator, admission,
brief, harness-evaluation, target, campaign-catalog, and campaign self-test
gate passes. Immutable fixture run
`wg001-structured-bounds-20260805-r11` reaches `PASS`, verifies cleanup,
remains `release_eligible=false`, and verifies 89 files at manifest digest
`6d0f96c52c7263ad38f82382871f37fa457db777bb800c7376026d104cca1437`.

WG-001-N03 through N05 remain `REVIEW`. This local repair does not satisfy the
independent GF-004/GF-101 gate, open Gate A, authorize downstream adapters, or
prove provider/platform behavior or release eligibility.

## Plan Revision 32 Cleanup Claim Integrity

A current-source lifecycle review found that the built-in direct-process and
HTTP adapters treated local process termination or fetch-resource release as
verified cleanup. The shared campaign contract requires cleanup plus verified
fixture reset; neither adapter has a target-reset mechanism yet. Their prior
receipts could therefore overstate `cleanup_verified=true` after target or
external effects.

Both adapters now return `UNKNOWN` cleanup after dispatch until a contour-owned
adapter supplies actual reset evidence. Execution output and oracle evidence
remain preserved, but the task reduces to `UNKNOWN_OUTCOME` instead of `PASS`.
Policy-blocked work that never dispatched remains `NOT_REQUIRED`. Focused tests
prove a successful HTTP observation/oracle cannot compensate for missing reset
proof and a timed-out process cannot claim verified cleanup merely because its
process ended.

The current seven-entry catalog digest is
`8a73c6188b2fdcba2ee6d835a688b99af534ccd6d63b75f2c06da33165c3a9c3`.
Immutable fixture run `wg001-cleanup-truth-20260805-r13` passes through the
fake reset-capable adapter, verifies 89 files at manifest digest
`8118469c501cdf7f74830455a485ca7a69079121978ac66c5b430cf538068c3d`,
and remains `release_eligible=false`.

This repair keeps WG-001-N03 through N05 in `REVIEW`; Gate A and every
downstream surface node remain dependent on independent acceptance.

## Plan Revision 33 Terminal Finalization Recovery

The artifact fixed-point audit found two remaining N04 failure modes. Pretty
JSON files were bounded using their compact representation, so indentation
could make a written file larger than its reader limit. Also, a failure after
`terminal.lock` but before `finalization.json` permanently blocked a matching
finalization retry, including after the original operator lease expired.

File-size checks now use the exact pretty representation plus trailing newline
that is persisted. Finalization precomputes and bounds the complete manifest
before writing the terminal lock. If a matching terminal lock already exists
without `finalization.json`, the exact reserved operator or recovery authority
can revalidate terminal evidence and finish the immutable manifest without
reopening execution. Mismatched status, run, identity, timestamp, or evidence
still fails closed.

Focused regression covers pretty-expansion overflow and completion from a
matching terminal lock with an expired execution lease. The complete suite now
contains 155 passing tests. Current catalog digest is
`a2a0e00902dd93b6bbe1fa777c37849fee375a1ed98aad1c5bc672dcdca9af1c`;
immutable fixture run `wg001-finalization-recovery-20260805-r14` verifies 89
files at manifest digest
`45d1a84ecf8f7370ece38168bde0fb07f6a69f4f659925b9f18f1bdfabe520a2`
and remains `release_eligible=false`.

This is local repair evidence, not independent acceptance. WG-001-N03 through
N05 stay `REVIEW`, and Gate A remains open but unsatisfied.

## Plan Revision 34 Behavior-Ledger Reconciliation

The post-validation staleness audit compared every W-004 behavior example with
the current test sources. SF-001, SF-002, SF-003, SF-006, and SF-007 now point
to direct local evidence and move from `OPEN` to `REVIEW`; independent
acceptance is still required. SF-004, SF-005, and SF-008 remain `OPEN` because
the current suite does not prove their complete stated behavior.

This documentation-only correction does not change runtime identity, catalog
digest, graph topology, or gate authority. The current 155-test regression,
catalog `a2a0e00902dd93b6bbe1fa777c37849fee375a1ed98aad1c5bc672dcdca9af1c`,
and immutable r14 evidence remain current.

## Plan Revision 35 Independent-Review Repair Attempt 6

Independent receipts `WG001-N03-N05-GF004-REVIEW-20260805-A5` and
`WG001-N03-N05-GF101-REVIEW-20260805-A5` failed the revision-34 fixed point.
They confirmed unbounded governed artifact reads, loss of dispatch truth during
cleanup, incomplete recovery-identity and stale-lock restart paths, divergent
policy action types, secret-bearing action dispatch, replayable confirmations,
and unenforced maintainers-only artifact permissions.

Attempt 6 preserves N01/N02 and graph revision 13. It returns N03 through N05
to `PENDING`, then authorizes one serialized repair across lifecycle/policy and
artifact boundaries. Required behavior is bounded nofollow reads through the
artifact authority, cleanup informed by dispatch state even without a result,
operator-or-recovery restart-safe finalization, identity-bound stale-lock
takeover, one canonical action type, secret scanning for every redaction
profile, single-use confirmation receipts, and restrictive artifact modes.
All current catalog/run identities are invalidated by source changes. A new
catalog, immutable fixture, full regression, and fresh independent GF-004 and
GF-101 receipts are required before N03/N04/N05 can return to `ACCEPTED`.

Attempt 6 implementation receipt
`WG001-N03-N04-N05-W004-R35-A6-20260805` is now bound to the repaired source.
The seven-entry catalog is current at digest
`e5c4948e82d70ece13b73a099b3fc81b975001865c902a37a2c581d720a0ee71`;
the complete local regression passes `176/176`; repository, admission, eval,
target, campaign, and brief checks pass. Immutable fixture
`wg001-attempt6-review-20260805-r15` verifies `90` files at manifest digest
`3e865125d4e6049dba04067dbe1d61090f45396496439ac1b3a860653b20bb0a`
with fixture evaluation `PASS` and `release_eligible=false`. N03 through N05
are `REVIEW`, not accepted; the fresh independent receipts remain required.

## Plan Revision 36 Independent-Review Repair Attempt 7

Receipts `WG001-N03-N05-GF004-REVIEW-20260805-A6` and the replacement
independent GF-101 receipt rejected the attempt-6 fixed point. N03's dispatch
truth and lifecycle behavior remains a current review candidate. N04 returns
to `PENDING` because recovery cannot complete an operator-created terminal
lock and stale-lock quarantine is not crash-safe. N05 returns to `PENDING`
because external confirmation-receipt ingestion bypasses bounded nofollow
input handling.

Attempt 7 is a bounded repair: represent terminal-lock producer and authorized
recovery completer without misattribution; make every stale-lock quarantine
transition durably reconcilable before later mutation; route external
confirmation receipts through a size-bounded, regular-file, nofollow reader;
add interruption and unsafe-input regressions. Preserve the passing action
typing, redaction, confirmation-consumption, dispatch-truth, artifact-mode,
and governed-run-read behavior. Catalog and r15 evidence become historical as
soon as source changes. N03 stays `REVIEW`; N04/N05 are `PENDING`; Gate A and
N06 through N18 remain blocked until fresh GF-004/GF-101 acceptance.

Attempt 7 implementation receipt `WG001-N04-N05-W004-R36-A7-20260805`
is current. Terminal intent now separates producer and completer identity,
stale-lock takeover is a durably reconcilable transaction, and external
confirmation receipts use bounded private nofollow input handling. The
seven-entry catalog is current at digest
`f3de59594183346408d663bb643a8256933ea140a87e05e97b343bd6c3858724`;
the complete local regression passes `183/183` with `728` expectations and all
repository gates pass. Immutable fixture
`wg001-attempt7-review-20260805-r16` verifies `90` files at manifest digest
`ce369837308ca3e8ceef07a5d6d22cbf680c123a4091c25a2c47fbdee17dd852`
with fixture evaluation `PASS` and `release_eligible=false`. N03 through N05
are `REVIEW`, not accepted; fresh GF-004/GF-101 receipts remain required.

## Plan Revision 37 Independent-Review Repair Attempt 8

Receipts `WG001-N03-N05-GF004-REVIEW-20260805-A7` and the attempt-7 GF-101
review rejected the r16 fixed point. The individual terminal-intent and
stale-lock repairs pass, but their recovery artifacts change the frozen
pre-terminal manifest when they occur together. The public finalization shape
also changed incompatibly under artifact schema `1.0.0`, and both external and
governed readers can block while opening a private FIFO before file-type
validation.

Attempt 8 separates frozen application evidence from legitimate post-intent
recovery/audit artifacts; adds the combined terminal-intent plus stale-lock
crash case; advances the changed artifact contract and keeps historical
`1.0.0` verification; covers terminal-intent and takeover records in the
public schema; and uses nonblocking nofollow opens before regular-file checks,
with bounded FIFO/socket regressions. N03 remains `REVIEW`; N04/N05 return to
`PENDING`; Gate A and N06 through N18 remain blocked. Catalog and r16 evidence
become historical after source mutation.

Attempt 8 implementation receipt `WG001-N04-N05-W004-R37-A8-20260805` is
bound to the repaired source. New writes declare artifact contract `1.1.0`,
verification dispatches by the declared version, and the historical r15
`1.0.0` finalization package still verifies. Terminal intent freezes explicit
application records separately from post-intent recovery records; the exact
operator-intent, stale-lock takeover, and recovery composition now passes.
External and governed readers open with `O_NONBLOCK | O_NOFOLLOW` before
rejecting non-regular inputs, including bounded FIFO and socket tests.

The seven-entry catalog is current at digest
`059b6943da585ffa562e3a0c3239f03c109877f4eb30dbbea45393d9e29e2c89`.
The complete local regression passes `189/189` with `785` expectations; all
repository, admission, eval, target, campaign, brief, and diff checks pass.
Immutable fixture `wg001-attempt8-review-20260805-r17` verifies `90` files at
manifest digest
`22c2b1e273e16bd66c6cc74ea37b9a537870ad27669af4f2a73163f91f4123df`
with fixture evaluation `PASS` and `release_eligible=false`. N03 through N05
are `REVIEW`, not accepted; fresh GF-004/GF-101 receipts remain required.

## Plan Revision 38 Independent-Review Repair Attempt 9

Receipts `WG001-N03-N05-GF004-REVIEW-20260805-A8` and
`WG001-N03-N05-GF101-REVIEW-20260805-A8` rejected the r17 fixed point. N03's
lifecycle/cleanup contribution remains a passing review candidate. N04 returns
to `PENDING` because the current verifier accepts schema-invalid 1.1.0
finalization receipts, including malformed timestamps and extra fields. N05
returns to `PENDING` because `writeStageFile()` and `freezeFile()` retain a
precheck-to-open race that can block on a swapped FIFO and does not fully bind
the opened descriptor to the inspected path identity.

Attempt 9 must enforce the complete version-specific finalization shape before
digest linkage; add schema/runtime parity probes; route both external-source
methods through descriptor-first `O_NONBLOCK | O_NOFOLLOW` reads; reject
non-regular descriptors; preserve size, mode, secret, and identity checks; and
cover FIFO, socket, and regular-file substitution races. The r17 fixture and
catalog remain immutable historical evidence after source mutation. N06 through
N18 and Gate A remain blocked until a new catalog/run and fresh independent
GF-004/GF-101 receipts pass.

Attempt 9 implementation receipt `WG001-N04-N05-W004-R38-A9-20260805` is
bound to the repaired source. Current 1.1.0 finalization verification enforces
the complete version-specific runtime shape before digest linkage, including
exact fields, types, enums, RFC 3339 dates, principals, nullability, hashes,
and file records; historical r15 remains valid. Both external-source ingestion
paths now use descriptor-first nonblocking nofollow opens and bind pre-open,
opened, post-read, and current path identity. Deterministic FIFO, socket, and
regular-file substitution regressions pass.

The seven-entry catalog is current at digest
`e1e82b2de692889dfdba0865937595ae729cfe057963afe1cd2b1c54b77f6605`.
The complete regression passes `195/195` with `834` expectations and every
repository gate passes. Immutable fixture
`wg001-attempt9-review-20260805-r18` verifies `90` files at manifest digest
`37ddf4601816b2de1e0eebcceea25d501d3f2fbb804ee8aa44fc841f8a85ce1d`
with fixture evaluation `PASS` and `release_eligible=false`. N03 through N05
are `REVIEW`, not accepted; fresh GF-004/GF-101 receipts remain required.

## Plan Revision 39 Independent-Review Repair Attempt 10

Receipt `WG001-N03-N05-GF004-REVIEW-20260805-A9` rejected the r18 fixed point.
N03 and the current 1.1.0 N04 contribution remain passing review candidates;
N05's attempt-9 security review did not complete because the reviewer errored,
so it remains unaccepted. N04 returns to `PENDING` because the supported legacy
1.0.0 verifier accepts date-only and impossible timestamps plus a non-string
`recovery_reason`, while the public schema declares stricter shapes. The public
union also omits legacy reservation and lease definitions consumed by the
historical verifier.

Attempt 10 must apply strict version-specific validation to legacy terminal
artifacts, add negative legacy parity cases, publish the legacy reservation/
lease contract or explicitly narrow the public compatibility promise, preserve
r15 validity, and rerun a replacement GF-101 review. r18/catalog evidence
becomes historical after mutation. N06-N18 and Gate A remain blocked until new
fixed-point evidence and both independent receipts pass.

Attempt 10 implementation receipt `WG001-N04-W004-R39-A10-20260805` is
current. Strict legacy 1.0.0 finalization and terminal-lock validation now
enforces exact fields, types, enums, RFC 3339 dates, principals, nullability,
hashes, and file records. The public root union includes exact legacy
reservation and lease shapes; all four r15 package objects validate while r15
runtime verification remains valid.

The current seven-entry catalog digest is
`80ce2c96b1a79309ab91f3aea651b5a0cc821d28cb1564936debeb148fa9f499`.
All `202/202` tests pass with `927` expectations and every repository gate is
green. Immutable run `wg001-attempt10-review-20260805-r19` verifies `90` files
at manifest digest
`6b2cd6b154aa88490a9bce41304020114667ee42bc9d12f32e269b60d057c49b`
with fixture evaluation `PASS` and `release_eligible=false`. N03-N05 are
`REVIEW`, not accepted; fresh independent receipts remain required.

## Plan Revision 40 Independent-Review Repair Attempt 11

Receipts `WG001-N03-N05-GF004-REVIEW-20260805-A10` and
`WG001-N03-N05-GF101-REVIEW-20260805-A10` rejected the attempt-10 fixed point:
the public legacy reservation/lease schemas were closed, but runtime accepted
digest-rebound unsupported fields and recovery modes and did not structurally
validate the persisted legacy lease.

Implementation receipt `WG001-N04-W004-R40-A11-20260805` adds exact version-
specific reservation and lease validators, validates legacy `lease.json`, and
binds its run, lease, operator, timestamp, and recovery identity to the
reservation. Digest-consistent extra-field, recovery-mode, lease-ID, and
operator mismatch probes reject; current 1.1.0 takeover behavior and r15 remain
valid.

The current catalog digest is
`8bb094b23fae5eaf3c0b6e8ad7fa2b1da58189882d7eb3f4b7baf12ae7720ff8`.
All `209/209` tests pass with 1037 expectations and every repository gate is
green. Immutable run `wg001-attempt11-review-20260805-r20` verifies 90 files at
manifest digest
`3e7c22b58d6cd6e9ada0217702dbde9a4d540c316714b288fdcb5815d02d282e`
with fixture evaluation `PASS` and `release_eligible=false`. N03-N05 are
`REVIEW`, not accepted; fresh GF-004/GF-101 receipts remain required.

## Plan Revision 41 Independent-Review Repair Attempt 12

Receipt `WG001-N03-N05-GF101-REVIEW-20260805-A11` passed, while
`WG001-N03-N05-GF004-REVIEW-20260805-A11` found current 1.1.0 verifier parity
gaps for persisted lease/takeover history and exact terminal-intent validation.

Implementation receipt `WG001-N04-W004-R41-A12-20260805` exact-validates the
current lease, verifies its recorded takeover chain, binds it to reservation/
run/operator identity, and exact-validates terminal keys, types, principals,
hash/file records, and real RFC 3339 dates. Digest-consistent current lease and
terminal mutations reject; r15 and r20 remain valid.

The current catalog digest is
`5f3d6c01e6f493ca0fc976c5f26fd583645a55986d8121535e64b1068caa25a5`.
All `211/211` tests pass with 1185 expectations and every repository gate is
green. Immutable run `wg001-attempt12-review-20260805-r21` verifies 90 files at
manifest digest
`7f680af19d6b10532a4f9e28ea5314a3dc57c4510dcc5d5953d9459a44aeb5c4`
with fixture evaluation `PASS` and `release_eligible=false`. N03-N05 are
`REVIEW`, not accepted; fresh GF-004/GF-101 receipts remain required.

## Plan Revision 42 Independent-Review Repair Attempt 13

Receipts `WG001-N03-N05-GF004-REVIEW-20260805-A12` and
`WG001-N03-N05-GF101-REVIEW-20260805-A12` preserved N03/N05 contributions but
reopened N04: takeover receipts accepted non-exact shapes and timestamps, and
takeover history did not prove every bridged lease generation.

Implementation receipt `WG001-N04-W004-R42-A13-INTEGRATION-20260805` enforces
closed current receipt and nested-lease shapes, real RFC 3339 timestamps, exact
identity binding, and a contiguous generation chain. Manifest-bound
`HEARTBEAT` lifecycle records prove legitimate same-lease renewal generations;
unproven gaps such as `[1,3]`, duplicate/out-of-order heartbeats, acquired-at
drift, and unsafe recovery modes reject. The public schema remains unchanged.

The owned artifact suite passes `40/40` with 244 assertions, the campaign
integration suite passes `30/30` with 162 assertions, and the complete Cascade
suite passes `213/213` with 1357 assertions. The seven-entry catalog is current
at `1e448871477131912d389df7485f032c956f5e90397e98b56857e84d189f5e67`.
Immutable run `wg001-attempt13-review-20260805-r22` verifies 90 files at
manifest `638aa50b2ad4e7b2922937e970fdb378155db17694bfb7a1b4971978e50cccd5`
with fixture evaluation `PASS` and `release_eligible=false`. N03 through N05
are `REVIEW`, not accepted; fresh GF-004/GF-101 receipts remain required.

## Plan Revision 43 Independent-Review Repair Attempt 14

Attempt-13 receipts `WG001-N03-N05-GF004-REVIEW-20260805-A13` and
`WG001-N03-N05-GF101-REVIEW-20260805-A13` preserve N03/N05 contributions and
reopen N04. They proved that leap-second expiry can produce a `NaN` comparison,
mutation-lock takeover receipts accept extra fields and normalized impossible
dates, and the first heartbeat-to-takeover bridge does not require the receipt
predecessor to equal the proven heartbeat state.

Revision 43 authorizes one bounded N04 repair: use one strict finite RFC 3339
instant parser at schema/runtime and lease comparisons, exact-validate mutation
takeover receipts and every nested object, and require the same proven-renewal
equality for the first and later bridges. Add permanent regressions for the four
failed security probes plus valid high-precision fractional timestamps. N03,
N05, N06-N18, provider execution, and release boundaries remain unchanged.

Attempt-14 receipt `WG001-N04-W004-R43-A14-20260805` implements the shared
strict RFC 3339 parser, exact mutation-lock takeover validation, uniform
first/later renewal proof, and a programmatic clock seam for deterministic
public-resume expiry tests without rewriting persisted lease bytes.

Owned artifact/common tests pass `57/57` with 301 assertions, campaign tests
pass `30/30`, and the complete suite passes `222/222` with 1426 assertions.
The seven-entry catalog is current at
`34c1d08e49b4aee37b1460bf14cf0e316b71e27bc181b4607925954e4e1e8ea3`.
Immutable run `wg001-attempt14-review-20260805-r24` verifies 90 files at
manifest `34cdd12eef9a67c302253880fb7eec2b63b0fe7364121347f8c4883f328170b1`
with fixture evaluation `PASS` and `release_eligible=false`. N03-N05 remain
review candidates pending fresh GF-004/GF-101 acceptance.

## Plan Revision 44 Independent-Review Repair Attempt 15

Attempt-14 receipt `WG001-N03-N05-GF004-REVIEW-20260805-A14` preserves the
N03/N05 contributions and fails N04. An independently reconstructed,
manifest-consistent post-intent takeover receipt could carry an arbitrary
64-hex `claim_digest` because verification did not reconstruct and hash the
deleted claim. The same review also proved that floating-point millisecond
conversion collapses distinct valid sub-millisecond RFC 3339 instants.

Revision 44 authorizes one bounded N04 repair. Verification must reconstruct
the exact takeover claim, prove its digest and canonical quarantine path, and
compare valid RFC 3339 instants without losing fractional precision. Permanent
tests must reseal all outer hashes around a forged claim digest and cover
distinct sub-millisecond chronology. N03/N05 are preserved review
contributions; N06-N18, Gate A/B, provider execution, deployment, and release
remain unopened. Fresh GF-004 and GF-101 receipts are required after the
source-bound implementation and evidence identities change.

Attempt-15 receipt `WG001-N04-W004-R44-A15-20260805` reconstructs the exact
deleted takeover claim from the receipt, proves its digest and canonical
quarantine path, and routes lease/takeover chronology through an exact
seconds-plus-fraction RFC 3339 comparator. Resealed forged-claim/path and
distinct nanosecond-order regressions are permanent.

Owned common/artifact tests pass `58/58` with 309 assertions and the complete
Cascade suite passes `228/228` with 1498 assertions. Catalog
`3a32a9a6dff7c14f05517c06e93adb286bc3e7a409de486269f1009ffac1742a`
is current. Immutable run `wg001-attempt15-review-20260805-r25` verifies 90
files at manifest
`f8aa1b11e5b04d401c5900786d0bbf08d80c50e8fa85c7f82cc35c86bcb6b440`
with fixture evaluation `PASS` and `release_eligible=false`. N03-N05 are review
candidates only; fresh independent acceptance remains required.

## Plan Revision 45 Independent-Review Repair Attempt 16

Attempt-15 GF-004/GF-101 receipts fail N04 while preserving N03/N05 review
contributions. Public resume still compared exact lease expiry through floating
milliseconds, and final verification did not require a takeover claim to be
created before its quarantine receipt. Revision 45 authorizes only two exact
chronology repairs: route public-resume expiry through the lossless comparator,
and require `created_at <= quarantined_at`. Add end-to-end nanosecond resume and
fully resealed reversed-order regressions. N06-N18, Gate A/B, provider work,
deployment, and release remain unopened.

Attempt-16 receipt `WG001-N04-W004-R45-A16-20260805` exact-compares
claim-before-quarantine ordering and public-resume lease expiry. The permanent
regressions use one-nanosecond differences and equivalent offset forms. The
owned W-004 suite passes `89/89`; the complete suite passes `233/233` with
1583 assertions. Catalog `5b3240ce...` is current. Immutable run
`wg001-attempt16-review-20260805-r26` verifies 90 files at manifest
`4bde207c4c3e1779818f814d04fa73bb6670fd5a6efd1a46eb028230c87de22b`
with fixture evaluation `PASS` and `release_eligible=false`. N03-N05 remain
review candidates pending fresh independent receipts.

## Plan Revision 46 Independent-Review Repair Attempt 17

The attempt-16 independent gate failed N04 while preserving the N03/N05 review
contributions. A persisted operator-owned takeover claim could be reconciled
before the embedded/current lease expired, receipt chronology was not checked
until after an active lock could already be quarantined, and final verification
did not prove the complete `lease expiry <= claim <= quarantine <= completion`
chain. The old post-intent regression also embedded the default active 2099
lease, so it did not represent a valid expired-lease takeover.

Revision 46 authorizes only this chronology repair. Before any reconciliation
mutation, the shared validators must reject a claim created before lease expiry
and a quarantine created before its claim; an operator-owned persisted claim
must exact-check the current wall clock against both the embedded and current
lease expiry. Final verification must exact-check lease expiry through claim,
terminal, quarantine, and finalization completion. Permanent, fully resealed
regressions must cover a claim one nanosecond before expiry, a still-active
persisted operator lease, a quarantine one nanosecond after completion, and an
interrupted receipted reconciliation with reversed nanosecond chronology, with
no lock, claim, quarantine, receipt, or finalization mutation on rejection.

Attempt-17 implementation receipt `WG001-N04-W004-R46-A17-20260805` moves
claim/receipt chronology into the shared validators, reads and validates an
existing receipt before the first reconciliation mutation, exact-checks the
operator lease against the live wall clock, and verifies
`lease expiry <= claim`, `terminal <= claim <= quarantine <= completed_at`.
The post-intent fixture now reseals its terminal manifest around an expired
lease instead of relying on the active 2099 default.

The owned artifact suite passes `44/44` with `283` assertions. After root-owned
projection regeneration, the complete suite passes `236/236` with `1654`
assertions and every repository, admission, eval, target, campaign, brief, and
diff check passes. Catalog
`fd1625243d2b593fb8b69d8cfb1cda624a0c8c8e01ad74cbf223ce61081d689c`
is current. Immutable fixture `wg001-attempt17-review-20260805-r27` verifies
`90` files at manifest
`3af061c0b763b089a25e256f07232a7c4e562fc71f95b71dba4027e9a200acec`
with fixture evaluation `PASS` and `release_eligible=false`. The reproducible
six-file W-004 diff digest is
`bc38d7c3ed78ba87512f1c4b972c793a5d6a9fb1d152bd576fe6a9179af790e9`.
N04 is a review candidate, not accepted; N03/N05 remain preserved review
contributions and N06-N18, Gate A/B, provider execution, deployment,
promotion, and release remain unopened pending fresh independent GF-004 and
GF-101 receipts.

## Plan Revision 47 Independent-Review Repair Attempt 18

The attempt-17 GF-004/GF-101 gate failed N04 while preserving the N03/N05
review contributions. Reconciliation captured no single wall-clock boundary,
so a persisted future claim or quarantine receipt could be accepted; an
active previous lock could coexist with an existing receipt; terminal and
finalization chronology was not available before the first mutation; a
runtime-created receipt was persisted without passing the complete semantic
validator; and a final receipt's embedded lease was not exact-bound to the
authoritative manifest-bound `lease.json`.

Revision 47 authorizes only this pre-mutation and receipt-binding repair.
Reconciliation captures one invocation boundary and rejects pre-existing
claim/receipt timestamps after it, rejects the impossible active-lock plus
receipt state, loads and validates applicable terminal/finalization chronology
before mutation, validates a runtime-created receipt before persistence, and
requires every final receipt lease to equal the actual manifest-bound current
lease. Permanent byte-for-byte no-mutation regressions cover a future claim,
a preseeded receipt beside its active previous lock, pre-terminal and
post-completion chronology, and a fully resealed active-current-lease mismatch.
The legitimate claimed, quarantined, receipted, quarantine-dropped, and
successor-written crash phases remain passing.

Attempt-18 implementation receipt `WG001-N04-W004-R47-A18-20260805` is bound
to the runtime/test diff digest
`d3eba72dc08fb4d53f8ad6d033b247e821814aaa8362a6f8ba32b3af54091b2f`.
The owned artifact suite passes `47/47` with `324` assertions; the combined
common/artifact slice passes `63/63` with `373` assertions. After the integrated
W-031/W-032 rebind and root-owned projection refresh, the complete suite passes
`246/246` with `1819` assertions and every repository, admission, eval, target,
campaign, brief, and diff check passes. Catalog
`25cfaa0c82b1df5da4a2bfdd8db365e3a0bdcf367428ddf1e8ed468fe9f65dd4`
is current. Immutable fixture `wg001-attempt18-review-20260805-r28` verifies
`91` files at manifest
`89a4c18ff0848c20f3c96d04ae8f0c49b9e907113baec9c22806fa4042003ae9`
with fixture evaluation `PASS` and `release_eligible=false`. N04 remains a
review candidate, not accepted. Independent GF-004/GF-101 acceptance,
provider/product/live execution, semantic evaluation, Gate A/B, promotion,
deployment, and release remain `NOT_RUN` or unopened.

## Plan Revision 48 Independent-Review Repair Attempt 19

The revision-47 GF-101 review failed N04 while preserving the N03/N05 review
contributions. It found that authoritative lease content was parsed separately
from the read used for its manifest record, governing takeover artifacts were
not all identity-stable immediately before the first reconciliation mutation,
and the refinement-disposition consumer could verify one proposal snapshot but
parse and digest later snapshots. Aggregate contention also reproduced the
mutation-lock release race in `2/100` and `8/200` runs: an `EEXIST` contender
could observe a valid lock disappearing or changing identity between discovery
and its bounded read, then fail instead of retrying the validated transient.

Revision 48 authorizes only the N04 artifact-authority repair. The bounded
nofollow reader now returns one identity-stable buffer for parse, digest, and
record construction. Takeover reconciliation pins reservation, lease, claim,
receipt, terminal intent, finalization, active lock, and every quarantine
presence/identity, then exact-revalidates that set immediately before each
mutation. Durable mutation-lock publication exposes only a fully written file.
Contention retries remain bounded to validated `ENOENT` or identity-change
release races; malformed, symlinked, or non-regular replacements fail closed.
The verified artifact-read API returns manifest-bound record, bytes, and parsed
content from one buffer, and refinement disposition consumes the proposal and
digest from that result.

Permanent regressions cover same-byte lease inode substitution before lock
publication, unsafe mutation-lock replacement, proposal/finalization
substitution during verified reads, and 512 contending writes. Attempt-19
implementation receipt `WG001-N04-W004-R48-A19-20260805` proposes N04
`IN_PROGRESS -> REVIEW` against scoped cumulative runtime/test diff digest
`6bf2adb0a46ae7c061232b0a91a77b9c6d77ccf787c9d06f68d4010b98eb550a`;
it does not accept N04 or open downstream gates. The combined common/artifact/
refinement slice passes `76/76` with `422` assertions. Three repeated
512-writer stress runs pass `1536/1536` writes with zero rejection. After the
integrated W-031/W-032 rebind and root-owned projection refresh, the complete
suite passes `257/257` with `1888` assertions and every repository, admission,
eval, target, campaign, brief, and diff check passes. Catalog
`acd7f8ee6cf4b90d3d0f103b2a23940af2b5daa01ca952397db3c593c75cbcf4`
is current. Immutable fixture `wg001-attempt19-review-20260805-r29` verifies
91 files at manifest
`f9f2e3145be2315a81f4b3b525474a338092388cce7e2e00879a6c4ddcd2ae96`
with fixture evaluation `PASS` and `release_eligible=false`. Fresh independent
GF-004/GF-101 receipts remain required. Provider/product/live execution,
semantic evaluation, Gate A/B, promotion, deployment, and release remain
`NOT_RUN` or unopened.

## Plan Revision 49 Independent-Review Repair Attempt 20

The revision-48 GF-004/GF-101 gate failed N04 while preserving the N03/N05
review contributions. The bounded artifact reader still trusted lexical
ancestor checks after opening and therefore did not prove that the opened
descriptor remained under the canonical physical artifact root. Refinement
disposition also retained a public `verifyFrozenRun` dependency that tests
could replace with a void callback, and external evidence was checked, parsed,
and digested through separate pathname operations. A valid-looking arbitrary
proposal file could therefore exercise disposition without an
authority-produced finalized run.

Revision 49 removes that authority bypass. Governed artifact snapshots now
bind the opened descriptor to a pre-resolved canonical physical root before
and after the one-buffer read while preserving bounded transient handling for
legitimate mutation-lock release races. Refinement disposition always consumes
the proposal through the store's verified manifest-bound API and requires a
`COMPLETED` finalization. Every external-evidence manifest is opened nofollow,
bounded under its permitted physical root, parsed and digested from the same
identity-stable buffer, and rechecked before any disposition write.

Permanent regressions deterministically replace an artifact ancestor after
open, reject an arbitrary artifact-shaped proposal without finalization, and
replace external evidence after open while proving that no disposition is
authorized. The tests construct the positive proposal through the real
reservation, lifecycle, evidence, evaluation, aggregation, refinement,
summary, and terminal-finalization authority path; no void verification seam
remains.

Attempt-20 implementation receipt `WG001-N04-W004-R49-A20-20260805` proposes
N04 `IN_PROGRESS -> REVIEW`; it does not accept N04 or open downstream gates.
The owned artifact/refinement slice passes `62/62` with `377` assertions.
Three fresh 512-writer stress repetitions pass `1536/1536` writes with zero
rejection, and the owned six-file diff check passes. The cumulative
runtime/test diff digest is
`7582dca02e8a6626dee2af8aab889b2d2e717d878369b0c152a5af64a1e1002b`.
After root-owned catalog and brief regeneration, all repository gates pass and
the complete suite passes `262/262` with `2001` assertions. Harness-eval
catalog `67607bcf...` covers 368 authored scenarios; product campaign catalog
`1adbe379...` covers seven campaigns. Immutable fixture
`wg001-attempt20-review-20260805-r30` verifies 91 files at manifest
`df6b1da1...`, fixture evaluation `PASS`, and `release_eligible=false`.
GF-004/GF-101 acceptance, provider/product/live execution, semantic
evaluation, Gate A/B, promotion, deployment, and release remain `NOT_RUN` or
unopened for revision 49.

## Plan Revision 50 Attempt 21 N04 Identity Prerequisite

Revision-49 receipts `GF004-WG001-N04-R49-A20-20260805-LOCAL-01` and
`WG001-N04-GF101-REVIEW-20260805-R49-A20` are frozen. Their pre-r50 join
accepted WG-001-N03, N04, and N05. N04 was immediately reopened alone because
N06 requires a versioned specialized-evaluator identity absent from that fixed
point; N03/N05 remain accepted and N06 is blocked on N04.

Revision 50 directly cuts new reservations over to identity-envelope schema v2
with a `harness-evaluator` principal when applicable and explicit `null`
otherwise. Exact roles plus pairwise-distinct session and subject identities
are enforced, while resume input and the source-manifest identity digest replay
the reservation envelope. Frozen 1.0/1.1 verification remains historical;
N06 receipt/reducer behavior is not implemented in this slice.

Receipt `WG001-N04-W004-R50-A21-20260805` proposes N04
`IN_PROGRESS -> REVIEW` only. Independent review remains required.

Focused artifact evidence passes `54/54` with `345` assertions. After root-owned
catalog/brief regeneration, the artifact/campaign join passes `85/85` with
`511` assertions, all repository gates pass, and the complete suite passes
`265/265` with `2062` assertions. Campaign catalog `02265b76...` is current.
Immutable fixture `wg001-attempt21-review-20260805-r31` verifies 91 files at
manifest `2edd58b2...`, fixture evaluation `PASS`, and
`release_eligible=false`. The runtime/test/schema diff digest is
`74bc7aa7459ba897019ab7430005584bbbabcc96400bfcea0beaa9663b027e06`.
At implementation handoff, independent r50 GF-004/GF-101 review was `NOT_RUN`.
The subsequent frozen reviews fail N04 as recorded in revision 51; N03/N05
stay `ACCEPTED`, and N06 remains blocked on N04.

## Plan Revision 51 Attempt 22 N04 Scoped Identity Repair

The frozen revision-50 reviews fail N04 while preserving the accepted N03 and
N05 nodes. GF-004 receipt
`GF004-WG001-N04-R50-A21-20260805-LOCAL-01` is a lane-owner-assigned stable ID
for the reviewer's frozen `FAIL` receipt; GF-101 receipt
`WG001-N04-GF101-REVIEW-20260805-R50-A21-IND-01` is also `FAIL`. The findings
showed that the public schema did not exact-bind ordinary roles, reservation
and resume did not persist and replay simulation scope, specialized-evaluator
applicability could diverge across harness and product runs, and resume source
manifests admitted extra keys and invalid revision/dirty-source types. Only N04
is reopened; N03/N05 remain `ACCEPTED`, and N06 remains blocked on N04.

Revision 51 makes `simulation_scope` reservation authority. New harness
reservations require a distinct `harness-evaluator`; new product reservations
require explicit `null`. Runtime and the supported public JSON Schema enforce
the same per-slot ordinary roles and both scope/applicability directions.
Resume revalidates the resolved campaign scope against the reservation before
source-manifest loading or lifecycle mutation, then exact-validates all source-
manifest keys plus typed `source_revision` and `dirty_source`. Frozen 1.0/1.1
verification remains historical-only.

Attempt-22 receipt `WG001-N04-W004-R51-A22-20260805` proposes N04
`IN_PROGRESS -> REVIEW` only. Focused artifact evidence passes `55/55` with
`367` assertions, including product reserve/read/finalize/verify, both invalid
scope/applicability directions, exact ordinary-role schema/runtime parity, and
historical verification. After root-owned catalog/brief regeneration, the
artifact/campaign join passes `87/87` with 537 assertions, every repository
gate passes, and the complete suite passes `268/268` with 2162 assertions.
Campaign catalog `3a32aded...` is current. Immutable fixture
`wg001-attempt22-review-20260805-r32` verifies 91 files at manifest
`d7dfc93d...`, fixture evaluation `PASS`, and
`release_eligible=false`. Campaign self-test passes seven campaigns with
`release_scope=NOT_RUN`; `git diff --check` passes. The cumulative runtime/test/
schema diff digest is
`cf60a1ab4f2c9314a5ac10b3f4ff7a3c2d81c27bb5a83e260990224eada5f7a2`.
Fresh independent r51 GF-004/GF-101 acceptance remains required; this receipt
does not accept N04 or authorize N06.

## Plan Revision 52 Attempt 23 N04 Public Artifact Parity Repair

The frozen revision-51 independent receipts fail N04 while preserving N03 and
N05 as `ACCEPTED`. GF-004 receipt
`GF004-WG001-N04-R51-A22-20260805-IND-01` is `FAIL`; GF-101 receipt
`WG001-N04-GF101-REVIEW-20260805-R51-A22-IND-01` is also `FAIL`. They found
that an out-of-domain runtime `simulation_scope` could still be persisted when
paired with a null specialized evaluator, the registered public schema did not
reject pairwise identity collisions or exact-bind terminal authority as tightly
as runtime verification, and frozen r31 used the supported 1.1 artifact version
with identity-envelope-v2 but no scope while the public schema accepted only
the older no-scope identity envelope. Only N04 reopens; N06 remains
`BLOCKED_ON_WG-001-N04`.

Revision 52 validates `simulation_scope` as exactly `harness` or `product`
before creating the run directory or persisting reservation/lease state. The
registered schema and shared public validator now publish version 1 of the
`x-cascade-pairwise-distinct-fields` semantic keyword, which rejects duplicate
session or subject identity across every ordinary and applicable specialized
role. Status-specific schema alternatives exact-bind current and legacy
terminal/finalization producer and completer roles to operator/recovery, and
takeover authority fields now reference the exact recovery role. The historical
no-scope schema alternative accepts either the r30 legacy identity envelope or
the r31 identity-envelope-v2 shape; r32 remains on the scoped current path.

Permanent regressions prove malicious scope rejection without artifact-root,
reservation, lease, or run-directory mutation; public-schema and runtime
rejection of pairwise session/subject collisions; public-schema and runtime
rejection of evaluator terminal/finalization authority; and public-schema plus
runtime verification parity for constructed r30/r31/r32 packages. The focused
common/artifact slice passes `76/76` with `448` assertions (`58` artifact and
`18` shared-schema tests). The actual frozen r30, r31, and r32 packages each
pass the registered public schema for reservation, lease, terminal, and
finalization, then runtime verification passes `91` files at manifest digests
`df6b1da1...`, `2edd58b2...`, and `d7dfc93d...`, respectively. The scoped
`git diff --check` passes. The cumulative runtime/test/schema/public-validator
diff digest is
`e811145b293537eb67fce595017b015377a5cfa157edfe31b9360143c7d6d2f5`.

Implementation receipt `WG001-N04-W004-R52-A23-20260805` is `REVIEW` only and
proposes N04 `IN_PROGRESS -> REVIEW`; it does not accept N04, open N06, or
authorize Gate A/B. Root integration regenerates campaign catalog
`82d7657c...`; the common/artifact/campaign slice passes `108/108` with 618
assertions, the aggregate suite passes `280/280` with 2348 assertions, and
every repository gate passes. Immutable fixture
`wg001-attempt23-review-20260805-r33` verifies 91 files at manifest
`9fb77657...`, fixture evaluation `PASS`, and
`release_eligible=false`. Fresh independent GF-004/GF-101 review,
provider/product/live execution, semantic evaluation, promotion, deployment,
and release remain `NOT_RUN`, blocked, or outside this repair.

## Plan Revision 53 Attempt 24 N04 Required-Vocabulary Repair

The frozen revision-52 independent receipts fail N04 without reopening the
accepted N03 or N05 nodes. GF-004 receipt
`GF004-WG001-N04-R52-A23-20260805-IND-01` is `FAIL`: the run-artifact schema
declared only the stock Draft 2020-12 dialect while relying on an unpublished
custom semantic keyword. Ajv 2020 strict mode therefore refused the unknown
keyword, while unregistered permissive mode silently accepted the actual r33
reservation after an operator/evaluator session collision. GF-101 receipt
`WG001-N04-GF101-REVIEW-20260805-R52-A23-IND-01` is also `FAIL`: prototype-aware
schema and instance traversal admitted own `__proto__`, `prototype`,
`constructor`, and inherited-name tricks, `#/__proto__` resolved through the
prototype chain, and malformed keyword contracts could be swallowed inside an
unmatched `oneOf`. Both receipts preserve r52 as historical evidence. Only N04
reopens; N06 remains `BLOCKED_ON_WG-001-N04`.

Revision 53 publishes vocabulary
`https://cascade.local/vocab/pairwise-distinct-fields/v1` and custom
meta-schema `https://cascade.local/meta/campaign-run-artifact/v1`. The latter
marks the vocabulary required through `$vocabulary`, and the public run schema
now identifies that custom dialect through `$schema`. Its meta contract fixes
the only legal principal targets to operator, optional specialized evaluator,
evaluator, aggregator, target, simulator, and recovery, with only `session_id`
and `subject` as comparison fields. A standards consumer without the required
vocabulary must refuse schema compilation; permissive unregistered operation
is unsupported and non-conforming for this public contract.

The bounded local consumer now prevalidates the complete schema contract before
matching any instance or `oneOf` alternative. Every instance, schema-property,
and JSON Pointer lookup uses own-property semantics. Unsafe pointer/property
segments, inherited required/property satisfaction, malformed scalar keyword
placement, malformed unused alternatives, unresolved or redirected targets,
ghost principal paths, and altered keyword version/field shapes fail closed.
Historical r30 through r33 reservation shapes remain valid, while pairwise
session/subject collisions and own prototype-name extras on reservations,
nested principals, and finalizations are rejected.

Consumer matrix from the exact r53 source:

| Consumer | Registration / mode | Valid r30-r33 | Collision | Disposition |
|---|---|---|---|---|
| Cascade `assertJsonSchema` | built-in required-vocabulary implementation and schema-contract preflight | `PASS` | `REJECTED` | supported |
| Ajv 2020 `8.17.1` | strict, vocabulary/meta-schema and semantic keyword registered | `PASS` for all four frozen reservations | `REJECTED` for all four; scalar declaration also rejected | supported independent local matrix |
| Ajv 2020 `8.17.1` | strict, unregistered | schema compilation refused on the unknown required keyword | not reached | expected fail-closed incompatibility |
| Ajv 2020 `8.17.1` | permissive, unregistered | accepted | silently accepted | unsupported/non-conforming; never a W-004 consumer |

Implementation receipt `WG001-N04-W004-R53-A24-20260805` binds
WG-001-N04, W-004, GF-004 v1 plus GF-101 v1, plan revision 53, work-graph
revision 13, attempt 24 under the single authorized r53 repair, base/head
`master@4226bfa1f69f069407b5f383e8c72dd39aa5abed`, producer
`/root/w004_r53_repair`, and integration owner W-004/root. The assigned and
actual writes are `scripts/cascade/common.ts`, `scripts/cascade/common.test.ts`,
`scripts/cascade/campaign-artifacts.test.ts`, the run-artifact schema, the new
vocabulary/meta-schema, and this lane packet. W-031/W-032 sources, active/shared
graph projections, generated catalog/briefs, unrelated dirty work, and runtime
terminal authority are preserved. No commit, push, provider, live, product,
semantic, deployment, or release action was used.

The six-file runtime/test/schema content-manifest digest is
`51b4e266897df8be1a1b96005481f067adcee82df530973b59e00f6c68110209`.
Focused common/artifact evidence passes `80/80` with `507` assertions. JSON
parse validation and the scoped tracked-file `git diff --check` pass. The
Ajv strict/registered matrix passes valid/collision checks for actual frozen
r30-r33 reservations; strict/unregistered refuses compilation, and the
permissive negative control demonstrates why that mode is excluded. The
requested common/artifact/campaign join currently records `108` passing tests,
four catalog-gated failures, and `660` assertions, all at the root-owned stale-
catalog preflight;
the behavior assertions were not reached and the generated catalog was not
modified within this delegated write scope.

The receipt proposes N04 `IN_PROGRESS -> REVIEW` only. Root must regenerate the
catalog after concurrent W-031/W-032 integration, add both vocabulary files to
the simulation source-manifest list so dialect drift invalidates run identity,
rerun the focused join, bind the final combined diff/catalog identity, and then
request fresh independent GF-004/GF-101 review. Catalog integration,
independent acceptance,
provider/product/live execution, semantic evaluation, Gate A/B, promotion,
deployment, and release remain `NOT_RUN`, blocked, or outside this repair. Any
source, vocabulary/meta-schema, keyword registration, run-artifact contract,
catalog, or combined-diff change invalidates this local receipt and requires
the affected focused checks again; another unchanged retry requires a new
failed independent receipt and explicit replanning.

Root integration adds both required-vocabulary sources to the simulation
source manifest and regenerates campaign catalog `26f238f5...`. The
common/artifact/campaign join passes `112/112` with 677 assertions, the
complete suite passes `290/290` with 2,594 assertions, every repository gate
passes, and PB-002 is current. Immutable fixture
`wg001-attempt24-review-20260805-r34` verifies 93 files at manifest
`f0fe20e1...`, fixture evaluation `PASS`, and `release_eligible=false`.
Revision-53 GF-004/GF-101 acceptance remains `NOT_RUN`; this integration
evidence does not accept N04 or open N06.

## Plan Revision 54 Attempt 25 N04 Principal and Schema-Applicator Repair

Independent r53 receipts preserve the required-vocabulary publication but fail
the attempt-24 N04 candidate. GF-004 receipt
`GF004-WG001-N04-R53-A24-20260805-IND-01` is `FAIL`: reservation-time runtime
validation dereferenced ordinary and specialized evaluator principals without
first proving an exact own JSON-object shape, so malformed runtime values did
not share the public contract's controlled fail-closed boundary. GF-101 receipt
`WG001-N04-GF101-REVIEW-20260805-R53-A24-IND-01` is `FAIL`: the bounded schema
consumer returned after `$ref`, ignored adjacent assertions, and did not
prevalidate or evaluate the Draft 2020-12 `allOf` and `not` applicators. Both
receipts are historical review evidence. N03 and N05 remain accepted; only N04
is repaired, and N06 remains `BLOCKED_ON_WG-001-N04`.

Revision 54 exact-validates the version-2 identity envelope and every ordinary
or specialized evaluator principal before reading any principal field. Each
must be a plain object with only own enumerable data properties named `role`,
`session_id`, and `subject`; the values must be strings, non-empty where
required, use the assigned role, and remain pairwise distinct. Inherited,
extra, null, scalar, array, accessor, non-string, and own prototype-name forms
fail before the artifact root or run directory is created. Product scope keeps
the intentional `specialized_evaluator: null` applicability case; harness scope
continues to require an exact specialized evaluator principal. Persisted
identity verification uses the same exact shape boundary, including legacy
envelopes where explicitly supported.

The bounded schema consumer now prevalidates every `allOf`, `not`, and unused
`oneOf` branch before matching an instance. It evaluates all `allOf` members,
rejects values matching `not`, and evaluates `$ref` targets together with every
adjacent applicable keyword. Malformed applicator members, invalid regular
expressions, and fractional length/item limits fail during schema preflight.
Regression covers a conflicting `$ref` sibling `const`, malformed `allOf` and
`not` in otherwise unused alternatives, rejecting `not`, and `oneOf` plus an
adjacent `minLength`. The required vocabulary, custom dialect, registered Ajv
keyword contract, and pairwise collision semantics are unchanged.

Implementation receipt `WG001-N04-W004-R54-A25-20260805` binds WG-001-N04,
W-004, GF-004 v1 plus GF-101 v1, plan revision 54, work-graph revision 13,
attempt 25, base/head
`master@4226bfa1f69f069407b5f383e8c72dd39aa5abed`, producer
`/root/w004_r54_repair`, and integration owner W-004/root. Assigned and actual
writes are `scripts/cascade/common.ts`, `scripts/cascade/common.test.ts`,
`scripts/cascade/campaign-artifacts.ts`,
`scripts/cascade/campaign-artifacts.test.ts`, and this lane packet. The
run-artifact schema, required vocabulary/meta-schema, W-031/W-032 sources,
active/shared graph projections, generated catalog/briefs, unrelated dirty
work, and terminal authority are preserved. No commit, stage, push, provider,
live, product, semantic, deployment, or release action was used.

The seven-file runtime/test/public-schema content-manifest digest is
`93ce142511f7f1d8eb1aa9ee0e363b549abc626a3886d77a0ae1cd2a04ca45f2`.
Focused common/artifact evidence passes `82/82` with `773` assertions. The
114-test common/artifact/campaign join records `110` passing tests and four
failures with `926` assertions; every failure is the root-owned stale-catalog
preflight, so catalog regeneration and the final joined rerun remain required.
JSON parsing and scoped `git diff --check` pass. Actual frozen r30 through r34
reservations all pass the current public schema and runtime verification: r30
through r33 each verify 91 files at manifests `df6b1da1...`, `2edd58b2...`,
`d7dfc93d...`, and `9fb77657...`; r34 verifies 93 files at manifest
`f0fe20e1...`. These are compatibility checks, not new execution evidence.

This receipt proposes N04 `IN_PROGRESS -> REVIEW` only. Root must regenerate
the campaign catalog after all concurrent integration, rerun the focused join,
bind the final combined diff and catalog identity, and obtain fresh independent
GF-004 and GF-101 receipts against that frozen source. N04 acceptance, N06,
Gate A/B, provider/product/live execution, semantic evaluation, promotion,
deployment, and release remain `NOT_RUN`, blocked, or outside this repair. Any
source, schema/vocabulary, registration, catalog, or combined-diff change
invalidates the affected evidence and requires the corresponding checks again.

Root integration regenerates campaign catalog `74ecee7a...` after the W-031
v21/core@22 join. The common/artifact/campaign slice passes `114/114` with 943
assertions, the complete suite passes `299/299` with 2,902 assertions, every
repository gate passes, and PB-002 is current. Immutable fixture
`wg001-attempt25-review-20260805-r35` verifies 93 files at manifest
`cbda5987...`, fixture evaluation `PASS`, and `release_eligible=false`.
Revision-54 GF-004/GF-101 acceptance remains `NOT_RUN`; this integration
evidence does not accept N04 or open N06.

## Plan Revision 55 Attempt 26 N04 Snapshot and Complete-Assertion Repair

The frozen revision-54 candidate remains historical evidence after both
independent receipts fail. GF-004 receipt
`GF004-WG001-N04-R54-A25-20260805-IND-01` is `FAIL`: reservation accepted a
live caller object across validation and persistence, so stateful proxies or
later accessor/prototype changes could change what was written after the
runtime's semantic checks. GF-101 receipt
`WG001-N04-GF101-REVIEW-20260805-R54-A25-IND-01` is also `FAIL`: the bounded
schema consumer still treated multiple Draft 2020-12 assertion keywords as
ignored annotations. Both failures reopen only N04. N03 and N05 remain
`ACCEPTED`; N06 remains `BLOCKED_ON_WG-001-N04`.

Revision 55 captures each caller-supplied reservation object through one
own-data descriptor snapshot. The outer input, identity envelope, every
ordinary or specialized principal, and embedded lease are copied into new
plain objects before semantic reads. Accessors, inherited or non-plain objects,
symbols, missing/extra fields, prototype-name extras, invalid types, invalid
scope/applicability, invalid recovery mode, invalid timestamps, invalid
parent-run type, identity collisions, and lease/operator mismatch fail before
the artifact root or run directory exists. The complete normalized reservation
and lease state are exact-validated again at the final pre-mutation boundary;
the exact precomputed normalized bytes are then persisted, never the live
caller objects. The public reservation, identity, and embedded-lease property
sets are asserted against the runtime-produced shape.

The schema consumer now carries an explicit inventory of every assertion
keyword in the required Draft 2020-12 applicator, unevaluated, and validation
vocabularies. It implements all applicator and validation assertions in that
inventory: `allOf`, `anyOf`, `oneOf`, `not`, `if`/`then`/`else`, properties,
pattern properties, property names, additional properties, dependent schemas
and required fields, prefix/items, contains bounds, type/const/enum, string and
array bounds, uniqueness, property bounds, numeric inclusive/exclusive bounds,
and `multipleOf`. It prevalidates unused branches and definitions before
instance matching. `unevaluatedItems`, `unevaluatedProperties`, and the core
`$dynamicRef` semantic are intentionally unsupported by this bounded consumer
and now fail whole-schema preflight rather than becoming annotations. Boolean
subschemas, adjacent `$ref` assertions, the required custom vocabulary, and
the prior `allOf`/`not` behavior remain supported.

Implementation receipt `WG001-N04-W004-R55-A26-20260805` binds WG-001-N04,
W-004, GF-004 v1 plus GF-101 v1, plan revision 55, work-graph revision 13,
attempt 26, and base/head
`master@4226bfa1f69f069407b5f383e8c72dd39aa5abed`. Producer
`/root/w004_r55_repair` used only local Bun/filesystem permissions. Assigned
and actual writes are `scripts/cascade/common.ts`,
`scripts/cascade/common.test.ts`, `scripts/cascade/campaign-artifacts.ts`,
`scripts/cascade/campaign-artifacts.test.ts`, and this lane packet. W-031,
W-032, active/shared graph projections, public schemas and vocabularies,
generated catalog/briefs, unrelated dirty work, and terminal authority are
preserved. No stage, commit, push, provider, live, product, semantic,
deployment, promotion, or release action was used.

The four-file runtime/test content-manifest digest is
`72a87fa4068e7d1c075305c1201b0baca3f4cf5af1fc81b696d6f9f9b9fa2c8c`.
Focused common/artifact evidence passes `84/84` with `832` assertions. The
common/artifact/campaign join records `112` passes, four root-owned
stale-catalog preflight failures, and `985` assertions; catalog regeneration
was intentionally not performed in this delegated write scope. The scoped
`git diff --check` passes. Actual frozen r30 through r35 artifacts all remain
`VALID`: r30-r33 verify 91 files at manifests `df6b1da1...`, `2edd58b2...`,
`d7dfc93d...`, and `9fb77657...`; r34-r35 verify 93 files at manifests
`f0fe20e1...` and `cbda5987...`.

This receipt proposes N04 `IN_PROGRESS -> REVIEW` only. Root must regenerate
the campaign catalog after all concurrent integration, rerun the joined and
repository gates against the final combined diff, freeze that identity, and
obtain fresh independent GF-004 and GF-101 receipts. N04 acceptance, N06,
Gate A/B, provider/product/live execution, semantic evaluation, promotion,
deployment, and release remain `NOT_RUN`, blocked, or outside this repair. Any
runtime, validator, public-schema/vocabulary, catalog, or combined-diff change
invalidates the affected evidence and requires the corresponding checks again.

Root integration regenerates campaign catalog `df608e2b...` after the W-031
v22/core@23 join. The common/artifact/campaign slice passes `116/116` with
1,002 assertions, the complete suite passes `304/304` with 3,008 assertions,
every repository gate passes, and PB-002 is current. Immutable fixture
`wg001-attempt26-review-20260805-r36` verifies 93 files at manifest
`d07ee2a8...`, fixture evaluation `PASS`, and `release_eligible=false`.
Revision-55 GF-004/GF-101 acceptance remains `NOT_RUN`; this integration
evidence does not accept N04 or open N06.

## Plan Revision 56 Attempt 27 N04 Immutable Schema-Snapshot Repair

Both frozen revision-55 independent receipts are preserved as failed review
evidence. GF-004 receipt `GF004-WG001-N04-R55-A26-20260805-IND-01` is
`FAIL`: epsilon-based `multipleOf` accepted inexact IEEE-754 neighbors,
`required` incorrectly demanded declaration in `properties`, and the local
consumer asserted `date-time` even though the required custom meta-schema
declares only the format-annotation vocabulary. GF-101 receipt
`WG001-N04-GF101-REVIEW-20260805-R55-A26-IND-01` is also `FAIL`: contract
preflight and evaluation reread the caller-owned schema graph, so a stateful
`allOf` accessor or proxy could present different schemas across the two
phases. N03 and N05 remain `ACCEPTED`; only N04 is repaired, and N06 remains
`BLOCKED_ON_WG-001-N04`.

Revision 56 recursively snapshots the complete caller-supplied schema graph
once per public `assertJsonSchema` call. The root, selected subject schema,
arrays, keyword maps, `$defs`, legacy `definitions`, all nested subschemas,
boolean schemas, and const/enum data are copied from one own-property
descriptor snapshot per source object into fresh plain objects and arrays.
Preflight and evaluation consume only that shared normalized graph. Reused DAG
nodes are copied once; cycles, accessors, non-data or non-enumerable fields,
sparse/extra array fields, inherited or non-plain prototypes, symbols,
non-finite numbers, functions, `undefined`, and other non-JSON values fail
before schema preflight or instance evaluation. Stateful descriptor proxies
are read once, ordinary live-property traps are never invoked, and caller
schema objects remain unchanged.

The adjacent standards repairs remove epsilon tolerance from `multipleOf` and
compare exact decimal representations: `0.3` is a multiple of `0.1`, while
`0.30000000000000004` and `1.0000000000000002` are not. A `required` name no
longer needs a sibling `properties` declaration, so
`{properties:{a:true},required:["b"]}` correctly accepts an instance that owns
`b` and rejects one that does not. `format` is now validated as a string
annotation and is not asserted, matching the custom meta-schema's required
format-annotation vocabulary. Runtime artifact timestamp validators remain
authoritative and continue to reject invalid persisted timestamps.

Implementation receipt `WG001-N04-W004-R56-A27-20260805` binds WG-001-N04,
W-004, GF-004 v1 plus GF-101 v1, plan revision 56, work-graph revision 13,
attempt 27, base/head
`master@4226bfa1f69f069407b5f383e8c72dd39aa5abed`, producer
`/root/w004_r55_repair`, and integration owner W-004/root. Assigned scope was
the shared schema consumer/tests, optional artifact integration tests, and
this append-only lane section; actual r56 writes are
`scripts/cascade/common.ts`, `scripts/cascade/common.test.ts`, and this lane
packet. Existing artifact regressions were consumed unchanged. Active/shared
projections, program reports, catalog/brief generation, W-031/W-032, public
schemas/vocabularies, unrelated dirty work, and terminal authority are
preserved. No stage, commit, push, provider, live, product, semantic,
promotion, deployment, or release action was used.

The two-file r56 runtime/test content-manifest digest is
`d5e6506e0144cf256034f4b249bc1155a5020d3bd0402241a363e2c3b301fcbb`.
Focused common/artifact evidence passes `85/85` with `859` assertions. The
common/artifact/campaign join records `113` passes, four root-owned
stale-catalog preflight failures, and `1,012` assertions; catalog regeneration
was outside this delegated scope. TypeScript 5.9.3 with Bun types passes for
the exact r56 source/test pair, and scoped `git diff --check` passes. An
informational wider four-file TypeScript probe remains non-passing only on
pre-existing artifact/simulation-session type errors outside r56; it is not
represented as a passing repository type gate. Frozen r30 through r36 all
remain runtime `VALID`: r30-r33 verify 91 files at manifests `df6b1da1...`,
`2edd58b2...`, `d7dfc93d...`, and `9fb77657...`; r34-r36 verify 93 files at
manifests `f0fe20e1...`, `cbda5987...`, and `d07ee2a8...`.

This receipt proposes N04 `IN_PROGRESS -> REVIEW` only. Root must regenerate
the campaign catalog after final integration, rerun the joined and repository
gates, freeze the final combined diff/catalog identity, and obtain fresh
independent GF-004 and GF-101 receipts. N04 acceptance, N06, Gate A/B,
provider/product/live execution, semantic evaluation, promotion, deployment,
and release remain `NOT_RUN`, blocked, or outside this repair. Any schema
consumer/test, public schema/vocabulary, catalog, or combined-diff change
invalidates the affected evidence and requires the corresponding checks again.

Root integration regenerates campaign catalog `d57288db...` after the W-031
v23/`cascade-core@24` and W-032 consumer join. The current
common/artifact/campaign slice passes `117/117` with 1,029 assertions, the
complete suite passes `310/310` with 3,116 assertions, every repository gate
passes, and PB-002 is current. Immutable fixture
`wg001-attempt27-review-20260805-r37` verifies 93 files at manifest
`e9217dab...`, fixture evaluation `PASS`, and `release_eligible=false`.
Revision-56 GF-004/GF-101 acceptance remains `NOT_RUN`; this integrated
evidence does not accept N04 or open N06.

## Plan Revision 57 Attempt 28 N04 Bounded Schema-Traversal Repair

Frozen revision-56 reviews are preserved as failed evidence. GF-004 receipt
`GF004-WG001-N04-R56-A27-20260805-IND-01` is `FAIL`: the local consumer
rejected the Draft 2020-12-valid empty dependency array and applied the
`minContains <= maxContains` relationship even when `contains` was absent.
GF-101 receipt `WG001-N04-GF101-REVIEW-20260805-R56-A27-IND-01` is also
`FAIL`: schema normalization allocated index bookkeeping from an unbounded
array length, recursive normalization and local-reference traversal had no
explicit depth ceiling, and self, mutual, or deep local `$ref` chains could
escape the bounded `CascadeError` failure boundary. N03 and N05 remain
`ACCEPTED`; only N04 is repaired, and N06 remains
`BLOCKED_ON_WG-001-N04`.

Revision 57 permits empty `dependentRequired` arrays, ignores the
`minContains`/`maxContains` ordering relationship unless `contains` is
present, caps normalized schema arrays at 100,000 entries before allocating
their index set, caps schema graph, contract, and instance-evaluation depth at
256, and caps instance evaluation at 100,000 schema steps. Contract preflight
tracks the active traversal path separately from completed nodes, rejecting
self and mutual local-reference cycles while preserving shared-object and
repeated-local-reference DAGs. Evaluation has the same bounded active-reference
defense, and limit failures use a `CascadeError` subtype that conditional,
choice, negation, and `contains` mismatch handling cannot swallow.

Implementation receipt `WG001-N04-W004-R57-A28-20260805` binds WG-001-N04,
W-004, GF-004 v1 plus GF-101 v1, plan revision 57, work-graph revision 13,
attempt 28, base/head
`master@4226bfa1f69f069407b5f383e8c72dd39aa5abed`, producer
`/root/w004_r56_repair`, and integration owner W-004/root. Assigned and actual
runtime/test writes are `scripts/cascade/common.ts` and
`scripts/cascade/common.test.ts`; this append-only lane section and the thin
active/work-graph projections record the receipt. W-031/W-032 source,
generated catalogs/briefs, public schema/vocabulary files, unrelated dirty
work, and terminal authority are preserved. No stage, commit, push, provider,
live, product, semantic, promotion, deployment, or release action was used.

The two-file runtime/test content-manifest digest is
`c6d470475fd419be4e4b302a037d7773a86fed4c91df924c17e7e62f2cc78166`;
the current file digests are `598693ae...` for `common.ts` and `7ea7988a...`
for `common.test.ts`. Common tests pass `25/25` with 145 assertions; the
common/artifact join passes `86/86` with 874 assertions; TypeScript 5.9.3 with
Bun types and scoped `git diff --check` pass. Campaign self-test passes seven
campaigns with `release_scope=NOT_RUN`, and target self-test passes 26 cases.
The 118-test common/artifact/campaign join records 114 passes, four expected
stale-catalog preflight failures, and 1,027 assertions. Catalog regeneration,
the stale generated W-032 brief, and the concurrent W-031 shadow-corpus join
remain root integration work; those temporary concurrent-source blockers are
not product failures and were not repaired in this scope.

This receipt proposes N04 `IN_PROGRESS -> REVIEW` only. Root must finish the
concurrent W-031/W-032 integration, regenerate shared generated artifacts,
rerun joined and repository gates against one frozen combined diff, and obtain
fresh independent revision-57 GF-004 and GF-101 receipts. N04 acceptance, N06,
Gate A/B, provider/product/live execution, semantic evaluation, promotion,
deployment, and release remain `NOT_RUN`, blocked, or outside this repair. Any
schema consumer/test, catalog, public schema/vocabulary, or combined-diff
change invalidates the affected evidence and requires the corresponding checks
again.

Root integration regenerated catalog `e8b2b9f5...` at the W-031 v24/
`cascade-core@25` and W-032 intake-v5 fixed point. The complete repository
suite passes `316/316` with 3,262 assertions and every required repository gate
passes. Immutable fixture `wg001-attempt28-review-20260805-r38` verifies 93
files at manifest `c9a5283980cfe61a92c6daf11f3ba78ce22e0539ae813515f2a3785442323cc4`,
fixture evaluation `PASS`, and `release_eligible=false`. Revision-57
GF-004/GF-101 acceptance remains `NOT_RUN`; this evidence does not accept N04
or open N06.

## Plan Revision 58 Attempt 29 N04 Selected-Subject Contract Repair

Revision-57 GF-004 receipt
`GF004-WG001-N04-R57-A28-20260805-IND-01` is preserved as `FAIL`. The public
consumer normalized the root and selected schema through one shared graph but
contract-preflighted only the root. When a separately selected subject was
unreachable through recognized root schema keywords, unsupported assertions
could reach evaluation without fail-closed preflight and a malformed
`x-cascade-pairwise-distinct-fields` extension could reach its evaluator as a
raw `TypeError`. The same review found that `minContains > maxContains` with
`contains` is a valid unsatisfiable schema, not an invalid schema contract.
Revision-57 GF-101 receipt
`WG001-N04-GF101-REVIEW-20260805-R57-A28-IND-01` is preserved as `PASS`, but
the shared schema consumer changed for revision 58, so that receipt is
invalidated for current acceptance and fresh GF-101 review remains required.
N03/N05 remain `ACCEPTED`; N06 remains `BLOCKED_ON_WG-001-N04`.

Revision 58 contract-preflights both the normalized root and normalized
selected subject with one shared completed-node and active-path traversal
state. `$ref` still resolves against the normalized root, the root dialect
still governs the custom required vocabulary, and a root/subject DAG or a
subject stored under an unrecognized root annotation is normalized only once.
Unsupported selected-subject assertions now fail before evaluation; malformed
selected-subject pairwise extensions produce bounded `CascadeError` failures.
The non-standard `minContains <= maxContains` preflight relation is removed:
integer keyword shapes remain validated, while an inverted pair with
`contains` evaluates as an unsatisfiable assertion set and remains usable
under applicators such as `not`.

Implementation receipt `WG001-N04-W004-R58-A29-20260806` binds WG-001-N04,
W-004, GF-004 v1 plus GF-101 v1, plan revision 58, work-graph revision 13,
attempt 29, base/head
`master@4226bfa1f69f069407b5f383e8c72dd39aa5abed`, producer
`/root/w004_r56_repair`, and integration owner W-004/root. Assigned and actual
runtime/test writes are `scripts/cascade/common.ts` and
`scripts/cascade/common.test.ts`; this append-only lane section and the thin
active/work-graph projections record the receipt. W-031/W-032 source,
generated catalogs/briefs, public schemas/vocabularies, unrelated dirty work,
and terminal authority are preserved. No stage, commit, push, provider, live,
product, semantic, promotion, deployment, or release action was used.

The two-file runtime/test content-manifest digest is
`7ec095ff1da6a2a09b788e4ffd0f481e3d9fa5be0244534576107210eb5cd116`;
the file digests are `db9105d1...` for `common.ts` and `904c8e76...` for
`common.test.ts`. Common tests pass `26/26` with 152 assertions; the
common/artifact join passes `87/87` with 881 assertions; TypeScript 5.9.3 with
Bun types and scoped `git diff --check` pass. Campaign self-test passes seven
campaigns with `release_scope=NOT_RUN`, and target self-test passes 26 cases.
The 119-test common/artifact/campaign join records 115 passes, four expected
stale-catalog preflight failures, and 1,034 assertions. The campaign catalog
check fails only because the shared source digest changed; regeneration was
intentionally left to root after concurrent integration and is not a product
failure.

This receipt proposes N04 `IN_PROGRESS -> REVIEW` only. Root must regenerate
the shared catalog, rerun joined and repository gates against one frozen
combined diff, freeze a new immutable current-source fixture, and obtain fresh
revision-58 GF-004 and GF-101 receipts. The revision-57 GF-101 pass remains
historical rather than current acceptance evidence. N04 acceptance, N06, Gate
A/B, provider/product/live execution, semantic evaluation, promotion,
deployment, and release remain `NOT_RUN`, blocked, or outside this repair.
Any schema consumer/test, catalog, public schema/vocabulary, or combined-diff
change invalidates the affected evidence and requires corresponding checks.

Root integration regenerated campaign catalog `3f86e21b...` after the W-031
v25/`cascade-core@26` and W-032 intake-v5 join. The complete repository suite
passes `321/321` with 3,401 assertions and every required repository gate
passes. Immutable fixture `wg001-attempt29-review-20260806-r39` verifies 93
files at manifest `76e085d8eaf6d8cbcddf6c6fca24ab0356f9969a4f283177c14dea3b0f66497c`,
fixture evaluation `PASS`, and `release_eligible=false`.

Independent GF-004 receipt `GF004-WG001-N04-R58-A29-20260806-IND-01` and
GF-101 receipt `WG001-N04-GF101-REVIEW-20260806-R58-A29-IND-01` both pass the
exact root-integrated r39 identity. Acceptance receipt
`WG001-N04-ACCEPT-20260806-R58-A29` transitions N04 `REVIEW -> ACCEPTED` and
preserves N03/N05. N06 is now dependency-ready and authorized for delegated
implementation. Gate A, N07 onward, provider/product/live execution, semantic
evaluation, promotion, deployment, and release remain unopened, blocked, or
`NOT_RUN` under their existing gates.

## Plan Revision 59 Attempt 30 N06 Specialized Evaluation Join

WG-001-N06 applies one narrow prerequisite amendment to the accepted N02
definition contract without changing work-graph revision 13 or adding a node:
every campaign now declares specialized-evaluation applicability as source
authority. Product campaigns use `null`. Harness campaigns use exactly one
`REQUIRED` declaration with exact route, trace, and claim IDs, or one explicit
`NOT_APPLICABLE` declaration with empty ID sets and a reason. The seven current
mechanical harness campaigns declare `NOT_APPLICABLE`; task kind is not used to
infer Cascade route/trace authority.

Implementation receipt `WG001-N06-W004-R59-A30-20260806` binds WG-001-N06,
W-004, plan revision 59, work-graph revision 13, attempt 30, accepted N04
receipt `WG001-N04-ACCEPT-20260806-R58-A29`, producer
`/root/w004_r56_repair`, and root as integration and acceptance owner. New run
artifacts cut directly to schema `1.2.0`; read-only verification preserves
`1.0.0` and `1.1.0`. The `1.2.0` reservation freezes authored claim IDs and
specialized applicability. Harness finalization requires exactly one receipt
under `specialized-evaluations/<run-id>-specialized-evaluation/receipt.json`;
product finalization prohibits the principal, declaration, binding, and
artifact.

The specialized receipt schema remains under `harness-evals/`; the general
evaluation receipt/output schemas remain under `product-evals/rubrics/` and
advance to v3. General v3 binds every reserved principal and the exact
specialized receipt digest/status/claim set, and its evaluator cannot assess a
specialized-locked claim. Aggregation v2 consumes the conservative reducer:
mechanical rejection cannot be upgraded, specialized failure cannot be
compensated by general PASS, missing/duplicate/unknown/cross-owned claims fail
closed, and release-eligibility claims do not compensate required non-release
claims. Current mechanical runs emit one explicit `NOT_APPLICABLE` receipt.

Focused receipt, reducer, evaluation, definition, and artifact suites pass
`100/100` with 1,005 assertions. Campaign self-test passes seven campaigns
with `release_scope=NOT_RUN`; Bun bundles the 19-module CLI graph successfully;
scoped `git diff --check` passes. Historical r35 through r39 `1.1.0` fixtures
all verify `VALID` with 93 files and their original manifest digests, including
r39 `76e085d8eaf6d8cbcddf6c6fca24ab0356f9969a4f283177c14dea3b0f66497c`.
Repository validation, campaign catalog check, brief check, and four catalog-
guarded campaign resume cases remain expected integration failures because
concurrent W-031/W-032 source changed the root-owned generated campaign catalog
and brief projection. This producer did not regenerate those shared files.

This receipt proposes N06 `IMPLEMENTING -> REVIEW` only. No self-acceptance,
stage, commit, push, provider, product, live, semantic-judge, promotion,
deployment, or release action occurred. Root must integrate concurrent source,
regenerate the shared catalog/briefs, run the full joined repository gates,
freeze current-source evidence, and obtain the required independent N06
reviews before acceptance or Gate A projection.

Root integration regenerated campaign catalog `429eca73...` and both product
briefs from the combined W-004/W-031/W-032 source. Product starter and
refinement fixtures now carry the direct-cutover product contract explicitly:
`specialized_evaluation` is `null`, general evaluation is v3, aggregation is
v2, and fixture claim/principal bindings are exact. The complete repository
suite passes `335/335` with 3,526 assertions; the W-032/common focused join
passes `80/80` with 636 assertions; every validator, catalog, self-test, brief,
and diff check passes.

Immutable fixture `wg001-n06-review-20260806-r40` verifies schema `1.2.0`, 97
files, and manifest
`cae5fae54a6f27daba8a787093c4e08899cc8157dab2c93198db962f898ffa89`.
Its fixture evaluation is `PASS` and `release_eligible=false`. This is current
deterministic harness evidence, not provider-backed semantic evaluation or a
product run. N06 remains `REVIEW`; fresh independent architecture/functional,
security, and reducer/evaluator review are required before acceptance or N07.

## Plan Revision 60 Attempt 31 N06 Fixed-Point Repair

Revision 60 repairs the three fixed-point N06 failures against immutable r40:
the architecture review from `/root/n06_arch_review` (no receipt ID), reducer
review `WG001-N06-R59-A30-REDUCER-REVIEW-20260806`, and security review
`WG001-N06-GF101-REVIEW-20260806-R59-A30-IND-N06SEC`. Their failed receipts
remain historical evidence and do not accept or advance N06.

Implementation receipt `WG001-N06-W004-R60-A31-20260806` binds WG-001-N06,
W-004, plan revision 60, work-graph revision 13, attempt 31, fixed r40 manifest
`cae5fae54a6f27daba8a787093c4e08899cc8157dab2c93198db962f898ffa89`,
producer `/root/w004_r56_repair`, and root as integration and acceptance owner.
It proposes the repaired N06 implementation for `IMPLEMENTING -> REVIEW` only.

The reducer now consumes specialized and general terminal statuses explicitly.
`FAIL` and `BLOCKED` dominate supported ledgers, while `PASS` is rejected when
a required owned claim is not supported. Specialized receipt v2 requires exact
status, timestamp, root-cause, claim, provider-digest, and frozen artifact
bindings for `REQUIRED`; `NOT_APPLICABLE` retains null digests, an empty ledger,
and no evidence artifacts. Read-only verification preserves r40's v1
`NOT_APPLICABLE` receipt, but current finalization cannot produce or accept that
legacy shape.

General evaluation freshness recomputes the exact evaluation-input digest from
current resolved source and mechanical input, verifies exact claim classes and
statuses, and rejects stale terminal metadata. Aggregation release eligibility
now requires execution `PASS`, reduction `PASS`, every required non-release
claim supported, and every declared release claim supported. Runtime and
terminal verification preserve `BLOCKED` rather than collapsing it to `FAIL`.
Current terminal verification structurally and semantically validates the
specialized, general, aggregation, and summary receipts and recomputes their
identity, digest, terminal-status, release, and claim-chain reconciliation.

Held-out regressions cover specialized and general `FAIL`/`BLOCKED` terminals
with otherwise supported ledgers, invalid status and timestamps, missing or
stale specialized evidence, general input-digest and class drift, failed
required claims beside supported release claims, aggregation and summary drift,
and skeletal current receipts. No deterministic immutable-capable `REQUIRED`
campaign was added: Cascade currently has no deterministic specialized
route/trace evaluator producer that can emit the required frozen input, trace,
output, and claim-evidence packet without pretending fixture mechanics are
provider or semantic proof. That exact execution-path gap remains for N08 and
is `NOT_RUN`; current campaigns still cover only explicit `NOT_APPLICABLE`.

The focused receipt, reducer, evaluation, definition, and artifact suite passes
`104/104` with 1,025 assertions. Campaign self-test passes seven campaigns with
`release_scope=NOT_RUN`. Historical r35 through r40 all verify `VALID` with
their original file counts and manifest digests. N06-owned TypeScript errors
are clear and the CLI bundles successfully. Root-owned catalog regeneration,
brief regeneration, joined repository validation, a new immutable current-
source fixture, and fresh independent architecture/reducer/security review
remain required. No self-acceptance, N07 opening, provider, live, product,
stage, commit, push, promotion, deployment, or release action occurred.

### Revision 60 Root Integration And Review Freeze

Root integrated revision 60 with W-031 revision 26 and the W-032 revision-22
consumer, regenerated campaign catalog `588f75ef...` and both product briefs,
and repaired one stale refinement test producer to emit the current semantic
evaluation, aggregation, and summary contracts. The N06-focused receipt,
reducer, evaluation, definition, campaign, and artifact slice passes `136/136`
with 1,195 assertions. The complete Cascade suite passes `346/346` with 3,678
assertions, and every repository validator, catalog, self-test, brief, and diff
gate passes.

Immutable deterministic fixture
`wg001-n06-r60-w031-r26-review-20260806-r41` verifies schema `1.2.0`, 97 files,
and manifest
`fa6d1d5439086c05b7114bac19f7bdab964f1c4cbad7991632b019ff284dcf6c`.
Its fixture evaluation is `PASS` and `release_eligible=false`. N06 remains
`IN_REVIEW`; independent architecture, reducer/evaluator, and security
acceptance is required before N07. The deterministic REQUIRED-specialization
execution path remains an explicit N08 gap and is `NOT_RUN`; no provider,
product, live, semantic-judge, promotion, deployment, or release proof was
created.

## Plan Revision 61 Attempt 32 N06 Evidence-Authority Repair

Revision 61 repairs failed r60 receipts
`WG001-N06-R60-A31-ARCH-FUNC-REVIEW-20260806`,
`WG001-N06-R60-A31-REDUCER-REVIEW-20260806`, and
`WG001-N06-GF101-REVIEW-20260806-R60-A31-IND-N06SEC`. Those receipts remain
historical failure evidence and do not accept N06.

Implementation receipt `WG001-N06-W004-R61-A32-20260806` binds WG-001-N06,
W-004, plan revision 61, work-graph revision 13, attempt 32, immutable r41
manifest `fa6d1d5439086c05b7114bac19f7bdab964f1c4cbad7991632b019ff284dcf6c`,
producer `/root/n06_r61_repair`, and root as integration and acceptance owner.
It proposes the bounded repair for `IMPLEMENTING -> REVIEW` only.

Current runs persist a source-manifest-bound authored claim-authority artifact
whose ID, class, source path, and source digest are checked against each exact
frozen claim definition. Specialized and general terminal ledgers validate
against that authority; neither terminal verifier derives class authority from
the submitted ledger. General finalization also recomputes the exact frozen
source, execution, calibration, evaluation request/input, Codex input manifest,
provider trace, and provider output links.

`REQUIRED` specialization now requires three distinct canonical typed artifacts:
`input/input-manifest.json`, `provider/trace.json`, and `provider/output.json`.
Their content, cross-links, digests, terminal result, and claim ledger are
validated, and every specialized claim cites the typed provider output. An
arbitrary evidence file cannot be reused as all three provider inputs or as a
substitute claim packet. No deterministic `REQUIRED` producer was added; that
provider-backed execution remains explicit `NOT_RUN` under N08.

Held-out terminal regressions accept one exact current packet and reject
class-to-release substitution, stale evaluation-input linkage, provider-trace
drift, substituted provider output, and reused or arbitrary specialized
evidence. The focused artifact and specialized-receipt suites pass `70/70` with
761 assertions; the CLI bundles; Cascade validation passes; campaign self-test
passes seven campaigns with `release_scope=NOT_RUN`; and immutable r35 through
r41 remain `VALID` with their original file counts and manifest digests. The
campaign test slice compiled and reached `97/101`; its four failures are the
expected protected generated-catalog staleness and require root regeneration,
not a generated-output write from this worker.

No self-acceptance, N07 opening, provider/live/product execution, immutable
current-source freeze, generated shared-output write, stage, commit, push,
promotion, deployment, or release action occurred. Root integration, catalog
refresh, a new immutable deterministic fixture, joined validation, and fresh
independent architecture/functional, reducer/evaluator, and GF-101 security
review remain required.

### Revision 61 Root Integration And Review Freeze

Root regenerated campaign catalog `651aecba...`, PB-001, and PB-002 from the
combined N06 revision-61, W-031 revision-27, and W-032 revision-22 source. One
stale resume fixture was updated to seed the current source-manifest v3 and
authored claim-authority contract. The complete Cascade suite passes `353/353`
with 3,764 assertions; every repository validator, catalog, self-test, brief,
and diff gate passes.

Immutable deterministic fixture
`wg001-n06-r61-w031-r27-review-20260806-r42` verifies 99 files at manifest
`60e19b5a3723d8e9686159ce8d7f616738118aa1e57f789334bb07e4f767d04a`.
Fixture evaluation is `PASS`; `release_eligible=false`. N06 remains
`IN_REVIEW` pending fresh independent architecture/functional,
reducer/evaluator, and GF-101 receipts. REQUIRED specialized provider
execution remains `NOT_RUN` under N08; no product, live, semantic-judge,
promotion, deployment, or release proof was created.

## Plan Revision 62 Attempt 33 N06 Receipt-Judgment Binding Repair

Revision 62 repairs failed r61 receipts
`WG001-N06-R61-A32-ARCH-FUNC-REVIEW-20260806` and
`WG001-N06-R61-A32-REDUCER-REVIEW-20260806`. Those receipts remain historical
failure evidence and do not accept N06.

Implementation receipt `WG001-N06-W004-R62-A33-20260806` binds WG-001-N06,
W-004, plan revision 62, work-graph revision 13, attempt 33, immutable r42
manifest `60e19b5a3723d8e9686159ce8d7f616738118aa1e57f789334bb07e4f767d04a`,
producer `/root/n06_r61_repair`, and root as integration and acceptance owner.
It proposes the bounded repair for `IMPLEMENTING -> REVIEW` only.

Fixture receipts are now deterministic projections of their authenticated
mechanical inputs. Runtime freshness and terminal finalization reconstruct and
compare the exact claim ledger, terminal status, root cause, earliest failure,
residual uncertainty, next route, and empty proposal binding set. A mechanically
passing fixture cannot be resealed as a failing or blocked receipt, and the
inverse stale substitution is rejected.

Codex receipts are now deterministic projections of the authenticated provider
output plus the mechanical non-upgrade rule. Runtime freshness and terminal
finalization reconstruct and compare each claim's status, reason, and evidence,
the overall status, root cause, earliest failure, residual uncertainty, next
route, and proposal bindings. Mechanical rejection remains authoritative;
otherwise the provider judgment is authoritative. Provider `FAIL` or
`UNSUPPORTED` evidence cannot be resealed as receipt `PASS` or `SUPPORTED`, and
a stale failing receipt cannot replace an authenticated passing provider
judgment.

New runtime held-outs pass `2/2` with five assertions, and the expanded strict
terminal-finalization held-out passes `1/1` with ten assertions. The three owned
campaign, artifact, and receipt test files reach `100/104` with 923 assertions;
the only four failures stop at the protected generated campaign-catalog stale
guard and require root regeneration. The read-only evaluation suite reaches
`5/6`; its sole failure is an unowned legacy fixture test that still expects an
arbitrary fixture terminal judgment to survive freshness validation and must be
updated by the integration owner for the new deterministic projection contract.

The CLI bundles successfully, Cascade validation passes, campaign self-test
passes seven campaigns with `release_scope=NOT_RUN`, scoped diff checking
passes, and immutable r35 through r42 remain `VALID` with their original file
counts and manifest digests. No current-source immutable run was created.
REQUIRED specialized provider execution remains `NOT_RUN` under N08.

No self-acceptance, N07 opening, provider/live/product execution, generated
shared-output write, immutable current-source freeze, stage, commit, push,
promotion, deployment, or release action occurred. Root integration, the
protected catalog refresh, the unowned legacy-test expectation update, joined
validation, a new immutable deterministic fixture, and fresh independent
architecture/functional, reducer/evaluator, and GF-101 security review remain
required.

### Revision 62 Root Integration And Review Freeze

Root updated the stale fixture expectation to the deterministic projection
contract, regenerated campaign catalog `78838d3b...`, PB-001, and PB-002, and
joined N06 revision 62 with W-031 revision 28 and the W-032 revision-22
consumer. The complete Cascade suite passes `361/361` with 3,871 assertions;
every repository validator, catalog, self-test, brief, and diff gate passes.

Immutable deterministic fixture
`wg001-n06-r62-w031-r28-review-20260806-r43` verifies 99 files at manifest
`5e0e2c83a44e9bb76c159541683ed330c04548de1ddc83b0b8e4287283eed99e`.
Fixture evaluation is `PASS`; `release_eligible=false`. N06 remains
`IN_REVIEW` pending fresh independent architecture/functional,
reducer/evaluator, and GF-101 receipts. REQUIRED specialized provider
execution remains `NOT_RUN`; no product, live, semantic-judge, promotion,
deployment, or release proof was created.

## Plan Revision 63 Attempt 34 N06 Frozen-Authority Repair

Revision 63 repairs failed r62 receipts
`WG001-N06-R62-A33-ARCH-FUNC-REVIEW-20260806`,
`WG001-N06-R62-A33-REDUCER-REVIEW-20260806-IND-6E2C`, and
`WG001-N06-GF101-REVIEW-20260806-R62-A33-IND-CONTRACT`. Those receipts remain
historical failure evidence and do not accept N06.

Implementation receipt `WG001-N06-W004-R63-A34-20260806` binds WG-001-N06,
W-004, plan revision 63, work-graph revision 13, attempt 34, immutable r43
manifest `5e0e2c83a44e9bb76c159541683ed330c04548de1ddc83b0b8e4287283eed99e`,
producer `/root/n06_r61_repair`, and root as integration and acceptance owner.
It proposes the bounded repair for `IMPLEMENTING -> REVIEW` only.

Current terminal finalization now resolves the exact authored campaign by its
reserved digest, then resolves its frozen evaluation profile, rubric,
simulation, tasks, claims, population and derivation inputs. It authenticates
every execution task-result digest against the execution receipt and
deterministically reconstructs the general mechanical claim ledger from those
frozen authorities plus the exact calibration receipt. The submitted request,
principal set, provider, profile, model, reasoning effort, rubric, mechanical
ledger, evaluation-input digest, and receipt projection must match that
authority exactly. A Codex-authored campaign cannot be coherently resealed as a
fixture campaign; fixture behavior remains valid only when the frozen authored
profile is fixture.

The exported runtime freshness boundary now fails closed when a Codex receipt
is checked without its authenticated request, input manifest, provider trace,
and provider output. Resume authenticates that complete packet before reusing a
receipt, and the submitted request must equal the current resolved runtime
projection. The REQUIRED specialized provider-output contract now includes
`residual_uncertainty`; terminal receipt verification compares it exactly so
neither a receipt-only nor provider-output-only uncertainty substitution can
survive.

Held-outs preserve the r62 bidirectional receipt/provider substitutions and add
missing Codex evidence, substituted runtime request, Codex-to-fixture downgrade,
coherently resealed mechanical request, profile/rubric/model substitution,
frozen fixture acceptance, and bidirectional REQUIRED residual-uncertainty
cases. The final focused authority set passes `4/4` with 22 assertions. The
complete specialized receipt suite passes `7/7` with 18 assertions. The three
owned campaign, artifact, and receipt suites reach `101/105` with 930
assertions; their only four failures stop at the protected generated campaign-
catalog stale guard after concurrent W-031 source movement. Adjacent evaluation,
reducer, and definition suites pass `36/36` with 272 assertions.

The 19-module CLI bundles successfully, campaign self-test passes seven
campaigns with `release_scope=NOT_RUN`, and scoped diff checking passes.
Repository validation reaches only the protected stale PB-002 generated brief
after concurrent source movement; this worker did not regenerate it. Immutable
r35 through r43 all verify `VALID` with their original file counts and manifest
digests. No current-source immutable run was created. REQUIRED specialized
provider execution remains `NOT_RUN`.

No self-acceptance, N07 opening, provider/live/product execution, generated
catalog or brief write, immutable current-source freeze, stage, commit, push,
promotion, deployment, or release action occurred. Root integration, protected
projection regeneration, joined validation, a new immutable deterministic
fixture, and fresh independent architecture/functional, reducer/evaluator, and
GF-101 security review remain required.

### Revision 63 Root Integration And Review Freeze

Root joined N06 revision 63 with W-031 revision 29 and the W-032 revision-22
consumer, regenerated protected campaign catalog
`70143a4a10208378914d10fe798d6a9edac3f89a39949a49cb876d21dcd725d4`
plus PB-001/PB-002, and passed every repository validator, catalog, self-test,
brief, and diff gate. Admission identity is v30/core@31 with `515/515` exact
cases, persistence `391/391`, claims `387/387`, and zero over/under-control.
The complete suite passes `366/366` with 3,959 assertions.

Immutable deterministic fixture
`wg001-n06-r63-w031-r29-review-20260806-r44` verifies 99 files at manifest
`dbaf083fe88d0eb577877e8a0263291534e2a25fddf9531ccbf04d05b7633243`.
Fixture evaluation is `PASS`; `release_eligible=false`. N06 remains
`IN_REVIEW` pending fresh exact-identity architecture/functional,
reducer/evaluator, and GF-101 receipts. REQUIRED specialized provider
execution, product/live execution, semantic judging, promotion, deployment,
and release proof remain `NOT_RUN`.

## Plan Revision 64 Attempt 35 N06 Terminal Mechanical/Calibration Authority Repair

Revision 64 repairs failed receipts
`WG001-N06-R63-A34-ARCH-FUNC-REVIEW-20260806` and
`WG001-N06-GF101-REVIEW-20260806-R63-A34-IND-CONTRACT`. Passing reducer receipt
`WG001-N06-R63-A34-REDUCER-REVIEW-20260806-IND-9F3A` remains positive regression
evidence, not acceptance of the rejected revision-63 candidate.

Implementation receipt `WG001-N06-W004-R64-A35-20260806` binds WG-001-N06,
W-004, plan revision 64, work-graph revision 13, attempt 35, rejected immutable
r44 manifest `dbaf083fe88d0eb577877e8a0263291534e2a25fddf9531ccbf04d05b7633243`,
producer `/root/n06_r61_repair`, and root as integration and acceptance owner.
It proposes the bounded `IMPLEMENTING -> REVIEW` transition only.

Runtime and terminal finalization now share deterministic calibration and
mechanical reducers. Current terminal evidence reconstructs each task from the
frozen authored task, policy, and oracle definitions plus canonical event,
policy-decision, dispatch, oracle, final-state, recovery, and cleanup sidecars.
The result and execution summaries must project those authorities exactly;
policy-decision digests, terminal outcome/status, authored policy/oracle IDs,
oracle values, cleanup/recovery events, and final state cannot be changed by
coherently resealing result and execution payloads.

Calibration status, metric results, ranking and linear correlations, treatment
membership, human agreement, reviewer identity, invalidation inputs, freshness,
thresholds, and score/definition digests are rebuilt from frozen authored
metric, treatment, calibration, simulated-score, and reference-score sources.
The persisted calibration receipt must equal that reconstruction. General
evaluation, aggregation, and summary calibration digests now equal the actual
lineage exactly and remain null when no calibration exists. Codex provider
output `mechanical_gate_status` must equal the reconstructed mechanical gate.

Source-manifest v3 terminal checks now bind `source_digest` to the exhaustive,
unique definition list, bind `identity_envelope_digest` to the reserved
identity envelope, and require one exact frozen-source correspondence per
definition including record, lineage, platform, redaction, size, and digest.
Held-outs cover source/identity/frozen correspondence, result-versus-sidecar
drift in both directions, Codex mechanical-gate drift, absent invented and
present removed calibration digests, and coherently resealed calibration
receipt/request/provider/evaluation/aggregation chains.

The strict terminal authority slice passes `1/1` with 24 assertions; the full
artifact suite passes `64/64` with 763 assertions; focused runtime freshness,
population, and calibration reducers pass `8/8` with 21 assertions; source
resolution passes `24/24` with 236 assertions. The five owned/adjacent campaign,
artifact, evaluation, specialized-receipt, and definition suites reach
`131/135` with 1,202 assertions. Their only four failures stop at the protected
stale campaign-catalog guard after concurrent source movement.

The 20-module CLI bundles successfully and campaign self-test passes seven
campaigns with `release_scope=NOT_RUN`. Repository validation and scoped diff
checking currently stop at the concurrently stale protected PB-002 generated
brief; this worker did not regenerate protected projections. Immutable r35
through r44 all verify `VALID` with their original file counts and manifest
digests. No current-source immutable run was created. REQUIRED specialized
provider execution remains `NOT_RUN`.

No self-acceptance, N07 opening, provider/live/product execution, generated
catalog or brief write, immutable current-source freeze, stage, commit, push,
promotion, deployment, or release action occurred. Root integration, protected
projection regeneration, joined validation, a new immutable deterministic
fixture, and fresh independent architecture/functional and GF-101 security
review remain required.

### Revision 64 Root Integration And Review Freeze

Root joined N06 revision 64 with W-031 revision 30 and the W-032 revision-22
consumer. The protected catalog is
`234c05a39d559884b9c549ef8b4a781642d48f47c4cae1daca821617a14745b3`;
PB-001 and PB-002 are current. Admission identity is v31/core@32 with
`545/545` exact cases, persistence `391/391`, claims `417/417`, and zero
over/under-control. Every repository validator, catalog, self-test, brief, and
diff gate passes.

The first joined full-suite run classified one strict-authority test as a
`timing-flake`: its expanded 24-assertion matrix completed at 5.013 seconds
against Bun's five-second default while every assertion and focused run passed.
Test autorepair changed only that test's timeout to 15 seconds without changing
coverage or assertions. The focused replay passes `1/1` in 7.1 seconds; the
complete suite then passes `371/371` with 4,052 assertions.

Immutable deterministic fixture
`wg001-n06-r64-w031-r30-review-20260806-r45` verifies 100 files at manifest
`9f365c6879fc18668b1d223f779d4b8562bb6bdf5fa663e57a49ebbe9795d209`.
The added file is the frozen shared mechanical/calibration authority reducer.
Fixture evaluation is `PASS`; `release_eligible=false`. N06 remains
`IN_REVIEW` pending fresh architecture/functional, reducer/evaluator, and
GF-101 receipts. Provider, product, live, semantic-judge, promotion,
deployment, and release evidence remain `NOT_RUN`.

## Plan Revision 65 Attempt 36 N06 Chronology And Authored-Authority Repair

Revision 65 repairs the remaining revision-64 architecture, reducer, and
security findings without changing immutable r45. Implementation receipt
`WG001-N06-W004-R65-A36-20260806` binds WG-001-N06, W-004, plan revision 65,
work-graph revision 13, attempt 36, immutable r45 manifest
`9f365c6879fc18668b1d223f779d4b8562bb6bdf5fa663e57a49ebbe9795d209`,
producer `/root/n06_r61_repair`, and root as integration and acceptance owner.
It proposes the bounded `IMPLEMENTING -> REVIEW` transition only.

Runtime and terminal authority now share one authenticated `EVALUATING`
instant. Calibration `created_at`, reference window, `stale_after`, and status
are reconstructed at that lifecycle instant; resume reuses the exact evaluation
and terminal finalization instants instead of duplicating them. Terminal
chronology binds execution, evaluation, aggregation, summary, and terminal
lifecycle ordering. Exact expiry remains calibrated while expiry plus one
millisecond is stale; a coherently backdated nonfixture receipt cannot upgrade
the terminal result.

Each PASS task now requires exact authored action-policy and oracle coverage.
Policy decisions bind action index/type/digest, applicable policy
id/version/digest/effect/reason, considered applicability, redaction,
confirmation usage, dispatch, and campaign-wide budgets. Oracle evidence binds
ordered coverage and reconstructed expected/actual/status from frozen
definitions and canonical final state or process/HTTP sidecars; an error is
necessarily a failure and cannot coexist with PASS. The shared mechanical
reducer blocks a required policy when positive applicable evidence is absent.
Execution top status and cleanup are rebuilt from exact authored task results
and, when present, the digest-valid latest session checkpoint. Frozen dynamic
campaign definitions must equal the reachable dependency closure; extra
unreferenced definitions and omissions fail closed.

Held-outs include zero policy decisions, zero oracle results, zero dispatch,
and empty final state despite an applicable ALLOW policy and state-equals
oracle; coherent top-status substitution; extra frozen definitions; exact
calibration expiry straddling; and a coherently backdated nonfixture chain.
The strict terminal slice passes `1/1` with 28 assertions. The complete owned
campaign, artifact, and definition focus passes `123/123` with 1,182
assertions. Campaign catalog check and self-test pass seven campaigns at digest
`3996ed743f072980238043c7dd03b18d448067db3c6d1a0a9b33ef452e72db46`;
self-test release scope is `NOT_RUN`.

Repository validation reaches only the concurrently stale protected PB-002
generated brief. This worker did not regenerate that projection. No immutable
current-source run, independent review, provider/live/product execution,
semantic judging, self-acceptance, N07 opening, stage, commit, push, promotion,
deployment, or release proof was created. Root joined validation, protected
brief regeneration, immutable deterministic freeze, and fresh independent
architecture/functional, reducer/evaluator, and GF-101 review remain required.

### Revision 65 Root Integration And Review Freeze

Root joined N06 revision 65 with W-031 revision 31 and the W-032 revision-22
consumer, regenerated PB-002, and verified both tracked product briefs. The
protected campaign catalog is
`3996ed743f072980238043c7dd03b18d448067db3c6d1a0a9b33ef452e72db46`.
Admission identity is v32/core@33 with `599/599` exact cases, persistence
`391/391`, claims `471/471`, and zero over/under-control. Repository,
admission, evaluation, target, campaign, brief, JSON, and diff gates pass.

The joined Bun 1.3.3 suite passes `377/377` with 4,157 assertions across 14
files. Immutable deterministic fixture
`wg001-n06-r65-w031-r31-review-20260806-r46` verifies 100 files at manifest
`9ed9d9355d167c765d93c7f3a9ba4b17d1858fb0e30738349717e73aa32ce911`.
Fixture evaluation is `PASS`; `release_eligible=false` and release scope is
`NOT_RUN`. N06 remains `IN_REVIEW`; no self-acceptance or N07 opening occurred.
Fresh exact-identity architecture/functional, reducer/evaluator, and GF-101
receipts are required. Provider, product, live, semantic-judge, promotion,
deployment, and release evidence remain `NOT_RUN`.

## Plan Revision 78 Attempt 49 Runtime Parser Parity Repair

- Immutable r65 is rejected historical evidence. Architecture/functional
  receipts `WG001-N06-R77-A48-ARCHFUNC-STANDARDS-20260808-02` and
  `WG001-N06-R77-A48-ARCHFUNC-SPEC-20260808-02`, plus GF-101 receipt
  `WG001-N06-R77-A48-R65-GF101-SEC-20260808-01`, failed it. The two
  reducer/evaluator receipts accepted r65 only and do not transfer to changed
  source.
- N06 moves `IN_REVIEW -> IN_PROGRESS`; plan revision moves `77 -> 78` and
  attempt `48 -> 49`. No graph topology or gate meaning changes.
- The shared Codex JSONL parser now rejects explicit error/failed terminal
  events and all activity after the single final agent response. Campaign
  persistence, resume/freshness validation, and artifact verification use this
  same parser authority. The runtime general-evaluation request recomputes its
  status from the filtered general claim ledger.
- Focused Bun 1.3.3 evaluation/campaign coverage passes `69/69` with 364
  assertions. The harness source digest is
  `04683d2d8a34bf0b661a54db27d0a5844bfffaf9615ab6684a464c2a38028364`
  and the regenerated campaign catalog digest is
  `301aa4a9f457a3fd7f721d9997813e2e55865b83f9e7a94c9d144419726b424d`.
- The complete suite passes `511/511` with 5,196 assertions. Repository,
  admission validation and the `981/981` corpus, evaluation, target, campaign,
  brief, zero-issue work audit, and diff checks pass. Immutable r66 verifies
  121 files at manifest
  `0f85cf82beb1c6e4546c5b19d62896884429d10761899931c99e5e2e7e631cec`;
  source digest is
  `05259ce6850e1c21e391c9b7a22a8d4cc2323a23ecd702fdc7a59a2a6015a7d6`,
  source-manifest digest is
  `c518c4798153c8fa3d24f98c27d0f02626c5101821abda6a7bd7caef139e5fbd`,
  and identity-envelope digest is
  `20d0e00eed67467fb45c371303658857030eefe663129390f1c706c0b7a1f238`.
  N07/N08, Gate A, downstream integration, live/provider work, and release
  claims remain blocked, open, or `NOT_RUN`.

## Plan Revision 79 Attempt 50 Tool Lifecycle Repair

- Immutable r66 passed architecture/functional receipts
  `WG001-N06-R78-A49-ARCHFUNC-STANDARDS-20260808-03` and
  `WG001-N06-R78-A49-ARCHFUNC-SPEC-20260808-03`, plus reducer/evaluator
  receipts `WG001-N06-R78-A49-R66-REDUCER-EVALUATOR-STANDARDS-20260808-IND-01`
  and `WG001-N06-R78-A49-R66-REDUCER-EVALUATOR-SPEC-20260808-IND-01`.
  GF-101 receipt `WG001-N06-R78-A49-R66-GF101-SEC-20260808-01` rejected it
  because pre-response tool lifecycle events were ignored.
- N06 moves `IN_REVIEW -> IN_PROGRESS`; plan revision moves `78 -> 79` and
  attempt `49 -> 50`. No graph topology or gate meaning changes.
- The shared parser rejects every `item.failed` event and permits
  `item.started` or `item.updated` only for reasoning and agent-message items.
  Shared-parser and campaign-runtime tests cover all eight prohibited tool
  item kinds at completed, started, updated, and failed lifecycle stages.
- Focused evaluation/campaign tests pass `69/69` with 412 assertions. The
  complete suite passes `511/511` with 5,245 assertions. The harness source
  digest is
  `ee703df406d109a21118ff4bbb472561da08c72472d416b89b0e48cdf78a370c`
  and the regenerated campaign catalog digest is
  `b0d20244add6d30c3a915bd38c1da87818b2538b8b3dba5a50948fb3ffa5ff0d`.
- Every named repository validator passes. Immutable r67 verifies 121 files at
  manifest `1e13326389ff9f13a19c9a3990697fceb0d41c5a682aa4b47a0b85dd1411561c`;
  source digest is
  `dcc66a7a40252fa5a66ceff366baceaeec765cb1eeeafa05ba5046dec775286f`,
  source-manifest digest is
  `61edd37acb0f2657bffbf59034b4b656d0fbd2bf2f9f17f029a7cfcf33999452`,
  and identity-envelope digest is
  `7f5c5a730319e3dc04c90cf01076813fbcb14a914e5c12349d08fa8a71c1351a`.
  N07/N08, Gate A, downstream integration, live/provider work, and release
  claims remain blocked, open, or `NOT_RUN`.

## Plan Revision 80 N06 Acceptance And N07 Start

- N06 revision-79 attempt-50 is accepted against immutable r67. Exact
  architecture/functional receipts
  `WG001-N06-R79-A50-ARCHFUNC-STANDARDS-20260808-04` and
  `WG001-N06-R79-A50-ARCHFUNC-SPEC-20260808-04`, reducer/evaluator receipts
  `WG001-N06-R79-A50-R67-REDUCER-EVALUATOR-STANDARDS-20260808-IND-01` and
  `WG001-N06-R79-A50-R67-REDUCER-EVALUATOR-SPEC-20260808-IND-01`, and GF-101
  receipt `WG001-N06-R79-A50-R67-GF101-SEC-20260808-01` all pass with worst
  severity `NONE`.
- The accepted binding is source
  `dcc66a7a40252fa5a66ceff366baceaeec765cb1eeeafa05ba5046dec775286f`,
  source manifest
  `61edd37acb0f2657bffbf59034b4b656d0fbd2bf2f9f17f029a7cfcf33999452`,
  identity envelope
  `7f5c5a730319e3dc04c90cf01076813fbcb14a914e5c12349d08fa8a71c1351a`,
  and packet
  `1e13326389ff9f13a19c9a3990697fceb0d41c5a682aa4b47a0b85dd1411561c`.
- N07 is now eligible and moves to `IN_PROGRESS` at revision 80 attempt 1.
  N08 and Gate A remain blocked until N07 implementation, validation, immutable
  evidence, and exact review accept.

## Plan Revision 77 Attempt 48 Exact Evaluator Terminal Repair

The three exact independent reviews of immutable r64 all returned required
`FAIL`: architecture/functional and GF-101 found that general evaluator traces
ignored completed tool activity, while reducer/evaluator review found that
explicit `FAIL` or `BLOCKED` terminals could contradict all-supported ledgers
and that specialized-only mechanical failures leaked into general evaluation.
The bound review receipts are
`WG001-N06-R76-A47-ARCHFUNC-STANDARDS-20260808-01`,
`WG001-N06-R76-A47-ARCHFUNC-SPEC-20260808-01`,
`WG001-N06-R76-A47-R64-REDUCER-EVALUATOR-STANDARDS-20260808-IND-01`,
`WG001-N06-R76-A47-R64-REDUCER-EVALUATOR-SPEC-20260808-IND-01`, and
`WG001-N06-GF101-R76-A47-R64-IND-SEC-20260808-01`.

Attempt 48 centralizes exact required-claim terminal derivation and applies it
to general output, specialized receipts, public receipts, immutable terminal
verification, and the joined reducer. General mechanical authority is filtered
and its status recomputed after specialized ownership is removed. Runtime and
artifact re-verification now share one fail-closed Codex JSONL parser: completed
reasoning is permitted, exactly one terminal agent message is required, and
completed command, file, web, MCP, collaboration, computer, image, or unknown
activity is rejected. The evaluator prompt explicitly treats all frozen run
content as untrusted evidence and ignores embedded instruction attempts.

The focused evaluator, reducer, specialized-receipt, terminal-artifact, and
campaign suite passes `155/155` with 1,232 assertions. The complete Bun 1.3.3
suite passes `509/509` with 5,178 assertions; repository, admission, 981-case
corpus, harness catalog/self-test, target self-test, campaign catalog/self-test,
brief, work-audit, and diff checks pass. Immutable r65 is
`VALID`/`COMPLETED`/`FRESH`, verifies 121 files at manifest
`6d34d6a12c7e7cf363021e1efa6d62c30704ba9c736c282f382ad7920e5339e7`,
and binds source graph `4e6a36a2e9a507455658b4d541f3f07aee96d00e769e79b9a76d21859dba9ef3`,
source-manifest value `c08539dcce6547019e7363664b774e08b2aa8d434698bd340f6f949c74627ee8`,
and identity envelope `ec279e56197d35960e85172f11b14cacb30857cc19af2f1653364dda5d0a954f`.
The replacement three-review set remains required. N06 returns to
`IN_REVIEW`; N07/N08, Gate A, integration, product/live
execution, and release evidence remain blocked, open, or `NOT_RUN`.

## R52 Independent Review And Revision 71 Attempt 42 Repair

Immutable r52 remains unchanged review evidence. Reducer/evaluator receipt
`wg001-n06-r70-attempt41-r52-reducer-acceptance-20260806` and GF-101 receipt
`WG001-N06-GF101-REVIEW-20260806-R70-A41-IND-R52` accept their exact r52
subjects. Architecture/functional receipt
`WG001-N06-R70-A41-ARCH-FUNC-REVIEW-20260806-R52-IND-N06R70-01` rejects r52
because the verifier allowed impossible outcome/boundary traces and assumed
policy evidence always used ACTION events, excluding legitimate direct-process
and HTTP policy evidence. The two positive receipts remain historical positive
evidence but are source-sensitive and cannot accept revision 71.

Implementation receipt `WG001-N06-W004-R71-A42-20260806` repairs only those
architecture-owned boundaries and proposes N06 `IN_PROGRESS -> REVIEW`.
It does not self-accept N06 or open N07.

## Plan Revision 71 Attempt 42 And W-031 Revision 37 Root Integration

Root joins N06 revision 71, W-031 revision 37, and current W-032 producer
parity, then regenerates the seven-campaign catalog at semantic digest
`b6470a870ae643b156c5a8029901a6588df6e4e2d7d9d28b216b42aba5738a85`.
The complete exact Bun 1.3.3 suite passes `425/425` with 4,636 assertions.
Repository, admission, evaluation, target, campaign, product-brief, and diff
validators pass. Admission v38/`cascade-core@39` passes `925/925`, persistence
`531/531`, and claims `733/733`, with zero over/under-control; combined
W-031/W-032 focused parity passes `184/184` with 2,940 assertions.

Immutable deterministic fixture
`wg001-n06-r71-w031-r37-review-20260806-r53` verifies 126 files at manifest
`f606bb5d539ec5860ba3e9b0b7e0eda3a28aed7f207610b00db76581fe4eae6a`.
Its source graph digest is
`aa1214839cdcceab9968af7d465a480bc56b316059537b28c38ff9301e493e1f`
and its identity envelope is
`2bf760f1b40d99aba2bc0b18846f483a5e88e9f5c56ad41dea47ca9097f681ef`.
Verification is `FRESH`, fixture evaluation is `PASS`, and
`release_eligible=false`.

This is a root-integrated review candidate, not acceptance. N06 remains
`IN_REVIEW`; N07/N08 and Gate A remain blocked. Fresh exact N06
architecture/functional, reducer/evaluator, and GF-101 receipts must bind both
immutable r53 and the current workspace binding before N06 can accept. No
provider/live/product execution, semantic judging, promotion, deployment, or
release evidence was created.

## R53 Independent Review And Revision 72 Attempt 43 Repair

Immutable r53 remains unchanged historical review evidence. Architecture/
functional receipt
`WG001-N06-R71-A42-ARCH-FUNC-REVIEW-20260806-R53-IND-N06R71-01` and GF-101
receipt `WG001-N06-GF101-R71-A42-R53-IND-SEC-20260806` reject the r53 subject.
Reducer receipt `WG001-N06-R71-A42-R53-REDUCER-REVIEW-20260806-01` accepts its
bounded r53 subject only and is source-sensitive after repair.

Implementation receipt `WG001-N06-W004-R72-A43-20260806` repairs the rejected
architecture/security boundaries and proposes N06 `IN_PROGRESS -> REVIEW`.
It does not self-accept N06 or open N07.

## Plan Revision 72 Attempt 43 And W-031 Revision 38 Root Integration

Root joins N06 revision 72, W-031 revision 38, and current W-032 v39/core@40
producer parity, then regenerates the seven-campaign catalog at semantic digest
`dcfffc356d74444d0c4f52b493280614bf780313f9e54045a5d63ef42a6a4f9e`.
The complete exact Bun 1.3.3 suite passes `433/433` with 4,727 assertions.
Repository, admission, evaluation, target, campaign, product-brief, and diff
validators pass. Admission v39/`cascade-core@40` passes `949/949`, persistence
`555/555`, and claims `757/757`, with zero over/under-control.

Immutable deterministic fixture
`wg001-n06-r72-w031-r38-review-20260806-r54` is
`VALID`/`COMPLETED`/`FRESH` and verifies 126 files at manifest
`4032bc467d125d9bc20851557d51bc2c2cc86a9c43aa62bbebc52e069fc2024a`.
Its source digest is
`3614d131e93d84fb8c4258876270869ac019475116c0705732db0e1a2a715b7d`,
identity envelope is
`214fb8dadec579099e5436417ddc57244415ea14e73583efc3715d09a9384048`,
evaluation receipt SHA is
`a10cbf6957969d8145eed3dfb8a1d5b94eb7cac33f116211d5b4e7ea68fe5e09`,
aggregation SHA is
`72bd4203a85d63890428087f0a77ffe0ec61f9f9794a28088506379e6c1aeac9`,
and finalization SHA is
`343c1fcb0b3ba679b5afb81b04b2c019d824c039730748591b9e745e85619f16`.
Fixture evaluation is `PASS`/`CALIBRATED`; `release_eligible=false`.

This is a root-integrated review candidate, not acceptance. N06 remains
`IN_REVIEW`; N07/N08 and Gate A remain blocked. Fresh exact N06
architecture/functional, reducer/evaluator, and GF-101 receipts must bind both
immutable r54 and the current workspace binding before N06 can accept. No
provider/live/product execution, semantic judging, promotion, deployment, or
release evidence was created.

## R54 Independent Review And Revision 73/74 Repairs

Immutable r54 remains unchanged historical review evidence. N06 architecture/
functional receipt `WG001-N06-R72-A43-ARCH-FUNC-REVIEW-20260806-R54-IND-N06R72-01`,
reducer receipt `WG001-N06-R72-A43-REDUCER-REVIEW-20260806-R54`, and GF-101
receipt `WG001-N06-GF101-R72-A43-R54-IND-SEC-20260806` all reject revision 72.
Revision-73 attempt-44 repairs session-history/resume authority. Revision-74
attempt-45 repairs safe action binding, intake-v6, and secret-reference
authority. Both remain implementation receipts only and do not self-accept N06
or open N07.

## Plan Revision 74 Attempt 45 And W-031 Revision 39 Root Integration

Root joins N06 revision 74, W-031 revision 39, and W-032 revision-22
intake-v6/action-binding-v2 parity, then regenerates the seven-campaign catalog
at semantic digest
`91a03bbb2351d19854a67808413ece8726fd6bf0cb9f74b0e6c083db486f8f22`.
The complete exact Bun 1.3.3 suite passes `449/449` with 4,860 assertions.
All validators pass. Admission v40/`cascade-core@41` passes `965/965`,
persistence `571/571`, and claims `773/773`, with zero over/under-control;
the focused W-032 intake-v6/action-binding-v2 suite passes `237/237`.

Immutable deterministic fixture
`wg001-n06-r74-w031-r39-review-20260806-r55` is
`VALID`/`COMPLETED`/`FRESH` and verifies 126 files at manifest
`f660e2b06c34d83d4e6543774603cac270aace785a8858ff1d822d880c99dee2`.
Its source digest is
`f5badaa72cc240d5bc09e104464fd46969c5e729f094d3322ec4cf40e8fb61a7`,
identity envelope is
`5780eb289aefecfe17a3d9ebd2c3ae4c40dd788c63c3d13172b38404b9747b65`,
evaluation receipt SHA is
`cb58148ed60dd8e3bd8f7d2cbc6fd32e0bea971a6882cb4373cd05ad9cee1840`,
aggregation SHA is
`2b1df783b954713e3439d3819e93bbbc1579a60e1a68cc9eeea704040c3e12e4`,
and finalization SHA is
`bafbfc72af13314521303cbc2a51830ea0524ad8a4554fab0685db750f802d22`.
Fixture evaluation is `PASS`/`CALIBRATED`; `release_eligible=false`.

This is a root-integrated review candidate, not acceptance. N06 remains
`IN_REVIEW`; N07/N08 and Gate A remain blocked. Fresh exact N06
architecture/functional, reducer/evaluator, and GF-101 receipts must bind both
immutable r55 and the current workspace binding before N06 can accept. No
provider/live/product execution, semantic judging, promotion, deployment, or
release evidence was created.

## Plan Revision 70 Attempt 41 N06 Import, Event, And Secret-Lifetime Repair

Immutable r51 and its failed architecture/GF-101 receipts remain preserved as
historical evidence. Implementation receipt
`WG001-N06-W004-R70-A41-20260806` repairs the three rejected N06 boundaries
without changing WG-001 revision 13: comment-trivia-safe static import closure,
outcome-specific exact event cardinality and boundary order, and removal of the
confirmation secret before every pre-task child process, including source-
revision Git and task children. The prior positive reducer receipt is retained
only as diagnostic regression evidence because the source changed.

The focused definition/reducer slice passes `37/37` with 286 assertions; the
targeted campaign slice passes `14/14` with 89 assertions; and the focused
confirmation-secret lifecycle slice passes `4/4` with 22 assertions. These
worker receipts propose N06 `IN_PROGRESS -> REVIEW` only. Root remains the
integration and lane-state owner; no review gate is self-accepted.

## Plan Revision 70 Attempt 41 And W-031 Revision 36 Root Integration

Root joins N06 revision 70, W-031 revision 36, and the current W-032 producer
parity, then regenerates the seven-campaign catalog at semantic digest
`620794a7dd39b3534b1ea40dc5636e28bc54df25ca7f95d974529246e9256eb5`.
The complete exact Bun 1.3.3 suite passes `418/418` with 4,574 assertions.
Repository, admission, evaluation, target, campaign, product-brief, and diff
validators pass. Admission v37/`cascade-core@38` passes `907/907`, persistence
`513/513`, and claims `715/715`, with zero over/under-control; combined
W-031/W-032 focused parity passes `179/179` with 2,888 assertions.

Immutable deterministic fixture
`wg001-n06-r70-w031-r36-review-20260806-r52` verifies 126 files at manifest
`a5a53dccdf80b448a8ddbaa091414c63d69f806d56221eac8e166523f948fe91`.
Its source graph digest is
`7c2480e07b3d3bc0efe3d21f6166b3f8dfb2f7fb8d6d0825949046f5ac47a8b6`
and its identity envelope is
`0cebd009be8652eb6877f1aef7aa6fc59f4ab59761fd0baf249a1a02bc053734`.
Verification is `FRESH`, fixture evaluation is `PASS`, and
`release_eligible=false`.

This is a root-integrated review candidate, not acceptance. N06 remains
`IN_REVIEW`; N07/N08 and Gate A remain blocked. Fresh independent N06
architecture/functional, reducer/evaluator, and GF-101 receipts must bind both
immutable r52 and the current workspace binding before N06 can accept. No
provider/live/product execution, semantic judging, promotion, deployment, or
release evidence was created.

## Plan Revision 68 Attempt 39 N06 Authority-Closure Repair

Implementation receipt `WG001-N06-W004-R68-A39-20260806` binds WG-001-N06,
W-004, plan revision 68, work-graph revision 13, and attempt 39. Prior rejected
review freezes remain unchanged rejection evidence; this receipt creates no
immutable replacement and grants no acceptance or release authority.

The complete campaign source graph now binds the filesystem-loaded Task
Envelope schema, core policy, control catalog and schema, case corpus, case and
assessment schemas, and static product brief authorities. Its transitive
scanner recognizes side-effect imports, static `from` imports, and literal
dynamic imports, and fails closed on every unresolved relative runtime import.
All exact fixed and authored dynamic members remain byte-digest-bound through
the reservation and frozen source manifest.

Operational resume and finalization freshness now authenticates each trusted
evaluation or terminal lifecycle clock receipt before lease or recovery
mutation. Exact receipt path/digest/content, reservation digest, ctime,
observation window, and lease id/generation are checked; the lease state must
be proven by the initial reservation, an exact heartbeat, or the validated
takeover chain. Fresh coherently resealed events with invented lease authority
are rejected.

Evaluator-unavailable `BLOCKED` finalization reconstructs authored profile,
rubric, calibration, execution, and shared mechanical authority. The summary
must match the derived execution/mechanical status, provider, profile, blocker,
and non-release outcome. Any named evaluation attempt must use the canonical
path and exact shape, bind the reconstructed request digest and identities,
match the authored model/reasoning profile and blocker, and fall between the
authenticated evaluation and terminal instants; unnamed attempt artifacts are
prohibited.

File-exists authority checks lexical and physical repository containment for
every ancestor and the final path without following symbolic links, including
both present and absent targets below a symbolic-link ancestor. Task event
verification now enforces contiguous full chronology from exactly one STARTED
event through action/process/HTTP, oracle, recovery, cleanup, optional bounded
phase events, and exactly one terminal COMPLETED event. Coherently resealed
reordering, extras, and omissions are rejected.

Confirmation key identifiers share one constrained grammar in policy and
receipt schemas plus runtime validation; `__proto__`, `constructor`, and
`prototype` are forbidden. Secret maps use null-prototype storage and own-key
lookup. Public verify accepts only exact, unique
`--confirmation-key KEY_ID=ENV_VAR` bindings and rejects unknown flags, stray
positionals, duplicates, malformed separators, invalid environment names, and
unsafe key IDs. Independent verification scans the complete immutable packet,
including finalization, for every supplied key before returning success and
does not persist or print key material.

Missing positive required-policy evidence takes precedence over task failure
in runtime, terminal reconstruction, and the shared reducer, so the aggregate
remains `BLOCKED`; a real failed task with complete positive policy evidence
remains non-compensating `FAIL`/`UNSUPPORTED`.

The receipt owns these thirteen files:

- `scripts/cascade/campaign-artifacts.ts`
- `scripts/cascade/campaign-artifacts.test.ts`
- `scripts/cascade/campaign-policies.ts`
- `scripts/cascade/campaign-policies.test.ts`
- `scripts/cascade/campaigns.ts`
- `scripts/cascade/campaigns.test.ts`
- `scripts/cascade/evaluation-authority.ts`
- `scripts/cascade/simulation-definitions.ts`
- `scripts/cascade/simulation-definitions.test.ts`
- `product-evals/policies/schema.json`
- `product-evals/policies/confirmation-receipt.schema.json`
- `product-evals/campaigns/catalog.generated.json`
- `docs/work/lanes/W-004-cross-surface-simulation-foundation.md`

Bun 1.3.3 passes the complete joined deterministic suite at `397/397` with
4,479 assertions across 14 files. The seven-campaign catalog check and
self-test pass at digest
`fbb72f5264729dc7d20c50f090820f32d1a5275f5f6b691c6c02034ecb9e3f50`;
self-test release scope remains `NOT_RUN`. Admission validates v35/core@36 and
passes `765/765` cases with zero over-control or under-control. Evaluation
catalog/self-test, target self-test, repository validation, and owned diff
validation pass.

No immutable freeze, independent review, live/provider/product execution,
semantic judging, Git stage/commit/push, self-acceptance, N07 opening,
promotion, deployment, or release proof was created. Root integration, a fresh
immutable deterministic freeze, and fresh exact-identity architecture,
functional, reducer/evaluator, and GF-101 review receipts remain required.

## Plan Revision 67 Attempt 38 N06 Terminal-Authority Repair

Implementation receipt `WG001-N06-W004-R67-A38-20260806` binds WG-001-N06,
W-004, plan revision 67, work-graph revision 13, and attempt 38. The rejected
revision-66 review freeze remains unchanged rejection evidence; this receipt
does not create an immutable replacement or acceptance authority.

Current `BLOCKED` evaluator-unavailable finalization no longer exits through a
reduced validation path. It authenticates the evaluation and terminal lifecycle
clock receipts, enforces exact clock-receipt coverage, reloads calibration and
specialized authority, reconstructs source, task, policy, budget, redaction,
dispatch, replay, oracle, final-state, cleanup, execution, and mechanical claim
authority, and then exact-validates the non-compensating BLOCKED summary and
lifecycle reason.

The reservation campaign digest now binds the complete ordered source graph,
not only the campaign manifest. Fixed runtime authority includes admission,
brief, pattern, session, evaluation, target, and validation transitive imports;
a static import-closure check fails if a relative TypeScript dependency is
omitted. Terminal source closure requires exact equality between all fixed and
authored dynamic definitions, rejecting both omissions and unreferenced extras.

Fake terminal replay accepts only the exact executed action prefix, rejects a
PASS prefix that stops early, forbids actions after a terminal FAIL/BLOCKED
event, and derives outcome, status, earliest failure, and final state from the
replay. File-exists runtime and absence revalidation share one bounded observer
that rejects symlinks and every extant non-regular path. Required policy
absence uses one shared `BLOCKED` projection and exact reason across runtime,
terminal reconstruction, and the shared mechanical reducer.

Finalized current-schema verification replays terminal confirmation authority.
The public verifier accepts explicit `--confirmation-key KEY_ID=ENV_VAR`
bindings, loads secrets only from the named environment variables, marks them
sensitive, and neither freezes nor prints them. Finalized confirmation evidence
rejects missing and wrong keys and verifies with the exact key; canonical
receipt expiry and one-shot usage remain enforced by the shared policy resolver.

Integrity verification is separate from operational freshness. Authenticated
clock receipt contents, reservation and lease bindings, path/digest equality,
creation-time evidence, and chronology remain integrity gates. Verification
returns `FRESH` through exactly 24 hours and `STALE` at 24 hours plus one
millisecond without invalidating an unchanged finalized manifest. Resume and
finalize fail closed on stale operational lifecycle authority before dispatch
or recovery mutation.

The receipt owns these nine files:

- `scripts/cascade/campaign-artifacts.ts`
- `scripts/cascade/campaign-artifacts.test.ts`
- `scripts/cascade/campaigns.ts`
- `scripts/cascade/campaigns.test.ts`
- `scripts/cascade/evaluation-authority.ts`
- `scripts/cascade/simulation-definitions.ts`
- `scripts/cascade/simulation-definitions.test.ts`
- `product-evals/campaigns/catalog.generated.json`
- `docs/work/lanes/W-004-cross-surface-simulation-foundation.md`

Bun 1.3.3 campaign catalog check and self-test pass seven campaigns at digest
`7d2de27ecb4bb53d0344835e99de80839526ae841a89d4eb7162bdef40aae511`;
self-test release scope is `NOT_RUN`. The complete deterministic Cascade suite
passes `389/389` with 4,361 assertions across 14 files. Repository validation
passes with nine agents, 44 skills, and zero project-specific leakage; owned
diff validation passes.

No immutable freeze, independent review, live/provider/product execution,
semantic judging, Git stage/commit/push, self-acceptance, N07 opening,
promotion, deployment, or release proof was created. Root integration,
projection regeneration, immutable deterministic freeze, and fresh independent
architecture/functional, reducer/evaluator, and GF-101 reviews remain required.

## Plan Revision 66 Attempt 37 N06 Runtime-Truth Repair

Implementation receipt `WG001-N06-W004-R66-A37-20260806` binds WG-001-N06,
W-004, plan revision 66, work-graph revision 13, and attempt 37. Rejected
immutable review fixture `wg001-n06-r65-w031-r31-review-20260806-r46` remains
unchanged at its 100-file manifest
`9ed9d9355d167c765d93c7f3a9ba4b17d1858fb0e30738349717e73aa32ce911`;
it is rejection evidence, not acceptance authority.

The runtime now freezes the exact HMAC-authenticated confirmation receipt that
crosses dispatch and terminally reloads it with exact run, campaign, task,
action index/digest, policy id/version/digest, expiry, confirmer, key, signature,
and one-shot usage semantics. Policy budget, redaction capability, decision
reason, and dispatch are recomputed by the same runtime resolver; only exact
`ALLOW` crosses dispatch. Direct-process and HTTP output consumption is
persisted and bounded against the selected policy maxima.

Fake tasks are replayed from the frozen authored fixture with the shared action
authority, and before/after events plus final state must equal that replay.
File-exists oracles ignore submitted booleans: runtime observes the path,
freezes present evidence, persists an exact observation sidecar, and terminal
verification reloads that frozen artifact or re-observes asserted absence.
Required policies without positive decision evidence produce the same
`BLOCKED` reason in runtime and terminal projection.

Authenticated `EVALUATING` and terminal lifecycle events now carry exclusive
clock receipts bound to reservation digest, current lease id/generation/window,
receipt digest path, and filesystem creation time. Resume reuses the original
receipt. A coherently rewritten backdated event and matching receipt fails the
creation-time check; exact expiry and expiry plus one millisecond confirmation
semantics remain distinct. Persisted whole-second receipts and millisecond
lifecycle events compare at the coarser recorded precision only for chronology,
without weakening policy expiry checks.

The receipt owns exactly ten files:

- `scripts/cascade/campaign-artifacts.ts`
- `scripts/cascade/campaign-artifacts.test.ts`
- `scripts/cascade/campaign-policies.ts`
- `scripts/cascade/campaign-policies.test.ts`
- `scripts/cascade/campaigns.ts`
- `scripts/cascade/campaigns.test.ts`
- `scripts/cascade/evaluation-authority.ts`
- `product-evals/campaigns/catalog.generated.json`
- `docs/work/lanes/W-004-cross-surface-simulation-foundation.md`
- `docs/work/reports/2026-07-27-cross-surface-simulation-work-graph.md`

The eight non-history payload files have canonical path-plus-SHA-256 digest
`45e51b1184a515b80de313fe7d46e2e5ce8d83abb9d5077868901d700bd5917f`.
The generated seven-campaign catalog checks and self-tests at semantic digest
`cba94fe424ec525b7876da57479cf89f41fc883ecaa09707793f7fa281894c69`.
The owned focus passes `121/121` with 1,027 assertions across campaign runtime,
policy, terminal artifact, and shared reducer tests; the strict terminal slice
passes `1/1` with 30 assertions. Owned diff validation passes.

Repository validation stops only at the concurrently stale protected PB-002
generated brief, which this worker does not own or regenerate. No new immutable
fixture, independent review, provider/live/product execution, semantic judge,
stage, commit, push, promotion, deployment, release proof, self-acceptance, or
N07 opening occurred. Those states remain `NOT_RUN` or blocked; N06 remains
`IN_REVIEW` pending root integration, a fresh immutable freeze, and fresh
exact-identity architecture/functional, reducer/evaluator, and GF-101 receipts.

## Plan Revision 69 Attempt 40 N06 Fixed-Point Repair

Implementation receipt `WG001-N06-W004-R69-A40-20260806` binds WG-001-N06,
W-004 plan revision 69, work-graph revision 13, and attempt 40. The repair
enforces aggregate `BLOCKED` precedence for missing required policy evidence;
driver/outcome-derived event grammar; identity-stable no-follow file truth;
complete supported literal TypeScript/CommonJS import closure; authenticated
lifecycle and heartbeat freshness; exact BLOCKED attempt file/output
reconstruction; and one 32–512-byte visible-ASCII confirmation-secret grammar
shared by load, sign, verify, and exact packet scanning.

Root regenerated the seven-campaign catalog at semantic digest
`118118e91e574e759d4ae9aef5574e6238bef9e87d5ece577463b412ecf7df74`.
The exact Bun 1.3.3 joined suite passes `405/405` with 4,531 assertions across
14 files. Repository, admission v36/core@37, 785-case corpus, evaluation,
target, campaign, product-brief, and diff gates pass. Immutable deterministic
fixture `wg001-n06-r69-w031-r35-review-20260806-r51` verifies 125 files at
manifest `b45a458a328060b10b7bb66ddd8481aef8096d08353b512450e0c2f339a28126`;
source graph digest is
`0e19828aa12bbf143311f00f867abf6a2155c527f847764b9716657323e52257`,
freshness is `FRESH`, fixture evaluation is `PASS`, and
`release_eligible=false`.

This is review-ready deterministic evidence only. N06 remains `IN_REVIEW`;
fresh exact-identity architecture/functional, reducer/evaluator, and GF-101
receipts are required before N07 opens. Provider/live/product execution,
semantic judging, promotion, deployment, and release evidence remain
`NOT_RUN`.

### Revision 66 Root Integration And Review Freeze

Root joined N06 revision 66 with W-031 revision 32 and the W-032 revision-22
consumer, regenerated PB-002, and verified both tracked product briefs. The
protected campaign catalog is
`cba94fe424ec525b7876da57479cf89f41fc883ecaa09707793f7fa281894c69`.
Admission identity is v33/core@34 with `661/661` exact cases, persistence
`391/391`, claims `533/533`, and zero over/under-control. Repository,
admission, evaluation, target, campaign, brief, JSON, and diff gates pass.

The joined Bun 1.3.3 suite passes `384/384` with 4,271 assertions across 14
files. Immutable deterministic fixture
`wg001-n06-r66-w031-r32-review-20260806-r47` verifies 102 files at manifest
`d137961959b29a4436d9952bc58116bf465db452b35c992d7aa2d5421b50fe56`.
Fixture evaluation is `PASS`; `release_eligible=false` and release scope is
`NOT_RUN`. N06 remains `IN_REVIEW`; no self-acceptance or N07 opening occurred.
Fresh exact-identity architecture/functional, reducer/evaluator, and GF-101
receipts are required. Provider, product, live, semantic-judge, promotion,
deployment, and release evidence remain `NOT_RUN`.
