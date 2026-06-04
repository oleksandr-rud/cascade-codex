---
name: functional-qa
description: Primary product-visible acceptance gate for behavior examples, browser/API/journey/scenario checks, functional tests, and regression evidence.
---

# Functional Acceptance

Use this skill to prove product-visible behavior through the available boundary:
browser, API, CLI, journey script, scenario suite, or functional tests.

It is the default replacement for informal manual acceptance loops. It may
author or update functional test artifacts when the user asks for coverage or
the current behavior examples require executable proof. It must not patch
product/runtime source code.

## Source Order

1. Latest user request and expected behavior.
2. Behavior examples from `plan-change`.
3. Current product/design/spec/work docs under `docs/product/`,
   `docs/design/`, `docs/brand/`, `docs/specs/`, and `docs/work/`.
4. Running app, API, CLI, logs, traces, console, and network evidence.
5. Existing tests, helpers, fixtures, and test patterns.
6. `docs/patterns/testing.md` for functional, E2E, scenario, and evidence
   rules.

If expected behavior is missing, report `GAP` and route to `plan-change` or
`ingest-spec`.

## Checklist

1. Define boundary, user goal, preconditions, data, environment, and expected
   visible outcome.
2. Convert behavior examples into tracer-bullet acceptance checks: one scoped
   user goal, behavior example, or scenario row per check; get evidence before
   broadening coverage.
3. Do not bulk-generate an acceptance suite before the first check proves the
   seam.
4. Choose the narrowest useful layer:
   - route-mocked browser scenario;
   - live end-to-end flow;
   - API contract check;
   - CLI or command journey;
   - manual visible evidence when automation is blocked.
5. Use stable public locators or contracts rather than private selectors.
6. Mock only true system boundaries or unstable services unless full-stack
   behavior is the point.
7. Classify every check as `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, or `GAP`.
8. Route product failures to `implement-change`.
9. Route stale failing tests to `test-autorepair`.
10. Escalate to human review only for subjective judgment that executable
   evidence cannot decide.

## Output

- flow under test;
- behavior examples covered;
- test layer and reason;
- commands or visible checks run;
- evidence and outcome;
- gaps and next owner.

Use `templates/functional-test-plan.md` for larger coverage plans and
`checklists/functional-test-quality.md` before accepting authored tests.
