# Frontend Realtime Strategy

- Pair ID: `frontend-realtime`
- Graph: `docs/patterns/architecture-defaults/frontend-realtime.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Extend the frontend when users need bounded-latency progress, presence,
collaboration, live operations, or remote changes and focus refresh or polling
does not meet measured freshness and cost needs.

## Default Architecture

```text
server realtime contract
  -> shared connection manager
  -> feature subscription registry
  -> schema/order/dedupe normalization
  -> query and client-state reconciliation
  -> live / reconnecting / stale / degraded UI
```

Select the cheapest sufficient transport:

| Need | Default |
|---|---|
| Fresh on entry or focus | Refetch |
| Bounded freshness with simple infrastructure | Polling with visibility/backoff rules |
| One-way server push | Server-sent events |
| Bidirectional low-latency session | WebSocket |
| Existing GraphQL contract and governance | Subscription |
| Background device notification | Platform push as an invalidation hint |

## Reference File Structure

```text
src/features/<feature>/
  data/realtime/
    subscription.*
    events.*
    reconcile.*
  interface/states/
src/shared/realtime/
  connection.*
  auth.*
  registry.*
  envelope.*
  ordering.*
  backoff.*
  observability.*
tests/realtime/
```

Features own event meaning and state reconciliation. Shared code owns transport
mechanics, connection lifecycle, and generic envelope handling.

## Default Decisions

- Start with focus refresh or polling; move to SSE or WebSocket only for proven
  latency, direction, scale, or session needs.
- Authenticate and tenant-scope every connection and subscription. Refresh
  credentials without leaking old account or tenant state.
- Reconnect with bounded exponential backoff and jitter. Resume from a cursor
  when supported; otherwise refresh an authoritative snapshot after gaps.
- Validate schema, deduplicate, define ordering/version rules, and reconcile
  realtime changes with query caches and optimistic mutations.
- Expose connecting, live, reconnecting, stale, degraded, and unavailable
  states when freshness affects user decisions.

## Validation Contract

- Exercise auth expiry, tenant/account switch, duplicate, reorder, gap, burst,
  backpressure, disconnect, offline, server restart, background/foreground, and
  resubscription.
- Verify old subscriptions release on unmount, logout, tenant switch, and app
  shutdown.
- Verify events cannot bypass current authorization and do not resurrect stale
  optimistic or cached state.
- Measure connection success, lag, gaps, drops, reconnects, subscription count,
  payload errors, and user-visible freshness.

## Exceptions

Collaborative editing may need CRDT or operational-transform semantics,
presence TTLs, and document-specific compaction. High-volume market or
telemetry feeds may need worker threads, sampling, and explicit backpressure.
Document those policies while preserving feature ownership and the shared
connection adapter boundary.
