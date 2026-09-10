# Qwen versioned surface adapter

Checked 2026-09-09. Match the exact checkpoint and serving surface; do not use
one family's settings for every Qwen release. Tier eligibility is `INFERRED`.

## Qwen3.8-27B

The [official model card](https://huggingface.co/Qwen/Qwen3.8-27B)
describes a dense 27B language backbone with vision. It is the newest verified
27B entry in this review, not a permanent `latest` alias.

- Thinking and historical thinking preservation default on. API reasoning
  levels are `xhigh` (default), `medium`, `low`; check server support.
- For compatible local APIs, configure `enable_thinking` and
  `preserve_thinking` inside `extra_body.chat_template_kwargs`; Qwen Cloud
  uses those keys directly in the extra body. Do not insert API JSON into prose.
- Provider sampling starting points:

| Mode | temperature | top_p | top_k | min_p | presence_penalty | repetition_penalty |
|---|---:|---:|---:|---:|---:|---:|
| Thinking | 1.0 | 0.95 | 20 | 0.0 | 0.0 | 1.0 |
| Non-thinking | 0.7 | 0.80 | 20 | 0.0 | 1.5 | 1.0 |

Native context is 262,144 tokens; the deployment may expose less. Reserve
generation room. Extension is a separately tested host setting, not a promise
of recall. Keep retention and parser configuration explicit.

## Earlier explicit checkpoints

- [Qwen3.6-27B](https://huggingface.co/Qwen/Qwen3.6-27B): thinking defaults on,
  but preservation of historical thinking is opt-in. Its card supplies a
  coding-specific `temperature=0.6` profile. Do not copy 3.8 reasoning levels
  into 3.6 or use the old `/think` and `/nothink` text switches.
- [Qwen3.5-27B](https://huggingface.co/Qwen/Qwen3.5-27B): the card recommends
  final-answer-only past assistant history. Its general thinking sampling
  uses `presence_penalty=1.5`, unlike 3.6/3.8. Its exact card owns other settings.
- [Qwen3.8-Flash-Next](https://huggingface.co/Qwen/Qwen3.8-Flash-Next) is a
  distinct MoE architecture preview, with 125B backbone parameters / 6B active
  plus embedding and MTP parameters. Active count does not make it a 27B
  deployment substitute; inspect its own card if explicitly selected.

## Cascade composition rules (inferred; validate on the target)

Use short task sections, relevant evidence with source IDs, a concrete output
contract, and one contrasting example only for a difficult decision boundary.
Keep language and missing/conflicting-input behavior explicit. Use the selected
tier's decomposition and validation rules rather than assuming 27B means weak
reasoning. Fix context, schema and parser failures before changing the model.

Let the trusted serving adapter manage model-native reasoning channels and
history retention. Do not fabricate, request or publish private thinking in
the generated prompt, result schema, summaries or evidence. Validate the final
answer channel separately; a truncated or unparsable response is not valid JSON.
Tool calls remain requests subject to host validation and current authority.
