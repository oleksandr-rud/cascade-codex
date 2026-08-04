# Work Lane: W-028 Top-Level Evaluation Root Separation

Status: `COMPLETE`
Planning Status: `TERMINAL`
Plan Revision: `1`
Owner: `agent-engineer`
Created: 2026-08-03
Lane Model: `sequential-pipeline`
Next Gate: `closeout -> archive-work`
Execution Surface: `root`
Dispatch State: `COMPLETED`
Dispatch Authorization: user request for separate `harness-evals/` and
`product-evals/` folders, 2026-08-03
Runtime Handle: current root task

## Request And Intended Behavior

Replace the mixed top-level legacy `evals/` tree with two explicit peer authorities:

- `harness-evals/` owns Cascade skill, route, response, trace, and judge cases;
- `product-evals/` owns simulation campaigns, product-evaluation definitions,
  shared simulation schemas, and the already-separated
  `simulations/{harness,product}/` roots.

New campaign evidence defaults to `.artifacts/product-evals/`; existing ignored
`.artifacts/campaigns/` history remains frozen historical evidence. The cutover
has no compatibility alias and the validator rejects a live legacy `evals/` root.

## Assumptions And Non-Goals

- The user means canonical source and new evidence roots, not rewriting
  historical archive capsules or immutable ignored runs.
- The W-027 `simulation_scope` contract remains intact under
  `product-evals/simulations/{harness,product}/`.
- This lane does not execute a live product simulation, recalibrate a target,
  reopen W-004, commit, push, or publish.

## Acceptance Criteria

- No current source, config, runtime, test, generated catalog, or live doc
  depends on the legacy `evals/` root; frozen archive and ignored historical evidence may retain
  execution-era paths.
- Harness catalog generation, target inventory exclusions, campaign resolution,
  simulation initialization, persona derivation, and evaluation receipts resolve
  only the new roots.
- Validator coverage requires both roots, rejects the legacy root, and preserves
  the nested harness/product simulation-scope checks.
- New campaign runs default to `.artifacts/product-evals/`; historical campaign
  runs are not moved or rewritten.
- Focused tests, aggregate tests, validators, generated catalog checks,
  self-tests, JSON parsing, stale-path scans, and `git diff --check` pass.

## Task Graph

Emission mode: `LANE_LOCAL_TASK_GRAPH`; one serialized path migration owns all
runtime and documentation consumers.

| Node | Obligation | Requires | Gate | Status |
|---|---|---|---|---|
| `W-028-N01` | inventory roots, defaults, consumers, and protected history | user authorization | `W-028-G01` | accepted |
| `W-028-N02` | move roots and update runtime/schema/default consumers | `W-028-G01` | `W-028-G02` | accepted |
| `W-028-N03` | regenerate catalogs and repair stale references | `W-028-G02` | `W-028-G03` | accepted |
| `W-028-N04` | fixed-point review, validation, closeout, and archive | `W-028-G03` | `W-028-GT` | accepted |

Any path/runtime failure reopens N02. Generated or doc drift reopens N03.
Validation failure reopens the earliest responsible node. No gate weakens to
manufacture completion.

## Protected Contracts

- Preserve unrelated dirty files and existing W-025 through W-027 archive
  artifacts byte-for-byte.
- Preserve W-004's blocked/exhausted state; this migration only invalidates its
  current-source validation evidence.
- Preserve harness evaluation and product simulation semantics, deterministic
  fixtures, persona provenance, collision refusal, and immutable evidence rules.
- Leave commit, push, publication, broad staging, live runs, and provider spend
  outside scope.

## Validation Plan

- focused Bun tests for common paths, harness catalogs, target inventory,
  campaign resolution, simulation definitions, initialization, evaluation, and
  artifacts;
- all commands in `AGENTS.md` using exact Bun 1.3.3 when Bun is absent;
- generated-catalog regeneration/checks, JSON parsing, legacy-root and stale-path
  scans, archive-hash preservation checks, and whitespace validation.

## Terminal Evidence

- `W-028-G01`, `W-028-G02`, `W-028-G03`, and `W-028-GT`: `ACCEPTED`.
- Terminal receipt `W028-CLOSEOUT-20260803-A1` binds plan revision 1, base
  `HEAD` `7112546cc856d1bc7f4b4409ef80170c71b9c236`, current uncommitted
  implementation/default source digest
  `31ee0face4704068e768fb7982af5df1cc6eb67e8fb6d502c8d31623e1808983`,
  producer `agent-engineer` in the current root task at
  `2026-08-03T21:06:07Z`, and the evidence below. Any scoped source, schema,
  catalog, default, or validation change invalidates this receipt.
- Focused path/catalog/target/campaign/simulation/evaluation tests: `72/72
  PASS`; aggregate Cascade tests: `89/89 PASS` with Bun 1.3.3.
- Cascade validator, 44-skill/368-scenario harness catalog, harness self-test,
  target self-test, seven-entry campaign catalog, campaign self-test, JSON
  parsing, root/stale-path scans, Playwright browser fixture, archive-hash
  preservation, and whitespace checks pass. Harness catalog digest is
  `67607bcf956e21217f79084eb2cf0ba454e46948b2e6739cabc91d764d10efbe`;
  campaign catalog digest is
  `7c69a0f1cb5010cb4e4b0666cdbc20aeb8e60f98361aa707a4f0ac38a2a71299`.
- Target initializer dry-run produces 19 collision-free files under
  `product-evals/`; P-999 population derivation resolves under the harness
  simulation subroot. Persona derivation provenance was rebound after the
  physical move and its stale digest failed closed before repair.
- Fixed-point Standards and Spec review against the user request and this lane
  is `PASS`. This self-review is findings evidence, not an independent W-004
  acceptance receipt.
- W-004 remains `BLOCKED` at WG-001 plan revision 19/work-graph revision 11.
  N03 current-source revalidation is `NOT_RUN`; N04/N05 remain failed and
  exhausted after attempt 4. W-028 does not authorize attempt 5.
- Product simulation execution, target calibration, deployment, and release
  eligibility remain `NOT_RUN`.
- Completion report:
  `docs/work/reports/2026-08-03-top-level-evaluation-root-separation.md`.
- Commit, push, publication, provider spend, and broad staging:
  `NOT_REQUESTED`.
