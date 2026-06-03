# Codex Runtime Bridge

This file connects repository instructions, skills, role contracts, and docs.
`AGENTS.md` should be the autoloaded repository instruction file; load this
bridge when a task needs workflow detail.

## Load Order

1. `AGENTS.md`
2. `CODEX.md`
3. Relevant `.codex/skills/{name}/SKILL.md`
4. Relevant `.codex/agents/{name}/AGENT.md`
5. Relevant `docs/structure.md`, `docs/patterns/`, `docs/work/`,
   `docs/specs/`, or `docs/glossary.md`

If docs and code disagree, follow current code and report the drift.

## New Task And Spec Route

Use this cascade for non-atomic work:

`context -> ingest-spec/discover if needed -> orchestrate-work -> plan-change -> functional-qa -> implement-change -> review-change -> validate-change -> test-autorepair only if stale tests -> closeout`

- `context`: re-orient to branch, active work lanes, recent handoff state, and
  backlog.
- `ingest-spec`: classify incoming tickets, specs, screenshots, design
  notes, or mixed briefs into durable write targets and behavior examples.
- `discover`: create durable product/design/brand/persona/journey artifacts
  only when planning cannot resolve missing context.
- `orchestrate-work`: split, serialize, track, or merge work lanes when the
  work can run in parallel or needs dependency management.
- `plan-change`: capture product/design intent, codebase vocabulary, behavior
  examples, slice boundary, risks, and validation plan.
- `functional-qa`: primary product-visible acceptance gate for browser, API,
  journey, scenario, and functional-test evidence.
- `implement-change`: scoped behavior-slice implementation.
- `review-change`: fixed-point Standards/Spec review for WIP, branch, or PR
  changes.
- `validate-change`: command, test, type, diff, link, scenario, and functional
  evidence aggregator.
- `test-autorepair`: repair stale, flaky, or failing tests only when product
  behavior still matches the expected contract.
- `closeout`: persist validation evidence, work memory, reusable lessons,
  and final handoff.

`issue-intake` is an explicit exception path for issue bodies or tracker
tickets. Human review is an explicit open-question or exception path, not a
standalone workflow router.

## Optional Escalations

- `architecture-review`: use before cross-boundary or high-blast-radius changes.
- `review-change`: use after implementation or before closeout when Standards
  and Spec findings should be kept separate from command evidence.
- `discover`: use for durable product/design discovery, personas, journeys,
  scenarios, and specs when `plan-change` cannot resolve missing context.
- `ingest-spec`: use to convert source specs into the project docs structure.
- `adapt-harness`: use when wiring this harness into a new repository.
- `project-onboarder`: use for new-project setup, harness installation,
  onboarding, or migration of existing instructions into the portable
  structure.
- `agents-best-practices`: use for harness, prompt/context, tool, memory,
  observability, eval, and connector design.
- `develop-skill`: use for creating or refactoring reusable skills.
- `issue-intake`: use only when a user asks for an issue body, tracker ticket,
  or durable bug-report artifact.

## Role Contracts

Readable role contracts live in `.codex/agents/{name}/AGENT.md`; TOML manifests
live in `.codex/agents/{name}.toml`. Use role contracts locally. Spawn or
delegate only when the user explicitly authorizes parallel agents.

- `orchestrator`: orchestration.
- `project-onboarder`: new-project setup, harness adaptation, config/docs
  migration, validation, and setup handoff.
- `agent-engineer`: harness, skills, memory, tool contracts, observability, and
  evals.

The portable kit is intentionally skill-first. Architecture review, functional
acceptance, scenario checks, product testing, and issue intake remain skills in
the cascade rather than separate agents. Add a specialized agent only after the
target project has a repeated failure mode that local skill execution cannot
handle cleanly.

## Work Packet

For implementation, validation, or closeout work, load `docs/work/active.md`.
Create a lane packet only when a row is not enough:

- `docs/work/_index.md`
- `docs/work/active.md`
- `docs/work/lane-template.md`
- `docs/work/lanes/*.md`
- `docs/work/reports/`

Completed or unrelated work lanes are historical context.

## Write Targets

Use `docs/structure.md` as the folder map for skills that write or translate
work. It defines where active work, specs, product/design/brand material,
patterns, and architecture mapping belong.

Required routing:

- `docs/specs/incoming/`: raw source material only when useful to preserve.
- `docs/specs/transformed/`: normalized plan-ready specs.
- `docs/product/`: product intent, journeys, personas, scenarios.
- `docs/design/`: interaction, accessibility, tokens, components, constraints.
- `docs/brand/`: naming, tone, content, visual direction.
- `docs/work/`: active execution state and durable work reports.
- `docs/glossary.md`: codebase vocabulary.

## Product And Spec Packet

Use product/spec docs only when they are current enough to guide behavior:

- `docs/product/_index.md`
- `docs/product/scenarios.md`
- `docs/product/personas/_index.md`
- `docs/design/_index.md`
- `docs/brand/_index.md`
- `docs/specs/_index.md`

Use `discover` to create durable product/design artifacts. Use
`ingest-spec` to normalize incoming tickets, documents, screenshots, or
design notes into plan-ready docs.

## Evidence And Memory

Use `docs/patterns/workflow.md` for scoped coverage from current work-lane
criteria to changed code and validation. Persist only reusable
lessons or required handoff state; avoid decorative documentation churn.
