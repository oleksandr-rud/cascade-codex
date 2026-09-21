# Selective state, claims and memory

Status: optional reference implementation and authoring pattern, version 2.
Select when a target needs evolving evidence, corrections, partial knowledge,
or reusable task memory. This is not a requirement to turn all state into a
graph, adopt a graph database, or migrate an existing coherent application.

## Choose the representation by authority

| Information | Representation and owner |
|---|---|
| Execution status, permissions, receipts, approved operational values | Domain records; runtime/domain commands own changes |
| A reported, inferred, disputed or revisable assertion | Identifiable claim; model proposes, runtime admits |
| Original message, document or observation | Versioned source; ingress owner |
| Task summary or durable note | Derived memory with source dependencies, scope and invalidation |
| Semantic entity relationship | Claim with a typed entity reference and supporting evidence |
| Source, supersession and memory dependencies | Structural links recorded or derived by runtime |

Claims describe knowledge; StateDelta describes proposed changes. Reuse the
existing [Operation and StateDelta contracts](state-delta-policy-projection.md).
A claim does not approve a budget, grant permission, complete a job, or register
a new predicate. Admission means accepted as a scoped assertion, not proven true.
Prefer a direct domain field when uncertainty/provenance/correction does not
warrant a separate claim. Reference authoritative values instead of maintaining
independently editable copies. An approved domain value may retain its decision
history even when its supporting claim later becomes stale; dependent operations
need an explicit domain policy for that situation.

DDD aggregates own invariants and transactions. A graph edge crossing aggregate
boundaries grants no write authority. Use one project-intake module for the
worked example; do not create a service or aggregate for every table or noun.

## Section-based context issuance

For each selected role, define source selectors, purpose, required/optional
status, freshness, disclosure rules, dependency identities, size limit and gap
behavior. Start from the [section template](../assets/selective-memory/context-sections.template.json).
These are authoring fields, not a new RoleContext wire schema.

1. Stable role instructions and response schemas come from trusted configuration.
2. Current input remains attributed source data; an admitted interpretation is
   a separate typed proposal. Initial Analyzer context uses the current message,
   known task and bounded continuity, before any semantic retrieval assessment.
3. Domain state comes from a consistent committed snapshot.
4. Evidence/claims preserve support classes, contradictions and absent knowledge.
5. Continuity and task/durable memory carry coverage and source dependencies.
6. Pending work and observed receipts come from runtime, not generated prose.
7. Response requirements carry authorized obligations and explicit gaps.

The Policy Engine issues the slice. The Context Compiler only renders it.
An unresolved question uses the [typed clarification contract](clarification-contract.md):
admit references and issue permitted display details before composing a question.
Do not reconstruct candidate identity from a prose question. Unknown values and
conflicting reports have explicit paths; existing durable choices retain their owner.
Meaning-dependent relevance, identity resolution and conflict interpretation
remain LLM assessments; exact references, revisions, budgets and authorization
remain code. Just-in-time retrieval follows an admitted request and a bounded
reissue; it cannot bypass the first invocation's disclosure checks.

## Gradual evolution

Grow knowledge within the existing schema through typed proposals. Distinguish
unknown, conflicted, not applicable and uncollected values using the target's
registered vocabulary. Missing fields do not mean false or deletion.

Grow the schema through separately reviewed, versioned changes backed by failed
cases. Model suggestions do not activate predicates or migrations. Keep schema
versions separate from content revisions and recorded time separate from validity
time when the target needs temporal assertions. The example has content revisions
and correction lineage; it does not implement a temporal query engine.

Start with current-state storage and derived links. Add richer graph retrieval
only for demonstrated relationship/dependency queries. A derived graph is not a
second mutable source of truth. Summary compression cannot strengthen evidence.
Invalidate memory after changes to its claims, relevant competing claims, sources
or authority. Preserve unrelated valid contexts. Runtime-assigned IDs, revisions
and request keys remain outside model authority.

## Executable example and evidence boundary

The [prepared-data example](../assets/selective-memory/README.md) uses SQLite and
existing `Operation` schemas. It implements one atomic group with claim proposals,
supersession and task-summary replacement, plus explicit host budget approval,
source revocation, derived graph links and bounded context issuance.
It is not a full StateDelta executor, production authentication adapter, live
LLM pipeline, policy language or replacement for the packaged schema bundle.

Backend tests prove exact boundaries, rollback, retries, stale revisions,
scope isolation, contradictions and invalidation on synthetic data. One negative
control deliberately supplies a semantically wrong amount with a real quote:
structural validation accepts it. This is an explicit demonstration of the
remaining semantic evaluation boundary, not proof that the amount is correct.

Use the [development cases](../assets/selective-memory/evaluation-cases.json) to
prepare an architecture subject through `cascade-ai-architect:prepare-agent-evaluation`;
run semantic judging through `cascade-evals:agent-evaluation`. They are visible
development seeds, not sealed held-out evidence or an executable eval request.
Compare frozen baseline/candidate versions of prompts, schemas, state policy,
memory and section selection, with repeated runs, isolated judges and observed
outcomes. Measure grounding, correction handling, obligation coverage, stale
memory, calls, latency and cost. Never promote fixture passes into model quality.
