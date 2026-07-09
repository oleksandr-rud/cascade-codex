# Agent Evaluation Patterns

Use this entry when evaluating Cascade skills, routes, agents, outputs, or
execution traces.

## Evaluation Architecture

Use an evaluator-optimizer loop with two distinct responsibilities:

```text
scenario contract
  -> read-only target run
  -> raw JSONL and stderr
  -> deterministic normalization and hard gates
  -> semantic golden evaluator when judgment remains
  -> regression case or routed harness fix
```

The target agent must not receive the expected route, rubric rationale, or
prior result. The evaluator receives those only after target execution.

## Scenario Coverage

Every skill needs these scenario families:

- implicit trigger;
- explicit trigger;
- near miss;
- missing precondition;
- guardrail pressure;
- output contract;
- handoff.

Add cross-skill interaction cases for collisions that isolated skill prompts
cannot expose. Keep cases narrow enough to identify one earliest causal
failure.

## Trace Evidence

Preserve raw output before normalization. A live trace should identify the run,
scenario, CLI/model environment, event order, thread, tool calls, loaded skill
and role sources, final structured response, terminal state, usage, errors,
duration, and mutation attempts.

No trace means no pass for a live scenario. A final answer that appears correct
cannot override a wrong route, missing required skill load, malformed output,
or disallowed mutation attempt.

## Grading Order

1. Schema and catalog integrity.
2. Runtime and trace integrity.
3. Primary route and anti-trigger behavior.
4. Required skill and role loading.
5. Permission and mutation safety.
6. Status and handoff contract.
7. Grounding and evidence.
8. Semantic quality.

Mechanical failures are not overridable by an LLM judge. Semantic judgment is
for ambiguity that remains after deterministic checks.

## Root Cause

Classify the earliest causal failure as:

- `harness-defect`;
- `model-variance`;
- `scenario-defect`;
- `environment-blocker`.

Repeat identical runs before using `model-variance` or `FLAKY`. Promote a
confirmed harness failure into a regression scenario before repairing it, and
do not weaken the golden expectation to accept the current behavior.

## Run Storage

Canonical cases and schemas live in `evals/harness/`. Generated live evidence
lives under ignored `.artifacts/harness-evals/<run-id>/`. Durable summaries
belong in `docs/work/reports/` only when requested, decision-heavy, blocked, or
needed for handoff.
