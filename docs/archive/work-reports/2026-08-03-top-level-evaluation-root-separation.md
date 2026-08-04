# Top-Level Evaluation Root Separation Completion

Date: 2026-08-03
Lane: `W-028`
Status: `COMPLETE`
Terminal receipt: `W028-CLOSEOUT-20260803-A1`

## Outcome

Cascade now has two peer evaluation-source authorities:

- `harness-evals/` contains Cascade skill, route, response, trace, rubric, and
  judge evaluation cases;
- `product-evals/` contains product-evaluation campaigns, claims, policies,
  oracles, metrics, treatments, calibrations, shared simulation contracts, and
  simulation definitions.

The W-027 semantic boundary remains nested under
`product-evals/simulations/{harness,product}/`: framework fixtures and target
product simulations are distinct even though both use the product-evaluation
campaign runtime. There is no live compatibility `evals/` directory. New
campaign evidence defaults to `.artifacts/product-evals/`; ignored historical
`.artifacts/campaigns/` runs retain their execution-era identity.

## Bugs And Staleness Repaired

- The isolated Playwright task still loaded the removed generic browser-fixture
  path. It now loads the harness-scoped fixture under `product-evals/`.
- Target inventory exclusions were path-fragment based and could admit parts of
  the new evaluation trees. Both top-level roots are now excluded explicitly.
- Config schema defaults could drift without failing validation. The schema now
  requires and constrains all six evaluation source/artifact roots.
- Validator coverage now requires both peer roots and rejects any reintroduced
  live `evals/` root.
- Generated harness and campaign catalogs were regenerated from their new
  authorities.
- Post-closeout campaign catalog checks found generated drift while shared
  campaign runtime sources in the dirty checkout were also changing. Closeout
  was reopened, unrelated work was preserved, adapter metadata was regenerated
  into the catalog, and the latest fixed point was rebound before archival.
- P-999 persona derivation provenance correctly failed closed after its bound
  file path moved. The generator input, derivation, persona, and population
  digests were rebound to the current source identity.

## Defaults Audit

| Purpose | Canonical Default |
|---|---|
| Harness-evaluation source | `harness-evals/` |
| Harness-evaluation artifacts | `.artifacts/harness-evals/` |
| Product-evaluation source | `product-evals/` |
| Product-evaluation artifacts | `.artifacts/product-evals/` |
| Harness simulation definitions | `product-evals/simulations/harness/` |
| Product simulation definitions | `product-evals/simulations/product/` |
| `simulation init` | product simulation root |
| Historical campaign artifacts | `.artifacts/campaigns/`, preserved and not a new-run default |

## Validation And Review

- implementation/default source digest:
  `31ee0face4704068e768fb7982af5df1cc6eb67e8fb6d502c8d31623e1808983`;
  base `HEAD`: `7112546cc856d1bc7f4b4409ef80170c71b9c236`;
- focused path/catalog/target/campaign/simulation/evaluation tests: `72/72
  PASS`;
- `npx --yes bun@1.3.3 test scripts/cascade`: `89/89 PASS`;
- Cascade validator: `PASS`, 9 agents, 44 skills, zero project leakage;
- harness catalog/self-test: `PASS`, 368 scenarios and 20 self-test cases,
  catalog digest
  `67607bcf956e21217f79084eb2cf0ba454e46948b2e6739cabc91d764d10efbe`;
- target self-test: `PASS`, 26 cases;
- campaign catalog/self-test: `PASS`, seven entries, catalog digest
  `7c69a0f1cb5010cb4e4b0666cdbc20aeb8e60f98361aa707a4f0ac38a2a71299`;
- campaign calibration fixture: `CALIBRATED`; release scope: `NOT_RUN`;
- initializer and persona-derivation dry-runs: `PASS`;
- isolated Playwright browser fixture: `1/1 PASS`;
- JSON parsing, legacy-root, stale-path, root-layout, archive-hash, and
  whitespace checks: `PASS`;
- fixed-point Standards review: `PASS`;
- fixed-point Spec review: `PASS`.

The review comparison base is the current target `HEAD`; the reviewed state is
an uncommitted active-worktree slice bound by the source digest above. Commit
count is `NOT_APPLICABLE`. Review freshness ends when that digest, the user
request, W-028 plan revision, or governing root contracts change.

## Cleanup And Work-State Reconciliation

W-028 is terminal and eligible for immediate archive. Previously completed
W-013 through W-027 worklines remain in their archive sets; their frozen files
were not rewritten. W-004 stays active and `BLOCKED` at WG-001 plan revision 19
and work-graph revision 11 because W-025 through W-028 changed shared current
sources. Its current-source N03 gate is `NOT_RUN`, and its failed/exhausted
N04/N05 reviews are unchanged.

## Residual Boundary

The separation and deterministic framework fixtures are validated. No target
product simulation was executed, no target model was calibrated, and no
deployment or release gate ran. Product execution, target calibration,
deployment, and release eligibility remain `NOT_RUN`.

No commit, push, publication, provider spend, broad staging, or live simulation
was requested or performed.
