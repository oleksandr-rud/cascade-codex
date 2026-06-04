# Project AI Instructions

This file is the repository instruction entrypoint for coding agents. Keep it
  as a thin boot contract after copying Cascade Codex. Detailed stack
  maps, source roots, commands, workflow policy, learned rules, product specs,
  and active work state belong in `harness.config.yaml`, `docs/structure.md`,
  `CODEX.md`, `.codex/skills/`, `.codex/agents/`, and the relevant docs.

## Project Identity

- Project name: `<PROJECT_NAME>`
- Product or system type: `<PROJECT_KIND>`
- Primary users: `<PRIMARY_USERS>`
- Primary runtime stack summary: `<PRIMARY_STACK_SUMMARY>`
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

Describe the real codebase vocabulary here. Prefer existing folder and module
names over generic modeling labels.

Example shape:

```text
Entry points -> application services -> persistence/external adapters
UI shell -> feature modules -> API/client layer -> backend
```

Rules to fill:

- `<BOUNDARY_RULE_1>`
- `<BOUNDARY_RULE_2>`
- `<DATA_OR_AUTH_RULE>`
- `<SIDE_EFFECT_OR_AUDIT_RULE>`
- `<ASYNC_OR_RUNTIME_RULE>`

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

Fill these with the target repository's real commands:

```bash
<UNIT_TEST_COMMAND>
<TYPECHECK_COMMAND>
<LINT_COMMAND>
<FUNCTIONAL_TEST_COMMAND>
<BUILD_COMMAND>
```

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
