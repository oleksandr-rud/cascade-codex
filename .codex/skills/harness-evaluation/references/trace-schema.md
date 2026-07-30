# Harness Evaluation Trace Schema

Raw evidence is the stdout JSONL and stderr emitted by one read-only
`codex exec` scenario. Normalization must preserve the raw files and produce a
separate `normalized.json`.

## Run Envelope

Required fields:

- `run_id`, `scenario_id`, `catalog_digest`, and `started_at`;
- target model, Codex CLI version, working directory, sandbox, and timeout;
- exact replay command with prompt content stored separately;
- process exit code, duration, stdout path, and stderr path.

## Normalized Trace

Required fields:

- `thread_id`;
- ordered event types;
- terminal event: `turn.completed`, `turn.failed`, or timeout;
- command/tool calls with status, exit code, result byte count, and mutation
  classification;
- loaded skills and role contracts inferred from exact source paths;
- agent messages and parseable final structured response;
- usage fields when emitted: input, cached input, output, and reasoning tokens;
- errors and environment warnings;
- mechanical eligibility and hard-gate failures.

Judgments are separate traces under `<run>/judgments/<case>/<profile>/`. Each
must preserve the profile-specific prompt, command, raw JSONL, stderr,
normalized trace, validated judgment, dimension ratings, and harness-computed
score. A judge trace never replaces target evidence, and one judge never reads
another judge's artifacts.

## Failure Taxonomy

- `route-selection`: wrong primary skill or forbidden near-miss route.
- `skill-activation`: required skill contract was not loaded.
- `output-contract`: missing or malformed structured response.
- `permission-or-mutation`: disallowed write, external action, network use, or
  delegation attempt.
- `grounding`: claims lack the required source or tool evidence.
- `trace-integrity`: missing start, terminal event, ordering, or raw evidence.
- `resource-reference`: a skill points to a missing local resource.
- `agent-config`: a custom agent cannot load in the current Codex runtime.
- `scenario-defect`: expectation is ambiguous, contradictory, or leaked.
- `environment`: model, CLI, auth, sandbox, tool, or infrastructure failure.

## Redaction

Do not include credentials, auth files, environment values, private connector
payloads, or raw sensitive user data. Keep run artifacts under the ignored
`.artifacts/harness-evals/` root.
