---
name: visual-qa
description: Use when the target project needs screenshot-backed visual validation of a page, flow, component, dashboard, modal, wizard, or Figma/code comparison for layout fit, responsive behavior, text overflow, hierarchy, spacing, token consistency, state rendering, or visual regressions; produces viewport evidence and routes functional behavior failures to functional-qa or implementation rather than owning acceptance.
---

# Visual Validation

Use this skill for screenshot-backed visual validation. It checks whether the
observable UI fits the target project's design rules across relevant viewports and states.
It does not own product acceptance or implementation.

## Source Order

1. Latest user request, screenshot, mockup, Figma link, or UI concern.
2. Current app in browser when available.
3. `docs/design/interaction-model.md`, `docs/design/tokens.md`,
   current component specs, and product spec.
4. Relevant frontend components and CSS when diagnosis is requested.
5. `references/visual-validation.md`.

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
   - token and component consistency;
   - focus and hover states when visible;
   - no decorative patterns that reduce readability;
   - mobile usability and horizontal overflow.
5. Classify findings and route:
   - reusable rule -> `design-system`;
   - feature flow issue -> `ux-flow-review`;
   - accessibility issue -> `accessibility-review`;
   - behavior failure -> `functional-qa`;
   - code fix -> `plan-change` and `implement-change`.

## Templates

- `templates/visual-validation-report.md`

## Output

Return:

- target and expected source;
- viewport matrix;
- evidence paths or screenshot notes;
- findings by severity;
- likely owner route;
- residual risk or blocked evidence.

## Guardrails

- Do not treat subjective preference as a defect without source evidence.
- Do not use screenshots containing regulated sensitive data, transcripts, customer data, or
  credentials in durable artifacts.
- Do not update snapshots blindly.
- Do not repair code from this skill unless explicitly routed to
  implementation.
