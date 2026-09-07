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

`Analyzer → JSON delta → Policy Engine admission/selection → atomic commit → read projections → Context Compiler → Main Composer → response gate`

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
  contracts/       # events, deltas, claims, role contexts, responses, research
  identity/        # authenticated scope adapter and projected participant/profile identity
  analysis/        # proposal-only model adapter
  policies/
    definitions/   # versioned rule ownership and field registry
    data/          # policy-data schemas and persistence mapping
    projections/   # per-role selectors, mappings, redaction and budgets
    runtime/       # validation, reduction, evaluation and routing
  context/         # AnalyzerContext, ComposerContext and other role builders
  composition/     # ResponseContract, main response and optional voice presentation
  research/        # optional bounded web/KB retrieval
  persistence/     # state/memory/receipt ports and adapters
  delivery/        # canonical response, ordered audio, cancellation
```

Retain the selected application's public entrypoints, data owners, and deployment
boundaries. AI roles do not automatically become services, workers, or stack units.

## Default Decisions

Bind the installed or reviewed source version and digest of the owning plugin.
Use `cascade-ai-architect:design-agent-blueprint`, then the relevant workflow,
role, prompt-brief, and evaluation skills. Keep deterministic enforcement in the
target runtime. A missing dependency is a gap, not permission to recreate its
behavior in the host catalog.

Pattern 2.3 additionally binds the owning plugin's
[event/projection/text contract](../../../.codex/plugins/cascade-ai-architect/skills/design-agent-blueprint/references/event-projections-and-context-format.md):
checkpoint-grouped delta/state/context references, accepted events, read views,
Context Compiler, JSON Analyzer output (optional YAML) and compact block-text role input.
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
