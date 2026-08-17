# Harness Structure And Write Targets

Use this file as the Cascade folder map. Keep project facts in docs and
config; keep reusable workflow rules in skills, agents, and patterns.

## Core Folders

| Folder | Purpose | Written By |
|---|---|---|
| `.agents/plugins/` | Repo-local plugin marketplace catalog | `plugin-creator`, `codex-maintenance` |
| `.github/` | Pull request description contract and GitHub Copilot repository instructions | `codex-maintenance`, `adapt-harness` |
| `docs/work/` | Active work lanes, first-class Coordination Graphs, copyable examples, lane packets, reports, handoffs | `orchestrate-work`, `market-validation`, `plan-change`, `validate-change`, `closeout` |
| `docs/archive/work-reports/` | Compact archive capsules and relocated frozen lane, graph, and report history | `archive-work` automatically after closeout or for direct historical cleanup |
| `docs/specs/` | Incoming and spec packets | `ingest-spec`, `synthesis-to-spec`, `compose-spec`, `discover`, `docs-impact-map`, `adapt-harness` |
| `docs/product/` | Product intent plus stable domain/capability relationships, requirements, journeys, personas, and scenarios | `discover`, `market-validation`, `synthesis-to-spec`, `compose-spec`, `ingest-spec`, `docs-impact-map` |
| `docs/design/` | Interaction model, tokens, components, design constraints | `discover`, `design-system`, `ingest-spec`, `docs-impact-map` |
| `docs/brand/` | Naming, tone, content, visual direction | `discover`, `brand-positioning`, `ingest-spec`, `docs-impact-map` |
| `docs/backlog/` | Follow-up candidates with acceptance criteria | `discover`, `synthesis-to-spec`, `compose-spec`, `validation-experiments`, `docs-impact-map`, `issue-intake`, `closeout` |
| `docs/patterns/` | Reusable workflow, boundary, testing, context rules, and selectable context packs | `pattern-context`, `closeout`, `adapt-harness`, Agent Engineer skills |
| `.codex/skills/` | Reusable workflow skills | `develop-skill`, Agent Engineer skills |
| `.codex/agents/` | Role contracts and skill maps | Agent Engineer skills |
| `.codex/plugins/` | Repo-local plugin source packages referenced by the repository marketplace | `plugin-creator`, `codex-maintenance` |
| `.codex/harness-tooling/` | Isolated pinned browser-simulation dependencies and Playwright runner files | Harness maintainers |
| `harness-evals/` | Canonical scenarios, generated catalog, target schema, judge profiles, anchored rubrics, and judgment schema | `harness-evaluation`, `judge-eval-builder` |
| `.artifacts/harness-evals/` | Ignored raw JSONL traces, normalized runs, eligibility, judgments, and local reports | `scripts/cascade/evals.ts` |
| `product-evals/campaigns/`, `product-evals/tasks/`, `product-evals/simulations/` | Canonical simulation campaigns, reusable tasks, populations, scenarios, worlds, datasets, and generated catalog | `simulation-campaigns`, Agent Engineer |
| `product-evals/intakes/harness/`, `product-evals/intakes/product/` | Scope-separated Task Envelope/product-context/action-policy bindings; product campaigns require a current READY intake before execution | `simulation-campaigns`, Agent Engineer; consumed by Simulation Operator and Simulation Evaluator |
| `product-evals/claims/`, `product-evals/policies/`, `product-evals/oracles/`, `product-evals/metrics/`, `product-evals/treatments/`, `product-evals/calibrations/`, `product-evals/rubrics/` | Versioned claim, policy, oracle, metric, treatment, calibration, evaluator-profile, rubric, and evaluation-schema authorities | `simulation-campaigns`, `simulation-evaluation`, Agent Engineer |
| `.artifacts/product-evals/` | Ignored append-only product-evaluation execution, evaluation, calibration, and aggregation receipts | `scripts/cascade/campaigns.ts`, `simulation-execution`, `simulation-evaluation` |
| `.codex/skills/simulation-campaigns/` | Campaign authoring, selection, dispatch/replay planning, receipt aggregation, claim projection, and reporting contract | `develop-skill`, `codex-maintenance`, Agent Engineer |
| `.codex/skills/simulation-execution/` | Bounded selected-run lifecycle and execution receipt contract | `simulation-operator`, `develop-skill`, `codex-maintenance` |
| `.codex/skills/simulation-evaluation/` | Read-only frozen-evidence, policy, oracle, semantic, and claim-support contract | `simulation-evaluator`, `develop-skill`, `codex-maintenance` |

The repository marketplace at `.agents/plugins/marketplace.json` catalogs the
Cascade Prompt source at `.codex/plugins/cascade-prompt/`. Keeping catalog and
source in the repository makes the package portable; it does not by itself
mean the plugin is installed, active, or published.

The optional `cascade-simulations` personal plugin is installed outside this
repository and is intentionally not mirrored into `.codex/skills/` or
`.codex/plugins/`. Cascade references its `cascade-simulations:simulate`
entrypoint through `.codex/config.toml`; the plugin owns compact dynamic-actor
definitions, while the `product-evals/` tree below remains campaign evaluation
infrastructure.

## Active Work Paths

- Active registry: `docs/work/active.md`
- Deep-onboarding evidence: `docs/work/onboarding-manifest.json` in target
  repositories only; it binds phase dispositions, project-part/doc-routing
  decisions, preserved collision backups, config/source digests, validation,
  and drift.
- Lane template: `docs/work/lane-template.md`
- Work graph template: `docs/work/work-graph-template.md`
- Coordination Graph template: `docs/work/graph-template.md`
- Coordination Graph index: `docs/work/graphs/_index.md`
- Coordination Graph entries: `docs/work/graphs/CG-XXX-slug.md`
- Lane examples: `docs/work/examples/`
- Lane packets: `docs/work/lanes/W-XXX-slug.md`
- Durable reports: `docs/work/reports/YYYY-MM-DD-slug.md`
- Active work graphs: `docs/work/reports/YYYY-MM-DD-*-work-graph.md`, linked
  from `docs/work/active.md`
- Completed work graphs: retained as durable reports and removed from the
  active registry during terminal closeout
- Completed-work archive index: `docs/archive/work-reports/_index.md`
- Compact archive capsules:
  `docs/archive/work-reports/YYYY-MM-DD-scope-archive.md`
- Relocated frozen work artifacts:
  `docs/archive/work-reports/YYYY-MM-DD-original-filename.md`

Coordination Graph entries are separate work entities that connect two or more
canonical worklines across real dependencies, joins, worktree materialization,
integrated validation, invalidation, or partial repair. They are not worklines,
lanes, specs, generated documents, or runtimes. Lane packets keep lane-local
Task Graph authority and read-only graph references after direct cutover;
`active.md` remains a derived projection.

`docs/work/` is the live and recent execution surface. After a lane or graph
completes, `closeout` automatically hands its exact closed set to
`archive-work`. The skill moves it to `docs/archive/work-reports/` only after
terminal evidence, dependency closure, index consistency, inbound references,
and pre/post file digests pass; otherwise it returns `ARCHIVE_DEFERRED` and
leaves live files in place. The compact archive capsule is the rehydration
entrypoint; relocated originals remain detailed historical authority and are
not rewritten.

## Spec Translation Paths

- Source specs: `docs/specs/source/`; preserve provided or imported source
  material mostly as-is when useful for traceability, source comparison, or
  future re-normalization. Add only compact metadata such as category,
  task/issue type, preservation mode, routing target, and planning status.
- Spec packet folders: `docs/specs/{slice-slug}/`; create one folder per big
  issue, capability, or workflow slice. Use it for plan-ready packets with
  source classification, behavior examples, acceptance checks, open questions,
  package files, prompt scripts, and module catalogs.
- Product relationship catalog and schema:
  `docs/product/catalog.{yaml,schema.json}`; stable `PD-XXX` domains and
  `PC-XXX` capabilities point to exact owner rows and evaluation references.
- Product brief manifest schema and per-slice selections:
  `docs/specs/brief-manifest.schema.json` and
  `docs/specs/<slice-slug>/brief.yaml`. Generated `brief.generated.md` files
  are digest-bound projections checked through `scripts/cascade.ts brief`.
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
  text with `scripts/cascade.ts patterns`.
- Task-admission schemas, controls, and deterministic policies:
  `.codex/task-admission/`; compile or validate them with
  `scripts/cascade.ts admission`. Project-scoped hook wiring lives in
  `.codex/hooks.json`, while shadow classification cases live in
  `harness-evals/task-admission/`.
- Product-context briefs: assemble exact product/catalog sources and selected
  reusable rules with `scripts/cascade.ts brief`; do not use generated output
  as a replacement product authority.
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
- Pull request description contract: `.github/pull_request_template.md`
- GitHub Copilot repository instructions: `.github/copilot-instructions.md`
- Adapter variables: `harness.config.yaml`
- Codebase folder map and boundary rules: `docs/patterns/boundaries/index.md`
- Reference architecture graph/spec pairs:
  `docs/patterns/architecture-defaults/`
- Application-stack routing:
  `docs/patterns/architecture-defaults/app-stack.{graph.yaml,spec.md}`
- Contour application stacks:
  `docs/patterns/architecture-defaults/{backend,frontend,native,cli,experiment,library}-stack.{graph.yaml,spec.md}`
- SDK/library archetype:
  `docs/patterns/architecture-defaults/sdk-library.{graph.yaml,spec.md}`
- Infrastructure scope and resource selection:
  `docs/patterns/architecture-defaults/infrastructure.{graph.yaml,spec.md}`
- Application-contour infrastructure profiles:
  `docs/patterns/architecture-defaults/{backend,frontend,native,cli,experiment,library}-infrastructure.{graph.yaml,spec.md}`;
  these route application or package needs while resource extensions retain
  provider authority
- Infrastructure resource extensions:
  `docs/patterns/architecture-defaults/infrastructure-{compute,data,messaging,delivery}.{graph.yaml,spec.md}`
  remain the only resource/provider selection authorities
- Source-linked stack claims, policies, application units, infrastructure
  scopes/resources, and candidate disposition contract:
  `docs/patterns/architecture-defaults/stack-selection-evidence.schema.json`
- Stack selection evidence validation:
  `scripts/validate_stack_selection_evidence.py`
- Safe source profile manifest and preview/write tool:
  `docs/patterns/architecture-defaults/architecture-scaffold-profiles.json`
  and `scripts/scaffold_architecture_default.py`
- Reusable architecture lessons: `docs/patterns/boundaries/index.md` or another
  bounded `docs/patterns/{entry}/` folder with metadata and pack YAML
- Stack details, source roots, test roots, commands, runners, tracker settings,
  and memory locations: `harness.config.yaml`
- Project-specific architecture facts: `harness.config.yaml`,
  `docs/patterns/boundaries/index.md`, or `docs/glossary.md`
- Deterministic target inventory, manifest initialization/refresh, config/path
  checks, fixture acceptance, and drift:
  `scripts/cascade.ts target`
- Target analysis schemas:
  `.codex/skills/adapt-harness/schemas/`

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
- `docs/patterns/architecture-defaults/`
- `docs/patterns/testing/`
- `docs/patterns/context-memory/`
- `docs/patterns/product-context/`

Required files per entry:

- `index.md`
- `*.pack.yaml`

The workflow entry may additionally contain
`fragments/graph-fragment.schema.json`, `fragments/_index.md`, and versioned
`fragments/GF-*.fragment.json` definitions. Planning and orchestration assemble
only applicable fragments; active instances remain in the owning plan, lane
Task Graph, or Coordination Graph.

Use `docs/patterns/context-pack-schema.yaml` for the metadata contract and
`scripts/cascade.ts patterns` to build filtered text from packs.
Architecture source scaffolds are a separate explicit path: select and record
the graph/spec profile first, preview with
`scripts/scaffold_architecture_default.py preview`, and use `write` only for a
new no-conflict source structure. The tool does not install dependencies or
overwrite target files.

## Harness Evaluation Paths

- Source cases: `harness-evals/skill-cases.json`
- Cross-skill collisions: `harness-evals/interactions.json`
- Generated catalog: `harness-evals/scenarios.generated.json`
- Target response schema: `harness-evals/response.schema.json`
- Judgment schema: `harness-evals/judge-response.schema.json`
- Judge profiles and rubrics: `harness-evals/judge-profiles.json`, `harness-evals/rubrics/`
- Runner, eligibility checks, scoring, and aggregation: `scripts/cascade/evals.ts`
- Ignored live run evidence: `.artifacts/harness-evals/<run-id>/`
- Durable scenario and trace rules: `docs/patterns/agent-evaluation/index.md`

## Simulation Campaign Paths

These paths are optional controlled-evaluation infrastructure. Ordinary
single-actor simulations use the separately installed
`cascade-simulations:simulate` plugin and do not initialize this package.

Implemented skill and runtime authority:

- Skill: `.codex/skills/simulation-campaigns/SKILL.md`
- Design template:
  `.codex/skills/simulation-campaigns/templates/campaign-design.md`
- Quality checklist:
  `.codex/skills/simulation-campaigns/checklists/campaign-quality.md`
- Execution skill and role:
  `.codex/skills/simulation-execution/`;
  `.codex/agents/simulation-operator/`;
  `.codex/agents/simulation-operator.toml`
- Evaluation skill and role:
  `.codex/skills/simulation-evaluation/`;
  `.codex/agents/simulation-evaluator/`;
  `.codex/agents/simulation-evaluator.toml`
- Program:
  `docs/work/reports/2026-07-27-cross-surface-simulation-program.md`
- Foundation lane:
  `docs/work/lanes/W-004-cross-surface-simulation-foundation.md`
- Agent-tool composition lane:
  `docs/work/lanes/W-012-agent-tool-composition.md`
- Work graph:
  `docs/work/reports/2026-07-27-cross-surface-simulation-work-graph.md`

Canonical deterministic runtime authority owned by W-004:

- Campaign manifests and generated catalog: `product-evals/campaigns/`
- Typed reusable tasks: `product-evals/tasks/`
- Shared simulation schemas: `product-evals/simulations/`
- Product-evaluation artifact and privacy default:
  `product-evals/artifact-policy.json`
- Harness-only simulation fixtures: `product-evals/simulations/harness/`
- Target-product simulations: `product-evals/simulations/product/`
- Harness and product simulation intakes: `product-evals/intakes/harness/` and
  `product-evals/intakes/product/`; Task Envelope snapshots remain beneath the
  same selected scope root.
- Versioned claims and policies: `product-evals/claims/` and `product-evals/policies/`
- Deterministic oracle definitions: `product-evals/oracles/`
- Versioned metrics and exact treatment identities: `product-evals/metrics/` and
  `product-evals/treatments/`
- Calibration definitions and frozen framework/reference score fixtures:
  `product-evals/calibrations/`
- Semantic rubrics, fixture/Codex evaluation profiles, provider output schema,
  and stored receipt schema: `product-evals/rubrics/`
- Bun 1.3.3 runner and deterministic reducers: `scripts/cascade.ts` and
  `scripts/cascade/`
- Isolated Playwright package and configuration: `.codex/harness-tooling/`
- Machine-readable target starter:
  `.codex/skills/simulation-campaigns/templates/starter/package.template.json`
- Human design template:
  `.codex/skills/simulation-campaigns/templates/campaign-design.md`
- Ignored append-only run container:
  `.artifacts/product-evals/<run-id>/`, with an immutable `execution/` namespace
  plus sibling `specialized-evaluations/`, `calibrations/`, and
  `aggregations/` receipt namespaces; each
  `evaluations/<evaluation-id>/` contains an immutable frozen `input/`,
  provider command/trace/stderr, attempt record, and accepted `receipt.json`
- Ignored append-only refinement review receipts:
  `.artifacts/product-evals/refinement-reviews/<disposition-id>/`; these bind a
  frozen proposal and reviewed external-evidence manifests, and never mutate a
  persona source file.

The deterministic framework fixture proves definition resolution, stateful
fake execution, policy/oracle reduction, evidence freezing, treatment
ranking, and calibration-receipt mechanics. It cannot support target-project
release eligibility. Missing surface adapters or target reference data remain
`GAP`, `BLOCKED`, or `NOT_RUN`; an authored campaign that has not executed is
`NOT_RUN`.

Every simulation manifest declares `simulation_scope` and lives under its
matching root. Resolver validation rejects cross-root manifests and co-located
definitions. Harness scope permits framework calibration only. Product scope
states intended target authority but does not prove target behavior. The
separate `harness-evals/` corpus evaluates Cascade skills, routes, responses,
and traces rather than product or framework simulation definitions.

Bootstrap a target-project package by reviewing the dry-run first:

```bash
bun scripts/cascade.ts simulation init <simulation-id> --owner-lane W-NNN \
  --dry-run
bun scripts/cascade.ts simulation init <simulation-id> --owner-lane W-NNN
```

Initialization creates the simulation model, population, scenario, world,
fixture, partitioned dataset, metric, baseline/candidate treatments,
framework calibration and score fixtures, policy, oracle, task, claims,
campaign, and co-located product-scoped `simulation-design.md` under
`product-evals/simulations/product/`. It then validates the graph
and atomically regenerates the registry. Any existing output path aborts the
operation without overwrite.

An approved deterministic persona derivation can be previewed or materialized
without overwrite:

```bash
bun scripts/cascade.ts simulation derive-population P-NNN \
  --simulation <simulation-id> --mode <mode> --dry-run
bun scripts/cascade.ts simulation derive-population P-NNN \
  --simulation <simulation-id> --mode <mode> --write
```

Refinement proposals remain immutable run evidence. Reviewers record a separate
disposition with `simulation dispose-refinement`; the command first verifies
the completed run manifest and exact proposal/run binding. `ACCEPTED` requires at least
one reviewed external-evidence manifest and authorizes only the
`synthesis-to-spec` route. Remote storage and export are disabled by default,
raw sensitive material is excluded, and restricted evidence requires operator
attestation under `product-evals/artifact-policy.json`.

W-012 will own only the agent-to-command/HTTP/browser/terminal/desktop/mobile
composition profiles, manifests, fake matrix, tool-event linkage, and joined
results. W-004 remains the shared schema, policy, reducer, artifact, and final
merge authority; W-005 through W-010 retain their surface adapters and
policies.
