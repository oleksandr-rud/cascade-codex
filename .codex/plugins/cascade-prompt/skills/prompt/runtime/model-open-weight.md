# Open-weight surface adapter

Use for the exact supported Gemma or Mistral checkpoint below, or as disclosed
generic guidance when an unknown local model has no verified specific adapter.
Checked 2026-09-09. These are candidates, not measured workload winners.

## Configuration before composition

Record the checkpoint/revision, instruct/base variant, quantization, serving
engine, chat-template version, usable context and output budget, supported
roles/modalities, tools, and output parser. Unknown details can remain
placeholders in a template; executable settings need verification. Do not
infer equivalence from an OpenAI-compatible endpoint or parameter count.

Keep instructions concise and grouped by task, evidence, decision, and output.
Preserve exact fields and source IDs; include a boundary example only when
necessary. Use the selected tier's checks. For strict JSON, prefer supported
schema enforcement plus independent validation; unsupported structured output
is a capability gap, not solved by saying "JSON only". Quantized deployments
must be evaluated separately. These are Cascade hypotheses, not provider scores.

## Exact surfaces

| Checkpoint | Adapter rule | Evidence |
|---|---|---|
| `google/gemma-3-27b-it` | Use the distributed processor/chat template. Native dialogue has user/model turns; an API-level system message may be folded into the initial user turn by the template. Do not invent a separate native system token or assume the endpoint preserves system-role semantics. | [Google formatting](https://ai.google.dev/gemma/docs/core/prompt-structure), [official card and processor example](https://huggingface.co/google/gemma-3-27b-it) |
| `google/gemma-4-31B-it` | Use the Gemma 4 template, which adds native system, thinking and tool syntax. A server must implement these controls; copying Gemma 3 formatting is incorrect. This is a nearby 31B dense candidate, not 27B. | [Gemma 4 formatting](https://ai.google.dev/gemma/docs/core/prompt-formatting-gemma4), [official card](https://huggingface.co/google/gemma-4-31B-it) |
| `mistralai/Mistral-Small-3.2-24B-Instruct-2506` | Use its official tokenizer/template and supported tool parser. Inspect the supplied system-prompt example before adapting it to the user's contract. Do not serialize Qwen/Gemma control tokens or assume identical function-call formatting. This is a dated 24B comparison candidate, not a latest-Mistral claim. | [official card](https://huggingface.co/mistralai/Mistral-Small-3.2-24B-Instruct-2506) |

When a template folds instructions and evidence into one role, preserve explicit
sections and delimiters; the host must still enforce permissions and source
boundaries. Never treat delimiters as an injection-proof security boundary.
Do not insert guessed raw control tokens into ordinary API messages. Explain
the adapter gap if the host cannot represent a required role or tool contract.
