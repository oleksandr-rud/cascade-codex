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

## Commands

```bash
python3 scripts/run_harness_evals.py catalog --write
python3 scripts/run_harness_evals.py catalog --check
python3 scripts/run_harness_evals.py audit
python3 scripts/run_harness_evals.py self-test
python3 scripts/run_harness_evals.py run \
  --case-kind implicit-trigger \
  --case-kind near-miss
python3 scripts/run_harness_evals.py judge \
  --run-dir .artifacts/harness-evals/<run-id>
python3 scripts/run_harness_evals.py coverage --list-missing
```

Live runs are serial by default. Use `--scenario`, `--skill`, `--limit`, and
`--repetitions` for focused diagnosis. The command prints the run directory and
writes raw traces, normalized traces, per-case grades, and summary reports.
The `judge` command selects non-perfect or failed cases by default, loads the
read-only `harness-evaluator` role, pins it to `gpt-5.6-sol`, and writes a
separate judgment trace and summary under the run directory.

The `coverage` command exact-matches each run's complete scenario object to the
current catalog. It verifies the case's raw, normalized, and grade artifacts,
then rejects stale prompts, unsupported models, blocked or failed traces, and
unjudged sub-100 scores before claiming accepted coverage.
It reports trace-complete execution separately from acceptance so confirmed
regressions remain counted as executed without being converted into passes.

The default `execution` profile pins read-heavy target probes to
`gpt-5.6-terra`. Use `--model-profile planning` to pin planning, synthesis, or
golden-evaluator probes to `gpt-5.6-sol`. `--model` remains an explicit
diagnostic override and is recorded as the `custom` profile.

The environment variable `CASCADE_EVAL_CODEX_MODEL` can provide an explicit
diagnostic override. A command-line `--model` value takes precedence. Do not
put user credentials, provider configuration, or telemetry settings in this
directory.
