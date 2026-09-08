# Stateful-agent profile: build-agent-roles

Load only for an explicitly requested or already adopted Analyzer–Policy Engine–Composer
architecture. These obligations specialize that architecture, not every agent system.
Resolve links relative to this reference; commands run from the skill directory.

When the selected blueprint uses
[Analyzer–Policy Engine–Composer](../../design-agent-blueprint/references/analyzer-policy-composer.md),
use its ownership table. Analyzer has proposal-only output, Main Composer owns
canonical meaning, Voice Composer owns presentation, and Researcher supplies
evidence only. Policy Engine is deterministic runtime code, not an agent role.
Delivery observations come from the adapter/client and receipts from runtime;
Voice cannot certify playback. Fixed approved status text is the narrow runtime
exception to model composition, not another general-purpose semantic owner.
Do not invent tool access to make a tool-free role appear more agentic.

Apply the [agent authoring rules](../../design-agent-blueprint/references/event-projections-and-context-format.md):
bind JSON delta output to checkpoint/attempt identity, compact block-text input
to the validated role projection, multi-policy reference scope, and a stable
role/catalog prefix. Each role/task input slice is issued by Policy Engine and
admission, including initial Analyzer input. Roles and their context formatters
cannot select more state or issue their own access. Preserve independent role
authority and explicit gaps.
For this profile, bind each role's `inputs.projection` to the
[executable block contract](../../design-agent-blueprint/references/executable-projections.md):
trusted profile, selected schema/value sources, role/task/step scope, input budget,
issuer and stale/denied behavior. Models cannot choose profiles, alter schemas,
read stores or claim that a generated slice was admitted.
Apply the [architecture checklist](../../design-agent-blueprint/references/architecture-best-practices.md):
bind semantic output versus runtime envelope, per-role history access and output
release gates. If interim status is enabled, give it a distinct purpose and
completion oracle; it cannot complete the substantive user task. Keep optional
role features conditional rather than copying every profile into every role.
