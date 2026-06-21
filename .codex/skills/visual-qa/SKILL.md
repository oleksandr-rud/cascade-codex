---
name: visual-qa
description: Use when the target project needs screenshot-backed visual validation of a page, flow, component, dashboard, modal, wizard, or Figma/code comparison for layout fit, responsive behavior, text overflow, hierarchy, spacing, token consistency, state rendering, UX/brand/design/layout rule fit, or visual regressions; produces viewport evidence and routes durable product/design/brand/context findings to their owning docs while routing functional behavior failures to functional-qa or implementation rather than owning acceptance.
---

# Visual Validation

Use this skill for screenshot-backed visual validation. It checks whether the
observable UI fits the target project's product, UX, brand, design, layout, and
state rules across relevant viewports and states. It does not own product
acceptance or implementation.

## Source Order

1. Latest user request, screenshot, mockup, Figma link, or UI concern.
2. Current app in browser when available.
3. Expected product, UX, brand, and design sources:
   - owning product spec, scenarios, journeys, or spec packet under
     `docs/product/` and `docs/specs/`;
   - `docs/design/interaction-model.md`, `docs/design/tokens.md`, and current
     component or design-system rules;
   - `docs/brand/` when tone, message hierarchy, visual direction, trust copy,
     naming, or branded surface fit is visible;
   - current `docs-impact-map` report when one triggered the check.
4. Current UI code, frontend components, CSS, tokens, routes, screenshots, or
   Figma evidence when diagnosis is requested.
5. `references/visual-validation.md`.
6. `docs/patterns/context-memory.md` when a repeated visual validation lesson
   may become durable workflow memory.

## Procedure

1. Define target:
   - surface;
   - states;
   - viewport sizes;
   - source of expected appearance.
2. Prefer browser or Playwright evidence when a runnable app exists. For static
   mockups, open the generated HTML file.
3. Capture or inspect:
   - desktop;
   - mobile/narrow;
   - longest labels/content;
   - loading/empty/error/disabled states when available.
4. Check:
   - no overlap or clipped text;
   - stable dimensions for fixed-format controls;
   - readable hierarchy and density;
   - layout fit against the owning UX flow and product scenario;
   - brand fit for visible naming, tone, trust language, and visual direction;
   - token and component consistency;
   - focus and hover states when visible;
   - no decorative patterns that reduce readability;
   - mobile usability and horizontal overflow.
5. Classify findings and route:
   - feature-specific UX, IA, copy, or state issue -> `ux-flow-review` and the
     owning product/spec docs;
   - reusable rule -> `design-system`;
   - brand, naming, tone, message hierarchy, or visual-direction issue ->
     `brand-positioning` and `docs/brand/`;
   - feature flow issue -> `ux-flow-review`;
   - accessibility issue -> `accessibility-review`;
   - behavior failure -> `functional-qa`;
   - code fix -> `plan-change` and `implement-change`.
6. Route durable findings before closeout:
   - product behavior, scenario, journey, or feature-specific UX ->
     `docs/product/` through `ux-flow-review`, `compose-spec`, or
     `docs-impact-map`;
   - reusable design, layout, component, token, visual evidence, or
     accessibility expectation -> `docs/design/` through `design-system`;
   - brand or content rule -> `docs/brand/` through `brand-positioning`;
   - repeated visual-validation workflow lesson -> `.codex/skills/`,
     `.codex/agents/`, or `docs/patterns/context-memory.md` through
     `closeout` or `codex-maintenance`;
   - follow-up work -> `docs/backlog/_index.md` through `docs-impact-map`.
7. Do not write durable docs directly from visual inspection unless the source
   fact is explicit, validated enough, and has a clear owner. Otherwise record
   `GAP`, `BLOCKED`, or a next route.

## Templates

- `templates/visual-validation-report.md`

## Output

Return:

- target and expected source;
- viewport matrix;
- evidence paths or screenshot notes;
- findings by severity;
- product/UX, brand, design/layout, accessibility, functional, implementation,
  and memory routing decisions;
- residual risk or blocked evidence.

## Guardrails

- Do not treat subjective preference as a defect without source evidence.
- Do not use screenshots containing regulated sensitive data, transcripts, customer data, or
  credentials in durable artifacts.
- Do not update snapshots blindly.
- Do not turn a feature-specific UX issue into a reusable design rule, or a
  reusable design rule into a product requirement.
- Do not repair code from this skill unless explicitly routed to
  implementation.
