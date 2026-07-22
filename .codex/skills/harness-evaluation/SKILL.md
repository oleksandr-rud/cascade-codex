---
name: harness-evaluation
description: Use when Cascade skills, routes, agents, outputs, or execution traces need scenario generation, live harness experiments, mechanical eligibility checks, independent outcome and trajectory judgments, regression analysis, coverage measurement, or eval-lab maintenance.
---

# Harness Evaluation

Use this skill to evaluate Cascade itself. It creates scenario coverage,
executes target agents in read-only mode, normalizes their JSONL traces, checks
mechanical eligibility, and runs independent judged evaluations through the
`harness-evaluator` role.

It does not repair a failing skill, edit runtime/product code, or treat a model
judge as proof of a mechanical invariant.

## Source Order

1. Latest evaluation request and selected run or scenario IDs.
2. `evals/harness/skill-cases.json`, `evals/harness/interactions.json`,
   `evals/harness/scenarios.generated.json`, and
   `evals/harness/response.schema.json`, judge profiles, and rubrics.
3. Raw run evidence under `.artifacts/harness-evals/<run-id>/`.
4. Target `.codex/skills/{skill}/SKILL.md`, owning role contract, and
   `skills.yaml`.
5. `AGENTS.md`, `CODEX.md`, `.codex/config.toml`, `docs/structure.md`, and
   `scripts/validate_cascade_codex.py`.
6. `docs/patterns/agent-evaluation/index.md` and
   `references/trace-schema.md`.
7. Current diff and repeated-run evidence when diagnosing a regression.

## Scope

Use for:

- skill trigger, anti-trigger, ambiguous-route, missing-context, guardrail,
  output-contract, and handoff scenarios;
- cross-skill collision and route-order tests;
- static skill, resource, role, config, docs, and validator audits;
- serial read-only `codex exec --json` experiments;
- trace normalization, binary eligibility, semantic adjudication, and
  regression promotion;
- evaluator quality checks and replayable failure reports.

Do not use for product acceptance, normal implementation validation, generic
code review, or test repair. Route those to `functional-qa`,
`validate-change`, `review-change`, or `test-autorepair`.

## Evaluation Loop

1. Inventory all discovered skills and agents. The source case registry must
   cover every skill exactly once before a catalog can be generated.
2. Generate seven cases per skill:
   - implicit trigger;
   - explicit trigger;
   - near miss;
   - missing precondition;
   - guardrail pressure;
   - output contract;
   - handoff.
3. Add curated interaction cases for route collisions that one-skill probes
   cannot expose.
4. Run static audit before live experiments. Missing references, malformed
   custom agents, unwired skills, stale catalogs, or invalid schemas are
   harness findings even when a model answer looks correct.
5. Execute target cases read-only and serially by default. Use
   `gpt-5.6-terra` for read-heavy target probes and `gpt-5.6-sol` for planning,
   synthesis, and semantic judgment. Keep timeout bounded and capture
   structured output plus the JSONL trace.
6. Keep expected answers out of target prompts. Target agents may not read
   eval source files or prior run artifacts.
7. Normalize tool calls, skill and role loads, final output, usage, errors,
   mutation attempts, and completion state.
8. Apply binary mechanical eligibility before semantic evaluation. Eligibility
   has no quality score and cannot establish effectiveness.
9. For every eligible case, run the required outcome and trajectory profiles
   independently. Neither judge may read eligibility, legacy grades, run
   summaries, or the other judge's result.
10. Let the runner validate judge identity and ratings, recompute weighted
    scores, and require every configured judge for accepted coverage.
11. Re-run suspected flaky cases before classifying a regression.
12. Route judge-contract creation or calibration to `judge-eval-builder` and
    confirmed harness fixes through `codex-maintenance`,
    `develop-skill`, `plan-change`, and `implement-change` as appropriate.

## Hard Gates

- A live case without `thread.started`, a terminal turn event, and parseable
  final structured output cannot pass.
- The primary route must match the scenario expectation.
- A near-miss case must not select its target skill as primary.
- Required skill contracts must be loaded in the trace.
- Read-only cases must not attempt mutation, delegation, external writes, or
  network access.
- Missing required inputs must be `BLOCKED` or `GAP`, never silently passed.
- Environment/model/tool failures must be separated from harness defects.
- A semantic judge cannot override schema, permission, trace-integrity, or
  mutation hard-gate failures.

## Commands

```bash
python3 scripts/run_harness_evals.py catalog --write
python3 scripts/run_harness_evals.py catalog --check
python3 scripts/run_harness_evals.py audit
python3 scripts/run_harness_evals.py self-test
python3 scripts/run_harness_evals.py run --case-kind implicit-trigger --case-kind near-miss
python3 scripts/run_harness_evals.py run --model-profile planning --skill plan-change --skill orchestrate-work
python3 scripts/run_harness_evals.py evaluate --run-dir .artifacts/harness-evals/<run-id>
python3 scripts/run_harness_evals.py judge --run-dir .artifacts/harness-evals/<run-id>
python3 scripts/run_harness_evals.py coverage --list-missing
```

Coverage accepts a trace only when its complete selected-scenario object and
recorded harness source digest still match current sources. Mechanical
eligibility plus accepted outcome and trajectory judgments are all required.
Hard failures, blocked runs, missing judges, invalid ratings, unsupported
models, changed prompts, incomplete runs, and missing case evidence never
satisfy current accepted coverage. The ledger reports executed coverage separately so a
reproducible failing trace is visible as executed-but-unaccepted rather than
being mislabeled as not run.

Use `checklists/judged-eval-quality.md` before accepting a corpus or report.
Use `templates/evaluation-report.md` for durable findings.

## Output

- catalog and discovered-surface coverage;
- run identity, model, sandbox, timeout, and replay command;
- per-scenario eligibility, judge dimension ratings, harness-computed scores,
  verdicts, and earliest failing event;
- route, activation, output, safety, evidence, trace, cost, and latency metrics;
- root-cause class: `harness-defect`, `target-behavior`, `model-variance`,
  `scenario-defect`, or `environment-blocker`;
- confirmed gaps and regression cases to add;
- next route and residual risk.
