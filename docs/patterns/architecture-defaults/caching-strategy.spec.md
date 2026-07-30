# Caching Strategy Default

- Pair ID: `caching-strategy`
- Graph: `docs/patterns/architecture-defaults/caching-strategy.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use this pair after an access-pattern review shows that repeated reads, source
pressure, latency, or bounded degraded operation justify caching. The first
default is no shared cache. Once evidence warrants one, use cache-aside at the
application query boundary.

Before adoption, name:

- data owner and source of truth;
- caller and tenant or permission boundary;
- query shape and expected cardinality;
- required freshness and allowed staleness;
- read and write frequency;
- miss, cache-down, and invalidation-delay behavior;
- measurement that will prove the cache is useful.

## Default Architecture

The policy boundary owns whether caching is allowed, how a key is built, how
long a value is reusable, and whether stale data may be served.

```text
caller
  -> cache policy
      -> request-local cache when duplicate reads exist
      -> shared cache when measured evidence warrants it
      -> source of truth on miss, bypass, or cache failure
owner write commit
  -> eviction, version advance, or refresh
all paths
  -> hit, miss, age, latency, error, eviction, and fill evidence
```

Cache values are derived copies. Writes succeed against the authoritative owner,
not the cache. Shared cache failure normally falls back to the source and is
observable; it must not silently change authorization, correctness, or write
semantics.

Select the smallest strategy that meets the contract:

| Strategy | Default use | Do not use as |
|---|---|---|
| Request-local memoization | Duplicate reads inside one request, job, render, or agent turn | Cross-request freshness or resilience |
| Cache-aside shared cache | Reusable derived reads with bounded TTL and safe source fallback | Write authority or transaction log |
| HTTP/edge caching | Public or correctly varied responses with explicit cache headers | A replacement for application authorization |
| Versioned immutable objects | Content addressed or version-addressed values | Mutable current-state lookup without an owner pointer |
| Materialized view/read model | Expensive repeated queries with a real projection lifecycle | An untracked duplicate source of truth |
| Stale-while-revalidate | Read paths whose product contract permits bounded stale data | Permission, balance, inventory, or other strict-current reads by default |

## Reference File Structure

Map these logical owners into the target's established service tree:

```text
<service>/
  application/
    queries/
    cache/
      policy.*
      keys.*
      freshness.*
  ports/
    cache.*
  infrastructure/
    cache/
      in_memory.*
      remote.*
      codec.*
      metrics.*
  tests/
    cache/
      policy_test.*
      isolation_test.*
      invalidation_test.*
      stampede_test.*
      degraded_mode_test.*
```

Use local naming where it already exists. Keep provider clients in
`infrastructure/cache`; keep eligibility, freshness, and key ownership in the
application boundary. Do not put cache calls directly in HTTP handlers, domain
entities, or unrelated persistence models.

For TypeScript, expose a narrow typed cache port and keep serialization
explicit. For Python, keep sync and async cache clients behind distinct
implementations rather than hiding event-loop changes. For Go, pass a
request-scoped interface at the owning use case and preserve `context.Context`
cancellation.

## Default Decisions

### Keys And Isolation

- Include tenant, account, owner, or permission scope unless the value is
  proven public.
- Include normalized query identity and a schema or value version.
- Hash sensitive or unbounded key components and keep debug-safe labels
  separate from the storage key.
- Never infer authorization from the existence of a cache entry.

### Freshness And Invalidation

- Use TTL as a safety bound even when owner writes invalidate entries.
- Add jitter to shared TTLs to avoid synchronized expiry.
- Prefer eviction or version advance after the owner transaction commits.
- Use write-through only when the cache write is part of a documented
  correctness contract.
- Negative caching is opt-in for stable not-found results and must use a shorter
  TTL; do not negative-cache permission or transient provider failures.

### Concurrency And Size

- Add single-flight, a short fill lock, or request coalescing for expensive hot
  misses.
- Bound value size and reject accidental object graphs or unbounded lists.
- Do not make correctness depend on a distributed lock unless lease expiry,
  fencing, and failure recovery are explicitly designed.

## Failure And Operations

Required signals are hit/miss/bypass counts, item age, fill latency, source
latency, cache errors, evictions, value size, concurrent fills, and fallback
rate. Labels must not contain raw tenant IDs, secrets, or unbounded keys.

Set an operational removal criterion. A cache that does not improve the named
objective, causes unacceptable stale behavior, or obscures source failures
should be disabled or removed through an explicit change.

## Validation Contract

- Prove cross-tenant and cross-permission misses with negative tests.
- Exercise hit, miss, stale, expired, corrupt value, cache-down, source-down,
  invalidation-delay, and concurrent-fill cases.
- Verify source writes remain correct if cache invalidation fails.
- Compare latency and source load before and after under representative traffic.
- Check that metrics and logs expose age and fallback without leaking key data.

## Exceptions

Reject or adapt this default when a CDN, database projection, immutable object
store, or platform cache is the actual owner of the required semantics. Record
the replacement's source of truth, freshness, invalidation, isolation, failure,
and evidence contracts rather than adding a second cache layer.
