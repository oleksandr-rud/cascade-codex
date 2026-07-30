# Experiment Project Default

- Pair ID: `experiment`
- Graph: `docs/patterns/architecture-defaults/experiment.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use this archetype for a technical spike, benchmark, model or prompt trial,
data analysis, algorithm comparison, or infrastructure experiment whose result
may inform a decision. It separates the question and immutable protocol from
execution, raw evidence, derived analysis, reporting, and production promotion.

Do not turn a normal implementation task into an experiment merely to avoid
production contracts. Do not persist this structure for a disposable check
whose result will not be reused or cited.

## Default Architecture

```text
question and success measure
  -> immutable protocol, variants, inputs, seeds, and environment
  -> repeatable runner -> external adapters
  -> immutable per-run raw artifacts
  -> repeatable analysis
  -> evidence-linked report
  -> discard, repeat, extend, or production promotion gate
```

Raw artifacts are append-only evidence. Analysis is derived and reproducible.
A report distinguishes observed values, derived metrics, interpretation,
limitations, and recommendation. Promotion means adopting production ownership,
tests, operations, security, and lifecycle—not copying a notebook or script
unreviewed.

## Reference File Structure

### Python

```text
README.md
pyproject.toml
lockfile
protocols/
  <experiment>.yaml
src/<experiment>/
  runner.py
  adapters/
  metrics/
  analysis/
scripts/
  run.py
  analyze.py
tests/
  protocol/
  metrics/
  smoke/
artifacts/
  <run-id>/
    manifest.json
    inputs/
    raw/
    logs/
    metrics.json
reports/
  <run-id>.md
```

Notebooks may explore data, but production comparisons and report metrics must
move into repeatable `analysis/` code before the result is treated as evidence.

### TypeScript

```text
README.md
package.json
lockfile
protocols/
  <experiment>.yaml
src/
  runner.ts
  adapters/
  metrics/
  analysis/
scripts/
  run.ts
  analyze.ts
tests/
  protocol/
  metrics/
  smoke/
artifacts/
  <run-id>/
    manifest.json
    inputs/
    raw/
    logs/
    metrics.json
reports/
  <run-id>.md
```

Keep large or sensitive artifacts ignored or in a configured evidence store.
Commit compact manifests, protocols, schemas, and summary evidence only when
repository policy allows it.

## Default Decisions

### Question And Protocol

- State the decision, hypothesis, baseline, success and failure thresholds,
  constraints, confounders, and stop condition before the first accepted run.
- Version protocol files. Do not silently edit a protocol after observing
  results; create a new version or run family.
- Identify datasets, source revisions, dependencies, environment, hardware,
  provider/model versions, parameters, and random seeds.
- Define which inputs are public, private, synthetic, licensed, or restricted.

### Runs And Artifacts

- Give every run a stable ID and immutable manifest.
- Record exact command, source commit or dirty diff identity, dependency lock,
  environment, inputs, start/end time, status, resource use, and error state.
- Preserve raw outputs separately from normalized metrics and report prose.
- A failed run remains evidence; do not overwrite it with a retry.
- Bound cost, time, concurrency, storage, and external side effects.

### Analysis And Claims

- Make metrics deterministic when possible and test them against small fixtures.
- Compare against the named baseline and include uncertainty, sample size, and
  failure cases appropriate to the question.
- Separate authored protocol validation, executed runs, computed results,
  semantic judgment, and production eligibility.
- Link every report claim to run IDs and artifact paths.
- Record limitations and alternative explanations, including provider or
  environment drift.

### Production Promotion

- Prefer calling production public contracts from experiments rather than
  forking business logic.
- If a prototype is promoted, move or rewrite it under a production owner with
  API, security, data, observability, operations, migration, and rollback
  contracts.
- Do not let experiment folders become an undocumented second runtime.
- Delete or archive obsolete experimental code only through an explicit,
  recoverable cleanup decision.

## Validation Contract

- Re-run at least one representative protocol from its manifest and compare
  raw and derived results within stated determinism bounds.
- Test protocol parsing, metrics, baseline comparison, missing inputs, failed
  adapters, resource limits, and interrupted runs.
- Verify analysis is read-only over raw artifacts.
- Check secrets and restricted data are absent from committed manifests, logs,
  and reports.
- Review the promotion gate separately from experiment success; a favorable
  result is not production readiness.

## Exceptions

Adapt for notebooks, hardware labs, regulated research, human-subject studies,
or very large distributed runs whose evidence and ethics contracts are
stronger. Preserve immutable protocol identity, source provenance, per-run
evidence, reproducible analysis where feasible, explicit limitations, and a
separate promotion decision.
