---
name: bind-agent-runtime
description: Bind an accepted agent workflow to the smallest concrete host runtime, including role Context Builders, structured output, Admission, Policy Engine orchestration, persistence, recovery and optional graph execution. Use for implementation-ready runtime contracts or an audit of actual runtime ordering; first resolve missing behavior with design-agent-workflow.
---

# Bind Agent Runtime

Produce a runtime-binding candidate from one accepted agent-workflow owned by
cascade-ai-architect:design-agent-workflow and the target's
actual runtime constraints. Do not execute, install or promote it here.

1. Bind the accepted workflow revision, outcomes, role owners, inputs, tools, scopes,
   budgets and required evidence. Missing authority or behavior remains GAP.
2. Prefer direct host calls. Choose a graph runtime only when branching, durable joins
   or recovery make it useful. Preserve the selected target runtime, without adding
   a graph, subagents, services or a framework dependency by default.
3. Specify each role's Context Builder, input slice, model output schema, private host
   manifest, Admission checks and post-call freshness check. LLMs interpret meaning;
   code validates declared fields and existing authority. Invalid output is unresolved
   or enters a bounded model repair, never a prose or keyword fallback.
4. For the explicitly adopted claims/actions profile, use
   [the shared runtime](../design-agent-blueprint/scripts/agent_runtime.mjs) and
   [architecture contract](../design-agent-blueprint/references/analyzer-policy-composer.md).
   Analyzer -> Admission -> Policy Engine precedes each Researcher/Composer handoff.
   Research evidence requires a new analysis round; role context is rebuilt each time.
5. Bind store CAS, request/scope isolation, idempotency, deadlines, cancellation,
   unknown-effect reconciliation, independent response gates and atomic publication.
   A checkpoint stores execution references and never establishes permission.
6. Map every branch and terminal state to observable evidence. Test direct composition,
   research feedback, denial, invalid schema, stale state, cross-scope access, bounded
   retry and uncertain effects through the target adapter. Fixture coverage alone does
   not prove provider behavior or a working production graph adapter.

Return the runtime-binding, exact target dependencies, role/context/authority map,
branch and recovery contracts, validation evidence and NOT_RUN boundaries. Hand authorized
integration to cascade-engineering:integrate-agent-assets. This replaces the old
framework-specific graph design entrypoint; no legacy execution adapter is retained.
