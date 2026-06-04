# Functional Test Quality Checklist

- [ ] The request is new or expanded functional coverage, not stale failing-test repair.
- [ ] The check verifies a visible outcome or public contract.
- [ ] The scenario maps to a user request, product spec, scenario row, task row, or documented regression.
- [ ] The check is a tracer bullet for one scoped user goal or scenario row, not a bulk suite generated ahead of the first proven seam.
- [ ] Starting state and data setup are explicit.
- [ ] Locators or contract assertions use stable public signals.
- [ ] Private selectors and incidental implementation details are avoided.
- [ ] Assertions are web-first, API-contract, CLI-result, or otherwise observable.
- [ ] Only true system boundaries or unstable external services are mocked or controlled unless full-stack behavior is the point.
- [ ] Generated or drafted tests were reviewed for semantics, traceability, fixtures, and assertions.
- [ ] Missing product intent is reported as `GAP`.
- [ ] Product/runtime bugs are handed off with evidence.
- [ ] Required gated checks are `BLOCKED` when preconditions are missing.
- [ ] Optional or out-of-scope checks are `NOT_RUN` with a reason.
