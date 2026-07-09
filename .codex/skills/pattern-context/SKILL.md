---
name: pattern-context
description: Use to create, update, retrieve, or compile docs/patterns context entries and *.pack.yaml context packs for planning, onboarding, validation, closeout, or agent prompt assembly.
---

# Pattern Context

Use this skill when a task needs reusable pattern memory from `docs/patterns/`,
or when onboarding or closeout needs to create or update a pattern entry or
context pack.

This skill owns the shape and retrieval rules for pattern context. It does not
replace `docs-impact-map`; use that skill first when a durable product, design,
brand, spec, backlog, glossary, or pattern fact may affect sibling docs.

## Source Order

1. Latest user request, active lane, or onboarding phase.
2. `docs/patterns/_index.md`.
3. Relevant entry folder under `docs/patterns/{entry}/`:
   - `index.md`
   - `*.pack.yaml`
4. `scripts/build_pattern_context_pack.py` for deterministic text previews.
5. Relevant skill or agent that requested context.
6. `docs/structure.md`, `harness.config.yaml`, and validator rules when a
   pattern entry, pack, or required path changes.

## Entry Shape

Each pattern entry is a first-level folder under `docs/patterns/`.

Required files:

- `index.md`: durable rules and examples.
- `*.pack.yaml`: selectable context-pack metadata that points to one or more
  Markdown sections. The pack YAML owns the entry `summary`, `routing`,
  `documents`, and selectable document `sections`; do not split those sections
  into sidecar YAML files.

Pack-level `kind` identifies the whole pack type and should be
`pattern-context-pack`. Do not use top-level `status`, `refs`, or `parts` in a
pack. References and selectable content both live under `documents`.

Do not create broad dump folders. A new entry is allowed only when the rules
are reusable, bounded by a topic, and have metadata plus at least one pack file.

## Summary And Document Rules

- Pack `summary` is concise routing metadata, not durable rule authority.
- Document `description` defines what the document owns and should be usable as
  retrieval trigger text.
- Document `trigger_when` lists concrete conditions where the document should be
  considered during prompt assembly.
- Section `summary` states the durable rule, decision, or evidence value.
- Section `routing_description` states when to load that section into context.

## Retrieval Rules

1. Use pack `summary`, `routing`, and `documents` before loading long Markdown
   bodies.
2. Treat each document as a graph node. Use its `kind`, `description`,
   `trigger_when`, and nested section summaries to decide what to load.
3. Compile a context preview with:

   ```bash
   python3 scripts/build_pattern_context_pack.py --pack <pack-id-or-path>
   ```

4. Use `--section`, `--tag`, or `--query` to select only the relevant sections.
   `--part` remains only as a compatibility alias for `--section`.
5. Treat pack summaries, document descriptions, trigger text, and routing
   descriptions as selection metadata, not as proof that every referenced rule
   is current.
6. Load the underlying Markdown section before making a durable decision.
7. If selection returns no sections, report `GAP` and inspect the entry manually
   before adding a new pack.

## Write Rules

- Update `index.md` only for durable rules.
- Update `*.pack.yaml` when the entry purpose, owner, pack kind, use/avoid cues,
  skill or role routing, document graph, trigger descriptions, context
  assembly, section selection, tags, or inclusion rules change.
- Update `scripts/build_pattern_context_pack.py` and the validator when the
  pack schema changes.

## Onboarding Rules

During onboarding, use `adapt-harness` as the merge owner and this skill for
pattern entries. Create or update pattern entries only after source inspection
shows a repeated architecture, security, testing, workflow, context, memory, or
agent-runtime rule that future planning or validation must retrieve.

Security folders such as `security/auth.md`, `security/rbac.md`, or
`security/soc2.md` are examples of a future target-project entry shape, not
generic Cascade defaults. Add them only when the target project has real
security evidence and the entry includes `index.md` plus pack YAML containing
summary, routing, documents, and sections.

## Output

- pattern entry and pack IDs read or written;
- selection filters used;
- compiled context preview command and result;
- files changed;
- validation evidence;
- next route: `docs-impact-map`, `adapt-harness`, `plan-change`,
  `validate-change`, `closeout`, or `codex-maintenance`.
