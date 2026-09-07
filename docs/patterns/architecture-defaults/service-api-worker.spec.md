# Modular Monolith Backend API And Worker Default

- Pair ID: `service-api-worker`
- Graph: `docs/patterns/architecture-defaults/service-api-worker.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use this archetype for a backend API, worker, or other server-side application
whose product behavior can be divided into concrete domain capabilities. Start
with a modular monolith unless current evidence requires
independent deployment or failure isolation.

Do not apply this structure to an atomic script or replace coherent existing
package boundaries merely to match the example tree.

## Module Selection Contract

A top-level module must name a real domain entity, aggregate, or cohesive
business capability. Examples include `auth`, `users`, `crm`, `customers`,
`leads`, `opportunities`, `billing`, and `work-orders`. Each module must own:

- identifiable state or data, or an explicit stateless domain policy;
- the invariants and use cases that act on that state or policy;
- one public entrypoint used by startup and other modules;
- its domain-specific persistence and provider contracts.

Do not create top-level modules named `core`, `common`, `business`, `services`,
`managers`, `processors`, `helpers`, `utils`, `application`, `domain`, or
`infrastructure`. Those names describe implementation categories rather than
product ownership. Internal folders with names such as `application` or
`infrastructure` are optional organizational details inside a concrete module,
not modules themselves.

`crm` is valid when customer relationship management is one cohesive lifecycle.
If customers, leads, and opportunities have different state, permissions, or
release pressure, use those narrower modules instead. `auth` and `users` remain
separate when authentication/session policy and user profile lifecycle have
different invariants, even if they share an identifier.

## Default Architecture

```text
src/<app-name>/startup
  -> initialize only selected runtime dependencies
  -> construct concrete domain modules
  -> register their public entrypoints
  -> start and stop the process

src/<app-name>/modules/auth
  -> credentials, authentication, sessions, revocation

src/<app-name>/modules/users
  -> user identity record, profile, preferences, lifecycle

src/<app-name>/modules/crm
  -> customer relationships and the accepted CRM lifecycle

optional shared technical capability
  -> one named mechanism already consumed by at least two modules
```

The composition root is the only place that knows all concrete modules and
adapters. A module exposes one intentional entrypoint. Calls between modules go
through that entrypoint or a documented event contract; consumers never import
another module's internal files or storage model.

Keep the first implementation shallow. Co-locate a small module's use case,
model, port, and adapter when that is clearer. Add `interface`, `application`,
`domain`, or `infrastructure` subfolders only when the module contains enough
real code to make the split useful. Never generate empty layers.

### Modular Monolith Contract

- Build and release the domain modules as one application. Replicas or required
  worker modes do not make each module an independently deployed service.
- Prefer direct in-process calls through public module contracts. Do not add
  loopback HTTP, RPC, or a broker just to enforce source boundaries.
- Keep module dependencies acyclic. A cross-module workflow belongs to a named
  domain use case; do not hide a synchronous dependency cycle behind events.
- A shared database is valid. Each module owns its tables, models, migrations,
  and writes; other modules call the owner's public contract instead of
  querying or mutating its storage. Required cross-module atomicity is an
  explicit use-case contract, not a reason to bypass module invariants.
- An in-process event has no durable-delivery guarantee. Select `event-driven`
  only when durable asynchronous delivery or independent consumers need it.

### Module Versus Service

A module is a source and ownership boundary; it does not imply another process.
Promote a module to a separately deployed service only when at least one current
constraint requires independent release ownership, scaling, data isolation,
security/compliance isolation, availability, or failure containment. Network
calls, distributed transactions, retries, and operational overhead are not the
default cost of modularity.

### Dependency Direction

```text
startup -> module public entrypoints
module interface -> module use cases -> module policy/state
module adapters -> module-owned ports -> selected external resources
module A -> module B public contract or published event
shared technical capability -X-> domain modules
```

Forbidden dependencies:

- one module importing another module's internals, tables, or concrete adapter;
- cyclic imports or direct access to another module's storage;
- routes, commands, or subscribers accessing a database or provider directly;
- a generic shared module owning entity rules, product events, or workflows;
- a domain module depending on startup composition;
- extracting a shared abstraction before there are real consumers and stable
  repeated mechanics.

## Reference File Structure

The baseline contains only selected startup code and concrete domain modules:

```text
src/
  api/
    startup/
      main.*
    modules/
      auth/
        index.*
        authenticate.*
        session.*
      users/
        index.*
        user.*
        update-profile.*
      crm/
        index.*
        customer.*
        manage-relationship.*
tests/
  contract/
  integration/
```

The scaffold creates one selected module at a time. Its `--module-name` must be
a concrete domain name; obvious category names such as `services` or `core` are
rejected. It does not create cache, messaging, event, provider, base repository,
or generic shared-library boilerplate. Add one of those only when an accepted
use case actually needs it.

For a larger module, an internal split may be useful:

```text
modules/<concrete-domain>/
  index.*                    public entrypoint
  interface/                 only enabled inbound protocols
  application/               named commands, queries, or use cases
  domain/                    owned entities, values, and invariants
  infrastructure/            owned persistence/provider implementations
  tests/
```

Do not create a generic `service` class or universal CRUD repository. Name use
cases by behavior (`authenticate`, `update-profile`, `qualify-lead`) and keep
repository methods aligned with the owning entity's actual access patterns.

### Shared Technical Code

Shared technical code is optional and consumer-driven. Extract it only when at
least two concrete modules currently need the same stable mechanism and the
extraction carries no product semantics. Name it after the real capability,
such as `database-transaction`, `clock`, `id-generator`, `http-client`, or
`telemetry`; never use a catch-all `common`, `core`, or `utils` module.

A provider SDK client may be shared when it owns protocol mechanics. Translation
from that provider into customer, billing, or auth meaning remains in the
owning domain module.

## Validation Contract

- Every top-level module name maps to an accepted domain entity or capability.
- Every state change has one module owner and one source of truth.
- Module imports are acyclic; in-process contract tests prove cross-module
  behavior and shared-database ownership without adding a network boundary.
- Startup imports public module entrypoints; module internals do not cross the
  boundary.
- Contract tests cover each public entrypoint and enabled protocol.
- Persistence tests prove module invariants and access patterns without a
  universal CRUD bypass.
- Shared technical code has at least two current consumers and contains no
  domain vocabulary or entity-specific behavior.
- Every separately deployed service records the concrete isolation reason,
  operational owner, failure behavior, and rollback path.

## Exceptions

Adapt this default when a framework enforces a different package layout, but
preserve concrete domain ownership and public module boundaries. Use separate
services immediately only when an existing organizational, regulatory,
deployment, data, or failure boundary already proves the need. Record the
adaptation and its validation in the target repository; the reference default
does not authorize a migration by itself.
