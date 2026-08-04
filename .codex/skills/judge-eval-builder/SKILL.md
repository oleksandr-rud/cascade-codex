---
name: judge-eval-builder
description: Use when creating, revising, versioning, or calibrating semantic judge profiles, anchored rubrics, judge response schemas, labeled calibration cases, aggregation rules, or adversarial judge tests for agent and harness evaluations.
---

# Judge Eval Builder

Build the measurement contract used by judged evaluations. This skill owns
judge definitions; it does not run target scenarios, judge completed traces,
repair a failing skill, or claim calibration without human-labeled evidence.

## Source Order

1. Evaluation objective, risk, decision, and requested effectiveness claims.
2. Existing `harness-evals/judge-profiles.json`, rubrics, response schema, and
   calibration evidence when present.
3. Representative target prompts, traces, outputs, failure reports, and
   protected mechanical contracts.
4. Owning skills, agents, `AGENTS.md`, `CODEX.md`, and model policy.
5. `references/judged-eval-contract.md` and `checklists/judge-quality.md`.
6. Runner aggregation and validator code.

## Workflow

1. Write the decision the evaluation will support and the population it is
   intended to represent.
2. Keep mechanical eligibility separate from semantic effectiveness. Schema,
   permissions, trace integrity, required loads, and exact routes are binary
   gates, not quality points.
3. Split judges when one view could hide another. Cascade requires independent
   outcome and trajectory judges for accepted harness coverage.
4. Define a narrow profile with one versioned rubric. Give every dimension a
   unique ID, observable description, integer 0–4 scale, weight, and shared
   anchor meanings.
5. Specify thresholds and minimum-dimension floors before observing candidate
   results. The harness, not the model, computes the weighted score.
6. Design blind prompts. A judge must not see eligibility verdicts, legacy
   scores, another judge's response, or acceptance outcome.
7. Create positive, borderline, negative, contradictory, missing-evidence,
   and prompt-injection calibration cases. Keep human labels and model results
   separate.
8. Measure validity by agreement, false-pass rate, false-fail rate,
   discrimination, stability across repeated judgments, and cost/latency—not
   by agreement with an old grader.
9. Version any material rubric, profile, threshold, prompt, or schema change.
   Never silently reinterpret old evidence under a new contract.
10. Run the structural validator and judged-eval self-tests, then route live
    execution to `harness-evaluation`.

## Guardrails

- Do not let a target model judge its own trace in the same context.
- Do not accept a model-supplied total score; recompute from dimension ratings.
- Do not tune thresholds on the evaluation test set.
- Do not manufacture human labels, inter-rater agreement, or live results.
- Do not collapse `BLOCKED`, `INVALID_SCENARIO`, and semantic `FAIL`.
- Do not modify judge contracts while evaluating a run that depends on them.
- Preserve prior contracts and evidence; source digests make them stale rather
  than retroactively valid under a new version.

## Output

- evaluation decision and represented population;
- versioned judge profile and rubric;
- anchored dimensions, weights, threshold, and minimum floor;
- response schema and harness-owned aggregation rule;
- blind evidence packet and leakage exclusions;
- calibration and adversarial case matrix;
- measured agreement/error/stability/cost metrics or explicit `NOT_RUN`;
- migration, versioning, validation, and next route.

Use `templates/judge-design-brief.md` before changing a judge contract and
`checklists/judge-quality.md` before calling it ready.
