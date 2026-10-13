# GPT-6 shared guidance

Load through the adapter for the exact requested GPT-6 model. Checked
2026-10-01 against [Using GPT-6](https://developers.openai.com/api/docs/guides/latest-model)
and [Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching).
The prompting observations below come from Astra; transfer to another family
member requires representative evaluation, rather than a claim of measured parity.

The [GPT-5.6 guidance](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6.md)
already favored outcomes, lean prompts and measured effort changes. Retain that
working baseline. GPT-6 guidance adds targeted controls for Astra's greater
clarification sensitivity, detailed formatting and thorough testing; do not
discard explicit completion or permission rules merely to shorten a prompt.

## Prompt behavior

- State the outcome and done condition. Continue authorized work, preserve
  progress across steering, and ask only when a missing decision changes the result.
- Give the instruction hierarchy explicitly. Inspect only the relevant loaded
  skills for conflicts; identify the exact instruction if it blocks completion.
- Specify concise connected prose and the required output contract. Formatting
  and detailed answers are useful when requested; avoid fixed heading quotas.
- Declare delegation conditions only when the host and user authorize agents.
  API multi-agent support does not grant permission to spawn or message agents.
- Match verification to changed behavior and risk. Extend or repeat testing only
  after a new change, failure or unresolved concern invalidates existing evidence.
- Preserve source-bound typed claims, uncertainty, permissions and recovery.
  Request evidence and useful rationale, never hidden chain-of-thought.

## API migration, separate from prompt text

Use the exact model adapter's reasoning and endpoint rules. For non-`none`
reasoning, omit `temperature`, `top_p`, `top_logprobs`, Chat Completions `logprobs`,
and Responses `include` entry `message.output_text.logprobs`. For `none`, verify
the exact model/endpoint contract before selecting sampling controls. Codex host
efforts and API efforts are separate capabilities; never infer one from the other.

Async tools, mid-turn steering and `configuration_update` are host/API features.
Do not enable them through prose or assume every endpoint, model or multi-agent
mode supports them. Use the provider's compatibility contract for the selected
surface. An upgrade request authorizes only its scoped integration changes.

## Provider caching

For GPT-6 API requests, use `prompt_cache_options.ttl: "30m"`; the older
`prompt_cache_retention` interface is for models before GPT-5.6. This cache
interface and explicit breakpoints already apply to GPT-5.6; they are not a
GPT-6-only feature. Keep a useful stable
prefix before changing inputs, and select eligible cache breakpoints in the
actual request. A shared prefix alone does not establish a cache hit.

Explicit-only mode requires a `prompt_cache_breakpoint` on a supported input
content block. Without a breakpoint it creates no cache writes or reuse. Reusable
developer instructions need an input message: top-level `instructions` cannot
carry a breakpoint. The minimum is 1,024 visible input tokens; do not pad a prompt
with irrelevant material merely to reach it. Message boundaries and breakpoints
must remain compatible across subsequent requests.

`prompt_cache_key` is optional for separate cache accounting on GPT-6; it does
not grant access, guarantee a hit or select reusable evidence. Keep tenant/scope
authorization in the application. Stable content, tools, schemas and settings
affect cache eligibility. On a supported standard single-agent Responses surface,
`configuration_update` can change effort without rewriting the initial prefix;
check compatibility before adoption.

Measure provider-reported cached and cache-write tokens, latency, realized cost
and answer correctness. Writes use a different rate from ordinary input; do not
price all uncached tokens identically. Local rendered-block reuse, a saved response,
conversation persistence and provider prefix reuse require separate evidence.

## Compatibility and context

Preserve explicitly selected older checkpoints and frozen comparisons. Do not
silently replace a target or reuse another model's controls. Advertised context
capacity is a limit, not a target: respect the actual deployment window, reserve
output/reasoning space, and retrieve only needed evidence. Verify current pricing
and regional/tier support before claiming a cost or latency advantage.
