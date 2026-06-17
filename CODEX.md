# Cascade Runtime Bridge

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

`context -> ingest-spec/discover/market-validation/synthesis-to-spec/compose-spec if needed -> docs-impact-map when durable docs may affect sibling rules -> orchestrate-work -> plan-change -> functional-qa -> implement-change -> review-change -> validate-change -> test-autorepair only if stale tests -> closeout`

- `context`: re-orient to branch, active work lanes, recent handoff state, and
  backlog.
- `ingest-spec`: classify incoming tickets, specs, screenshots, design
  notes, or mixed briefs into durable write targets and behavior examples.
- `discover`: create durable product/design/brand/persona/journey artifacts
  only when planning cannot resolve missing context.
- `market-validation`: frame broad business-analysis discovery, split research
  lanes, gather sourced competitor/pain/economics/segment evidence, and route
  validated findings.
- `synthesis-to-spec`: synthesize evidence-backed findings into a plan-ready
  product/spec handoff before durable artifacts are authored.
- `compose-spec`: produce durable PRDs, personas, product specs,
  requirements, journeys, scenarios, transformed specs, and backlog-ready
  acceptance criteria from validated or approved source material.
- `brand-positioning`: create or update durable brand positioning, audience,
  promise, proof, naming, tone, message hierarchy, copy rules, and visual
  direction.
- `design-system`: create or update durable design token, component, UX,
  accessibility, layout, responsive, interaction-state, and visual evidence
  rules.
- `docs-impact-map`: proactively check cross-folder product, design, brand,
  spec, backlog, glossary, and pattern dependencies before planning or
  closeout.
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
  thin product/spec/architecture doc diffs when the final diff changed durable
  facts, and final handoff.

`issue-intake` is an explicit exception path for issue bodies or tracker
tickets. Human review is an explicit open-question or exception path, not a
standalone workflow router.

## Optional Escalations

- `architecture-review`: use before cross-boundary or high-blast-radius changes.
- `review-change`: use after implementation or before closeout when Standards
  and Spec findings should be kept separate from command evidence.
- `discover`: use for durable product/design discovery, personas, journeys,
  scenarios, and specs when `plan-change` cannot resolve missing context.
- `business-analyst`: use for long market validation, live research loops,
  non-obvious product impact discovery, and evidence-backed PRD/spec synthesis.
- `market-validation`: use when a market, segment, product idea, or broad
  feature needs research lanes before planning.
- `synthesis-to-spec`: use when validated findings need evidence synthesis
  before PRDs, personas, requirements, scenarios, backlog candidates, or
  transformed specs are authored.
- `compose-spec`: use when product/spec artifacts need to be written
  from validated findings or approved source material.
- `pain-mining`, `competitive-map`, `market-economics`,
  `hypothesis-scoring`, `validation-experiments`, and `adversarial-critic`:
  use as focused market-validation lane skills.
- `brand-positioning`: use when brand, naming, tone, content, message
  hierarchy, or visual direction needs durable structure.
- `design-system`: use when design tokens, components, UX rules,
  accessibility, layout, responsive behavior, interaction states, or visual
  evidence need durable structure.
- `security`: use for security-sensitive review, auth/session/RBAC and
  tenant-boundary analysis, secure-design review, audit evidence, and security
  validation planning.
- `designer`: use for UX flow review, accessibility review,
  screenshot-backed visual validation, reusable design-system routing, and
  design handoff planning.
- `ingest-spec`: use to convert source specs into the project docs structure.
- `docs-impact-map`: use when one product/design/brand/spec/backlog/glossary
  doc update may require sibling doc checks or follow-up routing.
- `adapt-harness`: use when wiring this harness into a new repository.
- `project-onboarder`: use for new-project setup, harness installation,
  onboarding, or migration of existing instructions into the Cascade
  structure.
- `agents-best-practices`: use for Cascade or target-project agent/LLM system
  design across harness, prompt/context, tool, memory, observability, eval,
  cost, safety, and connector concerns.
- `agentic-workflow-builder`: use when a request needs a reviewable agentic
  workflow checklist that first inventories available agents and global skills,
  then wires step-level skill calls, delegation prompts, source order, write
  scope, validation, handoff, and stop rules.
- `codex-maintenance`: use for Cascade maintenance, Codex-specific
  surface audits across `AGENTS.md`, `CODEX.md`, skills, agents, config,
  hooks, MCP/tools, plugins, subagents, permissions, memory, observability,
  evals, scope, handoffs, file-tree inventories, and validator changes.
- `develop-skill`: use for creating or refactoring reusable skills.
- `issue-intake`: use only when a user asks for an issue body, tracker ticket,
  or durable bug-report artifact.

## Role Contracts

Readable role contracts live in `.codex/agents/{name}/AGENT.md`; TOML manifests
live in `.codex/agents/{name}.toml` with `[agent]` identity and `[paths]`
wiring. Use role contracts locally. Spawn or delegate only when the user
explicitly authorizes parallel agents.

- `orchestrator`: normal task orchestration and explicit workflow-packet
  routing.
- `project-onboarder`: new-project setup, harness adaptation, config/docs
  migration, validation, and setup handoff.
- `agent-engineer`: Cascade maintenance, target-project agent/LLM system
  design, Codex surface best practices, agentic workflow checklists, skills,
  source-context, tool contracts, observability, and evals.
- `business-analyst`: long business-analysis discovery, live market research,
  market validation lanes, evidence grading, and synthesis into specs.
- `security`: security-sensitive review, auth/session/RBAC and
  tenant-boundary analysis, secure-design review, audit evidence, and security
  validation planning.
- `designer`: UX flow review, reusable design-system routing, accessibility
  review, screenshot-backed visual validation, and design handoff planning.

Cascade is intentionally skill-first except where a repeated long-running
workflow or specialist review lane needs a durable role boundary. Architecture
review, functional acceptance, scenario checks, product testing, and issue
intake remain skills in the cascade rather than separate agents.
`business-analyst`, `security`, and `designer` exist because long discovery,
security review, and design review need role boundaries that are separate from
implementation.

## Work Packet

For implementation, validation, or closeout work, load `docs/work/active.md`.
Create a lane packet only when a row is not enough:

- `docs/work/_index.md`
- `docs/work/active.md`
- `docs/work/lane-template.md`
- `docs/work/examples/`
- `docs/work/lanes/*.md`
- `docs/work/reports/`

Completed or unrelated work lanes are historical context. Example lanes are
copyable guidance only and are not active work unless copied into
`docs/work/lanes/` and registered in `docs/work/active.md`.

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

Use `discover` to create durable product/design artifacts when missing context
is not market-research-heavy. Use `market-validation` and the
`business-analyst` role for long market, competitor, pain, economics, segment,
constraint, experiment, and adversarial research loops. Use
`synthesis-to-spec` when validated findings need evidence synthesis before doc
authoring. Use `compose-spec` when PRD, persona, requirement,
journey, scenario, non-goal, success-metric, transformed-spec, product-spec, or
backlog structures should be written. Use `brand-positioning` when brand
positioning, naming, tone, content hierarchy, or visual direction needs durable
structure. Use `design-system` when design tokens, components, accessibility,
responsive rules, interaction states, or visual evidence need durable structure. Use
`ingest-spec` to normalize incoming tickets, documents, screenshots, research,
or design notes into plan-ready docs. Use `docs-impact-map` when those docs
create or change a fact that may affect sibling product, design, brand, spec,
backlog, glossary, or pattern rules.

## Evidence And Context

Use `docs/patterns/workflow.md` for scoped coverage from current work-lane
criteria to changed code and validation. At closeout, scan the final diff for
durable product, design, brand, spec, architecture, stack/runtime, or glossary
changes and append only thin sourced doc diffs to the existing owner docs.
Persist only reusable lessons, required handoff state, or required thin diffs;
avoid decorative documentation churn.
