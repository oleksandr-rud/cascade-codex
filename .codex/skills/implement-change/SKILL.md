---
name: implement-change
description: Make scoped code or doc changes from a clear request or approved plan using behavior-slice implementation and feedback-loop-first bug fixing.
---

# Implement Change

Use for implementation, bug fixing, refactoring, or documentation updates after
enough context is gathered. Do not use for open-ended planning.

## Source Order

1. Latest user request.
2. Current plan and behavior examples when present.
3. Current code and tests.
4. Relevant architecture, product, design, and testing patterns.
5. Validation output from failed checks or repros.

## Checklist

1. Restate the implementation slice and success criteria.
2. Inspect touched files before editing.
3. Prefer existing patterns, helpers, and module boundaries.
4. Edit only files required by the slice.
5. For bugs, reproduce or identify the failure signal first when feasible.
   Sharpen the loop before patching: make it faster, more deterministic, and
   more specific to the reported symptom when feasible.
6. For hard bugs, rank falsifiable hypotheses and tag temporary
   instrumentation with a unique prefix such as `[DEBUG-abc123]` so it can be
   searched and removed before closeout.
7. Add or update tests only when they preserve meaningful behavior coverage.
8. Run targeted checks and feed failures back through the smallest next action.
9. Route stale failing tests to `test-autorepair`; route missing acceptance
   evidence to `functional-qa`.

## Rules

- Do not weaken public contracts without explicit approval.
- Do not add speculative abstractions.
- Do not patch unrelated files.
- Do not suppress type, lint, or test failures just to pass.
- Remove tagged debug instrumentation, throwaway harnesses, and speculative
  code before closeout.

## Output

- files changed;
- behavior implemented;
- tests or checks added;
- validation still needed;
- unresolved risks.
