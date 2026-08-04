# Work Lane: W-021 Native, CLI, And Experiment Infrastructure

Status: `COMPLETE`
Owner: `agent-engineer`
Coordinator: `W-018 orchestrator`
Created: 2026-07-28
Lane Model: `parallel-sectioning`
Next Gate: `none`

## Request

Add lightweight infrastructure profiles for native apps, CLIs, and
experiments without inventing server infrastructure for local application
concerns.

## Acceptance Criteria

- `native-infrastructure` separates device-local storage/cache adapters from
  operated remote infrastructure and covers signing, stores, CI, crash/RUM,
  configuration, push integration, and backend boundaries.
- `cli-infrastructure` defaults to no infrastructure and adds artifacts,
  signing, registries, update channels, provenance, plugins, or telemetry only
  from evidence.
- `experiment-infrastructure` defaults to local or ephemeral and governs
  compute, artifacts, tracking, queues/schedulers, budget, TTL, teardown, and
  production-promotion boundaries.
- Remote APIs, sync systems, control planes, and push dispatchers are separate
  backend units when they own operated behavior.

## Scope

Exclusive writes:

- `native-infrastructure.{graph.yaml,spec.md}`;
- `cli-infrastructure.{graph.yaml,spec.md}`;
- `experiment-infrastructure.{graph.yaml,spec.md}`.

Out:

- native or CLI source scaffold profiles;
- platform implementation code;
- provider catalogs or IaC;
- packs, shared validator, evidence schema, or infrastructure root.

## Behavior Examples

| ID | Example | Expected |
|---|---|---|
| `NCE-001` | A native app uses SQLite/Core Data/Room on device. | application adapter, not `infrastructure-data` |
| `NCE-002` | Push notifications require server-side dispatch. | backend unit plus messaging/delivery resource routing |
| `NCE-003` | A local compiled CLI has no service dependency. | no operated infrastructure |
| `NCE-004` | A CLI has a remote control plane. | separate backend unit; CLI owns distribution only |
| `NCE-005` | A GPU experiment uses cloud batch resources. | quota, budget, artifact, interruption, and teardown proof |
| `NCE-006` | Experiment code is promoted to production. | new production app-stack and infrastructure decision |

## Feature Impact Matrix

| Feature | Touched | Protected behavior | Check | Status |
|---|---|---|---|---|
| Native infrastructure | yes | native app architecture and device adapters unchanged | pair validation | `NOT_RUN` |
| CLI infrastructure | yes | no-infrastructure default retained | negative routing example | `NOT_RUN` |
| Experiment infrastructure | yes | promotion boundary retained | lifecycle marker check | `NOT_RUN` |
| Source scaffolds | no | no new generated profiles or paths | scaffold path comparison | `NOT_RUN` |

## Plan

1. Author the native delivery/remote-boundary pair.
2. Author the CLI no-infrastructure/distribution/control-plane pair.
3. Author the experiment ephemeral-resource/budget/teardown/promotion pair.
4. Validate all six files and hand W-018 one receipt with pair inventories and
   negative no-resource examples.

## Agent And Skill Routing

- Execution: one direct `agent-engineer` subagent after explicit W-018
  dispatch.
- Required skills: `architecture-review -> implement-change`.
- Write boundary: the six profile files in Scope.
- Conditional review: route new device credentials, telemetry privacy, signing
  trust, or remote-control boundaries through `secure-design`; do not add a
  security agent for unchanged documented boundaries.
- Handoff: no merge by the section agent; return the six-file identity,
  negative examples, validation results, and any stop condition to W-018.

## Dependencies And Handoff

- Must wait for: W-018 WG-003-N01.
- Can run with: W-019, W-020, and W-022.
- Merge owner: W-018.
- Stop condition: source scaffold generation, a new app type, or remote
  backend ownership is folded into a client/local profile.

## Validation

| Check | Status |
|---|---|
| three YAML parses and endpoint resolution | `PASS` |
| six graph/spec identity links | `PASS` |
| no-resource CLI and local-experiment cases | `PASS` |
| device-local versus operated-resource markers | `PASS` |

## Closeout

- Report: `docs/work/reports/2026-07-28-contour-infrastructure-work-graph.md`.
- Implementation evidence: `PASS`; native 10 nodes/12 edges/9 decisions, CLI
  11/13/8, and experiment 12/15/11.
- Pair receipt:
  `native-infrastructure` graph
  `sha256:762f363979f556184142f7272a86fd06c4305181c07c0d7e6829f9615b1fbba3`
  and spec
  `sha256:ee4163f673e47b1237e8394a72e647207ca3914ccd4278221e488f1deb5242f7`;
  `cli-infrastructure` graph
  `sha256:f8a0df47e4d3ab543e66e0a5572e870ca7949f79f4caaf4cfdb859a9f63e3d2d`
  and spec
  `sha256:3b5dfdb4482b8d4777afad858eefe1be787990b1211cf0f325e64d0e98a78c80`;
  `experiment-infrastructure` graph
  `sha256:e7041da11d946b2ee3f5fa16ab8c5c3f196781fe548fef49b10b39ebab5eacc4`
  and spec
  `sha256:a0e568d8e97e946d98696ffde310d15ecd16dac7227952b725673bbb786249ae`.
