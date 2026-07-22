# Semantic Repair Checklist

- [ ] The request is stale/failing automated-test repair, not new coverage.
- [ ] The original failure was reproduced or the blocker is explicit.
- [ ] Evidence distinguishes product behavior from test behavior.
- [ ] The failure class is named.
- [ ] Current public-boundary evidence proves product behavior still matches
      the expected contract before any test artifact is changed.
- [ ] Product regressions were not hidden by test changes.
- [ ] Product/runtime bugs were handed off to `implement-change` with evidence.
- [ ] The semantic behavior preserved by the repair is named.
- [ ] Assertions were not weakened to generic load or existence checks.
- [ ] Tests or scenario rows were not deleted without equivalent coverage.
- [ ] Locator changes prefer public, stable signals.
- [ ] Arbitrary sleeps were avoided unless no observable condition exists.
- [ ] Gated or skipped required suites are reported as `BLOCKED`.
- [ ] The repaired test and a neighboring check ran when feasible.
- [ ] Graph repair names the failed evidence, earliest responsible node,
      affected consumers, and unrelated accepted work to preserve.
- [ ] Attempt/maximum is checked; exhaustion routes to `BLOCKED` without a
      silent reset, and topology changes require a new graph revision.
- [ ] Stale evidence remains historical; replacement evidence either carries a
      stable evidence ID and subject, graph revision and attempt, input/source
      versions and commit/digest, producer and time, requirement level,
      evaluator authority, acceptance criteria, invalidation condition, and
      failure route, or references a complete bound receipt containing them.
- [ ] Missing replacement-evidence identity or evaluator authority is `GAP`
      and does not satisfy an acceptance gate.
- [ ] The resume route returns repaired work to `PENDING` for readiness
      recalculation, and only the lane-state owner records transitions.
