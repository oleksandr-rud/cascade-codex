# Interface Selection Strategy

- Pair ID: `interface-strategy`
- Graph: `docs/patterns/architecture-defaults/interface-strategy.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use when application behavior must be exposed to web, native, service,
partner, operator, automation, or batch consumers and the transport choice
affects coupling, latency, consistency, compatibility, or operations.

## Default Architecture

```text
consumer need
  -> transport-independent application command/query
      -> synchronous adapter: REST / RPC / GraphQL / local
      -> asynchronous adapter: event / job / webhook / stream / batch
      -> operator adapter: CLI / admin
  -> schema lifecycle and operational policy
```

Choose by interaction semantics:

| Need | Default interface |
|---|---|
| Resource-oriented public request/response | REST with schema-derived contract |
| Strongly typed internal low-latency call | RPC when operational coupling is acceptable |
| Client-selected graph across varied views | GraphQL when query flexibility justifies governance cost |
| Published fact for multiple independent consumers | Event |
| Deferred owned work | Queue/job command |
| External callback | Signed, retryable webhook |
| Continuous ordered feed | Stream or subscription |
| Operator and automation workflow | CLI with stable exit and output contracts |
| Large scheduled exchange | Resumable batch/import/export |

## Reference File Structure

Keep interfaces in the owning module slice and shared transport primitives in
`src/libs`:

```text
src/<app-name>/modules/<module>/
  interface/
    http/
    rpc/
    graphql/
    events/
    jobs/
    webhooks/
    cli/
  application/
    commands/
    queries/
    contracts/
src/libs/
  http/
  rpc/
  messaging/
  webhooks/
  cli/
contracts/
  public/
  events/
```

Only create folders for selected interfaces. Route or command files translate
into application contracts; they do not own business orchestration or direct
persistence.

## Default Decisions

- Begin from caller outcome and interaction semantics, not transport fashion.
- Keep commands, queries, results, stable errors, authorization, tenant
  context, idempotency, and cancellation transport-independent.
- Use synchronous request-response by default for immediate single-owner
  results; introduce asynchronous coupling only for real deferred, fan-out,
  isolation, streaming, or eventual-consistency needs.
- Own one schema lifecycle, compatibility policy, and deprecation route per
  public contract.
- Treat webhook signatures, event envelopes, CLI output, and batch manifests
  as public contracts.

## Validation Contract

- Contract-test every producer and consumer boundary, including negative auth,
  tenant, validation, compatibility, and duplicate cases.
- For synchronous interfaces, exercise timeout, retry, cancellation, rate
  limit, partial failure, and error translation.
- For asynchronous interfaces, exercise ordering, duplicate delivery,
  idempotency, replay, poison payloads, backpressure, dead letters, and schema
  evolution.
- For operator interfaces, exercise exit/status semantics, machine-readable
  output, redaction, interruption, and resumability.

## Exceptions

An API gateway, backend-for-frontend, legacy partner contract, device protocol,
or platform framework may fix transport shape. Keep the application contract
and translation boundary explicit, record compatibility constraints, and
classify the pair as `ADAPTED` rather than duplicating business logic in the
adapter.
