# Architecture outcome rubric v1.0.0

## Decision

Judge whether the final architecture artifact is sufficient for the stated
task and risk. Read only the frozen request, admissible sources, target output,
and evidence locators. Do not infer missing work from intent.

## Shared anchors

- `0` — absent, contradicted, unsafe, or unusable.
- `1` — major gaps; the artifact cannot support the intended outcome.
- `2` — minimally sufficient with material limitations called out.
- `3` — strong, grounded, and operational with only minor limitations.
- `4` — complete and unusually clear without speculative complexity.

## Dimensions

- `task-fit` (25): the design solves the requested outcome, respects non-goals,
  and handles material ambiguity.
- `capability-coverage` (25): required capabilities, success oracles, and
  recovery owners are present and traceable to sources.
- `behavioral-completeness` (20): inputs, outputs, loop, state, context, memory,
  tools, roles, handoffs, stop behavior, and evaluation form a coherent system.
- `safety-operability` (20): permissions, confirmations, injection boundaries,
  budgets, failures, observability, rollback, and escalation match the risk.
- `minimality-actionability` (10): the topology is the smallest sufficient
  design and its artifacts can be implemented or tested without guesswork.

## Evidence and exclusions

Give one or more exact artifact or trace locators per rating. Do not read or
mention eligibility, thresholds, hidden answers, labels, previous scores, peer
responses, or promotion decisions. Return only the judge response schema; the
harness computes scores and acceptance.
