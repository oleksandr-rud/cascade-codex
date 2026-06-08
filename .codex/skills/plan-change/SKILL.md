---
name: plan-change
description: Use before non-atomic implementation, bug fixes, refactors, or product-visible changes to capture customer pain, product/design intent, codebase vocabulary, behavior examples, highest useful test seam, slice boundary, risks, and validation plan.
---

# Plan Change

Use before non-trivial implementation, bug fixes, refactors, public-contract
work, state changes, agent/runtime changes, or product-visible UI/API flows.

This skill turns customer pain and product/design intent into behavior examples
and validation evidence before editing. It uses codebase-specific terms instead
of generic modeling vocabulary and borrows only the useful product-side ideas:
user outcome, boundary of responsibility, and names that make current code
easier to navigate.

## Source Order

1. Latest user request and explicit constraints.
2. Current code and tests.
3. `AGENTS.md`, `CODEX.md`, and relevant skills or role contracts.
4. Current work/spec docs under `docs/work/` or `docs/specs/`.
5. Product/design context under `docs/product/`, `docs/design/`, and
   `docs/brand/`, plus any `docs-impact-map` report for current source docs.
6. Feature Impact Matrix rows from the current work lane when present.
7. `docs/glossary.md` and durable patterns.
8. `docs/structure.md` and `docs/patterns/workflow.md` when the plan changes
   active work lanes or write targets.

If code and docs disagree, follow code and report the drift.

## Scope Rules

- Skip only for atomic mechanical edits.
- Use `architecture-review` when the change crosses major boundaries, changes a
  public contract, or has unclear hidden consumers.
- Use `discover` when product/design context is too thin to safely define
  behavior examples.
- Use `market-validation` when product intent depends on long market,
  competitor, pain, economics, segment, or experiment research.
- Use `synthesis-to-spec` when PRD, persona, requirement, journey, scenario,
  non-goal, success-metric, transformed-spec, or backlog synthesis is missing
  for evidence-backed product intent.
- Use `compose-spec` when product/spec synthesis exists but durable
  PRD, persona, requirement, journey, scenario, transformed-spec, or backlog
  artifacts have not been written.
- Use `brand-positioning` when naming, tone, content hierarchy, visual
  direction, or copy rules are missing for product-visible behavior.
- Use `design-system` when token, component, accessibility, layout, responsive,
  interaction-state, or visual evidence rules are missing.
- Use `ingest-spec` when incoming specs must be normalized before planning.
- Use `docs-impact-map` when source docs changed and sibling product, design,
  brand, spec, backlog, glossary, or pattern effects have not been checked.
- Use `orchestrate-work` when the work may split into parallel lanes or needs
  dependency/conflict tracking.
- Prefer replacement and cleanup for stale or duplicate paths unless the user
  asks for staged compatibility.

## Checklist

1. State customer pain, intended behavior, assumptions, success criteria, and
   non-goals.
2. For each problem, requirement, or gap, run several trajectory passes per
   `docs/patterns/workflow.md#trajectory-coverage`; every trajectory must cover
   a real problem, requirement, or gap, and the final plan must synthesize those
   trajectories losslessly without omitting major or minor inspected details.
3. Map codebase context: entry points, modules, state, data, adapters,
   generated clients, tests, and user paths.
4. Identify affected and protected feature contracts: the directly changed
   feature or flow, source docs/spec IDs, touched code/public contracts,
   adjacent behavior to preserve, required checks, and route for gaps or
   failures.
5. Write behavior examples in plain language or Given/When/Then form.
6. Include negative, stale-state, permission, follow-up, or adjacent-mode
   examples when touched behavior makes them likely.
7. Ask one blocker question at a time, include a recommended answer, and
   inspect code/docs instead of asking when available evidence can answer it.
8. Compare implementation approaches only when credible alternatives exist.
9. Name the highest useful test seam: the public/product boundary where a check
   can prove behavior without coupling to private helper shape.
10. Choose the smallest vertical slice that satisfies the examples.
11. Map regressions across touched boundaries and Feature Impact Matrix rows.
12. Name functional and automated validation before editing.
13. Persist durable decisions only when they are hard to reverse, surprising
    without context, and the result of a real trade-off.
14. Update `docs/work/active.md` or a lane packet only when the plan changes
   active work state.

## Output

- intended behavior and assumptions;
- behavior examples;
- affected and protected feature contracts;
- codebase context and slice boundary;
- chosen approach and rejected alternatives when relevant;
- risks and deferred items;
- validation plan.
