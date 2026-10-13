# GPT-6.1 Sol surface adapter

Applies only to `gpt-6.1-sol`. Sources checked 2026-10-01 against the
[official model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol).
Load [shared GPT-6 guidance](model-gpt6.md) with this exact-model adapter.
This adapter specializes the selected tier; it does not select a new model,
grant tools or establish availability on the current account.

Preserve the user's task, source authority, output contract, explicit uncertainty,
permissions, recovery and completion criteria. Request typed, source-bound
claims for meaning-dependent interpretation; code validates and consumes them.
Keep the requested response concise and avoid private reasoning traces.

The documented API reasoning efforts are `low`, `medium`, `high`, `xhigh` and
`max`; `none` and `minimal` are unsupported. The Cascade authoring default is
`xhigh`; preserve explicit compatible target settings and frozen evaluations.
Reasoning effort is host configuration, not a prompt instruction.

For API tool calling use Responses; documented Chat Completions support excludes
tool calling. Verify the actual host's supported model, effort and tools before
execution. A documentation entry or configured default does not prove account
access, successful execution or comparative quality. Report an unavailable model
explicitly; do not silently substitute another one.
