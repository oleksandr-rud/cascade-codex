---
name: hypothesis-scoring
description: Use during market or product discovery to score hypotheses by pain, urgency, budget, feasibility, competition, risk, evidence quality, and validation route.
---

# Hypothesis Scoring

Use when market-validation findings need a ranked shortlist of hypotheses,
clusters, features, segments, or experiments.

This skill makes tradeoffs explicit. It does not turn scores into requirements
without evidence and routing through `synthesis-to-spec`.

## Source Order

1. Latest market-validation frame and lane outputs.
2. `pain-mining`, `competitive-map`, `market-economics`, and
   `validation-experiments` reports.
3. Existing product/spec/backlog docs and active work lanes.
4. `docs/patterns/workflow.md` for the Doc Routing Decision Matrix.

## Scoring Dimensions

Use a 1 to 5 scale unless the lane defines another rubric:

- pain severity;
- urgency;
- budget or willingness-to-pay;
- feasibility;
- competition intensity;
- product fit;
- evidence quality;
- validation cost;
- strategic risk.

## Checklist

1. Define the hypothesis set and exclude duplicates.
2. Record source evidence for every score.
3. Penalize low evidence quality even when the story is attractive.
4. Mark disagreement between lanes.
5. Identify the smallest validation experiment for each high-potential
   hypothesis.
6. Classify each hypothesis as `keep`, `kill`, `research`, or `defer`.
7. Route kept hypotheses to `validation-experiments` or `synthesis-to-spec`.
8. Route weak evidence to `pain-mining`, `competitive-map`,
   `market-economics`, or `adversarial-critic`.
9. Record Doc Routing Decision Matrix rows when durable ranking decisions or
   backlog candidates are produced.

## Templates

- `templates/hypothesis-scorecard.md`

## Output

- ranked hypotheses;
- score basis and confidence;
- lane disagreements;
- keep, kill, research, or defer status;
- validation and spec synthesis route;
- Doc Routing Decision Matrix rows.
