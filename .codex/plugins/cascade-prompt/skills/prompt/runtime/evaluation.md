# Evaluation Design

Load this pack only for audit, comparison, tests, or effectiveness claims.

Evaluate routing and the composed prompt separately. The comparison unit is:

`model + reasoning mode + tools + context plan + output controls`

Use deterministic checks for schemas, exact fields, counts, allowed values,
permissions, and mutation boundaries. Use blind semantic judgment only for
quality that deterministic checks cannot decide. A self-check is not
independent evidence.

For reusable prompts cover happy path, boundary, missing input, conflicting
evidence/instructions, adversarial source content, output-format pressure, and
tool/retrieval failure when applicable. Hold model, tools, input, sampling, and
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
Unavailable models and unrun phases remain `NOT_RUN`. Human calibration is
distinct from synthetic judge-contract fixtures.

This pack defines how Cascade Prompt should design an evaluation, not how it
executes one. If `cascade-simulations:prompt-evaluation` is separately
installed, offer the resolved prompt/task contract and subject identity as an
optional handoff for controlled runs, adapters, timeout enforcement, repeated
comparison, independent judges, calibration, and frozen receipts. If it is not
installed, return the evaluation design and cases with execution marked
`NOT_RUN`; do not recreate campaign assets or execution state inside Cascade
Prompt. Do not score an unexpected interview response as a one-shot prompt.
