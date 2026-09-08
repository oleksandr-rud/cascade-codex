# Project AI Instructions

This is the target repository's boot contract. Cascade supplies workflow tools;
it is not the product being built here. Preserve existing target instructions
when onboarding; merge this contract instead of replacing their authority.

## Project Identity

Read `harness.config.yaml` for the actual project's name, kind, users, stack,
source roots and commands. The portable profile is `project.harness_profile:
target-project`. Unresolved template values are onboarding gaps, not facts.
Do not infer project identity or architecture from the Cascade package name.

Current target code outranks stale documents. Preserve the target's declared
source precedence; reusable plugin guidance does not override product contracts.

## Where To Look Next

- Runtime routing and roles: `CODEX.md`.
- Project configuration and checks: `harness.config.yaml`.
- Source and documentation owners: `docs/structure.md`.
- Accepted product and architecture facts: the target's relevant source/docs.
- Current work: `docs/work/`, only when the request needs durable work state.
- Host effects and role contracts: `.codex/skills/` and `.codex/agents/`.

## Workflow

Run the cheap task-admission hook for each request, or use
`.codex/runtime/cascade.js admission` if the hook is unavailable. Admission
selects controls; it neither grants authority nor dispatches agents.

For non-atomic changes use `context -> plan-change -> implement-change ->
validate-change`: state intended behavior and assumptions, inspect current
sources, choose the smallest safe slice, and define validation before editing.
Atomic mechanical edits need no separate plan. Ordinary bounded work needs
no new spec, work graph or report. Read-only requests do not authorize changes.

Use the selected plugin skill and load deeper knowledge or specialized
architecture policies only when requested or adopted by this target. Do not
copy the Cascade source checkout's architecture, tests, history or lab roles
into the target's default context.

## Validation And Closeout

Run proportional target checks from `harness.config.yaml`, then validate the
adapted configuration with:

```bash
npx --offline --yes bun@1.3.3 .codex/runtime/cascade.js target validate --root .
```

Configuration validation is not product correctness or release evidence.
Simulation and evaluation labs are optional and need explicit setup/authority.
Use the existing `closeout` contract when durable state needs updating.

## Operating Rules

- Think before coding: disclose assumptions; ask only material blocker questions.
- Simplicity first: no speculative features or unnecessary abstractions.
- Surgical changes: preserve unrelated edits and target-owned instructions.
- Goal-driven execution: verify the accepted result and state what was not run.
