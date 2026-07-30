# Frontend State And Data Policy

- Pair ID: `frontend-state-data`
- Graph: `docs/patterns/architecture-defaults/frontend-state-data.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Extend `web-frontend` when several state categories, cross-route client state,
optimistic mutations, concurrency, durable drafts, or offline data make state
ownership a material architecture decision.

## Default Architecture

```text
URL state --------\
UI and form state -\
client-owned state ---> feature state model ---> visible outcomes
server state ------/          |
durable local state/          -> feature data boundary -> adapters
```

Classify before selecting tools:

| State kind | Default owner |
|---|---|
| Shareable navigation/filter state | URL/router |
| Form values and validation | Owning form |
| Ephemeral interaction state | Closest component or feature |
| Cross-route client-owned state | Feature/application store |
| Remote records and mutations | Query/server-state boundary |
| Preferences, drafts, offline records | Versioned local storage/database owner |
| Connection, presence, subscriptions | Realtime adapter and reconciliation policy |

## Reference File Structure

```text
src/features/<feature>/
  application/
    state/
      model.*
      selectors.*
      transitions.*
    forms/
    mutations/
  data/
    queries/
    mutations/
    mappers/
    ports/
    adapters/
  interface/
    states/
src/shared/
  storage/
    migrations/
  state/
    primitives/
tests/
  state/
  data/
```

Use only the folders justified by the feature. Store choice is an
implementation profile under these ownership rules, not the architecture
itself.

## Default Decisions

- Keep one authoritative owner per value and derive projections.
- Use local component/form/query primitives first. Introduce a global store for
  genuine cross-route client-owned state and a state machine for explicit,
  transition-heavy workflows.
- Normalize server data only when shared identity and partial updates justify
  it; otherwise keep query results close to their query boundary.
- Define mutation validation, optimistic behavior, concurrency, idempotency,
  cancellation, retry, rollback, and reconciliation.
- Version durable local schemas and define user/tenant scope, retention,
  encryption, logout, reset, and corruption recovery.

## Validation Contract

- Trace ownership for every state value and reject cyclic synchronization
  between URL, stores, forms, query caches, and local persistence.
- Exercise navigation, reload, back/forward, duplicate submission, concurrent
  mutation, stale response, optimistic rollback, offline/reconnect, and
  interrupted request behavior where applicable.
- Verify loading, empty, validation, permission, optimistic, stale, conflict,
  offline, failure, and retry states are visible and accessible.
- Verify durable migrations, user/tenant isolation, logout/reset, retention,
  and corrupt-data recovery.

## Exceptions

Offline-first local databases, collaborative editing, event-sourced clients, or
complex graphical editors may require a replicated log, CRDT, or domain state
machine. Record source of truth, conflict semantics, compaction, migration,
privacy, and recovery, while preserving feature entrypoints and adapter
boundaries.
