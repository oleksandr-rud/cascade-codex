---
name: design-agent-blueprint
description: Turn a grounded capability map into a complete AI agent or agentic-system behavior blueprint. Use when selecting a single-agent versus multi-agent topology, defining per-agent missions and ownership, or specifying loops, state, context, memory, tools, permissions, skills, prompts, handoffs, recovery, observability, evaluation, rollout, and rollback before implementation.
---

# Design Agent Blueprint

For the incremental value of AI/voice, claims and events, memory, follow-ups,
or outcome closure, read [references/agentic-value.md](references/agentic-value.md).
Bind the result to the accepted Product requirements and existing behavior
blocks; do not introduce a separate product model or role hierarchy.

Design the smallest system that can satisfy the capability map. Keep semantic behavior contracts provider-neutral and separate from target-harness implementation.

When a versioned host pattern catalog materially constrains topology, consume
`cascade-software-architect:select-architecture-patterns`; do not copy its
pattern-selection procedure or treat a default as a mandate.

## Select the topology

Evaluate in order:

1. deterministic workflow with no model-controlled execution;
2. one agent with one focused instruction contract;
3. one agent with focused skills and tools;
4. manager with bounded specialists used as tools;
5. decentralized handoffs only when user-facing ownership transfers;
6. evaluator-optimizer only when refinement has a measurable oracle and finite budget.

For every added agent, require an exclusive responsibility, distinct context/tool/permission or parallelism benefit, typed interface, observable done condition, recovery owner, and local evaluation. Reject splits that merely mirror capabilities, phases, job titles, or documents. Record rejected alternatives and the evidence that would justify revisiting them.

## Build the system contract

Only when the user explicitly requests the Analyzer–Policy Engine–Composer
family (including `schema-values-text@1`) or an accepted target architecture
already adopts it, read [the stateful-agent profile](references/stateful-agent-profile.md).
A generic agent, tool, memory, or conversational request does not select this profile.

Define all fourteen behavior blocks in `references/behavior-blocks.md`. Then define each agent with:

- semantic slug, mission, represented user, non-goals, autonomy, and risk;
- accepted inputs, source authority, outputs, and done condition;
- owned capabilities and state; contributors and merge authority;
- act-observe-update loop and finite limits;
- context assembly, compaction, rehydration, and memory rules;
- typed tools, permission and confirmation rules, errors, and idempotency;
- prompt contracts and any justified skills; no separate skill is required for a simple agent;
- delegation or handoff packet, timeout, return, and escalation route;
- failure recovery and stop behavior;
- trace events, metrics, and local evaluations.

Do not hide application state in prompt history. The harness owns durable state, permissions, budgets, and tool enforcement. Prompts explain behavior but do not grant authority.

## Check completeness

- Map every capability to exactly one primary agent or deterministic workflow.
- Map the final system output to exactly one primary owner.
- Make shared contributors read-only or give them non-overlapping mutation scopes.
- Give every state-changing tool explicit permission and confirmation rules.
- Resolve every role, skill, workflow, prompt, tool, evaluation, and handoff reference.
- Convert missing authority or unsafe ambiguity into a `GAP`/`BLOCKED` packet, never a fabricated default.
- Define evaluation before claiming the topology is sufficient.

## Output

Use `assets/agent-blueprint.template.md` for the human-review surface and emit the `system`, `topology`, `behavior_blocks`, and `components.agents` fragments for `architecture.yaml`. Keep implementation-specific file paths as proposed targets until the user authorizes target writes.
