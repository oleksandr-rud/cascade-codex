# Data Infrastructure

- Pair ID: `infrastructure-data`
- Graph: `docs/patterns/architecture-defaults/infrastructure-data.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use when selecting a database, cache service, object/blob store, search index,
backup, restore, or data residency topology. Begin with access and lifecycle
evidence, not database category fashion.

## Default Architecture

```text
ownership + access patterns + consistency + lifecycle
  -> primary authoritative data system
  -> justified cache, object, search, or derived systems
  -> migration, retention, backup, restore, residency, deletion, and exit
  -> failure and recovery proof
```

### Data Selection Matrix

Record actor, owner, filter/query, sort/projection, write path, transaction,
cardinality, growth, freshness, consistency, retention, residency, encryption,
recovery objective, and deletion for each resource.

Prefer the simplest supported authoritative store that satisfies these
patterns. Add caches, search indexes, analytics stores, or read projections
only when their benefit exceeds synchronization, failure, privacy, and
operational cost.

`caching-strategy` owns cache eligibility, keys, freshness, invalidation,
stampede, and fallback. This extension owns the deployed cache resource,
identity, network, capacity, persistence mode, failure, recovery, and cost.

## Reference File Structure

Keep schemas and migrations with their declared data owner. Keep provider
resource configuration in infrastructure modules. Application repositories and
models remain adapters under the application architecture; provider clients do
not become domain contracts.

## Default Decisions

- Start with one authoritative store that satisfies real access patterns.
- Add caches and specialist stores only for measured gaps.
- Keep cache policy separate from the deployed cache resource.
- Treat configured backup and successful restore as separate evidence.

## Validation Contract

- Prove representative reads, writes, transactions, concurrency, consistency,
  isolation, and tenant boundaries.
- Prove migrations forward and backward where supported, backup, restore,
  replication/failover, retention, archival, deletion, and residency.
- Prove capacity, scaling, connection limits, observability, alerts, cost,
  upgrade, export, and provider exit constraints.

## Exceptions

Distinct data modalities may require separate authoritative systems when each
has explicit ownership, consistency, lifecycle, recovery, and operations
contracts. Do not call accidental dual writes a deliberate multi-store design.
