---
name: docs-impact-map
description: Map cross-folder product, design, brand, spec, persona, journey, scenario, token, backlog, glossary, or pattern dependencies before planning or closeout when durable docs may affect sibling rules.
---

# Docs Impact Map

Use when product, design, brand, spec, backlog, glossary, or pattern material is
created, changed, normalized, or used as planning input and the change may
affect sibling docs.

This skill is the proactive dependency check between `ingest-spec` or
`discover` and `plan-change`. It also supports `closeout` when a validated diff
creates a durable doc fact. It does not patch product/runtime code.

## Source Order

1. Latest user request, source spec, design note, screenshot, ticket, or doc
   diff.
2. Current changed docs and any current code diff that introduced the durable
   fact.
3. Existing durable docs:
   - `docs/product/`
   - `docs/design/`
   - `docs/brand/`
   - `docs/specs/`
   - `docs/backlog/_index.md`
   - `docs/glossary.md`
   - `docs/patterns/`
4. Active work state: `docs/work/active.md`, relevant `docs/work/lanes/`, and
   recent `docs/work/reports/`.
5. `docs/structure.md` for write targets and owner docs.
6. `docs/patterns/workflow.md` for the shared Doc Routing Decision Matrix.
7. Current code, UI copy, tests, public contracts, and validation commands only
   when docs conflict or a referenced behavior needs grounding.

If current code and docs conflict, follow code for implementation planning and
report the documentation drift.

## Trigger Rules

Run this skill when any of these change or become planning input:

- product requirement, persona, journey, scenario, user story, success metric,
  non-goal, or acceptance criterion;
- brand positioning, naming, tone, content rule, visual direction, or copy
  constraint;
- design token, component behavior, accessibility expectation, layout density,
  responsive rule, interaction state, or UX pattern;
- normalized spec packet, raw source preservation decision, implementation
  constraint, or functional acceptance check;
- backlog candidate that depends on product/design/brand/spec facts;
- glossary term or pattern rule that changes future planning, validation, or
  closeout behavior.

Do not run for purely mechanical documentation edits that cannot change future
behavior, validation, routing, or source interpretation.

## Impact Rules

Use these dependency checks before deciding that one doc update is complete:

| Changed Source | Re-check |
|---|---|
| Persona or target user | `docs/product/requirements.md`, `docs/product/journeys.md`, `docs/product/scenarios.md`, `docs/brand/`, `docs/design/`, active work criteria |
| Product requirement or acceptance criterion | scenario rows, journeys, transformed specs, functional evidence, backlog candidates |
| Journey or multi-step state | requirements, scenarios, interaction model, functional checks, carried state, duplicate side effects |
| Scenario row | requirement source, journey coverage, design state, functional evidence, active lane overlay |
| Brand positioning, naming, tone, or content | product audience, UI copy, visual direction, token implications, scenarios that assert copy |
| Visual direction or design tokens | brand visual direction, component/state rules, accessibility, visual or browser evidence |
| Component, interaction, or UX rule | product scenarios, design tokens, accessibility, functional evidence, implementation source areas |
| Normalized spec packet | product/design/brand owner docs, active work criteria, backlog, glossary, transformed packet status |
| Backlog candidate | owning product/spec/design source, acceptance criteria, priority, deferral reason |
| Glossary term | product/spec language, code/public contract vocabulary, user-facing copy |
| Pattern or boundary rule | affected skills, agents, validator checks, work-lane templates, validation commands |

## Checklist

1. Name the changed fact, source identity, owner doc, and status:
   `proposed`, `validated`, `blocked`, or `superseded`.
2. Build or update the shared Doc Routing Decision Matrix for the changed fact
   before writing owner docs.
3. Build an impact matrix with one row per affected target.
4. Mark each affected target:
   - `UPDATED` when the owner doc was changed;
   - `NO_CHANGE` when checked and already aligned;
   - `DEFERRED` when the update is real follow-up work with owner or backlog;
   - `BLOCKED` when a blocker prevents safe routing;
   - `GAP` when the source material lacks enough product/design/brand/spec
     context.
5. Route `GAP` to `discover` or `ingest-spec` before `plan-change`.
6. Route missing acceptance or scenario coverage to `functional-qa` or
   `plan-change` depending on whether expected behavior is already clear.
7. Route reusable harness rule changes to `codex-maintenance` and validator
   updates.
8. Update the smallest owner docs only when the source fact is explicit enough
   and the target doc has a clear owner.
9. Create backlog candidates only for real follow-up work with acceptance
   criteria.
10. Keep the report compact; do not rewrite broad product, brand, design, or
   spec docs.

## Write Policy

- Prefer updating the existing owner doc that already owns the affected fact.
- Use `templates/impact-map.md` for larger or multi-folder impact checks.
- Store durable impact reports under `docs/work/reports/` only when requested,
  multi-turn, blocked, or decision-heavy.
- Do not store raw incoming source material unless `ingest-spec` decides
  preservation is useful.
- Do not add new pattern files; use the existing `docs/patterns/` owner files.

## Output

- changed source fact and owner doc;
- Doc Routing Decision Matrix status;
- impact matrix with target docs, required checks, status, and next gate;
- docs updated, deferred, blocked, or intentionally unchanged;
- next route: `discover`, `ingest-spec`, `orchestrate-work`, `plan-change`,
  `functional-qa`, `closeout`, or `codex-maintenance`.

## Templates

- `templates/impact-map.md`
