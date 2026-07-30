# Backend Infrastructure

- Pair ID: `backend-infrastructure`
- Graph: `docs/patterns/architecture-defaults/backend-infrastructure.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use after `infrastructure`, `service-api-worker`, and `backend-stack` when a
`backend-service` or `backend-worker` unit needs deployable API, separate BFF,
worker, consumer, scheduler, or batch resources. One profile covers both
application contours by recording explicit runtime roles; it does not duplicate
service and worker resource catalogs.

Do not use this profile to choose application runtimes, frameworks, libraries,
provider products, or infrastructure-as-code templates. A frontend-owned
embedded BFF remains under the frontend infrastructure profile while its build,
deployment, owner, release, and UI-aggregation purpose are inseparable. A BFF
with domain workflows, durable data, independent contracts, multiple clients,
messaging, scaling, or release ownership is a separate `backend-service` and
uses this profile.

## Default Architecture

```text
backend-service and backend-worker application units
  -> API | separate BFF | worker | consumer | scheduler | batch roles
  -> module-owned workflows, data authority, events, jobs, ports, and adapters
  -> reusable src/libs technical mechanics
  -> compute | data | messaging | delivery resource extensions
  -> one resource owner + every application-unit consumer
  -> cross-resource consistency and failure rules
  -> capacity, migration, recovery, security, cost, and teardown proof
```

The profile owns topology, resource roles, routing, ownership records, and
cross-resource failure obligations. It preserves application-module meaning
and the resource extensions' provider-selection authority.

### Runtime Role Contract

| Role | Required contract | Resource routes |
|---|---|---|
| API | Ingress, request identity, authorization boundary, concurrency, timeout, rate, health, readiness, scaling, drain, shutdown, and synchronous dependency budget | `infrastructure-compute`, `infrastructure-data` when owned, `infrastructure-messaging` when publishing, `infrastructure-delivery` |
| Separate BFF | Client contract, session adaptation, aggregation budget, downstream authorization, timeout, partial response, scaling, drain, and release ownership; never direct access to another service's database | Same routes as an API, limited to resources the BFF owns |
| Worker | Trigger or intake, workload identity, concurrency, checkpoint, cancellation, retry, capacity, artifact/output, health, drain, resume, and terminal outcome | `infrastructure-compute`, applicable data/messaging routes, `infrastructure-delivery` |
| Consumer | Delivery guarantee, deny-by-default consume/acknowledge authorization, idempotency, ordering, partition/subscription identity, backpressure, retry, poison isolation, dead letter, replay authority, drain, resume, and downstream capacity | `infrastructure-compute`, `infrastructure-messaging`, data when effects persist, `infrastructure-delivery` |
| Scheduler | Timezone, clock, missed run, overlap, idempotency, deny-by-default trigger authorization, ownership, dispatch, retry, observability, and manual recovery | `infrastructure-messaging` for time/deferred dispatch, compute for the dispatched role, `infrastructure-delivery` |
| Batch | Input snapshot, queue or schedule, quota, CPU/memory/accelerator profile, partitioning, checkpoint, interruption, cancellation, retry, outputs, cost ceiling, and cleanup | `infrastructure-compute`, applicable data/messaging routes, `infrastructure-delivery` |

API, BFF, worker, consumer, scheduler, and batch describe runtime roles, not new
application types. One application unit may expose more than one role when
startup, deployment, security, scaling, and release ownership remain coherent.
Split the unit when those boundaries differ; retain this same profile contract
for each scope.

### Resource Routing And Authority

| Concern | This profile records | Semantic or provider authority |
|---|---|---|
| Compute | Workload role, concurrency, duration, placement needs, scaling signal, workload identity, drain, cancellation, shutdown, and capacity dependencies | `infrastructure-compute` selects compute topology |
| Authoritative database | Owner, consumers, access and consistency needs, tenant isolation, migration, retention, backup, tenant-aware restore, residency, deletion, capacity, failure, and exit | Application module owns domain data; `infrastructure-data` selects the deployed resource |
| Cache | Consumers, capacity, workload identity, tenant-aware key/access isolation, network, persistence mode, failure domain, recovery, cost, and removal dependency | `caching-strategy` owns eligibility, keys, freshness, invalidation, isolation, stampede, and fallback; `infrastructure-data` selects the deployed resource |
| Object/blob or search | Owner, consumers, derived/authoritative status, indexing or object lifecycle, residency, capacity, failure, recovery, and exit | Application owner defines meaning; `infrastructure-data` selects the deployed resource |
| Queue | Work owner, consumers, tenant scope, lease/visibility, deny-by-default publish/consume/acknowledge authorization, concurrency, quota, retry, dead letter, and poison isolation | `event-driven` owns job/event meaning and handler boundaries; `infrastructure-messaging` selects the deployed resource |
| Pub/sub | Producer, independent consumers, tenant scope, deny-by-default publish/consume/subscribe authorization, subscription isolation, retention, slow-consumer policy, schema compatibility, and quota | `event-driven` owns facts and schemas; `infrastructure-messaging` selects the deployed resource |
| Stream/log | Producer, consumers, tenant scope, deny-by-default publish/consume/replay authorization, partition key, ordering scope, offsets, retention, compaction, compatibility, and capacity | `event-driven` owns facts and handlers; `infrastructure-messaging` selects the deployed resource |
| Scheduler | Dispatch owner, target role, tenant scope, deny-by-default trigger/admin authorization, timezone, missed-run and overlap behavior, idempotency, retry, and manual recovery | Application module owns job meaning; `infrastructure-messaging` selects scheduling resources |
| Network and edge | Ingress/egress, private access, DNS/TLS, load balancing, WAF/rate boundaries, and failure domains | `infrastructure-delivery` |
| Artifacts and CI/CD | Build identity, provenance, promotion, environment gates, deploy, verify, rollback, and forward recovery | `infrastructure-delivery` |
| Configuration, secrets, and identity | Managed short-lived workload identity, audience/resource/role/tenant scope, rotation, emergency revocation, stale rejection, injection, redaction, audit, and break-glass | `infrastructure-delivery` |
| Observability and IaC | Allowlisted/redacted role and resource telemetry, tenant/access separation, retention/deletion/sampling, SLOs, alerts, leak canaries, incident route, infrastructure authority, state, drift, migration, and teardown | `infrastructure-delivery` |

No row names a provider. Provider candidates are evaluated only in the routed
resource extension after source-linked claims, required and forbidden policies,
scope, ownership, lifecycle, and highest-risk proof are available.

### One Owner And All Consumers

Every deployed or shared resource has one ownership record:

| Field | Requirement |
|---|---|
| Resource identity | Stable resource ID, kind, environment, region/locality, tenant/isolation scope, and lifecycle |
| Owner | Exactly one accountable application unit or infrastructure team with change, incident, recovery, cost, and teardown authority |
| Consumers | Every consuming application unit and runtime role, including indirect producer, subscriber, migration, operator, and restore paths |
| Access | Managed short-lived workload identity, audience/resource/role/tenant scope, per-action permission, network path, secret reference, rotation/revocation, encryption, audit, tenant boundary, and prohibited access |
| Capacity | Demand and saturation signals, limits, quotas, connection/partition budgets, minimum/maximum scale, and overload behavior |
| Operations | SLO, logs/metrics/traces, dashboards, alerts, runbook, support horizon, cost owner, and escalation |
| Lifecycle | Provision, migrate, upgrade, backup, restore, retain, delete, export, exit, and teardown |
| Failure | Failure domain, degraded mode, dependency effects, retry/recovery owner, recovery objective, and proof |

Repository co-location, shared libraries, or common credentials do not establish
resource ownership. Shared resources are explicit multi-consumer products.
Client applications, SSR runtimes, and BFFs call owned application interfaces;
they do not gain direct database, cache, broker, or secret access merely because
they share a deployment scope.

### Multi-Tenant Isolation Contract

A multi-tenant deployment scope must have a resolved `tenancy-strategy` before any
database, cache, object/search, queue, pub/sub, stream, scheduler, replay,
restore, secret, or telemetry resource is eligible. Single-tenant deployments
record that invariant and reject runtime tenant multiplexing; they do not use an
implicit global tenant as a fallback.

Tenant context is derived server-side from authenticated identity and its
authorized account or tenant binding. A tenant ID from a request field, route,
header, message body, cache key, object name, trace field, replay filter, or
restore request is untrusted selector input and must match the authenticated
binding. Missing, ambiguous, unknown, or mismatched context is denied before
resource access, message acknowledgement, side effects, replay, restore, or
telemetry export.

| Boundary | Required isolation |
|---|---|
| Database and object/search | Every query, write, transaction, index, projection, migration, backup selection, restore staging, deletion, and administrative path enforces the resolved tenant or a deliberately isolated single-tenant resource boundary |
| Cache | Keys and namespaces include the resolved tenant and permission/value version; reads, writes, invalidation, fill locks, fallback, metrics, and eviction cannot cross tenant boundaries |
| Queue, pub/sub, stream, scheduler | Producer and consumer authorization, envelope tenant, topic/queue/subscription/partition/schedule scope, acknowledgement, retry, dead letter, and trigger targets agree with the authenticated tenant and workload role |
| Replay and dead-letter recovery | Selection, inspection, redrive, replay, rate, destination, and side effects are tenant-scoped, separately authorized, audited, and unable to widen the original tenant boundary |
| Backup and restore | Tenant selection is authenticated and authorized; restore occurs into an isolated validation boundary before promotion, cannot overwrite another tenant, and revalidates indexes, caches, messages, offsets, and access policy |
| Operations and telemetry | Dashboards, logs, traces, alerts, runbooks, exports, and operator tools preserve tenant/access separation without exposing raw tenant identifiers or payloads |

Negative probes must attempt missing tenant context, forged selector values,
authenticated-tenant mismatch, cross-tenant IDs and cache keys, wrong-tenant
messages, subscription filters, acknowledgements, dead-letter inspection,
replay/redrive, backup selection, restore promotion, operator access, and
telemetry queries. Every probe fails closed, creates no cross-tenant side
effect, and emits a bounded audit event without sensitive content.

### Messaging Action Authorization

Messaging and scheduling control planes are deny-by-default. Authentication
alone never grants broker, queue, stream, subscription, schedule, dead-letter,
replay, or administrative access. Authorization binds the workload identity to
one or more explicit tenant, resource, action, and schema/envelope contracts:

| Action | Minimum authorization contract |
|---|---|
| Publish | Producer role, tenant, destination, allowed event/job types and schema versions, payload limits, and rate/quota |
| Consume | Consumer role, tenant, named queue/subscription/stream group, allowed message types, partition or filter bounds, and concurrency/quota |
| Acknowledge, reject, or extend lease | The consuming role owns the delivered message and tenant scope; acknowledgement is denied before a complete authorized effect |
| Subscribe or change filters | Separately authorized subscription-management role, tenant, source, destination, filters, retention, and consumer owner |
| Trigger or change a schedule | Scheduler role, tenant, named target, permitted job type, input contract, timezone/overlap policy, and quota |
| Inspect or move dead-letter work | Explicit diagnostic or recovery role, tenant, source/destination, bounded selection, sensitive-data access, reason, and audit |
| Replay or redrive | Explicit recovery role, tenant, immutable source selection, compatible destination/schema, rate, ordering, idempotency, time bound, and approval/audit policy |
| Administer messaging | Named operator role and resource scope, time-bounded elevation where used, reason, audit, and emergency revocation; no implicit wildcard data access |

Permissions for publish, consume, acknowledge, subscribe, trigger, dead-letter,
replay, and administration are independent. Granting one does not imply
another. Unknown roles, tenants, resources, actions, destinations, schemas, or
filters are denied. Negative probes cover every action with the wrong role,
tenant, resource, audience, and action, plus attempted wildcard expansion and
cross-tenant replay.

### Workload Identity And Credential Lifecycle

Every API, BFF, worker, consumer, scheduler, batch, migration, restore, replay,
and operator automation path uses a managed workload identity that issues
short-lived credentials scoped to the intended audience, resource, workload
role, action, and tenant where applicable.

- Workloads do not share exported credentials, credential files, copied tokens,
  or long-lived access keys across roles, tenants, environments, or resources.
- Credential issuance and use validate issuer, subject, audience, resource,
  role/action scope, tenant binding, not-before, expiry, and revocation state.
- Expired, not-yet-valid, stale, revoked, wrong-audience, wrong-resource,
  wrong-role, or wrong-tenant credentials fail closed without falling back to a
  broader or long-lived credential.
- Credential caches never outlive the credential or revocation policy and are
  cleared on rotation, role removal, tenant removal, incident response, and
  emergency revocation.
- Rotation proves overlap and cutover without broadening access. Emergency
  revocation stops new actions promptly, terminates or fences affected
  long-running work, and leaves reconstructable audit evidence without logging
  credential material.
- Local substitutes may simplify issuance but preserve subject, role, tenant,
  resource, action, expiry, mismatch, and revocation behavior in tests.

Negative probes exercise stale and revoked credentials, future not-before,
wrong audience/resource/role/tenant, removed permissions, copied credentials
between workloads, rotation boundaries, and emergency revocation during
publish, consume, acknowledgement, trigger, replay, restore, and admin actions.

### Telemetry Privacy And Tenant Access

Backend logs, metrics, traces, errors, profiles, dashboards, alerts, and
diagnostic exports use an explicit field and event allowlist. Exclude request
and response bodies, database values, cache values and raw keys, message
payloads, dead-letter payloads, replay bodies, restore contents, secrets,
credentials, authorization headers, session material, and sensitive identifiers
unless a narrower field is explicitly classified and approved.

Redaction and exclusion happen before serialization, buffering, sampling, or
export so a downstream collector is not the privacy boundary. Stable bounded
surrogates may support correlation only when their access, rotation, collision,
and re-identification risks are owned. Raw tenant IDs and unbounded
user-controlled labels are not telemetry dimensions.

Telemetry stores, dashboards, searches, alert destinations, incident tools,
support access, and exports preserve tenant and access separation. Each signal
class records owner, purpose, classification, allowed fields, access roles,
retention, deletion and legal-hold behavior, sampling, export destinations,
cost limits, and incident response. Sampling never selectively retains
sensitive payloads or hides authorization failures and security audit events.

Synthetic canary values representing secrets, credentials, tenant identifiers,
message fields, and record fields are injected only in bounded tests. Canary
leak checks scan pre-export buffers and each configured telemetry destination;
any match blocks release, fails the export path safely, and proves deletion
from test stores without persisting real sensitive examples.

### Caching Ownership Preservation

`caching-strategy` remains the only owner of cache eligibility, key composition,
tenant and permission isolation, freshness, TTL and jitter, invalidation,
stampede control, stale behavior, source fallback, and removal criteria. This
profile blocks cache resource selection until those semantics exist.

After policy resolution, `infrastructure-data` selects the deployed cache
resource and proves identity, network, capacity, persistence mode, failure,
recovery, cost, upgrade, and teardown. The authoritative owner write commits
before eviction, version advance, or refresh. Cache unavailability normally
falls back to the source and is observable; invalidation failure cannot turn a
failed authoritative write into success or a successful authoritative write
into failure.

### Event And Job Ownership Preservation

`service-api-worker` keeps product behavior in app-owned vertical slices and
reusable technical mechanics in `src/libs`. `event-driven` keeps ownership of
domain event and job meaning, schemas, outbox intent, subscriber entrypoints,
inbox/idempotency, handler effects, retry policy, dead-letter ownership, and
replay semantics. Infrastructure resources and shared broker clients do not
become owners of module facts or commands.

Use a transactional outbox when a committed database change and publication
must not diverge unless an equivalent atomic mechanism is proven. Assume
at-least-once delivery and keep inbox/idempotency with the consuming effect,
including downstream side effects. Choose messaging resources from semantics:

- queue for work distributed to one responsible consumer;
- pub/sub for one fact delivered to independent, isolated subscriptions;
- stream/log for ordered, retained, partitioned facts with operated replay;
- scheduler for time-based or deferred dispatch.

### Cross-Resource Failure Rules

| Failure or transition | Required behavior |
|---|---|
| Database commit succeeds and publication fails | Persist outbox intent atomically or reconcile from an equivalent durable source; alert on age/lag; retry without duplicating the domain change |
| Publication succeeds and consumer repeats | Deduplicate with inbox/idempotency at the effect boundary; downstream side effects use stable idempotency keys |
| Cache is unavailable or invalidation is delayed | Read from the authoritative source when allowed, expose fallback and age, preserve authorization, and repair/expire the derived copy |
| Database is unavailable | Reject or pause authoritative writes; do not acknowledge messages whose durable effect is incomplete; apply backpressure instead of retry amplification |
| Broker, queue, subscription, or stream is unavailable | Bound producer and consumer retries, preserve durable intent where required, expose lag, and prevent unbounded memory or request coupling |
| Consumer is saturated | Scale from lag and saturation only within downstream connection, quota, partition, cache, database, and provider capacity; backpressure or pause before overload |
| Message is malformed, incompatible, or poison | Quarantine after bounded retry, retain evidence without leaking sensitive data, alert the owner, and require authorized replay or terminal disposition |
| Scheduler misses or overlaps a run | Apply declared catch-up and overlap policy with stable run identity and idempotent dispatch; expose manual recovery |
| Schema or resource migration occurs | Sequence compatible application, producer, consumer, and resource changes; preserve rollback or forward recovery and replay compatibility |
| Backup or restore is needed | Treat backup configuration and executed restore as separate evidence; authenticate and authorize tenant selection, validate in isolation, prevent cross-tenant overwrite, and verify recovery objective, integrity, indexes, consumer offsets, cache rebuild, access policy, and resumed processing |
| Partial regional or dependency failure occurs | Name fail-closed, degraded, paused, or rerouted behavior per role; preserve isolation and authorization; prove recovery and reconciliation |
| Workload credential is stale, revoked, or mismatched | Deny resource and messaging actions without fallback credentials, stop or fence affected long-running work, emit a bounded audit event, and require fresh scoped identity |
| Telemetry contains a disallowed or canary field | Redact or reject before export, alert the telemetry owner without copying the sensitive value, verify deletion from bounded test stores, and block release until the leak path is closed |

Retries never substitute for capacity or recovery design. They are bounded,
observable, jittered where applicable, and end in an owned terminal state.
Dead-letter storage and replay have explicit authorization, retention,
compatibility, rate, ordering, privacy, and audit controls.

## Reference File Structure

This pair creates no source or infrastructure scaffold. Preserve the adopted
`service-api-worker` boundaries and map infrastructure records into the
target's existing owners:

```text
src/<app-name>/
  startup/
  modules/<module>/
src/libs/
  database/
  cache/
  messaging/
  observability/
<existing-infrastructure-authority>/
  components-or-modules/
  environments/
  policies/
  observability/
<existing-architecture-owner>/
  stack-selection.json
  backend-infrastructure-profile.md
```

Application startup owns process composition. Modules own workflows, data
meaning, events, jobs, schemas, and module-specific adapters. `src/libs` owns
reusable technical mechanics. The existing infrastructure authority owns
provider resources and environment composition. Do not create these paths
solely because they appear in this reference.

## Default Decisions

- Use one backend profile and explicit runtime roles rather than separate
  service and worker resource catalogs.
- Treat a domain-owning or independently released BFF as a separate backend
  unit; never let it bypass an owned application interface to another service's
  database.
- Give every shared resource exactly one owner and enumerate every consumer,
  identity, permission, isolation, capacity, lifecycle, recovery, and teardown
  contract.
- Resolve `tenancy-strategy` for every multi-tenant scope, derive tenant context
  from authenticated server-side identity, and deny missing, ambiguous, or
  mismatched context across data, cache, messages, replay, restore, operations,
  and telemetry.
- Deny messaging actions by default and grant publish, consume, acknowledge,
  subscribe, trigger, dead-letter, replay, and administration independently per
  workload role, tenant, resource, and action.
- Use managed short-lived audience/resource/role/tenant-scoped workload
  identity, never shared exported credentials; prove rotation, emergency
  revocation, and rejection of stale or mismatched credentials.
- Export only allowlisted backend telemetry after pre-export sensitive-data
  exclusion/redaction, with tenant/access separation, retention, deletion,
  sampling, and synthetic canary leak tests.
- Start with one authoritative database that satisfies owned access and
  consistency needs; add cache, object, search, or messaging resources only for
  explicit requirements.
- Block cache resource selection until `caching-strategy` resolves keys,
  freshness, invalidation, isolation, stampede, fallback, and removal.
- Select queue, pub/sub, stream/log, or scheduler from work, fan-out, ordering,
  retention, replay, and timing semantics before provider products.
- Assume at-least-once delivery; require idempotent effects, bounded retry,
  poison isolation, dead letter, graceful drain, resume, and capacity proof.
- Coordinate outbox, inbox, invalidation, migration, backup/restore, rollback,
  replay, and recovery across resource boundaries.
- Route product selection to the four resource extensions without choosing a
  speculative provider here.

## Behavior Examples

| ID | Input | Required result |
|---|---|---|
| `BEI-001` | An API owns transactional domain data. | The database record names one authoritative application owner, all consumers, access/consistency needs, migration, retention, backup, executed restore, residency, deletion, capacity, recovery, and exit; selection routes to `infrastructure-data`. |
| `BEI-002` | A cache is proposed without keys, freshness, invalidation, or fallback. | Stop resource selection and resolve `caching-strategy`; no deployed cache candidate is eligible from this profile alone. |
| `BEI-003` | A worker consumes at-least-once queue messages. | Require inbox/idempotency at the effect boundary, bounded retry/backoff, poison isolation, dead letter, graceful shutdown/drain, resume, backpressure, and downstream-capacity proof. |
| `BEI-004` | One event must reach independent consumers. | Route to pub/sub with one producer/schema owner, isolated subscriptions, enumerated consumers, retention, slow-consumer behavior, schema compatibility, authorization, quota, and failure proof. |
| `BEI-005` | Replay and ordered retained facts are required. | Route to a stream/log with partition key, ordering scope, offsets, retention, compaction, authorized replay, compatibility, rate, observability, and operator ownership. |
| `BEI-006` | A multi-tenant request, object path/container/key, search index/query/projection, message, replay, or restore has missing or mismatched tenant context. | Deny before resource access or side effects; require resolved `tenancy-strategy` and authenticated tenant derivation; prove database, cache, object/search, messaging, replay, restore, operations, and telemetry isolation with cross-tenant negative probes. |
| `BEI-007` | A workload attempts a messaging or scheduler action outside its role, tenant, resource, or action grant. | Deny publish, consume, acknowledge, subscribe, trigger, dead-letter, replay, or admin independently and emit a bounded audit event without payload data. |
| `BEI-008` | A credential is expired, stale, revoked, or scoped to another audience, resource, role, or tenant. | Reject without fallback, stop or fence affected long-running work, require fresh managed short-lived identity, and preserve secret-free audit evidence. |
| `BEI-009` | A backend telemetry event contains a disallowed sensitive or synthetic canary field. | Exclude or redact before serialization/export, fail the leak test, verify bounded test-store deletion, and block release until the export path is repaired. |

Additional negative cases:

- An embedded UI-only BFF is not reclassified as a backend unit without an
  independent domain, data, contract, client, scaling, messaging, or release
  boundary.
- A shared database, cache, broker, subscription, stream, scheduler, secret, or
  observability resource without exactly one owner and all consumers is
  blocked.
- A provider name, infrastructure-as-code template, application package, or new
  scaffold path in this profile is rejected.
- Moving cache semantics, event meaning, product schemas, or module use cases
  into infrastructure or `src/libs` is rejected.
- Missing or mismatched tenant context, wildcard messaging permissions, shared
  exported workload credentials, stale credential fallback, post-export-only
  redaction, or telemetry without allowlists and deletion policy is rejected.

## Validation Contract

### Pair And Relationship Integrity

- Parse the graph as YAML and validate it against
  `architecture-default-graph-v1`.
- Verify the graph filename, `graph_id`, `spec_path`, spec Pair ID, and spec
  Graph path agree bidirectionally.
- Resolve every edge endpoint and prove the combined `extends` and `requires`
  graph is acyclic.
- Verify `extends: infrastructure`, `requires: service-api-worker` and
  `backend-stack`, and preserved root decisions resolve.

### Authority And Ownership

- Verify `caching-strategy` and `event-driven` are compatible authorities, not
  replaced semantic owners.
- Verify `infrastructure-compute`, `infrastructure-data`,
  `infrastructure-messaging`, and `infrastructure-delivery` remain the only
  resource/provider selection routes.
- Verify every resource has exactly one owner and all direct, indirect,
  migration, operator, restore, producer, and subscriber consumers.
- Verify app-owned vertical slices, module public surfaces, startup composition,
  and shared `src/libs` technical scope remain unchanged.
- Verify multi-tenant scopes resolve `tenancy-strategy`, tenant context is
  derived from authenticated server-side identity, and missing or mismatched
  context is denied before database, cache, message, replay, restore,
  operations, or telemetry access.
- Verify publish, consume, acknowledge, subscribe, trigger, dead-letter,
  replay, and admin permissions are deny-by-default and independent per
  workload role, tenant, resource, and action.
- Verify workload credentials are managed, short-lived,
  audience/resource/role/tenant scoped, rotated, emergency-revocable, rejected
  when stale or mismatched, and never shared as exported credentials.
- Verify telemetry field/event allowlists, pre-export exclusion/redaction,
  tenant/access separation, retention, deletion, sampling, and canary leak
  detection.

### Behavior And Failure Proof

- Exercise `BEI-001` through `BEI-009` and their negative variants.
- Start API and worker roles independently; prove configuration failure,
  dependency failure, health/readiness, intake, load, scale, drain,
  cancellation, shutdown, in-flight work, resume, and terminal outcomes.
- Test database commit/publication gaps, duplicate delivery, inbox
  idempotency, delayed invalidation, cache and source failure, broker outage,
  poison isolation, dead letter, replay, saturation, scheduler overlap,
  migration, backup/restore, rollback/forward recovery, and reconciliation.
- Run cross-tenant object path/container/key and search
  index/query/projection negative probes, including administrative, replay,
  backup, restore, export, and deletion paths.
- Prove workload identity, least privilege, network reachability, secret
  access/rotation, encryption, audit, tenant isolation, observability, alerts,
  cost bounds, upgrade, drift, and teardown for the routed resource topology.
- Probe missing, forged, and mismatched tenant context plus cross-tenant
  database IDs, cache keys, messages, acknowledgements, subscriptions,
  dead-letter access, replay/redrive, backup/restore, operator access, and
  telemetry queries; prove no cross-tenant side effect.
- Probe every messaging action with wrong role, tenant, resource, audience,
  action, schema, destination, and wildcard expansion.
- Probe stale, revoked, future, wrong-audience, wrong-resource, wrong-role, and
  wrong-tenant credentials, credential copying, rotation, and emergency
  revocation during active work.
- Run synthetic telemetry canary leak tests at pre-export buffers and every
  configured destination, then verify bounded test-data deletion.
- Report authored graph/spec, mechanically validated pair, applied
  infrastructure, observed runtime, restored state, and production eligibility
  as separate evidence gates.

## Exceptions

A binding provider or platform mandate may constrain candidate selection, but
it does not move provider choice into this profile or waive ownership,
isolation, capacity, failure, migration, recovery, cost, and exit proof. A
bounded disposable job may use lighter availability and recovery only when its
inputs, outputs, budget, data classification, cleanup, and promotion boundary
are explicit.

Stop adoption if a resource/provider catalog leaks into this pair, a shared
resource lacks one owner or omits a consumer, a client bypasses an owned backend
interface, cache/event/module semantics move into shared infrastructure,
multi-tenant scope lacks resolved tenancy enforcement, messaging permissions
are implicit or wildcard, workloads share exported credentials, stale
credentials can fall back, or telemetry can export unallowlisted sensitive
data.
