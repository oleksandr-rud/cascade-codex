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

## Model Routing

- Pin `gpt-5.6-sol` for the default runtime, orchestration, planning,
  synthesis, security reasoning, and independent harness judgment.
- Pin `gpt-5.6-terra` for bounded read-heavy scans, onboarding inventory,
  design evidence review, and target-agent execution probes.
- Keep model choices in `.codex/config.toml`, custom-agent TOML files, and the
  adapter config. Do not inherit an unrecorded user-level model for replayable
  harness experiments.
- A diagnostic model override is allowed only when its value is captured in
  the run metadata; it does not change the canonical pins.

## New Task And Spec Route

Use this cascade for non-atomic work:

`context -> ingest-spec/discover/market-validation/synthesis-to-spec/compose-spec if needed -> docs-impact-map when durable docs may affect sibling rules -> pattern-context when reusable pattern packs are needed -> orchestrate-work -> plan-change -> functional-qa when new product-visible proof is needed -> implement-change -> review-change -> validate-change -> test-autorepair only if stale tests -> closeout`

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
  requirements, journeys, scenarios, spec packets, and backlog-ready
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
- `pattern-context`: retrieve, compile, create, or update bounded
  `docs/patterns/{entry}/` metadata and context packs when reusable pattern
  memory is in scope.
- `orchestrate-work`: discover, split, connect, serialize, schedule, or track
  worklines and their coordination/materialization gates.
- `reconcile-work-graph`: audit and canonicalize existing lanes, worklines,
  and graph records before graph creation, cutover, deduplication, or
  active-row retirement proposals.
- `plan-change`: capture product/design intent, codebase vocabulary, behavior
  examples, slice boundary, risks, and validation plan.
- `functional-qa`: execute or author product-visible browser, API, journey,
  scenario, and functional-test proof when new acceptance evidence is needed.
- `implement-change`: scoped behavior-slice implementation.
- `review-change`: fixed-point Standards/Spec review for WIP, branch, or PR
  changes.
- `validate-change`: directly aggregate existing command, test, type, diff,
  link, scenario, functional, review, materialization, batch, and graph evidence;
  assess freshness, invalidation, gate impact, the earliest responsible
  contract, and bounded reopen sets.
- `test-autorepair`: repair stale, flaky, or failing tests only when product
  behavior still matches the expected contract.
- `closeout`: persist validation evidence, work memory, reusable lessons,
  thin product/spec/architecture doc diffs when the final diff changed durable
  facts, and final handoff.
- `archive-work`: automatically after a lane/graph closeout, or directly for
  scoped historical cleanup, prove that the completed set has no active
  dependency, create a digest-bound capsule, and move frozen originals out of
  `docs/work/` without rewriting their evidence.

`issue-intake` is an explicit exception path for issue bodies or tracker
tickets. Human review is an explicit open-question or exception path, not a
standalone workflow router.

### Acceptance And Validation Route Boundary

- Use `functional-qa` when the task must author, execute, or collect new
  product-visible proof through a browser, API, CLI, journey, scenario, or
  functional test boundary.
- Use `validate-change` directly when evidence already exists and the task is to
  aggregate it, assess freshness or invalidation, determine gate impact,
  identify the earliest responsible node/workline/contract, or calculate the
  bounded reopen set. This remains a direct validation route when the evidence
  subject is a Task Graph, Coordination Graph, materialization, batch, or
  integrated active-worktree state.
- Do not load `functional-qa` merely because existing evidence is functional,
  and do not load `orchestrate-work` merely because the validation subject is
  graph-shaped. Route to `functional-qa` only when new product-visible proof is
  required. Route to `orchestrate-work` only when workline topology, scheduling,
  ownership, dispatch, or materialization coordination must change; route to
  `plan-change` only when a definition, boundary, gate, or implementation
  decision must change.

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
  spec packets are authored.
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
- `pattern-context`: use when a task needs selected pattern context, or when
  onboarding, planning, validation, or closeout creates or updates a pattern
  entry or `*.pack.yaml` context pack.
- `adapt-harness`: use when wiring this harness into a new repository. Begin
  with `bun scripts/cascade.ts target inventory`; validate adapted config
  with `bun scripts/cascade.ts validate --target`; and require the
  schema-backed onboarding manifest plus current drift for deep-onboarding
  completion.
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
- `harness-evaluation`: use for generated Cascade scenarios, read-only live
  experiments, JSONL trace capture, mechanical eligibility, independent
  outcome and trajectory judgments, coverage measurement, and regression
  promotion.
- `judge-eval-builder`: use to create or calibrate judge profiles, anchored
  rubrics, schemas, aggregation rules, and adversarial judge tests.
- `develop-skill`: use for creating or refactoring reusable skills.
- `issue-intake`: use only when a user asks for an issue body, tracker ticket,
  or durable bug-report artifact.

## Role Contracts

Readable role contracts live in `.codex/agents/{name}/AGENT.md`; standalone
Codex custom-agent files live in `.codex/agents/{name}.toml` with top-level
`name`, `description`, `model`, and `developer_instructions`; role skill maps live in
`.codex/agents/{name}/skills.yaml`. Use role contracts locally. Spawn or
delegate only when the user explicitly authorizes parallel agents.

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
- `harness-evaluator`: read-only outcome or trajectory judgment of eligible
  Cascade scenario outputs and traces.

Cascade is intentionally skill-first except where a repeated long-running
workflow or specialist review lane needs a durable role boundary. Architecture
review, functional acceptance, scenario checks, product testing, and issue
intake remain skills in the cascade rather than separate agents.
`business-analyst`, `security`, `designer`, and `harness-evaluator` exist
because long discovery, specialist review, and independent trace judgment need
role boundaries that are separate from implementation.

## Work Packet

For implementation, validation, or closeout work, load `docs/work/active.md`.
Create a lane packet only when a row is not enough:

- `docs/work/_index.md`
- `docs/work/active.md`
- `docs/work/lane-template.md`
- `docs/work/graph-template.md`
- `docs/work/examples/`
- `docs/work/lanes/*.md`
- `docs/work/graphs/CG-XXX-*.md`
- `docs/work/reports/`
- `docs/archive/work-reports/` for compact capsules and relocated frozen
  history only when completed work is explicitly in scope

Completed or unrelated work lanes are historical context. Example lanes are
copyable guidance only and are not active work unless copied into
`docs/work/lanes/` and registered in `docs/work/active.md`.

When a lane or Coordination Graph completes, `closeout` writes the durable
report and retires its active projection, then automatically invokes
`archive-work` for that exact set. The archive step requires
terminal/dependency/reference readiness, writes one capsule, and moves frozen
originals byte-for-byte to `docs/archive/work-reports/`. It returns
`ARCHIVED`, `ARCHIVE_DEFERRED`, or `NOT_APPLICABLE`; deferral does not undo
valid completion. This is a same-turn skill chain, not a background scheduler
or hook. Archived work does not become active by being read or referenced.

For a complex lane with typed dependencies, use its lane-local Task Graph. When
two or more canonical worklines also have a cross-workline dependency,
evidence/batch join, materialization or integrated-validation boundary,
invalidation relationship, or partial-repair route, use a first-class
`docs/work/graphs/CG-XXX-*.md` Coordination Graph. Existing worklines route
through `reconcile-work-graph` before cutover. Rich definitions remain in
their source/spec/lane owners; `docs/work/active.md` and status boards remain
derived projections. Atomic work and unrelated worklines omit the Coordination
Graph. The protocol adds no scheduler, compiler, automatic worktree action,
commit, push, or replacement for the agent's reasoning and tool loop.

For non-atomic product or implementation planning, evaluate reusable graph
fragments under `docs/patterns/workflow/fragments/` before finalizing
worklines. Record selected, merged, not-applicable, and blocked fragments; bind
ports; resolve existing roles or authorized workers, skill calls, target test
commands, fixtures/environments, and evaluator authority; then emit only the
smallest applicable flow. Reusable fragment files are not active work state.

## Write Targets

Use `docs/structure.md` as the folder map for skills that write or translate
work. It defines where active work, specs, product/design/brand material,
patterns, and architecture mapping belong.

Required routing:

- `docs/specs/source/`: provided source material saved mostly as-is, with only
  compact metadata or planning status when useful.
- `docs/specs/{slice-slug}/`: one folder per big issue, capability, or
  workflow slice; stores normalized plan-ready spec packets, package files,
  prompt scripts, and module catalogs for that slice.
- `docs/product/`: product intent, journeys, personas, scenarios.
- `docs/design/`: interaction, accessibility, tokens, components, constraints.
- `docs/brand/`: naming, tone, content, visual direction.
- `docs/work/`: active execution state and durable work reports.
- `docs/patterns/{entry}/`: reusable pattern memory with `index.md` plus
  `*.pack.yaml` files that contain summary, routing, graph-like documents, and
  selectable sections.
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
journey, scenario, non-goal, success-metric, spec-packet, product-spec, or
backlog structures should be written. Use `brand-positioning` when brand
positioning, naming, tone, content hierarchy, or visual direction needs durable
structure. Use `design-system` when design tokens, components, accessibility,
responsive rules, interaction states, or visual evidence need durable structure. Use
`ingest-spec` to normalize incoming tickets, documents, screenshots, research,
or design notes into plan-ready docs. Use `docs-impact-map` when those docs
create or change a fact that may affect sibling product, design, brand, spec,
backlog, glossary, or pattern rules.

## Evidence And Context

Use `docs/patterns/workflow/index.md` for scoped coverage from current work-lane
criteria to changed code and validation. Use
`scripts/cascade.ts patterns` to compile selected pattern-pack text
from `docs/patterns/*/*.pack.yaml` when prompt context should include only
specific rules. At closeout, scan the final diff for
durable product, design, brand, spec, architecture, stack/runtime, or glossary
changes and append only thin sourced doc diffs to the existing owner docs.
Persist only reusable lessons, required handoff state, or required thin diffs;
avoid decorative documentation churn.

## Harness Evaluation

Canonical harness scenarios and schemas live under `evals/harness/`. Generate
and check the 7-case-per-skill catalog with
`bun scripts/cascade.ts eval catalog --write` and `catalog --check`.
Live target runs are read-only and store raw JSONL, normalized traces,
eligibility, a source manifest, judgments, and reports under ignored
`.artifacts/harness-evals/`. Use the `harness-evaluator` role only after target
execution and eligibility; no live trace means no live scenario pass. Run
`bun scripts/cascade.ts eval judge --run-dir
.artifacts/harness-evals/<run-id>` for independent outcome and trajectory
judgments of every eligible case. Accepted coverage requires both.

## Campaign Execution

Typed reusable tasks live in `evals/tasks/`; versioned execution plans live in
`evals/campaigns/`. Run them through `bun scripts/cascade.ts campaign`.
Campaigns preserve task logs and source digests under `.artifacts/campaigns/`
but do not convert authored tasks into execution evidence. `browser` tasks use
Playwright; autonomous agent browsing remains a separate permissioned
browser-tool capability.
