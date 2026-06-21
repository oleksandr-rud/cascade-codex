# Specs Index

Use this area for source specs and plan-ready spec packets.

Recommended files:

- `source/`: provided or imported source docs saved mostly as-is, with only
  compact metadata or planning status when useful.
- `{slice-slug}/`: one folder per big issue, capability, or workflow slice,
  containing plan-ready spec packets, package files, prompt scripts, and
  module catalogs for that slice.

## Source Preservation

Use `source/` for original supplied documents, ticket excerpts, research
inputs, policy snippets, prompt drafts, or issue material before normalization.
Preserve the original content and add only a compact header or sidecar when it
helps routing.

Recommended source metadata:

| Field | Meaning |
|---|---|
| `source_identity` | Title, requester/provider, date received, source type, and link or file reference. |
| `category` | Product, design, brand, architecture, research, issue, task, policy, prompt, or other. |
| `task_issue_type` | Bug, feature, research, migration, refactor, validation, documentation, harness, or blocked handoff. |
| `preservation_mode` | Exact copy, lightly annotated copy, excerpt, link-only, or blocked. |
| `routing_target` | `docs/specs/{slice-slug}/`, `docs/product/`, `docs/design/`, `docs/brand/`, `docs/work/reports/`, `docs/backlog/_index.md`, or no-doc-needed. |
| `planning_status` | New, triaged, normalized, superseded, deferred, or blocked. |

## Transformation Rule

Use `.codex/skills/ingest-spec/SKILL.md` to normalize source material into
product/design/brand references, work lanes, behavior examples, and
functional acceptance checks.

## Spec Packets

| Spec | Purpose |
|---|---|
| `persona-context-compiler/persona-semantic-core.md` | File-first semantic core for persona simulator behavior using Markdown, prompt scripts, and YAML package/catalog packets. |
| `persona-context-compiler/persona-context-compiler.prompt.md` | Prompt script for compiling semantic-core files into model context. |
| `persona-context-compiler/persona-semantic-core.package.yaml` | Package manifest with compile order, internal references, and external research summaries. |
| `persona-context-compiler/persona-semantic-core.catalog.yaml` | Module tree, act catalog, policies, packet summaries, and source bindings. |
| `persona-context-compiler/persona-simulator-research-workflow.md` | Deep-search and multi-agent research workflow for persona-simulator evidence gathering, verification, and semantic-core handoff. |
| `persona-context-compiler/persona-simulator-research.prompt.md` | Prompt script for executing the research workflow with source cards, retrieval checks, critic review, and claim verification. |
| `persona-context-compiler/persona-simulator-research.package.yaml` | Separate research workflow package so research context can compile without entering ordinary runtime persona context. |
