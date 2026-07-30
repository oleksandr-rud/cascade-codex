# Native Stack

- Pair ID: `native-stack`
- Graph: `docs/patterns/architecture-defaults/native-stack.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use for a `native-app` after platform, device, offline, lifecycle, distribution,
team, and shared-code claims are known.

## Default Architecture

```text
platform and product claims
  -> platform-native | cross-platform UI | shared core with native UI
  -> device, lifecycle, accessibility, sync, packaging, and update proof
  -> selected application technology and platform owners
```

### Native Candidate Families

| Candidate family | Prefer when | Prove first |
|---|---|---|
| Platform-native | Deep device APIs, platform UX, lifecycle/background behavior, accessibility, performance, or release cadence dominates | Cross-platform reuse is not worth separate implementations |
| Cross-platform UI | Product behavior is substantially shared and one team can own platform integration | Device API escape hatches, lifecycle, accessibility, performance, binary size, upgrades, and store behavior |
| Shared core with native UI | Domain, data, sync, or protocol reuse is valuable but presentation must remain platform-owned | Foreign-function boundary, threading, serialization, debugging, packaging, and release ownership |

The paired `native-app` archetype already supplies Swift, Kotlin, React Native,
and Flutter path overlays. This extension selects among technology families
from target evidence; it does not make all overlays default candidates.

## Reference File Structure

Apply the chosen technology to feature, domain, data, offline/sync, and
platform-adapter boundaries from `native-app`. Platform SDK types must not
become shared domain contracts solely to increase code reuse.

## Default Decisions

- Choose platform capability and lifecycle depth before code-reuse preference.
- Prefer sharing stable domain/data behavior before sharing platform UI.
- Require explicit platform escape hatches and owners for cross-platform
  technology.

## Validation Contract

- Prove required device APIs and degraded behavior when permissions or services
  are unavailable.
- Prove lifecycle transitions, background work, offline/sync, conflict handling,
  accessibility, memory, startup, and performance.
- Prove signing, packaging, store or enterprise distribution, updates,
  telemetry, crash handling, and framework upgrade ownership.

## Exceptions

Record `GAP` when project descriptions do not identify target platforms,
required device capabilities, distribution route, or ownership. Do not select
cross-platform technology from a generic desire to share code.
