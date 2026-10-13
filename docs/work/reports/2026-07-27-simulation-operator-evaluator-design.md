# Simulation Operator And Evaluator Design

- Status: implemented role and skill contracts; runtime wiring planned
- Date: 2026-07-27
- Owner: Agent Engineer
- Source: user follow-up on simulation and evaluation agents plus the
  cross-surface simulation program
- Runtime implementation: W-004 through W-010 plus W-012

## Problem

The first campaign skill correctly defined manifests, selection, claims,
policies, oracles, evidence, cleanup, and reporting, but it left campaign
authoring, mutable execution, and independent evaluation under the broad Agent
Engineer boundary. That allows an operator to appear to judge its own work and
does not provide a permission-specific execution role.

## Architecture Decision

Keep four non-overlapping authorities plus one conditional specialist:

| Authority | Skill | Role | Permissions | Output |
|---|---|---|---|---|
| Campaign authoring, selection, dispatch coordination, replay planning, receipt aggregation, and reporting | `simulation-campaigns` | `agent-engineer` | normal harness-maintenance scope | resolved campaign selection and aggregate report |
| One approved mutable run | `simulation-execution` | `simulation-operator` | workspace write plus only declared campaign permissions | immutable run package, cleanup result, execution receipt |
| Independent frozen-evidence evaluation | `simulation-evaluation` | `simulation-evaluator` | read-only | mechanical gates, semantic judgments, claim ledger, and digestable evaluation-receipt content for campaign storage |
| Cascade route and JSONL trace specialization | `harness-evaluation` | `harness-evaluator` | read-only | specialized harness-evaluation receipt |
| Receipt persistence, conservative projection, and campaign reporting | `simulation-campaigns` | `agent-engineer` acting as aggregator | append-only receipt storage; no target execution | aggregation receipt and exact campaign projection |

The simulated actor is the task target—a CLI, TUI, browser, native app, mobile
app, or named agent—not the simulation operator.

## Boundary Rules

- The authoring role does not execute and semantically judge the same run.
- The operator cannot change campaign intent, claims, policies, or expected
  oracles after selection.
- The evaluator cannot execute, replay, repair, or modify frozen evidence.
- The target actor, operator, specialized evaluator, general evaluator, and
  aggregator carry distinct role/session identities. Evaluation is rejected
  when its evaluator matches the target actor or operator.
- Deterministic reducer code owns non-compensating mechanical status.
- Product-visible oracles remain with `functional-qa`.
- Cascade agent-response trace judgment remains with `harness-evaluator`; the
  general simulation evaluator consumes its receipt without re-judging it.
- Operator and evaluator delegation requires explicit user authorization.
  When independent evaluation cannot run in a separate context, the semantic
  independence gate is `BLOCKED` or `NOT_RUN`.
- Run IDs and stage receipt IDs are atomically reserved. The operator writes
  only the reservation and execution namespace; specialized evaluation,
  general evaluation, and aggregation use append-only sibling namespaces.
- An interrupted attempt may receive cleanup-only recovery and explicit
  finalization, but target actions never resume implicitly. An unknown external
  outcome is not automatically retried.

## Workflow

```text
simulation-campaigns
  -> resolved and approved selection
  -> simulation-operator / simulation-execution
  -> immutable run + cleanup + execution receipt
  -> deterministic gates
  -> harness-evaluator receipt first, only for Cascade trace claims
  -> simulation-evaluator / simulation-evaluation
  -> evaluation receipt
  -> mechanical claim reduction
  -> append-only aggregation receipt and campaign reporting
```

## Integration With Existing Work

- W-004 owns role separation, permission envelopes, execution, specialized
  evaluation, general evaluation, and aggregation receipt schemas, atomic
  identity reservation, recovery, reducer inputs, invalidation, config, and
  validator wiring.
- W-005 through W-010 implement typed contour adapters consumed by the shared
  operator and produce evidence evaluated through the shared evaluator.
- W-007 additionally emits the specialized harness-evaluator receipt for
  Cascade profiles.
- W-012 composes the accepted W-007 agent seam with the accepted command,
  browser, terminal, desktop, and mobile seams while retaining independent
  agent and surface results, policies, oracles, evidence, cleanup, and
  receipts.
- Gate A requires fake operator/evaluator/aggregator receipt fixtures,
  reservation-race and interrupted-run recovery fixtures, and rejection of
  self-evaluation, mismatched identities, missing specialized receipts, or a
  broken digest chain.
- Gate B requires every integrated deterministic campaign to carry a matching
  append-only execution/evaluation/aggregation receipt chain.
- Live Computer Use, model, desktop, and mobile canaries remain after Gate B
  and `NOT_RUN` until their runtime, permission, platform, cost, and
  independent-evaluation gates pass.

## Skill Design Stage Gates

| Stage | Result | Evidence |
|---|---|---|
| Intent | `PASS` | mutable operation and read-only evaluation have distinct repeated jobs and risks |
| Contract | `PASS` | triggers, anti-triggers, permissions, receipts, hard gates, and routes are explicit |
| Challenge | `PASS` | campaign authoring, functional acceptance, harness trace evaluation, execution, and general evidence evaluation have collision cases |
| Artifact map | `PASS` | two skills, two agents, checklists, receipt templates, config, docs, validator, and harness cases map to required behavior |
| Validation | `PASS` for the simulation slice | all three simulation skill packages validate; catalog is 41 skills/319 scenarios; static audit has zero findings; self-test has 15 passing cases; Python, JSON, TOML, task-scoped source validation, and whitespace pass. The aggregate validator still reports 36 Playwright `node_modules` false positives |

## Explicit Runtime Status

The skills and custom-agent role contracts are repository implementation.
They do not create the campaign schemas, runner, adapters, runtime providers,
or live execution/evaluation evidence. Those remain W-004 through W-010 plus
W-012 implementation and are `NOT_RUN`.
