---
name: harness-evaluation
description: Adapt Cascade Evals to coding-agent harness skills, routes, roles, outputs, and execution traces. Use for bounded trigger, collision, eligibility, outcome, trajectory, or regression diagnostics; keep each target repository's scenario catalog and harness contracts with that repository.
---

# Harness Evaluation

Evaluate a coding-agent harness through `$evaluate`; do not repair it.

## Boundary

- The target harness owns its scenario catalog, source digest, response/trace
  schemas, role wiring, deterministic expectations, and release policy.
- Cascade Evals owns generic phase states, judge contracts, response
  validation, score recomputation, and conservative diagnostic aggregation.
- Cascade Coding Agent owns repository changes and integration repair.
- Generic harness runs are disposable local diagnostics under the host's ignored
  artifact root. They are not durable evidence and cannot establish product,
  simulation, provider, deployment, release, or architecture acceptance.
- Track reusable cases, schemas, rubrics, and source contracts; do not copy raw
  runs, judge outputs, or aggregate reports into repository history merely to
  preserve a passing score.
- The narrow exception is an already registered simulation campaign whose
  frozen contract explicitly requires a specialized route/trace receipt. The
  host may retain only that minimal campaign-scoped receipt inside the run
  package; it does not promote generic scores or establish target-product
  behavior.

## Workflow

1. Bind the diagnostic to target repository identity, harness source digest,
   selected scenarios, runner, sandbox, model, timeout, profiles, and
   environment.
2. Run target probes read-only and keep expected answers, evaluator files, and
   prior artifacts outside target context.
3. Normalize trace identity, tool calls, loaded skills/roles, output, errors,
   mutation attempts, and terminal state.
4. Apply deterministic schema, route, permission, trace, and required-load
   gates before judging.
5. Run required outcome and trajectory judges independently through
   `$evaluate`; distinguish harness defect, target behavior, model variance,
   scenario defect, and environment blocker.
6. Return a version-bound diagnostic with exact limitations. Route a confirmed
   source defect to Cascade Coding Agent and rerun from current source when the
   result is needed again; do not promote the disposable run into durable
   authority.
