# Architecture prompt bridge contract

This runtime pack defines the information boundary between an agent
architecture and an external prompt builder. It does not define prompt patterns,
interview policy, model tiers, or model-specific instructions.

## Required mapping

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

## Delegation request

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
