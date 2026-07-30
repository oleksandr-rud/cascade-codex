# Native Infrastructure

- Pair ID: `native-infrastructure`
- Graph: `docs/patterns/architecture-defaults/native-infrastructure.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use after `native-app`, `native-stack`, and `infrastructure` when a native
application has evidence-backed release or operated integration needs:
platform builds, signing, stores or enterprise channels, crash/RUM collection,
remote configuration consumption, or push.

Do not use this pair to reclassify device-local application concerns as
operated infrastructure. SQLite, Core Data, Room, files, secure storage, and
device caches remain adapters behind the native application's repository or
platform boundary.

## Default Architecture

```text
native application release scope
  ├─ device-local storage/cache -> native application adapters
  ├─ release matrix -> signed artifacts -> distribution channels
  ├─ client configuration consumer
  ├─ crash/RUM client integration
  └─ push permission, token, receipt, and presentation
       |
       └─ remote API / sync / config / push dispatch
            -> separate backend application unit
            -> separately routed infrastructure resources
```

### Device-Local Versus Operated Boundary

| Concern | Owner | Infrastructure routing |
|---|---|---|
| On-device database, files, secure store, cache | `native-app` local or platform adapter | None |
| Platform build runners, signed release artifacts, stores or enterprise delivery | Native release/delivery scope | `infrastructure-delivery` when evidence requires an operated resource |
| Client crash/RUM integration | Native client integration and privacy contract | Collection/operations resources route through `infrastructure-delivery` |
| Remote configuration consumption | Native client integration | An owned control plane is a separate backend unit |
| Push permission, token lifecycle, receipt, presentation | Native platform adapter | None by itself |
| Server-side targeting and push dispatch | Separate backend unit | Its messaging/delivery resources are selected for that backend |
| Remote API or sync behavior | Separate backend unit or true external boundary | Selected independently from this client profile |

The client may consume a remote service, but consumption does not transfer
service ownership into the native profile. A team-owned sync system,
configuration control plane, API, or dispatcher is independently classified as
`backend-service` or `backend-worker`, then receives its own `app-stack` and
`infrastructure` decisions.

### Release And Trust Contract

For each supported platform and channel, record:

- target operating systems, device or CPU architectures, release modes, and
  minimum supported versions;
- build runner ownership, dependency and toolchain identity, reproducibility,
  artifact digest, and provenance;
- signing identity, credential location by reference, access, audit, rotation,
  expiry, revocation, and recovery;
- store, beta, enterprise, or direct channel review rules, staged rollout,
  halt/rollback route, retention, and retirement;
- configuration schema/version behavior, cached/default values, failure mode,
  and compatibility window;
- crash/RUM purpose, consent or policy basis, minimization, redaction,
  retention, access, region, release identity, and deletion route;
- push permission denial, device-token rotation, account/device association,
  payload minimization, deep-link validation, and receipt behavior.

Do not place signing secrets, raw device tokens, or unrestricted telemetry in
source, artifacts, logs, or general configuration.

### Negative Routing Examples

| ID | Input | Required result |
|---|---|---|
| `NCE-001` | A native app uses SQLite, Core Data, or Room on device. | Keep it in the native local-adapter boundary; do not create an `infrastructure-data` resource. |
| `NCE-002` | Push notifications require server-side dispatch. | Create or select a separate backend unit for targeting/dispatch, then route its messaging/delivery resources; keep only device integration here. |

## Reference File Structure

This pair defines no source scaffold and no provider or IaC tree. Record an
adopted or adapted profile in the target's existing architecture, stack
selection, release, and operational evidence owners. Keep these records linked:

```text
existing stack-selection evidence
  -> native application unit and supported release scope
  -> native infrastructure decision record
  -> artifact/signing/distribution evidence
  -> configuration, crash/RUM, and push integration evidence
  -> separately owned backend-unit decisions
```

Do not add native source paths, remote-service source, provider configuration,
or infrastructure code merely because this reference pair was selected.

## Default Decisions

- `device-local-is-application`: device persistence and caches remain native
  adapters.
- `delivery-from-evidence`: build, signing, and channel resources exist only
  for declared release targets.
- `signing-trust-boundary`: signing identities are least-privileged, audited,
  rotatable, and recoverable.
- `release-matrix`: every supported platform, architecture, mode, and channel
  has reproducible artifact identity.
- `distribution-lifecycle`: channels define review, staged rollout, halt or
  rollback, support, and retirement.
- `configuration-consumer-boundary`: the client consumes compatible
  configuration; a control plane is a separate backend unit.
- `client-observability-privacy`: crash/RUM collection is purposeful,
  minimized, redacted, retained, and access-controlled.
- `push-dispatch-is-backend`: the client owns device interaction, while
  targeting and dispatch are backend behavior.
- `remote-services-are-backends`: owned remote behavior receives independent
  backend stack and infrastructure decisions.

## Validation Contract

- Prove `NCE-001` routes device-local SQLite/Core Data/Room to a native
  application adapter and creates no operated data resource.
- Prove `NCE-002` routes server-side push targeting and dispatch to a separate
  backend unit and only then to messaging/delivery resources.
- Build every supported target from a clean state; verify artifact digests,
  provenance, signature validity, credential isolation, and expiry/revocation
  recovery.
- Exercise channel review, staged rollout, failed release, halt/rollback,
  minimum-version, and retirement behavior.
- Exercise missing, stale, malformed, and incompatible configuration while the
  client retains safe behavior.
- Validate crash/RUM consent or policy basis, redaction, access, retention,
  deletion, region, sampling, release correlation, and offline buffering.
- Validate push permission denial, token rotation, logout/account changes,
  duplicate or stale delivery, payload minimization, deep-link validation, and
  offline receipt.
- Verify each remote API, sync system, configuration service, and push
  dispatcher is either a true external boundary or a separately selected and
  operated backend unit.
- Keep authored configuration, validated release evidence, executed channel
  delivery, observed client behavior, and production eligibility distinct.

## Exceptions

A disposable device-local prototype with no distribution path may omit release
infrastructure and remote integrations. An external release authority may own
signing or delivery, but its trust, artifact, failure, evidence, and recovery
interfaces remain explicit. A third-party remote service is not relabeled as a
project backend; record it as true external. No exception permits an owned
remote API, sync system, control plane, or push dispatcher to be folded into
the native/local profile.
