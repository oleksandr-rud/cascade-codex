# Multi-Tenant And Multi-App Strategy

- Pair ID: `tenancy-strategy`
- Graph: `docs/patterns/architecture-defaults/tenancy-strategy.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use when one system serves multiple tenants, organizations, accounts, regions,
brands, or first-party applications. This is an overlay: it strengthens
identity, data, cache, queue, interface, configuration, and operational
boundaries without replacing module or archetype structure.

## Default Architecture

```text
authenticated actor + tenant/app context
  -> interface validation
  -> tenant-aware application command/query
      -> scoped database and object storage
      -> scoped cache, event, and job infrastructure
  -> tenant-safe telemetry, support, export, deletion, and recovery
```

Choose the weakest isolation profile that meets evidence, then enforce it
consistently:

| Profile | Typical boundary | Use when |
|---|---|---|
| Shared rows | Tenant key plus database policy/query enforcement | Similar lifecycle and moderate risk |
| Shared database, separate schema | Schema per tenant or group | Stronger lifecycle or migration isolation |
| Separate database/account | Dedicated storage and credentials | Contractual, residency, blast-radius, or scale isolation |
| Separate deployment | Dedicated runtime and infrastructure | Full operational isolation is required |

## Reference File Structure

Map tenancy into the adopted archetype without creating a parallel business
layer:

```text
src/libs/
  identity/tenant-context.*
  tenancy/policy.*
  database/tenant-scope.*
  cache/tenant-key.*
  messaging/tenant-envelope.*
src/<app-name>/
  startup/tenancy.*
  modules/<module>/
    interface/tenant-guards.*
    application/tenant-aware-use-cases.*
    infrastructure/tenant-scoped-repositories.*
tests/
  tenancy/
    isolation.*
    lifecycle.*
    operations.*
```

Frontend and native clients may carry an active tenant selection for UX, but
the server derives and authorizes the effective tenant. Separate first-party
apps keep their own entrypoints, permissions, configuration, and releases even
when they reuse `src/libs`.

## Default Decisions

- Authenticate first; derive tenant/app context from trusted claims or an
  authenticated machine contract.
- Include tenant scope in records, queries, unique constraints, cache keys,
  object paths, events, jobs, rate limits, and telemetry correlation.
- Keep global resources explicit and rare.
- Make support impersonation, cross-tenant aggregation, export, and deletion
  separate audited use cases.
- Escalate isolation based on regulatory, residency, lifecycle, scale,
  noisy-neighbor, and incident-blast-radius evidence.

## Validation Contract

- Run positive and negative isolation tests across API, worker, database,
  cache, object storage, events, jobs, search, analytics, and logs.
- Verify tenant context cannot be spoofed by a request body, query parameter,
  client store, or message payload alone.
- Exercise migration, backup, restore, export, retention, deletion, suspension,
  support access, and incident containment for the selected profile.
- Verify all first-party interfaces enforce equivalent authorization even when
  they use different transports or clients.

## Exceptions

Single-tenant installations, sovereign environments, and dedicated enterprise
deployments may use stronger physical isolation while reusing the same logical
contracts. A public multi-sided marketplace may have several principal types
rather than one tenant hierarchy; model those principals explicitly and record
the adapted authorization and data-ownership graph.
