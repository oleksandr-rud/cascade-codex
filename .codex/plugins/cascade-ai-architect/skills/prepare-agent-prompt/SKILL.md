---
name: prepare-agent-prompt
description: Compile one AI-architecture target into a source-bound prompt brief for Cascade Prompt. Use after capabilities, ownership, workflow, tools, permissions, state, recovery, stop rules, and success oracles are resolved; do not author, refine, grade, install, or promote the prompt here.
---

# Prepare Agent Prompt

Produce a prompt brief, not a prompt. Cascade AI Architect owns the
architecture-to-prompt mapping; `cascade-prompt:prompt` exclusively owns prompt
construction and prompt policy; `cascade-evals:prompt-evaluation` owns measured
prompt qualification.

## Inputs

Require one frozen prompt target and the smallest authoritative architecture
slice that defines:

- mission, non-goals, source authority, and completion oracle;
- owned capabilities and exclusive role boundary;
- workflow, state, context, memory, handoffs, recovery, and stop rules;
- typed tools, permissions, confirmations, side effects, and error behavior;
- output schema, model capability constraints, and evaluation cases.

Missing topology, ownership, authority, tool, state, or success decisions are
`BLOCKING_ARCHITECTURE_GAP`. Do not fill them from model memory or delegate
them to Prompt.

## Workflow

For an [Analyzer–Policy Engine–Composer blueprint](../design-agent-blueprint/references/analyzer-policy-composer.md),
bind separate briefs to the selected model roles: StateDelta-only Analyzer,
context-only Main Composer, optional canonical-text Voice Composer, and
request-only Researcher. Policy enforcement remains runtime code. Do not copy
full state, policy authority, or research tools into the voice brief.

For Analyzer, bind `AnalyzerContext` as its only context envelope and
`StateDelta` as its only semantic output. Explain how to use the supplied
identity, policy, conversation background, continuity and next-step blocks to
detect new facts, corrections, answers, intent and gaps without responding to
the user. For Main Composer, bind `ComposerContext` and its `ResponseContract`;
explain how to use admitted background, compact history, recent memory and the
complete current-task step projection authorized for that role while following
the selected answer mode, language, structure, limits, tone, required/forbidden
elements and missing-data behavior.
Source these contracts from
[StateDelta, policy data, and role projections](../design-agent-blueprint/references/state-delta-policy-projection.md);
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

For pattern 2.3, the brief must include the source-bound
[event/projection/text contract](../design-agent-blueprint/references/event-projections-and-context-format.md).
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
Bind stable role instructions/approved catalog first, a provider-supported cache
boundary, then selected semantic content. Keep schema/format/profile versions in
the runtime manifest. Put no turn IDs, hashes or routing timestamps in model
messages; current values belong in the selected semantic suffix.
Supply the contract content or a resolvable frozen resource to Cascade Prompt;
an opaque contract name alone is insufficient. Include the authoring checklist,
parser, semantic-text preservation and metadata-isolation tests plus cache measurements; no cache-hit claim
follows from prefix equality alone.

1. Select one semantic prompt target. Split targets that differ in mission,
   permissions, context, tools, output, or done condition.
2. Read `runtime/architecture-prompt-brief.md` for the field mapping and use
   `assets/prompt-brief.md` when a durable artifact is requested.
3. Preserve exact source locators, negations, enumerations, unknowns, and
   architecture digests. Classify unresolved prompt-only choices as
   `PROMPT_DECISION_GAP`; record any reversible architecture-approved default.
4. Set the requested Prompt operation: `Create`, `Refine`, `Diagnose`,
   `Convert`, `Compare`, or `Test`. Do not choose prompt patterns, examples,
   reasoning style, verbosity, or provider tier unless the architecture or
   user already fixed them.
5. Emit one complete `prompt-brief` plus its target slug, source digests,
   invalidation rules, and requested destination.
6. Hand the brief to `cascade-prompt:prompt` only when a final prompt is in
   scope. If that route is unavailable, return the usable brief with `BLOCKED`
   for prompt authoring; do not create a local substitute.
7. Hand a frozen prompt candidate to `cascade-evals:prompt-evaluation` only
   when measured qualification is requested and authorized.

## Boundaries

- Do not recreate or paraphrase Cascade Prompt instructions.
- Do not claim ownership of the resulting `prompt-candidate`.
- Do not execute the target task, call the prompt successful from self-review,
  or treat structural validation as model-behavior evidence.
- Do not write target prompt files without explicit write authority.

Finish when the architecture mapping is complete and every brief instruction
traces to a requirement, boundary, permission, output rule, or test. The
downstream prompt and evaluation remain separately versioned artifacts.
