# Work Lane: W-009 Desktop Task Ground-Up Implementation

Status: `OPEN`
Owner: `agent-engineer`
Created: 2026-07-27
Lane Model: `single-lane`
Next Gate: `implement-change after W-006`
Execution Surface: `internal-subagent`
Dispatch State: `NOT_AUTHORIZED`
Dispatch Authorization: `none`
Runtime Handle: `none`

## Request

Implement a first-class `desktop` task for native applications using isolated
desktop environments, deterministic platform automation when available, and a
bounded Computer Use driver for visually operated workflows.

## Acceptance Criteria

- Desktop tasks never require control of the maintainer's normal desktop.
- Environment identity includes OS, image/snapshot, display, application
  package/build, locale, scale, resolution, and reset strategy.
- Application, window, filesystem, network, account, and action permissions are
  explicitly allowlisted.
- Desktop claims bind exact OS/image, display, application build, adapter,
  driver, policy, oracle, and coverage identities; one fixture or OS cannot
  support another platform claim.
- Deterministic native automation and Computer Use implement one desktop task
  result contract without claiming equivalent evidence.
- Screenshots/actions are observations and execution evidence; independent
  application, filesystem, API, or accessibility oracles decide success.
- Launch, focus, window changes, dialogs, permissions, crashes, timeout,
  interruption, and cleanup/reset are covered.
- Environment leases are exclusive and snapshot/reset operations are
  identity-bound so concurrent runs cannot share or contaminate one desktop.
- The first smoke runs in a disposable controlled desktop fixture; macOS and
  Windows support are claimed only after platform-specific evidence.
- Every named desktop run is performed by `simulation-operator`; its claims
  are aggregated only after `simulation-evaluator` emits an identity-matched
  evaluation receipt from frozen evidence.
- The accepted native-app seam can be exposed as a bounded typed tool to W-012
  without allowing an agent profile to bypass application, window,
  filesystem, network, account, action, or reset policy.

## Scope

In:

- desktop environment/provider and adapter contracts;
- controlled fixture application and disposable Linux desktop smoke;
- deterministic platform driver where practical;
- Computer Use screenshot/action driver;
- native evidence, oracle, safety, and cleanup.

Out:

- personal desktop/profile automation;
- production signing, store distribution, or updater validation;
- mobile device behavior owned by W-010;
- broad claims for untested operating systems.

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| Program | W-004 Gate A | shared lifecycle, result, permissions | pending |
| Browser lane | W-006 accepted visual action interface | reuse screenshot/action protocol | pending |
| Native default | `docs/patterns/architecture-defaults/native-app.spec.md` | lifecycle, permissions, platform evidence | current |
| Provider reference | OpenAI Computer Use guide | isolated VM and UI action loop | fetched 2026-07-27 |

## Campaign Deliverables

| Campaign ID | Tier | Required Evidence Boundary | Status |
|---|---|---|---|
| `desktop-linux-fixture-smoke` | deterministic isolated | Linux image/display/app-build identity, native automation, public app/file/accessibility oracle, crash logs, policy decisions, and verified reset | `OPEN` |
| `desktop-computer-use-canary` | isolated live canary | Exact OS/image/app-build, screenshot/action loop, app/window/action policies, independent oracle, budgets, and reset | `NOT_RUN` |

macOS and Windows campaign manifests remain `DEFERRED` until matching controlled
providers, fixtures, reset verification, and artifact transfer exist. Linux or
Computer Use evidence cannot cover them.

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `DESK-001` | Given a clean desktop image, the task launches only the allowed fixture app and records its build identity. | environment and launch events | `OPEN` |
| `DESK-002` | Given a Computer Use task, forbidden apps and OS settings cannot be opened or changed. | denied-action events | `OPEN` |
| `DESK-003` | Given a native dialog, the task handles the declared state and verifies the resulting application data. | screenshots plus data oracle | `OPEN` |
| `DESK-004` | Given apparent visual completion but no exported file, the oracle fails the task. | final screenshot and file-oracle failure | `OPEN` |
| `DESK-005` | Given application crash or lost window focus, the task reports the earliest failure and preserves crash/app logs. | failure trace and logs | `OPEN` |
| `DESK-006` | Given reset failure, the task and containing required campaign fail. | reset verification | `OPEN` |
| `DESK-007` | Given a Linux fixture pass, the claim ledger supports only the recorded image/app/driver tuple and leaves macOS and Windows `NOT_RUN`. | scoped platform claim ledger | `OPEN` |
| `DESK-008` | Given a forbidden OS action, the exact policy decision is frozen and safety remains unsupported regardless of visual completion. | action/policy trace and claim reduction | `OPEN` |
| `DESK-009` | Given two runs request one disposable desktop identity, only one lease succeeds; the other blocks without opening the app, and reset releases the lease only after verification. | environment lease/reset race fixture | `OPEN` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| Native desktop simulation | current request | desktop adapter/environment provider | yes | isolation and platform identity | desktop fixture campaign | `NOT_RUN` | `implement-change` |
| Computer Use visual loop | W-006/program | shared visual interface | yes | browser-specific logic remains in browser | adapter conformance | `NOT_RUN` | `architecture-review` |
| Native architecture evidence | native default | app lifecycle and platform permissions | no | simulator proof is not release proof | evidence classification | `NOT_RUN` | `validate-change` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| desktop adapter/environment provider | W-009 | write | ground-up |
| desktop fixture and campaigns | W-009 | write | synthetic local data |
| shared visual action/result types | W-004/W-006 | read | changes via merge owner |
| mobile platform adapter | W-010 | read | no device-specific logic here |
| agent-desktop composition | W-012 | read | consumes the accepted desktop seam without provider edits |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| isolated VM/container display | controlled desktop execution | disposable environment | snapshot and runtime identity |
| Computer Use | optional native visual driver | app/action allowlists and confirmations | action/screenshot trace |
| platform automation | deterministic native fixture path | platform-scoped | semantic/accessibility events |
| host desktop | none | forbidden | fail preflight |

## Plan

1. Define the desktop environment-provider interface for provision, seed,
   launch, observe, logs, oracle access, cleanup, and reset verification.
2. Implement a disposable Linux desktop fixture as the first portable smoke;
   record why its evidence does not imply macOS or Windows support.
3. Implement deterministic native automation for the fixture where it provides
   stable public UI/semantic controls.
4. Adapt the W-006 visual action/observation protocol to OS-level input events
   without importing browser/DOM assumptions.
5. Add Computer Use action validation, app/window/action allowlists, budgets,
   confirmations, and independent oracles.
6. Cover launch, focus, dialogs, permissions, crash, timeout, forbidden apps,
   missing side effects, cleanup, and reset.
7. Emit desktop policy decisions, scoped claims, frozen evidence, cleanup, and
   downstream receipts through the W-004 contracts.
8. Author the Linux and Computer Use manifests and validate their distinct
   platform, driver, tier, policy, oracle, and claim references in the campaign
   catalog.
9. Add macOS and Windows adapters and manifests only when their platform
   runtime and fixture
   evidence can execute; otherwise return `BLOCKED` or `NOT_RUN`.
10. Publish the accepted native-app tool seam and controlled environment
    identity to W-012 for deterministic composition and the live
    agent-desktop canary.

## Parallel Dependencies

- Can run with: W-008 and W-010 after W-006 publishes the visual-action
  contract; desktop and mobile providers remain independent.
- Must wait for: W-004 Gate A and W-006 accepted visual interface.
- Conflicts with: shared action types, provider abstraction, artifact writer,
  and platform identity; shared changes return to W-004 rather than coupling
  desktop and mobile implementations.

## Handoff And Merge Contract

- Handoff summary: environment provider, tested OS matrix, deterministic and
  Computer Use evidence, permissions, oracles, and reset behavior.
- Required output: desktop adapter, fixture, campaigns, tests, accepted
  native-app tool seam for W-012, and platform evidence ledger.
- Merge owner: W-004.
- Merge target: canonical campaign foundation.
- Evidence to preserve: environment/build identities, screenshots/actions,
  policy decisions, scoped claims, app/crash logs, oracles, cleanup, reset, and
  handoff receipts.
- Stop condition: portable fixture passes; each additional OS is exactly
  `PASS`, `FAIL`, `BLOCKED`, or `NOT_RUN`.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| Environment provider | provision/reset failure-injection suite | `OPEN` |
| Deterministic desktop | controlled native fixture campaign | `OPEN` |
| Safety | forbidden app/action/account tests | `OPEN` |
| Computer Use desktop | isolated visual canary | `NOT_RUN` |
| Platform ledger | Linux/macOS/Windows evidence classification | `OPEN` |
| Claims/policies | platform-scoped claims, forbidden-action reduction, and frozen evidence verification | `OPEN` |

## Status Reconciliation

- Last checked: `2026-07-30`
- Source identity: clean implementation baseline
  `master@60fdc2464b9782a689d3f53ffa8fc177f486e6a8`; revision-9 planning diff
  applied on top
- Completion disposition: `KEEP_OPEN`
- Reason: desktop environment provider, adapter, controlled fixture, and reset
  runtime are absent; required gates remain `OPEN`/`NOT_RUN`.
- Synchronized surfaces: lane, active registry, report index, and IG-001 plan
  revision 9.

## Closeout

- Merge evidence: pending.
- Report: program report.
- Remaining risk: OS accessibility/input APIs and VM graphics behavior are
  platform-specific and version-sensitive.
