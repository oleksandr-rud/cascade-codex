# Designer Workflow Checklist

Use this checklist when the Designer role combines UX, accessibility,
visual-validation, and design-system skills.

## Reusable Design-System Rule

- [ ] Load `design-system`.
- [ ] Inspect `docs/design/interaction-model.md`, `docs/design/tokens.md`,
      related product/spec/brand docs, and current UI code or screenshots.
- [ ] Keep feature-specific UX in product/spec docs and reusable rules in
      `docs/design/`.
- [ ] For reusable components or interaction patterns, define anatomy,
      variants, states, responsive behavior, accessibility expectations,
      token dependencies, product/spec source, and visual or functional
      evidence using the design-system component template.
- [ ] Update `docs/design/tokens.md` only when a durable token rule changes.
- [ ] Run `accessibility-review` when semantics, focus, contrast, target size,
      forms, status messages, or reduced motion are affected.
- [ ] Run `visual-qa` when screenshot, viewport, overflow, or hierarchy
      evidence is needed.
- [ ] Run `docs-impact-map` when durable docs change.

## Feature Workflow Review

- [ ] Load `ux-flow-review`.
- [ ] Identify actor, job, entry point, completion signal, carried state,
      interruption paths, and empty/loading/error/blocked states.
- [ ] Route reusable component or token decisions to `design-system`.
- [ ] Route accessibility concerns to `accessibility-review`.
- [ ] Route behavior evidence to `functional-qa`.
- [ ] Route implementation to `plan-change`.

## Visual Validation

- [ ] Load `visual-qa`.
- [ ] Name the source of expected appearance and viewport matrix.
- [ ] Check product/spec, UX/layout, brand, and design-system sources before
      judging a visual issue as a defect.
- [ ] Use browser or screenshot evidence when the app is runnable.
- [ ] Check long labels/content, loading/empty/error/disabled states, and
      mobile/narrow behavior.
- [ ] Route durable product/spec, design, brand, backlog, glossary, or pattern
      facts through `docs-impact-map` before owner docs change.
- [ ] Route repeated workflow lessons through `closeout` or
      `codex-maintenance` to the narrowest memory owner.
- [ ] Route behavior failures to `functional-qa` or implementation instead of
      treating them as visual-only findings.
- [ ] Do not store sensitive screenshots or private customer data in durable
      artifacts.

## Figma Or Mockup Work

- [ ] Use Figma only for explicit Figma URLs, selected frames, or write/read
      requests.
- [ ] Load the required Figma plugin skill before any Figma tool call.
- [ ] Treat Figma and static mockups as design evidence; current code remains
      implementation truth when they drift.
- [ ] Use dummy data in mockups.
- [ ] Do not include credentials, tokens, private customer data, regulated
      sensitive data, raw logs, or sensitive screenshots in durable mockups or
      handoff artifacts.
- [ ] If a mockup or Figma screen introduces a reusable pattern, route it to
      `design-system` before closeout.
- [ ] If the evidence is feature-specific, route the UX delta to the owning
      product/spec artifact instead of creating a parallel design rule.
- [ ] Run `docs-impact-map` when mockup, Figma, component, or token decisions
      create durable product/design/brand/spec implications.
