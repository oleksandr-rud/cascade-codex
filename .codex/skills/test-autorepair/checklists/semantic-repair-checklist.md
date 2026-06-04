# Semantic Repair Checklist

- [ ] The request is stale/failing automated-test repair, not new coverage.
- [ ] The original failure was reproduced or the blocker is explicit.
- [ ] Evidence distinguishes product behavior from test behavior.
- [ ] The failure class is named.
- [ ] Product regressions were not hidden by test changes.
- [ ] Product/runtime bugs were handed off to `implement-change` with evidence.
- [ ] The semantic behavior preserved by the repair is named.
- [ ] Assertions were not weakened to generic load or existence checks.
- [ ] Tests or scenario rows were not deleted without equivalent coverage.
- [ ] Locator changes prefer public, stable signals.
- [ ] Arbitrary sleeps were avoided unless no observable condition exists.
- [ ] Gated or skipped required suites are reported as `BLOCKED`.
- [ ] The repaired test and a neighboring check ran when feasible.

