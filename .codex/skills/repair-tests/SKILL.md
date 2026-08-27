---
name: repair-tests
description: Apply the smallest target-repository test-only repair after a frozen cascade-qa:triage-defects artifact proves TEST_DRIFT and current public behavior independently passes. Use for stale expectations, fixtures, locators, or test harness assumptions; never absorb a product defect or weaken coverage to obtain green output.
---

# Repair Tests

This is a target-host mutation adapter. Defect classification belongs to
`cascade-qa:triage-defects`; this skill begins only after that artifact assigns
`TEST_DRIFT` with current public-boundary `PASS` evidence.

## Repair

1. Resolve the exact triage artifact, accepted behavior revision, public-pass
   receipts, failing test and fixture revisions, prohibited shortcuts, write
   boundary, and rerun contract.
2. Stop and route to `implement-change` when behavior violates the accepted
   contract. Stop and return to `cascade-qa:triage-defects` when classification
   is ambiguous, evidence is stale, or public behavior is not independently
   proven.
3. Inspect unrelated dirty work and preserve it. Limit writes to the named test,
   fixture, locator, snapshot, or test-harness files owned by the proven drift.
4. Update the obsolete expectation to the accepted public contract. Do not
   delete the case, reduce assertions, broaden tolerances, skip execution,
   replace a real boundary with a mock, or rewrite product source.
5. Run the focused failing case, then the smallest affected regression set from
   the triage contract. Keep failures, blockers, flakes, and `NOT_RUN` checks
   explicit.
6. Return changed paths, semantic coverage preserved, before/after receipts,
   remaining evidence, and the exact handoff to
   `cascade-qa:assess-quality` or `validate-change`.

## Output

Report the frozen triage identity, test-only diff scope, focused and regression
results, coverage invariants, unresolved risks, and next owner. Never claim a
product, provider, deployment, release, or semantic pass from a repaired test
alone.
