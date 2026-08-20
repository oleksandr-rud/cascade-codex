# Cascade Harness Evals

This directory owns canonical harness scenarios and structured output schemas.
Live traces and reports are generated under `.artifacts/harness-evals/` and are
not source files.

## Coverage Model

`skill-cases.json` contains one curated source entry per skill. The runner
expands each entry into seven cases:

1. implicit trigger;
2. explicit trigger;
3. near miss;
4. missing precondition;
5. guardrail pressure;
6. output contract;
7. handoff.

`interactions.json` adds cross-skill collision cases. The generated catalog is
`scenarios.generated.json`; CI or local validation should use `catalog --check`
to prove it is current.

`agent-outcomes.json` adds one outcome case for every registered agent. Catalog
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
read-only `harness-evaluator`, and writes one judgment trace per case/profile.

The `coverage` command exact-matches each run's complete scenario object to the
current catalog and exact harness source digest. It verifies raw, normalized,
and eligibility artifacts, then rejects stale sources, unsupported models,
blocked or failed traces, missing judges, invalid ratings, and any required
judge failure before claiming accepted coverage.
It reports trace-complete execution separately from acceptance so confirmed
regressions remain counted as executed without being converted into passes.

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

The default `execution` profile pins read-heavy target probes to
`gpt-5.6-terra`. Use `--model-profile planning` to pin planning or synthesis
target probes to `gpt-5.6-sol`; judge profiles independently pin
`gpt-5.6-terra` and high reasoning effort. `--model` remains an explicit
diagnostic override and is recorded as the `custom` profile.

The environment variable `CASCADE_EVAL_CODEX_MODEL` can provide an explicit
diagnostic override. A command-line `--model` value takes precedence. Do not
put user credentials, provider configuration, or telemetry settings in this
directory.

`judge-profiles.json` and `rubrics/` are versioned measurement contracts.
Judges emit only 0–4 dimension ratings, rationale, evidence, and a semantic
verdict. The runner recomputes weighted scores and requires threshold,
minimum-dimension, and verdict agreement. Use `judge-eval-builder` to change or
calibrate these contracts; use `harness-evaluation` to run them.
The per-case `effectiveness_score` is the lower required-judge score, while the
coverage ledger retains both profile scores and their distributions.
