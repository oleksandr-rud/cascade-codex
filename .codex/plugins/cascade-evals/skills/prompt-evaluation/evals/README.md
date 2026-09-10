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
   model, evaluator, execution, and judge contracts.
2. Ask Cascade Prompt to build a task prompt for the named target model and
   neutral tier, or automatically reuse a digest-bound cached response.
3. Replace the task's single input placeholder and execute the target model.
   Every builder, target, and judge invocation receives a direct execution
   receipt binding the request, model, adapter, runtime, raw stdout/stderr,
   and output. Existing or interrupted phase receipts cannot be overwritten.
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
arguments. Execution receipts store prompt and output digests, while the
campaign evidence directory retains the full phase artifacts. Automatic
builder and trajectory caches are content-addressed and exclude target inputs,
evaluator material, gold answers, target outputs, and outcome judgments.

Execution has tier-aware time limits: 180 seconds for efficient, 300 for
balanced, 420 for frontier-generalist, and 600 for frontier-autonomous target
runs; builders and ordinary judges default to 600 seconds, source judges to 720. Override them with
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
  --reasoning-effort max
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
The enabled installed package is the default staged subject. This does not
test normal app-side skill discovery; `--installed-plugin` is obsolete and
rejected before dispatch.

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
weights, floors or peer scores. V4 responses rate anchored dimensions from 0–4;
the host applies threshold 0.8 and a floor of 3 for every dimension. BLOCKED
requires an empty ratings array and named missing evidence; it has no score.
Every v4 rating cites a JSON pointer to a leaf field and an inclusive numbered line range. The host validates the range and hashes the exact source span. Unknown pointers, blank-only, reversed, out-of-range or over-12-line references are INVALID. Judges do not retype excerpts. Malformed responses are INVALID; neither state becomes a semantic rejection or pass.
V1/V2/V3 profiles remain solely for historical diagnostic and calibration artifacts.

Run directories are exclusive and disjoint from the subject. Each run freezes
case, subject path/byte manifest, runner bundle and adapter configuration identity
before invocation; each phase additionally binds the execution runtime and
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
CLI isolation policy and execution runtime. Remote model revision is explicitly
unavailable: results are scoped to the named model alias and observed execution
date. Nondefault live quality configurations require a matching
`--configuration-id` in `model-matrix.json`; the Sol-to-Astra coverage configuration
is `sol-to-astra-coverage-v1`. Repetition reduction verifies run IDs, exit statuses,
evidence grade and identical task/configuration/input/runner/profile/surface
digests. Stable disagreement between two judge roles is not stochastic flakiness.

`run-judge-challenges.mjs` exercises a correct response, material contract failures,
an embedded request for a favorable score, and absent evidence. These labels are
synthetic author expectations, not human calibration. The historical v3 parser retains
mechanical regressions for fabricated quotes, missing references and missing data.


For an interrupted judge phase, `--reuse-run-root /absolute/original/run` on the
quality or interview runner verifies the original Codex transcript and direct
execution receipt before reusing completed subject/target responses. Historical
controller records use a lazy read-only verifier; only that legacy replay path
requires Cascade Simulations and Python. It requires the exact
case version and subject digest, checks target prompt identity, and emits separate
reuse receipts. New judges run under the new runner/profile/timeout identity;
`--judge-timeout-ms` sets a positive bounded timeout (also supported by knowledge
audits). Explicit response-file imports cannot be combined with verified reuse.
Reuse is not a fresh stochastic repetition, cannot be recursively replayed, and
has no new builder/target latency or usage measurement. Keep the original run root.
Corrected fixtures require fresh authoring; never reuse their older responses.

Fresh model phases do not select a simulation workflow. They use cancellable,
bounded asynchronous execution. Variance accepts `--repetition-timeout-ms` and
preserves partial child output; cancellation keeps the requested denominator.
The shared `scripts/judge-ratings.mjs` scorer serves both historical adapters
and v4 evidence-bound judges; evidence validation remains profile-specific.


## Reliable batch execution and partial evidence

Use the packaged launcher instead of independent ad-hoc worker pools:

```bash
node scripts/run-prompt-campaign.mjs --cases complete-quick-v1,knowledge-clarification-policy --output-dir /absolute/evidence
node scripts/run-prompt-campaign.mjs --inspect /absolute/evidence/campaign-id
node scripts/run-prompt-campaign.mjs --recover-execution
```

Omitting `--cases` selects all 50 behavioral cases, ten knowledge audits and the
synthetic challenge job. The launcher declares every case ID and output path
before dispatch, reads results from those paths even if stdout JSON is absent,
and distinguishes jobs_finished from evaluations_completed. Undispatched,
interrupted, invalid and blocked cases stay in the requested denominator. An
inspect operation reconstructs progress without overwriting or rerunning evidence.

All fresh model calls share three per-user slots across launcher processes and
plugin versions at `~/.codex/prompt-evaluation-execution`. This is a conservative
initial limit, not a measured throughput optimum. Queue waiting has a separate
30-minute bound and does not consume the model or staged-authoring deadline.
Receipts record queue time. Existing phase receipts cannot be overwritten.
`run-progress.json` and phase receipts retain QUEUED, DISPATCHED and terminal
states; stdout/stderr stream to disk before completion. A killed process may
leave a DISPATCHED receipt, which inspection exposes without claiming completion.

An unexpected process failure or dead invocation owner creates a persistent halt
record shared by all new campaigns. Timeouts and semantic/format failures retain
their own classifications. Explicit recovery requires an existing halt record
and refuses active or unreadable ownership; it never automatically retries an
uncertain invocation. `CASCADE_PROMPT_EVAL_COORDINATION_ROOT` is available only
for isolated tests or an intentionally separate execution environment; do not
assign a new pool per campaign to bypass the shared limit.

The 600/720-second authoring/judge limits add headroom to observed 235/301-second
successful phases. They remain provisional; measure a bounded pilot before a
large campaign. Target tier budgets and Sol/max model policy remain unchanged.
`--case-timeout-ms` bounds a launcher child (default one hour), including queueing.

V4 numbers source lines once in the evidence view; null evidence remains null.
A citation's original bytes are resolved by the host. V3 exact-quote validation
is unchanged, and historical INVALID results are never promoted. Challenge v2
adds positive/negative controls for quoted injection refusal and equivalent JSON
instructions. Synthetic labels do not establish human calibration.

The onboarding oracle now delegates claim endorsement to the independent outcome
judge rather than banning words appearing in a refusal. Release-note fixtures
exercise actual JSON keys and array types, with wrong-structure negative controls.
The support fixture explicitly distinguishes a multi-user regression from an
isolated permission denial. These are new fixture versions, not regrades of old
responses. Prompt runtime behavior is unchanged by these evaluation repairs.

The Codex Code Mode host remains available because code-mode-only model transports require it even for text-only turns. Action tools remain disabled in isolated runs; every tool or error event still invalidates a tool-free response. Campaign child exit codes 2 (rejected) and 3 (incomplete) are expected outcomes; unexpected exits halt shared dispatch.

Isolated Codex execution requires the `skip_host_skill_discovery` feature.
The adapter checks `codex features list` before model dispatch and records an
unsupported CLI as a non-dispatched failure. Update Codex before starting a new
attempt; never drop the isolation flag to make an older CLI run. Native discovery
receipts instead identify the retained host configuration and read-only tools.

Version 4 requests enumerate allowed leaf pointers relative to the evidence object. The outer request envelope is excluded; a pointer such as `/evidence/reference/content` remains invalid when the permitted path is `/reference/content`. Recovery reports a truncated final summary without discarding surviving phase evidence.

Interview runs honor `--run-id` exactly, matching the campaign's predeclared result directory. Duplicate IDs preserve prior results and fail before dispatch; traversal-shaped IDs are rejected. Historical runs whose interview runner ignored that option require explicit identity-checked reconciliation of their actual directories; do not rewrite the original campaign contract.

Default subject resolution reads the exact enabled, installed plugin cache version. The inventory's mutable checkout path cannot substitute newer source bytes or make an intact installed version appear missing. Source checkout evaluation remains an explicit `--subject-skill-root` choice; an absent installed version never falls back to a checkout or another cache version.

Installed subject bytes and native discovery are separate claims. The interview runner always uses an isolated staged-read subject. The obsolete `--installed-plugin` flag is rejected before dispatch because it never activated native discovery. Verify native triggers and filesystem searches in separate fresh Codex sessions with installed skills, preserving the actual read/search trace; staged-read results do not prove native discovery.
