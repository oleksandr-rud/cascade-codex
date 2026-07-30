# Frontend Infrastructure

- Pair ID: `frontend-infrastructure`
- Graph: `docs/patterns/architecture-defaults/frontend-infrastructure.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use after `infrastructure`, `web-frontend`, and `frontend-stack` when a browser
application needs hosting and operational resources for static delivery, SSR,
streaming, edge execution, hybrid routes, or a frontend-owned server boundary.
The pair maps a resolved web application profile to existing infrastructure
resource extensions. It does not select frameworks or providers.

Use the root `infrastructure` pair without this extension when the target has no
web frontend. Keep an established frontend infrastructure profile when its
delivery, ownership, credential, failure, and lifecycle boundaries already
satisfy this contract.

## Default Architecture

```text
one web-frontend application unit and its rendering claims
  -> static | SSR | streaming | edge placement | route-explicit hybrid
  -> always: artifact, delivery, edge policy, release, and observability
  -> when server code executes: compute, workload identity, secrets, and server telemetry
  -> when justified: edge/response cache, cache service, or server session
  -> no BFF | eligible embedded BFF | separate backend-service BFF
  -> existing infrastructure resource extensions and declared consumers
  -> delivery, security, failure, recovery, scale, cost, and rollback proof
  -> selected frontend infrastructure profile
```

### Delivery Mode Matrix

| Mode | Required infrastructure routing | Explicitly absent or conditional |
|---|---|---|
| Static | Immutable browser artifact plus `infrastructure-delivery` for DNS/TLS, CDN/edge delivery, release, rollback, and browser telemetry ingestion. | No request-time compute, workload secrets, server session, database, cache service, queue, or broker. |
| SSR | `infrastructure-compute` plus `infrastructure-delivery`, workload identity and secrets, correlated server/browser observability, and rollback. | Cache service and server session only from explicit freshness, coordination, or authorization needs. Messaging is not frontend-owned. |
| Streaming | The SSR resources plus a runtime and delivery path that proves streaming compatibility, disconnect behavior, backpressure, timeouts, partial failure, and fallback. | Streaming does not by itself justify durable data, a cache service, queue, or broker. |
| Edge | Delivery-only for static CDN behavior; add compute, workload identity, scoped secrets, telemetry, and recovery when code executes at the edge. | Edge is placement, not a new rendering mode or application type. Data, runtime, locality, cost, and observability limits require proof. |
| Hybrid | A route-class matrix selects static, SSR, streaming, and/or edge placement independently, then deduplicates shared resources. | No implicit "fullstack" resource bundle. Each route records its execution, cache, session, secret, and failure owner. |

Static is the first infrastructure candidate when request-time execution has no
source-linked product value. Static generation during a build remains static
delivery when the deployed artifact performs no request-time server work.
Runtime revalidation, server components, server actions, and route handlers are
server execution and therefore require compute proof.

### Resource Routing

| Concern | Authority | Frontend rule |
|---|---|---|
| Server or edge execution | `infrastructure-compute` | Select only for request-time execution. Record runtime limits, scaling, identity, cold/warm behavior, failure domain, and teardown. |
| Artifacts, network/edge, DNS/TLS, CDN/WAF, release, secrets, and operations | `infrastructure-delivery` | Every frontend selects delivery. Server and edge execution add workload-scoped secret injection and server/edge telemetry. |
| Database, object storage, search, or cache service | `infrastructure-data` | Browser code never accesses these resources directly. Frontend server code may access one directly only when the frontend unit authoritatively owns it; domain data and another unit's resources are reached through the owner's application interface. |
| Browser query cache | `frontend-cache` | Own freshness, invalidation, retry, optimistic, and reconciliation semantics; it is not an infrastructure cache service. |
| HTTP response or edge cache | `infrastructure-delivery` | Record cache key, private/public boundary, variation, revalidation, purge, stale behavior, and sensitive-data exclusions. |
| Shared cache service | `infrastructure-data` | Direct frontend-server access requires frontend-unit ownership, isolation, eviction, outage behavior, and source-of-truth reconciliation. A consumer declaration does not grant another unit's cache credentials. |
| Session | Server application boundary | Keep authoritative session state and secret material server-side. A frontend server may directly access its own scoped session store; the browser may receive only the approved user-scoped cookie or token projection. |
| Queue or broker | Separate backend-service or backend-worker infrastructure | A web frontend and its embedded BFF do not own messaging resources. Classify the owning backend unit first. |
| Observability | Browser, server/edge, delivery, and operations boundaries | Correlate releases and requests while separating public ingestion from management credentials and enforcing redaction, privacy, retention, cost, alerts, and incident ownership. |

Do not duplicate a resource because several application units consume it.
Declare one owner, deployment scope, lifecycle, capacity and isolation
contract, failure impact, cost allocation, and consumer list. Route each
resource through its existing infrastructure extension.

Authoritative resource ownership means the frontend unit owns the schema,
keyspace, or stored-data contract; access policy and credentials; migrations
and lifecycle; backup, restore, and recovery; failure handling; cost; and
teardown. Repository or provider co-location, infrastructure administration,
read-only intent, and listing the frontend as a consumer do not transfer that
authority. SSR, streaming, edge-server, and embedded-BFF code use another
unit's domain data only through that unit's application interface.

### BFF Boundary Determination

An embedded BFF is eligible only when all of these are true:

- it performs UI-specific aggregation, protocol adaptation, or response shaping
  for one frontend;
- it owns no reusable domain workflow, durable business data, queue, broker, or
  independent integration lifecycle;
- it shares the frontend unit's build, release, scaling, security, availability,
  failure, support, and teardown owner;
- no other client depends on it as an independently versioned interface.

If any condition is false, classify a separate `backend-service` application
unit. A BFF that owns domain workflows, durable data, messaging, multiple
clients, independent release or scaling, or a distinct security, availability,
or failure boundary is not frontend infrastructure. The frontend calls its
declared application interface.

Repository co-location, framework route-handler syntax, or a shared hosting
vendor does not override this classification. Conversely, a thin embedded BFF
does not become a seventh application type.

### Browser Credential And Resource Boundary

Deployable browser code may hold user-scoped application authentication
artifacts under the product security contract. It must not contain or obtain
workload, cloud, database, cache-service, queue, broker, deployment, secret
store, or observability-management credentials.

The browser may call an authorized application interface and a deliberately
public telemetry ingestion endpoint. It must not directly access a database,
cache service, queue, or broker. Browser-local storage and in-memory query
caches are client state, not infrastructure resources. Public configuration is
non-secret and must be safe to inspect.

Validate this boundary in built artifacts, source maps, runtime network
requests, configuration injection, logs, telemetry payloads, and error paths.
SSR and embedded-BFF code use workload identity and server-only secrets through
the owning runtime. They must not obtain another unit's database, cache-service,
object-store, search, or infrastructure credentials or directly access those
resources, even when the frontend is named as a consumer. They call the owning
unit's application interface. Direct access is limited to a resource the
frontend unit authoritatively owns, such as its scoped session store.

### Fullstack Composition

`fullstack` describes a delivery composition, not an application type. Compose
the existing `web-frontend` unit with an optional embedded BFF and any
separately classified `backend-service` or `backend-worker` units. Record each
unit's interface, release owner, scaling and failure boundary, and
infrastructure consumers.

An eligible embedded BFF remains inside one `web-frontend` lifecycle while
keeping browser and server modules, credentials, and observability separated.
A separate BFF is a `backend-service`. Shared platform products may host
several units, but provider co-location never creates a duplicate fullstack
resource tree or transfers data and messaging ownership into the frontend.

## Reference File Structure

Use the target's existing application and infrastructure owners. This pair does
not add a scaffold profile or create source or IaC paths:

```text
<frontend owner>/
  browser/ or existing client boundary
  server/  # only for proved SSR, streaming, edge execution, or embedded BFF
<infrastructure owner>/
  existing compute, data, and delivery composition
<architecture evidence owner>/
  frontend infrastructure profile and route-class matrix
```

Keep server-only modules outside the client dependency graph. Keep secret
values outside source and client build configuration. If the target colocates
browser and server code, enforce the boundary through framework server-only
markers, import rules, build inspection, and runtime credential tests.

## Default Decisions

- Start with static delivery and add request-time compute only for source-linked
  rendering, streaming, revalidation, action, or route-handler value.
- Treat edge as a proved execution or delivery placement, not a framework,
  rendering mode, application type, or automatic latency improvement.
- Make every hybrid route class explicit and deduplicate resources after route
  needs are known.
- Keep browser query-cache semantics, HTTP/edge caching, shared cache services,
  and authoritative sessions under separate owners.
- Permit frontend server code to access only frontend-owned data resources;
  reach domain data and every other unit's resources through the owner's
  application interface.
- Prohibit browser ownership of infrastructure credentials and direct
  database, cache-service, queue, or broker access.
- Keep a BFF embedded only while every UI-specific, single-client, and
  shared-lifecycle condition holds; otherwise classify a `backend-service`.
- Model fullstack as application-unit and resource-consumer composition without
  a new application type or resource tree.

## Validation Contract

- For static delivery, prove an immutable artifact, DNS/TLS and edge behavior,
  release verification, rollback, browser telemetry, and the absence of
  request-time compute and server-only resources.
- For SSR, streaming, edge execution, and hybrid routes, prove clean
  provisioning; workload identity; secret isolation and rotation; runtime and
  delivery compatibility; cache and session behavior; browser/server/edge
  telemetry; failure, recovery, scale, cost, rollback, and teardown.
- For streaming, additionally prove disconnects, timeouts, backpressure,
  partial responses, proxy buffering, fallback, and correlation across browser,
  edge, and server.
- For cache and sessions, prove ownership, key or identity scope, tenant and
  user isolation, sensitive-data exclusions, freshness/expiry, invalidation,
  outage behavior, source-of-truth reconciliation, and logout/revocation where
  applicable.
- For BFF classification, record every embedded criterion and separate-service
  trigger. Verify its application interfaces, consumers, domain and data
  ownership, messaging ownership, release, scale, security, failure, and
  support lifecycle.
- Inspect browser bundles, source maps, runtime configuration, network calls,
  logs, telemetry, and failure paths for infrastructure credentials or direct
  database, cache-service, queue, and broker access.
- Negatively test SSR and embedded-BFF configuration, secret injection, and
  runtime calls that request another unit's database, cache-service,
  object-store, or search credentials or resources. Reject access even when the
  frontend is listed as a consumer, and verify the owner's application
  interface is used instead.
- Verify every shared resource has one owner and lifecycle plus explicit
  consumers, isolation, capacity, failure, recovery, cost, and teardown
  contracts.
- Keep authored graph/spec, validated structure, provisioned infrastructure,
  observed runtime, and production or release eligibility as separate evidence
  gates.

## Exceptions

A managed fullstack platform may combine build, hosting, server or edge
compute, delivery, secrets, and observability. Record each underlying resource,
owner, consumer, isolation boundary, platform limit, failure and recovery
behavior, cost, export, migration, rollback, teardown, and exit constraint.
The combined provider surface does not waive browser credential rules, BFF
classification, application-unit identity, or infrastructure resource
ownership.

A fixed framework may constrain which routes can be static, SSR, streaming, or
edge-executed. Adapt the delivery matrix to the actual runtime, but do not label
unsupported behavior as selected. If the required profile needs a new
application type, resource kind, schema field, or `fullstack-infrastructure`
pair, stop and return the gap instead of extending this pair.
