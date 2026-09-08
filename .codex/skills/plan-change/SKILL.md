---
name: plan-change
description: Define the smallest safe implementation slice and its validation before non-atomic edits. Keep ordinary plans inline; create durable planning artifacts only when work must survive tasks or cross real ownership boundaries.
---

# Plan Change

Turn a request and current repository evidence into an executable, proportional
plan. Planning is a decision aid, not a prerequisite-document factory.

## Classify the work

- **Atomic**: one mechanical edit with no behavior or contract impact. Bypass
  this skill.
- **Bounded**: one owner and one coherent behavior slice. Use a short inline
  plan; do not create a lane, graph, spec, or report.
- **Connected**: several components or a real handoff share one outcome. Add a
  compact dependency and evidence map.
- **Program**: multiple horizons, owners, or independently resumable worklines.
  Use `cascade-project-management:plan-project` and, only for feasible
  committed scope, `cascade-project-management:manage-project`.

## Plan the slice

When a Product definition or growth-derived feature is supplied, carry its
current decision, requirement IDs, outcome, acceptance behavior, non-goals and
measurement limits into the slice. Resolve an undecided value/offer/feature
through `cascade-product:define-product`; use
`cascade-product:manage-product-lifecycle` for investment or gate decisions.
A growth recommendation supplies a hypothesis, not accepted product scope.
Use accepted current requirements directly for ordinary fixes; do not rerun
market or growth strategy unless the change challenges those decisions.

1. Restate the intended behavior, explicit non-goals, and success criteria.
2. Inspect the current path through source, tests, persistence, interfaces, and
   rendered or observable outcomes as applicable.
3. Identify public contracts and likely consumers of the change.
4. Choose the smallest vertical slice that can prove the outcome.
5. Record assumptions and only the tradeoffs that affect the choice.
   For UI work against approved mockups, bind exact reference frames, relevant
   viewport/states, available assets/fonts and authorized deviations. Plan a
   rendered comparison against those references; do not silently redesign them.
6. Define validation before editing: focused checks first, broader checks only
   when the touched boundary warrants them.
7. Use `cascade-software-architect:review-architecture` only for a genuine cross-boundary or public
   contract change. When a durable fact changes, identify its authoritative
   owner and classify sibling documents as consumers, references, historical,
   or unrelated; route durable spec persistence to `create-spec`.
8. Keep the plan inline unless it needs cross-task persistence. A durable spec is
   warranted only for an approved public contract, independently resumable
   work, or an explicit user request.

## Ready check

Implementation can begin when the chosen slice has:

- clear behavior and non-goals,
- named source and consumer boundaries,
- known permissions and mutation scope,
- a focused validation command or observable check,
- no unresolved question that would materially change the result.

For Connected work, add dependencies, handoffs, and evidence joins. For
Program work, hand the grounded slices to
`cascade-project-management:plan-project`, then only committed current scope
to `cascade-project-management:manage-project`; do not invent owners,
capacity, dates, work IDs, or active state.

## Output

Return the mode, slice, affected boundaries, risks, validation, and next action.
A concise inline plan is the default.
