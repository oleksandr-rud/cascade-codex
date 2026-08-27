# Cascade QA capability map

| Moved capability | Former harness source | New owner | Host remainder |
| --- | --- | --- | --- |
| Product-visible acceptance planning and evidence classes | `functional-qa` | `plan-quality` | Bind current target commands, surfaces, and environments |
| Functional/API/browser/scenario test design | `functional-qa` | `design-tests` | Execute the frozen plan and freeze receipts |
| Acceptance evidence aggregation | `functional-qa` plus `validate-change` QA portions | `assess-quality` | Host validation aggregates QA with implementation-specific proof |
| Product bug versus stale-test classification | `test-autorepair` | `triage-defects` | Host implementation repairs product; host test adapter repairs proven drift |

`implement-change` and `validate-change` remain host capabilities;
`cascade-software-architect:review-change` owns portable change review. The new host
adapters contain no portable QA method: one executes a frozen QA plan; the
other changes test files only after `TEST_DRIFT` proof.
