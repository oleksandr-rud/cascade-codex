# Accessibility Sources Reference

Read this reference when accessibility findings require source-backed criteria
or test planning.

## Primary Sources

- W3C WCAG 2.2:
  https://www.w3.org/TR/WCAG22/
- WCAG 2.2 quick reference:
  https://www.w3.org/WAI/WCAG22/quickref/
- WAI ARIA Authoring Practices Guide:
  https://www.w3.org/WAI/ARIA/apg/
- WAI ARIA patterns:
  https://www.w3.org/WAI/ARIA/apg/patterns/
- USWDS accessibility:
  https://designsystem.digital.gov/documentation/accessibility/
- NHS accessibility guidance:
  https://service-manual.nhs.uk/accessibility

## the target project Accessibility Requirements

- Use semantic controls and labels for all actionable UI.
- Preserve visible focus treatment. the target project token guidance sets focus ring width
  at `2px`; current shadcn buttons/inputs use focus-visible ring styling.
- Maintain practical `44px` touch targets for mobile/gloved field user workflows.
- Keep status states perceivable by text and shape, not only color.
- Ensure tables, filters, dialogs, sheets, tabs, dropdowns, and command menus
  retain keyboard paths.
- Voice-first flows need visual fallback controls and error recovery.
- Avoid horizontal overflow and clipped text on narrow viewports.
- Do not hide compliance/audit-critical state behind hover-only affordances.

## Manual Evidence To Prefer

- Tab order and reverse tab order.
- Focus visible and not obscured.
- Dialog focus trap and escape behavior.
- Screen reader name/role/value for custom controls.
- Keyboard activation for buttons, chips, menu items, and tabs.
- Contrast sampling for text and state badges.
- Target size sampling for mobile controls.
- Reduced motion path when animations are meaningful.

## Severity Guide

- P0: likely prevents task completion, creates unsafe action, or exposes
  sensitive data.
- P1: blocks keyboard/screen reader path for a core action or hides required
  state.
- P2: creates friction, ambiguity, or partial access failure.
- P3: improvement or documentation gap.
