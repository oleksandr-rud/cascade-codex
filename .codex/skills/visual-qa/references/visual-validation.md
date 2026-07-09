# Visual Validation Reference

Read this reference when a visual validation task needs reusable heuristics or
evidence planning. Load project-specific design, brand, and product rules from
their owner docs.

## Reusable Visual Rules

- Match visual direction, density, and task focus to the owning product,
  design, and brand sources.
- Prefer organized, scannable layouts for operational dashboards and repeated
  workflows when the product context calls for them.
- Keep the first screen useful for the documented user goal.
- Avoid card-in-card page structures and decorative backgrounds.
- Cards are for repeated items, modals, or framed tools, not whole page
  sections.
- Use stable dimensions for boards, toolbars, icon buttons, counters, rows, and
  chips.
- Do not scale font size with viewport width.
- Avoid negative letter spacing.
- Ensure text fits inside buttons, badges, cards, and table cells.
- Avoid horizontal overflow on mobile.
- Use status labels with text, not color alone.

## Evidence Matrix

Recommended viewport set:

| Viewport | Use |
| --- | --- |
| 390x844 | Mobile/narrow path |
| 768x1024 | Tablet |
| 1280x800 | Common laptop |
| 1440x1000 | Wide desktop |

State set:

- default;
- loading;
- empty;
- error;
- disabled;
- selected;
- long content;
- permission-denied when relevant.

## Finding Types

- Layout: overlap, overflow, unstable dimensions, bad responsive collapse.
- Hierarchy: unclear primary action, poor scan path, cramped metadata.
- UX flow: visible state, carried context, task priority, or recovery path does
  not match the owning product scenario or journey.
- Brand/content: naming, tone, trust copy, visual direction, or message
  hierarchy conflicts with the owning brand docs.
- Token drift: hardcoded colors or states that conflict with docs.
- State gap: missing empty/error/loading/disabled visual treatment.
- Accessibility-adjacent: focus not visible, color-only state, target too small.
- Figma/code drift: implementation no longer matches approved design source.

## Durable Routing

| Finding | Route |
| --- | --- |
| Feature-specific UX, IA, copy, visible state, or scenario mismatch | `ux-flow-review`, `compose-spec`, or `docs-impact-map` for `docs/product/` or `docs/specs/` |
| Reusable layout, component, token, visual evidence, or design-system rule | `design-system` for `docs/design/` |
| Brand naming, tone, trust copy, message hierarchy, or visual direction | `brand-positioning` for `docs/brand/` |
| Behavior failure visible in the UI | `functional-qa` or implementation route |
| Repeated visual-validation workflow lesson | `closeout` or `codex-maintenance` for the narrowest memory owner |
