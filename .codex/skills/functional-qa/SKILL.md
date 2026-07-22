---
name: functional-qa
description: Use as the primary product-visible acceptance gate when behavior needs evidence through examples, browser/API/journey/scenario checks, functional tests, or regression probes.
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
6. `docs/patterns/testing/index.md` for functional, E2E, scenario, and evidence
   rules.
7. `docs/patterns/workflow/graph-shaped-work.md` plus the current lane's
   authoritative node/gate records when the work uses graph-shaped state.

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
5. Choose validation mode explicitly:
   - executable proof: create or run the smallest existing unit, integration,
     contract, E2E, scenario, API, CLI, or browser check that proves the
     behavior;
   - source-blind browser proof: operate the running app as a user would and
     verify only observable outcomes; read source only if the user asks for
     diagnosis or owner mapping.
6. When product scenario rows are present, build a per-scenario ledger before
   running checks: scenario ID or source, preconditions, action path, expected
   visible outcome, validation mode, and evidence target.
7. Use stable public locators or contracts rather than private selectors.
8. Mock only true system boundaries or unstable services unless full-stack
   behavior is the point.
9. Do not mock the behavior being tested.
10. Classify every check and every scenario row as `PASS`, `FAIL`, `BLOCKED`,
   `NOT_RUN`, or `GAP`.
   Skipped or environment-gated checks are not `PASS`.
11. For a graph-shaped lane, define each functional evidence receipt before
    using it in a gate: stable evidence ID; subject node/gate; graph revision;
    node attempt; input/source versions; source commit or digest when
    available; producer; production time; required/optional level; named
    evaluator/reviewer authority; acceptance criteria; invalidation condition;
    and failure route. Missing identity or evaluator authority is `GAP`, not
    acceptance evidence.
12. Keep functional evidence distinct from command results, Standards/Spec
    review, and semantic judgments even when one gate consumes all of them.
    The functional check executor produces the receipt; the evaluator named by
    the gate judges it; only the lane-state owner records a gate transition.
13. Apply requirement levels explicitly: required `PASS` may contribute to a
    join; required `FAIL`, `BLOCKED`, `GAP`, or `NOT_RUN` prevents acceptance;
    optional `NOT_RUN` records its optionality and reason. A blocked required
    check proposes a blocked join rather than a pass.
14. When a receipt's subject, revision, attempt, input/source version, or
    source commit changes, mark it stale and propose reopening the accepted
    gate plus only consumers whose named inputs or evidence depend on it.
    Preserve unrelated accepted work.
15. Separate product/runtime failures, stale test failures, missing product
    intent, and infrastructure blockers before choosing the next route.
16. Route product failures to `implement-change`.
17. Route stale failing tests to `test-autorepair` only when evidence shows
    product behavior still matches the expected contract.
18. Escalate to human review only for subjective judgment that executable
    evidence cannot decide.

## Output

- flow under test;
- behavior examples covered;
- test layer and reason;
- scenario ledger with per-scenario outcomes when scenario rows were used;
- commands or visible checks run;
- evidence receipts, producer/evaluator authority, requirement level, and
  outcome;
- invalidated evidence, affected consumers, and proposed gate state when the
  lane is graph-shaped;
- gaps and next owner.

Use `templates/functional-test-plan.md` for larger coverage plans and
`checklists/functional-test-quality.md` before accepting authored tests.
