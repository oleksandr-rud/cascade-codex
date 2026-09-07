# Implementation and completeness of Analyzer Policy Composer

Pattern: `analyzer-policy-composer@2.3`
Assessment scope: reference architecture and offline contract checks; extended 2026-09-08.

The architecture is implementable as a single application module with several
model calls. Its useful property is the explicit separation of semantic proposals,
deterministic admission/state ownership and response publication. It does not
establish that two calls outperform one; that requires a target-specific baseline.

## Structure and implementation boundary

```text
accepted event + authenticated scope
  -> snapshot reader + Analyzer context builder
  -> Analyzer adapter -> JSON StateDelta v3 -> safe parse/schema validation
  -> admission + candidate selection + staged reduction
  -> cross-group invariants -> one transaction/CAS + accepted events + receipt + dispatch intent
  -> checkpoint-grouped state/context bindings -> read views
  -> scheduler + role context projection -> compact block-text compiler
       -> Main Composer -> response gate -> canonical response
       -> Researcher -> source-bound result -> Analyzer
       -> executor -> action receipt -> admitted runtime transition
  -> optional voice adapter -> per-channel delivery attempts and receipts
```

Start with one feature module, one transactional state store and direct in-process
calls. Map these responsibilities onto the target's existing module conventions.
In a Bun/TypeScript target, runtime functions can be ordinary typed application
functions, model/provider clients can be adapters, and the store can expose one
`commit(expectedRevision, changeSet, receipt, dispatchIntents)` boundary. The
portable JSON schemas remain independent of that implementation language.

Use named entrypoints: `acceptEvent`, `buildAnalyzerContext`, `admitDelta`,
`stageChanges`, `commitChangeSet`, `decideTurn`, `projectRoleContext`,
`validateResponse`, and `recordDelivery`. These are responsibility names, not a
requirement for separate classes, files, services or a generic workflow framework.
Only committed dispatch intents can reach a provider or action adapter.

If a durable queue is required, persist its outbox in the same transaction and
use idempotent consumers. Without an external queue, still recover undispatched
intents after a crash. Across multiple stores, explicitly choose a consistency
protocol and visible unknown/failure outcome; do not claim a cross-store atomic
commit merely because individual writes succeeded.

## Coverage of the fourteen behavior blocks

| Block | Reference design coverage | Remaining target binding / proof |
|---|---|---|
| Objective | Stateful conversation; explicit owners and optional variants | Domain success oracle, supported users, accuracy/latency/cost thresholds |
| Input | AcceptedEvent, evidence catalog, identity, closed delta operations | Authenticated ingress, STT finalization, attachment/media extraction and trusted source adapters |
| Output | ResponseContract, ResponseCandidate, CanonicalResponse, context gate | Output renderer, grounding/entailment checks and bounded semantic repair |
| Loop | TurnDecision, research dependency, scheduler and terminal routes | Concrete rule registry, deadlines, cancellation and task-wide budget ledger |
| State | Single staged transaction, receipts, CAS, plans, choices, field identity | Store adapter, isolation tests, crash recovery, exact replay and migrations |
| Context | Role schemas, mapping, independent bindings, current open turn | Selector/transform implementations, token accounting, redaction and source resolution |
| Memory | Recent window, task summary, durable notes, no-op and invalidation | Summarization triggers/models, fidelity tests, retention, deletion and rebuild |
| Tools | Proposal -> ExecutionCommand -> ExecutionReceipt | Allowlisted adapters, confirmation bindings, idempotency and unknown-outcome reconciliation |
| Skills/prompts | Role contracts and source-bound prompt-brief route | Versioned Analyzer/Composer prompts, model capabilities and regression corpus |
| Roles/handoffs | Analyzer, runtime, Main Composer, optional research/voice | Deployment-specific invocation identities, timeouts, resource ownership |
| Failure | Typed gaps, retry ceilings, stale work, partial outcomes | Fault injection, provider errors, outages and recovery UX |
| Observability | Event/revision/policy/context/response/delivery lineage | Redacted telemetry, retention, dashboards and operational alerts |
| Evaluation | Offline schema and relational regression suite, target acceptance cases | Independent semantic evaluation, held-out tasks, live providers and physical voice |
| Lifecycle | Explicit schema versions, rebuild/re-analysis on upgrade | Shadow rollout, rollback eligibility, compatible store migrations and release gates |

Coverage means the responsibility and required contract are defined. A row does
not become implemented or production-ready because it appears in this table.
The repository contains a design validator and synthetic fixtures, not the target
Policy Engine, state store, provider integrations or application UI.

## Previously missing parts now specified

The [event/projection/transport extension](event-projections-and-context-format.md)
adds checkpoint-owned processing groups, accepted-event reconstruction requirements,
projection freshness/cursors, pure state transitions, multi-policy reference scope,
JSON transport (optional YAML), semantic text rendering with a private metadata
manifest, and a stable prompt cache boundary. Raw runtime-envelope serialization
is diagnostic only and must never supply model messages.
Its codec checks are offline proof; event-store replay, domain reference resolution,
provider token accounting/cache hit rate and model adherence remain target gates.

- One transaction boundary including choice/plan changes, checkpoint and dispatch.
- Complete reference wire definitions and closed proposal operation union.
- Per-part deferred-choice records, exact option presentation and subsequent resolution.
- Plan proposals, stable runtime IDs, supersession and type-specific completion.
- Separate recent-window, task and durable memory projections.
- Configuration-owned agent identity and policy-triggered self-description.
- Ordered attributed messages, independent canonical status and delivery attempts.
- Explicit research/composition scheduling, reference resolution and context gaps.
- Execution command/receipt and canonical response/turn-decision contracts.

The value schemas and deterministic rule implementations referenced by policy IDs
remain target configuration. A schema registry entry alone does not implement a
rule. Profile activation must reject unresolved selectors, transforms, policies,
action contracts and output schemas. This is an explicit implementation gate.

## Required scenarios before target adoption

1. Apply two independent field groups in one revision; force the last invariant
   to fail and verify zero persisted values or dispatches. Replay and crash between
   commit/dispatch; verify one effect and a recovered receipt.
2. Select candidates in different parts; reject one multi-group candidate and
   verify none of its groups survive. Defer, present options, accept “the second
   one”, then test expired and superseded presentations.
3. Carry a decision from turn 1 into turn 50 through task memory; keep the recent
   window bounded, correct/delete the source and prove all dependent projections
   invalidate. Test stale summaries and an empty no-memory update.
4. Supersede a plan prerequisite, preserve dependent meaning, reject stale plan
   revisions, and reconcile a cancelled action with an unknown external outcome.
5. Reject forbidden selectors and unsupported references. Verify that Composer
   has the resolved content it needs and cannot treat memory text as instructions.
6. Wait for blocking research, enforce deadline fallback, deduplicate retries,
   and publish a nonblocking follow-up only under its own current response purpose.
7. Publish text, interrupt audio, repeat it and preserve all three delivery states.
   Test multi-speaker attribution, echo, reconnect and late old-epoch media.
8. Introduce the agent on first contact from its trusted definition, answer an
   identity question and reject user attempts to replace authenticated identity.

Offline tests cover wire/receipt consistency and selected invalid cases. The
scenarios above require a real target runtime; do not present synthetic receipt
validation as proof that a database or a speaker behaved correctly.

## Potential and tradeoffs

This design is a strong candidate for conversations with accumulated state,
policy-dependent actions, recovery and multiple output channels. Role projections
can reduce accidental state disclosure; receipts can improve diagnosis; canonical
response ownership can keep text and speech consistent. These are design
advantages to measure, not measured improvements from this checkout.

The cost is at least two sequential model stages for an ordinary answer and
additional stages for research/re-analysis. Runtime checks prevent unauthorized
operations, but they cannot establish that an extracted claim is semantically
correct. Ambiguous extraction, lossy summaries and overly restrictive projections
remain failure modes. Over-complicated policy registries can also make a small
product harder to maintain than a bounded single-call workflow.

Compare against a single-call baseline on the same held-out tasks and model
budget. Measure task success, unsupported claims, invalid/forbidden changes,
context omissions, clarification rate, recovery, p50/p95 response latency, first
audio latency and total tokens/cost. Only retain the split where its measured
benefit justifies that cost. Voice presentation can use deterministic TTS; another
LLM is optional. A separate autonomous planner, memory agent, or recursive
research coordinator is not a baseline requirement.

## Smallest implementation sequence

1. Implement text-only ingress, strict model output parsing, one policy profile,
   transactional state, minimal projections and canonical response publication.
2. Add plan/choice lifecycle and memory with deterministic failure tests.
3. Add a Researcher or executor only when the product needs its capability.
4. Add voice delivery with epochs, receipts and physical-device tests.
5. Run held-out evaluation, shadow the target path, then roll out with rollback
   and schema compatibility checks. Never roll old code back onto incompatible
   state; rebuild projections from canonical records where safe.

No domain data model, provider choice, database, hosting topology, release date,
or numerical quality target is selected by this reference. Those choices need
current target requirements. They remain explicit target work, rather than hidden
missing parts of an allegedly complete production implementation.
