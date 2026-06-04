---
name: adapt-harness
description: Use for new-project onboarding or setup after copying the portable harness into a target repository; inspects the codebase, fills project variables, adapts docs, migrates bulky AGENTS.md facts, and validates agent/skill references.
---

# Adapt Harness

Use after copying this portable harness into a new repository, or when a user
asks for onboarding, setup, install harness, wire harness, migrate existing
instructions, or adapt the harness to a different project.

This skill adapts configuration and docs to the target codebase. It does not
invent project facts; it inspects the repository first and asks only blocker
questions.

## Source Order

1. Latest user request and target repository root.
2. Existing `AGENTS.md`, `codex.md`, `.codex/`, docs, package files, build
   files, test config, route/entry files, and README files.
3. Current codebase vocabulary from folder names, public APIs, UI copy, schemas,
   tests, and docs.
4. `docs/structure.md`, `harness.config.example.yaml`, and existing
   `harness.config.yaml` if present.
5. `scripts/validate_portable_harness.py`.

## Adaptation Checklist

1. Inventory existing harness files before writing.
2. Decide whether to merge, replace, or leave existing instructions untouched.
   Ask before overwriting unrelated user-authored instructions.
3. Fill project variables in `AGENTS.md`, `codex.md`, `harness.config.yaml`,
   `docs/glossary.md`, and validation commands.
4. Map real source roots, test roots, docs roots, app entry points, public
   contracts, and functional test runners.
5. Map product/spec folders: personas, scenarios, journeys, design refs,
   brand/content refs, transformed specs, work lanes, backlog, and work reports.
6. Replace placeholder vocabulary with codebase-specific terms.
7. Keep reusable workflow rules in `.codex/skills/`, `.codex/agents/`, and
   `docs/patterns/`; keep project facts in config, glossary, work lanes, and
   specs.
8. Decide which generic patterns need target-specific entries:
   workflow, boundaries, testing, and context-memory.
9. Translate current project architecture into exact paths:
   - `AGENTS.md` only for project identity, primary users, a tiny stack
     summary, hard guardrails, real validation commands, and pointers;
   - `harness.config.yaml` for stack details, source/test/docs roots,
     commands, runners, tracker settings, and memory locations;
   - `docs/glossary.md` for codebase terms;
   - `docs/patterns/boundaries.md` only for reusable boundary rules;
   - `docs/work/active.md` for active adaptation follow-up lanes.
10. Move bulky existing `AGENTS.md` content to the narrowest owner:
    - full stack/dependency maps -> `harness.config.yaml`;
    - source/test/docs roots and commands -> `harness.config.yaml`;
    - product/spec/brand/design facts -> `docs/product/`, `docs/design/`,
      `docs/brand/`, or `docs/specs/`;
    - codebase vocabulary -> `docs/glossary.md`;
    - reusable workflow or boundary rules -> `.codex/skills/`,
      `.codex/agents/`, or `docs/patterns/`;
    - active state or handoff memory -> `docs/work/`.
11. Refuse to leave placeholder values, stale cascade lines, or standalone
    review/triage routes in active harness docs; fix them or report a blocker.
12. Run the portable validator.
13. Run target-repo syntax/path checks when available.
14. Report files written, skipped, merged, or requiring user review.

## Replacement Rules

- Remove stale standalone issue or review routes only after caller inventory.
- Replace stale standalone review or triage routes with `functional-qa`,
  `test-autorepair`, `review-change`, `validate-change`, or `issue-intake`
  according to the task routing table.
- Do not introduce feature flags, dual workflows, or compatibility shims by
  default.
- Preserve user-authored project rules unless they conflict with an explicitly
  requested replacement.

## Output

- target repo inspected;
- detected stack and codebase vocabulary;
- harness files copied, merged, or skipped;
- validation commands run;
- unresolved placeholders or blocker questions;
- next recommended skill.
