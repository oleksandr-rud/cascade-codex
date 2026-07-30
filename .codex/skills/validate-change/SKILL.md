---
name: validate-change
description: Use after or during a change to aggregate command, test, type, diff, link, scenario, functional acceptance, and review evidence into validation status.
---

# Validate Change

Use after implementation, during feedback loops, or whenever confidence depends
on evidence. This skill aggregates evidence; it does not replace fixed-point
review, functional acceptance, or stale-test repair.

## Source Order

1. Latest request, current plan, behavior examples, and required evidence.
2. Current diff and directly affected feature contracts.
3. Targeted command, test, functional, scenario, and review evidence.
4. Current work lane, Feature Impact Matrix, and directly relevant specs.
5. `docs/patterns/testing/index.md`, `docs/patterns/workflow/index.md`, and
   boundary or context-memory patterns when the change touches those areas.

## Modes

- `targeted`: smallest relevant lint/type/unit/integration checks.
- `functional`: browser/API/journey/scenario evidence from `functional-qa`.
- `review`: Standards/Spec findings from `review-change`.
- `regression`: broader coverage when blast radius is high.
- `coverage`: scoped current-task criteria to changed code and tests.
- `feature-impact`: Feature Impact Matrix coverage for directly changed and
  protected adjacent behavior.
- `status-reconciliation`: compare an in-scope task or lane with current source
  identity, completion criteria, dependencies, and required evidence so proven
  completion can be recorded automatically.

## Checklist

1. Read current diff, plan, behavior examples, and validation requirements.
2. Run targeted checks before broad checks.
3. Compare current request and current work-lane criteria against changed files and
   tests using `docs/patterns/workflow/index.md`.
4. Compare Feature Impact Matrix rows against the diff, source docs/spec IDs,
   touched code/public contracts, and required checks. If no matrix exists for
   a product-visible change, infer the directly changed feature and likely
   protected adjacent behavior from the plan and diff, then report missing
   contracts or checks as `GAP`.
5. Treat uncovered required behavior as `FAIL`, unless explicitly deferred or
   blocked.
6. Route feature-impact findings by contract: documented expected behavior
   broken by the change goes to `implement-change`; stale tests for correct
   behavior go to `test-autorepair`; missing or ambiguous contracts go to
   `plan-change`; missing required checks go to `functional-qa`.
7. Use `review-change` for fixed-point Standards/Spec review; keep findings
   separate from command/test evidence.
8. Use `functional-qa` for product-visible acceptance evidence.
9. Use `test-autorepair` only when evidence shows tests are stale while behavior
   still matches the expected contract.
10. Load `docs/patterns/boundaries/index.md` for public-contract or model/tool
   runtime changes and `docs/patterns/context-memory/index.md` for
   retrieval/source-context changes.
11. For research, source-context, prompt, policy, or semantic-core changes,
    report structural validation separately from factual or methodological
    validation. Passing commands do not prove source coverage, evidence
    strength, claim truth, or docking quality.
12. In `status-reconciliation` mode, return `COMPLETE` only when every required
    criterion and gate passes against the current source identity. Route that
    receipt to `orchestrate-work -> closeout` for immediate status
    synchronization without another confirmation. Keep partial, stale,
    candidate-branch, or `NOT_RUN` work open with its exact next gate.
13. Report `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, or `GAP` with commands and
    evidence.

## Output

- commands run and results;
- functional/scenario evidence;
- Feature Impact Matrix coverage and routes;
- work-lane/spec coverage matrix summary;
- status-reconciliation disposition and exact source identity when requested;
- failures and routing;
- residual risk.
