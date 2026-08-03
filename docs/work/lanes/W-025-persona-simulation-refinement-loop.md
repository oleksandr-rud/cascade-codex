# Work Lane: W-025 Persona Simulation Refinement Loop

Status: `IN_PROGRESS`
Planning Status: `IMPLEMENTATION_READY`
Plan Revision: `1`
Owner: `agent-engineer`
Created: 2026-08-03
Lane Model: `sequential-pipeline`
Next Gate: `functional-qa -> review-change -> validate-change`
Execution Surface: `root`
Dispatch State: `RUNNING`
Dispatch Authorization: user request to implement the researched fixes, 2026-08-03
Runtime Handle: current root task

## Request

Implement the governed bidirectional connection in which reviewed product
personas seed synthetic simulation populations and simulation findings become
reviewable refinement proposals, then clean up completed historical worklines.

## Intended Behavior And Non-Goals

- `docs/product/personas/` remains the human-reviewed product-persona authority.
- A machine-readable derivation manifest binds an exact persona revision and
  file digest before a synthetic population can be resolved.
- Derived populations distinguish representative, coverage, stress, and
  counterfactual test allocation; non-representative weights never claim
  production prevalence.
- Independent evaluators may emit typed refinement proposals from frozen run
  evidence. Proposals are immutable campaign artifacts and cannot directly
  mutate or validate their source persona.
- Promotion requires external evidence, accountable human review, and a new
  product-persona revision through `synthesis-to-spec -> compose-spec`.
- This lane does not prove synthetic-persona realism, target calibration,
  deployment, or release eligibility and does not repair WG-001-N04/N05.

## Acceptance Criteria

- Product persona authoring records revision, evidence/confidence,
  uncertainty, permitted uses, prohibited claims, and invalidation signals.
- Versioned JSON schemas cover derivation manifests, persona-derived
  populations, and refinement proposals while preserving population v1.
- Campaign resolution validates derivation/persona IDs, paths, revisions, and
  SHA-256 digests and binds them into the source manifest.
- `simulation derive-population` is deterministic and dry-run only, refuses
  ambiguous manifests, collisions, stale digests, unapproved derivations, and
  model-backed generation.
- Semantic evaluation output can carry typed proposals; the runner validates
  their source bindings and evidence paths and freezes each proposal before
  terminal finalization.
- Synthetic output cannot use an accepted/promoted status or claim direct
  product-persona mutation.
- Focused positive/negative tests, catalog check, self-tests, full Cascade
  validation, and diff integrity pass on one current source identity.

## Source Ledger

| Source ID | Source / Authority | Path | Freshness | Supports | Status |
|---|---|---|---|---|---|
| `SRC-01` | user authorization | current task | 2026-08-03 | implementation and later cleanup | authoritative |
| `SRC-02` | prior research synthesis | memory rollout `019fb910-7a6d-7743-8dc9-339191a1d163` | 2026-07-31 | architecture, validity, and promotion boundaries | supporting; efficacy unvalidated |
| `SRC-03` | product persona authority | `docs/product/personas/`, `compose-spec` | current checkout | persona source and review ownership | authoritative |
| `SRC-04` | simulation authority | `evals/simulations/`, `scripts/cascade/` | `master@cdcdfc2` | schemas, resolver, CLI, evaluator, artifacts | authoritative |
| `SRC-05` | shared campaign program | W-004 and WG-001 | plan revision 15 / graph revision 11 | protected consumers and invalidation | authoritative; blocked |

## Definitions And Decisions

| ID | Definition Or Decision | Authority | Invalidation Rule | Status |
|---|---|---|---|---|
| `DEF-01` | A product persona is reviewed product evidence, not an executable actor prompt. | `compose-spec` | persona owner changes | accepted |
| `DEF-02` | A derivation manifest is the explicit bridge; Markdown is never parsed implicitly into behavioral claims. | W-025 | schema or resolver change | accepted |
| `DEF-03` | A synthetic population is test input with declared allocation semantics. | W-025 | population schema change | accepted |
| `DEF-04` | A refinement proposal is an immutable hypothesis bound to one frozen run, evaluation, derivation, and persona revision. | W-025 | proposal or artifact contract change | accepted |
| `DEF-05` | External evidence and human review are mandatory before a proposal can create a new product-persona revision. | product persona authority | promotion workflow change | accepted |

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `PER-001` | Given an approved manifest with matching persona and derivation digests, when population derivation is previewed, then deterministic population v2 JSON is returned without writing files. | CLI/unit test | open |
| `PER-002` | Given a stale persona digest, unapproved review, model-backed generator, or ambiguous match, when derivation is requested, then it fails closed. | negative tests | open |
| `PER-003` | Given a legacy population v1 campaign, when definitions resolve, then current behavior remains valid. | existing correctness fixture | open |
| `PER-004` | Given a persona-derived population, when a campaign resolves, then the persona and derivation files and digests enter the source identity. | resolver integration test | open |
| `PER-005` | Given a semantic evaluator proposal, when its persona, derivation, run, or evidence binding is stale or unknown, then aggregation is blocked and no proposal artifact is accepted. | evaluator negative tests | open |
| `PER-006` | Given a valid proposal, when the run finalizes, then it is stored once under `refinements/` and terminal verification covers it. | artifact integration test | open |

## Feature Impact Matrix

| Feature / Flow | Contracts | Touched? | Protected Behavior | Required Check | Status |
|---|---|---:|---|---|---|
| Product persona authoring | persona template/index; `compose-spec` | yes | weak evidence is not promoted | marker and validator checks | open |
| Population resolution | population schema and TypeScript validator | yes | v1 fixtures continue to resolve | definition tests | open |
| Source identity | campaign source manifest | yes | every referenced source remains digest-bound | resolver/campaign tests | open |
| Semantic evaluation | output schema/parser/prompt | yes | mechanical gates remain non-compensating | evaluation tests | open |
| Campaign artifacts | governed namespaces/finalization | yes | lease, exclusivity, redaction, terminal verification | artifact/campaign tests | open |
| W-004 evidence | WG-001 source-bound receipts | consumer only | blocked gate state is not upgraded | graph/status reconciliation | open |

## Boundaries And Security Controls

| Boundary | Producer | Consumer | Contract / Control | Required Check |
|---|---|---|---|---|
| persona -> derivation | human-reviewed product docs | manifest author | exact path, revision, digest; minimized evidence references | stale/mismatched digest negatives |
| derivation -> population | deterministic preview tool | campaign resolver | approved manifest, stable invariants, bounded mutation axes, no model call | deterministic output and model-backed rejection |
| run -> proposal | independent evaluator | operator artifact writer | frozen evidence paths, evaluator identity, proposal-only status | unknown evidence/source negatives |
| proposal -> persona revision | synthesis and human review | `compose-spec` | external evidence required; direct mutation forbidden | schema constants and workflow markers |

Raw research records and sensitive examples stay outside durable persona and
simulation definitions. Evidence references are minimized, source content is
not copied into actor biographies, and stereotypes or unsupported traits must
produce uncertainty/abstention rather than invented certainty.

## Workline And Fragment Composition

Emission mode: `LANE_LOCAL_TASK_GRAPH`. A new Coordination Graph is not needed:
W-025 owns one integrated outcome and W-004 is a protected consumer, not an
independent producer or materialization workline for this slice.

| Fragment | Disposition | Binding / Resolution | Tests / Evaluator |
|---|---|---|---|
| `GF-001@1` | selected | user objective -> versioned acceptance contract | behavior ledger / functional QA |
| `GF-004@1` | selected | acceptance -> derivation/population/proposal contracts | schema/runtime compatibility / read-only architecture review |
| `GF-008@1` | merged into GF-004 | schema, resolver, evaluator, artifact writer are one serialized implementation | focused integration tests / validate-change |
| `GF-009@1` | not applicable | no live target or complete product journey is part of this framework slice | omission preserves explicit live/calibration `NOT_RUN` |
| `GF-101@1` | selected overlay | privacy, evidence minimization, stereotype, secret, and mutation boundaries | negative probes / secure-design review |

| Node | Obligation | Requires | Write Scope | Gate | Status |
|---|---|---|---|---|---|
| `W-025-N01` | author versioned product/persona simulation contracts | user authorization | persona docs, schemas, lane/report | `W-025-G01` | in progress |
| `W-025-N02` | implement resolver, dry-run derivation, and proposal artifact wiring | `W-025-G01` | `scripts/cascade/`, evaluator schema | `W-025-G02` | pending |
| `W-025-N03` | update authoring/execution/evaluation workflow contracts | `W-025-G01` | affected skills/templates/checklists | `W-025-G03` | pending |
| `W-025-N04` | execute focused and full validation plus fixed-point review | `W-025-G02`, `W-025-G03` | tests, report, status only | `W-025-GT` | pending |

Attempt maximum is two per node. A contract failure reopens N01 and its direct
consumers; a runtime failure reopens N02; documentation drift reopens N03.
Exhaustion routes to `BLOCKED -> plan-change`; it never weakens a gate.

## File Ownership

| Path Or Area | W-025 Access | Protected Owner / Rule |
|---|---|---|
| `docs/product/personas/`, `compose-spec`, `synthesis-to-spec` | write | product persona remains human-reviewed authority |
| `evals/simulations/*persona*`, population/output schemas | write | versioned public contracts; preserve v1 compatibility where declared |
| `scripts/cascade/{simulations,simulation-definitions,evaluations,campaigns,campaign-artifacts,validate}*` | write | serialized root implementation; preserve W-004 safety invariants |
| simulation authoring/execution/evaluation skills | write | no operator/evaluator authority collapse |
| W-004/WG-001 state | reconciliation-only | no attempt-5 repair or acceptance claim |
| W-005-W-012 adapters/providers | read-only | no surface implementation |

## Validation Plan

- `bun test scripts/cascade/simulation-definitions.test.ts scripts/cascade/simulations.test.ts scripts/cascade/evaluations.test.ts scripts/cascade/campaign-artifacts.test.ts scripts/cascade/campaigns.test.ts`
- `bun scripts/cascade.ts simulation derive-population P-999 --simulation simulation-correctness-fixture --mode coverage --dry-run`
- `bun scripts/cascade.ts campaign catalog --check`
- `bun scripts/cascade.ts campaign self-test`
- `bun scripts/cascade.ts validate`
- `bun scripts/cascade.ts eval catalog --check`
- `bun scripts/cascade.ts eval self-test`
- `bun scripts/cascade.ts target self-test`
- `bun scripts/cascade.ts campaign catalog --check`
- `bun scripts/cascade.ts campaign self-test`
- `bun test scripts/cascade`
- `git diff --check` and stale-reference/digest checks

## Doc Routing Decision Matrix

| Fact | Owner Target | Action | Evidence | Next Gate |
|---|---|---|---|---|
| persona revisions need evidence/confidence and use constraints | persona template/index | update | research synthesis plus safety boundary | compose-spec checks |
| persona-to-population bridge is explicit and digest-bound | simulation schemas/runtime | update | schema and resolver tests | implement-change |
| synthetic findings are proposals only | synthesis/simulation skills and proposal schema | update | negative schema/runtime tests | review-change |
| product requirements, journeys, scenarios, brand, and design | existing owners | no change | framework capability does not define a target persona or UI | closeout |

## Current Frontier

- Ready/in progress: `W-025-N01`.
- Pending: `W-025-N02`, `W-025-N03`, `W-025-N04`.
- Terminal gate: `W-025-GT` requires current-source contract, runtime,
  workflow, focused/full validation, architecture/security review, and exact
  `NOT_RUN` residual-risk statements.
- W-004 remains `BLOCKED`; this lane can invalidate source-bound historical
  evidence but cannot accept or unblock WG-001 nodes.

