# GPT-6 Astra surface adapter

Applies only to `gpt-6-astra`. Sources checked 2026-09-09. This adapter
specializes the selected tier; it neither selects a new model nor grants tools.

## Prompt rules

- Make completion and initiative explicit: continue authorized work, make
  reversible assumptions, and ask only for decisions that change the outcome.
- Audit loaded skills for conflicts; identify the exact blocking instruction
  when it prevents completion. Preserve the host's instruction hierarchy.
- Specify the desired brevity and response structure.
- State delegation conditions and limits only when the host authorizes agents.
- Match verification to changed behavior and risk; repeat checks only when new
  evidence invalidates their results.

These are adaptations of [OpenAI's Astra prompting guidance](https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices),
not measured improvements for this plugin's workloads.

## Host configuration, outside prompt text

The [model page](https://developers.openai.com/api/docs/models/gpt-6-astra)
lists API reasoning levels `low`, `medium`, `high`, `xhigh`, `max`. Preserve
an explicit compatible setting; do not invent `none` or translate another
provider's modes. Validate the actual host, whose exposed options may differ.
For API tool use verify the Responses endpoint; migration guidance excludes
`temperature`, `top_p`, and `top_logprobs`. A request to write a prompt does
not authorize an endpoint migration.

Keep permissions, source evidence, pending work and completion criteria in
context. Require concise evidence, not private reasoning traces. Live target
execution and comparative efficacy remain `NOT_RUN` until actually evaluated.
