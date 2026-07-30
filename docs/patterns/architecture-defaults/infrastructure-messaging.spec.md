# Messaging Infrastructure

- Pair ID: `infrastructure-messaging`
- Graph: `docs/patterns/architecture-defaults/infrastructure-messaging.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use when `interface-strategy` or `event-driven` requires a deployed queue,
pub/sub broker, event stream, scheduler, dead-letter, or replay resource.

## Default Architecture

```text
producer and consumer semantics
  -> work queue | pub/sub | ordered stream/log | scheduler
  -> acknowledgement, retry, idempotency, ordering, and concurrency
  -> dead-letter, replay, backpressure, quotas, and operations
  -> failure and recovery proof
```

### Messaging Candidate Families

| Family | Prefer when | Prove first |
|---|---|---|
| Work queue | Work should be distributed among consumers | Lease/visibility, duplicate delivery, retry, poison isolation, concurrency, and shutdown |
| Pub/sub | Independent consumers react to the same fact | Subscription isolation, fan-out, retention, slow consumers, schema compatibility, and authorization |
| Event stream/log | Ordered retained facts, partitioned consumption, or replay is a product/operations requirement | Partition key, ordering scope, retention, replay, offsets, compaction, schema evolution, and operational load |
| Scheduler | Time-based or deferred dispatch is the primary need | Timezone, clock, missed runs, overlap, idempotency, retries, and ownership |

`event-driven` owns application event meaning, outbox, idempotent handlers, and
module boundaries. This extension owns the deployed messaging resource and its
security, capacity, delivery, failure, recovery, and cost topology.

## Reference File Structure

Keep event schemas and application handlers with their modules. Keep broker,
queue, stream, subscription, dead-letter, and policy resources in the target
infrastructure authority. Shared transport code remains an adapter, not event
meaning.

## Default Decisions

- Define work, fact, ordered-stream, or schedule semantics before broker
  products.
- Assume duplicate delivery and require idempotent effects unless stronger
  end-to-end evidence exists.
- Add replay only with authorization, compatibility, rate, ordering, and
  operator controls.

## Validation Contract

- Prove publish, acknowledgement, consume, duplicate, reorder, retry, poison,
  dead-letter, replay, outage, reconnect, and shutdown paths.
- Prove identity, authorization, tenant isolation, encryption, payload limits,
  quotas, partitioning, capacity, backpressure, observability, alerts, cost,
  upgrades, and teardown.
- Verify replay authorization and compatibility independently from normal
  consumption.

## Exceptions

An established broker may be retained even when another category looks
cleaner, provided the required semantics and failure paths are explicit. Use an
in-process queue when work does not need to survive process failure or cross a
deployment boundary.
