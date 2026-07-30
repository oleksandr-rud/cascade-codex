# Work Lane: W-004 Cross-Surface Simulation Foundation

Status: `OPEN`
Owner: `agent-engineer`
Created: 2026-07-27
Lane Model: `orchestrator-workers`
Planning Status: `DEFINITION_READY`; implementation readiness blocked on Bun 1.3.3
Next Gate: restore Bun 1.3.3, authorize, then `implement-change` at `IG-03`
Execution Surface: `root`
Dispatch State: `NOT_AUTHORIZED`
Dispatch Authorization: `none`; prior 2026-07-30 authorization consumed
Runtime Handle: `none`
Implementation Baseline: clean `master@60fdc2464b9782a689d3f53ffa8fc177f486e6a8`

## Request

Establish the canonical shared campaign task, adapter, execution lifecycle,
claim, policy, result, evidence, identity, runtime handoff, permission, and
cleanup contracts needed by command, terminal, browser, desktop, mobile, and
agent-response tasks.

## Acceptance Criteria

- Current `master`, its dirty work, and the campaign implementation on
  `agent/w003-integration-r4-g3` are compared before source changes.
- One canonical runner replaces duplicate or stale campaign paths directly.
- Task kind and driver are separate typed fields.
- All six task kinds share one bounded lifecycle and result envelope.
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
| Campaign candidate | `agent/w003-integration-r4-g3`: `scripts/cascade/campaigns.ts`; `evals/tasks/`; `evals/campaigns/` | existing task/campaign implementation | branch snapshot; must reconcile |
| Evaluation authority | `scripts/cascade/evals.ts`; `evals/harness/` | current trace, grading, catalog, and self-test behavior | current checkout |
| Architecture | `docs/patterns/boundaries/index.md`; architecture defaults | adapter and platform boundaries | current dirty work |
| Provider reference | OpenAI Computer Use guide | screenshot/action loop and isolation | fetched 2026-07-27 |

## Campaign Deliverables

| Campaign ID | Tier | Required Evidence Boundary | Status |
|---|---|---|---|
| `simulation-contract-smoke` | PR deterministic | Fake adapters for every declared contour; lifecycle, identity, claim/policy/oracle resolution, artifact, cleanup, and conservative result reduction | `OPEN` |
| `cross-contour-handoff-smoke` | PR deterministic | Typed task results and accepted, rejected, pending, stale, retry, and not-applicable handoff receipts without external runtimes | `OPEN` |

W-004 also generates and validates
`evals/campaigns/catalog.generated.json`. It does not own the surface campaign
behavior: W-005 through W-010 own their named manifests and adapter fixtures
after Gate A, while W-004 remains merge owner for catalog, schema, selection,
artifact, joined reduction, and release-projection contracts. W-012 owns
agent-to-tool composition profiles, manifests, and fixtures after IG-15 while
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

W-004 remains `OPEN`: all-six-contour fake coverage, reservation-race,
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
| Harness evaluation | W-001 | eval runner, scenarios, coverage | yes | historical 290-case run evidence, current 319-case catalog, and conservative grading | catalog/self-test/coverage probes | `NOT_RUN` | `harness-evaluation` |
| Target onboarding | W-002/W-003 | config, validator, architecture defaults | no | dirty source and completed architecture work | full Cascade validator | `NOT_RUN` | `validate-change` |
| Claim/policy/oracle/rubric authority | simulation audit | `evals/claims/`; `evals/policies/`; `evals/oracles/`; `evals/rubrics/`; resolvers and ledgers | yes | hard gates remain non-compensating | schema, reference, decision, oracle, rubric, and reduction tests | `NOT_RUN` | `implement-change` |
| Artifact evidence | program plan | `.artifacts/campaigns/` self-contained run contract | yes | immutable failed runs, frozen evidence bodies, and digest linkage | overwrite/retry artifact fixture tests | `NOT_RUN` | `functional-qa` |
| Runtime handoff | simulation audit | task result and handoff receipt schema | yes | `next_route` remains a proposal until receipt | accepted/rejected/pending receipt tests | `NOT_RUN` | `validate-change` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| shared task/campaign schemas | W-004 | write | no surface lane edits |
| campaign catalog generator and selection/release projection | W-004 | write | surface lanes contribute manifests only |
| `evals/claims/`, `evals/policies/`, `evals/oracles/`, `evals/rubrics/`, simulation manifest schema | W-004 | write | one canonical authority |
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

1. Execute `IG-01`: inventory the current and candidate runner, schemas,
   fixtures, docs, config, validator, artifact consumers, generated catalogs,
   W-011 overlap, and current dirty-work owners.
2. Select and record the canonical integration base; preserve dirty work and
   reject broad branch integration that overwrites current authorities.
3. Define common task, driver, claim, policy, permission, budget, oracle,
   rubric, cleanup, result, identity, evidence, runtime-handoff, execution,
   specialized-evaluation, general-evaluation, and aggregation-receipt schemas
   with explicit valid combinations and actor/operator/evaluator/aggregator
   identity separation.
4. Define `evals/claims/`, `evals/policies/`, `evals/oracles/`,
   `evals/rubrics/`, and `evals/simulations/<simulation-id>/` as canonical
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
    evidence only after IG-15 publishes the accepted agent and five surface
    seams; retain every task result and surface policy independently.
11. Run cross-kind campaign, composition matrix, claim/policy coverage, artifact immutability,
    handoff, validator, and regression checks; publish Gate B.
12. After Gate B, aggregate W-012's separately authorized live agent-command,
    agent-browser, agent-terminal, agent-desktop, and agent-mobile canary
    dispositions without inferring one from another.

## Next Implementation Slice

The next candidate is `IG-03` under W-004. This packet prepares the slice but
does not dispatch it.

| Binding | Current value |
|---|---|
| Plan / node | `IG-001` plan revision 9 / `IG-03` |
| State / attempt | `PENDING`; attempt 1 of 2 |
| Objective | finish the bounded lifecycle and adapter seam, including typed result events, cleanup, cancellation/recovery, and unknown-outcome behavior |
| Required inputs | accepted `IG-02` definitions; clean implementation baseline `master@60fdc246`; current seven-entry campaign catalog; current 44-skill/368-scenario harness catalog |
| Allowed writes | `scripts/cascade/campaigns.ts`, `scripts/cascade/campaigns.test.ts`, `scripts/cascade/simulation-definitions.ts`, `scripts/cascade/simulation-definitions.test.ts`, `scripts/cascade/common.ts`, `scripts/cascade/common.test.ts`, `evals/tasks/schema.json`, `evals/campaigns/schema.json`, and W-004 evidence/status records |
| Protected paths | W-005 through W-010 and W-012 lane-owned manifests/adapters; architecture-default sources; archived receipts; live/provider/platform artifacts |
| Required tool / permission | Bun 1.3.3 available on `PATH`; local implementation and deterministic tests only; no live provider, Computer Use, platform, publication, or spending permission |
| Output | version-bound IG-03 implementation receipt and proposed `PENDING -> IN_PROGRESS -> REVIEW`; no self-acceptance |
| Acceptance owner | W-004 lane-state owner through `architecture-review -> functional-qa -> review-change -> validate-change` |
| Repair / exhaustion | implementation defect returns to IG-03 attempt 2; a second failed attempt or changed contract returns to `plan-change`; missing Bun remains `BLOCKED` without consuming an attempt |

Fragment evaluation for this slice selects `GF-004` version 1 as the shared
contract boundary. Product, design, frontend, migration, integration, E2E, and
assurance fragments are `NOT_APPLICABLE` to IG-03 because this slice changes
only the internal campaign lifecycle seam; IG-05, IG-08, surface lanes, and
their later validation gates retain the policy, integration, and public-run
evidence obligations.

Required validation after implementation:

```bash
bun test scripts/cascade/campaigns.test.ts scripts/cascade/simulation-definitions.test.ts
bun test scripts/cascade
bun scripts/cascade.ts campaign catalog --check
bun scripts/cascade.ts campaign self-test
bun scripts/cascade.ts validate
bun scripts/cascade.ts eval catalog --check
bun scripts/cascade.ts eval self-test
git diff --check
```

Stop before edits if Bun 1.3.3, the clean implementation baseline, or the
current catalog identities cannot be reproduced. Stop after IG-03 reaches
`REVIEW`; Gate A and downstream surface work remain closed.

## Parallel Dependencies

- Can run with: no surface implementation before Gate A; after Gate A, W-005,
  W-006, and W-007 may run in parallel; W-012 waits for IG-15.
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
- Work graph: `IG-001`; update its frontier only from current lane
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
| Schema and lifecycle | preserved 22-test receipt and seven resolved campaign graphs | `PARTIAL`; prior evidence is pre-current-HEAD and current Bun replay is `NOT_RUN` |
| Campaign catalog/selection | current seven-entry generated catalog plus catalog/self-test preflight | `NOT_RUN` for current `HEAD`; broader selection matrix open |
| Claim/policy reduction | default deny, required artifacts/oracles/metrics, fixture calibration release refusal | `PARTIAL`; confirmation/conflict fixtures open |
| Failure reduction | blocked, oracle, unsafe-action, cleanup probes | `OPEN` |
| Artifact immutability | two distinct run roots; frozen runner/schema/definition bodies and digest-bound receipts | `PARTIAL`; retry/overwrite races open |
| Concurrency and recovery | atomic reservation, cancellation, crash cleanup, finalization, and unknown-outcome fixtures | `OPEN` |
| Receipt chain | actor/operator/evaluator/aggregator identity separation, append-only stage namespaces, frozen evaluator input, and trace/receipt digest verification | `PARTIAL`; general evaluation chain passes, specialized chain remains open |
| Runtime handoff | accepted, rejected, pending, not-applicable, stale-digest, and retry-lineage receipt tests | `OPEN` |
| Generic composition contract | independent task results, denied surface policy, failed oracle, partial evidence, cleanup, receipt, and composed-claim reduction | `OPEN` |
| W-012 agent-tool composition | deterministic five-contour matrix receipt | `OPEN` |
| W-012 live agent-tool canaries | five exact IG-17 capability dispositions | `NOT_RUN` |
| Existing harness | current 44-skill, 368-scenario catalog check and harness self-test | `NOT_RUN`; prior 41-skill/319-scenario receipt is historical |
| Repository source | `bun scripts/cascade.ts validate` | `NOT_RUN`; Bun 1.3.3 unavailable on active `PATH` |
| Repository mechanics | JSON parsing and `git diff --check` | `PASS` for the revision-9 planning diff |
| Repository aggregate | canonical Bun Cascade validator | `NOT_RUN`; Bun 1.3.3 unavailable on active `PATH` |

## Status Reconciliation

- Last checked: `2026-07-30`
- Source identity: clean implementation baseline
  `master@60fdc2464b9782a689d3f53ffa8fc177f486e6a8`; revision-9 planning diff
  applied on top
- Completion disposition: `KEEP_OPEN`
- Reason: deterministic framework roots and the independent Codex evaluation
  chain are preserved as pre-current-HEAD evidence. Current-HEAD validation and
  remaining W-004 cross-surface, specialized-evaluation, recovery, handoff,
  redaction, and composition criteria remain `OPEN`/`NOT_RUN`.
- Synchronized surfaces: lane, active registry, report index, and IG-001 plan
  revision 9.

## Closeout

- Merge evidence: pending.
- Report: update `docs/work/reports/2026-07-27-cross-surface-simulation-program.md`.
- Remaining risk: pending adapter, composition, and platform evidence from
  W-005 through W-010 and W-012.
