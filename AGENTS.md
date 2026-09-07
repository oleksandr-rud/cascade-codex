# Project AI Instructions

This file is the thin repository boot contract for coding agents. Detailed stack
  maps, source roots, commands, workflow policy, learned rules, product specs,
  and active work state belong in `harness.config.yaml`, `docs/structure.md`,
  `CODEX.md`, `.codex/skills/`, `.codex/agents/`, and the relevant docs.

## Project Identity

- Project name: `Cascade`
- Product or system type: standalone coding-agent workflow harness.
- Primary users: project maintainers and coding agents working in this
  repository.
- Primary runtime stack summary: Bun/TypeScript harness runtime with CLI and
  stdio MCP adapters, plugin and role/skill contracts, validators, and evaluation
  tooling; no target-product backend or UI is implemented here.
- Source of truth when docs conflict with code: current code, then this file,
  then `CODEX.md`, then repo-local skills and docs.

## Where To Look Next

- Runtime bridge and routing: `CODEX.md`.
- Pull request description contract for Codex and Copilot: `.github/pull_request_template.md`.
- Stack details, source roots, test roots, commands, runners, memory paths:
  `harness.config.yaml`.
- Folder/write-target map: `docs/structure.md`.
- Codebase vocabulary: `docs/glossary.md`.
- Product/design/brand/spec facts: `docs/product/`, `docs/design/`,
  `docs/brand/`, `docs/specs/`.
- Active execution state and reports: `docs/work/`.
- Reusable workflow rules and role contracts: `.codex/skills/`,
  `.codex/agents/`, `docs/patterns/`.

## Architecture Guardrails

Prefer the repository's current harness vocabulary over generic modeling
labels. This repository is a harness runtime and plugin source checkout, not a
target-product application:

- Agent instructions -> `CODEX.md` runtime bridge -> `.codex/` role and skill
  contracts -> `docs/` memory targets -> `scripts/cascade.ts`.
- Keep `AGENTS.md` thin; route durable project facts to
  `harness.config.yaml`, `docs/`, `.codex/skills/`, or `.codex/agents/`.
- Treat `.codex/skills/` and `.codex/agents/` as canonical harness assets.
- Create stack-specific source roots only when the application implementation
  starts, then update `harness.config.yaml` and `docs/patterns/boundaries/index.md`.
- Run the Cascade validator after harness, docs, role, or skill edits.

## Implementation Workflow

Every non-trivial implementation, bug fix, refactor, public contract change, or
product-visible behavior change should start with a short plan before edits:

- State intended behavior, assumptions, and success criteria.
- Inspect current code and docs before asking the user.
- Compare alternatives only when more than one credible approach exists.
- Choose the smallest structurally sound slice.
- Map likely regressions across touched boundaries and user paths.
- Define validation before editing.

Run the cheap task-admission microkernel for every request. The compiled Task
Envelope selects the proportional route and controls; it does not grant
authority, create work, or dispatch an agent. If the project hook is unavailable,
apply the same contract in-process through `scripts/cascade.ts admission`.

For non-atomic work, the default route is:

`context -> plan-change -> implement-change -> validate-change`

Add source intake, documentation impact, or pattern context only when its
trigger is present. Route portable forecasting, coordination, reconciliation,
and completion assessment through Cascade Project Management. Route quality
planning, test design, evidence assessment, and defect triage through Cascade
QA only when accepted behavior has a relevant quality gate. The harness retains
target execution through `run-qa-plan`, proven test-only repair through
`repair-tests`, and authorized durable state mutation through `closeout`. A
bounded change completed by one owner does not need a spec, lane, work graph,
report, receipt, or archive entry.

`cascade-project-management:define-work-item` is the explicit exception path
for issue bodies or tracker-ready work items. Human review is an explicit
open-question or exception path, not a
standalone workflow router. Worklines and work graphs do not auto-dispatch; use
the execution-surface contract in `CODEX.md`.

Only bypass planning for atomic mechanical edits: typo fixes, formatting, import
cleanup, or single-line changes with no behavior or contract impact.

## Validation Commands

```bash
bun scripts/cascade.ts validate
bun run test
```

The default test command runs only the retained runtime safety smoke suite.
Use the targeted commands in `harness.config.yaml` only for affected contracts;
plugin package tests and lab corpora are not default repository checks.

Harness evaluation is conditional, not a default validation phase. The
`PostToolUse` harness-impact hook examines completed `apply_patch` edits and
adds bounded guidance only when actual `cascade-evals:harness-evaluation` implementation,
assertions, or judge contracts changed. Run `eval catalog --check` and
`eval self-test` only when that hook reports them. Run a focused live scenario
and independent judge only after reviewing a changed semantic assertion that
cannot be decided mechanically; otherwise record the live review as
`NOT_APPLICABLE`. Hook output is advisory and must not be treated as authority
or proof.

Install harness tooling with
`bun install --cwd .codex/harness-tooling --frozen-lockfile`. Playwright
browser checks are available through the isolated tooling package; no
application build command exists until application source is added.

## Codebase Vocabulary

Maintain durable project terms in `docs/glossary.md`. When a user uses fuzzy or
conflicting terminology, inspect the codebase and glossary first, then clarify
only when the ambiguity blocks safe work.

## Thin File Policy

Do not add full dependency inventories, long architecture essays, product
glossaries, role inventories, historical decisions, or learned lessons here.
Route those to `harness.config.yaml`, `docs/structure.md`, `docs/glossary.md`,
`docs/product/`, `docs/design/`, `docs/brand/`, `docs/specs/`, `docs/work/`,
`.codex/skills/`, `.codex/agents/`, or `docs/patterns/`.

## Operating Rules

Apply these rules in every skill, role, subagent, and summarized handoff.

```text
Rule 1 - Think Before Coding.
No silent assumptions. State what you are assuming. Surface tradeoffs. Inspect
available code/docs before asking, and ask only blocker questions.

Rule 2 - Simplicity First.
Minimum code that solves the problem. No speculative features. No abstractions
for single-use code.

Rule 3 - Surgical Changes.
Touch only what you must. Do not improve adjacent code, comments, or formatting.
Match existing style.

Rule 4 - Goal-Driven Execution.
Define success criteria. Loop until verified. Define success and let the active
agent iterate.
```
