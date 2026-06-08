---
name: brand-positioning
description: Create or update brand positioning, audience, category, promise, proof, tone, naming, message hierarchy, copy rules, and visual direction when brand or content intent is missing or changing.
---

# Brand Positioning

Use when product-visible language, naming, tone, content hierarchy, visual
direction, or brand intent needs durable rules before product planning, design,
or implementation.

This skill owns brand and content decisions. It does not implement UI, create
design tokens directly, or replace `synthesis-to-spec`.

## Source Order

1. Latest user brief, source spec, marketing note, content note, screenshot, or
   design note.
2. Existing brand docs under `docs/brand/`.
3. Related product docs: personas, requirements, journeys, scenarios, and PRDs
   under `docs/product/`.
4. Related design docs: `docs/design/interaction-model.md` and
   `docs/design/tokens.md`.
5. Related specs, backlog, glossary, UI copy, public pages, error messages, and
   support workflows.
6. Current `docs-impact-map` report when a sibling doc change triggered the
   brand review.
7. `docs/patterns/workflow.md` for the shared Doc Routing Decision Matrix.

Separate explicit source facts from assumptions. Do not invent market claims,
competitors, proof points, or research conclusions.

## Scope

Use this skill for:

- positioning statements;
- audience and category framing;
- promise, proof, differentiation, and trust language;
- naming and terminology;
- message hierarchy and value props;
- tone, voice, microcopy, error copy, and empty-state copy rules;
- visual direction notes that affect design tokens or UI treatment;
- content non-goals and avoid lists.

Do not use this skill for product acceptance criteria, component implementation,
style-system coding, architecture, or issue-only writeups unless brand/content
intent is the blocker.

## Checklist

1. Classify the brand change:
   - positioning;
   - naming or terminology;
   - audience or category;
   - promise and proof;
   - message hierarchy;
   - tone and copy rules;
   - visual direction;
   - content risk or avoid list.
2. For each brand/content problem, requirement, or gap, run several trajectory
   passes per `docs/patterns/workflow.md#trajectory-coverage`; every trajectory
   must cover a real problem, requirement, or gap, and final positioning or
   message-map synthesis must preserve major and minor inspected details.
3. Identify the affected audience or persona. If user roles affect product
   behavior, route to `synthesis-to-spec`.
4. Write positioning in this shape:
   `For <audience>, <product/category> helps <job> by <promise>, proven by <proof>.`
5. Define message hierarchy:
   - primary promise;
   - secondary value props;
   - proof points;
   - trust or safety language;
   - terms to use and avoid.
6. Define tone and copy rules:
   - register;
   - personality;
   - directness;
   - error and empty-state behavior;
   - prohibited phrasing.
7. Record visual direction only as brand intent. Route token, component,
   accessibility, or interaction effects to `docs-impact-map` and the design
   owner.
8. Update `docs/glossary.md` when brand terminology affects future planning,
   UI copy, public contracts, or specs.
9. Record Doc Routing Decision Matrix rows for brand/content facts created,
   updated, deferred, blocked, or intentionally unchanged.
10. Use `docs-impact-map` after brand updates to re-check product, design, spec,
   backlog, glossary, and pattern effects.
11. Route plan-ready behavior changes to `plan-change`; route copy evidence to
   `functional-qa` when visible text must be verified.

## Write Targets

- Brand positioning and content rules: `docs/brand/<slug>.md`
- Brand index or compact default rules: `docs/brand/_index.md`
- Product audience dependencies: `docs/product/`
- Design token or visual-direction dependencies: `docs/design/`
- Source or transformed spec dependencies: `docs/specs/`
- Terminology: `docs/glossary.md`
- Follow-up work: `docs/backlog/_index.md`
- Cross-folder impact report: `docs/work/reports/`

## Templates

- `templates/brand-positioning.md`
- `templates/message-map.md`

## Output

- brand artifact type and source identity;
- positioning, audience, promise, proof, tone, and naming decisions;
- assumptions and open questions;
- doc routing decisions;
- affected product/design/spec/glossary docs;
- impact-map status;
- next route: `docs-impact-map`, `synthesis-to-spec`, `plan-change`,
  `functional-qa`, `discover`, or `ingest-spec`.
