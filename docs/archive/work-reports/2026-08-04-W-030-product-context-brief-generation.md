# W-030 Product Context Brief Generation

Status: `COMPLETE`
Plan revision: `1`
Task Graph revision: `1`
Owner and lane-state owner: `agent-engineer`
Execution surface: `root`
Dispatch: user-authorized by the 2026-08-04 implementation request

## Outcome

Give Cascade one explicit, validated relationship graph from product domains
and capabilities to personas, journeys, requirements, scenarios, evaluation
references, and deterministic generated briefs. Brief manifests select exact
authoritative sources and reusable context sections; they never become a
second product authority or promote harness/synthetic output into product
evidence.

## Source And Decision Ledger

| Source | Authority / freshness | Supports | Status |
|---|---|---|---|
| 2026-08-04 user implementation request | current request | domain/capability inventory, generated brief, evidence, dependency-safe sequence | accepted |
| `docs/product/requirements.md`, `journeys.md`, `scenarios.md`, `personas/` | current product ledgers | product entity facts and IDs | accepted |
| `docs/specs/persona-simulation-governance/contract.md` | current approved slice contract | existing persona/simulation capability | accepted |
| `docs/patterns/context-memory/index.md` | reusable semantic-core contract | manifest, catalog, source boundaries, deterministic compilation | accepted |
| `product-evals/simulations/README.md` | current evaluation boundary | harness/product separation and proposal-only simulation feedback | accepted |
| primary research recorded in the product-context spec packet | methodological evidence only | grounding, calibration, human comparison, and limitation defaults | accepted with authority limit |

Decisions:

- `docs/product/catalog.yaml` owns stable `PD-XXX` domain and `PC-XXX`
  capability relationships. It points to owner docs; it does not duplicate
  their prose.
- `docs/specs/<slice>/brief.yaml` owns one `PB-XXX` brief selection. A generated
  Markdown brief is a digest-bound projection and never authority.
- `docs/patterns/product-context/` owns reusable assembly and evidence-promotion
  rules only. Product facts remain under `docs/product/` and `docs/specs/`.
- A complete brief must cover the capability's declared product references.
  Selected briefs must name intentional omissions.
- Harness evaluation and harness simulation references are mechanics-only.
  Synthetic findings remain proposal-only; product evidence requires external
  evidence and accountable review.
- No real product persona, target-product simulation, or prevalence claim is
  invented by this lane.

## Architecture Review

Scope: story-level public documentation and CLI contract.

Direct consumers are `compose-spec`, `docs-impact-map`, `plan-change`, the
pattern compiler, the repository validator, target harness configuration, and
future product simulation authoring. Protected consumers are W-004 campaign
schemas/runtime, `harness-evals/`, and `product-evals/`; their identities and
acceptance states must not change.

The selected seam is a small Bun module behind `scripts/cascade.ts brief`.
It validates relationship identity and source existence before rendering. It
uses existing pattern-pack metadata and Markdown owner ledgers, and fails
closed on duplicate IDs, dangling references, missing pack sections, source
escape, unsupported evidence promotion, or stale generated output.

Rejected paths:

- domain folders as implicit ownership: rejected until an explicit catalog
  defines them;
- a product-fact pack under `docs/patterns/`: rejected because packs are
  retrieval metadata and reusable rules, not product authority;
- parsing persona prose into actors: rejected by W-029 governance;
- a compatibility fallback to unvalidated prose briefs: rejected because it
  would preserve two authorities.

## Behavior Examples

- Given a complete capability and valid brief manifest, when a maintainer runs
  `brief generate --check`, then every selected product row and reusable
  context section resolves and the tracked projection matches its source
  digests.
- Given an unknown domain, capability, requirement, scenario, journey,
  persona, pack, or section ID, validation fails before rendering.
- Given a complete brief that omits a capability-owned requirement or scenario,
  validation fails; selected coverage requires an explicit omission reason.
- Given harness-only or synthetic evidence, the generated brief labels its
  authority and cannot present it as target-product or persona evidence.
- Given a changed manifest, catalog, product row, or selected context section,
  `--check` reports the generated brief as stale until it is regenerated.

## Fragment And Workline Composition

| Fragment | Disposition | Bound obligation |
|---|---|---|
| `GF-001@1` | `SELECTED` | product catalog, brief behavior, requirements, journey, scenarios |
| `GF-004@1` | `SELECTED` | catalog/manifest schemas and producer-consumer integrity |
| `GF-008@1` | `MERGED` | CLI, validator, config, docs, and generated projection wiring |
| `GF-009@1` | `SELECTED` | public CLI list/validate/generate/check journey |
| `GF-101@1` | `SELECTED` | evidence authority, privacy-safe source metadata, no synthetic promotion |

One serialized workline owns the complete slice because the entity catalog,
manifest schema, compiler, and generated projection share one public contract
and acceptance seam. A Coordination Graph would add dual transition authority
without an independently acceptable cross-workline result.

## Task Graph

| Node | Obligation | Requires | Gate | Status |
|---|---|---|---|---|
| `W-030-N01` | reconcile prior work, freeze definitions, evidence authority, architecture, impacts, and sequence | user request | `W-030-G01` | `ACCEPTED` |
| `W-030-N02` | author product catalog, requirements, journey, scenarios, spec contract, and evidence ledger | `W-030-G01` | `W-030-G02` | `ACCEPTED` |
| `W-030-N03` | implement manifest schema, compiler/CLI, pattern selection, and fail-closed validation | `W-030-G02` | `W-030-G03` | `ACCEPTED` |
| `W-030-N04` | generate the persona-simulation brief and wire configs, defaults, glossary, skills, indexes, and tests | `W-030-G03` | `W-030-G04` | `ACCEPTED` |
| `W-030-N05` | run functional checks, fixed-point review, regression/staleness validation, closeout, and archive | `W-030-G04` | `W-030-GT` | `ACCEPTED` |

Failure reopens the earliest responsible node; unrelated W-004 evidence and
historical W-029 receipts remain unchanged.

## Feature Impact Matrix

| Feature | Direct contract | Protected behavior | Required evidence |
|---|---|---|---|
| product entity catalog | stable domain/capability IDs and links | existing PR/PS/persona IDs and status meanings | positive and dangling/duplicate negative tests |
| brief assembly | exact manifest selections and deterministic digests | source docs remain authority; no silent omissions | generated fixed-point and staleness tests |
| pattern context | selected reusable sections | pack metadata remains retrieval-only | pack compiler and missing-section tests |
| persona/simulation loop | evidence authority in brief | no direct persona mutation, fixture promotion, or prevalence inference | authority negative tests and generated labels |
| target adaptation | configured paths and templates | existing target validation and evaluation-root separation | repository and target self-tests |

## Doc Impact And Routing

| Fact | Owner target | Action |
|---|---|---|
| domain/capability identities and relationships | `docs/product/catalog.yaml` | add canonical catalog |
| brief generation and evidence rules | `docs/specs/product-context-briefs/contract.md` | add plan-ready contract |
| reusable assembly rules | `docs/patterns/product-context/` | add bounded pattern entry and pack |
| requirement/journey/scenario behavior | existing `docs/product/` ledgers | append exact rows |
| folder/config/term/tool contracts | structure, config, glossary, CLI, validator | update narrow owners |
| brand/design/persona facts | existing owners | no change; evidence is insufficient |

## Validation Plan

- focused Bun contract tests for catalog, manifest, generation, stale output,
  source escape, missing references, and evidence-authority failures;
- CLI `brief list`, `brief validate`, and `brief generate --check`;
- product-context pattern-pack selection;
- repository validator, both evaluation catalog checks, harness/target/campaign
  self-tests, aggregate Bun suite, JSON/YAML parsing, stale-reference scan, and
  `git diff --check`;
- fixed-point Standards and Spec review against this lane and the user request.

Independent target-product research, a real persona, target simulation,
provider-backed execution, deployment, commit, push, and publication are not
required for this local harness capability and remain `NOT_RUN` or
`NOT_REQUESTED`.

## Terminal Acceptance

`W-030-GT` is `ACCEPTED` against comparison base
`7112546cc856d1bc7f4b4409ef80170c71b9c236`. The fixed-point review found and
repaired schema/runtime cardinality drift, uncataloged real-persona risk,
dangling evidence-support IDs, crossed harness/product simulation roots, the
retired README evaluation-root copy path, stale campaign examples, a stale
generated campaign catalog, and the simulation-starter fixture path.

Current-source validation on 2026-08-04:

- aggregate Bun suite: `120 pass`, `0 fail`, `410 expect()` calls;
- Cascade validator: `PASS`, 9 agents, 44 skills, zero project leakage;
- product briefs: `PASS`, one current digest-bound brief;
- harness catalog: `PASS`, 44 skills, 368 scenarios, digest
  `67607bcf956e21217f79084eb2cf0ba454e46948b2e6739cabc91d764d10efbe`;
- harness and target self-tests: `PASS` at 20 and 26 cases;
- campaign catalog/self-test: `PASS`, seven campaigns, digest
  `1a495c670e2e29ea345c3b5be343cf5975ba46a03205c38573e320d1be057d37`;
- stale-root/path scan and `git diff --check`: `PASS`.

The generated brief and methodological evidence are not target-product
execution proof. Real persona research, product simulation, human calibration,
independent product validation, deployment, commit, push, and publication
remain `NOT_RUN` or `NOT_REQUESTED`.
