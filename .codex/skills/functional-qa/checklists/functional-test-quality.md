# Functional Test Quality Checklist

- [ ] The request is new or expanded functional coverage, not stale failing-test repair.
- [ ] The check verifies a visible outcome or public contract.
- [ ] The scenario maps to a user request, product spec, scenario row, task row, or documented regression.
- [ ] The check is a tracer bullet for one scoped user goal or scenario row, not a bulk suite generated ahead of the first proven seam.
- [ ] Scenario rows used for validation have a per-scenario result, evidence
      target, and next owner when not passing.
- [ ] Starting state and data setup are explicit.
- [ ] Locators or contract assertions use stable public signals.
- [ ] Private selectors and incidental implementation details are avoided.
- [ ] Assertions are web-first, API-contract, CLI-result, or otherwise observable.
- [ ] Only true system boundaries or unstable external services are mocked or controlled unless full-stack behavior is the point.
- [ ] The behavior being tested is not mocked away.
- [ ] Source-blind browser proof, when selected, verifies only observable behavior until diagnosis is requested.
- [ ] Generated or drafted tests were reviewed for semantics, traceability, fixtures, and assertions.
- [ ] Missing product intent is reported as `GAP`.
- [ ] Product/runtime bugs are handed off with evidence.
- [ ] Product/runtime failures, stale test failures, missing intent, and
      infrastructure blockers are classified separately.
- [ ] Required gated checks are `BLOCKED` when preconditions are missing.
- [ ] Skipped or environment-gated checks are not reported as `PASS`.
- [ ] Optional or out-of-scope checks are `NOT_RUN` with a reason.
- [ ] Graph-shaped evidence has a stable ID, subject, graph revision, attempt,
      input/source versions, source commit or digest, producer, production
      time, requirement level, evaluator authority, acceptance criteria,
      invalidation condition, and failure route.
- [ ] Functional evidence remains distinct from command, Standards/Spec, and
      semantic-judgment evidence.
- [ ] Required non-passing or not-run evidence prevents a pass; optional
      `NOT_RUN` records optionality and reason.
- [ ] Stale evidence proposes reopening only its gate and affected consumers;
      the evidence producer does not record authoritative transitions.
