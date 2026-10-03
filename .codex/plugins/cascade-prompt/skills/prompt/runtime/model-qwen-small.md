# Qwen3.5-2B generative surface adapter

Checked 2026-10-03 against the
[official Qwen3.5-2B card](https://huggingface.co/Qwen/Qwen3.5-2B).
This is the ordinary generative VLM, distinct from Intern-Decision and Imajev.
Use those targets' decision references when the user selected decision tuning;
shared backbone, model size or JSON output is not inference equivalence.

## Verified surface

The card describes a causal language model with vision, a native 262,144-token
window and non-thinking mode by default for 2B. Enable thinking only through
the actual supported template/API parameter; prose and `/think`/`/nothink`
do not configure it. The deployment may expose a smaller window. Use the exact
processor, template, vision support and serving parser; a text-only deployment
cannot inspect images. The card positions this size for prototyping,
task-specific tuning and research/development, not universal production autonomy.

Generation settings and history handling must come from the selected size's
card/runtime. Do not inherit 27B/3.6/3.8 reasoning levels or sampling defaults.
Preserve prior final answers rather than historical thinking. Tool calls require
the configured parser and host admission; emitted JSON is not tool execution.

## Composition practices (inferred; validate on the deployment)

Use a direct task, bounded evidence, explicit output schema and honest missing,
conflicting or unreadable-input behavior. For OCR/extraction, request verbatim
spans and source/image regions only when the serving surface can support them;
mark unreadable content instead of completing it from memory. Generated image
descriptions are derived observations for a downstream decision, with provenance
and uncertainty. They do not provide calibrated candidate probabilities.

Split observation, semantic selection and effects only when those boundaries
help the task. A fixed candidate judgment may suit a separately qualified
decision model; open-ended extraction, explanations and plans need generation.
Code owns exact arithmetic, dates, schema validation, permission and effects.
Coordinate grounding requires its own validated output and fresh observation.

Check actual workload language, modality, truncation, schema, injection and
tool failures before automatic use. Parameter count and advertised context
do not establish quality. On a miss, repair evidence, boundary or parser before
adding instructions. Preserve the explicit target; any alternate model is a
declared arm/fallback with its own qualification and unchanged authority.
