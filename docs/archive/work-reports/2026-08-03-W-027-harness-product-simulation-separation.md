# Work Lane: W-027 Harness And Product Simulation Separation

Status: `COMPLETE`
Planning Status: `TERMINAL`
Plan Revision: `1`
Owner: `agent-engineer`
Created: 2026-08-03
Lane Model: `sequential-pipeline`
Next Gate: `closeout -> archive-work`
Execution Surface: `root`
Dispatch State: `COMPLETED`
Dispatch Authorization: user request to separate harness simulations from product simulations, 2026-08-03
Runtime Handle: current root task

## Request

Separate Cascade's deterministic harness/framework simulations from target
product simulations, implement the runtime and default changes, check stale
paths and bugs, and preserve unrelated dirty work.

## Intended Behavior And Non-Goals

- Every simulation declares `simulation_scope` as `harness` or `product` and
  lives under the matching `evals/simulations/<scope>/<simulation-id>/` root.
- The existing simulation-correctness fixture moves to `harness/`; generated
  target packages default to `product/` and carry an explicit product scope.
- Campaign resolution fails closed on missing, invalid, or path-mismatched
  scope. Harness simulations cannot bind non-framework calibration.
- The generated campaign catalog exposes simulation scope so selection and
  reports do not infer authority from titles, tiers, or fixture names.
- Persona-derived population preview resolves one exact simulation ID across
  both roots and fails on missing or ambiguous identities.
- `evals/harness/` remains the distinct skill/agent harness-evaluation corpus;
  it is not renamed or conflated with simulation-engine fixtures.
- This lane does not create a real target-product simulation, execute live
  product behavior, calibrate a product model, or make release claims.

## Acceptance Criteria

- JSON schema and executable validation require scope and matching physical
  roots; negative tests cover mismatches and harness/non-fixture calibration.
- The correctness fixture and every live reference use the harness root; no
  non-archived generic correctness-fixture path remains.
- The initializer dry-run writes only under `evals/simulations/product/` and
  renders an explicit product-scoped manifest and design report.
- Persona derivation preview still resolves P-999 under the migrated harness
  root and fails closed on ambiguous simulation identities.
- Catalog entries include `simulation_scope`, generated catalog checks pass,
  and docs/defaults explain claim authority and the separate harness-eval
  corpus.
- Focused tests, all Cascade tests, validator, generated catalogs, self-tests,
  whitespace, and stale-reference scans pass on one current source identity.

## Architecture And Defaults Decision

| Surface | Decision | Reason |
|---|---|---|
| Physical layout | `evals/simulations/harness/` and `evals/simulations/product/` | visible ownership and review boundary without replacing shared schemas |
| Manifest contract | required `simulation_scope` | machine-enforced authority independent of path naming |
| Campaign manifest | derive scope from resolved simulation; expose it in catalog | avoid duplicated declarations that can drift |
| Target initializer | default to `product` | command is documented as the target-project bootstrap path |
| Harness calibration | require `framework_fixture: true` | harness mechanics cannot silently become target/release evidence |
| Harness evaluation | retain `evals/harness/` | scenario/trace grading is a different system from campaign simulation fixtures |
| Compatibility bridge | none | stale generic paths fail directly instead of preserving ambiguous authority |

## Task Graph

Emission mode: `LANE_LOCAL_TASK_GRAPH`. One serialized contract migration owns
all shared paths; W-004 is a protected consumer, not an independently
dispatched workline.

| Node | Obligation | Requires | Gate | Status |
|---|---|---|---|---|
| `W-027-N01` | inventory roots, contracts, defaults, and consumers | user authorization | `W-027-G01` | accepted |
| `W-027-N02` | implement scoped roots, resolver rules, initializer, and tests | `W-027-G01` | `W-027-G02` | accepted |
| `W-027-N03` | update docs, generated catalog, and W-004 projection | `W-027-G02` | `W-027-G03` | accepted |
| `W-027-N04` | execute fixed-point validation and stale-path review | `W-027-G03` | `W-027-GT` | accepted |

Contract or path failure reopens N02. Documentation, catalog, or protected
consumer drift reopens N03. Validation failure reopens the earliest responsible
node. Two unchanged failed attempts route to `BLOCKED -> plan-change`; gates do
not weaken to manufacture completion.

## File Ownership And Regression Map

| Area | Access | Required Preservation |
|---|---|---|
| simulation schemas, definitions, initializer, tests, fixture paths | write | deterministic behavior, collision refusal, persona provenance, all current campaigns |
| campaign catalog and simulation-campaign defaults/docs | write | tier/provider rules, immutable evidence, claim/calibration boundaries |
| W-004/WG-001 projections | reconciliation-only | no retry, acceptance, dispatch, topology, or exhausted-review change |
| existing archive moves and unrelated dirty files | preserve | no reset, cleanup, commit, push, or broad staging |

## Validation Plan

- `npx --yes bun@1.3.3 test scripts/cascade/simulation-definitions.test.ts scripts/cascade/simulations.test.ts`
- `npx --yes bun@1.3.3 scripts/cascade.ts simulation init generated-example --owner-lane W-123 --reference-date 2026-08-03 --dry-run`
- `npx --yes bun@1.3.3 scripts/cascade.ts simulation derive-population P-999 --simulation simulation-correctness-fixture --mode coverage --dry-run`
- all tests and validation commands in `AGENTS.md`, plus stale generic-path,
  catalog-scope, schema/runtime parity, and whitespace scans

## Source And Evidence Boundary

The current implementation checkout, executable resolver, and schemas are the
authority for this migration. Historical run receipts and archived work remain
valid for their recorded source digests but do not prove the migrated current
source. Product simulation execution, product calibration, deployment, and
release eligibility remain `NOT_RUN`.

## Terminal Evidence

- `W-027-G01`, `W-027-G02`, `W-027-G03`, and `W-027-GT`: `ACCEPTED`.
- Terminal receipt `W027-CLOSEOUT-20260803-A1` binds plan revision 1, base
  `HEAD` `7112546cc856d1bc7f4b4409ef80170c71b9c236`, current uncommitted
  implementation/default source digest
  `28d468ad9dab022b104b09cbf799e391cd9308dbc9ef753b2eb03238a081c8b6`,
  producer `agent-engineer` in the current root task at
  `2026-08-03T20:41:01Z`, and the evidence below. Any scoped source, schema,
  catalog, default, or validation change invalidates this receipt.
- Focused definition/initializer/validator tests: `23/23 PASS`; aggregate
  Cascade tests: `86/86 PASS` with Bun 1.3.3.
- Cascade validator, 44-skill/368-scenario harness catalog, harness self-test,
  target self-test, seven-entry campaign catalog, campaign self-test, JSON
  parse, whitespace, generic-path, top-level-root, and manifest-scope checks
  pass. Campaign catalog digest is
  `aeb8eaedc7436f4189b4025479e04a7fb267106bf3172e6196aaafb7ea77cd0c`.
- Target initializer dry-run produces 19 collision-free files and places every
  simulation-definition file under `evals/simulations/product/`. P-999
  derivation preview resolves its exact harness-scoped derivation and existing
  population.
- Fixed-point Standards and Spec review against the user request and this lane
  is `PASS` after adding validator coverage for unreferenced manifests,
  unexpected generic roots, and duplicate cross-scope IDs. This self-review is
  findings evidence, not an independent W-004 acceptance receipt.
- W-004 remains `BLOCKED` at WG-001 plan revision 18/work-graph revision 11.
  N03 current-source revalidation is `NOT_RUN`; N04/N05 remain failed and
  exhausted after attempt 4. W-027 does not authorize attempt 5.
- Product simulation execution, target calibration, deployment, and release
  eligibility remain `NOT_RUN`.
- Completion report:
  `docs/work/reports/2026-08-03-harness-product-simulation-separation.md`.
- Commit, push, publication, provider spend, and broad staging:
  `NOT_REQUESTED`.
