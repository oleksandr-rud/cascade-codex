# Product Context Brief Generation Completion

Date: 2026-08-04
Workline: `W-030`
Final status: `COMPLETE`; `W-030-GT ACCEPTED`
Comparison base: `7112546cc856d1bc7f4b4409ef80170c71b9c236`

## Outcome

Cascade now has an explicit product relationship and brief-generation seam:

- `docs/product/catalog.yaml` owns stable `PD-XXX` domain and `PC-XXX`
  capability relationships to requirements, journeys, scenarios, personas,
  source documents, and evaluation references;
- `docs/specs/<slice>/brief.yaml` selects one `PB-XXX` slice without becoming
  a second product authority;
- `scripts/cascade.ts brief` lists, validates, deterministically generates,
  writes, and checks digest-bound briefs;
- `product-context-core` connects product authority, brief compilation,
  evidence promotion, and persona/simulation feedback as selectable reusable
  context;
- target harness config, validation, onboarding, composition, synthesis,
  indexes, glossary, and templates route through the same contract.

The first generated brief, `PB-001`, assembles the governed persona-derived
simulation capability. It records that Cascade has no reviewed non-fixture
product persona and no executed target-product simulation; it does not invent
either one.

## Architecture And Dependency Result

The product owner ledgers remain authoritative. The catalog owns only stable
relationships, the manifest owns only selection, pattern packs own only
reusable retrieval rules, and generated Markdown is a stale-detecting
projection. Complete briefs cover the capability's full declared graph;
selected briefs explain every omission.

The implementation sequence kept dependencies one-way:

```text
product owner rows and specs
  -> domain/capability catalog
  -> brief manifest
  -> source, evidence, simulation, and pattern validation
  -> deterministic generated projection
  -> product or harness evaluation consumers
```

W-004 and the separated `harness-evals/` and `product-evals/` roots remain
protected consumers. W-030 did not change WG-001 topology or acceptance.

## Bugs And Staleness Repaired

- Removed the retired `evals/` setup path from active README instructions and
  kept the validator rejection for any reintroduction.
- Replaced stale campaign example commands with a current catalog entry.
- Regenerated the stale campaign catalog.
- Corrected generated product-simulation starter fixtures from the removed
  `product-evals/fixtures/` path to the typed product simulation root.
- Aligned runtime cardinality checks with the public brief/catalog schemas.
- Made every non-fixture persona catalog participation mandatory.
- Made evidence `supports` IDs resolve in selected source contracts.
- Enforced type-specific physical roots for harness evaluations, harness
  simulations, and product simulations.

## Validation Evidence

| Gate | Result |
|---|---|
| `bun test scripts/cascade` | `PASS`; 120 tests, 0 failures, 410 expectations |
| `cascade validate` | `PASS`; 9 agents, 44 skills, zero leakage |
| `brief check` | `PASS`; one tracked brief current |
| `eval catalog --check` | `PASS`; 44 skills, 368 scenarios, digest `67607bcf...` |
| `eval self-test` | `PASS`; 20 cases |
| `target self-test` | `PASS`; 26 cases |
| `campaign catalog --check` | `PASS`; seven entries, digest `1a495c67...` |
| `campaign self-test` | `PASS`; calibrated mechanics, release scope `NOT_RUN` |
| stale path/root scan | `PASS`; retired root appears only in its validator rejection |
| `git diff --check` | `PASS` |

The fixed-point review found no remaining requirement or architecture finding
within W-030 after the schema/runtime, support-binding, persona-orphan, and
typed-root repairs.

## Authority And Remaining Gaps

The research sources support simulator evaluation, calibration, human
comparison, and explicit limitations. They are methodological evidence only.
No research source is promoted into a Cascade user persona or prevalence
claim.

Still `NOT_RUN`:

- governed target-user research and a reviewed real `P-XXX` persona;
- a target-product simulation seeded from that persona;
- human comparison/calibration and independent product evaluation;
- product finding-to-persona refinement with external evidence and accountable
  disposition;
- deployment, release eligibility, and publication.

Commit, push, deployment, and publication were not requested.
