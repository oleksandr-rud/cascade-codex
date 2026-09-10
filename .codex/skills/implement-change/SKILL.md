---
name: implement-change
description: Make an authorized, scoped code or documentation change through the smallest behavior slice, preserving unrelated work and validating as implementation proceeds.
---

# Implement Change

Implement the accepted slice. This skill changes repository state only within
the user's authority and the plan's mutation boundary.

## Before editing

- Confirm intended behavior, non-goals, success criteria, and focused validation.
- Inspect current source and nearby dirty work; never assume the worktree is
  clean.
- Resolve blocker questions that would materially change the implementation.
- For an existing lane or graph, confirm its source is current. Ordinary bounded
  work needs no lane, graph, spec, or receipt.

## Implement

For a Product-backed slice, preserve the accepted requirement IDs and outcome
links through changed behavior and relevant instrumentation. Implement the
specified acceptance and failure/recovery paths. If technical evidence changes
the value mechanism, offer or scope, return that concrete contradiction to the
Product owner before substituting a different feature. A functional check proves
its tested behavior; it does not establish market demand or realized user value.

Consume the plan's accepted architecture, business examples, ownership rules,
and selected reference versions. Trace each material rule to the operation that
enforces it and its check. For an unresolved new-application or changed domain
boundary, return to `plan-change` before choosing a file structure. An approved
implementation request does not itself supply a missing architecture decision.

For UI, implement the accepted outcome and state mapping under its governing
design source. Use Cascade Design's shared outcome UI default when no more
specific accepted target design applies; preserve useful information, honest
confirmation/recovery, and responsive interaction in the rendered result.
When the accepted mapping uses structured views, apply Design's shared
`references/generative-ui.md` practice through `cascade-design:design-system`
using existing target components and interfaces. Its example assets are optional.

1. Trace the current behavior through the relevant source and consumer boundary.
2. Make the smallest structurally sound change that proves the requested
   behavior.
3. Match existing conventions and avoid adjacent cleanup.
4. Preserve public compatibility unless the request explicitly changes it.
   For UI implementation from an approved mockup, reproduce its layout, spacing,
   typography, colors, assets and component/state details. Inspect the actual
   reference, render at its viewport/state, compare screenshots, repair mismatches
   and recapture. Use `cascade-design:visual-qa` and its approved-mockup fidelity
   contract for evidence. Preserve authorized deviations; missing references or
   unresolved design/accessibility conflicts are explicit gaps. Do not claim
   pixel-perfect completion without matched rendered evidence.
5. Keep implementation and focused feedback close: run the cheapest meaningful
   check after each risky boundary.
6. Update tests and durable documentation only when their governed behavior or
   contract changed.
   Before cross-owner documentation writes, identify the authoritative fact,
   true consumers, references, and historical records; prefer links or
   generated projections over duplicated claims. Use `create-spec` when the
   changed contract requires durable specification persistence.
7. If product behavior is wrong, fix the implementation. Route uncertain
   failures to `cascade-qa:triage-defects`; use `repair-tests` only when that
   artifact proves `TEST_DRIFT` from current public-boundary evidence.
8. Stop and report if permission, external coordination, or a materially larger
   scope is required.

## Handoff

Summarize changed behavior, files, assumptions, and focused evidence. Route to:

- `validate-change` for every completed non-atomic change,
- `cascade-software-architect:review-change` when the diff is public, cross-boundary, security-sensitive,
  harness-semantic, or otherwise benefits from an independent fixed-point pass,
- `cascade-project-management:manage-project` only when newly discovered work
  truly needs separate ownership, a dependency join, or a durable handoff.

Do not declare broad success from a narrow check, silently overwrite unrelated
changes, or manufacture process artifacts after the fact.
