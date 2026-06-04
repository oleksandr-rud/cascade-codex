---
name: agents-best-practices
description: Provider-neutral agent harness design and audit guidance for loops, tools, permissions, context, memory, skills, connectors, observability, evals, cost, and safety.
---

# Agents Best Practices

Use when designing, auditing, adapting, or explaining the harness itself.

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

## Portable Patterns

Load these when the harness question touches the relevant area:

- `docs/patterns/boundaries.md`
- `docs/patterns/context-memory.md`
- `docs/patterns/workflow.md`

## Output

- objective;
- harness boundaries;
- core loop;
- tool and permission model;
- context and memory plan;
- skills and connectors;
- observability and evals;
- minimal implementation path.
