---
name: adapt-harness
description: Use for new-project onboarding or setup after copying Cascade Codex into a target repository; inspects the codebase, fills project variables, adapts docs, builds project-part onboarding specs, routes visual/product/security/architecture evidence, migrates bulky AGENTS.md facts, and validates agent/skill references.
---

# Adapt Harness

Use after copying Cascade Codex into a new repository, or when a user
asks for onboarding, setup, install harness, wire harness, migrate existing
instructions, or adapt the harness to a different project.

This skill adapts configuration and docs to the target codebase. It does not
invent project facts; it inspects the repository first and asks only blocker
questions.

## Source Order

1. Latest user request and target repository root.
2. Existing `AGENTS.md`, `CODEX.md`, `.codex/`, docs, package files, build
   files, test config, route/entry files, and README files.
3. Current codebase vocabulary from folder names, public APIs, UI copy, schemas,
   tests, and docs.
4. `docs/structure.md`, `harness.config.example.yaml`, and existing
   `harness.config.yaml` if present.
5. `docs/patterns/workflow.md` for the shared Doc Routing Decision Matrix.
6. `docs/patterns/boundaries.md`, `docs/patterns/testing.md`, and
   `docs/patterns/context-memory.md` for reusable architecture, validation,
   and source-context routing.
7. `checklists/project-onboarding-analysis.md` when onboarding requires a
   full project scan, project-part specs, feature cataloging, visual evidence,
   or durable context routing.
8. `templates/project-onboarding-workflow.md` and
   `templates/project-part-spec.md` when the request needs a repeatable
   agent/skill workflow packet or one spec per meaningful project area.
9. `scripts/validate_cascade_codex.py`.

## Scope

Use the normal adaptation checklist for small setup work. Use the deep
onboarding workflow when the user asks for a full scan, project analysis,
project-part specs, feature-by-feature product specs, visual/design/brand
capture, security/backend/frontend/stack/architecture memory, or a repeatable
onboarding workflow.

The deep workflow is an agentic workflow template, not permission to spawn
dynamic agents. Project Onboarder stays the merge owner. Designer, Security,
Agent Engineer, and other role routes are specialist support lanes only when
their owning skills are needed and delegation is authorized.

## Adaptation Checklist

1. Inventory existing harness files before writing.
2. Decide whether to merge, replace, or leave existing instructions untouched.
   Ask before overwriting unrelated user-authored instructions.
3. Fill project variables in `AGENTS.md`, `CODEX.md`, `harness.config.yaml`,
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
10. Record Doc Routing Decision Matrix rows for migrated, deferred, blocked,
    or intentionally unchanged project facts.
11. Move bulky existing `AGENTS.md` content to the narrowest owner:
    - full stack/dependency maps -> `harness.config.yaml`;
    - source/test/docs roots and commands -> `harness.config.yaml`;
    - product/spec/brand/design facts -> `docs/product/`, `docs/design/`,
      `docs/brand/`, or `docs/specs/`;
    - codebase vocabulary -> `docs/glossary.md`;
    - reusable workflow or boundary rules -> `.codex/skills/`,
      `.codex/agents/`, or `docs/patterns/`;
    - active state or handoff memory -> `docs/work/`.
12. Refuse to leave placeholder values, stale cascade lines, or standalone
    review/triage routes in active harness docs; fix them or report a blocker.
13. Run the Cascade Codex validator.
14. Run target-repo syntax/path checks when available.
15. Report files written, skipped, merged, or requiring user review.

## Deep Onboarding Workflow

Use `templates/project-onboarding-workflow.md` and
`checklists/project-onboarding-analysis.md` for broad onboarding. The workflow
is normally a `sequential-pipeline` with optional parallel support lanes only
when writes are disjoint and Project Onboarder is the merge owner.

Required phase outcomes:

1. Context and harness inventory: record source identity, existing harness
   files, app entry points, package/build/test files, docs roots, and blockers.
2. Stack and command map: fill `harness.config.yaml` with source roots, test
   roots, commands, runners, tracker settings, and memory locations.
3. Code area specs: create one `templates/project-part-spec.md`-shaped packet
   per meaningful backend, frontend, shared, data, integration, tool, or
   runtime area when the target repo is large enough to benefit from separate
   specs.
4. Architecture and boundary synthesis: route reusable boundaries to
   `docs/patterns/boundaries.md`, codebase vocabulary to `docs/glossary.md`,
   and open architecture questions to `docs/work/reports/` or backlog.
5. Security and data handling: route current-code security inventory to
   `codebase-audit`, auth/session/role concerns to `auth-analysis`, proposed
   workflow risks to `secure-design`, and durable validation rules to
   `docs/patterns/testing.md`.
6. Product feature catalog: inspect routes, UI surfaces, API contracts, tests,
   README docs, specs, and user-facing copy; write durable feature intent,
   journeys, scenarios, requirements, and transformed specs to their narrow
   owner docs.
7. Visual, design, brand, and layout capture: when a UI can be run or evidence
   exists, use `visual-qa` for screenshot-backed layout/style/state evidence,
   `ux-flow-review` for flow quality, `design-system` for reusable tokens and
   component rules, and `brand-positioning` for tone, naming, content, and
   visual direction.
8. Functional acceptance map: use `functional-qa` to connect discovered
   product scenarios and public contracts to executable or manual checks, then
   route durable test rules to `docs/patterns/testing.md`.
9. Context-memory routing and doc impact: use `docs-impact-map` before writing
   cross-folder facts, and write durable memory to the narrowest owner:
   `docs/product/`, `docs/design/`, `docs/brand/`, `docs/specs/`,
   `docs/patterns/`, `docs/glossary.md`, `harness.config.yaml`, or
   `docs/work/`.
10. Validation and closeout: run the Cascade validator, target checks when
    available, stale-reference searches, and close with files written,
    skipped, blocked, and next routes.

Do not create broad security, backend, frontend, or memory dump folders. Use
the existing owner files and folders named in `docs/structure.md`.

## Replacement Rules

- Remove stale standalone issue or review routes only after caller inventory.
- Replace stale standalone review or triage routes with `functional-qa`,
  `test-autorepair`, `review-change`, `validate-change`, or `issue-intake`
  according to the task routing table.
- Do not introduce feature flags, dual workflows, or compatibility shims by
  default.
- Preserve user-authored project rules unless they conflict with an explicitly
  requested replacement.

## Templates

- `templates/project-onboarding-workflow.md`
- `templates/project-part-spec.md`

## Checklists

- `checklists/project-onboarding-analysis.md`

## Output

- target repo inspected;
- detected stack and codebase vocabulary;
- harness files copied, merged, or skipped;
- project-part specs written or explicitly skipped;
- product feature specs, scenarios, journeys, design, brand, security, stack,
  architecture, and context-memory routing decisions;
- doc routing decisions;
- validation commands run;
- unresolved placeholders or blocker questions;
- next recommended skill.
