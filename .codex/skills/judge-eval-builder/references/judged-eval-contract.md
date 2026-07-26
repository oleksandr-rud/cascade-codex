# Judged Evaluation Contract

An accepted Cascade harness case has three non-substitutable layers:

1. Mechanical eligibility is `PASS` with no hard failure.
2. The required outcome judge is schema-valid and accepted.
3. The required trajectory judge is schema-valid and accepted.

Each judge emits dimension ratings from 0 through 4 plus evidence and
rationale. The runner validates profile, rubric, version, and dimension
identity, then computes `sum(weight * rating / 4)`. Acceptance requires the
computed threshold, the minimum-dimension floor, a matching model verdict, and
no validation error.

For reporting, a case's conservative `effectiveness_score` is the minimum of
its required judge scores. This prevents a strong outcome score from masking a
weak trajectory, or the reverse. Coverage also reports each profile's score
distribution separately.

Judge prompts are independent. They exclude `eligibility.json`, run summaries,
legacy grades, other judge prompts, and other judge results. Current coverage
also requires the run's source-manifest digest to match the current harness.

Calibration evidence must identify the human label source, adjudication
process, sample selection, judge model and prompt version, false-pass and
false-fail counts, agreement metric, repeated-run stability, cost, and latency.
Absent calibration is `NOT_RUN`, never inferred from synthetic self-tests.
