# Work Lane: W-004 Cross-Surface Simulation Foundation

Status: `IN_PROGRESS`
Owner: `agent-engineer`
Created: 2026-07-27
Lane Model: `orchestrator-workers`
Planning Status: `VALIDATED`; independent review pending
Plan Revision: `28`
Next Gate: independent current-source GF-004/GF-101 attempt-5 review
Execution Surface: `root`
Dispatch State: `COMPLETE`
Dispatch Authorization: explicit user instruction to implement the reconciled fixes and gaps, 2026-08-04
Runtime Handle: current root task
Implementation Base: `master@7112546cc856d1bc7f4b4409ef80170c71b9c236` plus preserved current-source work

## Request

Establish the canonical shared campaign task, adapter, execution lifecycle,
claim, policy, result, evidence, identity, runtime handoff, permission, and
cleanup contracts needed by command, HTTP, terminal, browser, desktop, mobile,
and agent-response tasks.

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
| `SF-001` | Given an unknown kind/driver pair, validation fails before execution. | schema/loader test | `OPEN` |
| `SF-002` | Given missing required inputs, preflight returns `BLOCKED` and emits no execution events. | lifecycle self-test | `OPEN` |
| `SF-003` | Given a successful driver but failed oracle, the required task and campaign fail. | reduction self-test | `OPEN` |
| `SF-004` | Given cleanup failure after a successful oracle, the task fails with cleanup as the earliest unresolved gate. | cleanup self-test | `OPEN` |
| `SF-005` | Given a retry, the original artifact tree remains unchanged and the retry uses a new run ID. | digest comparison | `OPEN` |
| `SF-006` | Given a required claim with an unknown policy or oracle, validation returns `INVALID` before provisioning. | reference-resolution self-test | `OPEN` |
| `SF-007` | Given an evidence producer writes to a shared path, the artifact writer freezes the evidence body inside each run before reduction. | overwrite/retry artifact test | `OPEN` |
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
bun test scripts/cascade
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
| Schema and lifecycle | 52 focused artifact/policy/lifecycle/definition/common/starter tests and 62 aggregate tests | `PASS` for implemented N03/N04/N05 behavior; broader Gate A work remains open |
| Campaign catalog/selection | seven-entry generated catalog and self-test; digest `9fee3f183d458f56ff7f5d59eee7fbea9d45531b2a9cb2533d1a18bde8fce6ba` | `PASS`; generated exact policy/campaign binding passes, broader selection matrix open |
| Claim/policy reduction | scoped default deny, ambiguity block, exact confirmation receipts, budgets, redaction controls, required artifacts/oracles/metrics, and fixture calibration release refusal | `PASS` for N05; claim/evaluator and composed-policy work remains open |
| Failure reduction | unsupported adapter, cancellation/timeouts, non-cooperative bounds, policy ambiguity/confirmation/budget/redaction, unsafe evidence, tamper, oracle, and cleanup probes | `PARTIAL`; N03/N04/N05 paths pass, WG-001-N08 joined failure matrix remains open |
| Artifact immutability | exclusive reservation/stage writes, safe content-addressed freeze, atomic finalization, terminal lock, and digest verification | `PASS` for N04; joined receipt-chain acceptance remains open |
| Concurrency and recovery | reservation race, retry overwrite refusal, explicit recovery identity/finalization, sticky cancellation, bounded recovery/cleanup, cleanup, and unknown outcome | `PASS` for N03/N04; WG-001-N08 joined crash fixtures remain open |
| Receipt chain | actor/operator/evaluator/aggregator identity separation, append-only stage namespaces, frozen evaluator input, and trace/receipt digest verification | `PARTIAL`; general evaluation chain passes, specialized chain remains open |
| Runtime handoff | accepted, rejected, pending, not-applicable, stale-digest, and retry-lineage receipt tests | `OPEN` |
| Generic composition contract | independent task results, denied surface policy, failed oracle, partial evidence, cleanup, receipt, and composed-claim reduction | `OPEN` |
| W-012 agent-tool composition | deterministic six-contour matrix receipt | `OPEN` |
| W-012 live agent-tool canaries | five exact WG-001-N17 capability dispositions | `NOT_RUN` |
| Existing harness | current 44-skill, 368-scenario catalog check and 20-case harness self-test | `PASS` |
| Repository source | `npx --yes bun@1.3.3 scripts/cascade.ts validate` | `PASS` |
| Target-project bootstrap | `npx --yes bun@1.3.3 scripts/cascade.ts target self-test` | `PASS`; 26 cases |
| Repository mechanics | JSON parsing and `git diff --check` | `PASS` |
| Repository aggregate | `pnpm dlx bun@1.3.3 test scripts/cascade` | `PASS`; 61 tests |
| Deterministic functional run | `simulation-contract-smoke`, run `wg001-frontier-repair-20260731-r1` plus `campaign verify` | `PASS`; fixture evaluation `PASS`, platform `darwin-local`, 72-file manifest valid, release eligibility remains false |
| Independent review | N03 Standards/Spec/GF-004 receipts pass; N04/N05 GF-004/GF-101 receipts required | `NOT_RUN` for N04/N05 |

## Status Reconciliation

- Last checked: `2026-08-03`
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
