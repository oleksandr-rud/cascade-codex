---
name: validate-change
description: Use after or during a change to aggregate command, test, type, diff, link, scenario, functional acceptance, and review evidence into validation status.
---

# Validate Change

Use after implementation, during feedback loops, or whenever confidence depends
on evidence. This skill aggregates evidence; it does not replace fixed-point
review, functional acceptance, or stale-test repair.

## Modes

- `targeted`: smallest relevant lint/type/unit/integration checks.
- `functional`: browser/API/journey/scenario evidence from `functional-qa`.
- `review`: Standards/Spec findings from `review-change`.
- `regression`: broader coverage when blast radius is high.
- `coverage`: scoped current-task criteria to changed code and tests.
- `feature-impact`: Feature Impact Matrix coverage for directly changed and
  protected adjacent behavior.

## Checklist

1. Read current diff, plan, behavior examples, and validation requirements.
2. Run targeted checks before broad checks.
3. Compare current request and current work-lane criteria against changed files and
   tests using `docs/patterns/workflow.md`.
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
10. Load `docs/patterns/boundaries.md` for public-contract or model/tool
   runtime changes and `docs/patterns/context-memory.md` for
   retrieval/source-context changes.
11. Report `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, or `GAP` with commands and
   evidence.

## Output

- commands run and results;
- functional/scenario evidence;
- Feature Impact Matrix coverage and routes;
- work-lane/spec coverage matrix summary;
- failures and routing;
- residual risk.
