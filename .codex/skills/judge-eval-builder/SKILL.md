---
name: judge-eval-builder
description: Use when creating or revising Cascade-specific semantic dimensions, anchored rubrics, labeled calibration cases, or adversarial judge tests and binding them to the installed Cascade Evals judge contract. Keep generic judge schemas, response validation, calibration receipts, and aggregation with Cascade Evals.
---

# Judge Eval Builder

Build Cascade's subject-specific measurement pack. This skill owns the
repository's decision, represented population, semantic dimensions, anchored
rubric content, and labeled/adversarial cases. The installed
`cascade-evals:build-judge` skill owns the generic judge profile and response
contracts, validation, calibration receipt, and aggregation rules. This skill
does not run target scenarios, judge completed traces, repair a failing skill,
or claim calibration without human-labeled evidence.

## Source Order

1. Evaluation objective, risk, decision, and requested effectiveness claims.
2. Existing `harness-evals/judge-profiles.json`, rubrics, response schema, and
   calibration evidence when present.
3. Representative target prompts, traces, outputs, failure reports, and
   protected mechanical contracts.
4. Owning skills, agents, `AGENTS.md`, `CODEX.md`, and model policy.
5. Installed `cascade-evals:build-judge`, resolved by exact namespaced skill
   identity without cache fallback.
6. `references/judged-eval-contract.md` and `checklists/judge-quality.md`.
7. Runner integration and validator code.

## Workflow

1. Write the decision the evaluation will support and the population it is
   intended to represent.
2. Keep mechanical eligibility separate from semantic effectiveness. Schema,
   permissions, trace integrity, required loads, and exact routes are binary
   gates, not quality points.
3. Split judges when one view could hide another. Cascade requires independent
   outcome and trajectory judges for accepted harness coverage.
4. Resolve `cascade-evals:build-judge`. Return `BLOCKED` when that required
   plugin or skill is absent, disabled, malformed, or unreadable; do not copy
   its contracts locally.
5. Define a narrow subject pack with one versioned rubric. Give every dimension a
   unique ID, observable description, integer 0–4 scale, weight, and shared
   anchor meanings.
6. Specify thresholds and minimum-dimension floors before observing candidate
   results. The harness, not the model, computes the weighted score.
7. Bind the subject pack to Cascade Evals' generic profile and response schema;
   do not create a competing generic schema or reducer.
8. Design blind prompts. A judge must not see eligibility verdicts, legacy
   scores, another judge's response, or acceptance outcome.
9. Create positive, borderline, negative, contradictory, missing-evidence,
   and prompt-injection calibration cases. Keep human labels and model results
   separate.
10. Measure validity by agreement, false-pass rate, false-fail rate,
   discrimination, stability across repeated judgments, and cost/latency—not
   by agreement with an old grader.
11. Version any material rubric, profile, threshold, prompt, or schema change.
   Never silently reinterpret old evidence under a new contract.
12. Run the structural validator and judged-eval self-tests, then route live
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
- Cascade Evals dependency identity plus the bound generic response and
  aggregation contract;
- blind evidence packet and leakage exclusions;
- calibration and adversarial case matrix;
- measured agreement/error/stability/cost metrics or explicit `NOT_RUN`;
- migration, versioning, validation, and next route.

Use `templates/judge-design-brief.md` before changing a judge contract and
`checklists/judge-quality.md` before calling it ready.
