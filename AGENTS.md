# Project AI Instructions

This file is the repository instruction entrypoint for coding agents. Keep it
  as a thin boot contract after copying Cascade. Detailed stack
  maps, source roots, commands, workflow policy, learned rules, product specs,
  and active work state belong in `harness.config.yaml`, `docs/structure.md`,
  `CODEX.md`, `.codex/skills/`, `.codex/agents/`, and the relevant docs.

## Project Identity

- Project name: `Dynamic Persona Assistant`
- Product or system type: agentic assistant project scaffold with the Cascade
  harness installed.
- Primary users: project maintainers and coding agents working in this
  repository.
- Primary runtime stack summary: no application runtime exists yet; the current
  repository is Cascade documentation, role/skill contracts, and a Python
  validator.
- Source of truth when docs conflict with code: current code, then this file,
  then `CODEX.md`, then repo-local skills and docs.

## Where To Look Next

- Runtime bridge and routing: `CODEX.md`.
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
labels. Until application source exists, treat this repository as a scaffold:

- Agent instructions -> `CODEX.md` runtime bridge -> `.codex/` role and skill
  contracts -> `docs/` memory targets -> `scripts/validate_cascade_codex.py`.
- Keep `AGENTS.md` thin; route durable project facts to
  `harness.config.yaml`, `docs/`, `.codex/skills/`, or `.codex/agents/`.
- Treat `.codex/skills/` and `.codex/agents/` as canonical harness assets.
- Create stack-specific source roots only when the application implementation
  starts, then update `harness.config.yaml` and `docs/patterns/boundaries.md`.
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

Use the new-task route for non-atomic work:

`context -> ingest-spec/discover if needed -> docs-impact-map when durable docs may affect sibling rules -> orchestrate-work -> plan-change -> functional-qa -> implement-change -> review-change -> validate-change -> test-autorepair only if stale tests -> closeout`

`issue-intake` is an explicit exception path for issue bodies or tracker
tickets. Human review is an explicit open-question or exception path, not a
standalone workflow router.

Only bypass planning for atomic mechanical edits: typo fixes, formatting, import
cleanup, or single-line changes with no behavior or contract impact.

## Validation Commands

Current available validation:

```bash
python scripts/validate_cascade_codex.py
```

No install, unit, lint, typecheck, build, or end-to-end command exists until
application source is added.

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
