# Cascade Harness Maintainer architecture

## Ownership

Cascade Harness Maintainer owns target-repository harness inspection,
adaptation, integration, repair, and maintenance guidance. A target repository
remains authoritative for its own instructions, configuration, skill and role
contracts, hooks, tools, validators, scenarios, and release policy.

It does not own:

- general AI-agent architecture, which belongs to Cascade Agent Architect;
- prompt authoring, which belongs to Cascade Prompt;
- generic evaluation mechanics and judge contracts, which belong to Cascade
  Evals;
- synthetic personas, actors, bounded execution, or frozen-run review, which
  belong to Cascade Simulations.

## Dependency graph

```text
cascade-harness-maintainer
  -> cascade-agent-architect (only when agent-system design is required)
  -> cascade-evals (harness evaluation lifecycle)
  -> cascade-prompt (only for a prompt-specific repair)
  -> cascade-simulations (only when an approved dynamic run is required)

cascade-agent-architect -> cascade-evals, cascade-prompt, cascade-simulations
cascade-evals -> cascade-simulations (only for dynamic execution adapters)
```

No dependency points back to Cascade Harness Maintainer. Resolve every optional
dependency from the exact installed-and-enabled plugin inventory, bind its
version and skill digest into the receipt, and fail closed when required.

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

## Change rule

Keep one authoritative owner per behavior. Preserve candidate, installed,
enabled, executed, evaluated, accepted, and released states separately. Do not
copy another plugin's runtime contract into a target repository. Prefer a
namespaced dependency and a version-bound integration receipt.
