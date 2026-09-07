# Cascade AI Architect boundary

Cascade AI Architect owns AI-agent capability maps, topology, behavior
blueprints, agent workflows, role and skill design briefs, architecture-bound
prompt briefs, persona-derived user-model requirements, agent-evaluation
requests, and bounded improvement candidates.

It does not author prompts, execute or judge evaluations, build canonical
personas, compile simulation actors, operate targets, integrate assets into a
harness, or accept its own architecture. Those responsibilities remain with
Cascade Prompt, Cascade Evals, Cascade Personas, Cascade Simulations, Cascade
Coding Agent, the target host, and Cascade Software Architect respectively.

`capabilities.yaml` is the machine-readable route and dependency contract.
Every skill produces an artifact type with one repository-wide semantic owner.

For stateful conversational systems, the canonical behavior default is
[Analyzer–Policy Engine–Composer](../skills/design-agent-blueprint/references/analyzer-policy-composer.md),
with a [reusable blueprint template](../skills/design-agent-blueprint/assets/analyzer-policy-composer.template.md).
Blueprint, workflow, role, prompt-brief, and evaluation skills consume that
contract. Host architecture catalogs may index it and describe deployment fit;
they do not become a second owner of AI behavior or runtime policy.

The [wire schema bundle](../skills/design-agent-blueprint/references/agent-contracts.schema.json)
and [implementation/completeness assessment](../skills/design-agent-blueprint/references/implementation-and-completeness.md)
are plugin-owned reference artifacts. Offline validation checks candidate
contracts and synthetic receipts; target policy execution and provider behavior
remain separately implemented and evaluated.

The [event/projection/text extension](../skills/design-agent-blueprint/references/event-projections-and-context-format.md)
owns checkpoint grouping, accepted-event/read-view contracts, JSON transport (optional YAML),
compact context serialization and authoring rules. Cascade Prompt consumes those
rules through the frozen architecture brief; prompt wording remains its ownership.
The host `yaml` package supports the offline reference codec and does not create
a provider or event-store runtime dependency for this architecture package.
