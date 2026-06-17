---
name: ux-flow-review
description: Use when a target-project feature, screen, wizard, dashboard, session workflow, or UI state needs UX review before planning, design specs, mockups, implementation, or validation; produces workflow findings, product-spec deltas, and state/checklist coverage, routes reusable components to design-system, and does not edit runtime code.
---

# UX Flow Review

Use this skill to review product-visible workflow quality for the target project. It owns
feature-specific UX analysis, IA, task flow, hierarchy, state coverage, density,
and technician/operator ergonomics. It does not own reusable design-system
rules, brand positioning, final validation, or implementation.

## Source Order

1. Latest user request, screenshot, source note, or UI behavior concern.
2. Owning product spec, scenario file, and journey file under `docs/product/`.
3. Related design docs under `docs/design/`, starting with
   `docs/design/interaction-model.md` for shadcn/Radix, density,
   mobile, and AI checklist workspace rules, plus brand docs under
   `docs/brand/`.
4. Current frontend route/page/components for the flow.
5. `references/ux-flow-patterns.md` for the target project workflow heuristics and external
   source-backed design principles.
6. `docs/structure.md` for write-target routing.

## Procedure

1. Identify actor, job, entry point, completion signal, and interruption paths.
2. Map the current or proposed flow:
   - screens or panels;
   - controls;
   - primary action;
   - secondary actions;
   - carried state;
   - empty/loading/error/blocked states;
   - mobile and desktop behavior.
3. Compare against the target project context:
   - field users often work hands-on, gloved, mobile, and under time pressure;
   - operational reviewers need dense but scannable operational views;
   - compliance/audit state must remain explicit.
4. Classify findings:
   - P0 blocks task completion or safety/compliance state;
   - P1 causes likely wrong action, lost work, or hidden required state;
   - P2 adds friction, ambiguity, or inefficient scanning;
   - P3 polish or follow-up.
5. Route outputs:
   - feature-specific UX -> owning product spec/scenarios;
   - reusable component or token rule -> `design-system`;
   - accessibility uncertainty -> `accessibility-review`;
   - browser/screenshot evidence -> `visual-qa` or `functional-qa`;
   - implementation -> `plan-change` and `implement-change`.

## Templates

- `templates/ux-flow-review.md`
- `templates/product-ux-delta.md`

## Output

Return:

- actor/job and flow boundary;
- state coverage map;
- findings ordered by severity;
- proposed UX changes and non-goals;
- product/spec/docs targets;
- validation evidence needed;
- next route.

## Guardrails

- Do not invent product requirements when the user/job/problem is missing;
  route to `product-discovery`.
- Do not move feature-specific UX into `docs/design/` unless it is reusable
  across features.
- Do not implement runtime code from this skill.
- Do not make subjective taste a blocker without user, product, accessibility,
  brand, or evidence support.
