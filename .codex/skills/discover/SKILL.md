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
3. Classify the missing product/design context:
   - new capability;
   - change to existing behavior;
   - unclear persona or target user;
   - missing journey or scenario;
   - acceptance-criteria gap;
   - non-goal or scope boundary;
   - success metric or evidence gap.
4. Choose the smallest durable artifact:
   - update an existing product/spec/design doc when one owns the behavior;
   - create one compact PRD or product spec when behavior spans multiple
     requirements, users, journeys, non-goals, or validation criteria;
   - add persona, requirement, journey, or scenario rows when the fact is
     stable and compact;
   - route ready artifact writing to `compose-spec` when source identity and
     owner docs are clear.
5. Trajectories: for each product/design problem, requirement, or gap, run
   several trajectory passes per `docs/patterns/workflow.md#trajectory-coverage`;
   each trajectory must cover a real problem, requirement, or gap, and discovery
   synthesis must preserve major and minor details from every pass.
6. Personas: create or update `docs/product/personas/` when user roles drive
   behavior.
7. Brand/content: use `brand-positioning` when positioning, naming, tone,
   message hierarchy, copy rules, or visual direction need durable structure;
   otherwise update `docs/brand/` when tone, naming, or visual direction affects
   product behavior.
8. Product spec: use `synthesis-to-spec` when evidence needs synthesis before
   product docs are written; use `compose-spec` when PRD, persona,
   requirement, journey, scenario, non-goal, success-metric, transformed-spec,
   or backlog structure is ready to author; use `market-validation` when the
   missing product context requires long market, competitor, pain, economics,
   segment, or experiment research; otherwise write compact durable specs under
   `docs/product/` or normalized specs under `docs/specs/transformed/`.
9. Scenarios: add product scenario rows to `docs/product/scenarios.md`.
10. Journeys: write cross-feature journeys when state carries across steps.
11. Design gaps: use `design-system` when tokens, components, accessibility,
   layout, responsive behavior, interaction states, or visual evidence need
   durable structure; otherwise record compact design gaps in `docs/design/`.
12. Backlog: create backlog candidates only for real follow-up work with
   acceptance criteria.
13. Preserve traceability:
    `source -> product/spec artifact -> requirement/scenario IDs -> work lane -> functional evidence`.
14. Impact: use `docs-impact-map` when created or updated artifacts may affect
    sibling product/design/brand/spec/backlog/glossary/pattern docs.
15. Routing: record Doc Routing Decision Matrix rows for artifacts created,
    updated, deferred, blocked, or intentionally unchanged.
16. Handoff: route plan-ready work to `synthesis-to-spec`,
    `compose-spec`, `market-validation`, `brand-positioning`,
    `design-system`, `ingest-spec`, `docs-impact-map`, `orchestrate-work`, or
    `plan-change`.

## Rules

- Do not implement source code from this skill.
- Do not invent research claims; mark weak evidence and unresolved questions.
- Reuse existing product/design context instead of rewriting it.
- Convert ambiguous asks into behavior examples only when the source supports
  them; mark weak assumptions instead of turning them into requirements.
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
