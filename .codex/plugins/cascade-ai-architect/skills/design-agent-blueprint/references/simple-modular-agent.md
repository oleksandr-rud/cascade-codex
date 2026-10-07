# Simple modular claims/actions agent

Contract: `simple-modular-agent@2.0`; implementation recipe for
[analyzer-policy-composer@3.0](analyzer-policy-composer.md). This recipe supplies
target boundaries; Cascade does not implement the target's database or provider.

## Default flow

```text
authenticated request -> read current host snapshot
  -> authorize Analyzer -> Analyzer Context Builder -> Analyzer
  -> Admission validates claims/actions -> host records admitted analysis
  -> Policy Engine checks current authority and bounds
     -> RESEARCH: Researcher Context Builder -> Researcher
        -> record source observations -> fresh Analyzer + Admission round
     -> COMPOSE/CLARIFY: Composer Context Builder -> Composer
        -> independent response check -> authorized CAS publication
     -> STOP / unresolved / budget exhausted
```

Use one application boundary, one transactional store and direct function calls.
Admission accepts typed claims and action requests; it does not translate them
into a second mutation proposal protocol. Policy Engine owns action sequencing.
Every role receives its own freshly built context from the issued snapshot and
admitted request. Authority and runtime identity remain in the host manifest.

Read state and call models outside a transaction. Commit admitted analyses,
observations and responses with expected revision, idempotency and a receipt
bound to the exact operation. Re-read to verify that the host stored required
evidence and the intended terminal response. A stale context blocks the affected
operation; retries require a newly authorized snapshot and explicit bounds.

The [reference runtime](../scripts/agent_runtime.mjs) defines the callback
boundary: `readState`, `authorize`, `recordAnalysis`, `recordObservation`,
`verifyResponse` and `publish`. The adopting host owns actual permissions,
durability, independent semantic judging, provider execution and cancellation.

## Ownership and file placement

Keep a product capability such as `assistant` in one module. Controllers and
inbound handlers authenticate and invoke application operations. Application
code owns orchestration, admission and transaction scope; domain code owns
trusted policy rules without provider or database calls. Agent assets own
reviewed role prompts, output schemas and per-role Context Builders. Stores own
data access and scope records by tenant/request as required by the target.

Create only files needed by the target's actual behavior:

| Location | Responsibility |
| --- | --- |
| Module controller/handler | Authenticate input and invoke the application operation |
| `application/respond.use-case.ts` | Coordinate the bounded claims/actions flow and host callbacks |
| `application/admission.ts` | Validate schemas, issued identifiers and references; no meaning heuristics |
| `application/policy-engine.ts` | Choose permitted execution under current domain rules and host authority |
| `domain/policies/` | Pure trusted rules and invariants |
| `agents/assistant-agent/schemas.ts` | Analysis, research and response output contracts |
| `agents/assistant-agent/context/` | Separate Analyzer, Researcher and Composer Context Builders; colocate in one file when small |
| `agents/assistant-agent/prompts/` | Reviewed role instructions and explicit data boundaries |
| `agents/assistant-agent/state.ts` / `store.ts` | Owned state types and persistence callbacks |
| `data/conversation.store.ts` | Shared conversation records only when several agents need one owner |
| Provider/tool adapters | Real execution, source restrictions, cancellation and observed receipts |
| Independent response verifier | Frozen Quality profile, distinct judge context and evidence-bound typed verdict |

Use an agent-owned store or a shared conversation store according to actual
ownership; do not create duplicate stores for the same records. Model roles
receive neither a store nor a write API. Context Builders cannot issue their own
access. A generic formatter may be shared after real reuse; permissions, state
selection and claim support remain owned by the application.

## Recovery and optional mechanisms

Persist pending work before external effects when the target needs crash
recovery. Unknown outcomes require reconciliation and a host decision before
retry; in-memory notifications cannot be the only record. A completed request
returns its stored response. A request waiting for user input returns its pending
question until a new user observation is admitted. Neither replay invokes a
model or repeats publication.

Introduce a graph only for material branches/joins or recovery boundaries; an
accepted workflow owns behavior and [bind-agent-runtime](runtime-binding.md)
owns its concrete adapter. Event sourcing, brokers, separate read models and
additional processes require an explicit target need and their own consistency,
deletion and recovery contracts. Voice or streaming requires separate delivery
evidence and irreversible-output rules.

## Acceptance

Bind tests for strict old-wire rejection, unissued evidence/subjects/sources,
fresh per-role context, denied permissions, compare-and-swap conflicts,
idempotent publication, research re-analysis, independent response rejection and
bounded execution. Add actual database/provider/reconciliation evidence when
the target adopts those adapters. Controlled callback tests verify reference
boundaries; they do not establish live semantic quality or delivery.
