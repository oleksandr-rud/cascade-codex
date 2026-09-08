# Stateful-agent profile: prepare-agent-prompt

Load only for an explicitly requested or already adopted Analyzer–Policy Engine–Composer
architecture. These obligations specialize that architecture, not every agent system.
Resolve links relative to this reference; commands run from the skill directory.

For an [Analyzer–Policy Engine–Composer blueprint](../../design-agent-blueprint/references/analyzer-policy-composer.md),
bind separate briefs to the selected model roles: StateDelta-only Analyzer,
context-only Main Composer, optional canonical-text Voice Composer, and
request-only Researcher. Policy enforcement remains runtime code. Do not copy
full state, policy authority, or research tools into the voice brief.

For Analyzer, bind `AnalyzerContext` as its runtime context envelope and a
versioned advertised semantic proposal schema as its model output. The adapter
restores hidden runtime bindings and validates full `StateDelta`; do not require
the model to echo metadata absent from its text input. Explain how to use the supplied
identity, policy, conversation background, continuity and next-step blocks to
detect new facts, corrections, answers, intent and gaps without responding to
the user. For Main Composer, bind `ComposerContext` and its `ResponseContract`;
explain how to use admitted background, compact history, recent memory and the
complete current-task step projection authorized for that role while following
the selected answer mode, language, structure, limits, tone, required/forbidden
elements and missing-data behavior.
Source these contracts from
[StateDelta, policy data, and role projections](../../design-agent-blueprint/references/state-delta-policy-projection.md);
do not reconstruct them as untyped prompt prose.

Keep `IdentityContext` as a separate input block in both prompt briefs. Use
`minimal` for ordinary turns, `personalization` only for approved presentation or
interpretation attributes, and `identity_answer` for identity questions, and `introduction` or
`capability_disclosure` when a registered policy requires self-description. Bind agent self-description to the trusted versioned agent/product
identity source and require unknown or non-disclosable attributes to remain
unknown.

The reference Analyzer and Main Composer prompts receive a `ContinuityContext`
with at most twenty accepted conversational turns and a short, source-bound recent
memory; `MemoryContext` separately provides task summary and relevant durable
memory. Use the versioned JSON schemas as the wire authority. One turn begins with one finalized user input and includes its associated
canonical assistant response and lifecycle status when one exists; the current
input can be an open turn. Streaming fragments, tool payloads and hidden reasoning
are excluded. The Main Composer also receives `NextStepContext`
and must preserve `awaiting_confirmation`, `unknown_outcome`, `blocked` and other
runtime statuses instead of describing intent as completion. It may explain or
request a next step only when `ResponseContract` permits that response act.
Researcher and Voice Composer do not inherit continuity, semantic memory or the
next-step list unless a ProjectionPolicy explicitly grants a smaller,
purpose-bound projection.

Treat Composer reminders as policy-derived response guidance, not memory. Map
trusted rule IDs into the typed `ResponseContract` fields and retain their source
dependencies. Never place arbitrary memory or policy-data text into the prompt's
instruction hierarchy.

For StateDelta v3, instruct Analyzer to emit all grounded unambiguous slot
changes as direct groups and preserve genuine alternatives as registered blocks,
parts, and candidates. Each part may have multiple candidates and each candidate
may contain multiple atomic update groups. It must not collapse distinct parts
into one whole-state guess, invent block/selection rules, or put mutually
exclusive scalar values into direct updates. Policy Engine owns candidate
selection and unresolved-ambiguity outcomes.

For pattern 2.4, the brief must include the source-bound
[event/projection/text contract](../../design-agent-blueprint/references/event-projections-and-context-format.md).
Default to JSON as Analyzer output; permit YAML only as a configured output alternative.
Compile the selected semantic view as readable text sections, preserving meaning,
exact literals and necessary evidence/target handles. Checkpoint and reference
bindings belong in the private runtime manifest, not model text. Do not serialize
the runtime envelope into the prompt or repeat irrelevant empty collections.
Describe multi-policy groups and alternatives without granting model write authority.
Bind each input section to a Policy Engine projection rule: approved catalog,
accepted state/policy effects, current input, or relevant earlier checkpoint input.
Reusing Analyzer input requires current role/source authorization; never forward
the full Analyzer envelope or raw candidates to Composer by default.
Bind system first, role instructions then approved policy descriptions, a
provider-supported cache boundary, optional stable history and current semantic
content. Keep changing recent-memory summaries in current data. Rebuild the
trusted profile when definitions change; never promote policy data to instructions.
Apply the [architecture checklist](../../design-agent-blueprint/references/architecture-best-practices.md),
including optional interim status, delivery authority and release gates.
Keep schema/format/profile versions in
the runtime manifest. Put no turn IDs, hashes or routing timestamps in model
messages; current values belong in the selected semantic suffix.
Supply the contract content or a resolvable frozen resource to Cascade Prompt;
an opaque contract name alone is insufficient. Include the authoring checklist,
parser, semantic-text preservation and metadata-isolation tests plus cache measurements; no cache-hit claim
follows from prefix equality alone.
