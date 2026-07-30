# Library Infrastructure

- Pair ID: `library-infrastructure`
- Graph: `docs/patterns/architecture-defaults/library-infrastructure.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Evaluate this pair after `infrastructure`, `sdk-library`, and `library-stack`.
Its default result is no production runtime. Add only evidence-backed build,
package-registry, artifact, signing, provenance, documentation, release, or
browser-bundle resources, routed through the existing compute and delivery
authorities.

A library executes inside its consumers. A hosted API, telemetry receiver,
developer portal control plane, database, cache, queue, stream, pub/sub, or
other operated capability is not library infrastructure. Project-owned hosted
behavior is a separate backend application unit; a third-party hosted service
is a true external boundary.

## Default Architecture

```text
library release scope
  -> no production runtime                              [default]
  -> isolated build or generation compute              [if evidenced]
  -> identified package, binary, docs, and bundle artifacts
  -> signing or attestation + provenance
  -> package registry, documentation, and release channels
  -> verification, rollback or yanking, deprecation, retirement

hosted API, data, cache, messaging, telemetry, or control plane
  -> separate backend application unit or true external dependency
```

The absence of operated resources is a valid selected profile. A package may
be built and published entirely through an existing owned pipeline without
creating new compute or infrastructure code.

## Resource Routing

| Concern | Authority | Library rule |
|---|---|---|
| Build, generation, contract-test, documentation, signing, or multi-target execution | `infrastructure-compute` | Select only when an operated build workload is justified and not already satisfied by an owned pipeline. Record isolation, identity, network, cache, reproducibility, limits, cost, failure, and teardown. |
| Registries, artifacts, documentation delivery, signing secrets, provenance, promotion, release, observability, rollback, and infrastructure code | `infrastructure-delivery` | Select only for declared package and support channels. Name artifact identity, access, integrity, retention, recovery, and exit constraints. |
| Browser bundles, WASM, types, workers, and source maps | `infrastructure-delivery` | Treat as immutable package artifacts. Verify integrity, compatibility, payload, source-map and secret exposure, provenance, cache behavior, and rollback. |
| Hosted API or service | Separate backend unit or true external dependency | The library owns client compatibility, not service runtime, state, authorization, availability, or recovery. |
| Database, cache service, object/search domain store | Separate backend unit through `infrastructure-data` | Never select as a production resource of the library. Build artifacts and release manifests remain delivery resources. |
| Queue, pub/sub, or stream | Separate backend unit through `infrastructure-messaging` | Never select as a production resource of the library. A client adapter does not own the broker. |

`library-infrastructure` is compatible only with `infrastructure-compute` and
`infrastructure-delivery`. Data and messaging extensions may exist in the
composed system, but they belong to separately classified backend application
units.

## No-Production-Runtime Result

Record:

- the library unit, named consumers, supported targets, owners, and release
  lifecycle;
- whether an existing build and release system already satisfies the need;
- why no request, worker, scheduler, consumer, server, database, cache, broker,
  or control-plane resource is owned by the package;
- any true external registries or hosted services plus their trust, failure,
  support, migration, and exit boundaries.

Every library-owned resource uses a typed lifecycle. Compute is limited to
`bounded-build`, `bounded-generation`, `bounded-test`,
`bounded-documentation`, or `bounded-signing`; delivery-side resources use
`distribution-resource` or `external-managed`. Each resource records teardown.
Free-text labels such as `24x7-production-service-runtime` are rejected even
when the role is named `build`.

Do not add provider accounts, IaC, runtime compute, telemetry services, or
datastores solely because a reusable package is considered production quality.

## Build And Artifact Resources

When operated build compute is justified, define:

- clean source and dependency inputs, toolchain, generator inputs, supported
  target matrix, build command, environment, network policy, caches, limits,
  and teardown;
- approved registry or mirror mapping per dependency namespace, private-name
  reservation, integrity-verified resolution, lock/resolution drift review,
  install-hook disablement or sandboxing, and bounded build egress;
- isolated build and release identities, least privilege, non-exportable or
  short-lived credentials where supported, secret injection, audit, rotation,
  emergency revocation, and stale-credential rejection;
- deterministic or normalized reproducibility, artifact manifest and digest,
  test evidence, signature or attestation, provenance, retention, and deletion;
- failure, retry, partial output, poisoned-cache, compromised dependency,
  compromised generator, signing outage, cost, and recovery behavior.

Build caches are pipeline optimizations, not authoritative package inputs.
Their keys include every compatibility-relevant source, dependency, toolchain,
generator, target, and configuration identity. A cache hit cannot skip
artifact verification or provenance.

## Registry, Documentation, And Release

For every selected distribution channel, record:

- package name and namespace ownership, authentication, authorization, package
  integrity, immutability, yanking or deletion behavior, retention, mirrors,
  availability, audit, and account recovery;
- dependency-confusion and typosquatting defenses across private/public
  namespaces, approved sources, mirrors, version precedence, and integrity;
- static documentation artifact identity, package-version mapping, redirects,
  search or indexing boundary, security headers, retention, rollback, and
  retirement;
- release channels, promotion inputs, approvals, compatibility gates, staged
  availability, published-artifact verification, rollback or forward recovery,
  yanking, deprecation, support windows, and channel retirement;
- source, dependency, toolchain, generator, build, test, artifact, signature,
  publication, and release-actor provenance.

A dynamic developer portal, key-management UI, telemetry processor, or hosted
update coordinator is a backend application unit. Static versioned
documentation remains a delivery artifact.

## Browser Bundle Resources

Browser-consumable packages may publish module bundles, workers, WASM, types,
maps, or related artifacts. This selection owns only artifact and delivery
concerns:

- supported browsers, module and worker formats, WASM features, dependency
  externalization, tree-shaking and side-effect contracts;
- payload size, compression, integrity, content type, cache key, CDN behavior,
  invalidation, source maps, license material, and rollback;
- absence of release, cloud, workload, database, cache, queue, broker, or
  observability-management credentials;
- absence of private source, tenant data, sensitive fixtures, environment
  secrets, and unintended telemetry payloads;
- artifact digest, signature or attestation, provenance, version mapping, and
  consumer compatibility evidence.

A browser bundle does not make the library a `web-frontend` unit. If it owns a
deployed user interface, routes, rendering, server execution, or frontend
operations, classify that unit separately through `web-frontend`,
`frontend-stack`, and `frontend-infrastructure`.

## Signing, Identity, Provenance, And Telemetry

Prefer managed short-lived, audience-, role-, and resource-scoped workload
identity. Documentation previews and ordinary validation jobs do not receive
publication or signing credentials. Release jobs receive only the specific
namespace, artifact, channel, and time-bounded capabilities they need.

Signing authority has a named owner, storage boundary, access policy, audit,
rotation, expiry, emergency revocation, stale-credential rejection,
compromised-release response, and recovery path. If a platform mandates a
static signing key, isolate it and record the limitation.

Provenance and release telemetry include only allowlisted structured fields.
Exclude secret values, private keys, source payloads, package contents,
consumer data, tenant data, auth headers, and unbounded errors before export.
Define retention, access, deletion, sampling, cost, ingestion-abuse controls,
and privileged audit. A telemetry receiver remains backend-owned or external.

## Hosted Service Boundary

| Library concern | Package responsibility | Separate hosted responsibility |
|---|---|---|
| API client | Public surface, auth attachment, wire mapping, errors, compatibility, examples | API runtime, authorization, data, availability, scale, telemetry, and recovery |
| Data/cache/messaging adapter | Safe client contract and serialization | Database, cache, object/search store, queue, pub/sub, or stream ownership, credentials, tenant isolation, backup/replay, capacity, cost, and teardown |
| Documentation | Versioned static content and links | Dynamic portal accounts, search service, key provisioning, analytics processing, and control plane |
| Package updates | Compatibility, signature verification, and user-facing result | Hosted update coordinator or policy service |
| Telemetry emission | Allowlist, redaction, identifiers, configuration, disablement where applicable, and failure isolation | Ingestion, processing, access, retention, deletion, alerts, and incident response |

Repository or provider co-location never transfers hosted behavior into the
library profile.

## Negative Routing Examples

| ID | Input | Required result |
|---|---|---|
| `SL-004` | A package needs registry publication and versioned documentation. | Select justified delivery resources and optional build compute; keep production runtime, data, cache, and messaging absent. |
| `SL-005` | An SDK calls a project-owned hosted API backed by a database and queue. | Keep artifact and client concerns here; create a separate backend unit for API, data, and messaging resources. |
| `SL-008` | A browser package publishes ESM and WASM artifacts. | Route them through delivery; do not infer frontend server compute, secrets, sessions, database, cache, or broker resources. |
| `SL-009` | A dynamic developer portal provisions credentials and processes telemetry. | Classify the portal or control plane as a backend unit; static docs may remain delivery-only. |
| `SL-010` | A release job requests shared exported cloud credentials. | Reject the profile until release identity is bounded, isolated, auditable, rotatable, and revocable. |

## Reference File Structure

This pair creates no source scaffold or provider tree. Record the selected
no-resource or evidence-backed distribution profile in existing target owners:

```text
existing stack-selection evidence
  -> library application unit and supported targets
  -> library infrastructure decision record
  -> optional build-compute evidence
  -> optional artifact, signing, provenance, registry, docs, and release evidence
  -> separately owned backend-unit and true-external dependencies
```

Do not add package-registry configuration, release workflows, signing
resources, documentation hosting, provider accounts, telemetry receivers, or
infrastructure code solely because this reference pair was selected.

## Default Decisions

- A library begins with no production runtime.
- Add build compute only from actual build, generation, test, documentation,
  signing, or target-matrix evidence.
- Route distribution resources through `infrastructure-delivery`.
- Protect signing and publication with scoped workload identity, rotation,
  revocation, stale-credential rejection, and audit.
- Link artifacts to source, dependency, toolchain, generator, build, test,
  digest, signature or attestation, publication, and channel provenance.
- Treat browser bundles as delivery artifacts, not as permission for frontend
  runtime or service-resource ownership.
- Classify project-owned hosted services as separate backend units.
- Never select production data, cache, or messaging resources for a library.

## Validation Contract

- Prove `SL-004` yields no production runtime and selects only evidence-backed
  compute and delivery resources.
- Reject a build-labeled compute resource with a production-service lifecycle;
  require a bounded lifecycle and explicit teardown for every library resource.
- Prove `SL-005` routes hosted API, database, cache, and messaging ownership to
  a separate backend unit.
- Verify clean isolated build and generation, supported target matrix,
  dependency/toolchain/generator identities, cache invalidation, reproducible
  or normalized output, failure cleanup, resource limits, cost, and teardown.
- Verify trusted dependency-source mapping, private namespace reservation,
  integrity-checked resolution, reviewed lock/resolution drift, disabled or
  sandboxed install hooks, bounded build egress, and negative
  dependency-confusion/typosquatting probes before signing.
- Verify package, binary, symbol, documentation, and browser artifacts by
  manifest, digest, contents, signature or attestation, provenance, retention,
  deletion, and published-channel identity.
- Exercise registry and documentation unavailability, compromised or missing
  artifacts, partial publication, mirror inconsistency, signing outage,
  interrupted promotion, incompatible release, rollback or yanking,
  deprecation, support-window expiry, and channel retirement.
- Verify release identity least privilege, short-lived and non-exportable
  credentials where supported, secret isolation, rotation, emergency
  revocation, stale-credential rejection, privileged audit, and compromised
  release recovery.
- Inspect published packages, browser bundles, source maps, docs, examples,
  logs, provenance, and telemetry for secrets, infrastructure credentials,
  private source, tenant data, sensitive fixtures, and unallowlisted payloads.
- Verify every hosted API, data, cache, messaging, telemetry, portal, and
  control-plane dependency has a separate backend or true-external owner,
  lifecycle, failure, security, recovery, cost, and exit contract.
- Keep authored graph/spec, validated resource selection, executed build,
  published artifact, observed consumer install, and release eligibility
  separate.

## Exceptions

An existing pipeline or external package authority may satisfy build,
registry, signing, provenance, documentation, and release needs. Record its
resource owner, identity, trust, isolation, failure, recovery, cost, retention,
and exit contract instead of duplicating it. No exception adds a production
runtime, data resource, or messaging resource to the library profile or folds
project-owned hosted behavior into the package.
