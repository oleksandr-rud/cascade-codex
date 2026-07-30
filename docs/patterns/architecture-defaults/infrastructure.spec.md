# Infrastructure

- Pair ID: `infrastructure`
- Graph: `docs/patterns/architecture-defaults/infrastructure.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use after `stack-selection` when application units need deployable resources or
several units share infrastructure. This pair owns resource scope and
cross-resource topology. Application runtimes and libraries remain under
`app-stack`.

## Default Architecture

```text
source-linked infrastructure claims and policies
  -> deployment scopes
  -> application units
  -> backend | frontend | native | CLI | experiment | library infrastructure profile
  -> resource units
  -> compute | data | messaging | delivery extension
  -> candidate resource/provider topologies
  -> failure, recovery, security, scale, cost, and teardown proof
  -> selected infrastructure and owners
```

### Deployment Scope Contract

Each scope records:

- environment and release lifecycle;
- regions or locality;
- tenant, account, or isolation boundary;
- consuming application units;
- workload identity and network boundary;
- availability, recovery, residency, security, and cost policies;
- owner, budget, alerts, support horizon, and teardown route.

Do not force one infrastructure choice per application unit. A resource may be
shared when ownership, isolation, capacity, failure, and lifecycle contracts
are explicit. Conversely, repository co-location does not justify shared
runtime or data infrastructure.

### Tenant And Shared-Resource Isolation

Every multi-tenant deployment scope must resolve `tenancy-strategy`. The
effective tenant is derived from authenticated caller or workload context, not
from an untrusted request field alone. Missing, conflicting, or unauthorized
tenant context fails closed.

Carry the effective scope through:

- database predicates, partitions, row policies, migrations, backup, restore,
  export, purge, and reconciliation;
- cache namespaces and keys;
- queue, pub/sub, stream, scheduler, dead-letter, replay, and administrative
  permissions;
- object paths, search indexes, session stores, telemetry access, retention,
  teardown, and recovery.

Require negative probes with the same object ID under another tenant, missing
scope, mismatched caller/workload context, replay, restore, and operator
actions. A shared resource is acceptable only when those checks, noisy-neighbor
capacity limits, failure isolation, and tenant-safe recovery are proved.

### Workload Identity And Secret Lifecycle

Prefer managed, short-lived workload identity scoped to the exact audience,
resource, role, environment, and tenant boundary. Shared exported cloud keys
or credentials are not a supported default.

Record issuance, rotation, emergency revocation, stale-credential rejection,
break-glass access, audit, and teardown. A true external system that supports
only static credentials requires isolation, minimum scope, rotation,
monitoring, an explicit provider limitation, and an exit plan.

### Telemetry Data Boundary

Telemetry uses allowlisted structured fields. Exclude message bodies, request
payloads, tokens, secrets, raw personal data, and tenant-confidential values
unless an explicit classified field contract permits them. Redact before
export, not only at the sink.

Define tenant-aware access, retention, deletion, sampling, trace-baggage
limits, public-ingestion abuse controls, and audit for grants, break-glass,
restore, export, purge, replay, and teardown. Run sensitive canary values
through errors, poison messages, logs, metrics, traces, crash reports, and
source maps and prove they cannot be retrieved by an unauthorized actor.

### Application Contour Profiles

Derive one contour profile from each application unit's existing `app_type`
before selecting resource units:

| Application type | Infrastructure profile | Default boundary |
|---|---|---|
| `backend-service`, `backend-worker` | `backend-infrastructure` | API, BFF, worker, consumer, scheduler, or batch runtime with backend-owned data and messaging |
| `web-frontend` | `frontend-infrastructure` | static, SSR, streaming, edge, hybrid, or embedded-BFF delivery |
| `native-app` | `native-infrastructure` | device application delivery plus an explicit remote-backend boundary |
| `cli` | `cli-infrastructure` | no operated infrastructure by default; distribution and remote-control-plane boundaries are explicit |
| `experiment` | `experiment-infrastructure` | local or ephemeral resources by default with budget, TTL, teardown, and promotion boundaries |
| `library` | `library-infrastructure` | no production runtime by default; only evidence-backed build, package, artifact, signing, provenance, documentation, release, or browser-bundle resources |

The profile owns contour-specific resource needs, coupling rules, defaults,
exceptions, and proof. It does not select provider products. Each operated
resource still routes independently through exactly one resource extension.

An SDK may consume a hosted API, but it does not own that API's compute,
database, cache, queue, pub/sub, stream, or service credentials. Those remain
with a separate backend application unit. Ordinary app-internal `src/libs` or
`src/shared` code stays inside its owning application rather than creating a
library infrastructure profile.

### Fullstack Composition

`fullstack` is a composition, not another application type or infrastructure
pair:

```text
browser
  -> frontend delivery / SSR unit
  -> optional embedded or separate BFF
  -> backend API
  -> authoritative data, cache, and messaging resources
  -> workers or consumers
```

An embedded BFF may stay inside the frontend unit only when its build,
deployment, owner, release lifecycle, and UI-aggregation purpose are
inseparable. Domain workflows, durable data, independent contracts, multiple
clients, messaging consumers, independent scaling, or an independent release
lifecycle require a separate `backend-service` unit.

Frontend SSR and BFF code call owned application interfaces. Browser, device,
and CLI code never receive service database, cache-service, broker, or
infrastructure credentials. Device-local and process-local storage remain
application adapters rather than operated `infrastructure-data` resources.

### Resource Extension Routing

| Resource concern | Extension |
|---|---|
| Process placement, runtime compute, scaling, scheduling, workload identity | `infrastructure-compute` |
| Database, cache service, object/blob, search, backup, restore, residency | `infrastructure-data` |
| Queue, pub/sub, stream, schedule, delivery, retry, dead letter, replay | `infrastructure-messaging` |
| Network/edge, DNS/TLS, CDN/WAF, CI/CD, artifacts, config/secrets, observability, IaC | `infrastructure-delivery` |

Select only resource extensions actually required by the system. A static
frontend may need delivery and edge resources without data or messaging. A
local CLI may require none.

## Reference File Structure

Use the target's infrastructure owner:

```text
infra/
  modules/ or components/
  environments/
  policies/
  observability/
docs/architecture/
  stack-selection.json
  infrastructure-profile.md
```

Do not create `infra/` when the target already has a canonical owner. Record
provider resources, environment overlays, identities, secrets references,
resource dependencies, migrations, recovery, cost controls, and teardown in
that existing system.

## Default Decisions

- Scope resources before provider products.
- Prefer the supported existing platform and managed services when constraints
  allow.
- Avoid multi-cloud or duplicated control planes without a specific resilience,
  regulatory, isolation, or organizational requirement.
- Make shared resources explicit multi-consumer products with isolation,
  capacity, and lifecycle contracts.
- Route application units through their contour profiles before choosing
  resource extensions or providers.
- Keep fullstack systems as explicit frontend, BFF, backend, and worker
  composition rather than a combined application type.
- Keep libraries at an explicit no-production-runtime result unless
  build/distribution evidence justifies compute or delivery resources.
- Keep infrastructure reproducible and drift-detectable.
- Treat backup existence and restore evidence as separate claims.
- Include migration and exit constraints in provider selection.

## Validation Contract

- Validate every resource scope, consumer, owner, policy, dependency, and
  lifecycle.
- Validate that every application unit resolves to one contour infrastructure
  profile and that a no-resource result remains available for local units.
- Validate shared-resource ownership, consumers, isolation, capacity, failure
  domain, recovery, lifecycle, budget, and teardown.
- For multi-tenant scopes, validate authenticated tenant derivation,
  deny-on-missing/mismatch behavior, tenant-aware keys, partitions,
  subscriptions, replay, restore, telemetry, and cross-tenant negative probes.
- Validate managed short-lived workload identities, audience/resource/role
  scope, non-exportability, rotation, emergency revocation, and stale
  credential rejection.
- Validate telemetry allowlists, sensitive payload exclusion, redaction before
  export, tenant-aware access, retention/deletion, sampling, ingestion abuse
  controls, and privileged audit.
- Reject client-side service credentials and direct access to an owning
  service's database, cache service, queue, pub/sub, or stream.
- Prove provisioning from a clean state and safe repeat application.
- Prove least privilege, secret access, network reachability, encryption,
  audit, tenant isolation, and data residency.
- Prove representative failure, recovery/restore, scaling, telemetry, alerts,
  cost guardrails, upgrades, drift handling, and teardown.
- Separate authored IaC, validated plan, applied environment, observed runtime,
  and production/release eligibility.

## Exceptions

A provider mandate may fix the control plane but not the resource topology,
security, recovery, cost, or lifecycle proof. A bounded experiment may use
ephemeral infrastructure with lighter availability requirements only when
budget, data classification, cleanup, and promotion boundaries are enforced.
