# Product Brief: Evidence-Bound Simulation Intake And Agent Handoffs

> Generated projection. The linked product and spec sources remain authoritative.
> Harness and synthetic evidence retain their limited authority and cannot establish product-persona truth.

- Brief: `PB-002` revision `1`
- Status: `reviewed`
- Coverage: `complete`
- Catalog digest: `2d24c923fe55562ab079de54e428788f4429c2051442bbceac75852340af1160`
- Manifest digest: `1a69b88467c4f3dae37439902a2ce6f62b47e5c0b3b111f874af0264ca808e44`
- Selected-source digest: `7132c1ba9bd6f9451ce1e2bec3bc0e97bc7719e13bb49dba21480c14c2a58b0f`
- Compiler-contract digest: `4cfeada5833d864235315bb41aa63acf157b08f15c247f2914c23fc84fd9acd1`

## Purpose And Audience

Assemble current admission, product-context, simulation-policy, and agent-handoff context for authoring or reviewing a product simulation intake.

- Cascade maintainers
- simulation authors, operators, and evaluators
- product spec and persona owners

## Domain And Capability

- Domain `PD-001`: **Product context and simulation governance** — Governs product evidence, product-context assembly, persona-derived simulation, and reviewed refinement feedback.
- Capability `PC-003`: **Evidence-bound simulation intake and agent handoff** — Compiles Task Envelope claims and a scope-correct product brief into exact campaign action-policy bindings and separated author, operator, and evaluator handoffs.
- Owner: Cascade maintainers
- Capability status: `reviewed`

## Source Documents

| Path | SHA-256 |
|---|---|
| `docs/specs/simulation-intake-agent-bridge/contract.md` | `836dd2d588e22117fb0e5846b83aa09993c61a13422edb161de6548a4d90a95c` |
| `docs/specs/task-admission-workload/contract.md` | `cc995fef352f3576da22d4e30f661cc61cb7aded5abc84930527147cfe80ebdd` |
| `docs/specs/product-context-briefs/contract.md` | `a0e5ad2910e3a475cf7ea9a306d4bacd52fe4ea4b0b3c86872562e6306f5e44e` |

## Requirements

| ID | Source | Requirement | Acceptance Criterion | Scenario IDs | Status |
|---|---|---|---|---|---|
| PR-009 | `SIB-001, SIB-002 / PC-003` | Product simulation campaigns require a scope-correct intake bound to the current W-031 Task Envelope. | Given an absent, draft, blocked, cross-scope, or stale product intake, when campaign execution is requested, then execution stops before provisioning. | `PS-009` | `reviewed` |
| PR-010 | `SIB-003 / PC-003` | A READY product intake binds one current reviewed/approved product brief and generated projection with exact product reference selections. | Given a changed manifest, generated brief, or selected product source, when the intake resolves, then it is stale and cannot execute. | `PS-010` | `reviewed` |
| PR-011 | `SIB-004 / PC-003` | Every campaign action has exactly one computed applicable policy and each task's declared policy set equals the computed set. | Given zero, overlapping, denied, omitted, or extra action policies, when intake compilation or campaign resolution runs, then readiness fails closed with the task/action identities. | `PS-011` | `reviewed` |
| PR-012 | `SIB-005, SIB-006 / PC-003` | Campaign authoring, mutable execution, independent evaluation, harness judgment, and product-doc promotion remain separate explicit handoffs. | Given a simulation finding, when repair or refinement is routed, then no evaluator executes/repairs and no product document changes without an accepted synthesis/composition decision. | `PS-012` | `reviewed` |

## Journeys

| ID | Persona | Type | Covers Scenario IDs | Functional Evidence | Status |
|---|---|---|---|---|---|
| J-002 | Cascade maintainer and simulation team | happy / failure / stale / handoff | `PS-009`, `PS-010`, `PS-011`, `PS-012` | admission corpus, simulation intake compile/check, campaign validation/run preflight, and role-routing checks | `reviewed` |

## Scenarios

| ID | Source | User Goal | Given | When | Then | Functional Evidence |
|---|---|---|---|---|---|---|
| PS-009 | `SIB-001, SIB-002 / PR-009` | Prevent an ungoverned product run | A product campaign has no intake or its intake is DRAFT, BLOCKED, cross-scope, or stale | Validate or run the campaign | Validation names structural drift and execution refuses before provisioning or target mutation | simulation intake and campaign run-gate tests |
| PS-010 | `SIB-003 / PR-010` | Seed a simulation from current product context | A reviewed product brief selects exact domain, capability, requirements, journey, scenarios, and personas | Compile the product intake | The intake binds manifest and generated-output digests and preserves every source gap and authority limit | brief/intake compiler fixed-point checks |
| PS-011 | `SIB-004 / PR-011` | Apply the correct execution policy | A task action has zero, multiple, denied, omitted, or extra applicable policies | Compile or resolve its intake | The intake is BLOCKED or resolution fails with exact task/action/policy evidence; no permissive fallback exists | policy equality negative tests |
| PS-012 | `SIB-005, SIB-006 / PR-012` | Route execution and findings to the correct agents | A campaign is READY and later produces immutable evidence or a refinement candidate | Dispatch execution, evaluate, and route the result | The operator alone mutates the run target, the evaluator stays read-only, harness traces use the harness evaluator, and product changes require explicit synthesis/composition review | role wiring, receipt identity, and refinement-boundary checks |

## Personas

_No reviewed non-fixture product persona is selected._

## Evidence Ledger

| ID | Kind / authority | Status | Source | Supports | Limitation |
|---|---|---|---|---|---|
| _none_ | | | | | |

## Simulation And Evaluation Context

| Path | Scope / authority | Status | Purpose | SHA-256 |
|---|---|---|---|---|
| `scripts/cascade/simulation-intake.test.ts` | `contract-test` / `implementation` | `authored` | Exercises the intake schema, draft starter, and normalized action boundary without claiming product behavior. | `a1a0036c2f6417f886f5cf2b51e39a0537ef6351dbdd43640e2723253c30fadb` |
| `product-evals/simulations/harness/simulation-correctness-fixture/manifest.yaml` | `harness-simulation` / `mechanics-only` | `authored` | Exercises framework mechanics only and cannot establish target-product behavior or persona truth. | `23776ad788f0b35381eea1727573ac5bb5d1d7e8a74eceda6198fd461254a9bb` |

## Capability Evaluation References

| Path | Kind / authority | Status | SHA-256 |
|---|---|---|---|
| `scripts/cascade/simulation-intake.test.ts` | `contract-test` / `implementation` | `authored` | `a1a0036c2f6417f886f5cf2b51e39a0537ef6351dbdd43640e2723253c30fadb` |

## Gaps

- No target-product campaign has yet compiled a READY intake from PB-002.
- No authorized product execution or independent product evaluation receipt exists.
- No reviewed target-user evidence exists for a non-fixture persona refinement.

## Non-Goals

- Treat a brief or intake as execution authorization.
- Treat harness mechanics as product evidence.
- Let a synthetic persona validate or mutate its source product persona.
- Update product documents implicitly from a work cycle or simulation finding.

## Reusable Context

### product-context-core / product-authority-graph

Source boundary: `docs/patterns/product-context/index.md`

Use this graph when product material must be assembled without creating a
second authority:

```text
source or approved decision
  -> product domain (PD-XXX)
  -> capability (PC-XXX)
  -> persona / journey / requirement / scenario owner rows
  -> spec packet or brief manifest (PB-XXX selection)
  -> generated brief projection
  -> plan, implementation, functional evidence, or product simulation
```

`docs/product/catalog.yaml` owns only stable relationships and exact
references. Each linked owner document retains its detailed facts and status.
Generated briefs and active plans are projections. A path, folder title,
workline, campaign, or simulation ID does not implicitly create a product
domain or capability.

Require unique stable IDs, one declared domain per capability, bounded source
paths, existing owner references, explicit evaluation authority, and no orphan
product rows. Update the catalog and owner docs together when a relationship
changes.

### product-context-core / brief-manifest-and-compilation

Source boundary: `docs/patterns/product-context/index.md`

A brief manifest is a deterministic source-selection contract. It names one
domain and capability, coverage mode, exact product references, source
documents, evidence metadata, pattern sections, simulation/evaluation context,
gaps, non-goals, and output path.

Validate the complete reference graph before rendering. `complete` coverage
must equal the capability relationship set. `selected` coverage records every
omitted capability reference and why. Fail closed on duplicate or unknown IDs,
missing paths, repository escape, missing pack/section IDs, incompatible
domain/capability pairs, unsupported evidence authority, or stale generated
output.

Render summaries and owner rows before longer reusable context. Preserve a
source boundary for every compiled section and bind the projection to stable
catalog, manifest, and selected-source digests. Equivalent input must produce
byte-identical output; do not embed a generation timestamp.

### product-context-core / evidence-promotion-boundary

Source boundary: `docs/patterns/product-context/index.md`

Keep evidence class, authority, status, limitations, reference date, and
supported claim or decision distinct. User-provided facts can guide their
declared scope. Research can support methodology and questions. Harness
evaluations prove harness behavior. Harness simulations prove mechanics.
Product simulations may support target claims only after current target
execution, evaluation, policy/oracle, cleanup, and calibration gates.

Never promote plausibility, repetition, model agreement, an authored file, or
a context-pack selection into empirical product evidence. A generated brief
may carry `GAP`, `NOT_RUN`, or historical sources; it must not summarize those
states as approval or proof.

### product-context-core / simulation-feedback-bridge

Source boundary: `docs/patterns/product-context/index.md`

A reviewed product persona may seed a synthetic population only through an
explicit digest-bound derivation with governed evidence and typed behavior.
Simulation findings may produce immutable proposals, research questions,
simulator repairs, or candidate refinements. They never validate or mutate the
source persona.

When a refinement is supported by external evidence and an accepted
append-only disposition, route it through `create-spec`
to author a new reviewed persona revision. Recompute every affected brief,
derivation, population, campaign, claim, and evaluation binding after the
source revision changes.

### workflow-core / planning-knowledge-contract

Source boundary: `docs/patterns/workflow/index.md`

An inline plan should retain only what implementation needs:

- intended behavior and non-goals,
- authoritative source and current assumptions,
- affected producer and consumer boundaries,
- mutation ownership and compatibility constraints,
- focused validation and stop conditions.

Create a durable plan or spec only when the contract is public, the work must
survive tasks, several owners require a shared source, or the user explicitly
requests it. Replanning invalidates only dependent slices and evidence; current
unaffected work remains valid.

### workflow-core / doc-routing-decision-matrix

Source boundary: `docs/patterns/workflow/index.md`

| Durable fact | Owner |
|---|---|
| Product intent, requirement, journey, scenario, metric | `docs/product/` |
| Interaction, accessibility, component, visual rule | `docs/design/` |
| Positioning, tone, naming, message rule | `docs/brand/` |
| Approved implementation or public contract packet | `docs/specs/` |
| Active resumable execution state | `docs/work/` |
| Reusable workflow or architecture rule | `docs/patterns/` |
| Codebase vocabulary | `docs/glossary.md` |
| No durable fact | no documentation write |

Update the narrowest owner and affected consumers. Preserve dated reports as
history rather than silently rewriting them.

### testing-core / scenario-tests

Source boundary: `docs/patterns/testing/index.md`

Traceability:

```text
docs/product/scenarios.md
  -> executable scenario or functional test
  -> docs/work/active.md or docs/work/lanes/*.md for the active work overlay
```

Rules:

- Mock only the boundary needed for determinism.
- Keep fixture data explicit.
- Preserve scenario IDs when updating expectations.
- Do not create broad scenario suites just because a product scenario file
  exists.
- Multi-step flows should track carried state and duplicate side effects.
- Do not mark skipped or environment-gated checks as `PASS`.
- Do not mock the behavior being tested.
