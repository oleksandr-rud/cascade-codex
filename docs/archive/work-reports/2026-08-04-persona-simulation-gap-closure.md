# W-029 Persona And Simulation Gap Closure

Date: 2026-08-04
Lane: `W-029`
Status: `COMPLETE`
Terminal Gate: `W-029-GT ACCEPTED`
Owner: `agent-engineer`

## Outcome

Cascade now has an executable governed loop from reviewed product-persona
sources to typed synthetic populations and from simulation proposals back to
human-reviewed persona revision work. Synthetic output remains proposal-only.

Implemented outcomes:

- governed derivation evidence with exact digest, authority, reference window,
  rights, sensitivity, retention, purpose, prohibited uses, and restricted-
  evidence encryption/access attestation;
- typed decision, communication, memory, and abstention actor policies;
- exact claim-level `population_authority` bound to `scope.population_id`;
- collision-safe deterministic population `--write` support;
- verified-run, append-only refinement disposition receipts with external-
  evidence manifests and no direct persona mutation;
- local append-only artifact/privacy defaults with raw-sensitive exclusion and
  remote storage/export disabled;
- current schemas, fixture, starter template, config/schema defaults, docs,
  tests, and generated campaign catalog.

## Review Findings Repaired

| Finding | Disposition | Evidence |
|---|---|---|
| any persona derivation could satisfy an unrelated claim population | repaired | authority reducer and resolver bind exact `population_id`; negative test |
| restricted-evidence attestation was documented but not encoded | repaired | derivation schema/runtime require encryption/access attestation |
| artifact-shaped proposal paths could bypass immutable run provenance | repaired | disposition CLI verifies completed `CampaignArtifactStore` finalization and run identity |
| persona index implied a placeholder P-001 | repaired | P-001 explicitly unassigned pending real governed target evidence |

## Validation

| Check | Result |
|---|---|
| `npx --yes bun@1.3.3 test scripts/cascade` | `PASS`, 101 tests / 358 expectations |
| `npx --yes bun@1.3.3 scripts/cascade.ts validate` | `PASS`, 9 agents / 44 skills / zero project leakage |
| harness eval catalog and self-test | `PASS`, 44 skills / 368 scenarios / 20 self-test cases |
| target self-test | `PASS`, 26 cases |
| campaign catalog check and self-test | `PASS`, 7 campaigns, digest `006fd8ad45d0b51c8544cdfe5ef1b6788afd5f474053eda46a757f5011dea236` |
| JSON parse / artifact cleanup / `git diff --check` | `PASS` |

## Preserved Limits

- No non-fixture product persona or external research evidence was fabricated.
- No target-product simulation exists or executed.
- Model-backed persona generation remains a separately authorized `GAP`.
- Framework calibration remains `CALIBRATED` for mechanics only;
  `release_scope=NOT_RUN`.
- Independent W-004/GF-101 review, platform adapters, deployment, and release
  eligibility remain separate gates.
- Commit, push, and publication were not requested.
