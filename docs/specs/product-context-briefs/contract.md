# Product Context Brief Contract

Status: `reviewed`
Source identity: 2026-08-04 user request to implement the product domain,
capability, evidence, context-pack, and generated-brief architecture gap
Contract IDs: `PCB-001` through `PCB-003`

## Outcome

A product brief is a deterministic, digest-bound projection that assembles one
declared domain/capability slice from authoritative product rows, source
documents, evidence metadata, evaluation boundaries, and selected reusable
context. It is useful as planning or prompt context but never becomes a second
authority for the sources it cites.

## PCB-001 Product Relationship Authority

`docs/product/catalog.yaml` owns stable `PD-XXX` domain and `PC-XXX`
capability relationships. Each capability names its owner, status, source
paths, requirement, journey, scenario, persona, and evaluation references.
Every referenced identity and path must resolve; duplicates and orphan product
rows fail closed.

The linked Markdown ledgers and spec packets own detailed product facts. A
domain folder is not inferred from a path or title. Domain-owned product
folders are introduced only through an explicit catalog decision and updated
structure contract.

## PCB-002 Brief Manifest And Generation

One `docs/specs/<slice>/brief.yaml` manifest owns a `PB-XXX` selection. It
declares:

- domain and capability IDs;
- `complete` or `selected` coverage and any intentional omissions;
- exact requirement, journey, scenario, and persona IDs;
- bounded source documents and evidence metadata;
- reusable pattern pack and section IDs;
- simulation/evaluation references with scope, authority, and current status;
- gaps, non-goals, and one generated output path.

Generation order is fixed:

```text
product catalog and owner rows
  -> manifest relationship and coverage validation
  -> source/evidence/simulation authority validation
  -> reusable pattern-section resolution
  -> deterministic Markdown rendering with source boundaries
  -> catalog, manifest, and selected-source digests
  -> tracked projection write or stale-output check
```

`complete` coverage requires exact equality with the capability relationship
set. `selected` coverage requires at least one selected product reference and
an explicit omission reason for every capability-owned reference not selected.
Unknown or missing selections never degrade into prose-only output.

The generated brief contains no wall-clock timestamp. Equivalent sources
produce byte-identical output. Any selected catalog, manifest, owner row,
source document, evidence record, simulation reference, pack, or section
change invalidates the output digest and makes `--check` fail.

## PCB-003 Evidence And Promotion Boundary

Evidence keeps its class and authority:

| Evidence class | Permitted contribution | Cannot establish alone |
|---|---|---|
| user-provided or approved product fact | product intent and requirements within its stated scope | empirical prevalence or behavior outside that scope |
| peer-reviewed or primary research | methodological design, risks, calibration, and research questions | a target-product persona or target-user prevalence |
| harness evaluation | Cascade route, trace, and skill behavior | target-product behavior |
| harness simulation | schema, runner, reducer, and evaluator mechanics | target-product behavior, persona truth, or release eligibility |
| product simulation | hypotheses and target-bound behavioral evidence after execution/evaluation | persona mutation or validation without external evidence and review |
| synthetic refinement proposal | research question, simulator repair, or candidate persona refinement | direct persona revision or source-persona validation |

External research is stored as minimized bibliographic metadata and supported
contract IDs. Sensitive raw evidence is not copied into the brief. A real
persona still requires governed target research, consent/usage decisions,
confidence and uncertainty, a reference window, and accountable review.

## Methodological Evidence

These sources guide the contract; they are not Cascade target-user evidence:

| Evidence ID | Primary source | Supported decision | Limitation retained |
|---|---|---|---|
| `EVD-001` | [Yoon et al., NAACL 2024](https://aclanthology.org/2024.naacl-long.83/) | synthetic users need property-level evaluation against human behavior | conversational recommendation does not establish Cascade personas |
| `EVD-002` | [Dou et al., EMNLP 2025](https://aclanthology.org/2025.emnlp-main.1786/) | profile conditioning can improve alignment, but simulator reliability is measured against annotated human conversations | task-specific correlation is not universal validity |
| `EVD-003` | [Park et al., 2024](https://arxiv.org/abs/2411.10109) | rich interviews plus explicit human benchmarks are stronger grounding than demographic descriptions alone | replicated survey/experiment behavior is not product-research replacement |
| `EVD-004` | [Seshadri et al., 2026](https://arxiv.org/abs/2601.17087) | simulator choice, task difficulty, language variety, and population can introduce calibration and fairness errors | one benchmark does not quantify every target domain |

The evidence synthesis supports calibration, reference comparisons, explicit
limitations, and abstention. It contradicts treating believable synthetic
dialogue or repeated model agreement as independent validation.

## Brief Shape

A generated brief contains, in order:

1. generated identity, status, catalog/manifest/source digests, and authority
   warning;
2. domain and capability definition;
3. selected source-document ledger;
4. requirement, journey, scenario, and persona selections from owner docs;
5. evidence ledger with supported decisions and limitations;
6. simulation/evaluation authority and status;
7. gaps and non-goals;
8. selected reusable context sections with explicit source boundaries.

## Non-Goals

- Replacing product owner documents with generated output.
- Creating a real product persona or estimating prevalence from generic data.
- Treating context-pack metadata as evidence that its underlying sources are
  current.
- Treating an authored or harness-only evaluation as executed product proof.
- Automatically mutating personas, requirements, catalogs, or source specs
  from synthetic findings.

## Acceptance Evidence

- `PR-006` through `PR-008` and `PS-006` through `PS-008`;
- positive and negative Bun tests for catalog, manifest, compilation,
  authority, and staleness;
- `bun scripts/cascade.ts brief validate PB-001`;
- `bun scripts/cascade.ts brief generate PB-001 --check`;
- selected `product-context-core` pack compilation;
- full Cascade repository validation after the generated projection is fixed.
