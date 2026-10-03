# Imajev authoring adapter

Read only for Imajev typed decisions. Checked 2026-10-03 against the released
2B artifacts and source commit `ccf586d43d2a580319b6535c893668904d909eb9`.
The 2B card says it remains the previous generation while 4B moved to phase 3;
do not transfer 4B claims, layout or calibration to 2B.

## Verified inference boundary

Imajev 2B combines Qwen3.5-2B, a LoRA adapter and a separately trained
255-by-2048 decision readout. The readout's manifest binds the exact code/token
mapping; it is not a removable detail. The 255-code path admits 254 user
options plus trained unknown. New source also offers a distinct extended
256-code path and compact layout; neither is automatically the shipped 2B
configuration. Preserve the adapter's recorded/default layout and row count.
A generic LoRA merge, GGUF conversion, `generate()` or unadapted LM-head
scoring is not evidence of native Imajev behavior.

The scoring path uses last-position hidden states and candidate readout rows.
Its standard codebook begins with uppercase single letters, then verified
two-letter codes; unsupported or duplicate-token entries are skipped at the
actual answer boundary. Pin the manifest/tokenizer; do not invent a contiguous
token range or replace the compiler with familiar chat syntax.

Default scoring averages up to four cyclic candidate orders in log-probability
space after mapping each back to the original candidates. This is not image
rotation, majority voting, arithmetic averaging or a single forward for the
entire API request. Freeze rotation count, coverage and agreement. An order
ensemble can reduce position effects but does not establish correctness.

## Instruction and context design

Apply the [shared framing and evidence rules](typed-decision-models.md).
Use bounded visual/text questions: observable attributes, record conflicts,
or a reference/target comparison with a precise criterion. The training/task
evidence supports investigating these uses; it does not qualify open-ended
planning or arbitrary visual control. Keep action admission in the host.

The standard compiler sorts state object keys. Represent chronology and
reference/target order with explicit ordered arrays and role labels; never
rely on object insertion order. Native question layout and unknown wording
are adapter-sensitive. Do not switch standard to compact or rewrite compiler
boilerplate solely for token savings. Inspect structured description rendering
before borrowing hosted Jev criteria objects.

Bind original images, role, capture time, any crops/resizing and accompanying
records. A generated caption or OCR transcript remains a derived observation.
Keep blurry, occluded, missing, out-of-domain and contradictory inputs visible.
Check the deployed service's state-byte, image and expanded-token limits;
the 2B card's 32 KB state boundary is not 32k tokens. Multi-image support
does not establish video/timeline understanding.

## Preserve unknown and native answers

Imajev includes a trained unknown candidate. Do not add a synonymous ordinary
"insufficient evidence" option unless the task requires a distinct meaning
and separate validation. Keep taxonomy `other`, negative evidence and native
unknown distinct. The service reports `unknown_probability` and `abstained`;
unknown winning the native comparison can still leave a plausible `choice`
in the Jev-shaped envelope. That choice does not authorize a host action.

Known-option `probabilities` are normalized after excluding unknown. If
`u = unknown_probability`, their unconditional known mass is `(1-u)*p`.
Native Choice and Score `confidence` use known-option concentration multiplied
by `(1-u)`; this Score statistic differs from hosted Jev's ordinal-spread
confidence. Noul returns P(yes) plus half the unknown mass. A near-0.5 Noul
can therefore reflect abstention; retain `u` and the native status.
Expected Score and its conditional distribution do not resolve missing evidence.

Calibrate and evaluate the deployed primitive, modality, rotations and layout
together. Pin the actual calibration artifact, not a rounded README number.
The source's calibration/configuration variants are separate arms; conflicting
4B temperatures in prose do not resolve a 2B policy. Report the conflict and
use the inspected artifact for a runnable specification. Review/unknown gates
need held-out task evidence and must not reuse another family's confidence
threshold. Transport failure, bad readout binding and overlength input require
correction or an unresolved result, not a generic-generation fallback.


## 4B release gate and source conflict

The [4B release specification](https://huggingface.co/mohit67890/imajev-4b/raw/main/RELEASE-SPEC.md)
identifies phase-3 checkpoint `r2-s000291` and revision
`c9e5f132465da85d31735ec502d5557982671a7d`. It discloses an overridden
14/14 unknown-case abstention gate. Its prose says 11 unknown cases were
answered; the [model card](https://huggingface.co/mohit67890/imajev-4b/raw/main/README.md)
instead says 11 abstained and three were answered. Both disclose a failed
gate, but the miss count is unresolved. Do not promote a trained unknown
channel into a safety guarantee or transfer this release to the inspected 2B
arm. Verify the actual 4B artifacts, including calibration, and independently
test unknown cases before automatic handling. These mutable source documents
establish a release claim, not a reproduced target result.

## Primary sources

- [2B card](https://huggingface.co/mohit67890/imajev-2b), inspected revision
  `0426f7b1c73804b64fab5802e04f401420ec774c`.
- [Released readout binding](https://huggingface.co/mohit67890/imajev-2b/blob/0426f7b1c73804b64fab5802e04f401420ec774c/decision_readout.json).
- [Backend](https://github.com/mohit67890/imajev/blob/ccf586d43d2a580319b6535c893668904d909eb9/src/vision_decision/backend.py),
  [scoring/compiler](https://github.com/mohit67890/imajev/blob/ccf586d43d2a580319b6535c893668904d909eb9/src/vision_decision/scoring.py),
  [response adapter](https://github.com/mohit67890/imajev/blob/ccf586d43d2a580319b6535c893668904d909eb9/src/vision_decision/jev_api.py).
- [Technical specification](https://github.com/mohit67890/imajev/blob/main/docs/technical-specification.md).

These mechanics are source-backed. Proposed task/context choices remain
`INFERRED`; source inspection ran no target inference or accuracy evaluation.
