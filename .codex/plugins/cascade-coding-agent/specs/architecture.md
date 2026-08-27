# Cascade Coding Agent architecture

## Ownership

Cascade Coding Agent owns target-repository harness inspection,
adaptation, integration, repair, and maintenance guidance. A target repository
remains authoritative for its own instructions, configuration, skill and role
contracts, hooks, tools, validators, scenarios, and release policy.

It does not own:

- general AI-agent architecture, which belongs to Cascade AI Architect;
- software, plugin, and workflow architecture review, which belongs to Cascade
  Software Architect;
- prompt authoring, which belongs to Cascade Prompt;
- generic evaluation mechanics and judge contracts, which belong to Cascade
  Evals;
- canonical personas and purpose-limited projections, which belong to Cascade
  Personas;
- executable actors, bounded execution, controller integrity, or frozen-run
  review, which belong to Cascade Simulations.

## Dependency graph

```text
cascade-coding-agent
  -> cascade-ai-architect (only when agent-system design is required)
  -> cascade-software-architect (only when system boundaries or review are required)
  -> cascade-evals (harness evaluation lifecycle)
  -> cascade-prompt (only for a prompt-specific repair)
  -> cascade-personas (only when a canonical human model or projection is required)
  -> cascade-simulations (only when an approved dynamic run is required)

cascade-ai-architect -> cascade-evals, cascade-prompt, cascade-personas, cascade-simulations
cascade-software-architect -> cascade-ai-architect and domain plugins only as artifact consumers
cascade-evals -> cascade-simulations (only for dynamic execution adapters)
```

No dependency points back to Cascade Coding Agent. Resolve every optional
dependency from the exact installed-and-enabled plugin inventory, bind its
version and skill digest into the receipt, and fail closed when required.

Cascade Personas and Cascade Simulations remain independently usable. A
simulation-backed persona handoff is conditional: Personas owns the immutable
projection and privacy authority; Simulations owns its runtime validation,
actor policy, mutable state instance, controller, and run receipt. Neither
plugin may copy the other's implementation as an offline fallback.

## Harness surface map

Audit only the surfaces present in the target repository:

1. boot instructions and source precedence;
2. runtime routing and task admission;
3. skills, agents, tools, connectors, permissions, and handoffs;
4. context, memory, compaction, and rehydration;
5. hooks, observability, traces, budgets, and stop behavior;
6. evaluation catalogs, mechanical assertions, semantic profiles, and release
   gates;
7. validators, tests, generated artifacts, installation, and discovery;
8. durable docs, ownership, invalidation, and deprecation paths.

When integrating an agent workflow, Cascade AI Architect owns the portable loop,
state, roles, handoffs, recovery, budgets, and stop conditions. Cascade Coding
Agent binds that candidate to the target's actual roles, namespaced skills,
execution surfaces, authorization evidence, paths, write scopes, merge owner,
validation, and activation state. The binding is an integration receipt, not a
second work graph or prompt bank.

## Change rule

Keep one authoritative owner per behavior. Preserve candidate, installed,
enabled, executed, evaluated, accepted, and released states separately. Do not
copy another plugin's runtime contract into a target repository. Prefer a
namespaced dependency and a version-bound integration receipt.
