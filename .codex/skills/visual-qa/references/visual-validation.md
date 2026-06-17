# Visual Validation Reference

Read this reference when a visual validation task needs the target project-specific
heuristics or evidence planning.

## the target project Visual Rules

- Use clinical, restrained, task-focused UI.
- Prefer dense but organized operational layouts for dashboards and admin
  surfaces.
- Keep first-screen product surfaces useful, not marketing-like.
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
| 390x844 | Mobile/narrow field user path |
| 768x1024 | Tablet/clinical workstation |
| 1280x800 | Common laptop |
| 1440x1000 | Director/admin desktop |

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
- Token drift: hardcoded colors or states that conflict with docs.
- State gap: missing empty/error/loading/disabled visual treatment.
- Accessibility-adjacent: focus not visible, color-only state, target too small.
- Figma/code drift: implementation no longer matches approved design source.
