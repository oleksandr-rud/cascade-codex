# Harness Structure And Write Targets

Use this file as the Cascade folder map. Keep project facts in docs and
config; keep reusable workflow rules in skills, agents, and patterns.

## Core Folders

| Folder | Purpose | Written By |
|---|---|---|
| `docs/work/` | Active work lanes, first-class Coordination Graphs, copyable examples, lane packets, reports, handoffs | `orchestrate-work`, `market-validation`, `plan-change`, `validate-change`, `closeout` |
| `docs/specs/` | Incoming and spec packets | `ingest-spec`, `synthesis-to-spec`, `compose-spec`, `discover`, `docs-impact-map`, `adapt-harness` |
| `docs/product/` | Product intent, requirements, journeys, personas, scenarios | `discover`, `market-validation`, `synthesis-to-spec`, `compose-spec`, `ingest-spec`, `docs-impact-map` |
| `docs/design/` | Interaction model, tokens, components, design constraints | `discover`, `design-system`, `ingest-spec`, `docs-impact-map` |
| `docs/brand/` | Naming, tone, content, visual direction | `discover`, `brand-positioning`, `ingest-spec`, `docs-impact-map` |
| `docs/backlog/` | Follow-up candidates with acceptance criteria | `discover`, `synthesis-to-spec`, `compose-spec`, `validation-experiments`, `docs-impact-map`, `issue-intake`, `closeout` |
| `docs/patterns/` | Reusable workflow, boundary, testing, context rules, and selectable context packs | `pattern-context`, `closeout`, `adapt-harness`, Agent Engineer skills |
| `.codex/skills/` | Reusable workflow skills | `develop-skill`, Agent Engineer skills |
| `.codex/agents/` | Role contracts and skill maps | Agent Engineer skills |
| `evals/harness/` | Canonical scenarios, generated catalog, target schema, judge profiles, anchored rubrics, and judgment schema | `harness-evaluation`, `judge-eval-builder` |
| `.artifacts/harness-evals/` | Ignored raw JSONL traces, normalized runs, eligibility, judgments, and local reports | `scripts/run_harness_evals.py` |

## Active Work Paths

- Active registry: `docs/work/active.md`
- Lane template: `docs/work/lane-template.md`
- Coordination Graph template: `docs/work/graph-template.md`
- Coordination Graph index: `docs/work/graphs/_index.md`
- Coordination Graph entries: `docs/work/graphs/CG-XXX-slug.md`
- Lane examples: `docs/work/examples/`
- Lane packets: `docs/work/lanes/W-XXX-slug.md`
- Durable reports: `docs/work/reports/YYYY-MM-DD-slug.md`

Coordination Graph entries are separate work entities that connect two or more
canonical worklines across real dependencies, joins, worktree materialization,
integrated validation, invalidation, or partial repair. They are not worklines,
lanes, specs, generated documents, or runtimes. Lane packets keep lane-local
Task Graph authority and read-only graph references after direct cutover;
`active.md` remains a derived projection.

## Spec Translation Paths

- Source specs: `docs/specs/source/`; preserve provided or imported source
  material mostly as-is when useful for traceability, source comparison, or
  future re-normalization. Add only compact metadata such as category,
  task/issue type, preservation mode, routing target, and planning status.
- Spec packet folders: `docs/specs/{slice-slug}/`; create one folder per big
  issue, capability, or workflow slice. Use it for plan-ready packets with
  source classification, behavior examples, acceptance checks, open questions,
  package files, prompt scripts, and module catalogs.
- Product scenarios: `docs/product/scenarios.md`
- Product intent, requirements, journeys, and personas: `docs/product/`
- Domain-owned product folders under `docs/product/<domain>/` are allowed only
  when the target repo already uses or explicitly defines that catalog shape;
  otherwise use the flat required owner docs.
- Interaction, accessibility, component, token, and design constraints:
  `docs/design/`
- Naming, tone, content, and visual direction: `docs/brand/`
- Active work lane: `docs/work/active.md` or `docs/work/lanes/W-XXX-slug.md`
- Cross-workline coordination state: `docs/work/graphs/CG-XXX-slug.md`; never
  embed Coordination Graph boilerplate in product/source/generated specs
- Reusable planning-time graph fragments:
  `docs/patterns/workflow/fragments/GF-*.fragment.json`; these are pattern
  definitions, not active work or generated product/spec documents
- Codebase vocabulary: `docs/glossary.md`

## Business Analysis Paths

- Market validation reports and research lane outputs: `docs/work/reports/`
  when requested, multi-turn, blocked, or decision-heavy.
- Durable research memory summaries and research-to-spec wiring:
  `docs/patterns/context-memory/index.md`.
- Pattern context packs: `docs/patterns/{entry}/*.pack.yaml`; build selected
  text with `scripts/build_pattern_context_pack.py`.
- Plan-ready product synthesis and authoring: existing owner docs under
  `docs/product/`, `docs/specs/{slice-slug}/`, and `docs/backlog/_index.md`.
- Source preservation: `docs/specs/source/` only when `ingest-spec` decides a
  raw research or source packet should be preserved.
- Doc routing: use the shared Doc Routing Decision Matrix before appending
  durable market, product, spec, design, brand, backlog, glossary, or pattern
  facts.

## Cross-Folder Impact Paths

Use `docs-impact-map` when a durable product, design, brand, spec, backlog,
glossary, or pattern fact may affect sibling docs. Store compact impact reports
under `docs/work/reports/` only when requested, multi-turn, blocked, or
decision-heavy; otherwise update the smallest existing owner docs.

## Architecture Translation Paths

- Repo boot contract and hard guardrails: `AGENTS.md`
- Runtime bridge: `CODEX.md`
- Adapter variables: `harness.config.yaml`
- Codebase folder map and boundary rules: `docs/patterns/boundaries/index.md`
- Reusable architecture lessons: `docs/patterns/boundaries/index.md` or another
  bounded `docs/patterns/{entry}/` folder with metadata and pack YAML
- Stack details, source roots, test roots, commands, runners, tracker settings,
  and memory locations: `harness.config.yaml`
- Project-specific architecture facts: `harness.config.yaml`,
  `docs/patterns/boundaries/index.md`, or `docs/glossary.md`

## Closeout Thin Diffs

At task finishing, `closeout` may append small sourced deltas to existing owner
docs when the final diff changed durable facts:

- product/spec/design/brand facts: `docs/product/`, `docs/design/`,
  `docs/brand/`, or `docs/specs/`
- architecture, public contract, adapter, state-machine, or runtime invariant:
  `docs/patterns/boundaries/index.md`
- stack, command, source root, runner, tracker, or memory path:
  `harness.config.yaml` in target repositories
- codebase vocabulary: `docs/glossary.md`

If no existing doc owns the delta, write a concise report under
`docs/work/reports/` and route larger discovery or spec normalization through
`discover` or `ingest-spec`.

## Thin Entrypoint Policy

`AGENTS.md` is autoloaded. Keep it to project identity, primary users, a tiny
stack summary, hard guardrails, real validation commands, and pointers. Do not
store full dependency lists, long architecture essays, product/spec detail,
role inventories, historical decisions, or learned lessons there.

## Pattern Files

Each pattern entry is a folder:

- `docs/patterns/workflow/`
- `docs/patterns/boundaries/`
- `docs/patterns/testing/`
- `docs/patterns/context-memory/`

Required files per entry:

- `index.md`
- `*.pack.yaml`

The workflow entry may additionally contain
`fragments/graph-fragment.schema.json`, `fragments/_index.md`, and versioned
`fragments/GF-*.fragment.json` definitions. Planning and orchestration assemble
only applicable fragments; active instances remain in the owning plan, lane
Task Graph, or Coordination Graph.

Use `docs/patterns/context-pack-schema.yaml` for the metadata contract and
`scripts/build_pattern_context_pack.py` to build filtered text from packs.

## Harness Evaluation Paths

- Source cases: `evals/harness/skill-cases.json`
- Cross-skill collisions: `evals/harness/interactions.json`
- Generated catalog: `evals/harness/scenarios.generated.json`
- Target response schema: `evals/harness/response.schema.json`
- Judgment schema: `evals/harness/judge-response.schema.json`
- Judge profiles and rubrics: `evals/harness/judge-profiles.json`, `evals/harness/rubrics/`
- Runner, eligibility checks, scoring, and aggregation: `scripts/run_harness_evals.py`
- Ignored live run evidence: `.artifacts/harness-evals/<run-id>/`
- Durable scenario and trace rules: `docs/patterns/agent-evaluation/index.md`
