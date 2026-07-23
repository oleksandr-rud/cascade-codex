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

This skill produces new product-visible proof. It is not the route for a
read-only request to aggregate existing evidence, assess its freshness or
invalidation, determine graph-gate impact, identify the earliest responsible
contract, or calculate a bounded reopen set. Route that work directly to
`validate-change`, even when the existing evidence is functional or its subject
is graph-shaped.

## Source Order

1. Latest user request and expected behavior.
2. Behavior examples from `plan-change`.
3. Current product/design/spec/work docs under `docs/product/`,
   `docs/design/`, `docs/brand/`, `docs/specs/`, and `docs/work/`.
4. Running app, API, CLI, logs, traces, console, and network evidence.
5. Existing tests, helpers, fixtures, and test patterns.
6. `docs/patterns/testing/index.md` for functional, E2E, scenario, and evidence
   rules.
7. The current plan's selected graph-fragment test strategies and applicable
   `docs/patterns/workflow/fragments/GF-*.fragment.json` definitions.
8. `docs/patterns/workflow/graph-shaped-work.md` plus the applicable lane-local
   Task Graph and/or authoritative `docs/work/graphs/CG-XXX-*.md` Coordination
   Graph when functional evidence feeds graph state.

If expected behavior is missing, report `GAP` and route to `plan-change` or
`ingest-spec`.

## Checklist

1. Define boundary, user goal, preconditions, data, environment, and expected
   visible outcome.
2. When the plan used graph fragments, build a test-resolution ledger from
   selected fragment instances only: strategy, required/conditional level,
   activation condition, exact target command/check, fixtures/data,
   environment, evidence locus, evaluator authority, and gate. A selected
   required strategy without a runnable or explicitly blocked resolution is
   `GAP`; an omitted fragment contributes no test.
3. Convert behavior examples into tracer-bullet acceptance checks: one scoped
   user goal, behavior example, or scenario row per check; get evidence before
   broadening coverage.
4. Do not bulk-generate an acceptance suite before the first check proves the
   seam.
5. Choose the narrowest useful layer:
   - route-mocked browser scenario;
   - live end-to-end flow;
   - API contract check;
   - CLI or command journey;
   - manual visible evidence when automation is blocked.
6. Choose validation mode explicitly:
   - executable proof: create or run the smallest existing unit, integration,
     contract, E2E, scenario, API, CLI, or browser check that proves the
     behavior;
   - source-blind browser proof: operate the running app as a user would and
     verify only observable outcomes; read source only if the user asks for
     diagnosis or owner mapping.
7. When product scenario rows are present, build a per-scenario ledger before
   running checks: scenario ID or source, preconditions, action path, expected
   visible outcome, validation mode, and evidence target.
8. Use stable public locators or contracts rather than private selectors.
9. Mock only true system boundaries or unstable services unless full-stack
   behavior is the point.
10. Do not mock the behavior being tested.
11. Classify every check and every scenario row as `PASS`, `FAIL`, `BLOCKED`,
   `NOT_RUN`, or `GAP`.
   Skipped or environment-gated checks are not `PASS`.
12. For graph-shaped work, define each functional evidence receipt before using
    it in a gate: stable evidence ID; subject node/workline/materialization/
    batch/gate; graph revision; attempt; input/source versions; producer
    transport and source commit/digest when available; producer and production
    time; required/optional level; named evaluator/reviewer authority;
    acceptance criteria; invalidation condition; and failure route. Missing
    identity or evaluator authority is `GAP`, not acceptance evidence.
13. Label the evidence locus `worker-local` or `active-worktree-integrated`.
    Integrated evidence also binds materialization IDs, target HEAD, combined
    diff fingerprint, Batch Evaluation Matrix revision when applicable, and
    environment. A worker-local pass cannot satisfy a required integrated gate.
14. Keep functional evidence distinct from command results, Standards/Spec
    review, and semantic judgments even when one gate consumes all of them.
    The functional check executor produces the receipt; the evaluator named by
    the gate judges it; only the lane-state or coordination-state owner records
    its authoritative transition.
15. Apply requirement levels explicitly: required `PASS` may contribute to a
    join; required `FAIL`, `BLOCKED`, `GAP`, or `NOT_RUN` prevents acceptance;
    optional `NOT_RUN` records its optionality and reason. A blocked required
    check proposes a blocked join rather than a pass.
16. When executing a functional batch, emit every expected shard as a stable,
    subject-bound receipt and report missing or duplicate shards. Leave
    batch-wide freshness, deduplication, aggregation, and gate impact to
    `validate-change`; never silently average or replace duplicates.
17. When newly executed or authored functional proof shows that a receipt's
    subject, fragment source/version or bound ports, revision, attempt,
    input/source version, producer transport, target HEAD/diff, materialization
    set, batch definition, or source commit changed, emit the bound functional
    evidence and route freshness, gate-impact, and bounded-reopen aggregation
    to `validate-change`. Do not turn this evidence producer into the
    repair-impact authority. Preserve unrelated accepted work in the
    receipt/proposal.
18. Separate product/runtime failures, stale test failures, missing product
    intent, and infrastructure blockers before choosing the next route.
19. Route product failures to `implement-change`.
20. Route stale failing tests to `test-autorepair` only when evidence shows
    product behavior still matches the expected contract.
21. Escalate to human review only for subjective judgment that executable
    evidence cannot decide.

## Output

- flow under test;
- behavior examples covered;
- test layer and reason;
- selected fragment test-resolution ledger and explicit omitted/blocked
  strategies when composition applies;
- scenario ledger with per-scenario outcomes when scenario rows were used;
- commands or visible checks run;
- evidence receipts, producer/evaluator authority, requirement level, evidence
  locus, materialization/target/batch bindings, and outcome;
- newly produced functional evidence that may invalidate a prior receipt, plus
  the direct `validate-change` handoff for freshness, aggregate gate impact, and
  bounded-reopen assessment; do not make that aggregate decision here;
- gaps and next owner.

Use `templates/functional-test-plan.md` for larger coverage plans and
`checklists/functional-test-quality.md` before accepting authored tests.
