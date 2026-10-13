# Harness Structure And Write Targets

Cascade is a coding-agent harness and plugin source checkout. This repository
contains no target-product backend or UI. `harness.config.yaml` owns the source
profile, paths and commands; target repositories adapt their own configuration.

## Source And Runtime

| Path | Purpose | Owner |
|---|---|---|
| `AGENTS.md`, `CODEX.md` | Thin boot contract and runtime routing | Harness maintenance |
| `harness.config.yaml`, `.codex/config.toml` | Project paths, commands, roles and model settings | Harness maintenance |
| `.codex/skills/`, `.codex/agents/` | Canonical host effects and role contracts | Agent Engineer integration |
| `.codex/plugins/`, `.agents/plugins/` | Fifteen portable plugin source packages and marketplace | Owning plugin and harness maintenance |
| `.codex/task-admission/` | Typed LLM interpretation, policies and controls | Admission runtime |
| `.codex/artifact-destinations.json`, `.codex/schemas/workspace/` | Workspace context and durable-write contracts | Workspace MCP and authorized host closeout |
| `scripts/cascade.ts`, `scripts/cascade/cli/` | CLI entrypoint and asynchronous command dispatch | Harness runtime |
| `scripts/cascade/workspace-service.ts`, `scripts/cascade/workspace-mcp.ts` | Bounded context and prepare/persist adapter | Workspace runtime |
| `scripts/cascade/closeout.ts`, `scripts/cascade/closeout-hook.ts` | Task-scoped file/evidence checks and advisory hook | Host closeout |
| `scripts/cascade-runtime.ts`, `scripts/build-runtime-bundle.ts` | Portable core entrypoint and bundle builder | Harness maintenance |
| `scripts/runtime-templates/AGENTS.md` | Target boot template | Target onboarding |
| `.codex/harness-tooling/` | Isolated pinned Playwright and browser tooling | Harness maintenance |
| `.github/` | Shared pull request and Copilot contracts | Harness maintenance |

Portable methods belong to installed namespaced plugins. The host owns current
repository context, authorized mutation, target execution and evidence checks.
Plugin source in this checkout does not prove installation or release.

The optional core bundle has a ceiling of 120 files. It carries host contracts,
compiled adapters, the frozen plugin catalog and empty target documentation
scaffolding. It excludes source plugins, evaluation labs, source tests and
local task history. Build output is disposable; no distribution snapshot is
retained as repository context.

## Documentation

| Path | Store here |
|---|---|
| `docs/work/tasks/{task_id}.md` | One internal task ID, optional real product task reference, current state, scope, handoff and check results |
| `docs/work/task-template.md`, `docs/work/task.schema.json` | Numbered task template and metadata contract |
| `docs/specs/{slice-slug}/` | Accepted public or implementation contracts; source packets only when useful |
| `docs/specs/source/` | Explicitly preserved source material; avoid disposable research dumps |
| `docs/product/` | Actual product units (contours/modules/features/models), explicit owner-document paths, stable catalog relationships and approved personas |
| `docs/design/` | Retained templates, interaction rules, tokens and accepted design decisions |
| `docs/brand/` | Accepted positioning, naming and content rules |
| `docs/patterns/` | Reusable workflow, boundaries, testing, context memory and selectable architecture references |
| `docs/glossary.md` | Stable names whose meaning affects routing or implementation |

[Work](work/_index.md) stays flat until an actual product-task organization is
adopted. Use `T-001`, `T-002`, and subsequent internal numbers. Bind the real
product/tracker ID and source when supplied; do not invent product folders or
external identities. Update the same record through completion. Plans remain
inline unless an accepted contract requires a separate durable artifact.
There are no default lane, graph, report, archive or backlog directories.

For a genuinely complex project, Cascade Project Management can produce a
coordination artifact. Reference the accepted artifact from the task record;
its presence never grants dispatch, tool, publication or mutation authority.
Product, architecture and quality facts remain with their actual owners.

Pattern entries use `index.md` and `*.pack.yaml`, under
`docs/patterns/context-pack-schema.yaml`. Select only the relevant documents and
sections with `scripts/cascade.ts patterns`; do not load the entire catalog.
Architecture graphs and matching specs are selectable references. Source
scaffolding requires an adopted profile and collision review through
`scripts/scaffold_architecture_default.py`, never inferred application roots.

## Evaluation And Temporary Output

| Path | Purpose |
|---|---|
| `harness-evals/` | Harness scenarios, synthetic onboarding fixtures, catalogs, schemas and judge profiles |
| `product-evals/campaigns/`, `product-evals/tasks/`, `product-evals/simulations/` | Optional reusable simulation campaign definitions and typed tasks |
| `product-evals/intakes/` | Scope-separated admission, product context and exact action-policy bindings |
| Other `product-evals/` contract roots | Versioned claims, policies, oracles, treatments, calibration, rubrics and evidence schemas |
| `.artifacts/` | Ignored current local checks and evaluation output; never canonical task or product truth |

Retain synthetic regression inputs that exercise runtime contracts. Do not mix
actual client projects, research packets, product solutions or old run dumps
into skills or default target scaffolding. Live/provider, semantic, deployment
and calibrated evidence remain distinct from local structural tests.

Default runtime tests, focused contract checks and the Cascade validator are
configured in `harness.config.yaml`. Evaluation and simulation methods remain
optional; deleting old output does not delete their source contracts or claim
that a new evaluation ran.
