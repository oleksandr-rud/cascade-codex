# SDK And Library Default

- Pair ID: `sdk-library`
- Graph: `docs/patterns/architecture-defaults/sdk-library.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use this archetype when a package is independently versioned, released,
distributed, or consumed across an explicit ownership boundary. SDK is a
profile of the `library` application type, not another application type.

The threshold is lifecycle independence, not a folder name. Code in
`src/libs`, `src/shared`, or an in-app UI folder remains part of its owning
application unless it has an independent public contract plus version,
distribution, consumer, and support responsibilities.

## Default Architecture

```text
stable public exports
  -> library-owned core behavior
      -> consumer and external-dependency ports
          <- runtime, platform, transport, FFI, and provider adapters
          <- isolated generated code

named consumers
  -> public exports only
  -> examples, documentation, and contract fixtures

compatibility + versioning + migration + deprecation
  -> release gates
  -> identified, signed, provenance-linked artifacts

hosted API, data, cache, messaging, or control plane
  -> separate backend application unit or true external dependency
```

The package owns client or reusable-library behavior. It never becomes the
owner of a hosted capability merely because its adapter calls that capability.

## Library And SDK Profiles

| Profile | Owns | Required proof |
|---|---|---|
| Generated API SDK | Stable facade, generated transport or model boundary, generator and input-contract identity, regeneration, wire compatibility, errors, retries, auth attachment, and docs | Generated output is isolated or explicitly public; regeneration is deterministic enough to review; server-contract fixtures detect drift |
| Hand-authored SDK | Intentional domain-oriented client surface, transport port and adapter, configuration, auth attachment, errors, pagination/streaming, resilience, and examples | Behavior and wire contracts are tested without leaking provider transport types through the public API |
| Internal library | Public surface for named internal consumers, ownership, dependency policy, compatibility horizon, release or coordinated-version contract | The package is not merely an app-local helper folder; consumers and change coordination are explicit |
| Public library | Stable documented exports, broad compatibility policy, security response, release, migration, deprecation, and support lifecycle | Clean consumer installation, package integrity, provenance, dependency bounds, public documentation, and supported-version tests |
| Platform SDK | Platform lifecycle, capability, permission, threading, storage, packaging, and distribution adapters behind a stable contract | Required platform versions, device or host behavior, permission denial, lifecycle transitions, and upgrade ownership are proved |
| Adapted WASM, FFI, or binary binding | Stable host-language surface and a narrow serialization, memory, threading, error, ownership, and binary-compatibility boundary | Supported targets, ABI or module compatibility, resource cleanup, sandboxing, debugging, packaging, signing, and fallback behavior are proved |

These are candidate profiles. A selected library uses only the profiles
supported by source-linked consumer and distribution claims.

## Reference File Structure

```text
packages/<library>/
  src/
    index.*                 # supported public surface
    core/                   # library-owned behavior
    ports/                  # consumer or external-dependency contracts
    adapters/               # transport, runtime, platform, FFI, provider
    generated/              # isolated and replaceable; never hand-edited
  examples/
  docs/
  tests/
    contract/
    consumers/
    compatibility/
    generated/
  scripts/
    generate.*
    verify-release.*
  package manifest and export map
  compatibility policy
  migration and deprecation notes
  release metadata
```

Use idiomatic names for the selected ecosystem. The ownership boundaries are
more important than the literal folders:

- consumers import only supported exports;
- core behavior does not depend on package-manager, transport, platform, or
  generated implementation types;
- ports are introduced only for real consumer variation, external boundaries,
  or costly test dependencies;
- adapters contain protocol and platform mechanics;
- generated sources are replaceable outputs whose input and generator are
  identified;
- examples compile or execute against the same supported exports as consumers.

Do not promote a single-use helper into a package to satisfy this tree.

## Public API And Dependency Direction

Treat export paths, symbols, types, protocols, configuration, errors, default
behavior, serialization, side effects, and documented examples as the public
contract. An export map or equivalent boundary must reject unsupported deep
imports. Public types should not expose generated, provider, build-tool, or
transport implementation types unless that exposure is an intentional,
versioned contract.

Dependency direction is:

```text
public exports -> core -> ports
adapters -> ports
generated output -> adapter or deliberate public facade
consumers -X-> core, adapter, generated, test, or build internals
```

Keep a package shallow until real behavior justifies submodules. Do not add a
port around deterministic code with no variation or test cost.

## Generated Code And Contract Drift

Record the generator name and version, input schema or interface identity,
configuration, command, output manifest, and expected manual wrapper changes.
Generated files are never silently hand-edited. Regeneration must either be
reproducible or produce a reviewable normalized diff.

A generated API SDK release verifies:

- the authoritative server interface or schema identity;
- supported operations, models, errors, authentication, pagination,
  streaming, cancellation, and version negotiation;
- stable wrapper exports and absence of consumer deep imports;
- regeneration from a clean checkout;
- representative consumer examples and server-contract fixtures;
- removed or changed server behavior against the compatibility and migration
  policy.

Generated output does not waive supply-chain review. Generator packages,
templates, remote inputs, native binaries, post-install hooks, and emitted
artifacts are release inputs with explicit trust and provenance.

## Compatibility, Versioning, Migration, And Deprecation

Name the supported runtime, language, platform, protocol, dependency, and
consumer matrix. Classify changes against the selected ecosystem's versioning
convention, with semantic versioning as the default compatibility signal.

Every breaking or behaviorally material change includes:

- affected exports, wire or binary contracts, consumers, and support versions;
- a version and release classification;
- migration instructions and, where practical, automated detection or
  codemods owned outside the runtime package;
- upgrade tests from supported previous versions;
- rollback or forward-recovery behavior;
- deprecation notice, replacement, support window, and removal release.

Emergency security removal may shorten the window, but still publishes the
rationale, affected versions, replacement, and recovery path.

## Documentation, Examples, And Consumer Evidence

Documentation and examples are executable compatibility assets, not marketing
prose. Cover installation, initialization, configuration, authentication
attachment, normal use, errors, retries and timeouts where owned, cleanup,
upgrade, migration, security boundaries, and troubleshooting.

Contract tests verify supported exports and behavior. Consumer fixtures cover
the named runtimes or applications that establish compatibility. A public
package needs clean-install tests in supported environments; an internal
package needs the declared release or coordinated-version route. Keep authored
documentation, structurally validated examples, executed consumer tests,
published artifacts, and release eligibility as separate evidence gates.

## Release, Provenance, And Security

Release only an identified artifact. Record source revision, dependency lock
or resolved dependency identity, toolchain, generator inputs, build
environment, tests, artifact digest, signature or package-authority
attestation, publication target, and release actor or workload identity.

- prefer managed short-lived, resource- and role-scoped release identity;
- prevent build and documentation jobs from receiving publication credentials
  unless they perform that bounded action;
- protect signing keys, define rotation and emergency revocation, and reject
  stale credentials;
- minimize runtime and build dependencies and review install hooks, generators,
  templates, binaries, licenses, vulnerabilities, and compromised-version
  response;
- map each dependency namespace to approved registries or mirrors, reserve
  private package names against public takeover, require integrity-verified
  resolution, and review lockfile or resolved-source drift;
- disable install hooks where possible; otherwise sandbox them with bounded
  filesystem, credential, and network access, and restrict build egress to
  approved dependency and provenance endpoints;
- run dependency-confusion and typosquatting fixtures before signing so a
  higher public version or lookalike package cannot replace a private or
  approved dependency;
- exclude secrets, credentials, private source, tenant data, and sensitive
  telemetry from package artifacts, source maps, examples, docs, logs, and
  provenance;
- verify the published artifact, not only the source tree, before promotion.

## Hosted Capability Boundary

| Concern | Library owns | Separate owner |
|---|---|---|
| API SDK | Client surface, request/response mapping, auth attachment, compatibility, errors, resilience, and docs | Hosted API behavior, authorization, availability, and data belong to a backend unit or true external provider |
| Data, cache, queue, stream, or pub/sub client | Adapter contract and safe client behavior | Operated resource, credentials, tenant isolation, recovery, capacity, cost, and teardown belong to a backend unit |
| Registry publication | Package identity, compatibility, release declaration, and verification | Selected registry and artifact resources are delivery infrastructure |
| Telemetry emission | Allowlisted fields, redaction, configuration, disablement where applicable, and failure isolation | Receiver and processing service are backend-owned or true external |
| Hosted documentation or developer portal | Content contract and version mapping | Hosting and any dynamic control plane are delivery infrastructure or a separate backend unit |

A repository may contain both a library and its hosted backend. Record them as
separate application units with an owned interface and independent stack,
infrastructure, failure, security, and lifecycle evidence.

## Separately Released UI Libraries

A separately versioned and released UI package composes `sdk-library` with
`frontend-ui-platform`:

- `sdk-library` owns package exports, dependency bounds, compatibility,
  consumers, versioning, migration, deprecation, signing, provenance, and
  publication;
- `frontend-ui-platform` owns tokens, accessible primitives, components,
  patterns, themes, localization, visual states, payload behavior, and
  accessibility evidence.

An in-app UI folder remains source-owned by its web application until the
independent-package threshold is met. The composition does not duplicate UI
governance or create a second package lifecycle.

## Negative Routing Examples

| ID | Input | Required result |
|---|---|---|
| `SL-002` | Backend API and worker code share technical primitives under `src/libs`. | Keep the code within the backend application ownership; do not create a `library` unit without independent version, distribution, consumer, or owner evidence. |
| `SL-003` | A generated API SDK is released. | Isolate generated output behind supported exports, record generator and server-contract identities, prohibit deep imports, and gate release on regeneration and contract tests. |
| `SL-005` | An SDK calls a project-owned hosted API and its database-backed workflows. | The SDK owns client compatibility only; classify the API and its operated data resources as a separate backend unit. |
| `SL-006` | A separately released component library serves several frontends. | Compose `sdk-library` package lifecycle with `frontend-ui-platform` UI and accessibility governance. |
| `SL-007` | A package embeds a generated or downloaded binary without target, signature, or provenance proof. | Reject release until supported targets, integrity, trust source, sandbox or isolation, update, revocation, and recovery are proved. |

## Default Decisions

- Create a library application unit only after independent versioning,
  release, distribution, consumption, or ownership is established.
- Keep one intentional public surface and prohibit unsupported deep imports.
- Isolate generated output and make its input, generator, regeneration, and
  server-contract evidence reviewable.
- Derive compatibility and support from named consumers or a recorded
  standards obligation.
- Version public changes consistently and pair material changes with migration
  and upgrade evidence.
- Deprecate through an alternative, support window, and explicit removal
  release unless an urgent security response requires faster action.
- Release identified artifacts with verifiable source, dependency, toolchain,
  generator, build, test, signing, and publication provenance.
- Protect both runtime and build-time dependency and supply-chain boundaries.
- Keep hosted APIs, data, caches, messaging, registries, receivers, and control
  planes under separate resource or backend owners.

## Validation Contract

- Verify the independent-package threshold, named consumers, ownership,
  supported exports, and absence of unsupported deep imports.
- Compile or execute documented examples and clean-install representative
  consumer fixtures using the published artifact.
- Contract-test public behavior, errors, configuration, serialization,
  protocol, runtime, platform, dependency, and supported-version boundaries.
- Regenerate generated sources from their recorded inputs and toolchain; review
  normalized output and run server-contract tests.
- Exercise compatible and incompatible upgrades, dependency bounds,
  migrations, deprecations, removed behavior, rollback or forward recovery,
  and support-window enforcement.
- Verify artifact contents, digest, signature or attestation, source and build
  provenance, dependency inventory, vulnerability response, release identity,
  credential isolation, revocation, and compromised-release recovery.
- For WASM, FFI, or binary bindings, cover target compatibility, memory and
  resource ownership, threading, serialization, errors, sandboxing, cleanup,
  packaging, signature, and fallback behavior.
- Prove hosted APIs, data, caches, messaging, telemetry receivers, portals, and
  control planes remain separately owned and receive independent application
  and infrastructure evidence.
- For UI libraries, run the functional, accessibility, visual, localization,
  theme, payload, and consumer checks owned by `frontend-ui-platform` in
  addition to the package lifecycle checks here.

## Exceptions

A standards-governed library may support a compatibility surface broader than
its current named consumers. A monorepo may coordinate versions without a
public registry. A platform may mandate its own version, signing, or package
authority. Adapt those mechanics while preserving the independent-package
threshold, supported public surface, consumer evidence, compatibility,
migration, deprecation, release provenance, dependency security, and separate
hosted-capability ownership.
