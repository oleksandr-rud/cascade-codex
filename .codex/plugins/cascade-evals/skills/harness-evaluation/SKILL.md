---
name: harness-evaluation
description: Adapt Cascade Evals to coding-agent harness skills, routes, roles, outputs, and execution traces. Use for trigger and collision cases, trace eligibility, outcome and trajectory judging, regression analysis, or coverage evidence; keep each target repository's scenario catalog and harness contracts with that repository.
---

# Harness Evaluation

Evaluate a coding-agent harness through `$evaluate`; do not repair it.

## Boundary

- The target harness owns its scenario catalog, source digest, response/trace
  schemas, role wiring, deterministic expectations, and release policy.
- Cascade Evals owns generic phase states, judge contracts, response
  validation, score recomputation, conservative aggregation, and receipts.
- Cascade Harness Maintainer owns repository changes and integration repair.

## Workflow

1. Freeze target repository identity, harness source digest, selected scenarios,
   runner, sandbox, model, timeout, profiles, and environment.
2. Run target probes read-only and keep expected answers, evaluator files, and
   prior artifacts outside target context.
3. Normalize trace identity, tool calls, loaded skills/roles, output, errors,
   mutation attempts, and terminal state.
4. Apply deterministic schema, route, permission, trace, and required-load
   gates before judging.
5. Run required outcome and trajectory judges independently through
   `$evaluate`; distinguish harness defect, target behavior, model variance,
   scenario defect, and environment blocker.
6. Return version-bound coverage and regression evidence. Route confirmed
   source repair to Cascade Harness Maintainer.
