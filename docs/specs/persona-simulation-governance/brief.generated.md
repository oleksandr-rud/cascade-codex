# Product Brief: Governed Persona-Derived Simulation

> Generated projection. The linked product and spec sources remain authoritative.
> Harness and synthetic evidence retain their limited authority and cannot establish product-persona truth.

- Brief: `PB-001` revision `1`
- Status: `reviewed`
- Coverage: `complete`
- Catalog digest: `0f6b921bf6cefde6ba96d9410b1609fca21ab65c69f70a258e3e05bffac73c5b`
- Manifest digest: `2128958c6b5f3178bd553ea466e4c7f9fdc9b70264db3324034d7e66d7a5b32f`
- Selected-source digest: `92a90fe90ad50ee8d510d8d9a4fb96ddaec749cf79270f72939ded844f829ae1`
- Compiler-contract digest: `cc347c5d400a038345ebf4e0515196693893dd5f7f42017984d9331435efbd3b`

## Purpose And Audience

Assemble the current product, evidence, simulation-authority, and reusable-rule context for planning or reviewing persona-derived simulation work.

- Cascade maintainers
- product researchers
- simulation authors and evaluators

## Domain And Capability

- Domain `PD-001`: **Product context and simulation governance** — Governs product evidence, product-context assembly, persona-derived simulation, and reviewed refinement feedback.
- Capability `PC-001`: **Governed persona-derived simulation** — Binds reviewed product personas and governed evidence to typed synthetic populations and proposal-only refinement feedback.
- Owner: Cascade maintainers
- Capability status: `approved`

## Source Documents

| Path | SHA-256 |
|---|---|
| `docs/specs/persona-simulation-governance/contract.md` | `32474fb563917d59fd688b9349044cf387bdfaff75a7fd776413b300b79926bc` |
| `docs/product/personas/_index.md` | `b4f019450deb561601f71048eaae58ba744164692e8946d6a3cc159449382b78` |
| `docs/specs/product-context-briefs/contract.md` | `a0e5ad2910e3a475cf7ea9a306d4bacd52fe4ea4b0b3c86872562e6306f5e44e` |

## Requirements

| ID | Source | Requirement | Acceptance Criterion | Scenario IDs | Status |
|---|---|---|---|---|---|
| PR-001 | `PSG-001` | Persona-derived populations bind reviewed persona revisions and governed evidence sources. | Given incomplete or ineligible persona evidence, when a derivation resolves, then resolution fails before execution. | `PS-001` | `approved` |
| PR-002 | `PSG-002` | Synthetic actor decision, communication, memory, and abstention behavior uses typed contracts. | Given malformed actor policy data, when a population validates, then validation fails closed. | `PS-002` | `approved` |
| PR-003 | `PSG-003` | Claims declare and enforce their required population authority. | Given a legacy population and a persona-derived or prevalence claim, when claims reduce, then the claim remains `NOT_RUN` and cannot be supported. | `PS-003` | `approved` |
| PR-004 | `PSG-004` | Persona refinement uses immutable proposal and disposition receipts without direct persona mutation. | Given a proposal without reviewed external evidence, when acceptance is requested, then no persona revision is authorized. | `PS-004` | `approved` |
| PR-005 | `PSG-005` | Non-fixture persona evidence has explicit privacy, retention, and usage defaults before execution. | Given missing privacy or retention decisions, when non-fixture evidence is selected, then execution remains blocked. | `PS-005` | `approved` |

## Journeys

_None selected._

## Scenarios

| ID | Source | User Goal | Given | When | Then | Functional Evidence |
|---|---|---|---|---|---|---|
| PS-001 | `PSG-001 / PR-001` | Prevent unsupported persona evidence from entering simulations | A derivation references non-fixture evidence without complete governance metadata | Resolve its campaign | Resolution fails before provisioning and reports the missing field | persona/simulation definition contract tests |
| PS-002 | `PSG-002 / PR-002` | Keep synthetic behavior deterministic and interoperable | An actor carries unknown or invalid decision, communication, memory, or abstention policy fields | Validate the population | Validation fails and no campaign executes | population schema/runtime parity tests |
| PS-003 | `PSG-003 / PR-003` | Prevent generic synthetic actors from becoming persona evidence | A claim requires persona-derived or prevalence authority but only a schema-v1 population exists | Reduce the immutable campaign evidence into claim status | The claim remains `NOT_RUN` with an authority mismatch and cannot be compensated by other gates | claim/population integration tests |
| PS-004 | `PSG-004 / PR-004` | Review a refinement without silently editing a persona | A digest-bound proposal exists | Create an accepted disposition with or without required external evidence and reviewer data | Complete evidence produces an immutable authorization receipt routed to synthesis; missing evidence fails; the persona file is unchanged | refinement disposition CLI tests |
| PS-005 | `PSG-005 / PR-005` | Keep real persona evidence private and lifecycle-bound | Non-fixture evidence lacks usage, sensitivity, retention, or purpose decisions | Resolve or execute its derivation | The operation is blocked before evidence enters actors, prompts, traces, or artifacts | governance negative tests and security review |

## Personas

_No reviewed non-fixture product persona is selected._

## Evidence Ledger

| ID | Kind / authority | Status | Source | Supports | Limitation |
|---|---|---|---|---|---|
| `EVD-001` | `peer-reviewed-research` / `methodological` | `reviewed` | [Evaluating Large Language Models as Generative User Simulators for Conversational Recommendation](https://aclanthology.org/2024.naacl-long.83/) | PSG-002, PSG-003, PCB-003 | Domain-specific simulator evaluation does not establish a Cascade target persona or universal behavioral validity. |
| `EVD-002` | `peer-reviewed-research` / `methodological` | `reviewed` | [SimulatorArena - Are User Simulators Reliable Proxies for Multi-Turn Evaluation of AI Assistants?](https://aclanthology.org/2025.emnlp-main.1786/) | PSG-001, PSG-002, PCB-003 | Task-specific alignment against annotated conversations does not authorize uncalibrated reuse in another product domain. |
| `EVD-003` | `primary-research` / `methodological` | `reviewed` | [Generative Agent Simulations of 1,000 People](https://arxiv.org/abs/2411.10109) | PSG-001, PSG-003, PCB-003 | Interview-grounded survey and experiment replication is not a substitute for target-product research or persona review. |
| `EVD-004` | `primary-research` / `methodological` | `reviewed` | [Lost in Simulation - LLM-Simulated Users are Unreliable Proxies for Human Users in Agentic Evaluations](https://arxiv.org/abs/2601.17087) | PSG-003, PSG-004, PCB-003 | One benchmark identifies robustness, calibration, and fairness risks but does not quantify every target domain. |

## Simulation And Evaluation Context

| Path | Scope / authority | Status | Purpose | SHA-256 |
|---|---|---|---|---|
| `product-evals/simulations/harness/simulation-correctness-fixture/manifest.json` | `harness-simulation` / `mechanics-only` | `authored` | Proves deterministic schema and runtime mechanics only; it is not product or persona evidence. | `97f576d76d315a0dfbe4879606ea0e5002192a077178fbbe667ab627dcd87f75` |

## Capability Evaluation References

| Path | Kind / authority | Status | SHA-256 |
|---|---|---|---|
| `product-evals/simulations/harness/simulation-correctness-fixture/manifest.json` | `harness-simulation` / `mechanics-only` | `authored` | `97f576d76d315a0dfbe4879606ea0e5002192a077178fbbe667ab627dcd87f75` |

## Gaps

- No reviewed non-fixture product persona or governed target-user evidence is currently available.
- No target-product simulation, human calibration set, or executed product evidence is currently available.

## Non-Goals

- Infer or fabricate P-001.
- Treat harness fixtures or synthetic agreement as product-persona validation.
- Estimate population prevalence from test-allocation weights.
- Mutate a product persona from a generated brief or simulation proposal.

## Reusable Context

### product-context-core / product-authority-graph

Source boundary: `docs/patterns/product-context/index.md`

Use this graph when product material must be assembled without creating a
second authority:

```text
source or approved decision
  -> product domain (PD-XXX)
  -> capability (PC-XXX)
  -> persona / journey / requirement / scenario owner rows
  -> spec packet or brief manifest (PB-XXX selection)
  -> generated brief projection
  -> plan, implementation, functional evidence, or product simulation
```

`docs/product/catalog.yaml` owns only stable relationships and exact
references. Each linked owner document retains its detailed facts and status.
Generated briefs and active plans are projections. A path, folder title,
workline, campaign, or simulation ID does not implicitly create a product
domain or capability.

Require unique stable IDs, one declared domain per capability, bounded source
paths, existing owner references, explicit evaluation authority, and no orphan
product rows. Update the catalog and owner docs together when a relationship
changes.

### product-context-core / brief-manifest-and-compilation

Source boundary: `docs/patterns/product-context/index.md`

A brief manifest is a deterministic source-selection contract. It names one
domain and capability, coverage mode, exact product references, source
documents, evidence metadata, pattern sections, simulation/evaluation context,
gaps, non-goals, and output path.

Validate the complete reference graph before rendering. `complete` coverage
must equal the capability relationship set. `selected` coverage records every
omitted capability reference and why. Fail closed on duplicate or unknown IDs,
missing paths, repository escape, missing pack/section IDs, incompatible
domain/capability pairs, unsupported evidence authority, or stale generated
output.

Render summaries and owner rows before longer reusable context. Preserve a
source boundary for every compiled section and bind the projection to stable
catalog, manifest, and selected-source digests. Equivalent input must produce
byte-identical output; do not embed a generation timestamp.

### product-context-core / evidence-promotion-boundary

Source boundary: `docs/patterns/product-context/index.md`

Keep evidence class, authority, status, limitations, reference date, and
supported claim or decision distinct. User-provided facts can guide their
declared scope. Research can support methodology and questions. Harness
evaluations prove harness behavior. Harness simulations prove mechanics.
Product simulations may support target claims only after current target
execution, evaluation, policy/oracle, cleanup, and calibration gates.

Never promote plausibility, repetition, model agreement, an authored file, or
a context-pack selection into empirical product evidence. A generated brief
may carry `GAP`, `NOT_RUN`, or historical sources; it must not summarize those
states as approval or proof.

### product-context-core / simulation-feedback-bridge

Source boundary: `docs/patterns/product-context/index.md`

A reviewed product persona may seed a synthetic population only through an
explicit digest-bound derivation with governed evidence and typed behavior.
Simulation findings may produce immutable proposals, research questions,
simulator repairs, or candidate refinements. They never validate or mutate the
source persona.

When a refinement is supported by external evidence and an accepted
append-only disposition, route it through `synthesis-to-spec -> compose-spec`
to author a new reviewed persona revision. Recompute every affected brief,
derivation, population, campaign, claim, and evaluation binding after the
source revision changes.

### context-memory-core / semantic-core-packages

Source boundary: `docs/patterns/context-memory/index.md`

Use a semantic-core package when several specs, prompts, policies, scripts,
documents, objects, packets, or act sections must compile into one model context.

Required shape:

- a package YAML file with identity, compile order, references, and summaries;
- a catalog YAML file with module tree, act sections, policies, and packet
  summaries;
- Markdown specs for durable meaning and behavior rules;
- prompt scripts for model-facing assembly instructions;
- a deterministic compiler or documented compile procedure;
- source boundaries in the compiled context.

Compile summaries before long source bodies. Treat package and catalog files as
context selection metadata, not as proof that the referenced content is current.
Each referenced spec or source must carry a short summary and inclusion rule.
For research-derived packages, package metadata is also not proof of source
coverage, evidence strength, claim truth, or empirical docking. Preserve those
statuses inside the referenced report, spec packet, prompt script, or source
card tables.

### testing-core / scenario-tests

Source boundary: `docs/patterns/testing/index.md`

Traceability:

```text
docs/product/scenarios.md
  -> executable scenario or functional test
  -> docs/work/active.md or docs/work/lanes/*.md for the active work overlay
```

Rules:

- Mock only the boundary needed for determinism.
- Keep fixture data explicit.
- Preserve scenario IDs when updating expectations.
- Do not create broad scenario suites just because a product scenario file
  exists.
- Multi-step flows should track carried state and duplicate side effects.
- Do not mark skipped or environment-gated checks as `PASS`.
- Do not mock the behavior being tested.
