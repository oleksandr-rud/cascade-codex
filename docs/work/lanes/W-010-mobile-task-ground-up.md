# Work Lane: W-010 Mobile Task Ground-Up Implementation

Status: `OPEN`
Owner: `agent-engineer`
Created: 2026-07-27
Lane Model: `single-lane`
Next Gate: `implement-change after W-004 Gate A and W-006 visual seam`
Execution Surface: `internal-subagent`
Dispatch State: `NOT_AUTHORIZED`
Dispatch Authorization: `none`
Runtime Handle: `none`

## Request

Add a first-class `mobile` task for Android emulators and iOS simulators, with
deterministic platform automation, optional Computer Use, device/app lifecycle
control, independent oracles, and explicit simulator-versus-device evidence.

## Acceptance Criteria

- `mobile` is distinct from responsive web/browser tasks.
- Environment identity records platform, OS version, device profile, locale,
  orientation, scale, runtime image, app package/build, install state, and
  reset strategy.
- The adapter can boot, wait for readiness, install, seed, launch, background,
  foreground, terminate, relaunch, uninstall/reset, and verify cleanup.
- Emulator/simulator leases are exclusive and device/app reset is
  identity-bound so concurrent campaigns cannot share state.
- Deterministic platform automation is the default; Computer Use is optional
  for visual or cross-app behavior.
- Permissions, deep links, keyboard, rotation, interruptions, offline/network
  state, process death, and restoration can be expressed and observed.
- App, API, filesystem, accessibility, or device-state oracles determine
  mechanical success.
- Mobile claims bind exact platform, runtime image, OS/device profile,
  simulator-or-device class, app build, driver, policy, oracle, and lifecycle
  scope.
- Device permissions, deep links, cross-app actions, network changes,
  clipboard, accounts, and destructive lifecycle operations emit W-004 policy
  decisions and cannot be authorized by page/app content.
- Android-emulator, iOS-simulator, and real-device coverage are reported
  separately.
- The first executable canary targets Android emulator; iOS remains a macOS
  execution gate rather than an inferred pass.
- Every named mobile run is performed by `simulation-operator`; its claims are
  aggregated only after `simulation-evaluator` emits an identity-matched
  evaluation receipt from frozen evidence.
- The accepted device/app seam can be exposed as a bounded typed tool to W-012
  without allowing an agent profile to bypass device, application,
  permission, lifecycle, cross-app, network, account, or reset policy.

## Scope

In:

- mobile environment provider and adapter;
- Android emulator ground-up canary;
- iOS Simulator adapter contract and macOS-gated canary;
- deterministic and Computer Use drivers;
- device/app evidence, oracle, budgets, permissions, and cleanup.

Out:

- responsive web behavior owned by W-006;
- production app implementation or release-store submission;
- real-device lab integration in the initial slice;
- real user accounts, payments, biometric enrollment, or personal device data.

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| Program | W-004 Gate A | shared lifecycle/result | pending |
| Shared visual seam | W-006 accepted visual-action interface | reuse screenshot/action protocol without browser assumptions | pending |
| Foundation | W-004 environment-provider contract | share lifecycle vocabulary without desktop coupling | pending |
| Native default | `docs/patterns/architecture-defaults/native-app.spec.md` | lifecycle, permissions, simulator/device evidence | current |
| Target project | configured mobile roots/build commands when present | platform-specific implementation | unavailable in Cascade scaffold |

## Campaign Deliverables

| Campaign ID | Tier | Required Evidence Boundary | Status |
|---|---|---|---|
| `mobile-android-emulator-smoke` | deterministic platform | Emulator image/device/app-build identity, install/launch/lifecycle/permission cases, semantic/device oracle, logs, and reset | `NOT_RUN` |
| `mobile-ios-simulator-canary` | macOS-gated platform | Xcode/iOS runtime, simulator/device profile, app-build, lifecycle/oracle evidence, logs, cleanup, and explicit host blocker | `NOT_RUN` |
| `mobile-computer-use-canary` | isolated live canary | Exact simulator/app-build, screenshot/action loop, device/app policies, budgets, independent device/app oracle, and reset | `NOT_RUN` |

Real-device campaigns remain `DEFERRED` until device-lab ownership, reservation,
credentials, privacy, cleanup, and artifact transfer are designed. Android,
iOS, Computer Use, simulator, and real-device claims stay independent.

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `MOB-001` | Given a clean Android emulator, the declared app build installs, launches, and exposes the expected initial semantic state. | device/app identity and assertion | `OPEN` |
| `MOB-002` | Given permission denial, the app shows the expected recoverable state and the task does not change OS permission settings outside policy. | device permission state and screenshot | `OPEN` |
| `MOB-003` | Given background/foreground and process death, the declared state restores according to the task oracle. | lifecycle events and state oracle | `OPEN` |
| `MOB-004` | Given orientation change, the task verifies visible and semantic state without treating responsive web evidence as mobile-app proof. | before/after device evidence | `OPEN` |
| `MOB-005` | Given Computer Use visual completion but failed app/API oracle, the task fails. | action trace and oracle failure | `OPEN` |
| `MOB-006` | Given no macOS/Xcode runtime, an iOS task returns `BLOCKED`; Android success cannot cover it. | platform preflight result | `OPEN` |
| `MOB-007` | Given a simulator pass, the coverage ledger records simulator only and leaves real-device coverage `NOT_RUN`. | coverage ledger | `OPEN` |
| `MOB-008` | Given one Android emulator/app-build pass, the claim ledger supports only that exact device/runtime/build/lifecycle tuple. | scoped mobile claim ledger | `OPEN` |
| `MOB-009` | Given a denied permission or cross-app action, the frozen policy decision prevents safety or release support despite a successful final screenshot. | policy/action trace and claim reduction | `OPEN` |
| `MOB-010` | Given two campaigns request the same emulator/simulator identity, only one lease succeeds; the other blocks before install or launch and cannot reuse the first run's reset evidence. | device lease and reset-isolation fixture | `OPEN` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| Android emulator | current request | mobile environment/adapter/campaign | yes | clean device lifecycle and reset | Android canary | `NOT_RUN` | `implement-change` |
| iOS Simulator | current request | iOS provider and macOS gate | yes | unsupported hosts block honestly | macOS canary | `NOT_RUN` | `functional-qa` |
| Responsive browser | W-006 | browser adapter | no | web/mobile coverage stays separate | coverage classification | `NOT_RUN` | `validate-change` |
| Real devices | native default | future device provider | no | simulator not mislabeled as device | ledger assertion | `NOT_RUN` | `plan-change` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| mobile adapter/environment providers | W-010 | write | Android and iOS kept explicit |
| mobile fixtures/campaigns | W-010 | write | synthetic app/data only |
| shared environment/visual contracts | W-004/W-006 | read | changes through merge owner |
| browser adapter | W-006 | read | no responsive-web reuse as native proof |
| agent-mobile composition | W-012 | read | consumes accepted emulator/simulator seams without provider edits |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| Android emulator/platform tools | first executable mobile canary | disposable emulator | device/app/log evidence |
| iOS Simulator/Xcode tools | macOS-gated canary | disposable simulator | platform-specific evidence |
| Computer Use | optional visual driver | isolated simulator, app/action allowlist | action/screenshot trace |
| real device/accounts | none in initial slice | forbidden/deferred | `NOT_RUN` |

## Plan

1. Define a mobile environment-provider interface for boot, readiness, install,
   seed, lifecycle, state observation, logs, cleanup, and reset.
2. Define platform-neutral task intent while keeping Android and iOS commands,
   identifiers, permissions, logs, and errors inside platform adapters.
3. Implement the Android emulator provider and a minimal synthetic mobile
   fixture covering launch, interaction, lifecycle, permission denial, and
   reset.
4. Implement deterministic semantic automation and app/device oracles.
5. Integrate the shared visual Computer Use driver for explicitly visual cases
   with step/action budgets and independent oracles.
6. Implement the iOS Simulator provider and run its canary on macOS; fail
   preflight honestly elsewhere.
7. Emit mobile policy decisions, scoped claims, frozen evidence, cleanup, and
   downstream receipts through the W-004 contracts.
8. Author the Android, iOS, and Computer Use manifests and validate their
   platform/host, driver, tier, policy, oracle, and claim references in the
   campaign catalog.
9. Add a coverage ledger split by platform, OS/device profile, simulator or
   real device, deterministic or Computer Use driver, and oracle outcome.
10. Defer real-device providers and manifests until device-lab ownership,
   credentials,
   privacy, reservation, cleanup, and artifact transfer are designed.
11. Publish the accepted device/app tool seam and controlled platform identity
    to W-012 for deterministic composition and the live agent-mobile canary.

## Parallel Dependencies

- Can run with: W-008 and W-009 after W-006 publishes the shared visual-action
  seam; mobile and desktop providers remain separate implementations.
- Must wait for: W-004 Gate A and W-006 accepted visual-action interface. The
  deterministic mobile provider may be developed independently of the desktop
  provider.
- Conflicts with: shared platform identity, visual action types, coverage
  ledger, and artifact schema; proposed shared changes return to W-004.

## Handoff And Merge Contract

- Handoff summary: tested platform/device matrix, lifecycle support,
  deterministic/Computer Use evidence, permissions, oracles, and cleanup.
- Required output: mobile adapter, Android and iOS providers, fixtures,
  campaigns, tests, accepted device/app tool seam for W-012, and coverage
  ledger.
- Merge owner: W-004.
- Merge target: canonical campaign foundation.
- Evidence to preserve: runtime/app build identities, device state, actions,
  screenshots/video, policy decisions, scoped claims, logs, oracles, reset
  verification, and handoff receipts.
- Stop condition: Android canary has an exact verdict; iOS has an exact macOS
  verdict or blocker; real-device status remains separate.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| Mobile provider contract | fake Android/iOS lifecycle suite | `OPEN` |
| Android emulator | install/launch/lifecycle/permission/reset canary | `NOT_RUN` |
| iOS Simulator | macOS install/launch/lifecycle/reset canary | `NOT_RUN` |
| Computer Use mobile | isolated emulator visual canary | `NOT_RUN` |
| Coverage honesty | simulator/device and platform ledger assertions | `OPEN` |
| Claims/policies | exact platform/build/lifecycle scope, denied-action reduction, and frozen evidence verification | `OPEN` |

## Status Reconciliation

- Last checked: `2026-07-29`
- Source identity: current `master` working tree
- Completion disposition: `KEEP_OPEN`
- Reason: Android/iOS providers, mobile adapters, fixtures, and coverage runtime
  are absent; required gates remain `OPEN`/`NOT_RUN`.
- Synchronized surfaces: lane, active registry, and IG-001 revision 7.

## Closeout

- Merge evidence: pending.
- Report: program report.
- Remaining risk: emulator fidelity does not prove hardware, OEM, signing,
  store, sensor, performance, or real-device behavior.
