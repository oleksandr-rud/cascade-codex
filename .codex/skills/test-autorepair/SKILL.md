---
name: test-autorepair
description: Repair failing, flaky, stale, or misaligned automated tests while preserving semantic coverage and routing product bugs back to implementation.
---

# Test Autorepair

Use when an automated test, scenario, fixture, mock, locator, route harness, or
runner configuration is failing, flaky, or stale.

This skill may patch test files, helpers, mocks, fixtures, and runner config. It
must not patch product/runtime source code unless the user explicitly changes
the task and the work is routed through `implement-change`.

## Source Order

1. Failing command and full failure output.
2. Trace, screenshot, video, console, network, logs, or captured fixtures.
3. Current behavior observed through public boundaries.
4. Feature Impact Matrix rows from the current work lane when present.
5. User request, specs, scenarios, and `docs/glossary.md`.
6. Existing tests, helpers, fixtures, and testing patterns.
7. `docs/patterns/testing.md` for semantic repair rules.

## Failure Classes

- `product-regression`
- `test-drift`
- `locator-drift`
- `timing-flake`
- `fixture-drift`
- `infrastructure-blocker`
- `ambiguous`

## Checklist

1. Reproduce the failure or state why it cannot be reproduced.
2. Read the Feature Impact Matrix when present, including directly touched
   features, protected adjacent behavior, required checks, and planned route.
3. Compare current product behavior with the expected contract.
4. Classify the failure.
5. Stop and route to `implement-change` when documented expected behavior is
   broken by the change, including out-of-scope protected adjacent behavior.
6. Stop and route to `plan-change` when the expected feature contract is
   missing or ambiguous.
7. Apply the smallest semantic test repair only when product behavior still
   matches the expected contract.
8. Preserve scenario IDs and behavior coverage.
9. Re-run the repaired test and at least one neighboring confidence check when
   feasible.
10. Inspect the diff for assertion weakening before closing.

## Forbidden Repairs

- Deleting failing tests without equivalent coverage.
- Weakening assertions to generic page-load checks.
- Blind snapshot updates without visual review.
- Arbitrary sleeps when better waiting primitives exist.
- Marking required checks as skipped without reporting `BLOCKED`.

## Output

- failing command and symptom;
- failure class;
- Feature Impact Matrix rows consulted when present;
- repair made or reason stopped;
- validation commands;
- outcome: `REPAIRED`, `PRODUCT_BUG`, `BLOCKED`, `AMBIGUOUS`, or `STOPPED`.

Use `templates/repair-report.md` for substantial repairs and
`checklists/semantic-repair-checklist.md` before closing.
