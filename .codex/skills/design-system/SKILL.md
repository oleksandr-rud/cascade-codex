---
name: design-system
description: Use when reusable design or UX rules are missing or changing for tokens, components, accessibility, layout density, responsive behavior, interaction states, visual evidence, or UI patterns.
---

# Design System

Use when design, UX, component, token, accessibility, layout, responsive,
interaction-state, or visual validation rules need durable structure before
planning, implementation, or functional acceptance.

This skill owns design-system and UX rules. It does not implement UI code,
decide product intent, or create brand positioning.

## Source Order

1. Latest user brief, source spec, screenshot, design note, visual review
   finding, Figma context, static mockup, or UI change request.
2. Existing design docs:
   - `docs/design/_index.md`
   - `docs/design/interaction-model.md`
   - `docs/design/tokens.md`
3. Related brand positioning, product requirements, personas, journeys,
   scenarios, and spec packets.
4. Current UI code, components, tokens, theme files, accessibility tests,
   screenshots, browser evidence, or visual regression artifacts when available.
5. `docs/glossary.md`, active work state, and current `docs-impact-map`
   reports.
6. `docs/patterns/workflow.md` for the shared Doc Routing Decision Matrix.

Follow existing code and design-system implementation when docs conflict, then
report the drift.

## Scope

Use this skill for:

- design token decisions for color, type, spacing, elevation, radius, motion,
  density, and state;
- component behavior, variants, disabled/loading/error/empty states, and
  control semantics;
- component or pattern lifecycle decisions from screenshots, Figma, or static
  mockups when the rule should be reusable beyond one feature;
- layout, responsive behavior, density, and scanability rules;
- accessibility expectations such as keyboard flow, focus, contrast, labels,
  target size, and reduced motion;
- interaction model changes across screens, modes, or carried state;
- visual or browser evidence requirements for UI work;
- design gaps discovered during planning, validation, or closeout.

Do not use this skill for brand promise/proof, product acceptance criteria,
runtime architecture, or source-code implementation unless design intent is the
blocker.

## Checklist

1. Classify the design change:
   - token;
   - component;
   - interaction state;
   - layout or responsive behavior;
   - accessibility;
   - visual evidence;
   - static mockup or Figma evidence;
   - design gap.
2. For each design/UX problem, requirement, or gap, run several trajectory
   passes per `docs/patterns/workflow.md#trajectory-coverage`; every trajectory
   must cover a real problem, requirement, or gap, and final design-rule
   synthesis must preserve major and minor inspected details.
3. Identify the source of truth:
   - existing code token or component;
   - design doc;
   - brand visual direction;
   - product scenario or journey;
   - source spec or screenshot.
4. Write UX rules in observable terms:
   - what users see;
   - what controls mean;
   - allowed states and transitions;
   - responsive constraints;
   - accessibility expectations;
   - validation evidence.
5. For tokens, define name, purpose, allowed values, mode/theme behavior,
   consuming components, accessibility constraints, and migration notes.
6. For components, define anatomy, variants, states, content rules, responsive
   behavior, accessibility, and functional or visual checks.
7. For mockups, Figma screens, or screenshots, decide whether the artifact is:
   - evidence only;
   - a reusable component or interaction rule;
   - a durable token rule;
   - a feature-specific UX delta;
   - a product/spec/brand gap.
8. Use dummy or synthetic data in design evidence. Do not preserve
   credentials, tokens, private customer data, regulated sensitive data, raw
   logs, or sensitive screenshots in durable docs.
9. Route brand visual intent gaps to `brand-positioning`.
10. Route product behavior gaps to `synthesis-to-spec`, `market-validation`, or
   `plan-change`.
11. Record Doc Routing Decision Matrix rows for design facts created, updated,
   deferred, blocked, or intentionally unchanged.
12. Use `docs-impact-map` after design updates to re-check product, brand, spec,
   backlog, glossary, and pattern effects.
13. Route visible UI checks to `functional-qa` and implementation slices to
   `plan-change`.

## Artifact Lifecycle

Use this lifecycle when design evidence creates durable rules:

```text
source request / screenshot / Figma / current UI
  -> ux-flow-review when feature flow or IA is in scope
  -> design-system for reusable component, token, state, or evidence rules
  -> component-rule template when a reusable pattern appears
  -> docs/design/tokens.md only for durable semantic token changes
  -> docs-impact-map for sibling product/brand/spec effects
  -> plan-change / implement-change only when runtime code is requested
```

Mockups and Figma screens are evidence, not implementation truth. Component
rules are reusable design rules, not feature product specs. Feature-specific UX
remains in the owning product/spec artifact unless the rule is reusable across
features.

## Write Targets

- Interaction and UX rules: `docs/design/interaction-model.md`
- Tokens and design-system decisions: `docs/design/tokens.md`
- Compact design index notes: `docs/design/_index.md`
- Product behavior dependencies: `docs/product/`
- Brand visual-direction dependencies: `docs/brand/`
- Source or spec packet dependencies: `docs/specs/`
- Follow-up work: `docs/backlog/_index.md`
- Design vocabulary: `docs/glossary.md`
- Cross-folder impact report: `docs/work/reports/`

## Templates

- `templates/design-rule.md`
- `templates/component-rule.md`

## Output

- design artifact type and source identity;
- token/component/interaction/accessibility decisions;
- evidence-only, reusable-rule, token-rule, feature-UX, or product/spec/brand
  routing decision for mockup, Figma, or screenshot inputs;
- assumptions, gaps, and open questions;
- doc routing decisions;
- affected product/brand/spec/glossary docs;
- required browser, visual, accessibility, or functional evidence;
- impact-map status;
- next route: `docs-impact-map`, `brand-positioning`, `synthesis-to-spec`,
  `market-validation`, `plan-change`, `functional-qa`, `discover`, or
  `ingest-spec`.
