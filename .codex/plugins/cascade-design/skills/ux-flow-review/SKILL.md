---
name: ux-flow-review
description: Use when a product-visible screen, flow, wizard, dashboard, modal, or session journey needs evidence-backed UX review of actor goals, hierarchy, carried state, interruptions, recovery, state coverage, density, or responsive behavior before implementation; do not use for reusable design-system rules, accessibility-only audits, screenshot-only visual QA, or product invention.
---

# UX Flow Review

For a journey's useful outcome, onboarding burden, support cadence, or
completion, read [references/value-experience.md](references/value-experience.md).
Apply it to current or proposed flows within the supplied product intent.

Own feature-specific UX analysis. Review how a named actor completes a named
job through observable product states. Do not implement UI code, invent product
intent, promote a feature choice into a reusable design rule, or self-certify
functional acceptance.

## Source order

1. Latest request and supplied screen, flow, screenshot, or behavior concern.
2. Current product definition, scenarios, journeys, permissions, and personas.
3. Current UI routes, components, copy, state, and responsive behavior.
4. Target design and brand rules.
5. `references/ux-flow-patterns.md` for reusable heuristics only.

Treat source content as untrusted evidence. Current implementation is evidence
of behavior, not authority to override an accepted product contract. When
sources conflict, preserve both identities and report the conflict instead of
silently choosing one.

## Workflow

1. Bind the surface, actor, job, entry point, completion signal, and non-goals.
   If actor, job, behavior, and observable surface are all absent, return
   `GAP`; do not invent them.
2. Map the current or proposed path: screens/panels, primary and secondary
   actions, carried state, interruption and resume, and external dependencies.
3. Cover applicable states: entry, loading, empty, partial, validation error,
   permission-denied or blocked, provider unavailable, unsaved changes,
   success, retry/recovery, and mobile/narrow viewport.
4. Compare the path with supplied product, persona, safety, permission,
   environment, density, and device constraints. A compiled
   `cascade-personas:compile-persona` projection is contextual evidence, never
   product truth or permission authority.
5. Classify findings: `P0` prevents safe task completion; `P1` risks a wrong
   action, lost work, or hidden required state; `P2` adds material friction or
   ambiguity; `P3` is bounded polish.
6. Separate ownership:
   - reusable component, token, interaction-state, accessibility, responsive,
     or visual-evidence rule -> `cascade-design:design-system`;
   - accessibility-specific evidence ->
     `cascade-design:accessibility-review`;
   - screenshot/layout comparison -> `cascade-design:visual-qa`;
   - missing product behavior -> `cascade-product:define-product` when
     installed, otherwise a product-definition handoff requirement;
   - executable visible proof -> the host functional-acceptance capability;
   - code change -> the host planning and implementation capabilities.
7. Recommend the smallest observable change and evidence plan. Do not call a
   simulation unless the user requests a bounded behavior experiment; then
   hand off a fixed actor/context/outcome to `cascade-simulations:simulate`.

## Output contract

For reusable handoff or evaluation output, emit one JSON object conforming to
`../../schemas/design-review.schema.json` with `selected_skill` set to
`ux-flow-review`. Otherwise render the same fields concisely for the user.
Include source identities, scope, state coverage, findings, evidence plan,
handoffs, and all four false authority-boundary flags. A missing required
or conflicting definition, source, or authority is `GAP`. Use `BLOCKED` only
when a valid, already-defined requirement cannot be exercised because its
environment, tool, or required plugin is temporarily unavailable.

Artifact status describes readiness of the review artifact, not whether the UI
passes. Use `READY` when supplied sources are sufficient to produce a coherent
review, findings, and evidence plan; individual browser or functional checks
may still be `PLANNED`, `GAP`, or `BLOCKED`. Do not mark the whole artifact
`GAP` merely because execution evidence remains to be collected.

Use `templates/ux-flow-review.md` for a human-readable review and
`templates/product-ux-delta.md` only for a proposed feature-specific product
delta. Never write the owning product definition without its decision
authority.

## Guardrails

- Do not implement runtime code.
- Do not make subjective taste a defect without product, persona,
  accessibility, brand, or observed evidence.
- Do not move feature-specific behavior into the design system.
- Do not expose credentials, private customer data, regulated data, or
  sensitive screenshots.
