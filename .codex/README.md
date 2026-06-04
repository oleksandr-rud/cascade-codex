# Cascade Codex Wiring

This directory contains reusable workflow skills and role contracts.

## Skills

Core cascade:

`context -> ingest-spec/discover if needed -> orchestrate-work -> plan-change -> functional-qa -> implement-change -> review-change -> validate-change -> test-autorepair only if stale tests -> closeout`

Supporting skills:

- `architecture-review`
- `agents-best-practices`
- `codex-maintenance`
- `develop-skill`
- `discover`
- `adapt-harness`
- `issue-intake`
- `orchestrate-work`
- `review-change`
- `ingest-spec`

## Agents

- `orchestrator`: orchestrates the cascade.
- `project-onboarder`: orchestrates new-project setup, harness adaptation,
  config/docs migration, validation, and setup handoff.
- `agent-engineer`: owns Cascade Codex maintenance, Codex surface best
  practices, skill, memory, and observability guidance.

Agent TOML manifests use `[agent]` for identity, `[paths]` for role-contract
files, `[delegation]` for spawn policy, and `[scope]` for use/avoid boundaries.

Cascade Codex is intentionally skill-first. Keep architecture review,
functional acceptance, test repair, and issue intake as skills unless the target
project proves it needs a dedicated delegated role. Use subagents only when the
user explicitly authorizes delegation in the target runtime.
