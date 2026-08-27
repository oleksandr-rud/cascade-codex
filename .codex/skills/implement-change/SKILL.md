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

1. Trace the current behavior through the relevant source and consumer boundary.
2. Make the smallest structurally sound change that proves the requested
   behavior.
3. Match existing conventions and avoid adjacent cleanup.
4. Preserve public compatibility unless the request explicitly changes it.
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
