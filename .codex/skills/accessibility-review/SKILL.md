---
name: accessibility-review
description: Use when a target-project UI, design proposal, component, mockup, frontend implementation, or Figma handoff needs WCAG-aligned accessibility review for ARIA patterns, keyboard navigation, focus order and visibility, labels, descriptions, contrast, target size, forms, status messages, or reduced motion; produces evidence-backed findings and validation plans without claiming legal compliance or patching code by default.
---

# Accessibility Review

Use this skill for accessibility design and implementation review. It produces
evidence-backed findings, checklists, and validation plans. It does not provide
legal compliance certification and does not patch runtime code unless the
parent session explicitly routes to implementation.

## Source Order

1. Latest user request, screenshot, mockup, Figma link, or UI code.
2. Current frontend code and existing component primitives.
3. Product and design docs that define the affected behavior, including
   `docs/design/interaction-model.md` for the target project UI composition and
   mobile/state expectations when relevant.
4. `references/accessibility-sources.md`.
5. Current browser, Playwright, axe, or manual evidence when available.

## Procedure

1. Define scope:
   - component/page/flow;
   - user role;
   - affected states;
   - assistive paths likely involved.
2. Check applicable areas:
   - semantic HTML and ARIA role fit;
   - accessible names/descriptions;
   - keyboard navigation and focus order;
   - focus visibility and focus not obscured;
   - contrast for text and non-text UI;
   - target size and pointer alternatives;
   - form labels, help text, errors, and redundant entry;
   - status messages and async updates;
   - reduced motion and animation restraint;
   - mobile/narrow viewport accessibility.
3. Prefer native elements and Radix/shadcn accessible primitives before custom
   widget semantics.
4. Use WAI ARIA APG for custom widgets and WCAG 2.2 for testable criteria.
5. Separate:
   - confirmed issue;
   - likely risk;
   - needs manual test;
   - blocked by missing environment.
6. Route:
   - reusable accessibility rule -> `design-system`;
   - feature-specific behavior -> `ux-flow-review` or product spec;
   - executable proof -> `functional-qa` or `validate-change`;
   - code fix -> `plan-change` and `implement-change`.

## Templates

- `templates/accessibility-review.md`

## Output

Return:

- scope and assumptions;
- standards/patterns consulted;
- findings ordered by severity;
- evidence and file/screen references;
- validation plan;
- routed follow-ups;
- explicit non-attestation note.

## Guardrails

- Do not claim WCAG, ADA, Section 508, HIPAA, or legal compliance.
- Do not rely only on automated checks for final accessibility confidence.
- Do not add ARIA when native HTML already provides correct semantics.
- Do not expose regulated sensitive data, transcripts, raw provider payloads, screenshots with
  sensitive data, or credentials in reports.
