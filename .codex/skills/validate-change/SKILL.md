---
name: validate-change
description: Aggregate command, test, type, diff, link, scenario, functional acceptance, and review evidence for a completed or in-progress change.
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

## Checklist

1. Read current diff, plan, behavior examples, and validation requirements.
2. Run targeted checks before broad checks.
3. Compare current request and current work-lane criteria against changed files and
   tests using `docs/patterns/workflow.md`.
4. Treat uncovered required behavior as `FAIL`, unless explicitly deferred or
   blocked.
5. Use `review-change` for fixed-point Standards/Spec review; keep findings
   separate from command/test evidence.
6. Use `functional-qa` for product-visible acceptance evidence.
7. Use `test-autorepair` only when evidence shows tests are stale while behavior
   still matches the expected contract.
8. Load `docs/patterns/boundaries.md` for public-contract or model/tool
   runtime changes and `docs/patterns/context-memory.md` for
   retrieval/source-context changes.
9. Report `PASS`, `FAIL`, `BLOCKED`, or `NOT_RUN` with commands and evidence.

## Output

- commands run and results;
- functional/scenario evidence;
- work-lane/spec coverage matrix summary;
- failures and routing;
- residual risk.
