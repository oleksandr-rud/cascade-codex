# Simple modular agent with vertical slices

Contract: `simple-modular-agent@1.4`; default implementation profile for
`analyzer-policy-composer@2.4`, accepted 2026-09-08.
This replaces the earlier baseline requirement for an accepted-event journal
and reusable read models. Role authority and logical delta/context schemas stay
unchanged. This is a target design recipe, not new application source in Cascade.

## Default runtime

```text
module controller/handler -> application respond use case
  -> load current state and authorized input
  -> Policy Engine + admission issue Analyzer task slice -> compile -> Analyzer proposal
  -> validate/select/apply under policy
  -> transaction: current state + checkpoint/decision receipt + pending work
  -> Policy Engine + admission issue next role/task slice from committed state
  -> context compiler formats issued slice
  -> Composer -> validate/commit response -> text or voice delivery
```

One application/release boundary, one database and direct function calls. Current
records are the source of truth. `policyEngine.issueSlice(state, admittedTask, role)`
issues a role- and task-specific policy/state slice; `compileContext(slice)`
formats it. Neither requires a projection database, subscriber,
cursor, event bus or CQRS framework. A small `processRespond` function coordinates
the use case; Process Manager remains a responsibility, not a required framework.
Policy Engine and admission orchestration live in application code and invoke
typed rule/validation functions in the domain.
No general policy DSL, plugin registry or interpreter is required by this profile.
The [executable block profile](executable-projections.md) supplies these selection,
issuance and formatting functions for `schema-values-text@1`. Trusted agent
profiles bind object/schema/value blocks; host callbacks bind current admission
and token accounting. The low-level formatter alone is not an issued context.

Read state, call a model outside the database transaction, then open a short
transaction to check expected revision, apply policy-approved changes and save
the receipt. A stale revision triggers bounded reload/re-analysis, not a blind
merge. Never hold a database lock while waiting on a model, search or TTS.
Recheck dependencies before response publication and delivery. If context
building fails after commit, retry the projection or report a gap; state remains
committed. Critical state changes must not depend on notification listeners.

Keep checkpoint lineage, accepted messages, current policy data, pending work,
responses and delivery receipts as ordinary owned records. They support dedupe,
audit and recovery without promising reconstruction of every historical state.
Resume pending work after a crash according to its idempotency/unknown-outcome
contract. New observations enter the appropriate handler. They need not be stored
as domain events. In-memory emitters cannot be the only copy of pending work.

## Modules and vertical slices

Group modules by product capability, such as `assistant`. Controllers and inbound
handlers live at the module root. Application operations and DTOs live under
`application/`; shared policies and conversation invariants under `domain/`.
Shared conversation persistence lives under `data/`; agent-owned state and its
store can live inside the agent package. Folder colocation does not change the
store's data-access responsibility. These are internal layers in one module,
not global layers or services.
No `transport/` folder is required. Group a large application operation into its
own slice folder only when its size warrants it.

Illustrative expanded variant; create only files that actual behavior needs:

```text
modules/
  assistant/
    index.ts
    assistant.controller.ts
    research-result.handler.ts       optional asynchronous input
    application/
      respond.dto.ts
      respond.use-case.ts
      cancel.use-case.ts
      resume.use-case.ts              optional continuation
      admission.ts                   validates proposals and selects candidates
      policy-engine.ts               coordinates domain policy evaluation
      respond.test.ts
    domain/
      conversation.ts
      policies/
        response.policy.ts
        memory.policy.ts
        delivery.policy.ts
    agents/
      assistant-agent/
        definition.ts                identity, role and policy bindings
        analyzer.ts
        composer.ts
        researcher.ts                optional admitted retrieval
        voice-composer.ts            optional voice presentation
        state.ts                     agent-owned state types and invariants
        store.ts                     agent-owned persistence
        context.ts                   assembles role prompt and projected data
        projections/                 schema-values-text@1 profiles used by Policy Engine
        schemas.ts
        prompts/
    data/
      conversation.store.ts          records shared across agents
    tools/                           capability adapters when needed
    delivery/                        text/voice adapters when needed
```

Controllers/handlers bind authenticated input and invoke application use cases.
Caller-supplied DTO fields cannot establish authority. Application code owns
orchestration, transaction scope, retries and external calls. Domain policies own
rules/invariants and do not query databases or invoke provider SDKs. Data-access
code implements queries, mappings and transactions for the module's records.

Agent definitions encapsulate identity, prompts, role behavior, model-output
schemas and context builders. They reference domain policies rather than owning
another policy engine. Agent-specific policy variants also live in
`domain/policies/`; they cannot weaken module permissions. Accepted policy data
belongs to conversation state, not mutable prompt configuration.

Use `assistant-agent` for the concrete assistant definition. Reserve `base-agent`
for a real shared foundation with existing consumers; no base class or inheritance
hierarchy is required. Each package defines an agent type, not a singleton mutable
conversation. Its `store.ts` scopes records by tenant, conversation and agent
instance where applicable; `state.ts` describes those records without ORM imports.
Neither Analyzer nor Composer receives the store as a mutation capability.

An agent store can own that agent's accepted policy data, memory and checkpoint
state. Shared message history, conversation lifecycle and shared checkpoints keep
one owner in `data/conversation.store.ts`; references connect agent records to
that checkpoint rather than duplicating it or introducing a second turn object.
For an exclusively owned single-agent conversation, its store may own all these
records: do not create two stores for the same data merely to fill the tree.
When an operation updates both owners, the application use case supplies one
transaction and rechecks revisions before commit; stores do not independently
commit partial changes. Agent-local storage remains within the module boundary.

`projections/` contains trusted role/task-specific slice definitions and pure
mapping helpers consumed by Policy Engine and admission. Domain policies retain
disclosure and transition rules. Agent colocation does not give roles authority
to issue their own slices. `context.ts` formats issued slices with approved role
instructions, policy descriptions and history; it cannot read additional state
or select data independently. Small implementations may colocate these functions
while preserving their distinct inputs and authority.
`schemas.ts` owns model-output contracts; `prompts/` owns reviewed prompt assets.
If prompts come from a CMS, resolve and validate an approved version through an
adapter before assembly; CMS content cannot alter permissions or policy authority.

Several agents can share a conversation lifecycle inside this module. A materially
different lifecycle, data or permission owner can justify a separate product
module. Delivery can initially remain an internal response step; an independent
use case is needed only for separate scheduling/retries. Cross-module calls use
public operations; sharing a database does not permit cross-module table writes.

## File variants and responsibilities

| File/location | Responsibility |
| --- | --- |
| Module-root `*.controller.ts` / `*.handler.ts` | Transport input/output mapping and authenticated caller binding; invoke application operations |
| `application/*.use-case.ts` | One operation such as respond, cancel or resume; ordinary functions are sufficient |
| `application/*.dto.ts` | Input/result shapes and validation, separate from database models and model-output schemas |
| `application/*.service.ts` | Alternative naming if the target uses application services; use one convention and never duplicate a use case with a forwarding service |
| `application/*.processor.ts` | Optional substantial subprocess; not a mandatory extra layer |
| `application/admission.ts` | Validate schema/references/scope and select admissible proposals; application rechecks revision at commit |
| `application/policy-engine.ts` | Coordinate domain rules, accepted changes/routing and admission-bound issuance of role/task policy-state slices |
| `domain/policies/*.policy.ts` | Trusted deterministic rules, separate from collected values, prompts and I/O |
| `domain/conversation.ts` | State types and invariants; these are not ORM-specific records |
| `agents/<name>/context.ts` | Assemble role prompts and projected data as compact text; keep runtime metadata outside model messages |
| `agents/<name>/projections/` | Optional trusted role/task slice definitions and mappings invoked by Policy Engine/admission; no independent issuing authority |
| `agents/<name>/schemas.ts` | Agent/model output contracts, including allowed delta operations |
| `agents/<name>/state.ts` / `store.ts` | Agent-owned state contract / data-access implementation; application controls admitted writes and transaction scope |
| `data/*.store.ts` | Shared conversation persistence within this module; no duplicate ownership of agent records |
| `*.client.ts` | Provider transport and error translation; initially module-owned, shared only for real consumers |
| `*.emitter.ts` | Optional best-effort local notification; no required state change depends on listeners |
| `*.publisher.ts` | Optional external consumer contract; durable delivery needs explicit recovery guarantees |
| `*.job.ts` | Optional background entrypoint reusing the same application operation |

Use-case is the default name in this recipe. A small operation needs one use-case
file and a focused test; a separate DTO file is useful when the boundary is shared
or substantial. A larger operation can use `application/respond/` with its DTO,
use case and tests colocated. Do not create a handler/processor/service/repository
chain of forwarding files. Root handlers delegate to application code rather than
mutating storage directly. Shared domain services need a real cohesive operation.

Generic provider transport, block rendering/escaping and codecs can move to
`libs/` once actual consumers share stable mechanics. State selection, semantic
delta validation, policy decisions and persistence mappings remain module-owned.
Libraries do not import module internals or grant tool access. A tool using another
domain calls that module's public operation; a generic tool adapter is not permission.

## What is optional

| Mechanism | Introduce only when |
| --- | --- |
| Persisted read model / explicit CQRS | A measured read/query bottleneck, different access model or independently served consumer justifies synchronization/freshness machinery |
| Event journal | A specific audit/integration requirement needs accepted domain events; audit records alone do not make events the state authority |
| Full Event Sourcing | Historical state reconstruction/reprocessing is a real requirement and the team accepts event evolution, deletion and replay obligations |
| Broker and publisher/outbox | External or durable asynchronous delivery is required; ordinary in-process role calls do not need them |
| Additional process/service | Independent scaling, release ownership, security or failure isolation has concrete evidence |

The [event/read-model extension](event-projections-and-context-format.md) remains
available for those cases. Select the optional profile explicitly; do not inherit
its event batches, cursors or replay tests into the simple baseline.

## Preserved agent behavior and validation

Analyzer stays proposal-only. Policy definitions, accepted data and evaluations
remain separate logical concepts, even in one module/store. Main Composer owns
answer meaning; Voice presents committed text. Research requires an admitted
request. Interim status, cancellation, memory coverage, compact role text and
prefix caching work with current-state projection and require no event sourcing.

Baseline checks cover policy admission, multi-policy atomicity, stale revisions,
checkpoint dedupe, context disclosure/budgets, pending-work recovery, response
validation and actual channel receipts. Add event reconstruction/cursor tests
only for a selected journal/read-model/event-sourced profile. Target code and
database/provider integration remain target work; this recipe creates no runtime.
