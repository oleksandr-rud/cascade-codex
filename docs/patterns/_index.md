# Patterns Index

Reusable rules live here when they are durable across work lanes. Pattern
memory is organized as bounded entries with metadata and selectable context
packs, not broad dump folders.

Each first-level entry folder must include:

- `index.md`: durable Markdown rules and examples.
- `*.pack.yaml`: selectable context-pack metadata that points to Markdown
  sections by document path and anchor. Each pack owns its `summary`,
  `routing`, graph-like `documents`, and selectable section metadata.

Current entries:

- `workflow/`: active work lanes, parallel Orchestrator, coverage,
  refactoring, closeout memory, and research coverage.
- `boundaries/`: folder mapping, layer rules, APIs, adapters, seams, data
  boundaries, and agentic runtime invariants.
- `architecture-defaults/`: paired machine-readable graphs and human-readable
  reference specs for architecture and stack selection, caching, tenancy,
  interfaces, contour-specific application technology, infrastructure
  selection and compute/data/messaging/delivery extensions, backend API/worker services,
  event-driven extensions, web frontend policies, native apps, CLIs, and
  experiments; provides source-linked claim/policy evidence per application
  contour, separate core and frontend retrieval packs over one canonical pair
  catalog, and preview-first source scaffold profiles.
- `testing/`: functional acceptance, browser/API/CLI checks, scenario tests,
  and semantic test repair.
- `context-memory/`: retrieval/source fidelity, semantic-core packages,
  compaction, context bounds, compact research-memory entries, and
  observability.
- `agent-evaluation/`: harness scenario coverage, trace evidence,
  mechanical eligibility, independent judged evaluation, root cause, and regression
  promotion.

Use `context-pack-schema.yaml` for the pack metadata contract and
`scripts/cascade.ts patterns` to build text previews.

## Routing Rules

1. Start from the active skill.
2. Check pack `summary`, `routing`, documents, document descriptions, and
   triggers before loading long Markdown bodies.
3. Build selected context with `scripts/cascade.ts patterns` when a
   prompt needs only specific pack sections.
4. Follow current code when docs conflict and report the drift.
5. Persist new rules only when durable, repeated, or requested.
6. Add a new entry folder only when the rule has a bounded topic, owner
   metadata, routing rules, references, and at least one pack.

Security entries such as `security/auth.md`, `security/rbac.md`, or
`security/soc2.md` are target-project examples, not Cascade defaults. Add them
only when real project evidence exists and the entry follows the metadata and
pack contract above.
