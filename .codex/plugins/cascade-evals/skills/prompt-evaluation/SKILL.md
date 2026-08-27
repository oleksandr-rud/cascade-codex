---
name: prompt-evaluation
description: Run controlled prompt and adaptive-interview evaluation campaigns through Cascade Evals and bounded Cascade Simulations execution. Use when prompt quality, model-tier fit, repeated variance, interview behavior, independent judgment, or human calibration must be measured against versioned tasks and frozen evidence rather than merely authored or discussed.
---

# Prompt Evaluation

Own prompt evaluation as an `agent-response` simulation campaign. Cascade
Prompt is the subject under test; this skill owns task packs, execution
orchestration, repetitions, grading, calibration packets, and immutable
evaluation receipts. Cascade Simulations supplies bounded phase execution and
frozen-run integrity.

## Ownership

- Resolve the installed `cascade-prompt:prompt` skill as the authoring subject.
- Keep prompt-building policy, interview semantics, model-tier selection, and
  composition instructions in Cascade Prompt.
- Keep task fixtures, evaluators, judge profiles, execution adapters, timeout
  policy, variance aggregation, and calibration mechanics here.
- Resolve the installed `cascade-simulations:simulate` skill for every bounded
  builder, target, and judge `agent-response` simulation. Bind the dependency
  receipt and fail closed when it is missing or invalid.
- Never copy prompt runtime instructions into this plugin or bypass the subject
  skill with an evaluator-authored replacement prompt.

## Workflow

1. Resolve the subject plugin and exact skill root. Use
   `--subject-skill-root` only for an intentional source checkout; otherwise
   resolve the enabled installed plugin through `codex plugin list --json`.
2. Validate the versioned catalog, task, evaluator, model matrix, budgets,
   interview fixtures, and judge profiles.
3. Freeze one simulation contract per model phase. Record only prompt/output
   digests in the controller journal; keep full phase evidence in the campaign
   run directory.
4. Execute the prompt builder, target model, and requested independent judges
   through the declared `agent-response` adapter. A timeout is
   `BLOCKED / NOT_RUN`, never a quality rejection.
5. Apply mechanical eligibility before semantic judgment. Do not expose the
   evaluator, gold answer, thresholds, or peer outputs to the target.
6. For repeated comparison, execute fresh target runs and retain every receipt;
   do not average away rejection, timeout, invalid evidence, or disagreement.
7. Keep human calibration `NOT_RUN` until at least two independent reviewers
   and one adjudicated label exist for each frozen artifact. Calibration does
   not silently promote or retune a judge profile.

## Commands

From this skill directory:

```bash
node scripts/validate-quality-evals.mjs
node scripts/run-quality-eval.mjs list
node scripts/run-quality-eval.mjs run \
  --task structured-invoice-v1 \
  --prompt-model gpt-5.6-sol \
  --target-model gpt-5.6-sol \
  --reasoning-effort max
node scripts/run-interview-eval.mjs list
node scripts/run-variance-eval.mjs --task structured-invoice-v1 \
  --prompt-model gpt-5.6-sol --target-model gpt-5.6-sol \
  --reasoning-effort max --repetitions 3
```

Read `evals/README.md` for the complete evidence, adapter, judge, timeout, and
calibration contract.

## Boundaries

- One model call completing is simulation execution evidence, not quality.
- Mechanical eligibility, semantic judgment, calibration, and acceptance are
  separate states.
- A selected task result supports only its bound task/corpus, subject runtime,
  model, adapter, runner, rubric, and evidence digests.
- External adapter credentials stay in the adapter environment and never enter
  campaign artifacts.
- `gpt-5.6-sol` with `max` reasoning is the default prompt-builder, target,
  and judge configuration.
  Other supported models require an explicit comparison configuration.
- This compact plugin campaign does not claim Cascade repository release
  eligibility or replace its product-evals campaign governance.
