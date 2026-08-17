# Simulation Intake And Agent Bridge Implementation Plan

Status: `IN_REVIEW`; revision-24 proportional-routing clarification with intake-v6/action-binding-v2 and current W-031 v41/core42 mechanical parity at immutable r57
Plan Revision: `24`
Owner Lane: `W-032`

## Intended Behavior

Turn a simulation request into one inspectable chain from W-031 claims to a
scope-correct campaign, product brief when required, exact action policies,
an explicit authored product seed map, and separated author/operator/evaluator
handoffs. Fail closed on missing, ambiguous, stale, or cross-authority inputs.

## Assumptions And Success Criteria

- W-031 owns generic request admission; W-032 consumes its Task Envelope.
- W-030/`PB-XXX` owns deterministic product-context projection; W-032 binds it
  rather than reimplementing product discovery.
- W-004/WG-001 owns shared campaign/runtime/policy/evidence contracts; W-032
  adds the admission bridge and is a prerequisite for product execution.
- Success requires focused tests, generated catalog refresh, repository
  validation, fixed-point review, and exact `NOT_RUN` reporting.

## Worklines And Slices

| Workline | Slice | Primary contracts | Writes | Evidence / repair boundary |
|---|---|---|---|---|
| `WL-01` | scope, intake, and seed schema | `SIB-001`, `SIB-003` | intake/seed schemas, campaign `intake_file`/`seed_binding_file`, resolver types and bounded seed reader | schema/definition/read-integrity tests; repair before consumers |
| `WL-02` | Task Envelope, brief, and seed compiler | `SIB-002`, `SIB-003` | `simulation-intake.ts`, CLI, Task Envelope snapshots and same-buffer seed projection | deterministic compile/check/write; stale or unsafe brief/seed blocks |
| `WL-03` | action-policy equality | `SIB-004` | compiler and resolver action-binding-v2 policy bindings | canonical action-binding digest plus zero/overlap/deny/mismatch tests; fail before run |
| `WL-04` | templates and product specs | `SIB-001`, `SIB-003` | starter seed artifact, simulation-author guidance, catalog, brief, product ledgers | authored seed/brief/catalog fixed point; draft starter remains non-runnable |
| `WL-05` | agent handoffs and execution gate | `SIB-005` | agent skills/load orders, campaign run gate | role wiring validation; non-READY product run denied |
| `WL-06` | integration and closeout | `SIB-006` | W-031/W-032/WG-001 projections, catalogs, report | full regression/review; reopen earliest failed workline |

The lane uses a sequential lane-local Task Graph because every slice consumes
the prior contract and shares runtime/template/doc files. Stable gates
`W-032-G1` through `W-032-GT` distinguish local candidates from accepted
producer inputs. A separate Coordination Graph is not created. WG-001 revision
13 consumes `W-032-GT` as the product-run intake prerequisite while W-004
remains merge owner.

The terminal join requires accepted `W-031-G6`, accepted `WG-001-N05`,
accepted archived `W-030-GT`, accepted lane gates `W-032-G1` through
`W-032-G6`, and independent integration, functional, security, and harness
receipts. Local regression success cannot substitute for those acceptances.

## Behavior Examples

- Given “create a product simulation from PB-001 and execute it,” admission
  selects connected simulation governance and the author compiles a product
  intake before any operator run.
- Given a product starter, initialization emits a valid DRAFT intake; campaign
  validation can inspect it, but campaign execution refuses it.
- Given a product campaign, the author maps every active source claim exactly
  once by ID. Missing/duplicate mappings, no `SEEDED` row, unknown campaign
  claim/scenario/task IDs, or stale campaign/source digests block READY.
- Given a seed file/ancestor symlink, pathname substitution, oversized bytes,
  invalid UTF-8, or invalid JSON, compile/check/READY/run fails closed without
  projecting or digesting different bytes.
- Given a seed ancestor moved outside the seed-binding root after open and the
  same inode hard-linked back at the old pathname, the read rejects; repository
  containment and pathname identity alone cannot authorize the seed.
- Given a product simulation with a harness-root intake path, or a harness
  simulation with a product-root intake path, schema validation, preview,
  check, write, READY resolution, and run preflight fail before replacement,
  reservation, or dispatch even when the embedded intake scope matches.
- Given a harness campaign or harness intake, a product seed-binding reference
  is rejected and no mapping artifact is inferred.
- Given one action with no policy or two matching policies, intake compilation
  is BLOCKED with the exact task/action and policy identities.
- Given a populated intake action, schema v6 binds the canonical
  `cascade-action-binding-v2` version and digest. Missing v2 fields or a legacy
  action digest fail closed; an empty DRAFT starter remains valid with no
  synthetic placeholder action binding.
- Given task policy IDs that omit or add a policy relative to computed
  applicability, compilation/resolution fails closed.
- Given a changed Task Envelope, brief output, task action, or policy file, the
  prior READY intake is stale and cannot execute.
- Given evaluated synthetic-persona findings, the evaluator emits a proposal;
  product documents change only after synthesis, external evidence where
  required, and accountable review.

## Validation

```bash
npx --yes bun@1.3.3 test scripts/cascade/admission.test.ts \
  scripts/cascade/common.test.ts \
  scripts/cascade/simulation-intake.test.ts \
  scripts/cascade/simulations.test.ts \
  scripts/cascade/simulation-definitions.test.ts
npx --yes bun@1.3.3 scripts/cascade.ts admission corpus
npx --yes bun@1.3.3 scripts/cascade.ts brief validate PB-002
npx --yes bun@1.3.3 scripts/cascade.ts brief generate PB-002 --check
npx --yes bun@1.3.3 scripts/cascade.ts campaign catalog --check
npx --yes bun@1.3.3 scripts/cascade.ts campaign self-test
npx --yes bun@1.3.3 scripts/cascade.ts validate
npx --yes bun@1.3.3 test scripts/cascade
git diff --check
```

The focused common/admission/intake/simulation/definition set contains 95
passing tests with 807 assertions; the complete repository suite contains 213
passing tests with 1357 expectations. These are local validation
receipts, not independent gate acceptance.

Provider-backed product execution, independent semantic evaluation, persona
research validation, merge, deployment, and release eligibility remain
`NOT_RUN` unless separately authorized and evidenced.

## Revision 2 Trust Hardening

- READY intakes now fail closed on blocking or forged action decisions,
  task/action policy-set mismatch, duplicate binding identities, and envelope
  snapshot paths that do not match intake scope and envelope identity.
- Harness intakes cannot bind product context, campaign resolution rechecks
  the current action decision, and `cascade-core@2` invalidates envelopes from
  the pre-simulation policy bundle.
- Local evidence: 49 focused admission/intake/simulation tests, 152 aggregate
  tests, current PB-001/PB-002 projections, catalog digest `817d3d26...`, and
  verified immutable run `wg001-resume-hardening-20260804-r6`.

## Revision 3 Strict Check Fixed Point

- `simulation intake --check` first compares the deterministic compiled intake
  and then strictly resolves every READY dependency. A matching intake can no
  longer pass while its snapshotted envelope, brief, policy file, or digest is
  stale.
- Local structural, regression, and immutable evidence is current at catalog
  `73e0a208...`; run `wg001-resume-hardening-20260804-r9` verifies 89 files and
  remains `release_eligible=false`.

## Revision 4 Gate And Dependency Reconciliation

- Replaced prose-only lane dependencies with typed node requirements, external
  conditions, bounded attempts, stable evidence gates, and terminal gate
  `W-032-GT`.
- Bound product-intake readiness to the accepted W-031 admission gate, accepted
  WG-001 action-policy producer, accepted archived W-030 product-context gate,
  and independent W-032 review receipts.
- Preserved the current compiler, templates, role wiring, 50-test focused
  evidence, 153-test aggregate evidence, catalog `73e0a208...`, and immutable
  r9 run as review candidates. No independent acceptance, provider execution,
  product-document promotion, merge, deployment, or release claim was added.

## Revision 5 Current Catalog Reconciliation

- Current-source validation found the generated campaign catalog stale after
  shared simulation-source changes. Regeneration produced seven entries at
  digest `92e7e3fe338884f0343f1612b10d641ffb2eef9360ed2cd742af07106f8a6f7d`.
- The full repository suite now passes 154 tests, and source-bound fixture run
  `wg001-structured-bounds-20260805-r11` verifies 89 files at manifest digest
  `6d0f96c52c7263ad38f82382871f37fa457db777bb800c7376026d104cca1437`.
- No intake contract, role authority, producer dependency, independent gate,
  provider status, promotion status, or release claim changed.

## Revision 6 Cleanup-Truth Evidence Refresh

- W-004 stopped the built-in process and HTTP adapters from treating local
  resource release as verified target reset. This changes shared runtime source
  identity without changing the intake compiler or policy-selection contract.
- The current catalog is `8a73c618...`; immutable fixture run
  `wg001-cleanup-truth-20260805-r13` verifies 89 files at manifest
  `8118469c...` and remains `release_eligible=false`.
- W-032 stays `IN_REVIEW`. Accepted W-031/WG-001 producers and independent
  W-032 review remain required before `W-032-GT` can be accepted.

## Revision 7 Finalization-Recovery Evidence Refresh

- W-004 aligned artifact bounds with exact persisted bytes and added safe
  completion for a matching terminal lock after interrupted finalization.
- Current shared-source evidence is catalog `a2a0e009...`, 155 aggregate tests,
  and immutable fixture run `wg001-finalization-recovery-20260805-r14` with
  89 verified files at manifest `45d1a84e...`.
- No W-032 behavior, producer dependency, authority boundary, independent
  review state, provider status, or release claim changed.

## Revision 8 Admission And Artifact Fixed-Point Refresh

- W-031 attempt 2 advances the advisory Task Envelope bundle to
  `cascade-core@5`; W-004 attempt 8 advances the artifact contract and current
  campaign source identity. Neither change grants execution authority.
- PB-002 and the seven-entry campaign catalog are current at digest
  `059b6943...`; 71 focused and 189 aggregate tests pass. Immutable run
  `wg001-attempt8-review-20260805-r17` verifies 90 files at manifest
  `22c2b1e2...` and remains `release_eligible=false`.
- W-032 remains `IN_REVIEW`. Its exact admission bindings remain stale until
  W-031 and WG-001 producer acceptance, followed by an explicit binding
  refresh and independent W-032 review.

## Revision 9 Public Binding And Run-Gate Repair

- Independent W-031 A2 review found that the direct binding helper required
  exact external request/source digests, but the public `simulation intake`
  command could not supply them. It also found that a stored READY intake did
  not preserve and revalidate those external bindings at campaign run time.
- Reopen WL-01 through WL-06 at attempt 2/3. Persist the expected binding
  identities in the intake contract; expose explicit CLI inputs; reject missing
  or mismatched values; and make the run gate validate the current envelope,
  its external request/source bindings, snapshot digest, and intake identity.
- Replace wording that a Task Envelope route can authorize a campaign with
  eligibility/admission language. The envelope remains requirements-only and
  cannot grant authority or dispatch.
- All prior local counts and r17 evidence remain historical candidates until
  the repaired source is regenerated, validated, and independently reviewed.

### Revision 9 Fixed Point

- Receipt `W031-R8-W032-R9-EXEC-20260805-A1` implements the public CLI,
  persisted binding, and READY/run-gate revalidation chain under
  `cascade-core@6` and schema/catalog/case-set v5.
- Exact local evidence passes 75 focused and 195 aggregate tests. PB-002 and
  catalog `e1e82b2d...` are current; immutable r18 verifies 90 files at
  manifest `37ddf460...` and remains `release_eligible=false`.
- Independent producer and W-032 review, product/provider execution, persona
  research validation, product-doc promotion, merge/deploy, and release
  eligibility remain open or `NOT_RUN`.

## Revision 10 Versioned Contract And Bounded Snapshot Repair

- Revision-8 attempt-1 review found that five required binding fields changed
  the public intake shape while it still declared schema version 1. It also
  found compile/run-gate snapshot reads followed symlinks and separately hashed
  and parsed unbounded mutable files.
- Final attempt 3/3 advances the public schema with an explicit legacy-v1
  disposition and consumes one size-bounded, nofollow, identity-checked regular
  file buffer for hash, parse, and validation at both boundaries.
- Preserve the working public CLI/exact binding chain and requirements-only
  authority boundary. Fresh independent review is mandatory; unchanged repeat
  failure exhausts the current W-032 plan.

### Revision 10 Fixed Point

- Receipt `W031-R8A2-W032-R10A3-EXEC-20260805` advances admission to
  `cascade-core@7`/v6 and the intake contract to v2.
- The final local candidate passes 80 focused tests, 202 aggregate tests with
  927 expectations, and exact `40/40` admission corpus coverage with zero
  over- or under-control.
- PB-002 and catalog `80ce2c96...` are current; immutable r19 verifies 90 files
  at manifest `6b2cd6b...` and remains `release_eligible=false`.
- Fresh producer and W-032 reviews remain required. Product/provider runs,
  semantic product evaluation, persona research validation, product-doc
  promotion, merge/deploy, and release eligibility remain `NOT_RUN`.

## Revision 11 Runtime Parity And Ancestor-Boundary Replan

- Revision-10 final attempt 3/3 failed architecture receipt
  `W031-R8-GF004-GF008-REVIEW-20260805-A2`: the runtime accepted intake-v2
  objects rejected by the published closed schema, and the shared reader's
  pre-open ancestor check did not prove post-open repository containment.
- Revision 11 authorizes two bounded attempts to enforce every published v2
  field/type/closed-shape rule at runtime, add schema/runtime parity probes,
  add post-open canonical containment and identity checks to the shared reader,
  refresh root help, and rerun affected producer/consumer reviews.
- Stable v1 rejection, exact public bindings, product-context authority,
  requirements-only Task Envelopes, and all provider/promotion/release
  boundaries remain unchanged.

### Revision 11 Attempt 1 Fixed Point

- Receipt `W032-R11A1-EXEC-20260805-124930Z` enforces the complete closed v2
  schema at runtime, hardens post-open canonical containment, and refreshes
  root help.
- Local evidence passes 94 focused checks and 209 aggregate tests with 1037
  expectations. Catalog `8bb094b2...` and immutable r20 manifest
  `3e7c22b5...` are current.
- Independent W-032 review and accepted W-031/WG-001 producer gates remain
  open; product/provider execution, semantic evaluation, promotion, merge,
  deploy, and release eligibility remain `NOT_RUN`.

### Revision 11 Final Projection Refresh

- W-031 is rebound to final candidate `cascade-core@9`/v8 with 68/68 corpus
  cases; PB-002 and catalog `5f3d6c01...` are current.
- Aggregate validation passes `211/211` tests with 1185 expectations; immutable
  r21 verifies 90 files at manifest `7f680af1...`.
- Final W-032 review and accepted W-031/WG-001 producer gates remain open.

## Revision 12 Authoritative Product-Context Binding

- Revision-11 attempt 2/2 is exhausted by receipt
  `W031-R9-GF004-GF008-REVIEW-20260805-A2`.
- READY intake validation preserved exact brief file digests but did not prove
  that copied brief ID/revision/domain/capability/product references matched the
  authoritative reviewed or approved brief. A self-resealed forged selection
  could therefore pass local syntax and digest checks.
- Revision 12 authorizes two bounded attempts to re-resolve the current brief
  and generated projection through bounded nofollow reads and compare every
  copied context field exactly at compile/check and READY/run boundaries. Add
  self-resealed forgery probes and make the focused validation recipe include
  `common.test.ts` explicitly.

### Revision 12 Attempt 1 Fixed Point

- Receipt `W032-R12A1-EXEC-20260805` implements authoritative current-brief
  equality at compile/check and READY/run boundaries without changing the
  public v2 intake schema.
- Focused validation passes `95/95` with 807 assertions; aggregate validation
  passes `213/213` with 1357 assertions. PB-001/PB-002 and catalog
  `1e448871...` are current; r22 verifies 90 files at manifest `638aa50b...`.
- Independent W-032 review and accepted W-031/WG-001 producer gates remain
  open. Product/provider execution, semantic evaluation, promotion, merge,
  deploy, and release eligibility remain `NOT_RUN`.

## Revision 13 Claim-Provenance Bridge

- W-031 review proved the intake copied claim text/status/tags but dropped the
  Task Envelope claim source, so exact bytes did not preserve authority
  provenance.
- Advance the public intake contract with an explicit legacy disposition,
  copy and exact-revalidate every claim source, and fail READY/run when an
  external or inferred claim is treated as mutation or simulation authority.
- Preserve revision-12 current-brief equality, exact action-policy equality,
  bounded reads, role separation, no auto-dispatch, and proposal-only product
  refinement. Fresh producer and W-032 review remains mandatory.

Implementation advances the public intake to v3 with stable v1/v2 rejection,
exact claim kind/source projection, and READY/run replay validation. Focused
owned suites pass `87/87`; aggregate validation passes `222/222` with 1426
assertions. PB-001/PB-002, catalog `34c1d08e...`, and r24 manifest
`34cdd12e...` are current. Independent W-032 and producer acceptance remain
open.

## Revision 15 Explicit Write-Only Replacement

- Replan: revision-14 attempt 2 made legacy replacement available through the
  exported preview compiler, so a no-flag invocation could synthesize READY v4
  output without changing the legacy persisted intake.
- Preserved: intake v4, current Task Envelope provenance replay, exact product
  context and action-policy equality, strict READY/run checks, and public
  v1-v3 `--write` migration.
- Changed: strict compilation is again the default; one private replacement
  mode is reachable only from the public write service. Default preview,
  `--check`, ordinary resolution, and run preflight all validate the referenced
  intake before producing a candidate.
- Attempt-1 candidate evidence: the public matrix rejects legacy state through
  default preview and `--check`, the strict resolver used by run rejects it
  before reservation/dispatch, and public `--write` replaces each of v1-v3.
  The focused W-032 intake/definition/simulation suites pass `40/40` with 215
  assertions and `git diff --check` passes. Root validation reaches the
  generated-projection gate and fails only on the intentionally unrefreshed
  W-032 generated brief. Generated catalog/brief refresh, aggregate regression,
  independent review, producer acceptance, provider execution, promotion,
  deployment, and release remain outside this candidate or `NOT_RUN`.

## Revision 16 Authored Seed-Binding Projection

- Advance the public intake to v5 while preserving revision-15 strict default,
  `--check`, ordinary resolution, run preflight, and write-only v1-v4 migration.
- Add one product-only authored seed-binding artifact referenced by campaign
  manifests. Bind campaign SHA-256 plus exact Task Envelope ID/revision/request/
  source digests and project its exact path, SHA-256, source, and mappings into
  the intake.
- Require exact one-per-active-claim coverage by `source_claim_id`, at least one
  `SEEDED` row, valid campaign claim IDs, and at least one valid scenario/task
  target for every seeded row. Non-seeded rows have no targets and a rationale.
  No claim-text matcher or second semantic classifier is introduced.
- Revalidate the artifact and projection at compile/check, READY resolution,
  and run preflight. Harness campaigns/intakes remain unbound.
- Attempt-1 is rebound to Task Envelope/schema/catalog/case-set v15 and
  `cascade-core@16`; focused W-032 tests pass `48/48` with 257 expectations and
  the admission corpus passes `131/131`. Independent producer acceptance
  remains required. Generated catalog/brief refresh,
  aggregate regression, immutable campaign execution, independent review,
  provider execution, promotion, deployment, and release remain `NOT_RUN`.

## Revision 17 Bounded Single-Buffer Seed Read

- Failed revision-16 gates: G1/G2/G5. The seed definition, projected digest,
  and source digest came from three pathname opens, leaving a substitution
  window across schema validation, compilation, READY replay, and run preflight.
- Preserve intake v5 and seed schema v1, explicit source-claim dispositions,
  exact target references, no implicit mapping, harness non-binding, strict
  v1-v4 preview/check/run rejection, and write-only legacy replacement.
- Add one seed-specific reader over the shared bounded regular-file primitive.
  Require nofollow open, physical ancestor containment, bounded bytes, stable
  pre/post identity, fatal UTF-8, JSON/runtime validation, and SHA-256 from the
  same buffer.
- Reuse the resolved buffer digest for the intake projection and campaign
  source digest so each resolver invocation opens the seed exactly once.
- Add file/ancestor symlink and substitution probes, oversized/invalid UTF-8/
  invalid JSON failures, projection/source-digest equality, and preserve the
  existing v5 seed E2E, no-implicit-mapping, and legacy-boundary matrix.
- Attempt 1 proposes G1/G2/G5 back to review. Generated source-bound evidence,
  aggregate validation, independent review, accepted producers, provider
  execution, promotion, deployment, and release remain separate gates.

## Revision 18 Campaign Intake-Root Equality

- Failed revision-17 gates: G1/G2/G5. Campaign manifest validation did not
  require the `simulation_file` scope root to equal the `intake_file` scope
  root, and replacement resolution intentionally skipped the embedded intake
  read that had supplied the only later scope comparison.
- Preserve intake v5, product-only seed bindings, revision-17's single-buffer
  seed read/digest authority, strict ordinary resolution, and write-only v1-v4
  legacy replacement.
- Add exclusive product/product and harness/harness campaign-schema pairings,
  mirror the invariant in runtime manifest validation, and replay it against
  the resolved simulation scope before any optional intake read.
- Revalidate the writer destination immediately before its first atomic write.
  Neither an embedded matching scope nor replacement mode may authorize a
  cross-root destination.
- Add product-under-harness and harness-under-product public matrices covering
  default preview, `--check`, `--write`, ordinary and replacement resolution,
  READY-marked persisted input, and `campaign run`; assert exact sentinel bytes
  remain and no reservation or dispatch artifact exists.
- Attempt-1 root-specific probes pass `2/2` with 45 assertions. After rebinding
  the existing producer assertion to W-031 revision 15's Task Envelope schema
  v16 and `cascade-core@17`, the broader two-file run passes `42/42`. Generated
  catalog/brief refresh, aggregate validation, independent review, producer
  acceptance, provider execution, promotion, deployment, and release remain
  separate or `NOT_RUN`.

## Revision 19 Exact Seed Physical-Root Containment

- Failed revision-18 gates: G1/G2/G5. The seed pathname was lexically scoped to
  the seed-binding directory, but the shared reader checked the opened
  descriptor only against the canonical repository root.
- Preserve intake v5, product-only seed bindings, revision-17's one-buffer
  digest/projection authority, revision-18's campaign/intake-root equality,
  nofollow open, byte/UTF-8/JSON bounds, strict legacy handling, roles, and
  exact policy equality.
- Add an optional exact physical root to the generic bounded reader. Prove the
  lexical path is under it, snapshot every directory identity through that
  root, and require both the ancestor chain and opened descriptor to remain
  under the same canonical root before and after reading.
- Bind the seed reader to
  `product-evals/intakes/product/seed-bindings/`; existing generic callers
  continue using the repository root when no exact root is supplied.
- Add deterministic generic and seed-level regressions that move an opened
  ancestor outside the permitted root, recreate its old name, hard-link the
  same inode back, and accept rejection as the only valid outcome.
- Attempt-1 receipt `W032-R19-A1-EXEC-SEED-PHYSICAL-ROOT-20260805` proposes
  G1/G2/G5 for review only. After rebinding to W-031 revision 16 schema/
  classifier v17 and `cascade-core@18`, the common/definition/intake slice
  passes `60/60` with 327 expectations. Generated catalog and PB-002 are
  current; aggregate and immutable evidence, independent review, accepted
  producers, provider execution, promotion, deployment, and release remain
  separate or `NOT_RUN`.

## Revision 20 Campaign Seed Scope Schema Parity

- Failed revision-19 gates: G1/G4. Runtime resolution required a product seed
  binding and denied a harness seed binding, but the public campaign schema
  admitted both shapes.
- Preserve the required product simulation/intake pairing, the harness
  simulation branch, revision-19 exact physical-root containment, one-buffer
  seed authority, strict legacy handling, role separation, and exact policy
  equality.
- Require `seed_binding_file` inside the product schema branch and make the
  harness branch reject that property. Apply the same scope rule during
  runtime campaign manifest validation and replay it after simulation
  resolution.
- Extend the existing schema/runtime parity regression with four paired cases:
  valid product, valid harness, product without seed, and harness with seed.
  Keep the focused and aggregate test counts stable by adding assertions to the
  existing campaign-root parity test.
- Attempt-1 receipt
  `W032-R20-A1-EXEC-CAMPAIGN-SEED-SCHEMA-PARITY-20260805` proposes G1/G4 for
  review only. The current consumer rebind passes `60/60` with 334
  expectations at W-031 schema/classifier v18 and `cascade-core@19`; those
  results are historical after revision 18. Root integration must rebind W-032
  to schema/classifier v19 and `cascade-core@20`, then regenerate shared
  projections and refresh aggregate/immutable evidence. Independent review,
  remaining W-032 gates, provider execution, promotion, deployment, and
  release remain separate or `NOT_RUN`.

## Revision 21 Campaign Seed Lexical Root

- Failed revision-20 gates: G1/G4 under independent receipt
  `W032-R20-ARCH-FUNCTIONAL-REVIEW-20260805-IND-01`. The product-required
  field remained lexically broad in both the public schema and runtime
  manifest validator, so wrong-root and non-canonical paths were admitted
  before the physical-root reader.
- Preserve intake v5, exact simulation/intake root equality, revision-19 exact
  seed physical-root containment, revision-17 one-buffer validation/digest/
  projection authority, strict legacy handling, exact policy equality, and
  accepted G5 READY/run and no-dispatch semantics. G2/G3 are not reopened by
  this lexical repair.
- Require one canonical slash-separated `.json` path under
  `product-evals/intakes/product/seed-bindings/` in both the product campaign
  schema branch and runtime campaign manifest validation. Reject wrong roots,
  `.`/`..`, backslashes, absolute paths, and duplicate separators.
- Keep manifest validation before every referenced-file load. Add a sentinel
  campaign with a missing evaluation profile plus an unsafe seed path and
  require the seed lexical-root error, proving no referenced load was reached.
- Paired schema/runtime controls cover valid product/harness, product without
  a seed, harness with a seed, and every invalid lexical class. Attempt 1
  passes the focused common/definition/intake slice `61/61` with 348
  expectations and the unchanged campaign self-test for seven campaigns;
  release scope remains `NOT_RUN`.
- Receipt `W032-R21-A1-EXEC-SEED-LEXICAL-ROOT-20260805` proposes G1/G4 for
  `REVIEW_R21_A1` only. Independent fixed-point review, accepted G2/G3,
  W-031-G6, integrated G6, terminal GT, provider execution, promotion,
  deployment, and release remain open or `NOT_RUN`; G5 remains accepted.

## Revision 22 Positive ASCII Seed-Path Grammar

- Failed revision-21 gates: G1/G4 under independent receipt
  `W032-R21-ARCH-FUNCTIONAL-REVIEW-20260805-IND-01`. The negative lexical
  exclusions admitted lowercase/uppercase encoded dot-dot, encoded slash and
  backslash, fullwidth-dot traversal, division slash, and fraction slash.
  Intake-v5 `seed_binding.path` still used a broader `.+` rule.
- Preserve product-required/harness-forbidden seed binding, intake v5, exact
  simulation/intake roots, revision-19 exact seed physical-root containment,
  revision-17 one-buffer validation/digest/projection authority, strict legacy
  handling, G2/G3 review semantics, and accepted G5 READY/run and no-dispatch
  semantics.
- Define one positive ASCII-only path grammar and reuse its identity through
  campaign and intake schema definitions plus one runtime validator called by
  campaign manifest admission, intake validation, and the bounded seed reader.
  Bind both public definition strings to the runtime pattern in tests.
- Reject every percent encoding regardless of case, all non-ASCII characters,
  U+FF0E dot and U+2215/U+2044 slash lookalikes, raw dot/dotdot components,
  wrong roots, absolute paths, backslashes, and duplicate separators.
- Expand paired campaign-schema/runtime and intake-schema/runtime matrices for
  the seven prior-accepted spellings and adjacent mixed-case, arbitrary-percent,
  and non-ASCII variants. Replay every case through a campaign with a missing
  evaluation-profile sentinel and require lexical rejection first.
- Attempt-1 receipt `W032-R22-A1-EXEC-SEED-PATH-GRAMMAR-20260805` may propose
  G1/G4 for `REVIEW_R22_A1` only after focused definition/intake evidence,
  campaign self-test, and owned-path diff inspection pass. Independent review,
  G2/G3 acceptance, W-031-G6, integrated G6, terminal GT, product/provider
  execution, promotion, deployment, and release remain open or `NOT_RUN`; G5
  remains accepted.

## Revision 22 Consumer Rebind To W-031 Revision 25

W-032 behavior remains at revision 22 while its Task Envelope consumer advances
to W-031 schema/classifier v26 and `cascade-core@27`. The exact admission corpus
contains 386 cases and passes with zero over/under-control. The root-owned N06
common/definition/intake and complete-suite joins must be rerun at this exact
producer identity before a current W-032 or repository pass is claimed. This
rebind invalidates prior producer-bound technical review identities; G1/G4 and
formal G2/G3 review remain `NOT_RUN`, G5 stays accepted, and G6/GT stay blocked.
Immutable r39 is deterministic harness evidence only, not product-simulation
execution or independent acceptance of the rebound producer; r38 and r37 are
historical.

## Revision 22 Consumer Rebind To W-031 Revision 26

W-032 behavior remains at revision 22 while its Task Envelope consumer advances
to W-031 schema/classifier v27 and `cascade-core@28`. The exact admission corpus
contains 430 cases and passes with zero over/under-control. The narrow
common/definition/intake parity slice passes `71/71` with 597 assertions. The
root-owned complete-suite and N06 joins remain separate evidence requirements;
this rebind does not accept G1-G4, W-031-G6, G6, or GT. Provider-backed product
execution, promotion, deployment, and release remain `NOT_RUN`.

## Revision 22 Consumer Rebind To W-031 Revision 27

Rebind the narrow W-032 admission assertion from W-031 v27/core@28 to Task
Envelope/schema/catalog/case-set v28, classifier v28, and `cascade-core@29`.
The exact producer corpus contains 454 passing cases with zero
over/under-control. W-032 behavior, scope, policy equality, run gates, and
product/harness separation do not change. Fresh producer-bound G1/G4, formal
G2/G3, W-031-G6, and integrated G6/GT review remain required; provider-backed
product execution and product semantic evaluation remain `NOT_RUN`.

## Revision 22 Consumer Rebind To W-031 Revision 28

Rebind the narrow W-032 admission assertion to Task
Envelope/schema/catalog/case-set v29, classifier v29, and `cascade-core@30`.
The exact producer corpus contains 485 passing cases with zero
over/under-control; the combined W-031 and narrow W-032 parity suite passes
`144/144` with 2,343 assertions. W-032 behavior, scope, policy equality, run
gates, and product/harness separation do not change. Root still owns the
integrated N06 projection join. Fresh producer-bound G1/G4, formal G2/G3,
W-031-G6, and integrated G6/GT review remain required; provider-backed product
execution and product semantic evaluation remain `NOT_RUN`.

## Revision 22 Consumer Rebind To W-031 Revision 29

Rebind the narrow W-032 admission assertion to Task
Envelope/schema/catalog/case-set v30, classifier v30, and `cascade-core@31`.
The exact producer corpus contains 515 passing cases with zero
over/under-control; the combined W-031 and narrow W-032 parity suite passes
`148/148` with 2,424 assertions. W-032 behavior, scope, policy equality, run
gates, and product/harness separation do not change. Root owns protected
projection regeneration and the integrated N06 join. Fresh producer-bound
G1/G4, formal G2/G3, W-031-G6, and integrated G6/GT review remain required;
provider-backed product execution and product semantic evaluation remain
`NOT_RUN`.

## Revision 22 Consumer Rebind To W-031 Revision 34

The W-031 producer now emits Task Envelope/schema/catalog/case-set v35,
classifier v35, and `cascade-core@36`; its exact corpus passes `765/765` with
zero over/under-control. The root-owned narrow consumer assertion is rebound;
combined admission/intake parity passes `169/169` with 2,849 assertions.
W-032 behavior, scope, product/harness separation, policy equality, and run
gates do not change. Generated/immutable integration, fresh G1/G4, formal
G2/G3, W-031-G6, integrated G6/GT, provider execution, and semantic evaluation
remain open or `NOT_RUN`.

## Revision 22 Consumer Rebind To W-031 Revision 35

The W-031 producer now emits Task Envelope/schema/catalog/case-set v36,
classifier v36, and `cascade-core@37`; its exact corpus passes `785/785` with
zero over/under-control. The root-owned narrow consumer assertion is rebound.
W-032 behavior, scope, product/harness separation, policy equality, and run
gates do not change. Generated/immutable integration, fresh G1/G4, formal
G2/G3, W-031-G6, integrated G6/GT, provider execution, and semantic evaluation
remain open or `NOT_RUN`.

## Revision 22 Consumer Rebind To W-031 Revision 36

The W-031 producer now emits Task Envelope/schema/catalog/case-set v37,
classifier v37, and `cascade-core@38`; its exact corpus passes `907/907` with
zero over/under-control. The narrow W-032 consumer assertion is rebound while
revision-22 intake behavior remains unchanged. PB-002 is regenerated and its
fixed-point check passes; catalog regeneration and the integrated immutable
join remain root-owned. Fresh G1/G4, formal G2/G3,
W-031-G6, integrated G6/GT, provider execution, and semantic evaluation remain
open or `NOT_RUN`.

The W-031 revision-36 producer was subsequently rejected by independent
review. Its v37/`cascade-core@38` parity receipt is historical and cannot
support current W-032 acceptance.

## Revision 22 Consumer Rebind To W-031 Revision 37

The W-031 review-candidate producer now emits Task
Envelope/schema/catalog/case-set v38, classifier v38, and `cascade-core@39`;
its exact corpus passes `925/925` with zero over/under-control. The narrow
W-032 consumer assertion is rebound while revision-22 intake behavior remains
unchanged. PB-002 is regenerated and its fixed-point check passes; catalog
regeneration and the integrated immutable join remain root-owned. Fresh G1/G4,
formal G2/G3, W-031-G6, integrated G6/GT, provider execution, and semantic
evaluation remain open or `NOT_RUN`.

The W-031 revision-37 producer and its r53 integration were subsequently
rejected. Their v38/`cascade-core@39` parity receipts are historical and cannot
support current W-032 acceptance.

## Revision 22 Consumer Rebind To W-031 Revision 38

The W-031 accepted-candidate producer now emits Task
Envelope/schema/catalog/case-set v39, classifier v39, and `cascade-core@40`;
its exact corpus passes `949/949` with zero over/under-control. The narrow
W-032 consumer assertion is rebound while revision-22 intake behavior remains
unchanged. PB-002 regeneration and fixed-point checking are required against
the current source; catalog regeneration and the integrated immutable join
remain root-owned. Fresh G1-G4, W-031-G6, integrated G6/GT, provider execution,
and semantic evaluation remain open or `NOT_RUN`.

## Revision 22 Intake V6 And N06 Action-Binding V2 Migration

Migrate the W-032 consumer and starter projection to intake schema v6 while
retaining W-031 revision-39 v40/`cascade-core@41` parity with `965/965` exact
admission cases. Empty starter tasks remain valid. Each populated action binds
the N06 `cascade-action-binding-v2` canonical digest and never authors the
legacy action digest. Intake schemas v1 through v5 are replacement-only and
cannot be READY.

The focused W-031, intake, definition, and starter-template slice passes
`237/237` with 3,388 assertions. PB-002 regeneration and fixed-point checking
must bind this current contract. This is local producer/consumer parity only:
fresh G1-G4, W-031-G6, integrated G6/GT, catalog and immutable integration,
provider execution, and semantic evaluation remain open or `NOT_RUN`; G5 stays
accepted pending the fresh joins.

The W-031 revision-38 producer and its r54 integration were subsequently
rejected. Their v39/`cascade-core@40` parity receipts are historical and cannot
support current W-032 acceptance.

## Revision 22 Consumer Rebind To W-031 Revision 39

The W-031 accepted-candidate producer now emits Task
Envelope/schema/catalog/case-set v40, classifier v40, and `cascade-core@41`;
its exact corpus passes `965/965` with zero over/under-control. The narrow
W-032 consumer assertion is rebound while revision-22 intake behavior remains
unchanged. PB-002 regeneration and fixed-point checking are required against
the current source; catalog regeneration and the integrated immutable join
remain root-owned. Fresh G1-G4, W-031-G6, integrated G6/GT, provider execution,
and semantic evaluation remain open or `NOT_RUN`.

## Revision 22 Consumer Rebind To W-031 Revision 33

Rebind the narrow W-032 admission assertion to Task
Envelope/schema/catalog/case-set v34, classifier v34, and `cascade-core@35`.
The producer corpus passes `705/705` with zero over/under-control and combined
W-031/W-032 parity passes `166/166` with 2,762 assertions. W-032 behavior,
scope, product/harness separation, exact policy equality, and run gates do not
change. Fresh G1/G4, formal G2/G3, W-031-G6, integrated G6/GT, provider
execution, and semantic evaluation remain open or `NOT_RUN`.

## Revision 22 Consumer Rebind To W-031 Revision 32

Rebind the narrow W-032 admission assertion to Task
Envelope/schema/catalog/case-set v33, classifier v33, and `cascade-core@34`.
The producer corpus passes `661/661` with zero over/under-control; the combined
W-031/W-032 parity suite passes `163/163` with 2,698 assertions. W-032 behavior,
scope, product/harness separation, policy equality, and run gates do not
change. Protected campaign projections and the integrated N06 join remain
root-owned. Fresh G1/G4, formal G2/G3, W-031-G6, integrated G6/GT, provider
execution, and semantic evaluation remain open or `NOT_RUN`.

## Revision 22 Consumer Rebind To W-031 Revision 30

Rebind the narrow W-032 admission assertion to Task
Envelope/schema/catalog/case-set v31, classifier v31, and `cascade-core@32`.
The exact producer corpus contains 545 passing cases with zero
over/under-control; the combined W-031 and narrow W-032 parity suite passes
`153/153` with 2,506 assertions. W-032 behavior, scope, policy equality, run
gates, and product/harness separation do not change. Root owns protected
projection regeneration and the integrated N06 join. Fresh producer-bound
G1/G4, formal G2/G3, W-031-G6, and integrated G6/GT review remain required;
provider-backed product execution and product semantic evaluation remain
`NOT_RUN`.
