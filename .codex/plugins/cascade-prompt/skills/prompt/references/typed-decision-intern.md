# Intern-Decision authoring adapter

Read only for the official Intern-Decision 0.8B or 2B decision target. Checked
2026-10-03. Preserve an explicitly selected size; benchmark averages and shared
Qwen3.5 ancestry do not select a winner for the user's task.

## Verified inference boundary

The released `DecisionEngine.predict(request)` scores candidates rather than
calling `generate()`. Its compiler preserves question and option insertion
order, maps candidates to single-token symbols, and appends a complete masked
assistant skeleton. A causal forward reads logits immediately before each
`<decision>` placeholder and normalizes only the allowed symbols. Use the
selected checkpoint's tokenizer, processor, chat template and official
compiler; generic Qwen chat, JSON generation, or a GGUF file alone does not
establish this path.

The 2B HF wrapper admits 1-16 questions, at most 62 options per question,
up to eight ordered images and an 8192-token default input limit. It rejects
overlength input rather than truncating. These are wrapper limits, not the
base Qwen window. Verify the selected size/revision and deployed settings;
do not inherit another size's defaults.

The compiler renders field IDs and all options after state; optional images
precede text in their supplied order. Structured descriptions are converted
with Python string conversion, rather than hosted Jev's native structured
entry handling. Prefer explicit plain descriptions unless the exact rendering
has been inspected and tested. Reserved decision markers in supplied evidence
are rejected; do not remove real evidence silently to make an input pass.

## Instruction and context design

Apply the shared task/evidence rules from [typed-decision models](typed-decision-models.md).
Keep one axis per field with complete candidate boundaries and a defined
out-of-set/missing/conflict outcome when the accepted task needs it. Intern
has no Imajev-style trained unknown channel; adding an allowed review label
is an authoring choice that needs target validation, not native abstention.

Fields share a causal schema/skeleton context. Do not instruct a later field
to read an earlier prediction: the earlier location contains a placeholder,
not a decided value. Batch independent questions; use a later validated call
for a real predecessor dependency. Freeze field/option order and compare
single-versus-batch, irrelevant-field insertion and field-order variants.
These are proposed regression checks, not a claim that batching always fails.

Bind image index to reference/target role and capture time in model-visible
state. Keep unreadable regions, stale observations and image/record conflicts
explicit. Optional image support does not qualify arbitrary video, OCR,
coordinate grounding or long-horizon control. For action selection, supply
host-eligible candidates and recheck actual state/permission before execution.

## Output and calibration

The wrapper returns the full candidate distribution, its maximum as
`confidence`, argmax `decision`, and the primitive-specific value. Noul is
P(yes); Score is the expectation of numeric level values, not the argmax.
Temperature scaling preserves the winning candidate but can change Noul,
expected Score and every threshold outcome based on probabilities.
Treat this temperature as calibration, never sampling.

Bind weights, backend, dtype/kernels, compiler/template, processor and
temperature artifact to every result. The 2B HF wrapper defaults to
2.100509348278; the released evaluation guide lists 0.8B as
2.747760550702957. A default is not qualification for a new domain.
There is a source boundary to retain: released HF inference applies a preset,
while the published evaluation protocol binds presets to XTuner and requires
new fitting for HF calibration. Do not claim HF reproduces the published
calibration table; report backend and independently validate/refit on disjoint
calibration data for the selected deployment. Never tune on the final test set.

Validate exact candidate mapping and native probability semantics before a
host gate. Invalid/overlength input, missing artifacts and unavailable inference
remain errors or unresolved outcomes. Do not fall back to free-form generation
and label it equivalent Intern inference. A new compiler, backend, quantization
or temperature is a separate evaluation arm.

## Primary sources

- [2B model card](https://huggingface.co/internlm/Intern-Decision-2B), inspected
  revision `8797836c65fc91a2435b1fb6850b5f0aabd75cc3`.
- [Released inference compiler](https://huggingface.co/internlm/Intern-Decision-2B/blob/8797836c65fc91a2435b1fb6850b5f0aabd75cc3/inference.py).
- [Input compiler](https://github.com/InternLM/Intern-Decision/blob/main/src/inputs/schema.py).
- [Evaluation/backend/calibration protocol](https://github.com/InternLM/Intern-Decision/blob/main/docs/EVALUATION.md).

Source-backed mechanics above establish adapter requirements. Context choices,
regression design and suitability for an untested workload remain `INFERRED`;
source inspection ran no target inference.
