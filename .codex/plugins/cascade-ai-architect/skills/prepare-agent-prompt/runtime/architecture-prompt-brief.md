# Architecture prompt bridge contract

This runtime pack defines the information boundary between an agent
architecture and an external prompt builder. It does not define prompt patterns,
interview policy, model tiers, or model-specific instructions.

## Required mapping

Bind free-text semantic work to LLM interpretation with a declared structured
output and explicit uncertainty. Code consumes validated enums/claims under
existing authority. Neither lexical preprocessing nor regex extraction of a
verdict from narrative may replace this boundary; invalid output follows the
supplied repair/gap contract.

Before delegation, map each material architecture decision into exactly one of:

- an operative objective or behavior;
- an input, context, or source-authority rule;
- a tool, permission, confirmation, or forbidden-action boundary;
- an output, evidence, or completion rule;
- a budget, recovery, escalation, or stop rule;
- a representative prompt test;
- an explicitly classified unresolved field.

Preserve semantic slugs only for traceability. Convert no unresolved field into
an invented instruction. Keep application state in the harness and pass only
the state representation the target prompt is authorized to observe or update.
For proposal-only roles, observe does not mean mutate: bind the advertised semantic
output separately from runtime metadata restoration and the internal schema.
For role text assembly, distinguish trusted system/role/policy definitions from
current state, policy data and history. Include optional status/streaming profiles
only when the source architecture defines their release and completion gates.
For the supplied stateful-agent profile, projection means a role- and task-specific
policy/state slice issued by Policy Engine and admission. Bind its task/step and
purpose outside model text. Prompt/context builders format only that issued input
and approved prompt assets; missing content returns to the issuer rather than
triggering a store read or broader selection. Cached history obeys the same scope.

Carry the `schema-values-text@1` binding when selected: trusted profile, ordered
object/schema/value blocks, schema-versus-data placement, required literals and
omission behavior. Prompt generation cannot bypass the issuer by calling the
low-level formatter. Shared approved policy blocks preserve exact text; local
render-cache evidence and provider-prefix evidence remain distinct.

## Delegation request

For a selected graph workflow, bind one model step's purpose, required predecessor
results, issued evidence, acceptance/done condition and missing/stale-input
behavior. Carry the architecture's deterministic versus semantic decision split
and dependency invalidation rules. Keep executable routing, joins, permission
checks and commits in the runtime; do not turn them into prompt-only enforcement.
No prompt is required for a deterministic node. Workflow identity and revision
checks stay in the private manifest. Prompt technique selection remains with
Cascade Prompt; graph authoring does not automatically select a stateful profile.

Send one target and one operation with the prompt brief. Require the resolved
`cascade-prompt:prompt` skill to produce a prompt for the target rather than
perform the target task. State that the architecture brief is authoritative for
mission, source precedence, tools, permissions, outputs, recovery, and stop
behavior; the prompt skill owns prompt composition and tier adaptation.

For complete evaluation fixtures that explicitly forbid questions, mark the
brief complete and authoritative. Otherwise preserve material prompt-decision
gaps for the external skill's own interview behavior.

## Result preservation

A ready response must retain the external skill's standard fenced `Final
Prompt` and its associated variables, assumptions, design notes, and tests when
present. Bind the exact final-prompt bytes to the architecture and dependency
digests. Never post-edit the prompt without creating a new candidate and a new
receipt.
