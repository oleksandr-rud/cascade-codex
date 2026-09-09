# Cascade outcome UI standard

Rule: CASCADE-UI-DEFAULT-1. Owner: Cascade Design. Default style: Hybrid.
Authority: the user's explicit Cascade-wide design direction of 2026-09-08.
Scope: new or unconstrained product and marketing interfaces. A current explicit
request, accepted target design system, or approved mockup governs its own scope.
Record those bindings; do not silently restyle an established product.

The user selected Hybrid after comparing Chat, Liquid and Hybrid examples.
Use [Hybrid foundations](hybrid-foundations.md) for the small component system,
concrete tokens, page compositions and the local action-zone gradient.

Consider structured components for choices, summaries and results using the
shared [Generative UI practice](generative-ui.md). Apply it in the existing
Product, Marketing, Design and architecture work when it makes the outcome
clearer; ordinary fixed UI remains a valid composition.

## Outcome before presentation

Start each surface with the actor's useful result, necessary decision, current
state, primary action, and evidence of completion. Product owns that behavior;
Marketing owns the supported promise; Design makes both usable and visible.
Carry this compact mapping in existing requirements, design notes, and handoffs.
It is not another mandatory document or schema.

Compose around what the person can understand, decide, or accomplish now.
Keep system activity and implementation history secondary unless they explain
waiting, uncertainty, recovery, or a requested audit. A screen is not a narrated
report of what the team or assistant did. Operational reports still retain the
evidence needed to assess work; this rule does not erase accountability.

Show only the result actually established. Requested, pending, confirmed,
failed, partial, and stale states remain distinguishable. Do not disguise a
submitted request as a confirmed outcome or decorate an assumption as proof.

## Informative, minimal composition

- Lead with the current task, result, or decision. Place the necessary context
  and one clear primary action beside it; reveal secondary detail when useful.
- Use alignment, proximity, typography, spacing, and restrained separators to
  establish hierarchy. Use lists or tables for comparable information. A card
  needs a meaningful independent object or action, not just another paragraph.
- Keep essential labels, units, dates, comparison baselines, prices, conditions,
  and state visible where they affect a choice. Minimalism removes redundant
  explanation and containers, not the information needed to act correctly.
- Keep components few and reusable. Avoid nested panels, repeated summaries,
  dashboard filler, decorative metric rows, and oversized empty headers.
  Density follows the task and viewport; a work table can remain information-rich.
- Put short action labels on controls. Use inline validation, actionable empty
  states, concrete confirmations, and a recovery action where appropriate.
  Choose direct controls for bounded choices; conversation is an optional
  interaction mode when it improves the job.

## Hybrid: quiet content and liquid controls

Use Hybrid by default: precise typography, a coherent spacing rhythm, soft geometry, restrained
color, and a fluid responsive layout. Preserve the target's meaningful visual
identity rather than forcing one font, palette, or component grid everywhere.

Liquid means selective translucent layering and smooth, legible transitions.
Use shallow depth or glass treatment on appropriate navigation, controls, or
overlays. Keep information surfaces sufficiently opaque and stable to read.
Glass is a material accent, not a requirement to blur every panel. Borders,
highlights, and shadows should explain grouping or elevation.

Motion explains selection, continuity, direct manipulation, or a state change.
Keep it brief, interruptible, and compatible with reduced-motion preferences.
Avoid decorative perpetual animation, pointer-chasing effects, and transitions
that delay the next action. Provide readable opaque/static fallbacks when
transparency, motion, contrast, device performance, or the target context requires them.

## Fast and accessible by default

Render useful content promptly. Keep interaction feedback immediate, maintain
layout stability, preserve work during errors, and show honest pending states.
Optimistic feedback must retain its pending status and recovery path until the
underlying operation is confirmed. Do not add artificial waiting or progress.

Use the existing stack and the lightest adequate implementation. Choose effects
within the target's rendering and response budget; do not add a heavy dependency
only for decoration. Validate real interaction on a relevant viewport/device
before claiming speed. A short animation duration alone does not prove performance.

Preserve keyboard operation, visible focus, readable contrast, sufficient
targets, semantic controls, zoom, and narrow layouts. Apply the existing
accessibility-review contract. Essential meaning must survive removal of effects.

## Promise, action, and outcome stay connected

Marketing surfaces lead with the actor's useful transition, relevant conditions,
credible proof, and a matching next action. Demonstrate the result where useful;
process descriptions support it only when they answer a decision-relevant question.
Product surfaces let the person perform that action and recognize its true state.
Neither aesthetic polish nor conversion establishes realized product value.

For a booking example, an initial screen can lead with available times and
"Choose a time"; a pending request shows its pending state; only a confirmed
booking shows the teacher, date, time, and appropriate change/cancel action.
These are illustrative content patterns, not new requirements for every product.

## Evidence and handoff

Bind the governing design source and relevant viewport/state pairs. Review the
rendered hierarchy, useful information, primary action, state truth, recovery,
keyboard/focus behavior, responsive fit, and the cost of effects. A user should
be able to identify the current result and next action from the interface itself.

Use existing design-review fields and the approved-mockup fidelity contract.
Separate appearance, functional behavior, measured performance, and observed
user outcomes. Reuse applicable checks; do not create wording snapshots or
per-component test quotas to enforce this prose. New evidence or an accepted
target-specific direction can refine the rule without transferring ownership.
