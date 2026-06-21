# Spec Slice Harness Audit

Date: 2026-06-20
Status: implemented locally, upstream issues opened
Repository: `oleksandr-rud/cascade-codex`

## Request

Update Cascade so processed docs and plan-ready spec material are stored in a
folder per big issue, capability, or workflow slice:

```text
docs/specs/{slice-slug}/
docs/specs/persona-context-compiler/
```

Remove the old global processed-spec bucket rule and scan the harness for stale
references. Prepare an agentic workflow for the full request and analyze the
harness surfaces and references in depth.

## Decision

The harness now treats `docs/specs/{slice-slug}/` as the canonical location for
plan-ready spec packets, package files, prompt scripts, and module catalogs.

The old global processed-spec bucket is no longer a valid folder. The validator
explicitly rejects the legacy folder name and stale references to the old path
or template name.

## File Tree Scan

| Scan | Result |
|---|---|
| Command | `rg --files -uu --hidden -g '!/.git/**' -g '!**/__pycache__/**'` |
| Files scanned | 159 |
| `.codex/` files | 120 |
| `docs/` files | 31 |
| `scripts/` files | 2 |
| Root harness files | 6 plus `.gitignore` |

## Reference Searches

| Search | Purpose | Result |
|---|---|---|
| Old storage/config/template search | Find old storage path, old config key, and old template name | No hits outside validator stale guards. |
| `rg -n "\b[Tt]ransformed\b"` | Find old conceptual wording | Only validator stale guards and legacy folder-name constant remain. |
| `rg -n "docs/specs/\{slice-slug\}\|docs/specs/persona-context-compiler"` | Confirm new generic and concrete slice paths | Hits in root docs, skills, config, validator, semantic-core package, and glossary. |
| `python scripts/validate_cascade_codex.py` | Validate harness wiring and new invariants | PASS. |
| `python scripts/compile_persona_context.py` | Validate package compiler path and referenced source inclusion | PASS; emitted Markdown context bundle. |

## Surface Analysis

### Root Harness Files

| File | Role | Migration Status |
|---|---|---|
| `AGENTS.md` | Thin project boot contract | Already adapted for Dynamic Persona Assistant; no spec-slice rule belongs here. |
| `CODEX.md` | Runtime bridge and write-target routing | Updated write target from the legacy processed-spec bucket to `docs/specs/{slice-slug}/` and clarified one-folder-per-slice rule. |
| `README.md` | Harness package guide | Updated shipped docs description and memory wording to mention per-slice spec packets. |
| `harness.config.example.yaml` | Target adapter template | Replaced the old specs config key with `specs_slice_pattern: docs/specs/{slice-slug}`. |
| `harness.config.yaml` | Current target adapter | Replaced the old specs config key with `specs_slice_pattern: docs/specs/{slice-slug}`. |
| `.gitignore` | Local ignore rules | No migration required. |

### Scripts

| File | Role | Migration Status |
|---|---|---|
| `scripts/validate_cascade_codex.py` | Mechanical harness invariant checker | Updated required files/folders, allowed docs folder logic, stale old-path guards, renamed template checks, dynamic spec-slice validation, and Windows path normalization. |
| `scripts/compile_persona_context.py` | Local semantic-core compiler | Updated default package path to `docs/specs/persona-context-compiler/persona-semantic-core.package.yaml`. |

### Docs Tree

| File Or Folder | Role | Migration Status |
|---|---|---|
| `docs/_index.md` | Docs area index | Updated to "source and spec packets." |
| `docs/structure.md` | Folder/write-target map | Updated spec translation path to `docs/specs/{slice-slug}/` and defined one folder per issue/capability/workflow slice. |
| `docs/specs/_index.md` | Spec index | Replaced the legacy bucket rows with `persona-context-compiler/` rows and documented `{slice-slug}/`. |
| `docs/specs/source/` | Provided source material saved mostly as-is | Replaced the old incoming-spec folder name after issue #7. |
| `docs/specs/persona-context-compiler/` | Concrete migrated slice | Added semantic-core spec, package YAML, catalog YAML, and prompt script. |
| Legacy processed-spec bucket | Legacy global bucket | Removed. Validator now rejects this folder if it reappears. |
| `docs/glossary.md` | Shared vocabulary | Updated paths for persona semantic core and module catalog. |
| `docs/patterns/context-memory.md` | Context and retrieval rules | Added semantic-core package rules: package YAML, catalog YAML, Markdown specs, prompt scripts, deterministic compiler, source boundaries. |
| `docs/patterns/workflow.md` | Workflow and closeout rules | Updated spec routing language to `spec/spec-packet path`. |
| `docs/patterns/boundaries.md` | Boundary map | No old spec-path rule remained; earlier scaffold setup remains valid. |
| `docs/work/reports/_index.md` | Report index | Includes persona behavioral research; should also index this audit and workflow packet. |
| `docs/work/reports/2026-06-20-persona-simulator-behavioral-patterns.md` | Research synthesis | Updated canonical model from JSON-shaped object to file-first semantic core under the slice folder. |

### Agent Role Contracts

| Agent | Files | Migration Status |
|---|---|---|
| `orchestrator` | `.codex/agents/orchestrator.*` | Updated route wording to spec packets. |
| `project-onboarder` | `.codex/agents/project-onboarder.*` | Updated onboarding output wording to spec packets. |
| `agent-engineer` | `.codex/agents/agent-engineer.*` | Loaded as selected role for harness maintenance; no direct path edit required. |
| `business-analyst` | `.codex/agents/business-analyst.*` | Updated evidence-backed spec packet wording. |
| `security` | `.codex/agents/security.*` | Checked; no spec-storage edit required. |
| `designer` | `.codex/agents/designer.*` | Checked; no spec-storage edit required. |

### Skill Contracts

| Skill | Migration Status |
|---|---|
| `ingest-spec` | Updated normalized packet target to `docs/specs/{slice-slug}/` and template to `templates/spec-packet.md`. |
| `compose-spec` | Updated source order, checklist, write targets, output, and template name to spec packets. |
| `synthesis-to-spec` | Updated plan-ready output target to per-slice spec packets. |
| `discover` | Updated normalized specs path. |
| `docs-impact-map` | Updated impact rows to spec packets. |
| `closeout` | Updated durable spec fact target to per-slice packet. |
| `codex-maintenance` | Updated docs separation invariant to `docs/specs/{slice-slug}/`. |
| `adapt-harness` | Updated onboarding references and project-part template targets. |
| `plan-change`, `market-validation`, `brand-positioning`, `design-system`, `visual-qa` | Updated old spec-packet wording where they referenced spec dependencies. |
| Unaffected execution skills | `context`, `orchestrate-work`, `implement-change`, `review-change`, `validate-change`, `test-autorepair`, `issue-intake`, focused research/security/design skills had no old path dependency. |

### Templates

| Old | New | Status |
|---|---|---|
| `.codex/skills/ingest-spec/legacy template path` | `.codex/skills/ingest-spec/templates/spec-packet.md` | Renamed and updated. |
| `.codex/skills/compose-spec/legacy template path` | `.codex/skills/compose-spec/templates/spec-packet.md` | Renamed and updated. |

## Persona Context Compiler Slice

| File | Purpose |
|---|---|
| `docs/specs/persona-context-compiler/persona-semantic-core.md` | Plan-ready spec packet for the file-first semantic core. |
| `docs/specs/persona-context-compiler/persona-semantic-core.package.yaml` | Package manifest with compile order, internal refs, external research summaries, and output rules. |
| `docs/specs/persona-context-compiler/persona-semantic-core.catalog.yaml` | Module tree, act catalog, policies, packets, and source bindings. |
| `docs/specs/persona-context-compiler/persona-context-compiler.prompt.md` | Prompt script for assembling package context before model use. |

## Validator Invariants Added

- `legacy processed-spec bucket` is a legacy folder name and is invalid.
- the legacy template path and legacy spec-packet token are stale references.
- One-level `docs/specs/{slice-slug}/` folders are allowed when `{slice-slug}`
  is kebab-case.
- Markdown files inside spec-slice folders must include:
  - `## Source`
  - `## Classification`
  - `## Behavior Examples`
  - `## Functional Acceptance Checks`
  - `## Handoff`
- `rel()` now uses POSIX paths so the validator works on Windows and POSIX.

## Doc Routing Decision Matrix

| Fact | Source | Owner Target | Action | Bloat Check | Evidence | Next Gate |
|---|---|---|---|---|---|---|
| Processed spec docs are stored per big issue/capability/workflow slice | User request | `CODEX.md`, `docs/structure.md`, skills, validator | UPDATED | Replaced one global bucket rule with one path invariant | `rg` stale search and validator PASS | closeout |
| Persona semantic-core files belong in `docs/specs/persona-context-compiler/` | User request and prior semantic-core work | `docs/specs/persona-context-compiler/` | UPDATED | Moved only the four persona slice files; no broad docs dump | compiler PASS | closeout |
| Old processed-spec bucket method should not return | User request | `scripts/validate_cascade_codex.py` | UPDATED | Validator rejects old folder and stale references mechanically | validator PASS | closeout |
| Agentic workflow for the whole migration should be durable | User request | `docs/work/reports/2026-06-20-spec-slice-migration-workflow.md` | UPDATED | Stored as a report because it coordinates multiple harness surfaces | packet written | issue follow-up |

## Upstream Issue Pack

These harness-scoped follow-ups remain open against `oleksandr-rud/cascade-codex`:

1. [#1 Adopt per-slice `docs/specs/{slice-slug}` spec packet storage](https://github.com/oleksandr-rud/cascade-codex/issues/1)
2. [#2 Rename legacy spec templates and wording to spec-packet](https://github.com/oleksandr-rud/cascade-codex/issues/2)
3. [#3 Add validator support for dynamic spec-slice folders](https://github.com/oleksandr-rud/cascade-codex/issues/3)

Issue #1 was corrected after creation so its follow-up scope stays harness-only:
template naming and validator mechanics, not project/example semantic-core
packages.

Non-harness correction:

- [#4 Add persona-context-compiler semantic-core package example](https://github.com/oleksandr-rud/cascade-codex/issues/4)
  was closed as `not_planned` because it is project/example-specific, not a
  harness-wide rule change.

## Validation

| Command | Result | Notes |
|---|---|---|
| `python scripts/validate_cascade_codex.py` | PASS | `cascade_codex_status=PASS`; 6 agents, 36 skills. |
| `python scripts/compile_persona_context.py` | PASS | Emitted Markdown context bundle with source boundaries. |
| `python -m py_compile scripts/compile_persona_context.py scripts/validate_cascade_codex.py` | PASS | Python syntax check. |

## Remaining Risk

- The current branch has setup changes from the earlier harness installation in
  addition to this migration. Commit or PR scope should either include both or
  split them before publication.
- GitHub issue creation succeeded through the GitHub connector. Local `gh`
  remains unauthenticated.
