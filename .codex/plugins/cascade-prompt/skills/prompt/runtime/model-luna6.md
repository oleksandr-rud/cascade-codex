# GPT-6 Luna surface adapter

Applies only to `gpt-6-luna`. Checked 2026-10-01 against the
[exact model page](https://developers.openai.com/api/docs/models/gpt-6-luna).
Load [shared GPT-6 guidance](model-gpt6.md). This is a focused-task candidate,
not a claim that every autonomous or complex task passes on the efficient tier.

API reasoning efforts are `none`, `low`, `medium`, `high`, `xhigh` and `max`;
`minimal` is unsupported. Responses supports reasoning with tools. Chat
Completions supports function calling only with `reasoning_effort: "none"`.
Choose effort from the workload and explicit target settings; do not force the
Sol authoring default onto a generated Luna configuration.

Keep extraction/classification schemas and semantic claims explicit. Code
validates defined fields; keyword scoring is never an interpretation shortcut.
Preserve exact input boundaries and uncertain/missing values. Evaluate actual
quality, cost and latency before changing a tier or promoting a configuration.
