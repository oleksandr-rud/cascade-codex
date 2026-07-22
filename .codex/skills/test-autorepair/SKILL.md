---
name: test-autorepair
description: Use only when automated tests are failing, flaky, stale, or drifted while product behavior is believed correct; repair test expectations and route product bugs back to implementation.
---

# Test Autorepair

Use when an automated test, scenario, fixture, mock, locator, route harness, or
runner configuration is failing, flaky, or stale and current public-boundary
evidence shows the product still matches the expected contract. Product
regressions, missing acceptance evidence, and ambiguous contracts are not
autorepair-eligible.

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
7. `docs/patterns/testing/index.md` for semantic repair rules.
8. `docs/patterns/workflow/graph-shaped-work.md` plus the current lane's
   authoritative node, gate, attempt, and repair history when graph-shaped.

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
5. Confirm stale-test-only eligibility from current product behavior and the
   expected contract. Missing or inconclusive proof is `AMBIGUOUS` or
   `BLOCKED`, not authorization to edit tests.
6. For graph-shaped work, bind the failure to its evidence ID, subject,
   revision, attempt, input/source versions, and responsible producer or
   contract. Identify the earliest responsible node and reopen only it and
   consumers whose named inputs, contracts, gates, or evidence are no longer
   trustworthy. Preserve unrelated accepted work.
7. Before an unchanged-topology repair, check `attempt / maximum`. Attempts
   through the maximum may execute; after the maximum is consumed, do not
   repair or reset history. Propose `BLOCKED` and route to the lane owner,
   `plan-change`, or user escalation. A topology, dependency, actor, ownership,
   or gate change requires a new graph revision instead of another attempt.
8. Stop and route to `implement-change` when documented expected behavior is
   broken by the change, including out-of-scope protected adjacent behavior.
9. Stop and route to `plan-change` when the expected feature contract is
   missing or ambiguous.
10. Apply the smallest semantic test repair only when product behavior still
   matches the expected contract.
11. Preserve scenario IDs and behavior coverage.
12. Re-run the repaired test and at least one neighboring confidence check when
   feasible.
13. Replace stale evidence with either a complete new bound evidence receipt or
    a stable reference to one. The receipt names its stable evidence ID and
    subject; graph revision and node attempt; input/source versions and source
    commit or digest; producer and production time; required/optional level;
    evaluator/reviewer authority; acceptance criteria; invalidation condition;
    and failure route. Missing identity or authority is `GAP` and cannot satisfy
    a gate. Never relabel the old receipt as current.
14. Record failed evidence, cause, reopened/preserved IDs, attempt, and the
    deterministic resume route. Repaired or unblocked graph nodes return to
    `PENDING` for readiness recalculation, never directly to `READY`.
15. Return repair evidence and a proposed transition to the lane-state owner;
    the repair executor does not mutate authoritative node or gate state.
16. Inspect the diff for assertion weakening before closing.

## Forbidden Repairs

- Deleting failing tests without equivalent coverage.
- Weakening assertions to generic page-load checks.
- Blind snapshot updates without visual review.
- Arbitrary sleeps when better waiting primitives exist.
- Marking required checks as skipped without reporting `BLOCKED`.

## Output

- failing command and symptom;
- failure class;
- graph evidence binding, earliest responsible node, affected consumers,
  preserved accepted work, attempt/maximum, and exhaustion state when
  applicable;
- Feature Impact Matrix rows consulted when present;
- repair made or reason stopped;
- validation commands;
- invalidated evidence, complete replacement-evidence binding or bound receipt
  reference, and deterministic resume route;
- outcome: `REPAIRED`, `PRODUCT_BUG`, `BLOCKED`, `AMBIGUOUS`, or `STOPPED`.

Use `templates/repair-report.md` for substantial repairs and
`checklists/semantic-repair-checklist.md` before closing.
