# Evaluation Design

Load this pack only for audit, comparison, tests, or effectiveness claims.

Evaluate routing and the composed prompt separately. The comparison unit is:

`model + reasoning mode + tools + context plan + output controls`

Record request/contract and context-plan identity, source freshness, hard
capabilities, selected tier/configuration, and decision status: `MEASURED`,
`INFERRED`, or `USER_SELECTED`. Include excluded candidates with reasons,
fallback/escalation triggers, and the versioned evaluation result when available.
Keep ordinary routing notes compact; detailed records belong to an audit.

For open weights also freeze checkpoint/revision, quantization, serving engine,
chat-template version, parser, sampling, and effective context/output limits.
Compare Ukrainian and other actual workload languages, schema validity,
abstention, injection resistance, truncation, and tool failures where relevant.
Do not transfer a result across these configurations without new evidence.

Use deterministic checks for schemas, exact fields, counts, allowed values,
permissions, and mutation boundaries. Use blind semantic judgment only for
quality that deterministic checks cannot decide. A self-check is not
independent evidence.

Never use keyword presence, regexes or phrase lists to infer semantic quality,
grounding, intent, refusal or completion from prose. LLM/human semantic judgments
produce structured ratings/claims; code validates and reduces those fields.
Literal assertions are appropriate only when exact syntax is itself the accepted
requirement. Invalid judge output remains invalid or receives bounded repair;
do not reconstruct its verdict with text heuristics.

For reusable prompts cover happy path, boundary, missing input, conflicting
evidence/instructions, adversarial source content, output-format pressure, and
tool/retrieval failure when applicable. Reusable routing also covers explicit
model choices, high-risk cases, and cost/latency-sensitive workloads.
Hold model, tools, input, sampling, and
versions constant when comparing variants. Prefer the shorter prompt when
performance is materially equivalent.

Record task/corpus, prompt, model/configuration, runner, rubric, environment,
usage, latency, and evidence digests. Apply mechanical eligibility before
semantic judges. Do not execute judges after mechanical ineligibility.
Deterministically complete tasks need no semantic outcome judge; judge prompt
trajectory once per digest-bound generated prompt. Semantic tasks use
independent outcome and trajectory judgments. The harness recomputes scores.

Use labels precisely:

- `latest-stable`: dated provider catalog status.
- `provider-flagship`: provider-positioned leading configuration.
- `tier-candidate`: plausibly eligible for a neutral tier.
- `best-observed-for-workload`: winner on a named versioned evaluation set.
- `pinned-baseline`: deliberately retained comparison configuration.

Provider claims establish candidate eligibility, not measured effectiveness.
Repair the earliest failing layer: missing/stale evidence -> context; redundant
questions -> intake; dropped/invented requirements -> core contract; malformed
output -> schema/adapter; fragile decisions -> boundary rule/example; missing
capability -> alternate configuration. Stop or constrain permission violations.
Do not respond to every failure by adding prose or selecting a larger model.
After repair, rerun affected cases and preserve passing evidence whose bound
inputs did not change. A higher tier without material gain is a downgrade
candidate. Unavailable models and unrun phases remain `NOT_RUN`. Human calibration is
distinct from synthetic judge-contract fixtures.

This pack defines how Cascade Prompt should design an evaluation, not how it
executes one. When measured testing is requested, hand the frozen candidate
and cases to `cascade-quality:prompt-evaluation`. Its direct runner accepts
`--case-file CASE --prompt-file PROMPT --execute-judges`; omit `--prompt-file`
when the case asks Cascade Prompt to build the candidate before testing.
Evals owns controlled runs, adapters, timeouts, independent judges,
calibration, and frozen receipts. Run each versioned case separately and
retain its result. A supplied candidate receives outcome evaluation;
generator trajectory grading applies only when a builder ran. Cascade Evals
may use Cascade Simulations for bounded dynamic execution. If Evals is not
installed or cases cannot be made executable, mark execution `NOT_RUN`.
Do not recreate campaign assets or execution state inside Cascade Prompt, or
score an unexpected interview response as a one-shot prompt.

For Laya/Jev, Intern-Decision or Imajev typed questions, including image-capable
targets, freeze the `state` mapping, each question and criteria, selected
provider/model or Laya checkpoint, host admission rule, and case labels before
target execution. For Laya Vision also freeze image identities, preparation,
and any text supplied with them. Test the actual typed-decision API on a
held-out set for each primitive and the composed host behavior. Check response
shape mechanically; assess semantic decisions against independent labels, with
uncertain cases and error/abstention kept visible. Measure calibration and
decision thresholds on separate data before allowing automated effects.
Compare Laya and Jev only on the same task, state, questions, labels, and host
policy, while recording each model's configuration and limitations. Neither a
provider benchmark nor one high-confidence answer qualifies the new domain.
The standard `run-quality-eval.mjs` target path is for generative prompts; it
does not by itself execute a Laya/Jev or Laya Vision typed question map. When
Evals is installed, use its `prompt-evaluation/references/typed-decisions.md` handoff
and a declared typed-decision adapter or an existing scoped target runner.
Otherwise report execution `NOT_RUN`.

Also freeze entity/as-of scope, candidate order/aliases, question batching,
native compiler/layout, image roles/preparation, and host fallback/retry rules.
Intern requires checkpoint, processor/template, backend/dtype and calibration
identity; Imajev requires base/LoRA/readout/codebook, native unknown, rotations,
layout and modality-specific calibration. A generative Qwen adapter cannot
stand in for either decision scorer. The current bundled typed runner supports
Laya, Laya Vision and Jev only: Intern/Imajev need separately reviewed target
adapters; absent adapters are `BLOCKED`, not a reason to switch providers.

Test nearest boundaries, missing/conflicting/stale evidence, candidate
omission, irrelevant state/fields, entity joins, order permutations,
single-versus-batch, image role swaps, blur/crop and instructions in OCR/records.
Measure the intended host action, not merely a plausible label. Keep authored
development examples distinct from independently labeled test groups; split
related conversations, documents and image pairs together to avoid leakage.
Separate question/model selection, probability calibration and final tests.

Define the statistic before reporting calibration: maximum probability,
Jev concentration, ordinal-spread confidence, Imajev known-mass confidence
and Noul probability are different quantities. Do not compare their ECE values
as interchangeable correctness probabilities. Where the task supports it,
compare full candidate distributions with proper scores such as NLL/Brier;
for known stochastic references report distribution distance/excess Brier,
sample count and dependence. Preserve unknown mass for Imajev, and report
coverage/error among automatic actions separately from overall accuracy.
Public development benchmarks and paired pilot rows are diagnostic evidence.
Neither benchmark ranking nor a calibration preset qualifies a new domain.
