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
work-lane tracking, and release validation into one reusable package.

The harness tooling runtime is Bun, but the target repository is stack-neutral.
Inventory, configured checks, and campaign tasks may describe Node, Bun,
Python, Go, Rust, Java, or mixed systems. Bun improves startup, direct
TypeScript execution, and distribution simplicity; model calls and browser
runs remain the dominant latency in live evaluations.

## Current Snapshot

- Harness name: `cascade`
- Runtime bridge: `CODEX.md`
- Adapter template: `harness.config.example.yaml`
- Local role contracts: 9
- Registered skills: 44
- Canonical skill and role source: `.codex/skills/` and `.codex/agents/`
- Planning and judge model: `gpt-5.6-sol`
- Read-heavy execution model: `gpt-5.6-terra`
- Tooling runtime: Bun `1.3.3`
- Validator: `bun scripts/cascade.ts validate`

## What It Ships

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
| `scripts/cascade.ts` | Bun entrypoint for validation, target inventory, product briefs, pattern packs, harness evals, and campaigns. |
| `scripts/cascade/` | Focused TypeScript modules for each harness-tooling responsibility. |

`CODEX.md`, `docs/structure.md`, `docs/patterns/`, and the validator also
reserve `.codex/skills/` and `.codex/agents/` as the canonical locations for
reusable workflow skills and role contracts in a complete release package.

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

For non-atomic engineering work, the compiled controls select applicable
stages from this path:

```text
context -> ingest-spec/discover/market-validation/synthesis-to-spec/compose-spec if needed -> docs-impact-map when durable docs may affect sibling rules -> pattern-context when reusable pattern packs are needed -> plan-change -> plan-iterations when delivery spans horizons -> orchestrate-work when feasible committed first-iteration scope needs coordination -> functional-qa when new product-visible proof is needed -> implement-change -> review-change -> validate-change -> test-autorepair only if stale tests -> closeout
```

Use `issue-intake` only for issue bodies or tracker tickets. Use
`test-autorepair` only when automated tests are stale, flaky, or failing while
the product behavior still matches the intended contract.

Broad work is split by `orchestrate-work` only when lanes have independent
source inputs, disjoint file ownership or one integration/materialization
owner, acceptance checks, and version-bound integration/materialization
evidence. Shared product/design/security decisions stay serialized.

Complex lanes can use lane-local Task Graphs. Cross-workline dependencies,
evidence or batch joins, materialization/integrated-validation boundaries,
invalidation, or partial repair use a separate
`docs/work/graphs/CG-XXX-*.md` Coordination Graph. Existing work records are
audited by `reconcile-work-graph` before direct cutover; product/spec/design/
brand documents retain rich definitions and reference the graph only when
needed. Atomic work and unrelated worklines bypass Coordination Graphs.
Cascade does not add a graph runtime or replace the agent's reasoning and tool
loop, and graph materialization never implies committing or publishing the
active worktree.

After a lane or graph completes, `closeout` retires its active projection and
automatically chains `archive-work`. Eligible frozen originals move to
`docs/archive/work-reports/` behind a digest-bound capsule; blocked archive
maintenance returns `ARCHIVE_DEFERRED` without undoing completion. This is an
instruction-driven same-turn chain, not a background scheduler.

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
discover or market-validation -> ingest-spec or synthesis-to-spec -> compose-spec -> docs-impact-map -> plan-change -> functional-qa
```

Explicit workflow-packet requests are routed separately from active execution.
Use `agentic-workflow-builder` when the requested output is an agentic
workflow, workflow checklist, prompt bank, delegation workflow, or multi-agent
workflow packet. Use `orchestrate-work` when the work is already accepted and
needs active lanes, serialization, coordination/materialization ownership, or
validation scheduling. Use `reconcile-work-graph` first when existing
worklines need evidence-backed deduplication, stale-state reconciliation, or
canonical graph cutover.

## Roles And Skills

Cascade is skill-first. Role contracts exist where a repeated workflow needs a
clear boundary:

| Role | Model | Owns |
|---|---|---|
| `orchestrator` | `gpt-5.6-sol` | Normal task routing plus explicit workflow-packet routing across context, ingest, impact, planning, acceptance, implementation, review, validation, repair, and closeout. |
| `project-onboarder` | `gpt-5.6-terra` | New-repository setup, read-heavy harness adaptation, config/docs migration, validation, and setup handoff. |
| `agent-engineer` | `gpt-5.6-sol` | Cascade maintenance and target-project agent/LLM system design, including agent graphs, model/tool loops, retrieval, memory, permissions, tool contracts, simulation campaigns, observability, cost/safety controls, evals, and Codex surface decisions. |
| `business-analyst` | `gpt-5.6-sol` | Long market validation, competitor/pain/economics lanes, evidence grading, and synthesis into specs. |
| `security` | `gpt-5.6-sol` | Security-sensitive review, auth/session/RBAC and tenant-boundary analysis, secure-design review, audit evidence, and security validation planning. |
| `designer` | `gpt-5.6-terra` | Read-heavy UX flow review, accessibility review, visual validation, design-system routing, and design handoff planning. |
| `harness-evaluator` | `gpt-5.6-sol` | Read-only outcome or trajectory judgment of eligible Cascade scenario outputs and traces after deterministic hard gates. |
| `simulation-operator` | `gpt-5.6-terra` | Bounded mutable execution of one approved command, terminal, browser, desktop, mobile, or agent-response campaign with evidence freezing and cleanup. |
| `simulation-evaluator` | `gpt-5.6-sol` | Independent read-only evaluation of frozen cross-contour evidence, policies, oracles, semantic claims, and claim support. |

Agent Engineer is not limited to Cascade internals. Use it for target-project
agent and LLM systems too: framework-backed agent runtimes, project-owned
agents, model routing, prompt/context assembly, retrieval and memory, tool
permission boundaries, structured outputs, traces, evals, and safety controls.
When those decisions require product/runtime code changes, the implementation
still routes through planning, architecture or secure-design review when
needed, `implement-change`, and validation.

The 44 registered skills cluster into:

- Core execution and workflow packets: `context`, `agentic-workflow-builder`,
  `orchestrate-work`, `reconcile-work-graph`, `plan-change`, `functional-qa`,
  `implement-change`, `review-change`, `validate-change`, `test-autorepair`,
  `issue-intake`, `closeout`.
- Spec and product routing: `ingest-spec`, `discover`, `docs-impact-map`,
  `synthesis-to-spec`, `compose-spec`, `brand-positioning`, `design-system`.
- Market and business analysis: `market-validation`, `pain-mining`,
  `competitive-map`, `market-economics`, `hypothesis-scoring`,
  `validation-experiments`, `adversarial-critic`.
- Specialist review: `architecture-review`, `codebase-audit`,
  `auth-analysis`, `secure-design`, `ux-flow-review`,
  `accessibility-review`, `visual-qa`.
- Harness and agent-system design/maintenance: `agents-best-practices`,
  `develop-skill`, `codex-maintenance`, `pattern-context`,
  `adapt-harness`, `simulation-campaigns`, `simulation-execution`,
  `simulation-evaluation`, `harness-evaluation`.

`simulation-campaigns` owns versioned campaign definition, selection,
coordination, replay planning, receipt aggregation, and reporting across all
six contours. `simulation-execution` and `simulation-operator` own the mutable
run, evidence freeze, cleanup, and execution receipt.
`simulation-evaluation` and `simulation-evaluator` independently judge frozen
cross-contour evidence. Product-visible acceptance oracles remain with
`functional-qa`, Cascade trace grading remains with `harness-evaluation` and
`harness-evaluator`, and runner or schema changes remain with
`codex-maintenance`.

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
and does not select versions.

The write-target map is intentionally narrow. The validator rejects unexpected
docs folders, stale active skill references, unwired skills, invalid custom
agent TOML, overgrown `AGENTS.md`, stale naming, project-specific token
leakage, stale eval catalogs, and broken traceability IDs. The deeper harness
audit adds missing-resource, semantic leakage, route, runtime, and trace checks.

## Setup In A Target Repository

Start from a clean Cascade checkout or release bundle, then copy the harness
into the target repository root. Review collisions first if the target already
has `AGENTS.md`, `CODEX.md`, `.github/`, `.codex/`, `docs/`, or `scripts/`.

Prerequisites are Bun `1.3.3` and, only for browser-task campaigns, a
Playwright browser installed with
`bun run --cwd .codex/harness-tooling playwright install chromium`.

Cascade's browser dependency is isolated under `.codex/harness-tooling/`.
Never replace or merge the target application's root `package.json` or lockfile
to install Cascade.

```bash
export CASCADE_SRC=/path/to/cascade
export TARGET_REPO=/path/to/target-repo

rsync -a --backup --suffix=.pre-cascade \
  --exclude '.git/' \
  --exclude '.DS_Store' \
  --exclude 'node_modules/' \
  "$CASCADE_SRC"/AGENTS.md \
  "$CASCADE_SRC"/CODEX.md \
  "$CASCADE_SRC"/harness.config.example.yaml \
  "$CASCADE_SRC"/.github \
  "$CASCADE_SRC"/.codex \
  "$CASCADE_SRC"/docs \
  "$CASCADE_SRC"/harness-evals \
  "$CASCADE_SRC"/product-evals \
  "$CASCADE_SRC"/scripts \
  "$TARGET_REPO"/

cd "$TARGET_REPO"
cp harness.config.example.yaml harness.config.yaml
bun install --cwd .codex/harness-tooling --frozen-lockfile
bun scripts/cascade.ts validate
bun scripts/cascade.ts target inventory --root .
```

Keep the target project's existing `README.md` unless you intentionally want
to replace it. This README is the Cascade package guide; the target project
README should usually stay product-facing.

After copying, ask Codex to adapt the harness from the target repository root.
For a normal setup pass:

```text
/goal Adapt Cascade to this repository. Run the deterministic project inventory,
then inspect the current code, docs,
AGENTS.md, CODEX.md, .codex/, package files, build files, test config,
entrypoints, public contracts, and README files before writing. Use
project-onboarder with adapt-harness to fill AGENTS.md, CODEX.md,
harness.config.yaml, docs/structure.md, docs/glossary.md, validation commands,
and doc routing. Preserve user-authored instructions unless replacement is
required. Keep AGENTS.md thin, route project facts to the narrowest owner docs,
run bun scripts/cascade.ts validate --target, run available target
checks, and close with files changed, skipped, blockers, and next routes.
```

For a deeper onboarding pass that builds future planning context:

```text
/goal Run deep Cascade onboarding for this repository. Use project-onboarder
with adapt-harness and the project onboarding workflow. Inventory stack,
source roots, test roots, docs roots, app entrypoints, public contracts,
commands, and runners. Build project-part specs only for meaningful backend,
frontend, shared, data, integration, runtime, security, or tooling areas.
Catalog product features from routes, UI surfaces, APIs, tests, specs, docs,
and user-facing copy. Use visual-qa when the UI can run or screenshots/design
evidence exists. Route product, design, brand, spec, security, architecture,
testing, glossary, and context-memory facts to the narrowest existing owner
docs. Create docs/work/onboarding-manifest.json after target configuration is
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
2. Replace placeholders in `AGENTS.md`, `docs/glossary.md`,
   `docs/patterns/boundaries/index.md`, and any product/design/spec docs that should
   guide future work.
3. Add the release-bundle `.codex/skills/` and `.codex/agents/` assets when the
   target runtime should load reusable Cascade skills or role contracts.
4. Run `bun scripts/cascade.ts validate --target` from the repository
   root after configuration is adapted. For deep onboarding, initialize and
   complete `docs/work/onboarding-manifest.json`, then add
   `--require-onboarding-complete`.

## Validation

The validator checks for required harness files, expected skill and role assets,
canonical route tokens, TOML validity, allowed docs folders, stale active skill
references, stale naming, project-specific leakage, and product traceability. A
complete Cascade release should pass:

```bash
bun install --cwd .codex/harness-tooling --frozen-lockfile
bun scripts/cascade.ts validate
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
agents=9
skills=44
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
bun scripts/cascade.ts target inventory --root .
bun scripts/cascade.ts target init-manifest
bun scripts/cascade.ts target probe-commands
bun scripts/cascade.ts target refresh-manifest
bun scripts/cascade.ts validate --target \
  --require-onboarding-complete
bun scripts/cascade.ts target drift
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
