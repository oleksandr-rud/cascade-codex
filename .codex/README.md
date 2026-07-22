# Cascade Wiring

This directory contains reusable workflow skills and role contracts.

## Skills

Core cascade:

`context -> ingest-spec/discover/market-validation/synthesis-to-spec/compose-spec if needed -> docs-impact-map -> pattern-context when reusable pattern packs are needed -> orchestrate-work -> plan-change -> functional-qa -> implement-change -> review-change -> validate-change -> test-autorepair only if stale tests -> closeout`

Supporting skills:

- `agentic-workflow-builder`
- `architecture-review`
- `agents-best-practices`
- `codex-maintenance`
- `develop-skill`
- `pattern-context`
- `harness-evaluation`
- `discover`
- `market-validation`
- `pain-mining`
- `competitive-map`
- `market-economics`
- `hypothesis-scoring`
- `validation-experiments`
- `adversarial-critic`
- `synthesis-to-spec`
- `compose-spec`
- `adapt-harness`
- `issue-intake`
- `orchestrate-work`
- `review-change`
- `ingest-spec`
- `codebase-audit`
- `auth-analysis`
- `secure-design`
- `ux-flow-review`
- `accessibility-review`
- `visual-qa`

## Agents

- `orchestrator`: orchestrates the cascade.
- `project-onboarder`: orchestrates new-project setup, harness adaptation,
  config/docs migration, validation, and setup handoff.
- `agent-engineer`: owns Cascade maintenance plus target-project agent/LLM
  system design, Codex surface best practices, agentic workflow checklists,
  source-context, skill, tool-contract, observability, and eval guidance.
- `business-analyst`: owns long market validation, live research,
  business-analysis lanes, evidence grading, and synthesis into specs.
- `security`: owns security-sensitive review, auth/session/RBAC and
  tenant-boundary analysis, secure-design review, audit evidence, and security
  validation planning.
- `designer`: owns UX flow review, reusable design-system routing,
  accessibility review, screenshot-backed visual validation, and design
  handoff planning.
- `harness-evaluator`: owns read-only independent outcome or trajectory
  judgment of eligible harness scenario outputs and JSONL traces.

Agent TOML files use the current Codex custom-agent schema with top-level
`name`, `description`, `model`, and `developer_instructions`. Planning,
synthesis, security reasoning, and judged-evaluation roles pin
`gpt-5.6-sol`; bounded read-heavy roles pin `gpt-5.6-terra`. Detailed Cascade scope,
delegation, workflow, and skill mapping stay in the companion `AGENT.md` and
`skills.yaml` files.

Cascade is intentionally skill-first except for repeated long-running or
specialist review boundaries such as business analysis, security review, and
design review. Keep architecture review, functional acceptance, test repair,
and issue intake as skills unless the target project proves it needs a
dedicated delegated role. Use subagents only when the user explicitly
authorizes delegation in the target runtime.
