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

## Current Snapshot

- Harness name: `cascade`
- Runtime bridge: `CODEX.md`
- Adapter template: `harness.config.example.yaml`
- Local role contracts: 6
- Registered skills: 36
- Canonical skill and role source: `.codex/skills/` and `.codex/agents/`
- Validator: `python3 scripts/validate_cascade_codex.py`

The validator filename and output label still use `cascade_codex` as a stable
compatibility name. Treat that as a path/API label, not the product name.

## What It Ships

| Path | Purpose |
|---|---|
| `AGENTS.md` | Thin boot contract for coding agents: project identity, hard guardrails, validation commands, operating rules, and pointers only. |
| `CODEX.md` | Runtime bridge: load order, canonical task route, optional escalations, role references, work packets, write targets, and closeout evidence rules. |
| `.codex/config.toml` | Harness registry: name, bridge path, config template, canonical route, memory roots, MCP server config, and role registry. |
| `.codex/skills/` | Reusable workflow skills with trigger-focused frontmatter, source order, output contracts, templates, checklists, and references where needed. |
| `.codex/agents/` | Local role contracts, TOML manifests, skill maps, delegation policy, and specialist checklists. |
| `harness.config.example.yaml` | Target-repository adapter template for stack, roots, validation commands, routing, functional acceptance, memory, tracker, and pattern paths. |
| `docs/structure.md` | Folder/write-target map for specs, product, design, brand, active work, backlog, patterns, and architecture facts. |
| `docs/patterns/` | Reusable workflow, boundary, testing, and context-memory rules. |
| `docs/work/` | Active work registry, lane template, examples, lane packets, reports, and handoffs. |
| `docs/specs/`, `docs/product/`, `docs/design/`, `docs/brand/` | Durable owner docs for source material, product intent, design constraints, and naming/content direction. |
| `docs/backlog/`, `docs/glossary.md` | Follow-up candidates and shared codebase/product vocabulary. |
| `scripts/validate_cascade_codex.py` | Packaging and consistency validator for a complete Cascade distribution. |

`CODEX.md`, `docs/structure.md`, `docs/patterns/`, and the validator also
reserve `.codex/skills/` and `.codex/agents/` as the canonical locations for
reusable workflow skills and role contracts in a complete release package.

## Workflow Model

Cascade routes non-atomic engineering work through this path:

```text
context -> ingest-spec/discover/market-validation/synthesis-to-spec/compose-spec if needed -> docs-impact-map when durable docs may affect sibling rules -> orchestrate-work -> plan-change -> functional-qa -> implement-change -> review-change -> validate-change -> test-autorepair only if stale tests -> closeout
```

Use `issue-intake` only for issue bodies or tracker tickets. Use
`test-autorepair` only when automated tests are stale, flaky, or failing while
the product behavior still matches the intended contract.

Broad work is split by `orchestrate-work` only when lanes have independent
source inputs, disjoint file ownership or one merge owner, acceptance checks,
and merge evidence. Shared product/design/security decisions stay serialized.

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
needs active lanes, serialization, merge ownership, or validation scheduling.

## Roles And Skills

Cascade is skill-first. Role contracts exist where a repeated workflow needs a
clear boundary:

| Role | Owns |
|---|---|
| `orchestrator` | Normal task routing plus explicit workflow-packet routing across context, ingest, impact, planning, acceptance, implementation, review, validation, repair, and closeout. |
| `project-onboarder` | New-repository setup, harness adaptation, config/docs migration, validation, and setup handoff. |
| `agent-engineer` | Cascade maintenance and target-project agent/LLM system design, including agent graphs, model/tool loops, retrieval, memory, permissions, tool contracts, observability, cost/safety controls, evals, and Codex surface decisions. |
| `business-analyst` | Long market validation, competitor/pain/economics lanes, evidence grading, and synthesis into specs. |
| `security` | Security-sensitive review, auth/session/RBAC and tenant-boundary analysis, secure-design review, audit evidence, and security validation planning. |
| `designer` | UX flow review, accessibility review, visual validation, design-system routing, and design handoff planning. |

Agent Engineer is not limited to Cascade internals. Use it for target-project
agent and LLM systems too: framework-backed agent runtimes, project-owned
agents, model routing, prompt/context assembly, retrieval and memory, tool
permission boundaries, structured outputs, traces, evals, and safety controls.
When those decisions require product/runtime code changes, the implementation
still routes through planning, architecture or secure-design review when
needed, `implement-change`, and validation.

The 36 registered skills cluster into:

- Core execution and workflow packets: `context`, `agentic-workflow-builder`,
  `orchestrate-work`, `plan-change`, `functional-qa`, `implement-change`,
  `review-change`, `validate-change`, `test-autorepair`, `issue-intake`,
  `closeout`.
- Spec and product routing: `ingest-spec`, `discover`, `docs-impact-map`,
  `synthesis-to-spec`, `compose-spec`, `brand-positioning`, `design-system`.
- Market and business analysis: `market-validation`, `pain-mining`,
  `competitive-map`, `market-economics`, `hypothesis-scoring`,
  `validation-experiments`, `adversarial-critic`.
- Specialist review: `architecture-review`, `codebase-audit`,
  `auth-analysis`, `secure-design`, `ux-flow-review`,
  `accessibility-review`, `visual-qa`.
- Harness and agent-system design/maintenance: `agents-best-practices`,
  `develop-skill`, `codex-maintenance`, `adapt-harness`.

## Documentation And Memory

Cascade keeps durable facts in owner docs instead of growing prompt files:

- Project and stack facts live in `harness.config.yaml` after installation.
- Boot rules stay in `AGENTS.md`.
- Routing and role detail stay in `CODEX.md`.
- Product, design, brand, specs, backlog, and glossary facts stay under
  `docs/`.
- Active execution state and evidence stay under `docs/work/`.
- Reusable workflow lessons live in `.codex/skills/`, `.codex/agents/`, or
  `docs/patterns/`.

The write-target map is intentionally narrow. The validator rejects unexpected
docs folders, stale active skill references, unwired skills, invalid TOML,
overgrown `AGENTS.md`, stale naming, project-specific leakage, and broken
traceability IDs.

## Setup In A Target Repository

Start from a clean Cascade checkout or release bundle, then copy the harness
into the target repository root. Review collisions first if the target already
has `AGENTS.md`, `CODEX.md`, `.codex/`, `docs/`, or `scripts/`.

```bash
export CASCADE_SRC=/path/to/cascade
export TARGET_REPO=/path/to/target-repo

rsync -a --backup --suffix=.pre-cascade \
  --exclude '.git/' \
  --exclude '.DS_Store' \
  "$CASCADE_SRC"/AGENTS.md \
  "$CASCADE_SRC"/CODEX.md \
  "$CASCADE_SRC"/harness.config.example.yaml \
  "$CASCADE_SRC"/.codex \
  "$CASCADE_SRC"/docs \
  "$CASCADE_SRC"/scripts \
  "$TARGET_REPO"/

cd "$TARGET_REPO"
cp harness.config.example.yaml harness.config.yaml
python3 scripts/validate_cascade_codex.py
```

Keep the target project's existing `README.md` unless you intentionally want
to replace it. This README is the Cascade package guide; the target project
README should usually stay product-facing.

After copying, ask Codex to adapt the harness from the target repository root.
For a normal setup pass:

```text
/goal Adapt Cascade to this repository. Inspect the current code, docs,
AGENTS.md, CODEX.md, .codex/, package files, build files, test config,
entrypoints, public contracts, and README files before writing. Use
project-onboarder with adapt-harness to fill AGENTS.md, CODEX.md,
harness.config.yaml, docs/structure.md, docs/glossary.md, validation commands,
and doc routing. Preserve user-authored instructions unless replacement is
required. Keep AGENTS.md thin, route project facts to the narrowest owner docs,
run python3 scripts/validate_cascade_codex.py, run available target checks, and
close with files changed, skipped, blockers, and next routes.
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
docs. Do not create broad dump folders. Validate and close out with evidence,
blocked checks, and follow-up routes.
```

Manual setup still works when an agent is unavailable:

1. Fill in the target project's stack, source roots, test roots, public
   contracts, validation commands, tracker settings, and memory paths in
   `harness.config.yaml`.
2. Replace placeholders in `AGENTS.md`, `docs/glossary.md`,
   `docs/patterns/boundaries.md`, and any product/design/spec docs that should
   guide future work.
3. Add the release-bundle `.codex/skills/` and `.codex/agents/` assets when the
   target runtime should load reusable Cascade skills or role contracts.
4. Run `python3 scripts/validate_cascade_codex.py` from the repository root
   after the full package is present.

## Validation

The validator checks for required harness files, expected skill and role assets,
canonical route tokens, TOML validity, allowed docs folders, stale active skill
references, stale naming, project-specific leakage, and product traceability. A
complete Cascade release should pass:

```bash
python3 scripts/validate_cascade_codex.py
```

Expected output includes:

```text
cascade_codex_status=PASS
agents=6
skills=36
project_specific_leakage=0
standalone_qa_refs=0
```

Run repository-specific install, test, typecheck, lint, build, functional, and
end-to-end commands from the values filled into `harness.config.yaml`.
