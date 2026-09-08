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
owns checkpoint grouping, optional accepted-event/read-view contracts, JSON transport (optional YAML),
compact context serialization and authoring rules. Cascade Prompt consumes those
rules through the frozen architecture brief; prompt wording remains its ownership.
The host `yaml` package supports the offline reference codec and does not create
a provider or event-store runtime dependency for this architecture package.
The [stateful-agent authoring checklist](../skills/design-agent-blueprint/references/architecture-best-practices.md)
connects those contracts to role/workflow/prompt/evaluation consumers, optional
interim and iterative-cache profiles, and explicit target adoption gates. Source
conformance and offline fixture passes do not establish installed activation.
The [simple modular profile](../skills/design-agent-blueprint/references/simple-modular-agent.md)
is the implementation default: current state, vertical use-case slices and direct
context builders. Event sourcing/CQRS and emitter/publisher infrastructure remain
explicit optional choices rather than generated requirements.

The [executable projection profile](../skills/design-agent-blueprint/references/executable-projections.md)
binds `schema-values-text@1` to strict source decoding, schema-ordered field
selection, admission-bound role/task slices, compact text assembly and a bounded
local rendered-block cache. Its four-role example is wired through the same
implementation. Skills, role templates and agent entrypoints consume this
contract; the host supplies real admission, token accounting and dispatch.
