# Work Lane: W-020 Backend Infrastructure

Status: `COMPLETE`
Owner: `agent-engineer`
Coordinator: `W-018 orchestrator`
Created: 2026-07-28
Lane Model: `parallel-sectioning`
Next Gate: `none`

## Request

Add the `backend-infrastructure` graph/spec pair for API, BFF, worker,
consumer, scheduler, and batch resource topology with explicit database,
cache, queue, pub/sub, stream, and delivery ownership.

## Acceptance Criteria

- One profile covers `backend-service` and `backend-worker` through explicit
  runtime roles rather than duplicated service/worker resource catalogs.
- Database, cache, object/search, queue, pub/sub, stream, scheduler, secrets,
  observability, and delivery concerns route to existing resource extensions.
- `caching-strategy` retains cache semantics; `event-driven` retains event and
  module semantics.
- Cross-resource rules cover outbox, inbox/idempotency, invalidation,
  consumer scaling, retry/dead-letter, migration, backup/restore, and failure.
- Every shared resource has one owner and all consumers.

## Scope

Exclusive writes:

- `docs/patterns/architecture-defaults/backend-infrastructure.graph.yaml`;
- `docs/patterns/architecture-defaults/backend-infrastructure.spec.md`.

Out:

- resource-provider catalogs;
- backend app-stack candidates;
- backend archetype file structure changes;
- infrastructure root, pack, validator, schema, or scaffold edits.

## Behavior Examples

| ID | Example | Expected |
|---|---|---|
| `BEI-001` | An API owns transactional domain data. | authoritative database with migration, recovery, residency, and owner |
| `BEI-002` | A cache is proposed without keys, freshness, invalidation, or fallback. | block resource selection pending `caching-strategy` |
| `BEI-003` | A worker consumes at-least-once queue messages. | idempotency, retry, poison isolation, shutdown, resume, and capacity proof |
| `BEI-004` | One event must reach independent consumers. | pub/sub with subscription isolation and schema/authorization policy |
| `BEI-005` | Replay and ordered retained facts are required. | stream/log with partition, ordering, retention, offset, and replay proof |

## Feature Impact Matrix

| Feature | Touched | Protected behavior | Check | Status |
|---|---|---|---|---|
| Backend infrastructure profile | yes | service-api-worker slices and shared libs unchanged | pair validation | `NOT_RUN` |
| Caching | relationship only | semantic policy remains in caching strategy | preserved-owner check | `NOT_RUN` |
| Events/jobs | relationship only | module meaning remains in event-driven | preserved-owner check | `NOT_RUN` |
| Resource selection | routing only | provider choice remains in four resource extensions | relationship check | `NOT_RUN` |

## Plan

1. Author runtime-role, data, messaging, delivery/operations, ownership,
   cross-resource, proof, and selection nodes.
2. Define database/cache/queue/pub-sub/stream/scheduler routing and default
   decisions without naming speculative providers.
3. Preserve backend vertical slices, module semantics, ports/adapters, startup,
   and shared `src/libs` boundaries.
4. Validate and hand W-018 a two-file receipt plus ownership marker matrix.

## Agent And Skill Routing

- Execution: one direct `agent-engineer` subagent after explicit W-018
  dispatch.
- Required skills: `architecture-review -> implement-change`.
- Conditional review: use `secure-design` and the `security` role if the
  implementation changes tenant isolation, service credentials, secrets,
  external trust boundaries, or data-access authority.
- Write boundary: the two profile files in Scope.
- Handoff: no merge by the section agent; return the pair identity, ownership
  matrix, validation results, and any stop condition to W-018.

## Dependencies And Handoff

- Must wait for: W-018 WG-003-N01.
- Can run with: W-019, W-021, and W-022.
- Merge owner: W-018.
- Stop condition: a resource-provider choice leaks into the profile or a
  module semantic moves into shared infrastructure.

## Validation

| Check | Status |
|---|---|
| YAML parse and graph endpoint resolution | `PASS` |
| graph/spec bidirectional identity | `PASS` |
| cache/event/resource authority markers | `PASS` |
| API and worker behavior examples | `PASS` |

## Closeout

- Report: `docs/work/reports/2026-07-28-contour-infrastructure-work-graph.md`.
- Implementation evidence: `PASS`; 23 nodes, 49 edges, and 18 decisions.
- Pair receipt: graph
  `sha256:2d3dbb5f6f0512f30a1190cf271231b95ce7d4e4fea6e46e3b7aaa957dc91ed5`;
  spec
  `sha256:7fd2ee3482a6b1a4567c1f31dbc095e14cca2d7b4c45a14777162a7503b91bc8`.
- Security repair: `PASS`; authenticated tenant derivation and object/search
  isolation, deny-by-default messaging actions, short-lived/revocable workload
  identity, and telemetry minimization/canary probes are explicit.
