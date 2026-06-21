# Specs Index

Use this area for source specs and plan-ready spec packets.

Recommended files:

- `incoming/`: raw or imported specs.
- `{slice-slug}/`: one folder per big issue, capability, or workflow slice,
  containing plan-ready spec packets, package files, prompt scripts, and
  module catalogs for that slice.

## Transformation Rule

Use `.codex/skills/ingest-spec/SKILL.md` to normalize incoming specs into
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
