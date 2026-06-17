# Designer Workflow Checklist

Use this checklist when the Designer role combines UX, accessibility,
visual-validation, and design-system skills.

## Reusable Design-System Rule

- [ ] Load `design-system`.
- [ ] Inspect `docs/design/interaction-model.md`, `docs/design/tokens.md`,
      related product/spec/brand docs, and current UI code or screenshots.
- [ ] Keep feature-specific UX in product/spec docs and reusable rules in
      `docs/design/`.
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
- [ ] Use browser or screenshot evidence when the app is runnable.
- [ ] Check long labels/content, loading/empty/error/disabled states, and
      mobile/narrow behavior.
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
