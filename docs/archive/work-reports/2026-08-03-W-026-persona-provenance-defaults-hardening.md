# Work Lane: W-026 Persona Provenance And Defaults Hardening

Status: `COMPLETE`
Planning Status: `TERMINAL`
Plan Revision: `1`
Owner: `agent-engineer`
Created: 2026-08-03
Lane Model: `sequential-pipeline`
Next Gate: `closeout -> archive-work`
Execution Surface: `root`
Dispatch State: `COMPLETED`
Dispatch Authorization: user request to implement the audited fixes, 2026-08-03
Runtime Handle: current root task

## Request

Implement the confirmed persona-derivation and refinement-evidence fixes, check
the reusable defaults that shape those contracts, repair stale WG-001 status
projections, and preserve unrelated dirty archive work.

## Intended Behavior And Non-Goals

- Only `reviewed` or `approved` product-persona revisions may seed an approved
  derivation; draft and superseded persona sources fail closed.
- Persona-derived weight semantics are authored explicitly. `test-allocation`
  is the safe default; `estimated-prevalence` is available only to a
  representative derivation with digest-bound research or behavioral data,
  a reference window, sample description, and reviewer.
- The generator input digest is reproducible from the complete manifest after
  removing only the digest field itself, so changed inputs cannot retain a
  stale generator identity.
- Every refinement artifact is terminally linked to its exact evaluation
  receipt candidate, evaluator, source manifest persona/derivation digests,
  and frozen evaluation-input evidence paths.
- Reusable persona and campaign templates describe the same defaults enforced
  by runtime. Generic synthetic starter actors remain framework scaffolding,
  not persona or prevalence evidence.
- This lane does not validate persona realism, collect external evidence,
  promote a product-persona revision, repair WG-001-N04/N05, or authorize an
  attempt-5 review.

## Acceptance Criteria

- Negative tests reject draft/superseded persona sources, implicit or
  unsupported prevalence semantics, stale generator input digests, unbound
  proposal candidates, missing source bindings, and missing frozen evidence.
- Positive tests preserve deterministic P-999 derivation, legacy population
  compatibility, Codex proposal materialization, and complete campaign
  finalization.
- Evaluation receipts carry unique proposal candidate digest bindings, and
  terminal artifact validation requires an exact one-to-one proposal set.
- Persona, campaign, checklist, and index defaults state the enforced status,
  weighting, digest, evidence, and proposal-linkage rules.
- WG-001 live projections report plan revision 17, N03 `PENDING` with current
  validation `NOT_RUN`, and N04/N05 `BLOCKED` after exhausted attempt 4.
- Focused tests, all Cascade tests, validator, generated catalogs, self-tests,
  dry-run derivation, whitespace, and stale-reference checks pass on one
  current source identity.

## Impact And Defaults Decision

| Surface | Current Default | Disposition |
|---|---|---|
| Product persona template/index | evidence and uncertainty are explicit, but executable eligibility is only prose | update reviewed/approved derivation eligibility |
| Persona derivation manifest/runtime | representative mode silently implies prevalence; generator digest is syntax-only | update to explicit safe semantics and reproducible digest |
| Campaign design/checklist | asks for weight semantics and frozen proposal evidence | update with concrete safe default and terminal linkage |
| Generic simulation starter | synthetic fixture with an explicit target-claim disclaimer | keep; clarify weights are test allocation, not prevalence |
| Architecture `experiment` and `stack-selection` defaults | immutable evidence, source/digest traceability, proof-required uncertainty, separate promotion | keep as reference guidance; persona runtime remains the enforcing owner |
| Product requirements, journeys, scenarios, brand, and design | no target persona or UI behavior is defined by this repair | no change |

## Task Graph And Fragment Composition

Emission mode: `LANE_LOCAL_TASK_GRAPH`. W-026 owns one serialized contract and
implementation slice. W-004 is a protected stale consumer and not a producer
or independently dispatched workline for this repair.

| Fragment | Disposition | Binding |
|---|---|---|
| `GF-004@1` | selected | versioned derivation, population, evaluation-receipt, and artifact contracts |
| `GF-101@1` | selected overlay | evidence minimization, source identity, evaluator separation, and fail-closed mutation boundaries |

| Node | Obligation | Requires | Gate | Status |
|---|---|---|---|---|
| `W-026-N01` | reconcile scope, defaults, consumers, and contract changes | user authorization | `W-026-G01` | accepted |
| `W-026-N02` | implement runtime/schema/default repairs and focused tests | `W-026-G01` | `W-026-G02` | accepted |
| `W-026-N03` | repair stale WG-001 projections and regenerate sources | `W-026-G02` | `W-026-G03` | accepted |
| `W-026-N04` | execute fixed-point validation and read-only review | `W-026-G03` | `W-026-GT` | accepted |

Contract failure reopens N01 and direct consumers. Runtime or terminal-evidence
failure reopens N02. Projection or generated-source drift reopens N03. Two
failed attempts at one node route to `BLOCKED -> plan-change`; gates never
weaken to manufacture completion.

## File Ownership And Regression Map

| Area | Access | Required Preservation |
|---|---|---|
| `scripts/cascade/persona-simulations.ts` and simulation schemas/fixtures | write | population v1 compatibility and deterministic dry-run |
| evaluation receipt, campaign artifact runtime, and focused tests | write | hard gates, evaluator independence, immutable finalization |
| persona/campaign reusable defaults | write | evidence minimization and proposal-only promotion boundary |
| W-004/WG-001 projections | reconciliation-only | no retry, acceptance, dispatch, or topology change |
| existing archive moves and unrelated dirty files | preserve | no reset, cleanup, commit, push, or broad staging |

## Validation Plan

- `npx --yes bun@1.3.3 test scripts/cascade/simulations.test.ts scripts/cascade/simulation-definitions.test.ts scripts/cascade/evaluations.test.ts scripts/cascade/campaign-artifacts.test.ts`
- `npx --yes bun@1.3.3 scripts/cascade.ts simulation derive-population P-999 --simulation simulation-correctness-fixture --mode coverage --dry-run`
- all validator, catalog, self-test, target, campaign, aggregate test, diff,
  stale-projection, and archive-reference gates from `AGENTS.md` and W-025

## Source And Evidence Boundary

The current implementation checkout and schemas outrank the archived W-025
completion claim where they disagree. W-025 remains historical evidence for
the original bridge, not authority that these newly confirmed gaps are fixed.
Architecture-default pairs were inspected as candidate guidance and are not
adopted as persona runtime ownership. Live provider-backed proposal quality,
external research, target calibration, deployment, and release eligibility
remain `NOT_RUN`.

## Terminal Evidence

- `W-026-G01`, `W-026-G02`, `W-026-G03`, and `W-026-GT`: `ACCEPTED`.
- Owned source manifest digest:
  `202099051f0810122d1524a98e2e0e66585b76eaf55be84a5f206fc26b8cc1c3`
  over 21 runtime, schema, fixture, generated-catalog, test, and reusable-default
  files; base `HEAD` is `7112546cc856d1bc7f4b4409ef80170c71b9c236`.
- Focused persona/evaluation/artifact tests: `39/39 PASS`; aggregate Cascade
  tests: `84/84 PASS` with Bun 1.3.3.
- Derivation dry-run matches the checked-in P-999 population; generator input
  digest is `05ea506bafbaf1fde675f5e4ef10ea064eef058572143d970425f2604a1f0690`.
- Cascade validator, 44-skill/368-scenario harness catalog, harness self-test,
  target self-test, seven-entry campaign catalog, campaign self-test, and
  whitespace checks pass. Campaign catalog digest is
  `213a94b684e6c6341924fcb8723e2483050fa5cd198db0bc83f8b3cd26e962b4`.
- Fixed-point architecture/security review added evaluation-input manifest
  path/digest verification; no scoped findings remain open.
- W-004 remains `BLOCKED` at WG-001 plan revision 17/work-graph revision 11.
  N03 current-source revalidation is `NOT_RUN`; N04/N05 remain failed and
  exhausted after attempt 4. W-026 does not authorize attempt 5.
- Provider-backed refinement quality, external research, persona promotion,
  target calibration, deployment, and release eligibility remain `NOT_RUN`.
- Completion report:
  `docs/work/reports/2026-08-03-persona-provenance-defaults-hardening.md`.
- Commit, push, publication, provider spend, and broad staging: `NOT_REQUESTED`.
