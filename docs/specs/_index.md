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

Cascade does not bundle project-specific spec packets. Target repositories add
one `{slice-slug}/` folder per accepted capability or workflow when source
material is normalized into plan-ready behavior and acceptance evidence.
