# Stateful Agent Analyzer Policy Composer

- Pair ID: `analyzer-policy-composer`
- Graph: `docs/patterns/architecture-defaults/analyzer-policy-composer.graph.yaml`
- Status: `reference-default`
- Behavioral contract: [Cascade AI Architect](../../../.codex/plugins/cascade-ai-architect/skills/design-agent-blueprint/references/analyzer-policy-composer.md)
- Design template: [Agent variant template](../../../.codex/plugins/cascade-ai-architect/skills/design-agent-blueprint/assets/analyzer-policy-composer.template.md)

## When This Is The Default

Select this extension for stateful conversational agents, including voice and
optional web/KB research. It is the preferred starting point for this scope;
target evidence still determines adoption, adaptation, or rejection.

## Default Architecture

`Use-case handler/processor → Analyzer → JSON delta → Policy Engine → current-state transaction → direct context builder → Main Composer → response gate`

Default to a modular monolith with vertical use-case slices, current records and
ordinary calls. Context projection does not require CQRS, an event journal or
persisted read models. Adopt those only for demonstrated query, audit or replay needs.

Voice extends the validated canonical response with a presentation-only Voice
Composer. Researcher returns evidence through analysis only after runtime
admission of a research request. The
[plugin contract](../../../.codex/plugins/cascade-ai-architect/skills/design-agent-blueprint/references/analyzer-policy-composer.md)
owns claims, state, memory, policies, context, and voice semantics; use its
[design template](../../../.codex/plugins/cascade-ai-architect/skills/design-agent-blueprint/assets/analyzer-policy-composer.template.md).
This host pair owns catalog selection and deployment fit.

## State And Role Context Contracts

Use the plugin-owned
[StateDelta, policy data, and role projection contract](../../../.codex/plugins/cascade-ai-architect/skills/design-agent-blueprint/references/state-delta-policy-projection.md)
for typed changes, policy-specific records, context selection, and checkpointed
message memory. Its worked trace shows before/delta/after and Composer context.
The plugin also owns [machine wire schemas](../../../.codex/plugins/cascade-ai-architect/skills/design-agent-blueprint/references/agent-contracts.schema.json)
and the [implementation/completeness assessment](../../../.codex/plugins/cascade-ai-architect/skills/design-agent-blueprint/references/implementation-and-completeness.md).

## Reference File Structure

Adapt to the target's existing domain boundary; these are logical responsibilities,
not a scaffolding profile or a requirement to create empty modules:

```text
<agent-feature>/
  index.ts
  assistant.controller.ts
  research-result.handler.ts  # only for asynchronous input
  application/                # respond DTO/use case, cancel/resume, admission, policy engine
  domain/                     # conversation state and policies/
  agents/assistant-agent/     # definition, roles, state/store, context, schemas, prompts, projections
  data/                       # shared conversation records with one module owner
  tools/                      # capability adapters when needed
  delivery/                   # text/voice adapters when needed
```

Retain the selected application's public entrypoints, data owners, and deployment
boundaries. AI roles do not automatically become services, workers, or stack units.
For a small use case, one file plus a focused test is sufficient. Use the plugin's
[simple modular recipe](../../../.codex/plugins/cascade-ai-architect/skills/design-agent-blueprint/references/simple-modular-agent.md)
for file variants and handler/processor/service/emitter/publisher responsibilities.
No empty layers or global category folders are required.
Controllers/handlers live at the module root, without a transport folder.
Application operations use consistent use-case or service naming; do not add
both as forwarding wrappers. Domain policies remain independent of I/O.
Agent-local stores remain data-access implementations, called through application
orchestration after admission. Scope state to the conversation and agent instance;
reference shared checkpoints rather than duplicating history or turn objects.
The application coordinates one transaction when agent and shared conversation
records change together. An exclusively owned conversation may use one agent
store instead of creating a redundant module store. Use `assistant-agent` for the
concrete default; introduce `base-agent` only when actual reuse justifies it.

Projection means a role- and task-specific slice of policy and state issued by
Policy Engine and admission. Agent-local `projections/` holds trusted rules and
mapping helpers for that issuer. The Context Compiler receives the issued slice
and approved prompt assets, without store access or independent selection. This
also applies before the initial Analyzer call, to cached history, and to separate
client/task views for frontend progress. Task/step, revision and access bindings
stay in the private runtime manifest; model input stays compact semantic text.
Use the plugin's [executable projection profile](../../../.codex/plugins/cascade-ai-architect/skills/design-agent-blueprint/references/executable-projections.md)
for `schema-values-text@1`: trusted YAML/JSON profiles, selected schema/value
blocks, opaque issuance, admission rechecks, compact assembly and a bounded local
cache. Bind real host authorization and token accounting before target use. The
four-role runnable example is offline evidence, not a product backend or provider
cache implementation.

## Default Decisions

For workflows with dependencies or evidence branches, recommend the plugin's
[graph workflow authoring option](../../../.codex/plugins/cascade-ai-architect/skills/design-agent-blueprint/references/graph-workflow-authoring.md).
Review context slices, focused step prompts and runtime edges together. Record
selection or deferral; retain synchronous direct calls and existing authority.
This host catalog references the recommendation and does not own a second copy.

Bind the installed or reviewed source version and digest of the owning plugin.
Use `cascade-ai-architect:design-agent-blueprint`, then the relevant workflow,
role, prompt-brief, and evaluation skills. Keep deterministic enforcement in the
target runtime. A missing dependency is a gap, not permission to recreate its
behavior in the host catalog.

Pattern 2.4 additionally binds the owning plugin's
[event/projection/text contract](../../../.codex/plugins/cascade-ai-architect/skills/design-agent-blueprint/references/event-projections-and-context-format.md):
checkpoint-grouped delta/state/context references, direct Context Compiler,
JSON Analyzer output (optional YAML) and compact block-text role input. Event
journals/read-model cursors belong only to separately selected optional profiles.
Use its authoring rules and cache evidence requirements in downstream briefs.

## Validation Contract

Resolve graph/spec/template links and preserved architecture decisions. Bind
the plugin's acceptance cases to target tests, including no-request/no-research,
claims and memory provenance, state revision conflicts, context disclosure, and
voice ordering/cancellation. Template validation does not establish runtime,
semantic, provider, or physical-device effectiveness.

## Exceptions

A stateless transformation may use one bounded call; a fixed task may be fully
deterministic. An existing target may retain a different proven architecture.
Record why the exception satisfies the required authority boundaries. Treat
latency and cost as measured tradeoffs before adding model calls or services.
