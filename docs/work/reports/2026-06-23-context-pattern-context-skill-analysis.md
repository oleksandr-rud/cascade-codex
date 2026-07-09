# Context And Pattern Context Skill Analysis

Date: 2026-06-23

## Scope

This report records the current context-pack schema decision and compares the
`context` and `pattern-context` skills after replacing top-level `refs` and
`parts` with graph-shaped `documents`.

## Current Pack Shape

Pattern entries stay as bounded folders under `docs/patterns/{entry}/` with:

- `index.md`: durable human-readable rules and examples.
- `*.pack.yaml`: routing metadata and graph-shaped document references.

Pack YAML now uses:

- `kind: pattern-context-pack` for the whole pack type.
- `summary` as short routing metadata, not durable rule authority.
- `routing` for use, avoid, load, write, defer, skill, and role cues.
- `documents` as the single owner for former references and selectable content.

Each document node uses:

- `path`: document, skill, agent, config, or script path.
- `kind`: node type, such as `pattern-entry`, `skill`, `agent`, `config`, or
  `script`.
- `description`: clear ownership statement that also acts as trigger text.
- `trigger_when`: concrete task conditions where retrieval should consider the
  document.
- `sections`: optional selectable subnodes for Markdown anchors.

Each section uses:

- `id` and `title` for selection.
- `anchor` for the Markdown section in the owning document.
- `summary` for the durable rule, decision, or evidence value.
- `routing_description` for when to load the section.
- `tags` for narrow prompt assembly.

Top-level `status`, `refs`, and `parts` are removed from pack YAML. The builder
keeps `--part` and `--list-parts` only as compatibility aliases for `--section`
and `--list-sections`.

## Summary Rules

Pack summaries should answer: "Could this pack be relevant?" They should be
short, domain-specific, and selection-oriented.

Document descriptions should answer: "What does this document own?" They should
be phrased so the text is useful as a retrieval trigger.

Document `trigger_when` should answer: "Which concrete task conditions should
make an agent consider this node?" Triggers should name workflows, risk
surfaces, artifacts, or decisions rather than broad topics.

Section summaries should answer: "What durable rule or reusable decision is in
this section?" They should not replace loading the underlying Markdown when a
durable planning, validation, or closeout decision depends on it.

Section routing descriptions should answer: "When should this exact section be
loaded into a prompt?" They should be narrower than the pack summary.

## Context Skill

`context` is a task-state snapshot skill. It reads the latest user request,
branch state, working tree, active work, lane packets, research memory, recent
reports, and backlog notes. Its output is intentionally short: active lanes,
current state, blockers or drift, likely next entry point, and residual risk.

Use `context` at task start, resume, handoff, or when repository drift is high.
It should not implement changes and should not author pattern packs. Its job is
to orient the active turn.

## Pattern Context Skill

`pattern-context` is the reusable pattern-memory skill. It owns
`docs/patterns/` entry shape, pack retrieval, pack authoring rules, the builder
script, and schema/validator updates when the pack contract changes.

Use `pattern-context` when planning, onboarding, validation, closeout, or agent
prompt assembly needs reusable rules from `docs/patterns/`. It can retrieve or
compile selected sections with:

```bash
python3 scripts/build_pattern_context_pack.py --pack <pack-id-or-path> --section <section-id>
```

Use `--tag`, `--query`, and `--summary-only` to narrow prompt assembly before
loading Markdown bodies.

## Comparison

| Dimension | `context` | `pattern-context` |
|---|---|---|
| Primary job | Snapshot active work state | Retrieve or write reusable pattern memory |
| Main source | Git/work docs/recent reports | `docs/patterns/_index.md`, entry folders, pack YAML |
| Mutation | No implementation; snapshot only | May update pattern entries, packs, builder, and validator |
| Output | Current-state summary and next route | Pack IDs, filters, compiled preview, files changed, validation |
| Time horizon | Current turn or handoff | Durable cross-task retrieval |
| Failure mode | Too much detail or stale active state | Overbroad packs, weak triggers, or metadata treated as proof |

## Routing Rule

Start with `context` when the question is "Where are we now?" or when branch
drift may affect the turn. Move to `pattern-context` when the question is
"Which durable reusable rules should guide this plan, onboarding, validation,
or closeout?"

When both apply, the order is:

1. `context` for current state and likely next route.
2. `pattern-context` for reusable rule retrieval or pack updates.
3. `docs-impact-map` if a durable fact may affect sibling docs.
4. `validate-change` after schema, skill, script, or pack edits.

## Validation Surface

The current validation surface should enforce:

- pack YAML has `kind: pattern-context-pack`;
- pack YAML has `documents`;
- pack YAML does not use top-level `status`, `refs`, or `parts`;
- pack documents have descriptions and triggers;
- selectable content is nested under document `sections`;
- referenced document paths exist;
- pack previews build with `scripts/build_pattern_context_pack.py`.
