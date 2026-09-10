---
name: prompt-evaluation
description: Run controlled prompt and adaptive-interview evaluations through bounded model execution. Use when prompt quality, model-tier fit, repeated variance, interview behavior, independent judgment, or human calibration must be measured against versioned tasks and frozen evidence rather than merely authored or discussed.
---

# Prompt Evaluation

Own prompt evaluation as a sequence of bounded model invocations. Cascade
Prompt is the subject under test; this skill owns task packs, execution
orchestration, repetitions, grading, calibration packets, and immutable
evaluation receipts. Each bounded model invocation preserves its execution
identity and raw evidence directly.

## Ownership

- Resolve the installed `cascade-prompt:prompt` skill as the authoring subject.
- Keep prompt-building policy, interview semantics, model-tier selection, and
  composition instructions in Cascade Prompt.
- Keep task fixtures, evaluators, judge profiles, execution adapters, timeout
  policy, variance aggregation, and calibration mechanics here.
- Builder, target, judge, and fixed interview turns use the local execution
  adapter directly. They do not require Cascade Simulations. Default installed
  subject discovery uses the packaged Python 3 resolver before Node model execution.
- Use `cascade-simulations:simulate` for a dynamic actor choosing actions against
  a changing environment. That separate contour retains its simulation contract,
  authority, journal, recovery, cleanup and controller verification.
- Never copy prompt runtime instructions into this plugin or bypass the subject
  skill with an evaluator-authored replacement prompt.

## Workflow

For a design-only request, use `cascade-evals:evaluate`'s design-only contract:
return cases, mechanical gates, judge needs, missing evidence, and phase states.
Preserve any supplied frozen prompt. Do not dispatch the execution workflow or
load integration schemas merely to describe a plan. Read the detailed execution
references only when the requested design needs their exact contract.

1. Resolve the subject plugin and exact skill root. Use
   `--subject-skill-root` only for an intentional source checkout; otherwise
   resolve the enabled installed plugin through `codex plugin list --json`.
2. Validate the versioned catalog, task, evaluator, model matrix, budgets,
   interview fixtures, and judge profiles.
3. Use `scripts/run-prompt-campaign.mjs` for multi-case execution. Its declared
   run paths, partial checkpoints and shared three-call limit apply across
   overlapping campaigns; never launch independent six-worker batches.
   Bind the prompt, model, adapter configuration and runtime digest in one
   execution receipt per phase. Preserve stdout and stderr beside it. Existing
   phase receipts, including interrupted dispatches, cannot be replayed.
4. Execute the prompt builder, target model, and requested independent judges
   through the declared bounded execution adapter. A timeout or cancellation is
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
  --prompt-model gpt-6-astra \
  --target-model gpt-6-astra \
  --reasoning-effort high
node scripts/run-interview-eval.mjs list
node scripts/run-variance-eval.mjs --task structured-invoice-v1 \
  --prompt-model gpt-6-astra --target-model gpt-6-astra \
  --reasoning-effort high --repetitions 3
```

Use `run-prompt-campaign.mjs --inspect /absolute/campaign-or-run` to recover
partial evidence without executing models. Unexpected process failure or an
abandoned invocation halts new dispatch. After inspecting that evidence and
restoring the environment, explicitly use `--recover-execution`; it refuses
recovery while any invocation owner is active and never replays a call.

For references/runtime coverage use `evals/rule-coverage.json` and all declared
quality/interview cases. Required and forbidden reads are mechanical checks;
applicable frozen rules go to blinded judges. Keep named-model authorship distinct
from execution on that model. Run `scripts/run-judge-challenges.mjs` for synthetic
judge discrimination checks; these are not human calibration.

Before executable runs, evidence reduction, adapter integration, judge-profile
authoring, or calibration work, read `evals/README.md` for the complete contract.

## Boundaries

- One model call completing proves execution only. Quality requires the
  declared deterministic or independent semantic checks.
- Mechanical eligibility, semantic judgment, calibration, and acceptance are
  separate states.
- A selected task result supports only its bound task/corpus, subject runtime,
  model, adapter, runner, rubric, and evidence digests.
- External adapter credentials stay in the adapter environment and never enter
  campaign artifacts.
- `gpt-6-astra` with `high` reasoning is the default prompt-builder, target,
  and judge configuration.
  Other supported models require an explicit comparison configuration.
- For a model/effort comparison, keep the judge fixed with
  `--judge-model` and `--judge-reasoning-effort`; author/target changes must
  not silently alter judgment or reuse an incompatible judgment cache.
- This compact plugin campaign does not claim Cascade repository release
  eligibility or replace its product-evals campaign governance.

Keep the user-facing answer concise. Output requirements specify information,
not extra headings. Preserve required schemas, evidence and permissions. Avoid
duplicate artifact prose, empty sections, unsolicited variants and extra files
unless needed for the requested delivery or an actual handoff.
