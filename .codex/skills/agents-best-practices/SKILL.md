---
name: agents-best-practices
description: Use for provider-neutral Cascade or target-project agent/LLM system design or audit across loops, tools, permissions, context, memory, skills, connectors, observability, evals, cost, and safety.
---

# Agents Best Practices

Use when designing, auditing, adapting, or explaining Cascade itself or
target-project agent/LLM systems.

This repo-local skill owns Cascade's internal best-practice audit and source
mapping. Use the separately installed
`cascade-agent-architect:architect-ai-system` skill when the requested output
is a distributable, versioned agent architecture packet. Do not duplicate its
capability, topology, role, skill, workflow, or prompt-brief contracts here.

## Source Order

1. Latest user objective, constraints, autonomy expectations, and risk.
2. Current agent/runtime code, tool contracts, prompts, tests, and traces.
3. `AGENTS.md`, `CODEX.md`, `harness.config.yaml`, and relevant role or skill
   contracts.
4. Relevant boundary, context-memory, workflow, and testing patterns.
5. `references/harness-checklists.md` for multi-surface audits.

## Scope

This skill owns provider-neutral design and audit. Use `codex-maintenance` for
Codex file, hook, plugin, custom-agent, or validator changes. Do not patch
product/runtime code from this skill; route implementation through planning and
the repository implementation workflow.

## Checklist

1. Identify objective, autonomy level, risk, state duration, tool surface, and
   validation signal.
2. Separate model responsibility from harness responsibility: the model
   proposes; the harness validates, authorizes, executes, records, and returns
   observations.
3. Define tool contracts with narrow schemas, typed results, error states, and
   permission checks.
4. Define instruction hierarchy, scoped memory, retrieval, compaction triggers,
   and rehydration rules.
5. Define planning and goal behavior only when objective, budget, checkpoint
   cadence, and done condition are clear.
6. Add observability: trace events, metrics, failure probes, evals, launch
   gates, and recurring cleanup checks.
7. Prefer direct replacement of stale harness paths unless the target project
   has a proven live contract requiring temporary compatibility.

Use `references/harness-checklists.md` for deeper blueprint, tool-contract,
context, eval, observability, and mechanical-invariant checklists when the
design or audit spans more than one harness surface.

## Cascade Codex Patterns

Use `codex-maintenance` when the question is specifically about Codex
surfaces, files, permissions, hooks, MCP/tools, plugins, subagents, handoffs,
or validator wiring.

Use `architecture-review`, `secure-design`, or implementation planning when the
question moves from provider-neutral agent design into target-project runtime
boundaries, security-sensitive tool behavior, or code changes.

Load these when the harness question touches the relevant area:

- `docs/patterns/boundaries/index.md`
- `docs/patterns/context-memory/index.md`
- `docs/patterns/workflow/index.md`
- `references/harness-checklists.md`

## Output

- objective;
- harness boundaries;
- project agent/runtime boundaries when relevant;
- core loop;
- tool and permission model;
- context and memory plan;
- skills and connectors;
- observability and evals;
- minimal implementation path.
