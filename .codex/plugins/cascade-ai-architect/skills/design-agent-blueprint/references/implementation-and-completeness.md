# Implementation and completeness of Analyzer Policy Composer

Pattern: `analyzer-policy-composer@2.4`
Assessment scope: reference architecture and offline contract checks; extended 2026-09-08.

The architecture is implementable as a single application module with several
model calls. Its useful property is the explicit separation of semantic proposals,
deterministic admission/state ownership and response publication. It does not
establish that two calls outperform one; that requires a target-specific baseline.

## Structure and implementation boundary

```text
accepted event + authenticated scope
  -> Policy Engine/admission issues initial Analyzer task slice -> compile
  -> Analyzer adapter -> JSON StateDelta v3 -> safe parse/schema validation
  -> admission + candidate selection + staged reduction
  -> cross-group invariants -> one transaction/CAS + current state + receipt + pending work
  -> checkpoint-grouped current state -> Policy Engine/admission issues next role/task slice
  -> eligible scheduler + issued slice -> compact block-text compiler
       -> Main Composer -> response gate -> canonical response
       -> Researcher -> source-bound result -> Analyzer
       -> executor -> action receipt -> admitted runtime transition
  -> optional voice adapter -> per-channel delivery attempts and receipts
```

Start with one feature module, one transactional state store and direct in-process
calls. Map these responsibilities onto the target's existing module conventions.
Use [vertical use-case slices](simple-modular-agent.md); current records are the
authority. No accepted-event journal, stored read models or CQRS framework is
required. Event sourcing/read-model obligations below are conditional on adoption.
In a Bun/TypeScript target, runtime functions can be ordinary typed application
functions, model/provider clients can be adapters, and the store can expose one
`commit(expectedRevision, changeSet, receipt, dispatchIntents)` boundary. The
portable JSON schemas remain independent of that implementation language.

Use named entrypoints: `acceptEvent`, `issueRoleTaskSlice`, `compileContext`, `admitDelta`,
`stageChanges`, `commitChangeSet`, `decideTurn`,
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
| State | Single staged transaction, receipts, CAS, plans, choices, field identity | Store adapter, isolation tests, pending-work recovery and migrations; exact replay only for event-sourced targets |
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
The repository contains a design validator, synthetic fixtures and the executable
schema/value issuer/renderer/cache described below. The target domain Policy
Engine, state store, live authorization, provider integrations and UI remain
separate integration work.

## Previously missing parts now specified

### Cross-aspect source review, 2026-09-08

The subsequent simplification decision makes the [current-state vertical-slice
profile](simple-modular-agent.md) the default. Event-specific findings/gates in
this review apply to optional extensions; they do not require a journal, read
model, emitter or publisher in the baseline.

Conclusion: coherent reference design with concrete offline assembly/validation
code; ready to bind to a target, not a production implementation. The coverage
table above is the assessment across all fourteen behavior blocks. Author-performed
source review is not independent model evaluation or a numerical quality score.

| Finding | Source correction | Remaining evidence boundary |
| --- | --- | --- |
| Projection issuer and context formatter were conflated | Executable schema/value engine separates trusted profiles/values, issues opaque role/task-bound slices, rechecks host admission and formats only selected blocks | Offline mismatch/revocation/budget/cache tests exist; live domain rules, database snapshots and real tokenizer/provider integration remain target work |
| Analyzer model output and full runtime delta were described inconsistently | Transport and role contracts distinguish advertised semantic schema, runtime binding and complete-delta validation | The target still must implement the advertised schema/handle resolver/binder and adversarial adapter tests |
| Core flow obscured whether projections precede commit | Explicit stage -> atomic commit -> direct context build; projection failure cannot undo committed state | Database rollback and pending-work recovery; lag tests only for persisted async views |
| Voice role was credited with playback events | Model owns presentation; adapter/client owns observations and runtime owns receipts | Physical playback, barge-in and reconnect evidence |
| Changed catalogs could be put in the data suffix | Changed definitions rebuild a trusted role profile; accepted policy effects remain data | Provider authority mapping and role-specific semantic tests |
| Streaming validation order was underspecified | Whole-response validation is baseline; incremental release requires an explicit irrevocable-prefix protocol | No incremental publication implementation is supplied |
| Context size and cumulative hash work were insufficiently bounded | Reference renderer/request now enforce byte ceilings and incremental compatible prefix hashing | Target token budgets, concurrency/load and cache cost/latency measurements |
| New history/interim rules were missing from some artifact builders | Shared authoring checklist and affected role/workflow/prompt/evaluation/integration consumers aligned | Installed activation and target discovery are separate from source updates |

The strongest parts are ownership, typed multi-policy updates, consistent
projections and canonical-response/delivery separation. The largest practical
risks are incorrect semantic extraction, policy/selector implementation bugs,
source revocation across derived stores, external unknown outcomes, and serial
model-call latency. Schema correctness does not remove any of those risks.

Potential is highest for stateful assistants with multiple policies, auditable
actions, retrieval or typed/voice continuity. For simple one-shot tasks, two model
calls, journaling and projection machinery may cost more than their benefit.
Compare against a simpler baseline on held-out tasks; do not promote this default
as universally best. Full event sourcing, multiple services and an extra voice
model remain optional. Plain TTS and fixed interim phrases may meet the need.

Use [stateful-agent authoring best practices](architecture-best-practices.md) for
the acceptance checklist and explicit target decisions. Do not count every
described target obligation as another implemented feature.

### Reference extensions

The [executable block profile](executable-projections.md) implements trusted
YAML/JSON profile decoding, supported-schema selection, process-local opaque
slice issuance, admission rechecks, complete-request accounting through a supplied
counter, compact text and a bounded scoped local cache. A runnable example wires
all four roles through the implementation. Fixture callbacks and character
accounting prove local behavior, not live policy decisions or provider token use.

The [event/projection/transport extension](event-projections-and-context-format.md)
adds checkpoint-owned processing groups, accepted-event reconstruction requirements,
projection freshness/cursors, pure state transitions, multi-policy reference scope,
JSON transport (optional YAML), semantic text rendering with a private metadata
manifest, and a stable prompt cache boundary. Raw runtime-envelope serialization
is diagnostic only and must never supply model messages.
The [iterative caching contract](iterative-context-caching.md) adds ordered
system/role/policy assembly for all four roles, optional history data messages and
private cumulative cache candidates in the reference assembler. It specifies
consistent state/policy projections, memory placement, compaction and invalidation;
it does not implement production projection storage or provider cache operations.
The optional [interim response profile](interim-responses.md) defines status-only
Composer and Voice projections, a fixed-phrase fast path, cancellation/dedupe and
main-answer priority. Saved views exercise the renderer; scheduler, output-gate
and physical delivery cases remain target integration obligations.
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
