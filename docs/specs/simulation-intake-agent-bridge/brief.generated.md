# Product Brief: Evidence-Bound Simulation Intake And Agent Handoffs

> Generated projection. The linked product and spec sources remain authoritative.
> Harness and synthetic evidence retain their limited authority and cannot establish product-persona truth.

- Brief: `PB-002` revision `1`
- Status: `reviewed`
- Coverage: `complete`
- Catalog digest: `0f6b921bf6cefde6ba96d9410b1609fca21ab65c69f70a258e3e05bffac73c5b`
- Manifest digest: `6ba4bea74254b1a26d54736d55ba3332f6d9565ded75f2e2ec840af39516bed8`
- Selected-source digest: `588036f6c1faff50f0e6aece088f6272d22367967135c85fc4cb36e172acf16b`
- Compiler-contract digest: `54110922ae0413c18ebe6ff39f619d0f0c816f1704366164d92777074f1630c6`

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
| `docs/specs/simulation-intake-agent-bridge/contract.md` | `766c49f1ceaf5cc6c52e601b1224df2fc0088466107661b72645dd142d93bc94` |
| `docs/specs/task-admission-workload/contract.md` | `726c02e6fc434c2c50c2f4f1bd3ca4013ec0d02e7cf6be6300bc6c51d6cd4b65` |
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
| `scripts/cascade/simulation-intake.test.ts` | `contract-test` / `implementation` | `authored` | Exercises the intake schema, draft starter, and normalized action boundary without claiming product behavior. | `3d8644fa8bf5370b0a27734b7ebfdc62160c45962b0a74c774f2bf7d94b24360` |
| `product-evals/simulations/harness/simulation-correctness-fixture/manifest.json` | `harness-simulation` / `mechanics-only` | `authored` | Exercises framework mechanics only and cannot establish target-product behavior or persona truth. | `97f576d76d315a0dfbe4879606ea0e5002192a077178fbbe667ab627dcd87f75` |

## Capability Evaluation References

| Path | Kind / authority | Status | SHA-256 |
|---|---|---|---|
| `scripts/cascade/simulation-intake.test.ts` | `contract-test` / `implementation` | `authored` | `3d8644fa8bf5370b0a27734b7ebfdc62160c45962b0a74c774f2bf7d94b24360` |

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
append-only disposition, route it through `synthesis-to-spec -> compose-spec`
to author a new reviewed persona revision. Recompute every affected brief,
derivation, population, campaign, claim, and evaluation binding after the
source revision changes.

### workflow-core / planning-knowledge-contract

Source boundary: `docs/patterns/workflow/index.md`

A plan is a compact index of implementation knowledge, not a replacement for
its authoritative sources. Planning and replanning must preserve the minimum
information needed to reconstruct why the work is shaped as it is:

- source identity, authority, version or freshness, and the claims it supports;
- accepted definitions and decisions, plus assumptions and unresolved
  questions with explicit status;
- negative constraints, rejected paths, and non-goals when losing them would
  enable an unsafe or repeatedly rejected implementation;
- producer/consumer boundaries, ownership, compatibility, and invalidation
  rules;
- for stateful work, stable identity, source of truth, mutation authority,
  legal transitions, typed dependencies/gates/external conditions, retry and
  resource bounds, and exhaustion behavior;
- request-to-workline-to-artifact-to-evidence traceability;
- current workline dependencies, blockers, changed artifacts, evidence status,
  and next gate;
- revision history showing what was preserved, changed, added, invalidated, or
  superseded.

This section owns what planning must preserve. `Planning Context Preservation`
in `docs/patterns/context-memory/index.md` owns how that knowledge is compressed,
rehydrated, and checked for drift.

Compress repeated explanation and long evidence bodies into summaries with
stable references. Never compress away identity, provenance, status, negative
constraints, ownership, acceptance meaning, or the difference between
authored, executed, blocked, and accepted evidence. A compact projection must
not become a second authority.

Use planning states deliberately:

- `DRAFT`: coverage or definitions remain open;
- `DEFINITION_READY`: important terms, boundaries, authority, lifecycle, and
  failure behavior are coherent;
- `IMPLEMENTATION_READY`: worklines, slices, writes, dependencies, validation,
  and stop conditions are mapped;
- `BLOCKED`: a required source, decision, permission, or validation
  precondition is unavailable;
- `SUPERSEDED`: a later revision replaced this plan while retaining its
  identity and disposition.

For material replanning, increment the plan revision and record the delta
before replacing current projections. Re-evaluate affected worklines, checks,
and evidence; preserve unrelated accepted knowledge whose sources and
boundaries remain current.

### workflow-core / doc-routing-decision-matrix

Source boundary: `docs/patterns/workflow/index.md`

Use this shared matrix whenever a skill creates, changes, normalizes, validates,
or closes out durable facts that may belong in project docs. The matrix makes
the routing decision explicit even when no document update is needed.

| Fact | Source | Owner Target | Action | Bloat Check | Evidence | Next Gate |
|---|---|---|---|---|---|---|
| `<DURABLE_FACT_OR_NONE>` | `<REQUEST_SPEC_DIFF_LANE>` | `<DOC_OR_FOLDER_OR_NONE>` | `<UPDATED_NO_CHANGE_DEFERRED_BLOCKED_GAP_NO_DOC_NEEDED>` | `<SMALLEST_USEFUL_DELTA_OR_REASON>` | `<VALIDATION_OR_SOURCE>` | `<SKILL_OR_DONE>` |

Actions:

- `UPDATED`: owner doc was changed with the smallest useful sourced delta.
- `NO_CHANGE`: owner doc was checked and already matches the durable fact.
- `DEFERRED`: real follow-up exists and has an owner or backlog route.
- `BLOCKED`: required evidence or owner context is unavailable.
- `GAP`: source material lacks enough product, design, brand, spec, glossary,
  or architecture context for safe routing.
- `NO_DOC_NEEDED`: change is mechanical, test-only, refactor-only, already
  documented, or not useful for future planning or validation.

Rules:

- `Source`: use the strongest available identity: request or issue ID,
  spec/spec-packet path, work lane ID, product artifact ID, changed file,
  or prior report.
- `Owner Target`: name the exact existing owner file when known; use a folder
  only when owner selection is pending; use `none` only for `NO_DOC_NEEDED`.
- `Evidence`: cite the proof or blocker: command result, functional check,
  scenario evidence, code diff, docs-impact status, source-only basis, or
  blocked reason.
- `Bloat Check`: state why the row is the smallest useful durable delta, or why
  no doc update is needed.
- Prefer the existing owner doc or folder named in `docs/structure.md`.
- Use `docs-impact-map` when one durable product, design, brand, spec,
  backlog, glossary, or pattern fact may affect sibling docs.
- Append thin sourced deltas; do not rewrite broad docs or create generic note
  dumps.
- Store raw source material only when `ingest-spec` decides preservation helps
  traceability or future re-normalization.
- Route `GAP` to `discover`, `market-validation`, `synthesis-to-spec`,
  `compose-spec`, `brand-positioning`, `design-system`, or
  `ingest-spec` according to the missing context and evidence maturity.
- Route durable follow-up work to `docs/backlog/_index.md` only with acceptance
  criteria.
- Use `.codex/skills/closeout/templates/doc-routing-decision.md` when a formal
  reusable matrix is useful.

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
