# GPT-6 Sol surface adapter

Applies only to `gpt-6-sol`. Checked 2026-10-01 against the
[exact model page](https://developers.openai.com/api/docs/models/gpt-6-sol).
Load [shared GPT-6 guidance](model-gpt6.md). Preserve this explicit checkpoint;
the newer Sol 6.1 authoring default does not override a target or frozen comparison.

API reasoning efforts are `none`, `low`, `medium`, `high`, `xhigh` and `max`;
`minimal` is unsupported. Responses supports reasoning with tools. Chat
Completions supports function calling only with `reasoning_effort: "none"`.
Do not copy Sol 6.1's no-`none` restriction onto this model. Verify host support
separately and keep configuration outside the generated prompt.

Treat complex coding and agent workflows as candidates requiring workload
evaluation; availability, provider caching and comparative quality need actual
execution evidence. Preserve scope, source authority and completion criteria.
