# Typed-decision instruction and target evaluation

Use when the candidate is a typed question set authored for Laya, Laya Vision,
hosted Jev, Intern-Decision or Imajev. Cascade Prompt
owns the question wording and state contract. This reference owns evaluation
design and evidence. The ordinary `run-quality-eval.mjs` target invokes a
generative model and has no declared typed-decision target adapter; it cannot
establish Laya/Jev performance. Use `scripts/run-typed-decision-entrypoint.py` for
text-only Laya/Jev or image-input Laya Vision packs. A design-only request ends
with cases and `NOT_RUN` execution status.

`run-typed-decision-eval-v2.py` currently supports only Laya, Laya Vision and Jev.
Intern/Imajev require separately reviewed adapters that preserve native
inference and uncertainty channels. Their design can proceed, but target
execution is `BLOCKED` when that adapter is unavailable. The runner's generic
probability validator does not qualify extended unknown or calibration output.
Do not use the generative runner or another provider as a silent substitute.

## Freeze the comparison unit

Record a version and digest for the complete question map, label descriptions,
state field mapping, state serialization/truncation, model endpoint and returned
revision, SDK/server version, and every host rule that consumes an answer. For
Laya also record the exact checkpoint, Router versus explicit selection,
`max_len`, `head_max_len`, calibration/temperature configuration, and device.
For Laya Vision record its separate fork and checkpoint, weight-license fit,
image IDs/digests, preparation and resize path, optional text, truncation
metadata or `strict=True`, and the calibration configuration. Do not treat its
reported GPU latency as the latency of the public CPU demo.
For Laya multilingual include independently labeled examples in each actual
workload language and fit any probability threshold on separate held-out data;
the published checkpoint ships without fitted calibration temperatures.
For Jev record the requested alias and the response's resolved model revision.
Keep credentials outside artifacts. Do not silently substitute an available
model when a selected target is unavailable.

For Intern, freeze its selected size, compiler, ordered field/option maps,
masked skeleton, decision token, processor/template, image order, effective
expanded-token limit, backend, dtype/kernels and calibration artifact.
The HF wrapper and published XTuner evaluation are different settings; a
default preset does not establish HF or task-domain calibration.
For Imajev, freeze base, LoRA, trained readout/codebook, standard/compact layout,
ordered image roles/preparation, rotations and agreement, native unknown/status,
and actual modality/calibration artifact. Generic `generate()` or a GGUF label
does not establish a model-specific decision adapter.

The semantic unit is one atomic question about one defined state. Independently
review the intended labels, rubric or proposition and the gold judgments before
execution. Split authoring/tuning cases from held-out cases. If experts disagree,
retain the disputed case and adjudication; do not convert uncertainty into a
convenient gold label. A question-set revision requires a new identity, then
rerun the affected held-out cases without changing the gold after seeing output.
For a wording repair, compare short direct instructions, optional criteria, and
the amount of policy/reference text in `state` as separate arms. Change only one
factor at a time when attributing an improvement, and retain per-case switches;
an aggregate gain can hide a new error on the most important boundary. Keep
the chosen arm provisional until it passes independently labeled held-out data.

## Case design

- For `choice`, cover every accepted label and its nearest neighbor, mixed
  requests, missing evidence, out-of-taxonomy inputs, and the specified
  `other`/abstention path. Test the host's single-label precedence or separate
  multi-label questions. Measure confusion, per-class recall, and false routing.
- For `score`, use independently anchored examples at every level and adjacent
  boundaries. Inspect the full level distribution as well as the expected
  numeric score. Measure ordinal error and consequential threshold mistakes;
  do not treat a fractional score as a measured physical quantity.
- For `noul`, include clear true and false cases, negation, conditional and
  ambiguous statements, and missing facts. Measure discrimination and the
  false-positive/false-negative tradeoff at the host's proposed thresholds.
  A value near 0.5 is unresolved. Check for a nearly constant Noul output
  across clearly opposite cases on the selected Laya checkpoint. A neutral-key
  two-option Choice is a separate candidate, not a presumed fix; evaluate it
  on the same frozen cases and keep a failed arm in the record. Do not assume a
  separately phrased negation is the exact complement.
- Across all types, include truncated/long state, irrelevant surrounding text,
  adversarial instructions inside state, language/script variants used by the
  workload, and invalid or unavailable provider responses. Test a high-cardinality
  Choice on the selected model instead of assuming equal option capacity.
- For Laya Vision, include missing, blurry, cropped, small-text, conflicting
  image/text, and out-of-domain images. Review any image resize or token
  truncation before scoring. Evaluate each visual `score` rubric in its own
  domain; a stored temperature does not prove calibration there.

Keep raw state, gold labels, question map, and target responses separate. Do not
expose gold answers, thresholds, or prior target outputs to the target. At a
minimum, freeze the normal, boundary, and failure cases that match the intended
use; add cases for any observed failure before revising wording.

## Execute and reduce

Before target execution, review the authoring coverage in
[instruction regressions](../evals/typed-decisions/instruction-regressions-v1.md).
Its scenarios include task framing, source composition and host consumption,
not just JSON shape. The accompanying evidence pack is authored development
data and validates against the existing text runner; it is not a new held-out
benchmark or an Intern/Imajev execution adapter.

Run `validate --pack PACK` first, then `run --pack PACK --provider laya
--model english --output NEW_DIRECTORY` using a Python environment with Laya.
The optional Jev path uses `--provider jev --model VERSIONED_MODEL`, the fixed
official System One endpoint, and `TYPESAFE_API_KEY` from the environment.
For images, install the independent Laya Vision fork and select
`--provider laya-vision --model thaitea/laya-vision`. Each case's `state.image`
is `{"path": "images/item.png", "sha256": "<lowercase SHA-256 of file bytes>"}`;
the path is relative to the pack directory and must stay inside it. Every Vision
arm includes `image` in `state_fields`, with optional text fields beside it.
Run `validate --pack PACK` to check paths and digests before execution. Add
`--revision COMMIT_SHA` to pin the Hub checkpoint. The runner passes the verified
encoded bytes to `load_vlm(...).predict(..., strict=True)` and records the
resolved checkpoint source and response provenance. A changed image, missing
fork, or truncated answer cannot produce a valid result.
Never put a credential in a pack or artifact. A target request contains only
the selected `state` fields and `questions`; gold remains in separate result
files. The default 200-call limit can be changed explicitly with `--max-calls`.
Jev requests have a per-call HTTP timeout and bounded retries. The local Laya
SDK runs in-process, so use the calling process's timeout when a hard wall
clock limit is required. Every run uses a new directory and retains partial
evidence on interruption. The summary reports Choice confusion, Score ordinal
error, Noul pairwise discrimination, and any explicitly declared exploratory
threshold table. It does not qualify an action threshold.
For a development pack with valid positive and negative Noul cases, the runner
also reports the largest negative, smallest positive, and an exploratory
midpoint when every result is valid and the observed scores separate. Freeze
that midpoint before evaluating a distinct case pack. A gap on authored cases
does not establish calibration or a deployable cutoff; overlapping scores or
invalid results yield no midpoint candidate.

1. Validate request shape against the selected API. `state` and `questions`
   have different roles; each question has a valid type, instructions, and
   type-specific criteria. Record whether a request exceeded a context or
   option budget rather than silently dropping text or labels.
2. Invoke the actual target once per frozen case under bounded retries and
   timeouts. Preserve request and response digests, model identity, timestamps,
   latency, usage when reported, errors, and the target's raw typed values.
   Repeat only to estimate variability or when the versioned protocol calls
   for repetitions; a failed call is not a wrong semantic answer.
3. Check mechanical validity first: expected question IDs and answer types,
   allowed Choice labels, finite probabilities in [0, 1], matching probability
   keys and normalization, Score level range/legend, and Noul's single
   probability. Invalid or absent output stays invalid/unresolved. No lexical
   fallback may infer a semantic verdict from the state or error text.
   Bind the returned model to the frozen expected identity before accepting
   values. Jev defaults to the requested exact ID; requesting an alias requires
   an explicit frozen `--resolved-model` binding. Laya binds its Router key/repo
   in addition to the generic adapter name. Vision binds loaded and returned
   checkpoint IDs/revisions and checks an explicit revision before creating a
   run. Text Laya checkpoint revision remains UNPINNED in this adapter.
   Check Score expectation against the full distribution and bind every legend
   description. The runner freezes serialization quanta (Jev documented 2dp,
   inspected Laya decoders 4dp) and checks possible normalized distributions
   within those rounding bounds; it never silently renormalizes raw responses.
   Jev confidence is checked against its native Choice/Score formulas. Local
   confidence has only range validation here; it is not assigned Jev semantics.
   Changed numerical/identity contracts need a new reviewed adapter and receipt.
4. Compare valid answers to independent gold. Report exact Choice accuracy and
   confusion; Score ordinal MAE and threshold errors; Noul discrimination and
   threshold precision/recall. Where enough labeled data exists, report a
   calibration measure such as Brier score or reliability bins, with sample
   count and uncertainty. Report abstention/review coverage and error among
   automatically acted cases separately from total accuracy.
5. Exercise the host policy on the same cases: validation, uncertainty route,
   permissions, and action boundaries. A correct model label does not prove a
   safe host decision. For safety, fitment, financial, or other consequential
   decisions, leave automatic action unqualified until representative domain
   evidence and independent review support the chosen threshold.

When all permitted question/model arms fail a required automatic-action bound,
the correct outcome is unresolved or blocked. A high, nearly constant
probability on clear positive and negative cases cannot be repaired by moving
the threshold without sacrificing one side; report the observed tradeoff.

For Laya versus Jev, use the same state content, question semantics, case
labels, and host decision rule. Record provider-specific serialization,
context, routing and option-budget differences as possible confounders.
Compare quality, calibration, invalid/error rate, latency, and cost on this
workload; provider benchmarks do not establish a winner here. Keep a model
revision change or question rewrite as a new comparison arm. A local smoke set
reused for wording repair is debugging evidence, not a held-out result.

## Calibration and joint interpretation

State the statistic used by each reliability/ECE calculation. Hosted Jev
Choice concentration, its Score ordinal-spread confidence, Intern maximum
candidate probability and Imajev concentration times known mass have different
definitions. Noul is a proposition probability, with Imajev additionally
redistributing half its unknown mass. Do not compare native confidence ECE
as if all were calibrated probability of correctness. Preserve full vectors,
unknown mass and separate semantic errors from invalid/unavailable responses.

Use proper distribution scores where labels or known stochastic references
support them, alongside reliability, coverage and host-action errors. Intern's
known-distribution pilot is 48 paired settings in 96 rows; it is not 96
independent trials. Provider development benchmarks and video comparisons are
diagnostics. A supplied-confidence ECE comparison can still mix concentration
with maximum probability. Record the metric definition, backend, artifact and
test identity before making a comparative claim.

Fit prompt/model selection, probability calibration and final qualification on
separate data. Group related documents, conversations, entities and image pairs
in one split. Freeze thresholds before the final check; retain failed arms and
per-case actions. Do not multiply marginal field probabilities into joint
correctness, treat option-order agreement as independent verification, or tune
retries to obtain a preferred answer. Evaluate a proposed fallback as its own
arm with the same task meaning and host authority.

## Source checks

Jev/Intern/Imajev instruction update reviewed 2026-10-03; retained Laya evidence
remains from 2026-09-23. Recheck current API and model limits before an executable
run: [TypeSafe primitives](https://docs.typesafe.ai/primitives),
[Choice](https://docs.typesafe.ai/primitives/choice),
[Score](https://docs.typesafe.ai/primitives/score),
[Noul](https://docs.typesafe.ai/primitives/noul),
[state](https://docs.typesafe.ai/concepts/state),
[API](https://docs.typesafe.ai/api),
[Jev 1.13 limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13),
and [Laya API and limits](https://github.com/NandhaKishorM/laya/blob/main/README.md),
[Laya multilingual model card](https://huggingface.co/convaiinnovations/laya-multilingual),
[Laya Vision model card](https://huggingface.co/thaitea/laya-vision).

Model-specific mechanics are owned by Cascade Prompt's
`references/typed-decision-intern.md` and `references/typed-decision-imajev.md`.
Primary calibration sources:
[TypeSafe confidence](https://docs.typesafe.ai/confidence),
[Intern evaluation](https://github.com/InternLM/Intern-Decision/blob/main/docs/EVALUATION.md),
[Intern pilot scoring](https://github.com/InternLM/Intern-Decision/blob/main/docs/CALIBRATION_BENCHMARK.md),
and [Imajev response adapter](https://github.com/mohit67890/imajev/blob/ccf586d43d2a580319b6535c893668904d909eb9/src/vision_decision/jev_api.py).

For the bounded local Intern/Imajev scoring implementation and its exact
diagnostic limits, read `references/native-adapter.md`. A verified native
path is distinct from accuracy, calibration, sealed acceptance and host-action
qualification. Rebind new executable packs; preserve earlier frozen evidence.

## Guarded executable binding and legacy compatibility

Before any new Laya, Laya Vision or Jev typed run, freeze
`references/typed-decision-entrypoint.json` and invoke
`scripts/run-typed-decision-entrypoint.py`. This executable contract supersedes
the legacy command spelling in the preserved `prompt-evaluation/SKILL.md`.
The default and explicit `--runner v2` route only to
`run-typed-decision-eval-v2.py` at the declared SHA-256. Missing or changed v2
code is BLOCKED; there is no legacy fallback. `--runner legacy run` and
`--runner legacy validate` are rejected before target initialization.

Put `--binding-sha256 FROZEN_BINDING_DIGEST` before the command when invoking
the guarded entrypoint. Both the routed path and direct v2 CLI perform the
same source/contract preflight. New execution manifests declare
`typed_decision_contract_version: 2` and the exact `entrypoint_binding`.
Before using any new manifest in evaluation, call:

```bash
python3 scripts/run-typed-decision-entrypoint.py \
  --binding-sha256 FROZEN_BINDING_DIGEST \
  validate-manifest --manifest RUN/manifest.json
```

This checks execution binding only. It grants no action authority and does
not establish accuracy, calibration or acceptance. A legacy, missing,
changed-runner or changed-binding manifest cannot satisfy this new contract,
even if its model response has valid shape. Earlier v2 runs without this
new binding are retained as their original diagnostics; do not migrate or
regrade them. New runs require fresh frozen bindings.

The pre-existing `run-typed-decision-eval.py`, its 11-test suite, and the
local edits in `prompt-evaluation/SKILL.md` remain byte-for-byte unchanged.
Their direct legacy invocation still supports the older compatibility
contract, and cannot establish a guarded new-run binding. Read existing
legacy evidence without source execution using:

```bash
python3 scripts/run-typed-decision-entrypoint.py \
  --runner legacy inspect-legacy --manifest OLD_RUN/manifest.json
```

The inspection labels evidence `LEGACY_COMPATIBILITY_ONLY`, with
`eligible_for_new_binding: false` and `action_authority: NONE`. Use the
versioned native adapter for Intern/Imajev; this Laya/Jev router does not
substitute their model-specific execution. All guard and compatibility
checks run offline without target model trials.


The repository's `examples/vehicle-assistant/evals/run_laya_eval.py` is an
example-specific exploratory runner. Its frozen cases and receipt show useful
exact and pairwise checks, but it has no Jev arm, independent judge, or
vehicle-domain calibration. Do not call it a Cascade Evals campaign receipt.
