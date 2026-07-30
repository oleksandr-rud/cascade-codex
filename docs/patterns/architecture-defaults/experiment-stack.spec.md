# Experiment Stack

- Pair ID: `experiment-stack`
- Graph: `docs/patterns/architecture-defaults/experiment-stack.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use for an `experiment` after its question, inputs, library ecosystem,
acceleration, reproducibility, artifacts, cost, and promotion path are known.

## Default Architecture

```text
experiment claims and policies
  -> script | notebook with source modules | accelerated profile
  -> locked environment and artifact lineage
  -> rerun and cleanup proof
  -> selected experiment technology
```

### Experiment Candidate Families

| Candidate family | Prefer when | Prove first |
|---|---|---|
| Script/source-first | Automation, review, repeatability, composition, or CI execution matters | Environment lock, input identity, deterministic behavior, artifacts, and failure reporting |
| Notebook with source modules | Interactive exploration and visual analysis matters | Clean-kernel execution, hidden state, parameterization, output authority, conversion, and review |
| Accelerated profile | GPU, specialized hardware, distributed computation, or managed execution is required | Environment image, hardware compatibility, data movement, quotas, cost, artifacts, teardown, and fallback |

Choose the ecosystem that contains the required libraries and data interfaces.
Do not select technology only because it is common for experiments. Keep
reusable computation in versioned modules and make notebooks thin orchestration
or presentation layers when results may be reused.

## Reference File Structure

Apply the `experiment` archetype:

```text
experiments/<name>/
  inputs/
  src/
  runs/
  artifacts/
  analysis/
```

Record environment lock, runtime or image identity, hardware requirements,
parameter contract, artifact formats, and teardown route.

## Default Decisions

- Choose the ecosystem from required libraries, data, acceleration, and review
  capability.
- Keep reusable computation in versioned source modules.
- Treat production promotion as a new application-technology and
  infrastructure decision.

## Validation Contract

- Re-run from a clean environment with frozen input identity.
- Verify artifact lineage, metrics, logs, partial failure behavior, cost, and
  cleanup.
- Separate authored method, executed run, observed artifact, interpreted
  result, and production eligibility.

## Exceptions

Disposable exploration may use a lighter profile only when it has no promotion
or reuse path. Production promotion triggers a new backend, frontend, native,
CLI, or infrastructure decision and does not inherit experimental evidence.
