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
5. `docs/patterns/workflow/index.md` for the shared Doc Routing Decision Matrix.
6. `docs/patterns/boundaries/index.md`, `docs/patterns/testing/index.md`, and
   `docs/patterns/context-memory/index.md` for reusable architecture, validation,
   and source-context routing.
7. `docs/patterns/architecture-defaults/index.md` plus only matching
   graph/spec pairs when detected architecture, stack, cache, tenancy,
   interface, service, event-driven, frontend, native app, CLI, experiment, or
   SDK/library behavior needs a reference comparison. Use
   `frontend-architecture-defaults` for a detected browser client and the core
   `architecture-defaults` pack for other archetypes and cross-cutting work.
8. `docs/patterns/_index.md`, `.codex/skills/pattern-context/SKILL.md`, and
   `scripts/cascade/patterns.ts` when onboarding writes or retrieves
   pattern entries, metadata, or context packs.
9. `scripts/cascade/target.ts` and `schemas/` for deterministic
   inventory, target-config validation, onboarding evidence, preservation
   hashes, and source-drift checks.
10. `checklists/project-onboarding-analysis.md` when onboarding requires a
   full project scan, project-part specs, feature cataloging, visual evidence,
   or durable context routing.
11. `templates/project-onboarding-workflow.md` and
   `templates/project-part-spec.md` when the request needs a repeatable
   agent/skill workflow packet or one spec per meaningful project area.
12. `simulation-campaigns` and its tracked starter template when the target
    project has an approved simulation/evaluation scope.
13. `scripts/cascade/validate.ts`.

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

1. Inventory existing harness files before writing. Run
   `bun scripts/cascade.ts target inventory --root .` and use its
   deterministic output as the initial source map; do not treat it as semantic
   product truth.
2. Decide whether to merge, replace, or leave existing instructions untouched.
   Ask before overwriting unrelated user-authored instructions.
3. Fill project variables in `AGENTS.md`, `CODEX.md`, `harness.config.yaml`,
   `docs/glossary.md`, and validation commands.
4. Map real source roots, test roots, docs roots, app entry points, public
   contracts, and functional test runners.
5. Map product/spec folders: personas, scenarios, journeys, design refs,
   brand/content refs, spec packets, work lanes, backlog, and work reports.
6. Replace placeholder vocabulary with codebase-specific terms.
7. Keep reusable workflow rules in `.codex/skills/`, `.codex/agents/`, and
   `docs/patterns/`; keep project facts in config, glossary, work lanes, and
   specs.
8. Decide which generic pattern entries need target-specific updates:
   workflow, boundaries, architecture-defaults, testing, context-memory, or a
   new bounded entry created through `pattern-context`. For a matching
   architecture-default pair, record `ADOPTED`, `ADAPTED`, `REJECTED`, or
   `GAP` from current target evidence. Resolve `architecture-selection`, then
   extract source-linked claims and applicable policies for each backend
   service, backend worker, web frontend, native app, CLI, experiment, or an
   independently versioned/distributed library.
   Resolve the complete `stack-selection` profile per application unit. Route
   application runtimes, frameworks, libraries, UI, and transports through
   `app-stack` plus the matching backend, frontend, native, CLI, experiment,
   or library extension. Route each application unit through its matching
   backend, frontend, native, CLI, experiment, or library infrastructure
   profile, then
   route compute, data, messaging, network, delivery, secrets, and
   observability resource units through `infrastructure` plus only the
   required resource extensions. If a required pair is absent or not yet
   validated, record `GAP` or `NOT_RUN`; do not substitute another contour.
   Validate the shared application and infrastructure evidence record with
   `scripts/validate_stack_selection_evidence.py`.
9. Translate current project architecture into exact paths:
   - `AGENTS.md` only for project identity, primary users, a tiny stack
     summary, hard guardrails, real validation commands, and pointers;
   - `harness.config.yaml` for stack details, source/test/docs roots,
     commands, runners, tracker settings, and memory locations;
   - `docs/glossary.md` for codebase terms;
   - `docs/patterns/{entry}/index.md` plus `*.pack.yaml` containing summary,
     routing, graph-like documents, and selectable sections only for reusable
     pattern rules;
   - `docs/work/active.md` for active adaptation follow-up lanes.
10. Record Doc Routing Decision Matrix rows for migrated, deferred, blocked,
    or intentionally unchanged project facts.
11. Move bulky existing `AGENTS.md` content to the narrowest owner:
    - full stack/dependency maps -> `harness.config.yaml`;
    - source/test/docs roots and commands -> `harness.config.yaml`;
    - product/spec/brand/design facts -> `docs/product/`, `docs/design/`,
      `docs/brand/`, or `docs/specs/`;
    - codebase vocabulary -> `docs/glossary.md`;
    - reusable workflow, boundary, testing, context, memory, or other bounded
      pattern rules -> `.codex/skills/`, `.codex/agents/`, or a
      `docs/patterns/{entry}/` folder maintained with `pattern-context`;
    - active state or handoff memory -> `docs/work/`.
12. Refuse to leave placeholder values, stale cascade lines, or standalone
    review/triage routes in active harness docs; fix them or report a blocker.
13. Run
    `bun scripts/cascade.ts validate --target` so unresolved
    placeholders, stale config keys, invalid config shapes, and missing
    configured paths fail setup.
14. For deep onboarding, create
    `docs/work/onboarding-manifest.json` with
    `bun scripts/cascade.ts target init-manifest`, preserve every
    `.pre-cascade` backup hash, record every `ON-00` through `ON-09`
    disposition, project-part decision, doc-routing decision, and validation
    result, then refresh the intentional source/config snapshot without
    changing preservation hashes.
15. Run target-repo syntax/path checks when available.
    Use `bun scripts/cascade.ts target probe-commands` to verify
    configured executables and repository script paths without executing those
    commands; record every configured command as `PASS`, `FAIL`, `BLOCKED`,
    `NOT_RUN`, or `GAP` in the manifest.
16. When the user explicitly requests a new source structure and the target
    has no conflicting architecture, preview a selected
    `architecture-scaffold-profiles.json` profile with
    `scripts/scaffold_architecture_default.py preview`. Use `write` only after
    the path set is reviewed. Never add an overwrite mode or install packages
    from this generator.
17. When target behavior needs simulation, derive the simulation ID and owner
    lane from approved project scope, preview
    `bun scripts/cascade.ts simulation init <id> --owner-lane W-NNN --dry-run`,
    review all generated paths, then initialize. Do not create a generic
    simulation when no target scenario or owner exists, and never overwrite an
    existing package.
18. For completed deep onboarding, run
    `bun scripts/cascade.ts validate --target
    --require-onboarding-complete`; do not claim completion while the manifest
    is missing, incomplete, drifted, or has stale preservation hashes.
19. Report files written, skipped, merged, or requiring user review.

## Deep Onboarding Workflow

Use `templates/project-onboarding-workflow.md` and
`checklists/project-onboarding-analysis.md` for broad onboarding. The workflow
is normally a `sequential-pipeline` with optional parallel support lanes only
when writes are disjoint and Project Onboarder is the merge owner.

Required phase outcomes:

1. Context and harness inventory: run the deterministic inventory command and
   record source identity, existing harness files, app entry points,
   package/build/test files, docs roots, commands, feature-surface candidates,
   source snapshot, and blockers.
2. Stack and command map: fill `harness.config.yaml` with source roots, test
   roots, commands, runners, tracker settings, and memory locations; validate
   it in target mode, then initialize the onboarding manifest so collision
   backups are hash-bound before later documentation writes.
3. Code area specs: create one `templates/project-part-spec.md`-shaped packet
   per meaningful backend, frontend, shared, data, integration, tool, or
   runtime area when the target repo is large enough to benefit from separate
   specs.
4. Architecture and boundary synthesis: route reusable boundaries to
   `docs/patterns/boundaries/index.md` or a bounded pattern entry maintained
   with `pattern-context`; compare detected architecture, stack, cache,
   tenancy, interface, service, event-driven, frontend, native, CLI,
   experiment, or SDK/library shapes against only matching
   `docs/patterns/architecture-defaults/` pairs; resolve application contour
   infrastructure before resource/provider extensions, and resolve
   relationship and preservation constraints before recording `ADOPTED`,
   `ADAPTED`, `REJECTED`, or `GAP`; route codebase vocabulary to
   `docs/glossary.md`, and open architecture questions to
   `docs/work/reports/` or backlog.
5. Security and data handling: route current-code security inventory to
   `codebase-audit`, auth/session/role concerns to `auth-analysis`, proposed
   workflow risks to `secure-design`, and durable validation rules to
   `docs/patterns/testing/index.md`.
6. Product feature catalog: inspect routes, UI surfaces, API contracts, tests,
   README docs, specs, and user-facing copy; write durable feature intent,
   journeys, scenarios, requirements, and spec packets to their narrow
   owner docs.
7. Visual, design, brand, and layout capture: when a UI can be run or evidence
   exists, use `visual-qa` for screenshot-backed layout/style/state evidence,
   `ux-flow-review` for flow quality, `design-system` for reusable tokens and
   component rules, and `brand-positioning` for tone, naming, content, and
   visual direction.
8. Functional acceptance map: use `functional-qa` to connect discovered
   product scenarios and public contracts to executable or manual checks, then
   route durable test rules to `docs/patterns/testing/index.md`.
   When approved scenarios need a campaign, use `simulation-campaigns` to
   preview and initialize the target simulation package, then replace starter
   assumptions with observed target boundaries before making calibration
   claims.
9. Context-memory routing and doc impact: use `docs-impact-map` before writing
   cross-folder facts, use `pattern-context` for pattern entries and packs, and
   write durable memory to the narrowest owner:
   `docs/product/`, `docs/design/`, `docs/brand/`, `docs/specs/`,
   `docs/patterns/`, `docs/glossary.md`, `harness.config.yaml`, or
   `docs/work/`.
10. Validation and closeout: refresh the manifest snapshot after intentional
    onboarding writes without changing preserved-file hashes; record all phase,
    project-part, documentation, and check outcomes; run the target validator
    with `--require-onboarding-complete`, available target checks,
    stale-reference searches, and a separate drift command; close with files
    written, skipped, blocked, and next routes.

Do not create broad security, backend, frontend, or memory dump folders.
Controlled pattern entries are allowed only when `pattern-context` is used and
the entry has `index.md` plus at least one `*.pack.yaml` containing summary,
routing, graph-like documents, and selectable sections.

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
- deterministic inventory digest and source revision;
- detected stack and codebase vocabulary;
- harness files copied, merged, or skipped;
- project-part specs written or explicitly skipped;
- product feature specs, scenarios, journeys, design, brand, security, stack,
  architecture, and context-memory routing decisions;
- doc routing decisions;
- onboarding manifest status, preservation check, and source-drift status;
- validation commands run;
- unresolved placeholders or blocker questions;
- next recommended skill.
