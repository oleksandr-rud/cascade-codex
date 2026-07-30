# Frontend Cache Layers

- Pair ID: `frontend-cache`
- Graph: `docs/patterns/architecture-defaults/frontend-cache.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Extend `web-frontend` and `frontend-state-data` when browser persistence,
service workers, HTTP/CDN behavior, offline needs, or performance budgets make
cache layering material. Do not add layers beyond request deduplication and
in-memory query caching without evidence.

## Default Architecture

```text
UI
  -> in-memory query cache -> request deduplication -> source API
       ^                                  ^
       |                                  |
  persisted browser cache       service worker / HTTP / CDN
           \________________ cache policy ________________/
```

Each layer needs its own freshness, retention, invalidation, privacy, version,
and observability policy. More layers increase stale and mixed-version failure
modes.

## Reference File Structure

```text
src/features/<feature>/data/
  query-keys.*
  freshness.*
  invalidation.*
  reconciliation.*
src/shared/
  cache/
    policy.*
    persistence.*
    serialization.*
    migrations/
  service-worker/
    routes.*
    lifecycle.*
  api/
    http-cache.*
tests/cache/
```

CDN and server cache policy stays with deployment/server owners; the frontend
documents only the contract it relies on.

## Default Decisions

- Begin with request deduplication and in-memory query caching.
- Add persisted browser caches for explicit reload/offline value, service
  workers for reviewed app-shell/network behavior, and HTTP/CDN caching for
  protocol-safe responses.
- Define query identity, freshness budget, stale display, revalidation,
  retention, invalidation, eviction, and mutation/realtime reconciliation per
  data class.
- Scope private caches by every representation and authorization dimension.
- Avoid persisting credentials or sensitive records; reviewed offline storage
  needs encryption, lifecycle, device-risk, logout, and remote-revocation
  decisions.
- Version persistent and service-worker caches across deploys.

## Validation Contract

- Exercise hit, miss, stale, background revalidate, mutation, optimistic
  rollback, realtime update, logout, tenant switch, permission change, deploy,
  mixed version, offline, reconnect, eviction, and corruption.
- Verify private data cannot cross user, tenant, locale, authorization, or
  representation boundaries at any layer.
- Verify service-worker install, activation, rollback, cleanup, and recovery
  from a bad cached shell.
- Record layer-specific hit, miss, staleness, revalidation, eviction, storage,
  and user-visible fallback evidence.

## Exceptions

Immutable content-addressed assets can use long-lived caching. Highly sensitive
or fast-changing data may bypass persistence and shared HTTP caches entirely.
Offline-first clients may treat a local database as a replicated data source
rather than a cache; use the state/data policy and document synchronization and
conflict semantics.
