# Persona Provenance And Defaults Hardening Completion

Date: 2026-08-03
Lane: `W-026`
Status: `COMPLETE`
Terminal Gate: `W-026-GT ACCEPTED`
Owner: `agent-engineer`
Plan Revision: `1`

## Outcome

The product-persona/synthetic-persona bridge now fails closed across its full
provenance chain instead of relying on plausible metadata or documentation
alone:

1. Only `reviewed` or `approved` persona revisions can seed an approved
   derivation. Matching draft or superseded files are rejected.
2. Every derivation authors weight semantics explicitly. `test-allocation` is
   the safe default; `estimated-prevalence` requires representative mode plus
   digest-bound research or behavioral data, reference window, sample
   description, and reviewer.
3. The generator input digest is recomputed from the complete manifest after
   removing only the digest field. Any changed generation, evidence, or review
   input invalidates the old digest.
4. Every refinement proposal is bound by ID and canonical candidate digest in
   its evaluation receipt, by persona/derivation path and SHA-256 in the source
   manifest, and by path/SHA-256 in the frozen evaluation input manifest.
   Terminal finalization requires an exact one-to-one receipt/artifact set.

Synthetic findings remain hypotheses. They cannot mutate or validate their
source persona, and promotion still requires external evidence, accountable
human review, and a new persona revision.

## Defaults Analysis And Disposition

| Default Surface | What Existed | Implemented Disposition |
|---|---|---|
| Product persona authoring | revision, evidence/confidence, uncertainty, permitted/prohibited use, invalidation, review owner | added executable eligibility: only `reviewed`/`approved`; draft/superseded fail closed |
| Persona derivation | explicit mode and generator identity, but input digest was syntax-only and representative mode implied prevalence | explicit `weight_semantics`; reproducible input digest; evidence-backed prevalence contract |
| Persona-derived population | v2 distinguishes prevalence from test allocation | preserved; output now copies the authored validated semantics instead of inferring from mode |
| Campaign design and quality checklist | asked for persona digest, allocation, frozen proposal evidence | made the safe default and receipt/source/input terminal linkage concrete |
| Semantic evaluation | typed optional proposal candidates and provider output digest | receipt now binds every proposal ID and candidate digest |
| Generic starter package | synthetic 80/20 actors, deterministic fixture path, framework calibration, target-claim disclaimer | kept legacy compatibility; clarified weights are test allocation and never prevalence |
| Architecture `experiment` default | immutable protocol/run artifacts, reproducibility, separate observation/interpretation/promotion | `NO_CHANGE`; supports the repair conceptually but is reference guidance, not persona runtime authority |
| Architecture `stack-selection` default | source/digest traceability, explicit-over-inferred, proof-required and conflict-blocking policies | `NO_CHANGE`; same conservative evidence logic already applies, without owning persona contracts |
| Product requirements, journeys, scenarios, design, and brand | no target-specific behavior in this framework repair | `NO_CHANGE`; no target persona or UI fact was invented |

The architecture-default graph rule that a default is only a first candidate,
with explicit exception conditions, remains appropriate. No architecture pair
was adopted as an executable persona dependency.

## Fixed-Point Review

The first implementation linked proposals to their evaluation receipt,
candidate digest, source manifest, and evidence-file presence. Architecture
and security review found that presence alone did not prove the evidence was
the exact evaluator input. The repaired terminal path now validates the input
manifest digest against the receipt, verifies unique manifest paths, and
checks every cited evidence file SHA-256. Negative tests cover candidate,
source, input-manifest, evidence-digest/presence, and exact-set failures.

No remaining scoped architecture, contract, path-traversal, evaluator-identity,
evidence-integrity, direct-mutation, or defaults-drift finding is open.

## Validation Evidence

| Check | Result |
|---|---|
| owned source manifest | `PASS`; 21-file digest `202099051f0810122d1524a98e2e0e66585b76eaf55be84a5f206fc26b8cc1c3` on base `HEAD` `7112546cc856d1bc7f4b4409ef80170c71b9c236` |
| focused persona/evaluation/artifact tests | `39/39 PASS` |
| aggregate `test scripts/cascade` | `84/84 PASS` with Bun 1.3.3 |
| deterministic P-999 derivation dry-run | `PASS`; checked-in population match, `test-allocation` |
| Cascade validator | `PASS`; 9 agents, 44 skills, zero project leakage |
| harness catalog and self-test | `PASS`; 44 skills, 368 scenarios, digest `d6030bf0ea98a6bd26b431de50ac1b7ca909a19a289192d005403c514507897d`; 20 cases |
| target self-test | `PASS`; 26 cases |
| campaign catalog | `PASS`; 7 entries, digest `213a94b684e6c6341924fcb8723e2483050fa5cd198db0bc83f8b3cd26e962b4` |
| campaign self-test | `PASS`; framework calibration `CALIBRATED`, release scope `NOT_RUN` |
| generated/stale projections | `PASS`; WG-001 plan revision 17, N03 `PENDING`, N04/N05 `BLOCKED` attempt 4/4 exhausted |
| whitespace | `PASS` |

## Doc Routing Decisions

| Fact | Owner Target | Action | Evidence | Next Gate |
|---|---|---|---|---|
| executable persona eligibility | persona template/index and `compose-spec` | `UPDATED` | source-status negative tests | done |
| safe allocation/prevalence default | derivation schema/runtime and campaign authoring defaults | `UPDATED` | prevalence and stale-input negatives | done |
| terminal proposal provenance | evaluation/campaign skills plus schema/runtime | `UPDATED` | candidate/source/input/evidence/set negatives | done |
| generic synthetic starter | starter template | `UPDATED` clarification only | generated package test | done |
| reusable architecture defaults | architecture-default pairs | `NO_CHANGE` | inspected experiment and stack-selection pairs; no ownership transfer | done |
| target product/design/brand/spec facts | existing owner docs | `NO_CHANGE` | framework-only repair | done |

No glossary, harness-config, product requirement, journey, scenario, design,
brand, or target spec diff is needed.

## Evidence Boundaries And Remaining State

- P-999 remains a deterministic framework fixture, not product research or
  prevalence evidence.
- No provider-backed campaign emitted a real proposal in this lane; live
  proposal usefulness and refinement effectiveness are `NOT_RUN`.
- No external research was collected, no human approved a new product-persona
  revision, and no promotion path was exercised.
- Target calibration, deployment, live/platform certification, and release
  eligibility are `NOT_RUN`.
- WG-001 remains `ACTIVE/BLOCKED` at plan revision 17/work-graph revision 11.
  Historical N03 acceptance is stale; current-source revalidation is
  `NOT_RUN`; N04/N05 remain blocked with failed attempt-4 reviews and no
  implicit attempt 5.

## Publication And Archive

- Commit: `NOT_REQUESTED`.
- Push: `NOT_REQUESTED`.
- External publication: `NOT_REQUESTED`.
- Archive result: pending automatic `archive-work` for W-026 and this report.
