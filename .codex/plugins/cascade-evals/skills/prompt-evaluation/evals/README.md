# Prompt and Interview Evaluation Pack

This versioned pack compares an **effective prompt configuration**, not an
isolated model name:

`prompt-builder model + generated prompt + target model + context + output controls`

It answers a bounded question: which eligible configuration is
`best-observed-for-workload` on the named task and corpus versions? It does not
establish a globally best model or a permanent provider ranking.

The v6 quality corpus contains exactly 14 real-task fixtures: three product
tasks, three business tasks, two coding tasks, one organization-specific
brand-context task, and five preserved extraction, classification, conflict,
diagnosis, and controlled-plan baselines. Catalog metadata records each task's
`domain` and `context_profile`; validation enforces this coverage.

## Evaluation sequence

1. Resolve the enabled `cascade-prompt:prompt` subject skill and validate task,
   model, evaluator, simulation, and judge contracts.
2. Ask Cascade Prompt to build a task prompt for the named target model and
   neutral tier, or automatically reuse a digest-bound cached response.
3. Replace the task's single input placeholder and execute the target model.
   Every builder, target, and judge invocation receives its own frozen
   `agent-response` simulation contract, authorized dispatch, hash-chained
   journal, terminal result, and controller verification.
4. Apply deterministic eligibility checks before any semantic scoring.
5. Stop before semantic judgment when mechanical eligibility fails. For fully
   deterministic tasks, use the mechanical outcome and judge trajectory once
   per generated-prompt digest. Otherwise run outcome and trajectory judges
   independently when requested.
6. Recompute weighted scores in the harness. The conservative effectiveness
   score is the lower of the outcome and trajectory scores.
7. Compare only runs with the same task/corpus, runner, rubric, and execution
   conditions. Keep latency and token observations separate from quality.

Target-model input never includes the evaluator, gold answer, judge profiles,
peer output, or acceptance threshold. The outcome judge does not see the
trajectory judgment. The trajectory judge does not see target correctness,
eligibility, or the outcome judgment.

Prompts are passed to execution adapters over stdin rather than process
arguments. Simulation journals store prompt and output digests, while the
campaign evidence directory retains the full phase artifacts. Automatic
builder and trajectory caches are content-addressed and exclude target inputs,
evaluator material, gold answers, target outputs, and outcome judgments.

Execution has tier-aware time limits: 180 seconds for efficient, 300 for
balanced, 420 for frontier-generalist, and 600 for frontier-autonomous target
runs; builders default to 300 seconds and judges to 240. Override them with
`--builder-timeout-ms`, `--target-timeout-ms`, and `--judge-timeout-ms` (or
`--turn-timeout-ms` in the interview runner). A timeout writes
`execution-block.json`, preserves partial stdout/stderr, exits 3, and remains
`BLOCKED / NOT_RUN`; it is never converted into a quality rejection.

## Commands

From the skill root:

```bash
node scripts/validate-quality-evals.mjs
node scripts/run-quality-eval.mjs list
node scripts/run-quality-eval.mjs run \
  --task structured-invoice-v1 \
  --prompt-model gpt-5.6-sol \
  --target-model gpt-5.6-sol \
  --reasoning-effort max
```

By default the runners resolve the enabled `cascade-prompt` plugin through
`codex plugin list --json`. Use `--subject-skill-root /absolute/path` only for
an intentional source-checkout test.

The runner caches builder responses automatically under the output root. To
override that cache with an existing Cascade Prompt response:

```bash
node scripts/run-quality-eval.mjs run \
  --task structured-invoice-v1 \
  --prompt-model gpt-5.6-sol \
  --target-model gpt-5.6-sol \
  --reasoning-effort max \
  --prompt-response-file /absolute/path/to/response.md
```

Add `--execute-judges --judge-model <model-id>` to run required independent
judgment. Use `--no-prompt-cache` or `--no-trajectory-cache` only for a
deliberate fresh measurement. Without judge execution, judge state is
`NOT_RUN`. Use `--output-dir` to select an evidence root; the default is
`.artifacts/prompt-quality` under the current working directory.

`run-summary.json` records usage, cached and non-cached input, duration, trace
command count, cache state, and provisional budget status for every phase.
Budget status is diagnostic and does not override quality acceptance.

For repeated measurements, run at least three fresh target executions while
reusing only the digest-bound builder and trajectory caches:

```bash
node scripts/run-variance-eval.mjs \
  --task structured-invoice-v1 \
  --prompt-model gpt-5.6-sol \
  --target-model gpt-5.6-sol \
  --reasoning-effort max \
  --execute-judges --judge-model gpt-5.6-sol \
  --repetitions 3
```

The aggregate reports acceptance counts, rate, score range and standard
deviation, judge disagreement, and flakiness. Every underlying run receipt is
retained; blocked or rejected repetitions are not hidden by an average.

## External execution adapter

Tier selection and prompt composition are provider-neutral. Execution can use
either `codex-cli` or `command-json-v1`. The command adapter receives one JSON
object on stdin:

```json
{"protocol":"cascade-evals-command-v1","model":"model-id","prompt":"..."}
```

It must return `{"text":"...","usage":{...}}`. Copy
`evals/adapters.example.json`, use an absolute executable path plus an argument
array, then pass `--adapter-config`, `--prompt-adapter command-json-v1`,
`--prompt-adapter-id <id>`, and equivalent target or judge options. The runner
does not use a shell and does not persist credentials; supply secrets to the
adapter through its environment. Adapter availability is an execution fact,
not part of tier policy.

## Status vocabulary

- `AUTHORED`: contract or fixture exists.
- `VALIDATED`: deterministic structure and references passed.
- `EXECUTED`: a named model completed the phase.
- `MECHANICALLY_ELIGIBLE`: all hard deterministic gates passed.
- `JUDGED`: both blind judge profiles returned valid ratings.
- `CALIBRATED`: reserved for judge versions tested against human labels.
- `ACCEPTED`: all declared gates passed for the exact run identity.
- `NOT_RUN`: phase was intentionally not executed; never treat it as failure or
  success.

## Adaptive interview lane

One-shot prompt quality and interview quality use separate runners. The
interview catalog covers complete requests, material gaps, source conflicts,
safe defaults, refusal, answer merge, invalidation, and post-draft omission
repair. Normal plugin runtime uses semantic paths; fixture JSON is evaluation
state only.

```bash
node scripts/run-interview-eval.mjs list
node scripts/run-interview-eval.mjs run \
  --fixture support-mixed-case-v1 \
  --model gpt-5.6-sol \
  --reasoning-effort max \
  --installed-plugin
```

The runner executes the first turn, replays the ordered transcript plus the
fixture answer when present, and checks state, question count, expected and
forbidden intents, final-prompt presence, and required
coverage patterns. Exact repeated questions are retained as diagnostics; the
independent answer-merge judge determines whether they were already resolved.
Equivalent descriptive markers may use explicit alternative groups; exact data
fields and placeholders remain literal. Add `--execute-judge --judge-model <model-id>` for the
independent interview profile. For a fixture with a target contract, add
`--execute-target --target-model <model-id>` to run the generated prompt.
Use `--installed-plugin` after reinstall to resolve the installed package as
the staged subject. This does not test normal app-side skill discovery.

Intent patterns are mechanical eligibility aids, not a substitute for semantic
judgment. Report first-turn and answer-turn token observations separately.

The included calibration cases are synthetic contract fixtures. Human-labeled
calibration remains `NOT_RUN` until actual reviewer labels are collected.
Create an empty annotation packet with:

```bash
node scripts/run-human-calibration.mjs prepare --output /path/human-labels.json
```

Calibration requires at least two independent reviewers plus an adjudicated
label for every frozen artifact. `evaluate` reports verdict agreement, false
passes, false failures, and mean absolute dimension error. It deliberately
returns `MEASURED_NOT_PROMOTED`; changing thresholds or profiles requires a new
versioned profile and an evidence-backed decision.

## Rule coverage and blinded judges (v3)

The interview catalog adds 24 conditional-loading and rule-boundary cases to
12 existing interaction cases (36 total). `rule-coverage.json` binds all 50 case
IDs to rule groups. Cases include seven exact model adapters, unknown checkpoints,
three context templates, long-context joins and budgets, multimodal limitations,
realtime staleness, comparison uncertainty, explicit stateful contracts, and
negative loading. Reference rules are evaluated through their active runtime
consumers; loading every reference in every prompt is a failure of proportionality.

The host serves a frozen subject snapshot through `read_paths` requests. Every
model invocation is ephemeral with tools, plugins, host skills, web and project
instructions disabled; unexpected tool/error events invalidate the response.
This isolates gold files and peer outputs while recording actual conditional
file requests. It tests staged subject consumption, not installed UI discovery.
Only `LIVE_CODEX_TOOL_FREE` receipts support this isolation claim. External
command adapters and supplied response files remain explicitly unverified and
cannot receive ACCEPTED or REJECTED; both become UNVERIFIED, while semantic
scores remain separate fixture observations.

Judges see applicable frozen rules, user inputs and responses. They do not see
expected states, gold answers, task-specific gold anchors, mechanical verdicts, thresholds,
weights, floors or peer scores. V3 responses rate anchored dimensions from 0–4;
the host applies threshold 0.8 and a floor of 3 for every dimension. BLOCKED
requires an empty ratings array and named missing evidence; it has no score.
Every rating includes JSON-pointer evidence references with verbatim excerpts; nonexistent pointers or invented quotes are INVALID. Malformed responses are INVALID. Neither becomes a semantic rejection or pass.
V1/V2 profiles remain solely for historical diagnostic and calibration artifacts.

Run directories are exclusive and disjoint from the subject. Each run freezes
case, subject path/byte manifest, runner bundle and adapter configuration identity
before invocation; each phase additionally binds the Simulation dependency and
actual adapter. Cache keys include these identities; cached raw judgments are
reparsed with the current profile and retain their source run ID. Disable caches
for independent repetitions. Variance completion requires every requested run,
and acceptance rate uses all requested repetitions as its denominator.

A named-model authoring fixture does not execute that target model. Qwen, Gemma
and Mistral execution requires separately bound real endpoints. Human calibration
is `NOT_RUN` until actual human labels exist. Synthetic judge challenges, static
coverage and one observed passing execution do not establish exhaustive correctness
or a global model ranking. Token budgets remain diagnostic.

The closed coverage inventory binds all 26 references/runtime files plus the
entrypoint and three templates, 59 rule groups
and all 18 source routing cases. It validates case/rule equality, all task and
both-turn paths, source hashes and active consumers. `run-knowledge-audit.mjs`
adds a separate static semantic audit for each of the ten model-system references;
its results do not substitute for behavioral execution. Use `--reference` with an
exact path from `rule-coverage.json` and `--output-dir` for immutable evidence.

Execution receipts bind the resolved executable hash/version, OS, Node version,
CLI isolation policy and Simulation source. Remote model revision is explicitly
unavailable: results are scoped to the named model alias and observed execution
date. Nondefault live quality configurations require a matching
`--configuration-id` in `model-matrix.json`; the Sol-to-Astra coverage configuration
is `sol-to-astra-coverage-v1`. Repetition reduction verifies run IDs, exit statuses,
evidence grade and identical task/configuration/input/runner/profile/surface
digests. Stable disagreement between two judge roles is not stochastic flakiness.

`run-judge-challenges.mjs` exercises a correct response, material contract failures,
an embedded request for a favorable score, and absent evidence. These labels are
synthetic author expectations, not human calibration. The v3 parser also has
mechanical regressions for fabricated quotes, missing references and missing data.


For an interrupted judge phase, `--reuse-run-root /absolute/original/run` on the
quality or interview runner verifies the original Codex transcript and Simulation
journal before reusing completed subject/target responses. It requires the exact
case version and subject digest, checks target prompt identity, and emits separate
reuse receipts. New judges run under the new runner/profile/timeout identity;
`--judge-timeout-ms` sets a positive bounded timeout (also supported by knowledge
audits). Explicit response-file imports cannot be combined with verified reuse.
Reuse is not a fresh stochastic repetition, cannot be recursively replayed, and
has no new builder/target latency or usage measurement. Keep the original run root.
Corrected fixtures require fresh authoring; never reuse their older responses.
