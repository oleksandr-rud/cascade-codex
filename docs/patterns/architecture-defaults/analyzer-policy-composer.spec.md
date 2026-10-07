# Claims/actions agent architecture

This pattern selects [Cascade AI Architect version 3](../../../.codex/plugins/cascade-ai-architect/skills/design-agent-blueprint/references/analyzer-policy-composer.md)
for an explicitly adopted stateful conversational agent. The plugin owns the behavior
contract; this pattern owns its architecture-selection projection.

Analyzer returns typed claims/actions. Admission validates them before Policy Engine
orchestrates Researcher or Composer. Each role has its own authorized Context Builder.
Research returns as an observation through fresh analysis. The host owns state,
CAS/idempotency, budgets, effect authorization and atomic publication.

Start with direct host calls and one process. Bind a graph runtime only for a concrete
durable branch/join/recovery requirement. Do not infer agent topology from role names.
Claims keep support and uncertainty; protocol eligibility does not make them verified
domain state. Required independent semantic checks remain with Cascade Quality.

The old mutation wire, conversion adapter and graph implementation are retired.
Use the current schemas, executable callback runtime and target-specific integration
checks linked from the owning plugin. Fixture passes do not prove live provider quality.
