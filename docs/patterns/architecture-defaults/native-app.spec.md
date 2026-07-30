# Native App Default

- Pair ID: `native-app`
- Graph: `docs/patterns/architecture-defaults/native-app.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use this archetype for a Swift, Kotlin, React Native, or Flutter client with
multiple product features, remote data, navigation, and platform capabilities.
It creates durable boundaries between presentation, use cases, domain policy,
repositories, local or remote data, and device APIs.

Keep a single-screen prototype shallow. Add the boundaries when behavior,
testing, offline state, platform integration, or ownership makes them useful.

## Default Architecture

```text
app lifecycle and navigation root
  -> feature presentation and one explicit UI-state owner
      -> use cases
          -> domain policy
          -> repository contracts
              <- remote adapter
              <- local adapter
          -> platform capability adapters
all feature outcomes -> crash, performance, network, and sync evidence
```

Presentation maps user intent into use-case calls and renders explicit state.
Use cases own workflows. Domain code owns platform-independent invariants.
Repositories own data-source and freshness contracts. Adapters own SDKs,
storage, transport, and platform lifecycle details.

## Reference File Structure

### Swift And SwiftUI

```text
App/
  Bootstrap/
  Navigation/
Features/
  <Feature>/
    Presentation/
    Application/
    Domain/
    Data/
Core/
  Networking/
  Persistence/
  Platform/
  DesignSystem/
  Observability/
Tests/
  Feature/
  Contract/
  UI/
```

Use protocols at repository and true platform boundaries. Do not create a
protocol for every concrete type solely to enable mocking.

### Kotlin And Compose

```text
app/
  bootstrap/
  navigation/
feature/
  <feature>/
    presentation/
    application/
    domain/
    data/
core/
  network/
  database/
  platform/
  designsystem/
  observability/
tests/
  feature/
  contract/
  ui/
```

In a multi-module app, promote a feature or core area into a build module only
when compilation, ownership, reuse, or isolation evidence justifies the cost.

### React Native

```text
src/
  app/
    bootstrap/
    navigation/
  features/
    <feature>/
      ui/
      application/
      domain/
      data/
  core/
    api/
    storage/
    platform/
    design-system/
    observability/
  native/
tests/
  feature/
  contract/
  e2e/
```

Keep native modules behind `core/platform` or a feature-owned adapter. Shared
JavaScript code does not remove platform lifecycle, permission, or release
obligations.

### Flutter

```text
lib/
  app/
    bootstrap/
    navigation/
  features/
    <feature>/
      presentation/
      application/
      domain/
      data/
  core/
    network/
    storage/
    platform/
    design_system/
    observability/
test/
integration_test/
```

Keep generated serialization and platform-channel code at the adapter boundary.

## Default Decisions

### State And Navigation

- Use one explicit state owner per screen or feature flow.
- Model user intent and state transitions; do not scatter side effects across
  view lifecycle callbacks.
- Keep navigation requests typed or centrally mapped enough to test deep links,
  restoration, invalid routes, and authentication transitions.
- Persist only state that must survive process death; version its schema.

### Data And Offline

- Presentation depends on use cases rather than network or database SDKs.
- Repository contracts name freshness, source choice, and failure semantics.
- Offline-first is opt-in. If adopted, declare local interaction authority,
  sync direction, conflict policy, tombstones, migrations, retention, and
  recovery after partial synchronization.
- Secure tokens and keys belong in platform secure storage; caches and logs must
  not expose them.

### Platform Capabilities

- Model permission not-determined, denied, restricted, granted, interrupted,
  and revoked states where the platform supports them.
- Bound background work and make duplicate delivery or resume idempotent.
- Treat push notifications, universal/deep links, camera, location, files, and
  payments as external or platform adapters with testable input contracts.
- Keep analytics and crash reports behind consent, privacy, and redaction rules.

### Release And Compatibility

- Track supported OS versions, database migrations, API compatibility, feature
  availability, and rollback or kill-switch behavior where needed.
- Do not claim cross-platform parity without a per-platform behavior ledger.
- Test real devices or platform simulators for lifecycle and capability paths
  that unit tests cannot prove.

## Validation Contract

- Cover app launch, restoration, deep link, authentication change, background,
  foreground, interruption, and process death where relevant.
- Exercise loading, empty, success, stale, offline, sync conflict, permission
  denial, provider failure, and retry states.
- Contract-test remote/local repository behavior and migrations.
- Verify accessibility semantics, dynamic text, keyboard or switch navigation,
  contrast, reduced motion, localization, and orientation or window resizing.
- Run release build, signing/config sanity, crash, memory, startup, and network
  checks for each supported platform; distinguish simulator from device proof.

## Exceptions

Use the target platform's established architecture when it owns the same
responsibilities coherently. Adapt for games, media pipelines, embedded apps,
or deeply offline products whose runtime loop or data authority differs.
Record the mapping from the replacement architecture to presentation, use-case,
domain, repository, platform, lifecycle, and validation ownership.
