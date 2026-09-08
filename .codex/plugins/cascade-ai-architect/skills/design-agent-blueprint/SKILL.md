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

For stateful conversational agents, use
[Analyzer–Policy Engine–Composer](references/analyzer-policy-composer.md) as the
preferred reference default and fill
[its template](assets/analyzer-policy-composer.template.md). Analyzer emits only
state-change proposals; deterministic runtime owns policy, state, and context;
Main Composer owns canonical meaning. Voice adds presentation-only composition;
Researcher runs only for an admitted delta request. Read the contract before
adopting it. Record target evidence, variants, and any exception; this default
does not assert measured superiority or require separate services.
Use the [simple modular profile](references/simple-modular-agent.md) by default:
vertical use-case slices, current-state transactions and direct context builders.
CQRS, persisted read models, event sourcing, brokers and generic process-manager
frameworks are optional decisions with concrete evidence, not template defaults.

When specifying delta updates, policy data, memory or downstream context, read
[the state and projection contract](references/state-delta-policy-projection.md).
Use [the machine schema bundle](references/agent-contracts.schema.json) as the
wire authority and [the completeness assessment](references/implementation-and-completeness.md)
for target implementation gates. Validate candidate payloads using
`python3 scripts/validate_agent_contracts.py` and run
`python3 scripts/test_agent_contracts.py` from this skill directory when modifying
these contracts. Separate definitions, collected values and derived evaluations; bind field
identity, transaction/no-op semantics, role projections and summary coverage.

For this pattern, also bind [event projections and model text](references/event-projections-and-context-format.md):
checkpoint-owned attempts/deltas/state/context references; optional accepted-event
journals/read-model cursors; multi-policy local/canonical references; JSON Analyzer output (optional YAML);
and compact block-text role inputs with a stable prompt/catalog prefix. Follow
its authoring rules in role, workflow and prompt briefs. Do not add a duplicate
TurnState store or send raw YAML/JSON state catalogs as model context.
Runtime envelopes are not model payloads. Policy Engine builds a semantic prompt
view; render it as readable text sections with `role-text@1`. Keep checkpoint,
revision, digest, timing and invocation metadata in a private runtime manifest,
outside both prefix and suffix. Expose only reference handles needed to cite or
address task content. `compileBlocks` is a diagnostic codec only.
For conversation reuse, follow [iterative caching](references/iterative-context-caching.md):
system then role instructions then policies; optional admitted history precedes
current state/policy effects. Projection freshness and access checks precede reuse.
Keep cache candidates private and specify summary/window invalidation.
When interim text or voice feedback is requested, use the optional
[interim response profile](references/interim-responses.md): existing status purpose,
approved phrase selection, current role projections and nonblocking delivery gates.
The host reference codec uses its existing `yaml` package. Run
`bun test ./scripts/context_transport.test.mjs` from this skill directory after
changing transport or rendering. Provider cache hits and semantic output reliability
require separate target evidence.

For scopes outside that default, evaluate in order:

1. deterministic workflow with no model-controlled execution;
2. one agent with one focused instruction contract;
3. one agent with focused skills and tools;
4. manager with bounded specialists used as tools;
5. decentralized handoffs only when user-facing ownership transfers;
6. evaluator-optimizer only when refinement has a measurable oracle and finite budget.

For every added agent, require an exclusive responsibility, distinct context/tool/permission or parallelism benefit, typed interface, observable done condition, recovery owner, and local evaluation. Reject splits that merely mirror capabilities, phases, job titles, or documents. Record rejected alternatives and the evidence that would justify revisiting them.

## Build the system contract

For the stateful reference family, apply the shared
[architecture authoring checklist](references/architecture-best-practices.md).
Carry its source-bound obligations into roles, workflow, prompt and evaluation
briefs; distinguish source conformance from target activation and runtime proof.
Use the [executable schema/value projection contract](references/executable-projections.md)
for the default representation and wiring: trusted YAML/JSON profiles, admitted
role/task slices, compact object/schema/value blocks and scoped local block reuse.
Bind the supplied issuer to current host admission and token accounting. Use its
four-role fixtures as examples; raw formatter success is not admission evidence.

Define all fourteen behavior blocks in `references/behavior-blocks.md`. Then define each agent with:

- semantic slug, mission, represented user, non-goals, autonomy, and risk;
- accepted inputs, source authority, outputs, and done condition;
- owned capabilities and state; contributors and merge authority;
- act-observe-update loop and finite limits;
- context assembly, compaction, rehydration, and memory rules;
- typed tools, permission and confirmation rules, errors, and idempotency;
- focused skills and prompt contracts;
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
