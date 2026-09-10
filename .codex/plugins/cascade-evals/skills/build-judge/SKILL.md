---
name: build-judge
description: Create, revise, version, validate, or calibrate semantic judge profiles, anchored rubrics, response schemas, labeled cases, and aggregation rules for prompt, agent, simulation, or harness evaluations. Use when semantic quality cannot be decided mechanically; do not use to execute targets or judge a live subject in the same context.
---

# Build Judge

Semantic judgments must interpret the evidence and emit the declared structured
ratings/claims. Do not replace judgment with regexes, keywords, phrase lists or
lexical overlap. Code may validate and aggregate structured fields or check an
explicit literal-format requirement; it must not extract a semantic verdict
from unconstrained prose, including as a fallback after invalid output.

Build the measurement contract; do not execute the target or treat synthetic
agreement as human calibration.

## Source order

1. Evaluation decision, represented population, risk, and claim boundary.
2. Existing profiles, rubrics, response schemas, calibration evidence, and
   aggregation code.
3. Representative outputs, traces, failure reports, and protected mechanical
   contracts.
4. Subject adapter and model policy from `../evaluate/`.

## Workflow

1. Separate binary mechanical eligibility from semantic effectiveness.
2. Split outcome, trajectory, safety, or other views when one score could hide
   another material failure.
3. Give every dimension a unique semantic ID, observable definition, integer
   0-4 scale, weight, and anchored meanings. Fix thresholds and dimension
   floors before candidate results are observed.
4. Design blind prompts and explicit leakage exclusions. The target cannot
   judge itself in the same context and no judge may see another response.
5. Require evidence-bearing ratings; the reducer computes totals and validates
   verdict-score agreement.
6. Create positive, borderline, negative, contradictory, missing-evidence,
   and prompt-injection cases.
7. Measure human/model agreement, false-pass, false-fail, discrimination,
   repeated stability, latency, and cost. Keep missing human evidence
   `NOT_RUN`.
8. Version any material profile, rubric, threshold, prompt, or schema change.

Validate a profile and optional response with:

```bash
python3 ../../scripts/validate_judge.py PROFILE.json [RESPONSE.json]
```

## Output

Keep the user-facing answer concise. Output requirements specify information,
not extra headings. Preserve required schemas, evidence and permissions. Avoid
duplicate artifact prose, empty sections, unsolicited variants and extra files
unless needed for the requested delivery or an actual handoff.

Return the decision and population; versioned profile/rubric; dimensions,
weights, threshold, and floor; blind evidence contract; response schema;
calibration/adversarial matrix; measured metrics or `NOT_RUN`; versioning and
migration impact; and the exact next evaluation route.

Use `references/judge-profile.schema.json` and
`references/judge-response.schema.json` as integration contracts.
