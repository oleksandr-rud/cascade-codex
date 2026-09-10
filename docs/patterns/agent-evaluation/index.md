# Agent Evaluation Patterns

Use this entry when evaluating Cascade skills, routes, agents, outputs, or
execution traces.

This is an optional Cascade Evals subject profile. Load the harness-evaluation
skill and its `references/judge-profile.md` into a separate read-only context
only when semantic judgment is required. No dedicated host evaluator role is
registered. Ordinary completion uses `closeout check` for scoped integrity;
that command and its advisory hook never launch or substitute for these judges.

## Evaluation Architecture

Use an evaluator-optimizer loop with two distinct responsibilities:

```text
scenario contract
  -> read-only target run
  -> raw JSONL and stderr
  -> deterministic normalization and binary eligibility
  -> independent outcome and trajectory judges
  -> harness-computed scores and acceptance
  -> regression case or routed harness fix
```

The target agent must not receive the expected route, rubric rationale, or
prior result. Each judge receives only its assigned rubric and unscored
evidence after target execution; it does not receive eligibility or the peer
judge's result.

## Scenario Coverage

Retain a small core of unique regressions, authority/evidence boundaries and
fixed role baselines. Each case needs a named risk; a new skill does not require
seven permanent variants. Select trigger, near-miss, prerequisite, guardrail,
output or handoff cases only when they expose distinct failures.

Generate task-local cases from the accepted change and freeze their inputs and
expectations before execution through `cascade eval prepare --file DRAFT`.
Run and measure them with `--suite FILE`; they do not expand the permanent
coverage denominator. Use the same frozen definitions for comparisons.
Promote only minimal unique regressions discovered by actual failures.
See `harness-evals/README.md` for the host-owned draft and lifecycle contract.

## Trace Evidence

Preserve raw output before normalization. A live trace should identify the run,
scenario, CLI/model environment, event order, thread, tool calls, loaded skill
and role sources, final structured response, terminal state, usage, errors,
duration, and mutation attempts.

No trace means no pass for a live scenario. A final answer that appears correct
cannot override a wrong route, missing required skill load, malformed output,
or disallowed mutation attempt.

## Evaluation Order

1. Schema and catalog integrity.
2. Runtime and trace integrity.
3. Primary route and anti-trigger behavior.
4. Required skill and role loading.
5. Permission and mutation safety.
6. Status and handoff contract.
7. Grounding and evidence.
8. Outcome quality through an anchored 0–4 rubric.
9. Trajectory quality through a separate anchored 0–4 rubric.
10. Harness-owned score calculation and required-judge aggregation.

Mechanical failures are not overridable by an LLM judge, and mechanical checks
do not award quality points. Every eligible case still requires both semantic
judges before it can satisfy accepted coverage.

## Root Cause

Classify the earliest causal failure as:

- `harness-defect`;
- `target-behavior`;
- `model-variance`;
- `scenario-defect`;
- `environment-blocker`.

Repeat identical runs before using `model-variance` or `FLAKY`. Promote a
confirmed harness failure into a regression scenario before repairing it, and
do not weaken the scenario expectation to accept the current behavior.

## Run Storage

Canonical cases and schemas live in `harness-evals/`. Generated live evidence
lives under ignored `.artifacts/harness-evals/<run-id>/`. At closeout, propose cleanup of the named temporary suite and bound runs with
`cascade eval closeout --suite FILE`. Never automatically delete unresolved
failures, incomplete evidence or registered campaign receipts; never preserve
a raw generic diagnostic as durable acceptance merely to retain a score.
