# Component, Integration And Invariant Contracts

Load only for material component, state, integration or enforcement behavior.
The entrypoint owns readiness, truth axes, source authority and output depth.

## Component Responsibilities

For each participating component, state its bounded responsibility, accepted
and emitted triggers, owned state, integration IDs and visible effect. Keep
this owner map separate from Integrations when both are material.

Every visible control maps its exact UI state and reason to trigger, operation,
server guard, permission, completion meaning, denied result and recovery.
A shared UI state does not make an operation legal for all underlying reasons.
Record independent UI/product/API conflicts rather than silently picking one.

## Integrations

Describe each boundary with its own semantics; do not merge unrelated calls:

| Field | Contract |
|---|---|
| Initiator | Actor/event, exact trigger and preconditions |
| Authority | Permissions, tenant/account scope, guards and revocation |
| Operation | Source, destination, transport, operation, exact schema/contract |
| Payload | Canonical fields, validation and stable event/error/receipt IDs |
| Completion | Acknowledgement versus durable completion, sync/async status |
| Concurrency | Ordering, deduplication, idempotency scope, replay and fencing |
| Limits | Timeout, retry bounds, rate limits and stop rules |
| Effects | Writes, jobs, events, receipts and external effects |
| Recovery | Partial/unknown outcome, compensation, reconciliation, manual action |
| Visible states | Pending, success, empty, degraded, failure and legal recovery |
| Operations | Logs, metrics, traces, alerts and acceptance evidence |

Unknown fields stay UNKNOWN with an owner and readiness effect. Preserve exact
values, identifiers and normative obligations from authoritative sources.

For external mutation, trace authorization, durable queueing, worker claim,
the last atomic pre-dispatch fence, request-body dispatch and unknown outcome.
An authorization check cannot cancel already queued/claimed work. State the
deterministic result of callbacks, cancellation or completion racing each
stage, provider-call count and safe recovery after dispatch may have begun.

## Invariants And Enforcement

| Invariant | Durable enforcement point and mechanism | Race or exception | Recovery or repair | Acceptance evidence |
|---|---|---|---|---|

Map each material invariant to this row, including tenant isolation,
uniqueness, monotonic transitions, irreversible completion and no duplicate
external mutation when applicable. Test the mechanism against every escaping
transition. A UI guard, service intention, diagram or retry convention is not
durable enforcement. A predicate-bound constraint does not enforce states
outside its predicate. Missing mechanisms require NEEDS_INPUT.

Task slices use a separate Change Or No-Change column before Enforcement Point
And Mechanism. Distinguish a preserved invariant from the mechanism enforcing
it; keep race/failure, recovery and evidence in their own cells.

Acceptance includes reachable permission, duplicate, stale, timeout, partial,
unknown-outcome, failure and recovery cases. Use Given/When/Then when it makes
the observable boundary clear. Other sections cite these cases rather than
retelling them. Proposed tests remain NOT_RUN until actual execution exists.
