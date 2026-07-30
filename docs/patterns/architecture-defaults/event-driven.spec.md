# Event-Driven Service Extension

- Pair ID: `event-driven`
- Graph: `docs/patterns/architecture-defaults/event-driven.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Extend `service-api-worker` when a module publishes facts to independent
consumers or owns deferred work that must survive process failure. Do not add a
broker merely to avoid an ordinary in-process or synchronous dependency.

## Default Architecture

```text
module application transaction
  -> domain event / job intent
  -> transactional outbox
  -> publisher adapter
  -> broker
  -> subscriber entrypoint
      -> inbox/idempotency
      -> module application use case
      -> bounded retry -> dead letter -> replay
  -> event operations and tracing
```

This extension preserves app-owned vertical slices, startup composition,
shared technical libraries, and module public entrypoints. Producers and
subscribers live with their owning modules; broker clients, envelope codecs,
outbox primitives, and telemetry may live in `src/libs`.

## Reference File Structure

```text
src/<app-name>/
  startup/
    messaging.*
    subscribers.*
  modules/<module>/
    domain/events/
    application/
      handlers/
      subscribers/
    interface/
      events/
      jobs/
    infrastructure/
      outbox/
      inbox/
src/libs/
  messaging/
    broker-port.*
    envelope.*
    publisher.*
    subscriber.*
    retry-policy.*
    dead-letter.*
  database/
    outbox-base.*
    inbox-base.*
contracts/events/
tests/events/
```

Do not create an `events` mega-module that owns other modules' facts. Shared
libraries own transport mechanics; producing modules own meaning and schema.

## Default Decisions

- Publish past-tense facts for fan-out; use a job or command channel for work
  with one responsible consumer.
- Use a transactional outbox when state and publication must not diverge.
- Assume at-least-once delivery and make side effects idempotent.
- Carry event ID, type, schema version, occurred time, producer, causation,
  correlation, trace, tenant, and payload in a stable envelope.
- Use bounded retry and backoff, then dead-letter quarantine with explicit
  replay ownership.
- Evolve schemas additively by default and verify consumers before removal.

## Validation Contract

- Prove atomicity or reconciliation between state commits and publication.
- Exercise duplicates, reorder, delay, consumer restart, broker outage,
  malformed payload, incompatible schema, poison message, dead letter, and
  replay.
- Verify idempotency includes downstream side effects, not only handler entry.
- Measure publish failure, lag, throughput, retry, duplicate, dead-letter,
  replay, and end-to-end trace continuity.
- Verify tenant scope and sensitive-data rules across envelopes, logs, and
  dead-letter storage.

## Exceptions

Use change-data capture, event sourcing, or broker-native transactions only
when their operational and consistency contracts are explicitly owned and
tested. Best-effort analytics events may omit durable delivery only when loss,
privacy, and replay expectations are documented. Record any adapted guarantee
without weakening the preserved service-module boundaries.
