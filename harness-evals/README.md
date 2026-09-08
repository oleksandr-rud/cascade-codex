# Cascade Harness Evals

This directory owns canonical harness scenarios and structured output schemas.
It is a source-checkout evaluation lab, not part of the generated core target
runtime. The 138 generated scenarios and 981 admission corpus rows are loaded
only by explicit source eval/corpus commands; normal request admission and
plugin routing do not read them.
Live traces and reports are generated under `.artifacts/harness-evals/` and are
ignored, disposable local diagnostics, not source files or durable evidence.
Do not copy run directories, judge outputs, or aggregate reports into tracked
work reports or archives merely to retain a passing score. Re-run a focused
case from its current source-bound contract when the diagnostic is needed
again.

An explicitly registered simulation campaign may retain the minimal specialized
route/trace receipt required by its frozen claim contract. That campaign-scoped
receipt is not the generic run directory and cannot establish target-product
behavior or widen the claim it was created to evaluate.

## Coverage Model

`skill-cases.yaml` contains one curated source entry per skill. The runner
expands each entry into seven cases:

1. implicit trigger;
2. explicit trigger;
3. near miss;
4. missing precondition;
5. guardrail pressure;
6. output contract;
7. handoff.

`interactions.yaml` adds cross-skill collision cases. The generated catalog is
`scenarios.generated.json`; CI or local validation should use `catalog --check`
to prove it is current.

`agent-outcomes.yaml` adds one outcome case for every registered agent. Catalog
generation verifies each case against the agent's TOML model, reasoning effort,
sandbox declaration, role and skill-map load instructions, and exact ownership
of its primary skill. It also verifies that every curated skill case is wired to
its declared owner. Product-sensitive cases bind the current product, design,
and specification sources by SHA-256 inside the scenario, so a changed product
instruction makes that recorded scenario stale without treating every product
document as a global harness input.

## Commands

```bash
bun scripts/cascade.ts eval catalog --write
bun scripts/cascade.ts eval catalog --check
bun scripts/cascade.ts eval audit
bun scripts/cascade.ts eval self-test
bun scripts/cascade.ts eval run \
  --case-kind agent-outcome
bun scripts/cascade.ts eval judge \
  --run-dir .artifacts/harness-evals/<run-id>
bun scripts/cascade.ts eval coverage --list-missing
```

Live runs are serial by default. Use `--scenario`, `--skill`, `--agent`,
`--case-kind`, `--limit`, and `--repetitions` for focused diagnosis. Agent
outcome cases default to the model and reasoning effort in that agent's current
manifest; command-line model options remain diagnostic overrides. The command
prints the run directory and
writes raw traces, normalized traces, per-case mechanical eligibility, a source
manifest, and summary reports. The `judge` command selects every eligible case,
runs required outcome and trajectory profiles independently through the
read-only Cascade Evals harness subject profile (no registered host role), and writes one judgment trace per case/profile.

The `coverage` command exact-matches each run's complete scenario object to the
current catalog and exact harness source digest. It verifies raw, normalized,
and eligibility artifacts, then rejects stale sources, unsupported models,
blocked or failed traces, missing judges, invalid ratings, and any required
judge failure before claiming accepted coverage.
It reports trace-complete execution separately from diagnostic acceptance so
confirmed regressions remain counted as executed without being converted into
passes. Accepted coverage is a property of that exact disposable run; it is not
product, simulation, deployment, release, or architecture evidence.

Agent outcome eligibility additionally requires the responsible role and
primary skill to be loaded and all declared instruction sources to be cited.
Skill, role, command, output-detail, and extra-supporting-route bounds remain
diagnostic so context efficiency is visible without turning reasonable model
variation into a hard admission gate. These measurements are not release proof
and are not a reason to create a work graph.

The deterministic `self-test` also copies
`fixtures/onboarding/basic-project/` into a temporary target and proves project
inventory, target-config/path rejection, complete onboarding evidence,
project-part/doc-routing checks, preservation hashes, and source drift without
running a live model or configured target commands.

The default `execution` and `planning` profiles pin target probes to
`gpt-5.6-sol`; judge profiles independently pin `gpt-5.6-sol` and high
reasoning effort. `--model` remains an explicit
diagnostic override and is recorded as the `custom` profile.

The environment variable `CASCADE_EVAL_CODEX_MODEL` can provide an explicit
diagnostic override. A command-line `--model` value takes precedence. Do not
put user credentials, provider configuration, or telemetry settings in this
directory.

`judge-profiles.yaml` and `rubrics/` are versioned measurement contracts.
Judges emit only 0–4 dimension ratings, rationale, evidence, and a semantic
verdict. The runner recomputes weighted scores and requires threshold,
minimum-dimension, and verdict agreement. Use `cascade-evals:build-judge` to
change or calibrate these contracts; use
`cascade-evals:harness-evaluation` to coordinate and reduce one bounded target
diagnostic.
The per-case `effectiveness_score` is the lower required-judge score, while the
coverage ledger retains both profile scores and their distributions.
