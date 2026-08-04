# Simulation Correctness Fix Plan

Date: 2026-07-30
Status: `IMPLEMENTED_FRAMEWORK`; current WG-001-N03 deterministic replay `PASS`;
target-project calibration and live execution `NOT_RUN`
Owner: Agent Engineer through W-004
Scope: Amend the active cross-surface simulation program before Gate A freezes
an incomplete contract.

## Objective

Make Cascade simulations trustworthy for candidate screening, regression
detection, and scoped release evidence by adding the data-quality and
calibration contracts that the current program does not yet define.

The desired outcome is not a generic simulation `PASS`. The implementation
must preserve separate proof for:

- authored and mechanically valid definitions;
- bounded execution through an identified driver;
- deterministic public-boundary behavior;
- independently judged semantic quality;
- population and scenario coverage;
- sim-to-reference calibration;
- target-project canary or production validation;
- release eligibility for the exact claim and source identity.

## Authority And Current State

Current implementation base is clean
`master@21ba5288b27700f94ecad92ec0cf3d1e5dca5f29`, with WG-001-N03 implementation
diff `a964ee6a736727b13a7e25fef18fc87f13a8128b119f8863a42de2c620e71491`
and revision-12 planning records applied on top. The active simulation program is
W-004 through W-010 plus W-012 under `WG-001`.

Current evidence:

- campaign, execution, and evaluation skill contracts exist;
- simulation operator/evaluator role contracts exist;
- active lane and work-graph plans exist;
- the current working tree has canonical campaign, simulation, population,
  scenario, world, dataset, metric, treatment, calibration, task, claim,
  policy, oracle, and rubric roots plus a Bun runner and generated registry;
- six deterministic framework campaigns resolve under one direct-cutover
  authority, and the target initializer can render a complete starter package
  without external services;
- target-specific adapters, sim-to-reference calibration, platform canaries,
  production confirmation, and release claims remain `NOT_RUN`.

The historical candidate runner was treated as an inventory input for WG-001-N01;
its useful process utilities were adapted without retaining a second runtime
authority.

## Source Basis

This plan incorporates the following external evidence without treating it as
a universal product claim:

- Shreya Rajpal and Aman Gupta,
  [SimulationMaxxing: How Nubank ships agents 20x faster with simulations](https://www.youtube.com/watch?v=KMR_RBoCa4M).
  The talk presents simulation as on-demand multi-turn evaluation-data
  generation, candidate pruning, failure reproduction, and regression testing.
- Aman Gupta et al.,
  [Building Customer Support AI Agents at 100M-User Scale: An Evaluation-Driven Framework](https://arxiv.org/abs/2606.08867).
  The paper connects structured context, human-in-the-loop iteration,
  calibrated LLM judging, offline simulation, and production A/B measurement.

The reusable design claim is narrower than the presentation headline:
a calibrated simulation may rank treatments and reject regressions early. It
does not replace the final target-project validation gate.

## Gap Assessment

| Priority | Gap | Current evidence | Failure if left open | Owning boundary |
|---|---|---|---|---|
| P0 | No typed actor population or scenario-distribution contract | Campaigns select tasks and fixtures only | Large sets of nearly identical cases can be reported as coverage | W-004 definitions |
| P0 | No explicit stateful world-model or mock-parity contract | Fixtures and adapters are planned, but cross-call state consistency is not | A trajectory can look plausible while tool or application state is impossible | W-004 shared contract; surface adapters own behavior |
| P0 | No dataset partition or leakage boundary | No development, regression, holdout, or calibration-reference identities exist | The agent can be optimized directly against the evidence later reported as validation | W-004 definitions and artifact identity |
| P0 | Metrics are not first-class versioned sources | Claims, oracles, and rubrics are planned, but metric aggregation, direction, slices, and uncertainty are not | Judges and business outcomes can be collapsed into an untraceable score | W-004 metric registry |
| P0 | No judge-to-human calibration contract | Independent evaluation exists, but calibration is a named state without a schema or receipt | Semantic scores may be precise-looking but unaligned with domain judgment | W-004 calibration contract; simulation-evaluator consumes it |
| P0 | No sim-to-reference calibration receipt | No correlation, treatment-ranking, slice, staleness, or reference-window contract exists | Simulation execution can be mistaken for evidence that predicts real behavior | W-004 calibration reducer and receipt |
| P0 | Release eligibility does not mechanically require current calibration when the claim needs it | Lower gates are separate, but calibration is not yet reducible | A structurally sound or semantically graded run can be projected as release support | W-004 claim reducer and aggregation |
| P0 | Candidate implementation is too shallow | Candidate schema has three kinds, one command shape, and direct status reduction | Direct promotion would create a second authority and bypass the active plan | WG-001-N01 direct cutover |
| P1 | No treatment/candidate comparison identity | Campaigns run named tasks, but candidate prompt/model/tool/harness revisions are not compared as a set | Rankings cannot be reproduced or linked to exact variants | W-004 comparison contract |
| P1 | No required slice-level reporting | Coverage is platform-oriented, not population/risk-slice oriented | Aggregate improvement can hide a critical user or failure regression | Metric and claim ledgers |
| P1 | No calibration drift or invalidation rules | Source changes invalidate runs, but reference-data age and distribution drift do not | Old calibration can silently authorize a changed population or agent | Calibration ledger |
| P1 | Simulator/generator identity is not explicit | Target, operator, evaluator, and aggregator are identified | Generator/evaluator coupling and simulator changes can be hidden | Shared identity envelope |
| P1 | Real/reference data provenance and minimization are not defined | Evidence redaction exists | Reference traces may be unbounded, stale, or unsafe to retain | Dataset/reference manifest |
| P2 | No target-project calibration template or onboarding check | Cascade is a scaffold and has no production data | Target adopters may run campaigns without defining how simulation validity will be established | Templates, structure docs, validator |

## Architecture Decision

### Keep the existing three-stage responsibility split

- `simulation-campaigns` owns definitions, selection, treatment comparison,
  calibration aggregation, replay planning, and claim projection.
- `simulation-execution` and `simulation-operator` own bounded mutable
  execution, raw trajectory evidence, state observation, cleanup, and the
  execution receipt.
- `simulation-evaluation` and `simulation-evaluator` own independent
  run-specific policy, oracle, rubric, and claim judgment.

Calibration is a fourth evidence product, not a fourth mutable actor:
the campaign layer mechanically compares accepted evaluation receipts with a
frozen reference set and stores a new append-only calibration receipt.

### Separate the simulator from the surface adapter

The simulator selects an actor profile, scenario, goal, and next interaction.
The adapter operates the declared public boundary. The world model owns
fixture state and state transitions. Deterministic oracles and semantic judges
evaluate the resulting trajectory.

```text
population + scenario + world state
                 |
                 v
        simulation actor/driver
                 |
                 v
        target agent or product
                 |
                 v
    typed surface adapter and tools
                 |
                 v
 trajectory + state-before/state-after
                 |
       +---------+----------+
       |                    |
 deterministic oracles   semantic judge
       |                    |
       +---------+----------+
                 |
        evaluation receipt
                 |
        calibration reducer
                 |
        calibration receipt
```

Computer Use remains one possible driver. It is not the simulator definition,
world-state authority, metric, judge, or expected-result oracle.

### Canonical source authorities

Extend the planned W-004 layout:

```text
product-evals/simulations/<harness|product>/<simulation-id>/
  manifest.json
  populations/
  scenarios/
  worlds/
  datasets/
product-evals/metrics/
product-evals/calibrations/
```

Responsibilities:

- a population profile defines actor classes, weights, inclusion/exclusion,
  risk slices, and source/provenance;
- a scenario defines the goal, initial conditions, stop conditions, expected
  state properties, and claims it may exercise;
- a world definition identifies state schema, fixture, tool/application
  contracts, mutations, negative behavior, and reset;
- a dataset manifest assigns cases to `development`, `regression`, `holdout`,
  or `calibration-reference` partitions and records leakage restrictions;
- a metric definition records direction, unit, aggregation, required slices,
  deterministic or semantic source, uncertainty method, and hard-gate status;
- a calibration definition binds simulated and reference datasets, treatment
  identities, metric mappings, acceptance thresholds, human-review rules,
  reference window, staleness limit, and invalidation inputs.

These paths now exist in the working tree and are validator-enforced. Their
deterministic framework fixtures prove mechanics only; target realism and live
calibration remain separate gates.

### Add an append-only calibration namespace

Extend the planned run container with:

```text
.artifacts/campaigns/<run-id>/
  execution/
  specialized-evaluations/
  evaluations/
  calibrations/<calibration-id>.json
  aggregations/
```

A calibration receipt binds:

- calibration ID and definition digest;
- simulated run/evaluation receipt digests;
- frozen reference dataset and label digests;
- exact treatment and baseline identities;
- metric and slice definitions;
- sample counts and exclusions;
- agreement, rank-correlation, linear-correlation, and uncertainty results as
  applicable;
- domain-review identity and result;
- calibration status, freshness window, invalidation inputs, and residual
  unsupported scope.

Use a separate calibration vocabulary:
`CALIBRATED`, `PARTIALLY_CALIBRATED`, `UNCALIBRATED`, `STALE`, `BLOCKED`,
`NOT_RUN`, or `INVALID`. Claim-ledger and campaign execution vocabularies
remain unchanged.

## Remediation Sequence

### Wave 0 — Reconcile before changing contracts

Owner: W-004 / WG-001-N01

1. Inventory current dirty sources and owners.
2. Compare the candidate runner, schemas, fixtures, and historical artifacts
   with current W-004 acceptance criteria.
3. Select one canonical Bun runner base.
4. Record direct migrations and deletions; do not retain a legacy fallback.
5. Freeze the allowed-write map before shared source changes.

Exit gate:
one fixed baseline and a documented reason for every adopted, adapted,
replaced, or rejected candidate component.

### Wave 1 — Amend Gate A before implementation

Owner: W-004 shared definitions

1. Add population, scenario, world, dataset, metric, treatment, and
   calibration schemas.
2. Add simulator/generator and domain-review identities to the shared identity
   envelope.
3. Add reference resolution and generated-catalog fields.
4. Add partition leakage and source-provenance validation.
5. Add calibration status, staleness, invalidation, and claim-reduction rules.
6. Update campaign design, execution, evaluation, and quality checklists.
7. Update W-004 behavior examples and Gate A inputs before publishing Gate A.

Exit gate:
unknown references, ambiguous partitions, missing state contracts, unversioned
metrics, missing calibration requirements, and stale calibration inputs fail
before provisioning or release projection.

### Wave 2 — Implement the shared foundation

Owner: W-004 / WG-001-N02 through WG-001-N08

1. Implement canonical loaders, registries, generated catalog, and resolvers.
2. Implement lifecycle, atomic identity, evidence freezing, receipt
   namespaces, policy resolution, deterministic reduction, recovery, and
   cleanup as already planned.
3. Implement metric aggregation and treatment comparison as pure,
   deterministic reducers.
4. Implement calibration receipt storage after receipt and digest checks.
5. Keep calibration comparison read-only over frozen inputs.

Exit gate:
expanded `simulation-contract-smoke` and new deterministic data-quality
fixtures pass against one shared contract digest.

### Wave 3 — Deepen the target and world seams

Owners: W-005 through W-010 and W-012; W-004 remains merge owner

Each surface adapter must:

- expose state-before and state-after evidence where the surface can mutate;
- implement realistic negative behavior, not success-only stubs;
- preserve explicit authorization, isolation, and cleanup;
- publish deterministic public-boundary observations;
- avoid surface-local population, metric, calibration, or artifact writers.

W-007 additionally owns the provider-neutral agent trajectory and simulated
actor invocation seam. W-012 proves state and identity continuity when an
agent uses command, browser, terminal, desktop, or mobile tools.

Exit gate:
the same scenario/world identity remains consistent across turns and tool
calls, and each surface failure remains attributable.

### Wave 4 — Add deterministic correctness campaigns

Owner: W-004 with W-007/W-012 fixtures

Add or extend:

- `simulation-contract-smoke`;
- `simulation-population-smoke`;
- `simulation-world-state-smoke`;
- `simulation-partition-leakage-smoke`;
- `simulation-metric-reduction-smoke`;
- `simulation-calibration-ranking-smoke`;
- `agent-tool-composition-smoke`.

These campaigns use fake or controlled fixtures. They prove contract and
reducer correctness only. They do not produce a real calibration claim.

Exit gate:
Gate A and Gate B can distinguish deterministic framework proof from
target-project calibration and live/platform evidence.

### Wave 5 — Target-project calibration

Owner: target project; coordinated through `simulation-campaigns`

1. Freeze a recent, minimized, domain-labelled reference dataset.
2. Select multiple exact treatment identities, including the current
   baseline.
3. Run the same metric definitions on simulated and reference trajectories.
4. Compare treatment ordering, score relationship, human agreement, and
   required slices.
5. Record uncertainty, exclusions, unsupported scope, and reference freshness.
6. Investigate systematic disagreements.
7. Emit a calibration receipt only when predeclared thresholds pass.

Cascade has no production dataset or product agent, so this wave is
`NOT_RUN` in this repository. A target project may substitute expert-labelled
greenfield reference data for initial usability analysis, but it cannot claim
production calibration until controlled online evidence exists.

### Wave 6 — Release projection and drift loop

Owner: W-004 aggregation; target-project release owner

1. Require a current calibration receipt for every release claim that depends
   on simulated semantic or business-outcome prediction.
2. Allow deterministic safety, schema, or exact behavior claims to remain
   separately supportable when calibration is not relevant.
3. Advance only selected candidates to a controlled canary or A/B test.
4. Feed newly observed failures into the regression partition.
5. Invalidate calibration when its agent, simulator, metric, judge, world,
   population, reference-window, or material distribution identity changes.
6. Never reuse one domain/platform calibration to satisfy another.

Exit gate:
release eligibility is exact, current, claim-scoped, and still requires the
target-project production gate.

## Behavior Examples

| ID | Given / When / Then | Required evidence |
|---|---|---|
| `SCF-001` | Given a simulation references an unknown population or scenario, validation is `INVALID` before provisioning. | resolver result and zero target events |
| `SCF-002` | Given two cases differ only by cosmetic actor fields, coverage does not count them as distinct behavioral slices. | normalized coverage ledger |
| `SCF-003` | Given one tool mutation changes account state, the next turn observes that exact state or the deterministic state oracle fails. | before/after snapshots and tool events |
| `SCF-004` | Given a success-only mock omits a required negative response, the world definition is incomplete and the affected claim remains `BLOCKED` or `PARTIALLY_SUPPORTED`. | mock-capability matrix |
| `SCF-005` | Given a case is used for optimization, it cannot also enter the locked holdout or calibration-reference partition under the same dataset identity. | partition and lineage validation |
| `SCF-006` | Given a semantic metric lacks a calibrated judge or required human-review receipt, the semantic claim cannot be `SUPPORTED`. | metric definition and evaluation receipt |
| `SCF-007` | Given deterministic hard-gate failure, strong semantic or aggregate scores cannot compensate. | claim ledger |
| `SCF-008` | Given two candidate agents, comparison binds exact model, prompt, tool, harness, and source identities. | treatment manifest and comparison receipt |
| `SCF-009` | Given simulated scores improve only in aggregate but regress in a required risk slice, release support fails or remains partial according to the declared metric policy. | slice metrics and reduction |
| `SCF-010` | Given treatment ranking does not meet the predeclared reference threshold, calibration is `UNCALIBRATED`, even when individual simulations pass. | calibration receipt |
| `SCF-011` | Given only expert-labelled greenfield data, the receipt may support initial usability but explicitly cannot claim production calibration. | scoped calibration ledger |
| `SCF-012` | Given the reference window expires or the population materially drifts, calibration becomes `STALE` and cannot satisfy a current release claim. | invalidation receipt |
| `SCF-013` | Given the simulator/generator and judge identities violate a declared independence policy, evaluation or calibration is rejected before claim reduction. | role/session identities and policy decision |
| `SCF-014` | Given a deterministic fake calibration campaign passes, live sim-to-real calibration remains `NOT_RUN`. | separate framework and target calibration statuses |
| `SCF-015` | Given a target-project canary disagrees with simulation, the frozen evidence is preserved, the calibration scope is invalidated, and the disagreement becomes a regression/calibration input rather than being overwritten. | canary result, invalidation, and new dataset lineage |

## Highest Useful Test Seam

The highest useful stable seam is the campaign-layer comparison and release
projection boundary:

> Given two exact treatment revisions, frozen simulation evaluation receipts,
> and a frozen human/reference dataset, the reducer must reproduce the declared
> treatment ordering, surface required slice regressions, emit a digest-bound
> calibration receipt, and refuse release support when calibration is missing,
> stale, invalid, or outside the claim's scope.

Tests should assert this public result and immutable artifacts, not private
helper structure.

## Protected Contracts

- Six contours and their driver separation remain unchanged.
- Computer Use remains a driver, never an oracle.
- Surface adapters retain contour-specific preflight, execution,
  observation, and cleanup ownership.
- Operator and evaluator identities remain separate.
- Deterministic hard gates remain non-compensating.
- Failed and partial attempts remain immutable.
- W-012 composes typed tasks without hybrid task kinds.
- Platform-specific evidence does not broaden to another platform.
- Active graph readiness does not authorize dispatch.
- Historical candidate artifacts do not become current-source evidence.

## Implementation Result

The local deterministic foundation is implemented without third-party runtime
services:

- Bun 1.3.3 campaign entrypoint, definition resolver, generated catalog,
  stateful fake driver, default-deny policy reducer, deterministic oracles,
  immutable source/evidence freezing, lifecycle, evaluation, calibration, and
  aggregation receipts;
- typed population, scenario, world, dataset, metric, treatment, calibration,
  task, campaign, claim, policy, oracle, and rubric schemas;
- exclusive development, regression, holdout, and calibration-reference case
  identities plus minimized/reference-window requirements for
  production-derived populations;
- per-treatment required-slice checks, human agreement, rank correlation,
  linear correlation, freshness, and invalidation inputs;
- six deterministic correctness campaign definitions and one generated
  catalog;
- a tracked starter template plus
  `simulation init <simulation-id> --owner-lane W-NNN`, which previews or
  exclusively creates 18 machine-readable definitions and one co-located
  simulation-design report, validates the generated campaign, and rewrites the
  registry atomically;
- release projection that keeps framework-fixture calibration
  `release_eligible=false` and the release claim `NOT_RUN`;
- current validator, configuration, structure map, skills, templates, and
  checklists wired to the canonical paths.

This implements the framework mechanics. Command, browser, terminal, desktop,
mobile, composed agent-tool adapters, real reference data, and controlled
production confirmation remain owned by their existing open lanes.

## Validation Evidence

| Gate | Planned evidence | Current status |
|---|---|---|
| Baseline reconciliation | Current/candidate inventory and direct-cutover decision | `PASS`; candidate entrypoint/process utilities adapted, shallow schemas/reducer rejected |
| Definition schemas | Population, scenario, world, dataset, metric, treatment, calibration, evaluation-profile, and initializer tests | `PASS`; 22 Bun unit tests total |
| Reference resolution | Unknown evidence, invalid kind/driver, duplicate case, population weight, and catalog-drift failures | `PASS` |
| World consistency | Stateful action sequence, state-before/state-after events, two final-state oracles, reset verification | `PASS` for framework fake; cross-tool state `NOT_RUN` |
| Partition integrity | Development/regression/holdout/reference identity and leakage tests | `PASS` |
| Metric correctness | Mean treatment aggregation and per-treatment required-slice gates | `PASS` for deterministic `uncertainty=none`; other uncertainty reducers fail closed |
| Judge calibration | Human-label/judge-label agreement threshold | `PASS` for framework fixture; target domain review `NOT_RUN` |
| Sim-to-reference calibration | Treatment ranking, linear correlation, required slices, and stale-reference fixtures | `PASS` for framework fixture |
| Artifact integrity | Frozen runner/schema/definition sources and separate execution/evaluation/calibration/aggregation receipts | `PASS` for three new run IDs |
| Claim reduction | Framework calibration cannot satisfy required release claim | `PASS`; release claim `NOT_RUN`, `release_eligible=false` |
| Framework campaigns | Seven definitions resolved; contract, calibration-ranking, and independent Codex-evaluation runs executed | `PASS` for executed runs; remaining four deterministic definitions validated but not executed |
| Independent semantic evaluation | Versioned Sol/high profile, frozen read-only input packet, echoed packet-manifest digest, complete JSONL trace, schema-v2 receipt, and identity/digest checks before aggregation | `PASS` for the framework Codex canary; target-domain effectiveness remains `NOT_RUN` |
| Target bootstrap | Dry-run/render, collision refusal, registry refresh, fresh-repository artifact creation, generated smoke execution, and validator | `PASS` in isolated temporary repository; 19 files generated, temporary catalog had 7 entries, framework calibration `CALIBRATED`, release ineligible |
| Target-project calibration | Real or expert-labelled reference comparison | `NOT_RUN`; unavailable in Cascade |
| Production confirmation | Controlled target canary or A/B evidence | `NOT_RUN`; out of repository scope |

Canonical repository commands:

```bash
bun scripts/cascade.ts campaign catalog --check
bun scripts/cascade.ts campaign self-test
bun scripts/cascade.ts campaign run simulation-contract-smoke
bun scripts/cascade.ts campaign run simulation-population-smoke
bun scripts/cascade.ts campaign run simulation-world-state-smoke
bun scripts/cascade.ts campaign run simulation-partition-leakage-smoke
bun scripts/cascade.ts campaign run simulation-calibration-ranking-smoke
bun scripts/cascade.ts campaign run simulation-codex-evaluation-smoke
```

Repository validation remains required after implementation:

```bash
bun scripts/cascade.ts validate
bun scripts/cascade.ts eval catalog --check
bun scripts/cascade.ts eval self-test
bun scripts/cascade.ts target self-test
bun test scripts/cascade
git diff --check
```

Preserved execution evidence:

- `bun test scripts/cascade`: `PASS`, 22 tests;
- campaign catalog check: `PASS`, 7 entries;
- campaign self-test: `PASS`, framework calibration `CALIBRATED`, release
  scope `NOT_RUN`;
- isolated target initializer: `PASS`, 19 files, collision refusal, generated
  campaign execution, and fresh `.artifacts/campaigns` provisioning;
- `simulation-contract-smoke`: `PASS`, release ineligible;
- `simulation-calibration-ranking-smoke`: `PASS`, release ineligible;
- `simulation-codex-evaluation-smoke`: `PASS`, Sol/high provider, frozen
  72-file input packet, echoed packet-manifest digest, complete trace, and
  receipt digests verified, release ineligible; source-bound run
  `.artifacts/campaigns/simulation-codex-evaluation-smoke-20260730-live-r4`
  produced evaluation receipt digest
  `f02667704d910fad17fec4b86d321b05c87306ef91af215f0f43ca532e56e849`
  and aggregation digest
  `ce8b0121b5b4c85dfff1a543270dbd10a5258958a6a96e63ca376e628b1b4a37`;
- preserved failed Codex attempt: `BLOCKED`, no aggregation, proving provider
  failures do not fall back to fixture evaluation;
- preserved Cascade validator, 41-skill/319-scenario harness catalog, and
  15-case harness self-test receipts: `PASS` for their recorded source only.

Report-revision source freshness (historical):

- earlier contract, calibration, and Codex execution receipts remain
  historical and source-bound;
- the generated harness catalog now records 44 skills, 368 scenarios, and
  digest `d6030bf0ea98a6bd26b431de50ac1b7ca909a19a289192d005403c514507897d`;
- exact Bun 1.3.3 passes 31 targeted tests, 44 aggregate tests, campaign catalog
  and self-test, harness catalog and 20-case self-test, 26-case target
  self-test, aggregate validator, and `git diff --check`;
- deterministic run `wg001-n03-attempt3-20260730-r1` passes execution,
  fixture evaluation, cleanup verification, and campaign aggregation while
  remaining release-ineligible;
- campaign catalog digest at that fixed point was
  `5228269b97beac38bb77fb0e254bc1b2a1244404b0f69ea8685bca6c23f250a8`;
- independent attempt-3 Standards, Spec, and GF-004 v1 review passed with no
  findings, so WG-001-N03 was `ACCEPTED` for that fixed point.

Current reconciliation, 2026-08-03: W-025 and W-026 changed named shared
campaign, evaluation, artifact, schema, catalog, and workflow sources. Under
the receipt invalidation rule, historical N03 acceptance is stale and N03 is
`PENDING`; current-source revalidation is `NOT_RUN`. WG-001 plan revision 17
and work-graph revision 11 are authoritative. N04/N05 remain `BLOCKED` after
failed attempt-4 reviews with all four attempts exhausted. The current
seven-entry campaign catalog digest is
`213a94b684e6c6341924fcb8723e2483050fa5cd198db0bc83f8b3cd26e962b4`;
W-026's 84-test pass is scoped repair evidence and does not accept a WG-001
node.

## Risks And Deferred Items

- The current working tree contains substantial user-owned dirty and untracked
  work. WG-001-N01 must establish write ownership before implementation.
- Adding calibration to the claim reducer after Gate A would invalidate every
  dependent surface. Amend the contract before Gate A instead.
- Population realism is domain-specific. Cascade can validate shape,
  provenance, partitioning, and evidence but cannot mechanically prove that a
  target population is representative.
- Correlation alone is insufficient. Required risk slices and human/domain
  review must remain separate gates.
- Fixed numeric acceptance thresholds are intentionally not defined globally.
  Each target calibration definition must predeclare thresholds appropriate to
  its metric, risk, and sample size.
- Live provider calls, paid models, real accounts, production datasets, host
  desktop control, and device execution are not authorized by this plan.

## Work-Graph Integration

The deterministic W-004 foundation applies the following WG-001 ownership
split; the remaining surface implementation must preserve it:

1. Expand WG-001-N02 to own population, scenario, world, dataset, metric,
   treatment, and calibration definitions.
2. Expand WG-001-N04 to own the calibration namespace and generator/reviewer
   identity fields.
3. Expand WG-001-N06 to require judge calibration and slice-aware metric reduction.
4. Expand WG-001-N07 to own calibration receipts, staleness, invalidation, and
   release-projection requirements.
5. Expand WG-001-N08 and Gate A with deterministic population, world, partition,
   metric, and calibration failure-injection fixtures.
6. Add the state-consistency and simulated-actor seam to W-007 and W-012
   acceptance criteria without creating a hybrid task kind.
7. Keep target-project calibration after Gate B and before any applicable
   release-eligibility projection.

This implementation does not complete W-004 or Gate A. The remaining
cross-surface, recovery, handoff, redaction, composition, and live/platform
criteria keep W-004 through W-010 and W-012 `OPEN`.

## Doc Routing Decision

| Fact | Source | Owner Target | Action | Bloat Check | Evidence | Next Gate |
|---|---|---|---|---|---|---|
| Simulation correctness needs population, state, partition, metric, and calibration contracts | video/paper analysis plus current-source audit | this report | `UPDATED` | One decision-heavy plan; no broad program rewrite | targeted source search and candidate inspection | W-004/WG-001 amendment |
| Active status changed | deterministic implementation and receipts | `docs/work/active.md` | `UPDATED` | Lane remains open; evidence and next gate only | current tests and run receipts | remaining W-004 gates |
| Durable simulation vocabulary and paths | implemented schemas and runner | `docs/structure.md`, `harness.config.yaml` | `UPDATED` | Canonical paths only | validator and catalog pass | target adapters |
| Skill and agent contracts | calibration and data-quality additions | simulation skill packages | `UPDATED` | Thin checklist/template deltas | validator passes | fixed-point review |
| Target bootstrap contract | request to make simulation models, reports, and registry bootstrapped and templated | `CODEX.md`, `docs/structure.md`, `harness.config*.yaml`, simulation/adaptation skills | `UPDATED` | One tracked machine template and one existing report template | 22 tests, isolated initializer campaign, validator and seven-entry catalog pass | adapt generated placeholders to target evidence |
| Independent evaluation provider | request to configure Codex for simulation evaluation | campaign/profile/output/receipt schemas, evaluator runner, validator, skills, and runtime bridge | `UPDATED` | One fixture profile and one Sol/high Codex profile; no provider abstraction beyond current needs | live framework canary and preserved fail-closed attempt | target-specific rubric calibration remains `NOT_RUN` |
