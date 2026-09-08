# Durable Event-Driven Extension

- Pair ID: `event-driven`
- Graph: `docs/patterns/architecture-defaults/event-driven.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Extend `service-api-worker` when a module publishes durable facts to independent
consumers or owns deferred work that must survive process failure. Ordinary
in-process calls or best-effort local notifications do not need this extension.
A broker does not require splitting the modular monolith into microservices.

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

This extension preserves domain ownership, startup composition, public module
entrypoints, and the modular-monolith release boundary. Producers, subscribers,
outbox state, and inbox state live with their owning modules. Extract a named
broker adapter or envelope codec only when at least two current modules need
the same stable mechanics; no shared library or repository base is mandatory.

## Reference File Structure

```text
src/<app-name>/
  startup/
    messaging.*
  modules/orders/
    index.*
    order-placed.*
    outbox.*
  modules/billing/
    index.*
    on-order-placed.*
    inbox.*
tests/events/
```

This is an example of two participating modules, not a required scaffold. Add only
the files the accepted flow needs; a larger module may use internal folders.
Do not create an `events` mega-module that owns other modules' facts. Optional
shared adapters own transport mechanics, never event meaning or module data.

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
