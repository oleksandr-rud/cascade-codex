# Cascade

An agentic workflow learning harness

Cascade is a standalone operating harness for coding agents. It turns a
repository from "one prompt plus good intentions" into a validated workflow
system: agents orient to the repo, classify incoming work, plan before editing,
route durable facts to the right docs, validate visible behavior, repair stale
tests only when behavior is still correct, and leave useful handoff memory.

Use Cascade when a repository needs more than a single prompt file. The
harness combines a thin boot contract, a runtime bridge, adapter
configuration, role contracts, reusable skills, documentation write targets,
optional durable coordination, and release validation into one source package.
Normal target repositories use the generated core runtime profile instead of
copying the source, plugin-development, and evaluation layers wholesale.

The harness tooling runtime is Bun, but the target repository is stack-neutral.
Inventory, configured checks, and campaign tasks may describe Node, Bun,
Python, Go, Rust, Java, or mixed systems. Bun improves startup, direct
TypeScript execution, and distribution simplicity; model calls and browser
runs remain the dominant latency in live evaluations.

## Current Snapshot

- Harness name: `cascade`
- Runtime bridge: `CODEX.md`
- Adapter template: `harness.config.example.yaml`
- Core target role contracts: 7; simulation lab roles are optional
- Registered host skills: 9
- Canonical skill and role source: `.codex/skills/` and `.codex/agents/`
- Repo-local Cascade plugin sources: 14
- Planning model: `gpt-5.6-sol`
- Execution, prompt-builder, and judge model: `gpt-5.6-sol`
- Tooling runtime: Bun `1.3.3`
- Validator: `bun scripts/cascade.ts validate`
- Lean target runtime: `bun run build:runtime` (the build enforces a 120-file ceiling)

## Source Checkout And Target Runtime

This repository is the full source monorepo. It intentionally contains all 14
plugin packages, source validators, 981 admission regression cases, 138
generated harness scenarios, simulation campaigns, fixtures, and historical
design/work evidence. Those are development and lab assets, not one runtime
dependency graph.

`bun run build:runtime` creates `dist/cascade-runtime/`, a lean target profile
with the host roles and effect skills, a compact Bun command adapter, task
admission policy, the frozen plugin capability catalog, Coordinator contracts,
and Workspace MCP. It excludes plugin source, harness evals, product evals,
browser tooling, source tests, and historical work records. Plugins stay
standalone and resolve from Codex's installed plugin inventory.

The core profile includes Orchestrator, Agent Engineer, Security, Product
Designer, Software Engineer, Frontend Engineer and Code Reviewer. Simulation
Operator and Simulation Evaluator are optional lab roles; harness judging uses
the optional Evals subject profile, not a dedicated host role.

Project identity belongs to `harness.config.yaml`. This checkout explicitly uses
`project.harness_profile: cascade-source` and the project name `Cascade`.
Distributed bundles use `target-project`: the actual destination's name, users,
stack, architecture and commands remain authoritative. The builder uses a
dedicated target boot template, never the source checkout's `AGENTS.md`.
During onboarding, merge existing instructions/docs and resolve the adapter
template from current target evidence; do not overwrite target-owned files or
copy this checkout's `harness.config.yaml`. The target validator rejects a
source profile in a core bundle. Older configs without a profile remain targets.

The full Analyzer–Policy Engine–Composer architecture and its executable
contracts remain in AI Architect. Its entrypoints, Prompt and integration
skills load those references only when explicitly requested or already adopted
by the target; a generic agent or prompt request does not select that topology.

## What The Source Checkout Contains

| Path | Purpose |
|---|---|
| `AGENTS.md` | Thin boot contract for coding agents: project identity, hard guardrails, validation commands, operating rules, and pointers only. |
| `CODEX.md` | Runtime bridge: load order, canonical task route, optional escalations, role references, work packets, write targets, and closeout evidence rules. |
| `.github/` | Shared pull request description contract plus repository instructions that make GitHub Copilot use the same task, status, cleanup, and evidence rules as Codex. |
| `.codex/config.toml` | Harness registry: name, bridge path, config template, canonical route, memory roots, MCP server config, and role registry. |
| `.codex/harness-tooling/` | Isolated pinned Bun/Playwright package; installing it never mutates the target application's root package manifest or lockfile. |
| `.codex/skills/` | Reusable workflow skills with trigger-focused frontmatter, source order, output contracts, templates, checklists, and references where needed. |
| `.codex/agents/` | Codex-compatible custom-agent TOML files plus local role contracts, skill maps, delegation policy, and specialist checklists. |
| `harness-evals/` | Curated per-skill cases, cross-skill collisions, a generated catalog, judge profiles, anchored rubrics, and response schemas. |
| `product-evals/tasks/`, `product-evals/campaigns/` | Reusable typed execution tasks and immutable campaign plans for deterministic commands, browser simulations, or agent-response evaluations. |
| `product-evals/simulations/` | Shared schemas plus explicit `harness/` framework fixtures and `product/` target-product simulation definitions; scope never upgrades evidence authority. |
| `.artifacts/harness-evals/` | Ignored local JSONL traces, normalized runs, deterministic grades, and reports. |
| `.artifacts/product-evals/` | Ignored immutable product-evaluation campaign manifests, task logs, evidence digests, and summaries. |
| `harness.config.example.yaml` | Target-repository adapter template for stack, roots, validation commands, routing, functional acceptance, memory, tracker, and pattern paths. |
| `docs/structure.md` | Folder/write-target map for specs, product, design, brand, active work, backlog, patterns, and architecture facts. |
| `docs/patterns/` | Reusable workflow, boundary, testing, context-memory, and product-context entries with YAML metadata and selectable context packs. |
| `docs/work/` | Active work registry, lane and Coordination Graph templates, first-class graph entries, examples, lane packets, reports, and handoffs. |
| `docs/archive/work-reports/` | Compact archive capsules and relocated frozen completed-work artifacts. |
| `docs/specs/`, `docs/product/`, `docs/design/`, `docs/brand/` | Durable owner docs for source material, per-slice spec packets and generated brief selections, product domain/capability intent, design constraints, and naming/content direction. |
| `docs/backlog/`, `docs/glossary.md` | Follow-up candidates and shared codebase/product vocabulary. |
| `scripts/cascade.ts` | Thin executable entrypoint for the asynchronous Cascade command dispatcher. |
| `scripts/cascade/cli/` | Reusable CLI application boundary. `executeCascadeCommand` lazily loads one command and can also be called by a future local service or MCP adapter. |
| `scripts/cascade/workspace-{service,mcp}.ts` | Bounded project-level MCP adapter for compiled context plus two-phase, closeout-owned durable artifact persistence. |
| `scripts/cascade/campaign/` | Campaign component modules: task adapter contracts, contour-specific built-ins, adapter registry, oracle evaluation, and artifact repository ports. |
| `scripts/cascade/` | Remaining command/application modules and filesystem-backed campaign infrastructure. |

`CODEX.md`, `docs/structure.md`, `docs/patterns/`, and the validator also
reserve `.codex/skills/` and `.codex/agents/` as the canonical locations for
reusable workflow skills and role contracts in a complete release package.

Cascade ships one CLI runtime and one narrow project-level MCP stdio adapter.
The MCP adapter compiles allowlisted repository context and performs
destination-registry-bound artifact preparation and persistence; it is not a
generic command endpoint or another agent runtime. The async dispatcher remains
the shared invocation seam for CLI commands and any future local HTTP, socket,
or worker transport. Long-lived command callers submit work through
`CascadeCommandExecutor`, which serializes commands so process-global state and
repository writes do not interleave. Transports must call the same
command/application services rather than duplicate campaign execution or
evidence policy.

A compiled executable resolves repository assets from `CASCADE_ROOT`, or from
its current working directory when that variable is unset. This makes the code
bundle relocatable while schemas, campaign definitions, plugins, and external
runner assets remain explicit repository resources.

Build the local executable with `bun run build:cli`. The resulting
`dist/cascade` contains the CLI and all TypeScript command modules; run it from
the Cascade repository root or set `CASCADE_ROOT` to that root. The build helper
also applies the required ad-hoc signature on macOS.

Build the target profile with `bun run build:runtime`. Its compact runtime
surface exposes only `admission`, `workflow`, `target`, `patterns`, and `work`.
Catalog generation, the 981-case admission corpus, harness evals, simulation
campaign execution, and source self-tests remain source-checkout commands.

## Workload Admission And Workflow Model

Cascade first compiles every request into a versioned Task Envelope. The
admission layer keeps direct answers and atomic edits lightweight while adding
independent security, scan, evidence, persistence, and program controls only
when their claims match. It recommends durable work but never dispatches it.

```bash
bun scripts/cascade.ts admission validate
bun scripts/cascade.ts admission assess --request "Implement a bounded CLI change"
bun scripts/cascade.ts admission corpus
```

Markdown remains the format for prose. Human-authored structured sources such
as policies, rules, registries, evaluation cases, campaigns, tasks, claims,
rubrics, and fixtures use strict YAML. JSON is reserved for schemas and
machine-owned compatibility surfaces: package/plugin/hook manifests, generated
catalogs, runtime envelopes, receipts, evidence, and JSONL streams. The shared
loader rejects duplicate keys, aliases, anchors, merge keys, explicit tags,
non-string mapping keys, and non-JSON values. Admission policy sources may omit
empty arrays and nullable fields; compilation restores those defaults before
applying the unchanged public schema.

```bash
bun scripts/cascade.ts policy validate
bun scripts/cascade.ts policy list --scope product --format yaml
bun scripts/cascade.ts policy extract --id TAP-007 --format yaml
bun scripts/cascade.ts policy compile --scope all --check
```

`policy compile` emits a deterministic composition to stdout unless `--check`
is used. It does not mutate authored sources or generated evidence.

For non-atomic engineering work, the default path is:

```text
context -> plan-change -> implement-change -> validate-change
```

Use `cascade-project-management:define-work-item` only for tracker-ready issue,
story, task, enabler, or experiment candidates. Portable project planning,
coordination, reconciliation, and completion assessment also live in Cascade
Project Management. Portable quality planning, test design, evidence
assessment, and defect triage live in Cascade QA. The harness retains only
`run-qa-plan` for authorized target execution, `repair-tests` for QA-proven
`TEST_DRIFT`, and `closeout` for authorized durable state effects. These routes
are conditional; ordinary bounded work creates no durable process artifacts.

Broad work is coordinated through
`cascade-project-management:manage-project` only when lanes have independent
source inputs, disjoint file ownership or one integration/materialization
owner, acceptance checks, and version-bound integration/materialization
evidence. Shared product, design, security, and quality decisions stay with
their owning plugins or decision owners.

Complex lanes can use lane-local Task Graphs. Cross-workline dependencies,
evidence or batch joins, materialization/integrated-validation boundaries,
invalidation, or partial repair use a separate
`docs/work/graphs/CG-XXX-*.md` Coordination Graph. Existing work records are
audited by the reconciliation mode of
`cascade-project-management:manage-project` before direct cutover;
product/spec/design/brand documents retain rich definitions and reference the
graph only when needed. Atomic work and unrelated worklines bypass
Coordination Graphs.
Cascade does not add a graph runtime or replace the agent's reasoning and tool
loop, and graph materialization never implies committing or publishing the
active worktree.

`cascade-project-management:close-project` assesses terminal and retention
readiness. `closeout` applies only exact, authorized host records. Retention is
never an automatic phase.

Planning composes these flows from reusable definitions under
`docs/patterns/workflow/fragments/`. Product, design, prototype, contract,
backend, frontend, data, integration, E2E, security, accessibility, and visual
fragments are selected only when impact evidence activates them. Their ports,
roles or authorized workers, skill calls, test strategies, evaluator authority,
and repair routes are resolved into the plan; omitted fragments generate no
workline, node, test, or terminal-gate requirement.

At closeout, the shared Doc Routing Decision Matrix records whether durable
product, design, brand, spec, architecture, stack, glossary, or backlog facts
were updated, already aligned, deferred, blocked, missing context, or did not
need documentation. The matrix uses the narrowest owner target and a bloat
check so future agents get useful sourced deltas instead of broad doc rewrites.

Discovery-heavy work uses:

```text
context (Discovery mode) -> owning namespaced plugin -> create-spec -> plan-change
```

Add Cascade QA only when the accepted behavior has a named quality, test,
acceptance, or risk gate.

Explicit agent-workflow requests are routed separately from active execution.
Use `cascade-ai-architect:design-agent-workflow` for the portable behavior flow and
`cascade-coding-agent:integrate-agent-assets` when that candidate must bind to
actual target roles, skills, execution surfaces, permissions, paths, and
validation. Use `cascade-project-management:manage-project` when the work
is already accepted and needs active lanes, serialization,
coordination/materialization ownership, or validation scheduling. Use its
reconciliation mode first when existing worklines need evidence-backed
deduplication, stale-state reconciliation, or canonical graph cutover.

Use `cascade-coordinator:select-capabilities` when the exact namespaced route is
ambiguous or a request spans plugin domains. Use
`cascade-coordinator:plan-workflow` only when the validated selection needs
multiple nodes, ordering, an artifact handoff, parallel branches, or a join. It
compiles Task Envelope claims, selected routes, artifact contracts, and typed
dependencies into a validated DAG. Both are controllers only: their artifacts
preserve `dispatch_authorized: false`, and host admission and execution remain
separate authority gates.

## Roles And Skills

Cascade is skill-first. Role contracts exist where a repeated workflow needs a
clear boundary:

| Role | Model | Owns |
|---|---|---|
| `orchestrator` | `gpt-5.6-sol` | Proportional normal-task routing, Coordinator consumption, plugin-backed work, implementation, and evidence. |
| `agent-engineer` | `gpt-5.6-sol` | Cascade maintenance, target onboarding/adaptation, and host integration of reviewed agent/LLM assets, including tools, memory, observability, eval wiring, and Codex surfaces. |
| `security` | `gpt-5.6-sol` | Read-only host selection of Cascade Security methods, redacted target evidence, and repository-specific validation or implementation handoff. |
| `harness-evaluator` | `gpt-5.6-sol` | Human-facing Harness Judge for read-only outcome or trajectory judgment of eligible Cascade scenario outputs and traces after deterministic hard gates. |
| `simulation-operator` | `gpt-5.6-sol` | Bounded mutable execution of one approved command, terminal, browser, desktop, mobile, or agent-response campaign with evidence freezing and cleanup. |
| `simulation-evaluator` | `gpt-5.6-sol` | Independent read-only evaluation of frozen cross-contour evidence, policies, oracles, semantic claims, and claim support. |

Agent Engineer is not limited to Cascade internals, but it integrates rather
than owns reusable architecture. Cascade AI Architect designs agent behavior;
Cascade Software Architect owns software boundaries and review; Cascade Coding
Agent owns portable harness methods. Agent Engineer binds their reviewed
artifacts to current target roles, prompts, tools, memory, permissions,
observability, eval wiring, and validators under repository authority.

The 9 registered host skills are repository context, persistence, mutation,
validation, target execution/repair, and closeout boundaries;
portable specialist methods are namespaced plugin skills. They cluster into:

- Core host execution: `context`, `plan-change`, `implement-change`,
  `run-qa-plan`, `validate-change`, `repair-tests`, and `closeout`, plus the
  namespaced Cascade Software Architect, Project Management, and QA skills.
- Spec and product routing: `context` in Discovery mode and `create-spec`,
  backed directly by Cascade Product, Personas, Market, and Design.
- Market and business analysis: direct `cascade-market:research-market`,
  `evaluate-market-opportunity`, `design-market-experiments`, and
  `brand-positioning` routes.
- Specialist review: namespaced Cascade Software Architect, Cascade Security, and
  Cascade Design skills selected by the applicable host role.
- Agent-system design and harness integration: Cascade AI Architect designs,
  Cascade Software Architect reviews affected software boundaries, Cascade
  Coordinator selects and orders cross-plugin capabilities, Cascade Coding
  Agent integrates or maintains, and host `pattern-context` persists reusable
  repository context only when needed.

`cascade-simulations:manage-simulation-campaign` owns versioned campaign definition, selection,
coordination, replay planning, receipt aggregation, and reporting across all
six contours. `cascade-simulations:execute-simulation-campaign` and
`simulation-operator` own the mutable
run, evidence freeze, cleanup, and execution receipt.
`cascade-evals:simulation-evaluation` and `simulation-evaluator` independently judge frozen
cross-contour evidence. Product-visible quality oracles and assessment remain
with Cascade QA, their target execution remains with `run-qa-plan`, Cascade
trace grading routes through `cascade-evals:harness-evaluation` and the Harness
Judge (`harness-evaluator`); runner or schema changes use
`cascade-coding-agent:maintain-harness` with host-authorized implementation.

## Documentation And Memory

Cascade keeps durable facts in owner docs instead of growing prompt files:

- Project and stack facts live in `harness.config.yaml` after installation.
- Boot rules stay in `AGENTS.md`.
- Routing and role detail stay in `CODEX.md`.
- Product, design, brand, per-slice spec packets, backlog, and glossary facts
  stay under `docs/`.
- Active execution state and evidence stay under `docs/work/`.
- Explicitly compacted completed-work history stays under
  `docs/archive/work-reports/`.
- Reusable workflow lessons live in `.codex/skills/`, `.codex/agents/`, or
  bounded `docs/patterns/{entry}/` folders with metadata and context packs.

Pattern entries include `index.md` and one or more `*.pack.yaml` files. Pack
YAML owns `summary`, `routing`, graph-like `documents`, and selectable
document `sections`. Use
`bun scripts/cascade.ts patterns --list-packs` to inspect
available packs and `--pack`, `--section`, `--tag`, or `--query` to compile
only the needed rule text.

Product briefs use a separate product-fact graph rather than storing product
facts in pattern packs. `docs/product/catalog.yaml` maps stable domains and
capabilities to exact owner rows. A per-slice `brief.yaml` selects those rows,
evidence metadata, evaluation authority, and reusable pattern sections. Check
the deterministic projection with:

```bash
bun scripts/cascade.ts brief list
bun scripts/cascade.ts brief validate PB-001
bun scripts/cascade.ts brief generate PB-001 --check
```

`docs/patterns/architecture-defaults/` currently provides 34 validated
reference graph/spec pairs. `stack-selection` is the stable selection authority.
`app-stack` routes application units to backend, frontend, native,
CLI, experiment, or library stack extensions. `infrastructure`
separately routes compute, data, messaging, and delivery resources. Agents
extract source-linked claims and policies from project
descriptions, requirements, operations constraints, explicit decisions, and
current code; classify each backend service, backend worker, web frontend,
native app, CLI, experiment, or independently distributed library; then record candidates as eligible, rejected,
proof-required, or a gap. They honor declared dependency and preservation
relationships and record each pair as adopted, adapted, rejected, or a gap.
Use the core
`architecture-defaults` pack for general, backend, native, CLI, experiment,
and SDK/library work, and the separate `frontend-architecture-defaults` pack for the web base,
frontend stack profiles, state/data, cache, realtime, and
UI-platform policies.

Backend, frontend, native, CLI, experiment, and library application-contour
infrastructure profiles translate an application or package shape into
justified resource needs; the compute, data, messaging, and delivery
extensions remain the only resource/provider authorities. Libraries default
to no production runtime and add build or distribution resources only from
evidence.

The architecture references are not all backend defaults.
`architecture-selection` chooses topology, `stack-selection` chooses a complete
operable profile from project evidence. The app-stack branch selects
application runtimes, frameworks, and libraries; the infrastructure branch
selects operated resources and provider topology. Their candidate verdicts and
proof gates remain independent. Validate the combined machine-readable
selection record before adoption:

```bash
python3 scripts/validate_stack_selection_evidence.py validate \
  /path/to/stack-selection.json
```

Five selected profiles can also be rendered as new source structures:

```bash
python3 scripts/scaffold_architecture_default.py list
python3 scripts/scaffold_architecture_default.py preview \
  --profile backend-bun \
  --target /path/to/new-source-root \
  --app-name api \
  --module-name orders
```

Use the separate `write` command only after reviewing the preview. The
generator preflights every path, never overwrites, does not install packages,
and does not select versions. `--module-name` must identify a concrete domain
entity or capability such as `auth`, `users`, `crm`, or `orders`; generic names
such as `core`, `common`, and `services` are rejected. The baseline emits no
speculative shared libraries, cache, messaging, event, provider, or generic
repository boilerplate.

The write-target map is intentionally narrow. The validator rejects unexpected
docs folders, stale active skill references, unwired skills, invalid custom
agent TOML, overgrown `AGENTS.md`, stale naming, project-specific token
leakage, stale eval catalogs, and broken traceability IDs. The deeper harness
audit adds missing-resource, semantic leakage, route, runtime, and trace checks.

## Setup In A Target Repository

Build the core target bundle from a clean Cascade checkout, then copy that
generated profile into the target repository root. Review collisions first if
the target already has `AGENTS.md`, `CODEX.md`, `.github/`, `.codex/`, or
`docs/`. The core profile requires Bun `1.3.3`; browser dependencies belong to
an explicitly added simulation lab, not the default installation.

```bash
export CASCADE_SRC=/path/to/cascade
export TARGET_REPO=/path/to/target-repo

cd "$CASCADE_SRC"
npx --offline --yes bun@1.3.3 run build:runtime

rsync -a --backup --suffix=.pre-cascade \
  "$CASCADE_SRC"/dist/cascade-runtime/ \
  "$TARGET_REPO"/

cd "$TARGET_REPO"
cp harness.config.example.yaml harness.config.yaml
npx --offline --yes bun@1.3.3 .codex/runtime/cascade.js target inventory --root .
npx --offline --yes bun@1.3.3 .codex/runtime/cascade.js target validate --root .
```

Install the plugin versions recorded in `.codex/plugins.lock.json` from the
Cascade marketplace before using their namespaced routes. At minimum,
Coordinator is needed for ambiguous or multi-plugin routing; domain plugins
remain on-demand. The bundle never contains a partial hidden copy of them.

The generated bundle does not replace the target project's `README.md` or root
package manifest. `CASCADE_RUNTIME.md` explains only the installed adapter.

After copying, ask Codex to adapt the harness from the target repository root.
For a normal setup pass:

```text
/goal Adapt Cascade to this repository. Run the deterministic project inventory,
then inspect the current code, docs,
AGENTS.md, CODEX.md, .codex/, package files, build files, test config,
entrypoints, public contracts, and README files before writing. Use Agent
Engineer with cascade-coding-agent:adapt-harness to fill AGENTS.md, CODEX.md,
harness.config.yaml, docs/structure.md, docs/glossary.md, validation commands,
and doc routing. Preserve user-authored instructions unless replacement is
required. Keep AGENTS.md thin, route project facts to the narrowest owner docs,
run the core `target validate` command, run available target
checks, and close with files changed, skipped, blockers, and next routes.
```

For a deeper onboarding pass that builds future planning context:

```text
/goal Run deep Cascade onboarding for this repository. Use Agent Engineer with
cascade-coding-agent:adapt-harness and the project onboarding workflow. Inventory stack,
source roots, test roots, docs roots, app entrypoints, public contracts,
commands, and runners. Build project-part specs only for meaningful backend,
frontend, shared, data, integration, runtime, security, or tooling areas.
Catalog product features from routes, UI surfaces, APIs, tests, specs, docs,
and user-facing copy. Use `cascade-design:visual-qa` when the UI can run or screenshots/design
evidence exists. Route product, design, brand, spec, security, architecture,
testing, glossary, and context-memory facts to the narrowest existing owner
docs. Create docs/work/onboarding-manifest.yaml after target configuration is
valid, preserve .pre-cascade hashes, record every ON-00 through ON-09,
project-part, doc-routing, and validation disposition, then refresh the
intentional source snapshot without changing preservation hashes. Do not create
broad dump folders. Require target validation, complete current onboarding
evidence, and a current drift result before closeout.
```

Manual setup still works when an agent is unavailable:

1. Fill in the target project's stack, source roots, test roots, public
   contracts, validation commands, tracker settings, and memory paths in
   `harness.config.yaml`.
2. Replace placeholders in `AGENTS.md`, `docs/glossary.md`, and only the
   product, design, spec, or pattern docs that current target evidence needs.
3. Install the plugin versions in `.codex/plugins.lock.json`; do not copy their
   source bodies into the target runtime.
4. Run `npx --offline --yes bun@1.3.3 .codex/runtime/cascade.js target
   validate --root .` after configuration is adapted. For deep onboarding,
   initialize and complete `docs/work/onboarding-manifest.yaml`, then add
   `--require-onboarding-complete`.

## Validation

The validator checks for required harness files, expected skill and role assets,
canonical route tokens, TOML validity, allowed docs folders, stale active skill
references, stale naming, project-specific leakage, and product traceability. A
complete Cascade release should pass:

```bash
bun install --cwd .codex/harness-tooling --frozen-lockfile
bun scripts/cascade.ts validate
bun scripts/cascade.ts workflow catalog --check
bun scripts/cascade.ts eval catalog --check
bun scripts/cascade.ts campaign catalog --check
bun scripts/cascade.ts brief check
bun scripts/cascade.ts eval self-test
bun scripts/cascade.ts target self-test
bun scripts/cascade.ts campaign self-test
bun test scripts/cascade
```

Expected output includes:

```text
cascade_status=PASS
agents=6
skills=9
project_specific_leakage=0
```

Run deterministic harness-eval checks with:

```bash
bun scripts/cascade.ts eval catalog --check
bun scripts/cascade.ts eval self-test
bun scripts/cascade.ts eval audit --runtime
```

Run repository-specific install, test, typecheck, lint, build, functional, and
end-to-end commands from the values filled into `harness.config.yaml`.

The target-project analysis CLI never executes configured install or test
commands implicitly:

```bash
npx --offline --yes bun@1.3.3 .codex/runtime/cascade.js target inventory --root .
npx --offline --yes bun@1.3.3 .codex/runtime/cascade.js target init-manifest
npx --offline --yes bun@1.3.3 .codex/runtime/cascade.js target probe-commands
npx --offline --yes bun@1.3.3 .codex/runtime/cascade.js target refresh-manifest
npx --offline --yes bun@1.3.3 .codex/runtime/cascade.js target validate \
  --require-complete
npx --offline --yes bun@1.3.3 .codex/runtime/cascade.js target drift
```

## Campaigns And Browser Simulations

A campaign is a versioned execution plan, not a test result. It groups typed
tasks, records the exact campaign and reusable-task digests, executes argv
arrays without a shell, and writes immutable local evidence under
`.artifacts/product-evals/<run-id>/`.

- `command` tasks run deterministic harness or target commands.
- `browser` tasks run Playwright against a controlled fixture or application.
- `agent-response` tasks invoke the read-only harness-eval runner and retain its
  separate trace and judge evidence.

Playwright is required only for `browser` tasks. It supplies isolated browser
contexts, user-visible locators, screenshots/traces, and repeatable UI state;
it does not by itself give an autonomous agent browser-tool permission. An
agent that must explore an arbitrary live UI still needs a separately
configured, permissioned browser-tool adapter.

```bash
bun scripts/cascade.ts campaign list
bun scripts/cascade.ts campaign validate simulation-contract-smoke
bun scripts/cascade.ts campaign run simulation-contract-smoke
bun scripts/cascade.ts campaign resume <run-id> --lease-id <lease-id>
bun scripts/cascade.ts campaign verify <run-id>
```
