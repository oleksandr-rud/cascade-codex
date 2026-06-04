---
name: discover
description: Optional deep product and design discovery workflow for missing context, personas, journeys, brand notes, product specs, scenarios, design gaps, and backlog candidates.
---

# Discover

Use when a feature request lacks product/design context that `plan-change`
cannot resolve, or when the user asks for durable discovery artifacts from a new
idea. Do not make discovery mandatory for ordinary implementation planning.

## Modes

- `full`: research, personas, brand notes, product spec, scenarios, journeys,
  design gaps, and backlog candidates.
- `deep-context`: answer missing product/design context and hand back to
  `plan-change`.
- `research-only`: stop after a research summary.
- `from-spec`: start from an existing source spec and create plan-ready docs.

## Source Order

1. Latest user brief and explicit constraints.
2. Current codebase vocabulary, UI copy, public contracts, and existing tests.
3. Existing `docs/product/`, `docs/design/`, `docs/brand/`, and `docs/specs/`.
4. `docs/glossary.md`.
5. `docs/patterns/workflow.md` for the shared Doc Routing Decision Matrix.
6. External research only when the user requests it or the runtime has an
   approved source/tool.

## Flow

1. Orient: read current product/design/spec indexes and any related code.
2. Evidence: separate observed facts, user-provided facts, assumptions, and
   open questions.
3. Personas: create or update `docs/product/personas/` when user roles drive
   behavior.
4. Brand/content: use `brand-positioning` when positioning, naming, tone,
   message hierarchy, copy rules, or visual direction need durable structure;
   otherwise update `docs/brand/` when tone, naming, or visual direction affects
   product behavior.
5. Product spec: use `product-discovery` when PRD, persona, requirement,
   journey, scenario, non-goal, or success-metric structure is needed; otherwise
   write compact durable specs under `docs/product/` or normalized specs under
   `docs/specs/transformed/`.
6. Scenarios: add product scenario rows to `docs/product/scenarios.md`.
7. Journeys: write cross-feature journeys when state carries across steps.
8. Design gaps: use `design-system` when tokens, components, accessibility,
   layout, responsive behavior, interaction states, or visual evidence need
   durable structure; otherwise record compact design gaps in `docs/design/`.
9. Backlog: create backlog candidates only for real follow-up work with
   acceptance criteria.
10. Impact: use `docs-impact-map` when created or updated artifacts may affect
    sibling product/design/brand/spec/backlog/glossary/pattern docs.
11. Routing: record Doc Routing Decision Matrix rows for artifacts created,
    updated, deferred, blocked, or intentionally unchanged.
12. Handoff: route plan-ready work to `product-discovery`,
    `brand-positioning`, `design-system`, `ingest-spec`, `docs-impact-map`,
    `orchestrate-work`, or `plan-change`.

## Rules

- Do not implement source code from this skill.
- Do not invent research claims; mark weak evidence and unresolved questions.
- Reuse existing product/design context instead of rewriting it.
- Keep indexes updated when creating durable docs.
- Prefer `plan-change` for lightweight intent and examples when durable
  discovery artifacts are unnecessary.

## Templates

- `templates/product-spec.md`
- `templates/journey.md`
- `templates/brand-spec.md`

## Output

- mode used;
- artifacts created or updated;
- doc routing decisions;
- behavior examples or scenario IDs;
- unresolved questions;
- suggested next workflow step.
