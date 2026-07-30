# Vertical-Slice Backend API And Worker Default

- Pair ID: `service-api-worker`
- Graph: `docs/patterns/architecture-defaults/service-api-worker.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use this archetype when one repository contains a backend API, worker, or other
server-side apps and each deployable app benefits from:

- product-aligned vertical slices under `src/<app-name>/modules`;
- explicit startup and process composition under
  `src/<app-name>/startup`;
- shared technical database, cache, messaging, observability, and third-party
  client capabilities under `src/libs`;
- module-owned interfaces, use cases, domain rules, events, data models, and
  repository implementations.

The default supports multiple independently started apps in one source tree.
It does not imply that every app shares business modules. API, worker, and
other server-side apps may reuse technical capabilities from `src/libs`
without importing one another's module internals.

Do not apply the full structure to an atomic script or a service whose
established package boundaries already provide equivalent ownership.

## Default Architecture

```text
src/<app-name>/startup
  -> initialize config, observability, database, cache, messaging, providers
  -> assemble module dependencies
  -> register module entrypoints
  -> start HTTP/RPC server, CLI process, scheduler, or worker consumer

src/<app-name>/modules/<slice>/module entrypoint
  -> interface: routes, commands, RPC handlers, jobs, event subscribers
  -> application: commands, queries, use cases, module ports, event emitters
  -> domain: entities, values, policies, repository semantics, domain events
  -> infrastructure: module models, mappings, repositories, cache/provider adapters

src/libs
  -> technical ports and reusable adapters
  -> database/cache/message/provider client initialization mechanics
  -> base model and repository mechanics with no module-specific semantics
```

The composition root is the only layer allowed to know all concrete modules
and adapters. A module exposes one intentional entrypoint. Its interface layer
translates inbound protocols into application calls. Application coordinates
use cases and transactions. Domain owns product invariants. Module
infrastructure implements module-specific outbound contracts using technical
primitives from `src/libs`.

### Dependency Direction

```text
startup -> module entrypoint -> interface -> application -> domain
startup -> shared lib adapters -> external resources
module infrastructure -> module ports
module infrastructure -> shared lib ports/adapters
shared lib adapters -> shared lib ports
src/libs -X-> app folders or module internals
```

Allowed dependencies:

- `startup` may import public module entrypoints and concrete `src/libs`
  adapters because it is the composition root.
- `interface` may import application commands, queries, and result types.
- `application` may import domain behavior, module-owned ports, and generic
  technical ports such as clock, transaction, event publisher, or cache store.
- `domain` may import only domain-local code and deliberately tiny shared value
  primitives that contain no infrastructure.
- module `infrastructure` may implement module ports by composing or extending
  shared lib adapter primitives.
- another module may depend only on the owning module's public entrypoint or
  published contract, not its internal folders.

Forbidden dependencies:

- `src/libs` importing an app, module, entity, route, or product event;
- routes, commands, or subscribers calling a database/cache/provider SDK
  directly;
- application or domain code constructing concrete adapters;
- one app importing another app's startup or module internals;
- moving business rules into `src/libs` merely because two apps need them.

## Reference File Structure

### Canonical Logical Tree

```text
src/
  <backend-api>/
    startup/
      main.*
      config.*
      container.*
      logging.*
      database.*
      cache.*
      messaging.*
      providers.*
      modules.*
      health.*
      shutdown.*
    modules/
      <slice>/
        index.*
        module.*
        interface/
          http/
            routes.*
            schemas.*
            presenters.*
          rpc/
          cli/
            commands.*
          jobs/
            handlers.*
          events/
            subscribers.*
            envelopes.*
        application/
          commands/
          queries/
          services/
          ports/
          events/
            emitters.*
            handlers.*
        domain/
          models/
          values/
          policies/
          services/
          repositories/
          events/
        infrastructure/
          database/
            models/
            repositories/
            mappers/
          cache/
          providers/
        tests/
  <worker-app>/
    startup/
    modules/
  libs/
    database/
      ports/
      adapters/
      models/
      repositories/
      transactions/
      migrations/
    cache/
      ports/
      adapters/
      keys/
      codecs/
    messaging/
      ports/
      adapters/
      outbox/
      envelopes/
    third-party/
      <provider>/
        ports/
        adapters/
        client.*
        errors.*
    observability/
    config/
    testing/
tests/
  contract/
  integration/
  functional/
```

Create only interface folders the slice actually exposes. An HTTP-only module
does not need empty CLI, RPC, job, or subscriber folders. Likewise, keep
domain subfolders shallow until the slice has enough behavior to justify them.

### TypeScript

```text
src/
  backend-api/
    startup/
      main.ts
      container.ts
      database.ts
      cache.ts
      messaging.ts
      modules.ts
    modules/
      orders/
        index.ts
        module.ts
        interface/
          http/routes.ts
          events/subscribers.ts
        application/
          commands/
          queries/
          ports/
          events/emitters.ts
        domain/
          models/
          repositories/
          events/
        infrastructure/
          database/models/
          database/repositories/
          database/mappers/
          cache/
          providers/
  worker/
    startup/
      main.ts
      container.ts
      messaging.ts
      modules.ts
    modules/
  libs/
    database/
      ports/
      adapters/
      models/base-model.ts
      repositories/base-repository.ts
      transactions/
    cache/
      ports/
      adapters/
    messaging/
      ports/
      adapters/
      outbox/
    third-party/
    observability/
```

Use package export maps or lint boundaries so imports outside a module resolve
through its `index.ts`. A module `module.ts` may expose route/subscriber
registrars and the application facade needed by startup; it must not re-export
every internal model or adapter.

### Python

Python package names use underscores instead of hyphens:

```text
src/
  backend_api/
    startup/
      main.py
      container.py
      database.py
      cache.py
      messaging.py
      modules.py
    modules/
      orders/
        __init__.py
        module.py
        interface/
          http/routes.py
          events/subscribers.py
        application/
          commands/
          queries/
          ports/
          events/emitters.py
        domain/
          models/
          repositories/
          events/
        infrastructure/
          database/models/
          database/repositories/
          database/mappers/
          cache/
          providers/
  worker/
    startup/
      main.py
      container.py
      messaging.py
      modules.py
    modules/
  libs/
    database/
      ports/
      adapters/
      models/base.py
      repositories/base.py
      transactions/
    cache/
      ports/
      adapters/
    messaging/
      ports/
      adapters/
      outbox/
    third_party/
    observability/
```

Keep synchronous and asynchronous base adapters separate. A repository or
provider port must not hide blocking I/O behind an async method.

### Go

Keep composition in `src/<app-name>/startup`; a conventional `cmd` package may
contain the smallest possible process launcher:

```text
cmd/
  backend-api/main.go
  worker/main.go
src/
  backendapi/
    startup/
      run.go
      container.go
      database.go
      cache.go
      messaging.go
      modules.go
    modules/
      orders/
        module.go
        interface/
          http/
          events/
        application/
          commands/
          queries/
          ports/
          events/
        domain/
          models/
          repositories/
          events/
        infrastructure/
          database/models/
          database/repositories/
          database/mappers/
          cache/
          providers/
  worker/
    startup/
    modules/
  libs/
    database/
      ports/
      adapters/
      models/
      repositories/
      transactions/
    cache/
      ports/
      adapters/
    messaging/
      ports/
      adapters/
      outbox/
    thirdparty/
    observability/
```

Prefer small consumer-owned interfaces. Go generally favors composition over
base-class inheritance: shared repository mechanics are embedded or called by
module repositories while module contracts remain narrow.

## Default Decisions

### App Startup And Initialization

Each app owns its startup lifecycle under `src/<app-name>/startup`. A typical
order is:

1. parse and validate configuration;
2. initialize logging, metrics, and tracing;
3. connect database and create the transaction boundary;
4. connect cache;
5. create messaging, outbox publisher, and consumer infrastructure;
6. initialize shared third-party clients;
7. construct module-specific repositories, provider adapters, and use cases;
8. register module routes, commands, jobs, and event subscribers;
9. expose readiness only after required dependencies and registrations succeed;
10. start intake and handle graceful shutdown in reverse dependency order.

Startup files perform wiring and lifecycle control, not business workflows.
Framework-required launchers outside the folder must delegate immediately to
the startup contract.

### Module And Slice Entrypoints

Every `modules/<slice>` exposes one public entrypoint such as `index.ts`,
`__init__.py` plus `module.py`, or `module.go`. It owns:

- the module factory or registration function;
- declared inbound interfaces;
- explicit application facade or public contracts;
- dependency requirements expressed as ports or constructor inputs;
- optional health contribution and lifecycle hooks.

The entrypoint does not export internal persistence models, concrete
repositories, framework handlers, or domain internals by default. This keeps
startup and cross-module consumers from bypassing the slice.

### Interface Layer

`interface` contains inbound adapters:

- HTTP or RPC routes, request schemas, response presenters, and error mapping;
- CLI commands when the backend app exposes operational commands;
- scheduled job and queue handlers;
- event subscribers and envelope/version translation;
- webhook or other endpoint adapters.

Every interface maps transport input into an application command/query and
maps a structured result back to its protocol. It validates caller and message
context but does not own persistence or product orchestration.

### Application And Domain

`application` owns use-case orchestration, authorization decisions, transaction
coordination, idempotency, module-specific outbound ports, and outbound event
emitters. `domain` owns entities, values, policies, domain services, repository
semantics, and domain event definitions.

A CRUD-heavy slice may keep these folders shallow, but interface code still
must not call database or provider implementations directly. Do not manufacture
empty layers or one-line services solely to match the tree.

### Shared Libraries

`src/libs` owns technical capabilities reusable by API, worker, scheduler, and
other server-side apps:

- database connections, sessions, transactions/unit-of-work, migration
  mechanics, base model primitives, and base repository mechanics;
- cache clients, generic cache ports, key/codec primitives, and provider
  adapters;
- message broker clients, publisher/consumer primitives, envelope mechanics,
  outbox storage/publishing, retries, and dead-letter integration;
- third-party SDK clients, authentication, rate-limit/retry/timeout mechanics,
  and provider error normalization;
- configuration parsing, observability, clocks, IDs, and test fixtures that
  carry no product semantics.

`src/libs` must not own app routes, module entities, product event definitions,
entity-specific queries, tenant rules, or business workflows. A shared
third-party client belongs in libs; an adapter that translates that provider
into an `Orders` or `Billing` concept belongs in the owning module.

### Models And Repositories

Module-specific data definitions and repository implementations remain inside
the slice:

```text
modules/<slice>/domain/repositories/          module-owned contract
modules/<slice>/infrastructure/database/models/       entity/storage model
modules/<slice>/infrastructure/database/mappers/      domain <-> storage mapping
modules/<slice>/infrastructure/database/repositories/ concrete implementation
```

Shared bases are allowed only when they own meaningful, stable mechanics:

- connection/session acquisition and release;
- transaction propagation;
- tenant or owner scoping that is truly universal and enforced;
- optimistic concurrency primitives;
- pagination/cursor mechanics;
- serialization, instrumentation, and error translation;
- framework-required declarative model metadata.

Prefer composition when the module needs only some mechanics. Inheritance is
acceptable when the language/framework makes the invariant clearer, but a base
repository must not expose universal CRUD that lets callers bypass aggregate,
permission, lifecycle, soft-delete, or event rules.

Base models and repositories in `src/libs` must not know module entity names,
tables/collections, product filters, or event types. Entity-specific queries,
indexes, lifecycle, cache keys, and mappings stay in the module implementation.

### Events, Emitters, And Subscribers

- Define domain events under `domain/events`.
- Record domain events during the owned state transition when useful.
- Define outbound publisher/emitter ports under `application/events` or
  `application/ports`.
- Publish integration events only after the owner transaction commits; use the
  shared outbox adapter when publication must be atomic with a write.
- Place inbound event subscribers under `interface/events/subscribers`.
- Subscribers validate and version envelopes, enforce idempotency, translate
  input to application commands, and classify retryable versus terminal
  failures.
- Broker SDKs, generic consumers, serialization, retry scheduling, and
  dead-letter mechanics belong in `src/libs/messaging`.

Do not call another module's subscriber or concrete emitter directly. Use its
public module contract for synchronous work or a documented event contract for
asynchronous work.

### API, Worker, And Cross-App Reuse

API and worker apps may share `src/libs` database/cache/provider/messaging
primitives and still own separate startup, health, configuration, module
registration, and shutdown behavior.

If API and worker need the same business invariant or use case, do not solve it
by moving the slice into technical libs or by importing API module internals
from the worker. Choose explicitly:

1. keep one app/service boundary with separate API and worker startup
   entrypoints over the same module;
2. extract a real cross-app domain package with one owner, public contract,
   versioning, and tests;
3. keep separate services and communicate through an API or event contract.

The choice depends on data ownership, deployment, scaling, security, and team
boundaries. `src/libs` remains the technical reuse surface.

## Validation Contract

- Enforce import direction mechanically where the language tooling supports it:
  `libs` cannot import apps; modules cannot import another module's internal
  paths; domain/application cannot import concrete infrastructure.
- Contract-test every public module entrypoint and enabled route, CLI, RPC,
  job, webhook, or event interface.
- Start API and worker apps independently and test config failure, dependency
  failure, readiness, intake start, shutdown, and in-flight work handling.
- Test module-specific repositories against real local database/cache
  substitutes, including transactions, tenant/owner filters, concurrency,
  mapping, entity lifecycle, and failure translation.
- Test both composition and any inherited base behavior through the module
  repository contract; base reuse must not bypass entity invariants.
- Contract-test event envelopes, post-commit publication, outbox atomicity where
  required, duplicate delivery, idempotency, retry classification, and
  dead-letter/quarantine handling.
- Verify separate apps do not accidentally share mutable in-process state,
  connection lifecycle, cache namespaces, consumer identities, or health.
- Trace one request and one asynchronous delivery through startup, module
  interface, application, domain, repository/provider adapter, shared client,
  and external dependency.

## Exceptions

Adapt filenames to established target vocabulary and framework constraints. A
runtime may require a thin launcher under `cmd/`, a framework route registry,
or declarative model inheritance; keep the ownership and dependency direction
even when paths differ.

Reject or narrow this default when:

- independently versioned services cannot safely share source-level libs;
- a serverless function is small enough that one vertical slice and startup
  function are sufficient;
- a coherent existing modular-monolith or package architecture already owns
  these contracts;
- generated framework code must live in fixed folders;
- shared business behavior is actually a service or domain-package boundary,
  not a technical library.

Do not add empty folders, universal base repositories, or cross-app imports
merely to resemble the reference tree.
