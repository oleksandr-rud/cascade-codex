# Analyzer, Admission, Policy Engine, and Composer

Pattern ID: analyzer-policy-composer
Version: 3.0
Owner: Cascade AI Architect
Status: reference-default for an explicitly adopted stateful conversational architecture

## Flow

~~~mermaid
flowchart TD
  O[Scoped input or observation] --> CA[Analyzer Context Builder]
  CA --> A[Analyzer: claims and action requests]
  A --> D[Admission: schema, evidence, scope and freshness]
  D --> P[Policy Engine: authorized orchestration]
  P --> CR[Researcher Context Builder]
  CR --> R[Researcher]
  R --> O
  P --> CC[Composer Context Builder]
  CC --> C[Composer]
  C --> V[Response checks and authorized publication]
~~~

These are logical boundaries. One process and ordinary function calls are sufficient.
Select a graph runtime only when durable branching, recovery or joins need it.

## Ownership

Analyzer returns analysis.v1: typed claims, action requests and explicit uncertainty.
It interprets meaning. It never returns writable fields, transactions, state patches,
permission, checkpoint identity, dispatch receipts or an answer.

Admission validates the complete declared result against the issued invocation:
registered subject and predicate/value schema, observation references, action payload, allowed
research sources, uncertainty and current scope/revision. Missing or malformed output
stops the iteration or enters an explicitly budgeted model repair. There is no prose,
keyword or legacy-wire fallback. Admission eligibility does not prove factual truth.

Policy Engine is application code. It obtains host authorization, records the admitted
analysis through compare-and-swap, chooses the declared eligible action and orchestrates
the next role. It owns budgets and stopping rules. Recording a claim retains its support
and uncertainty; it cannot silently approve the claim or mutate a domain field.

Each role has a Context Builder. The builder receives a host-authorized scope and fresh
snapshot, selects that role's permitted semantic view and supplies the relevant output
schema. Request identity, revision, invocation and authorization remain in a private
manifest. Retrieved material and conversation are data, not new instructions.

Researcher receives only a permitted query and source locators. Its observations go
through a new Analyzer invocation and Admission before Composer can use them. The
host retrieval adapter enforces source and network scope, cancellation and output limits.
Zero research requests produce zero retrieval calls.

Composer receives the current task, admitted claims with support/uncertainty, relevant
evidence and its response contract. It authors response meaning and presentation inside
those boundaries. It cannot write memory, run research, authorize tools or certify truth.
Host publication checks citation identity, scope and current revision, plus the target's
required independent semantic or policy gates, before atomic publication.
The reference runtime requires verifyResponse to return a digest-bound response-check.v1
assessment from a separate judge context. FAIL and UNRESOLVED cannot publish. The host
binds this assessment to its accepted Quality profile and actual evidence; a model
assertion or a fixture PASS is not a verified assessment or permission.

The host store owns authoritative state, terminal status, receipts, idempotency and recovery.
Replay of a COMPLETED or WAITING_INPUT request returns its existing response without
another model call or publication. New input is admitted by the host before reactivation.
Models and
graph checkpoints never grant authority. Authorized domain effects require a separate
host operation with its own contract; this profile has no model-authored state mutation.

## Executable contract

See [claims/actions admission](claims-actions-admission.md),
[schemas](agent-contracts.schema.json), and [reference runtime](../scripts/agent_runtime.mjs).
The runtime exposes createAgentRuntime, separate role context builders and explicit
host/model callbacks. Every host callback must enforce scope, CAS, idempotency,
AbortSignal and publication checks. Transports send only context.messages to the model; private manifests
and authorization remain in trusted adapter code. Custom builders are reviewed host
assets and cannot be supplied or chosen by a model.
A transport timeout with uncertain effects requires reconciliation before
retry. The example is a tested portable reference, not an implemented target application.

For stateless transforms or fixed deterministic tasks use a simpler workflow. For an
existing different architecture, adoption requires an explicit target decision.
