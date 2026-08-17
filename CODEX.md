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

## Task Admission And Proportional Route

Every turn first receives the deterministic admission microkernel defined by
`.codex/task-admission/` and exposed through `scripts/cascade.ts admission`.
The Task Envelope independently records topology, effort, assurance, authority,
evidence, duration, and context. Its selected control packs determine which
parts of the Cascade route apply. It never grants permission, dispatches work,
or converts authored evidence into acceptance. Schema validation replays the
redacted canonical derivation input against the current policy and control
sources; this proves deterministic self-consistency, not user-origin
authenticity. Authority-bearing consumers must separately bind the externally
expected request and source digests.

`UserPromptSubmit` adds only bounded advisory context. The repository
`PreToolUse` and `PermissionRequest` hook has no production
`TrustedAuthorityHost`; it therefore hard-denies external, privileged, and
destructive actions by default even when a structurally valid envelope exists,
and it never auto-approves an action. Host receipt integration, user-origin
authenticity, trusted current-envelope selection, revocation, and atomic
single-use consumption are `NOT_IMPLEMENTED` and `NOT_RUN`. A future host may
defer a verified exact action to the normal Codex approval flow only after all
of those host-owned checks pass. Project hooks still require normal Codex trust
review. When hooks are unavailable, perform the requirements-only microkernel
in-process; do not make conversation depend on hook availability. Do not
persist prompts containing raw secrets.

`PostToolUse` separately inspects completed `apply_patch` payloads for actual
harness-evaluation impact. It is a deterministic classifier, not an evaluator:
ordinary edits emit no context; eval-runner changes request focused mechanical
checks; assertion or judge-contract changes request bounded assertion review.
It never launches a model, grants authority, or establishes a pass. The active
agent records the hook decision and decides whether a changed semantic
assertion needs one affected live scenario and independent judgment.

For non-atomic work, select only the applicable stages from:

`context -> ingest-spec/discover/market-validation/synthesis-to-spec/compose-spec if needed -> docs-impact-map when durable docs may affect sibling rules -> pattern-context when reusable pattern packs are needed -> plan-change -> plan-iterations when delivery spans horizons -> orchestrate-work when feasible committed first-iteration scope needs coordination -> functional-qa when new product-visible proof is needed -> implement-change -> review-change -> validate-change -> test-autorepair only if stale tests -> closeout`

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
- `plan-change`: capture product/design intent, codebase vocabulary, behavior
  examples, implementation slices, risks, and validation without activating a
  roadmap.
- `plan-iterations`: when grounded slices span more than one delivery horizon,
  rank them, assign exclusive delivery dispositions, trace the orthogonal MVP
  outcome boundary, and propose or record an authorized first-iteration
  commitment without making future scope active. Unknown capacity or
  commitment authority produces `ITERATION_PROPOSED`, not committed scope.
- `orchestrate-work`: instantiate, connect, serialize, schedule, or track
  worklines from feasible committed first-iteration scope and own their coordination or
  materialization gates. Graph creation remains a downstream applicability and
  authorization decision.
- `reconcile-work-graph`: audit and canonicalize existing lanes, worklines,
  and graph records before graph creation, cutover, deduplication, or
  active-row retirement proposals.
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
- `plan-iterations`: use after `plan-change` when implementation slices need a
  ranked delivery plan, orthogonal MVP boundary, and progressive
  first/next/later dispositions.
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
- `cascade-simulations:simulate`: when the separately installed
  `cascade-simulations` plugin is available, use it for one bounded actor doing
  meaningful work through a declared interface toward an observable outcome.
  Its compact contract is the ordinary simulation route.
- `simulation-campaigns`: use for versioned command, terminal, browser,
  desktop, mobile, or agent-response campaign definition, selection,
  coordination, replay planning, receipt aggregation, claims, and reporting.
- `simulation-execution`: use after selection and approval to preflight,
  provision, seed, execute, observe, freeze evidence, clean up, and hand off
  one bounded campaign run.
- `simulation-evaluation`: use after an immutable run exists to independently
  validate evidence, policies, oracles, semantic judgments, and claim support.
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
  source-context, tool contracts, dynamic actor simulation routing, simulation
  campaigns, observability, and evals.
- `business-analyst`: long business-analysis discovery, live market research,
  market validation lanes, evidence grading, and synthesis into specs.
- `security`: security-sensitive review, auth/session/RBAC and
  tenant-boundary analysis, secure-design review, audit evidence, and security
  validation planning.
- `designer`: UX flow review, reusable design-system routing, accessibility
  review, screenshot-backed visual validation, and design handoff planning.
- `harness-evaluator`: read-only outcome or trajectory judgment of eligible
  Cascade scenario outputs and traces after deterministic hard gates run.
- `simulation-operator`: bounded mutable execution of one approved campaign
  with immutable evidence, verified cleanup, and an execution receipt.
- `simulation-evaluator`: independent read-only evaluation of frozen
  cross-contour evidence and claim support.

Cascade is intentionally skill-first except where a repeated long-running
workflow or specialist review lane needs a durable role boundary. Architecture
review, functional acceptance, scenario checks, product testing, and issue
intake remain skills in the cascade rather than separate agents.
`business-analyst`, `security`, `designer`, `harness-evaluator`,
`simulation-operator`, and `simulation-evaluator` exist because long
discovery, specialist review, mutable campaign operation, independent evidence
judgment, and trace adjudication need role boundaries that are separate
from implementation.

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

### Workline And Work-Graph Execution

Worklines and work-graph nodes are declarative planning, ownership, dependency,
and evidence records. Creating, updating, actualizing, or marking one ready
does not create an agent, Codex task, worktree, branch, or external action.

Every executable lane or graph node declares an execution surface and dispatch
state:

- `root`: execute in the current Codex task;
- `internal-subagent`: execute in a bounded child agent inside the current task
  tree; it does not appear as a separate user-visible task;
- `user-visible-task`: create a separate Codex task only after the user
  explicitly asks to create, open, or fork separate tasks or threads.

Use `NOT_AUTHORIZED`, `AUTHORIZED`, `DISPATCHED`, `RUNNING`, `BLOCKED`, and
`COMPLETE` for dispatch state. Record the request or approval that authorized
delegation or task creation and record the runtime agent ID or task ID after
dispatch. Graph readiness and dependency gates establish eligibility only;
they are not authorization. If the declared surface is unavailable, report
`BLOCKED` instead of substituting another surface.

Agent-execution capacity is runtime-selected because this repository does not
set a project concurrency override. Capacity neither counts user-visible Codex
tasks nor causes automatic dispatch.

### Automatic Status Reconciliation

When the user asks to check, refresh, reconcile, or actualize a task, workline,
or work graph, inspect current implementation and required evidence,
not only its recorded status. If every required criterion, dependency, and
validation gate passes against the current source identity, immediately mark
the in-scope lane and dispatch state `COMPLETE`, set its next gate to `none`,
and synchronize the lane packet, active registry, graph, and completion
receipt. No second confirmation is required.

Do not close partial work, required checks that remain `NOT_RUN`, historical
artifacts, or implementation that exists only on another branch/source
identity. Record the exact missing gate instead. Automatic completion does not
authorize removing open or unresolved work. After terminal evidence is
preserved in the lane packet, durable report, graph, and receipt, remove the
completed active projection in the same closeout so `docs/work/active.md`
contains active work only.

### Scheduled Work Audit

Use the repository-owned, read-only audit before asking a scheduled task to
reason about active work:

```bash
npx --yes bun@1.3.3 scripts/cascade.ts work audit --json --check
```

The command reads `docs/work/active.md`, its matching lane packets, and active
work-graph reports. It reports ready, review-pending, dependency-pending,
blocked, closeout, and reconciliation candidates without changing their state.
`--check` fails only for structural errors such as a missing packet or status/
owner mismatch; projection wording drift remains visible as a warning.

Use `bun scripts/cascade.ts work automation-prompt --mode audit` to print the
durable prompt for a read-only Codex scheduled task. Use `--mode orchestrate`
only after the user explicitly authorizes recurring continuation of the current
task. That mode may execute one smallest already-authorized local slice per run;
it does not expand scope or permit new agents/tasks, worktrees, Git publication,
live/provider actions, destructive work, or self-acceptance of an independent
review gate.

Keep recurring work checks attached to one task so each run can compare prior
findings without creating a new retained task per run. Audit mode reports
material changes and requests explicit authorization before implementation,
reconciliation, review execution, or closeout. Orchestrate mode stops when no
eligible local slice exists or the next step needs new authority, an external
action, an unresolved dependency, or an independent evaluator.

Use `docs/work/work-graph-template.md` when several worklines, dependency gates,
merge owners, dispatch surfaces, or evidence joins require explicit
coordination. Work graphs use `DRAFT`, `PLANNED`, `ACTIVE`, `BLOCKED`,
`COMPLETE`, or `SUPERSEDED` lifecycle status. After terminal closeout, remove
their active projection and retain the durable report and receipts.

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
- `docs/product/`: product intent, domain/capability catalog, journeys,
  personas, requirements, and scenarios.
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
- `docs/product/catalog.yaml`
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

When one capability needs a reusable planning or prompt brief, keep product
facts in their owner docs, connect them through `docs/product/catalog.yaml`,
and author `docs/specs/<slice>/brief.yaml`. Validate or compile the
digest-bound projection with `scripts/cascade.ts brief`. Generated briefs are
context projections, not product authority; harness or synthetic evidence
retains its limited authority.

## Evidence And Context

Use `docs/patterns/workflow/index.md` for scoped coverage from current work-lane
criteria to changed code and validation. Use
`scripts/cascade.ts patterns` to compile selected pattern-pack text
from `docs/patterns/*/*.pack.yaml` when prompt context should include only
specific rules. Architecture work uses the matching graph/spec pairs in
`docs/patterns/architecture-defaults/`. Extract source-linked project claims
and applicable policies per application unit before `stack-selection`.
Application runtime and library choices route through `app-stack`
and one contour extension. Application resource needs route through the
matching backend, frontend, native, CLI, experiment, or library infrastructure
profile; each operated compute, data, messaging, delivery, secrets, or
observability resource then routes separately through `infrastructure` and
the resource extension that owns it. W-018-W-023 validated the first five
profiles; W-024 adds the library profile with a no-production-runtime default.
Validate the shared
machine-readable selection evidence with
`scripts/validate_stack_selection_evidence.py`. When
an explicitly adopted backend or frontend profile needs new source structure,
use `scripts/scaffold_architecture_default.py preview` before its no-overwrite
`write` command. At closeout, scan the final diff for
durable product, design, brand, spec, architecture, stack/runtime, or glossary
changes and append only thin sourced doc diffs to the existing owner docs.
Persist only reusable lessons, required handoff state, or required thin diffs;
avoid decorative documentation churn.

## Dynamic Actor Simulations

Ordinary simulation means one actor doing real work through a declared
interface until an observable outcome is achieved or a bounded terminal state
occurs. When the separately installed `cascade-simulations` plugin is
available, route this work to `cascade-simulations:simulate`.

The minimum contract is:

- an interface adapter with observations, allowed actions, permissions,
  confirmation, idempotency, recovery, errors, and cleanup;
- a persona source plus a run-specific actor contract;
- one domain-and-feature brief containing only relevant facts and constraints;
- an outcome contract expressed as observable completion and failure
  conditions; and
- finite step, tool-call, time, and recovery limits.

The adapter policy and run contract stay fixed. Only observations, beliefs,
uncertainty, progress, and strategy change during the run. The actor chooses
the next permitted action from current interface state; do not prescribe a
click checklist, bypass the interface, or infer success from actor narration.
A synthetic actor remains a hypothesis rather than product-persona evidence.

The admission microkernel distinguishes this bounded route from an explicit
campaign. Controlled comparison, populations, datasets, treatments,
calibration, release evidence, or independent evaluation select
`simulation-campaigns`; the word `simulation` alone does not. If the optional
plugin is unavailable, report that integration gap. A direct narrow
`functional-qa` check may satisfy a request for behavior proof, but must not be
misrepresented as an actor simulation or inflated into a campaign.

## Simulation Campaigns

This is optional evaluation infrastructure, not the ordinary dynamic-actor
route. Use `simulation-campaigns` when a request explicitly concerns a
versioned campaign across command, terminal, browser, desktop, mobile, or
agent-response contours. The skill owns campaign manifests, selection,
dispatch coordination, replay planning, receipt aggregation, claim projection,
and reporting.

After selection and authorization, `simulation-operator` uses
`simulation-execution` for the mutable runtime lifecycle. It produces the
immutable evidence package, cleanup result, and execution receipt but cannot
semantically judge the run. `simulation-evaluator` then uses
`simulation-evaluation` in a read-only sandbox to apply mechanical gates,
consume specialized oracle or harness-evaluator receipts, judge only declared
semantic claims, and return digestable evaluation-receipt content for the
campaign layer to store in a separate append-only sibling namespace—never
inside the finalized execution namespace. Campaign aggregation writes another
identity-matched projection receipt; no stage overwrites another.

The canonical runtime authorities are `product-evals/campaigns/`, `product-evals/tasks/`,
shared schemas under `product-evals/simulations/`, framework-only definitions under
`product-evals/simulations/harness/`, target-product definitions under
`product-evals/simulations/product/`, `product-evals/claims/`, `product-evals/policies/`, `product-evals/oracles/`,
`product-evals/metrics/`, `product-evals/treatments/`, `product-evals/calibrations/`,
`product-evals/rubrics/`, and ignored `.artifacts/product-evals/<run-id>/` evidence.
Every campaign binds a tracked `evaluation_profile_file`. Deterministic
fixture campaigns use `deterministic-fixture-v1`; semantic-evaluation
campaigns use the Sol-pinned `codex-independent-v1` profile and its versioned
rubric. The Codex provider evaluates a copied frozen packet in a separate
read-only `codex exec` context with plugins, apps, browser, Computer Use,
image generation, and code-mode host access disabled. It preserves the
request, input manifest, command, JSONL trace, stderr, attempt record, and
schema-v2 receipt under `evaluations/<evaluation-id>/`; the model output and
stored receipt both bind the frozen packet's manifest digest. A missing,
failed, stale, identity-mismatched, packet-mismatched, or mechanically unsafe
evaluation blocks the campaign before aggregation; there is no fixture
fallback for semantic evaluation.

Bootstrap a new collision-free target simulation with:

```bash
bun scripts/cascade.ts simulation init <simulation-id> --owner-lane W-NNN \
  --dry-run
bun scripts/cascade.ts simulation init <simulation-id> --owner-lane W-NNN
```

The initializer renders the tracked starter package, creates a co-located
product-scoped simulation design report under `product-evals/simulations/product/`,
validates the complete definition graph, and
regenerates the campaign catalog. It refuses every existing output path and
never treats its framework calibration as target-project release evidence.
Missing target adapters or real reference data remain `GAP` or `NOT_RUN`.

`harness-evals/` remains the separate Cascade skill/agent harness-evaluation
corpus. It grades routes and traces; it is not a simulation-definition root.

Use `functional-qa` for product-visible behavior examples and acceptance
oracles inside a campaign. Use `harness-evaluation` and `harness-evaluator`
for Cascade scenario, route, response, JSONL trace, deterministic-grade, and
independent judged-trace work; the general simulation evaluator consumes that receipt
without re-judging the trace. Use `codex-maintenance` when the shared campaign
schema, runner, validator, skill/agent wiring, tool guidance, or file-tree
contract must change.

Spawn or delegate the operator and evaluator only when the user authorizes
delegation. If an independent semantic evaluation cannot run in a separate
context, report that gate `BLOCKED` or `NOT_RUN`; do not label same-context
self-review independent.

## Harness Evaluation

Canonical harness scenarios and schemas live under `harness-evals/`. Generate
and check the 7-case-per-skill catalog with
`bun scripts/cascade.ts eval catalog --write` and `catalog --check`.
Live target runs are read-only and store raw JSONL, normalized traces,
eligibility, a source manifest, judgments, and reports under ignored
`.artifacts/harness-evals/`. Use the `harness-evaluator` role only after target
execution and eligibility; no live trace means no live scenario pass. Run
`bun scripts/cascade.ts eval judge --run-dir
.artifacts/harness-evals/<run-id>` for independent outcome and trajectory
judgments of every eligible case. Accepted coverage requires both.

Harness evaluation is not part of ordinary implementation validation. Use the
post-patch harness-impact decision proportionally:

- `NOT_APPLICABLE`: no actual evaluation implementation or assertion changed;
- `MECHANICAL_CHECK`: run catalog freshness and eval self-test only;
- `ASSERTION_REVIEW`: inspect the changed trigger, scenario, expectation, or
  role assertion, then run only affected live cases when mechanical evidence
  cannot decide it;
- `JUDGE_CONTRACT_REVIEW`: validate the changed judge contract and its bounded
  calibration/adversarial cases without rerunning unrelated targets.

Final validation output records the decision, changed harness paths, checks
run, assertion disposition, and focused live review as `PASS`, `FAIL`,
`BLOCKED`, `NOT_RUN`, or `NOT_APPLICABLE`. A hook instruction is advisory and
is not itself evaluation evidence.

## Campaign Execution

Typed reusable tasks live in `product-evals/tasks/`; versioned execution plans live in
`product-evals/campaigns/`. Run them through `bun scripts/cascade.ts campaign`.
Campaigns preserve task logs and source digests under `.artifacts/product-evals/`
but do not convert authored tasks into execution evidence. `browser` tasks use
Playwright; autonomous agent browsing remains a separate permissioned
browser-tool capability.
