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
