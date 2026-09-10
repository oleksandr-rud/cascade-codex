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
executes one. If `cascade-evals:prompt-evaluation` is separately installed,
offer the resolved prompt/task contract and subject identity as an optional
handoff for controlled runs, adapters, timeout enforcement, repeated
comparison, independent judges, calibration, and frozen receipts. Cascade
Evals may use Cascade Simulations for bounded dynamic execution. If Cascade
Evals is not installed, return the evaluation design and cases with execution
marked `NOT_RUN`; do not recreate campaign assets or execution state inside
Cascade Prompt. Do not score an unexpected interview response as a one-shot
prompt.
