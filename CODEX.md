# Cascade Runtime Bridge

This file is the compact runtime router between the repository boot contract,
repo-local host skills and roles, installed Cascade plugins, current source, and
validation tooling. Detailed reusable procedures belong in their owning skill,
plugin, pattern, or schema—not here.

## Workspace Identity

`harness.config.yaml` owns the current project's identity, architecture roots,
commands and context. `project.harness_profile: cascade-source` means the host
is developing Cascade itself; `target-project` (also the legacy default) means
Cascade is tooling for the named target. Plugin names never change that identity.
Onboarding preserves existing target instructions and uses target code as evidence.
Do not import source-checkout history, product facts or architecture defaults.
Load specialized architecture knowledge only when requested or already adopted
by this target; a generic agent/context task does not select a stateful profile.

## Load Order

1. `AGENTS.md`
2. This file
3. An explicitly assigned role contract and its skill map, before selecting a skill
4. The selected skill entrypoint; additional roles only when actually needed
5. The smallest current source and documentation set needed by the request
6. Existing active work only when the request names, resumes, or audits it

Current code outranks stale planning prose. Preserve unrelated dirty work and
never infer authority from a work record, plugin, prompt, or passing check.

The default admission hooks classify submitted requests and clear interrupted
state. Native Codex permissions and its sandbox govern command execution.
The standalone admission guard has no production trusted-host authority bridge;
do not register it for `PreToolUse` or `PermissionRequest` in this runtime.
Its synthetic guard tests do not establish a working native permission adapter.

For repository searches in any role or skill, use `rg --files <root>` to locate
files and `rg -n -e '<pattern>' <paths>` to search content. Start with the known
owner's paths; use `--hidden` for `.codex` assets and `-g` for filename filters.
Respect ignore rules; add `--no-ignore` only for an explicitly needed ignored
source, never for a whole cache or artifact inventory. Prefer exact file reads
when the path is known. If ripgrep is unavailable, use the available equivalent.

## Plugin-First Capability Routing

Plugins own portable methods, schemas, templates, and generic evaluation
contracts. The host owns current repository context, permissions, mutations,
durable paths, target commands, campaign state, and acceptance.

| Capability | Plugin route | Host owner |
|---|---|---|
| Prompt creation and prompt diagnosis | `cascade-prompt:prompt` | Requesting role |
| Semantic capability selection and cross-plugin artifact ordering | `cascade-coordinator:select-capabilities` then `cascade-coordinator:plan-workflow` when a graph is needed | Orchestrator |
| Software, plugin, and workflow architecture, patterns, and independent review | `cascade-software-architect:<skill>` | Software Engineer for software design; Code Reviewer for independent review; Agent Engineer for host integration |
| AI-agent topology, behavior, roles, skills, prompt briefs, persona requirements, and evaluation briefs | `cascade-ai-architect:<skill>` | Requesting role; Agent Engineer for host integration |
| Harness audit, maintenance, and asset integration | `cascade-coding-agent:<skill>` | Agent Engineer |
| Git pull, upstream synchronization, merge/rebase conflicts and preparing changes for push | `cascade-coding-agent:pull-and-integrate`; `cascade-software-architect:review-change` for applicable review | Active implementation owner; host executes authorized Git effects |
| Market research, selection, differentiation and experiments | `cascade-market:<skill>` | Orchestrator; Product Designer for scoped design research |
| Channel selection, growth strategy, cohort economics and product feedback | `cascade-market:plan-growth` | Orchestrator |
| Positioning, messaging, naming, tone, proof, and trust language | `cascade-market:brand-positioning` | Orchestrator; Product Designer within the design brief |
| Product value and offers, feature formation, lifecycle and outcome validation | `cascade-product:<skill>` | Orchestrator for lifecycle; Product Designer for scoped definition and validation |
| Canonical personas and compiled projections | `cascade-personas:<skill>` | Orchestrator; Product Designer for scoped authoring/compilation, independent review separately |
| UX, accessibility, visual, and design-system review | `cascade-design:<skill>` | Requesting role or Orchestrator |
| Design authoring and mockup handoff | `cascade-design:create-design`; host artifact persistence | Product Designer |
| Software implementation | Host context, planning, implementation and validation skills | Software Engineer; Orchestrator may apply locally |
| Independent code review | `cascade-software-architect:review-change` | Code Reviewer; separate context and fixed diff |
| Frontend implementation and approved-mockup repair | Host implementation cascade; Design skills for evidence | Frontend Engineer; role selection does not authorize delegation |
| Codebase, auth, and secure-design review | `cascade-security:<skill>` | Security or Agent Engineer |
| Bounded actor simulation and run review | `cascade-simulations:<skill>` | Requesting role |
| Approved simulation-campaign execution and evidence freeze | `cascade-simulations:execute-simulation-campaign` | Simulation Operator |
| Frozen simulation outcome or policy judgment | `cascade-evals:simulation-evaluation` | Simulation Evaluator |
| Cascade route, skill, agent, output, or JSONL-trace evaluation | `cascade-evals:harness-evaluation` | Ephemeral Cascade Evals judge using the harness subject profile |
| Prompt or adaptive-interview evaluation | `cascade-evals:prompt-evaluation` | Requesting role; independent judge identity declared by the frozen evaluation |
| AI-agent, role, skill, workflow, tool-loop, or architecture evaluation | `cascade-evals:agent-evaluation` | Requesting role; independent judge identity declared by the frozen evaluation |
| Generic evaluation design or judge-contract construction | `cascade-evals:evaluate` or `cascade-evals:build-judge` | Requesting role; Agent Engineer only for harness-owned judge contracts |
| Project planning, coordination, reconciliation, and closeout assessment | `cascade-project-management:<skill>` | Orchestrator across owners; Product Designer within its design workstream |
| Quality planning, test design, assessment, and defect triage | `cascade-qa:<skill>` | Requesting role |

Simulation Operator and Simulation Evaluator are optional source/lab roles.
Harness judgment is an optional Cascade Evals subject profile; no dedicated
harness-evaluator host role is registered. Existing campaign receipt principals
keep their compatibility identity. The core target bundle omits simulation lab
roles and corpora. Ordinary completion uses the existing closeout skill and
`cascade closeout check`; see its runtime contract for task/turn registration,
current evidence and the advisory Stop hook.

Resolve required namespaced skills from the enabled installed inventory. Missing
required dependencies are `BLOCKED`; do not restore copied local
implementations or search caches as a hidden fallback.
For this repository-owned marketplace, a resolved route
`cascade-<plugin>:<skill>` has the deterministic source path
`.codex/plugins/cascade-<plugin>/skills/<skill>/SKILL.md`, and a selected local
role has `.codex/agents/<role>/AGENT.md`. Use those exact paths without a broad
`.codex` inventory. Do not probe alternative skill files merely to record a
rejection after the primary route and owner are already supported.

For one explicit capability whose inputs and required dependencies are already
satisfied, load that exact skill directly. For an ambiguous or multi-domain
request, `cascade-coordinator:select-capabilities` emits the smallest
claim-bound selected set and explicit rejections. Use
`cascade-coordinator:plan-workflow` only when the validated selection needs more
than one node, a dependency, an artifact handoff, parallel branches, or a join.
Both are non-dispatching controllers; the active host role retains repository
access, execution, persistence, and acceptance.

For a requested or already authorized Git pull, upstream integration, or conflict
resolution, load `cascade-coding-agent:pull-and-integrate` before mutation, even
when Git predicts a clean merge. Interpret intent semantically, including
requests in other languages; do not use lexical trigger tables. This exact route
applies to target product repositories as well as the harness. Bind the user's
or repository's branch authority separately from commit chronology and report
all material adaptations after execution. Read-only comparisons and requests to
author the skill do not authorize running an integration. Push preparation also
selects this route. Unless an explicit base or repository policy overrides it,
integrate `develop` when present, otherwise the remote's verified primary branch.
Every run prepares and reports push readiness, including an already-current
base, while keeping the push destination separate and honoring push authority.
The Orchestrator's [Coordinator host bridge](.codex/agents/orchestrator/AGENT.md#coordinator-host-bridge)
owns serialized input preparation and deterministic selection/plan validation;
prose summaries of admission or selected routes do not satisfy those inputs.

Select methods for the decisions needed to complete the request, including
prerequisites to implementation. An implementation verb, one owner, or a bounded
slice does not resolve product behavior, architecture, design, security, or
evaluation decisions. Apply descriptor triggers and anti-triggers to that
specific work product, then follow `plan-change` for unresolved decisions.
Reuse current accepted inputs; schedule a producer only when its output is missing
or invalidated. Carry selected decisions and applicable references into the
implementation and its validation. A catalog or installation check alone does
not prove that a method was used.

For product and marketing UI, consume the shared default owned by
`cascade-design:design-system` at `references/outcome-ui-standard.md`.
Product supplies the useful outcome and behavior, Marketing the supported
promise, and Design the Hybrid default: informative minimal content and a
restrained liquid control layer, using its basic component foundation.
The target's explicit design direction governs its own scope; implementation
and rendered validation carry that binding through the host workflow.
For contextual choices, summaries and results, apply Design's shared
`references/generative-ui.md` practice in Product, Marketing, Design,
AI/Software Architect and implementation work. It guides UI composition from
existing frontend components and structured data. Its demo is optional; adopting
the practice creates no backend integration task or new agent role.

### Workspace MCP boundary

`cascade_workspace` is the single project-level MCP resource and artifact
adapter shared by all active plugin skills. It does not belong to a domain
plugin and does not make plugins call one another. The Codex host invokes its
tools while following the selected skill contract:

- `get_workspace_context` compiles explicit allowlisted files into one
  digest-bound, size-bounded untrusted-data bundle;
- `read_workspace_artifact` reads only a registered durable artifact kind;
- `prepare_workspace_artifact` validates destination, format, size, current
  digest, and an optional repository JSON Schema without writing;
- `persist_workspace_artifact` is a closeout-only atomic commit using the exact
  short-lived preparation token and optimistic current digest.

The destination authority is `.codex/artifact-destinations.json`. Plugin skills
produce candidate artifacts; they do not silently persist target state. The
active host verifies current user authority and validation, then `closeout`
may commit and require a read-back receipt. The service never grants authority,
dispatches a role, selects a capability, executes arbitrary commands, or turns
a Coordinator plan into automatic work. When the project MCP is unavailable,
the candidate and handoff remain usable through ordinary authorized host file
tools, preserving standalone plugin behavior.

## Model Routing

Use `gpt-6-astra` with `high` reasoning by default for the primary session,
custom agents, all Cascade plugin recommendations, and new evaluation builder,
target and independent judge invocations. The exact configured model and effort
in `.codex/config.toml`, agent TOML and versioned evaluation contracts govern
execution. This default was explicitly selected by the user after a bounded
judge pilot; it does not claim comparative qualification of every plugin.

Workflow nodes bind their owning plugin's catalog model and declared evaluation
effort. Loading a skill never switches the already running model. Preserve an
explicitly chosen target model, named comparison configuration, and the exact
settings and evidence of an existing frozen evaluation. Independent judges use
separate blind contexts even when they share the target's model family.

Keep plugin answers concise by default. Output fields are required information,
not a quota of headings or repeated prose. Preserve required schemas, evidence,
permissions and material gaps; include extra files only when needed for the
requested result or its actual handoff.

No retired 5.5 model belongs in active routing.

## Task Admission And Proportional Route

Run the cheap task-admission microkernel for every request. Its Task Envelope is
a proportional routing hint: it does not grant permission, create work,
dispatch an agent, or establish a pass. Correct an obvious lexical
misclassification in-process from the direct request and current repository
evidence.

Normal admission loads only the versioned policy, control catalog, and Task
Envelope schema. The 981-case admission corpus is source-checkout regression
data and must not be read, copied, or validated on every target request. The
core runtime exposes `admission validate`, but keeps `admission corpus`
source-only.

`UserPromptSubmit` atomically writes the full claim-bearing envelope to a
session-keyed file under ignored `.artifacts/task-admission/` and exposes only
its path, identity, request digest, and claim count in hook context. Coordinator
or a future read-only resource provider may consume that validated file; the
summary itself is never an envelope, authority binding, or durable evidence.
Exact non-semantic transcription markers and filler-only prompts are blocked
before model or tool work and do not produce an envelope. Standalone stop or
cancel controls are acknowledged as controls rather than admitted as new work.
`Interrupt` removes only the interrupted session's ephemeral envelope. These
hooks do not prevent the Codex host from allocating the active `turn_id` before
`UserPromptSubmit` runs.

The default non-atomic change route is:

`context -> plan-change -> implement-change -> validate-change`

A bounded read-only audit or review uses its owning method directly. Add a host
context or change-validation skill only for a separate recovery or validation
need that the selected method does not already cover.

Atomic mechanical edits may bypass planning. Add another stage only for its
actual trigger:

| Trigger | Route |
|---|---|
| Supplied source must be preserved or classified | `create-spec` |
| Essential target evidence is missing | `context` in Discovery mode, then the smallest namespaced plugin |
| Market evidence or experiments are needed | `cascade-market:research-market` or `cascade-market:design-market-experiments` |
| Supplied or validated evidence needs durable target persistence | `create-spec` |
| A durable fact has sibling documentation consumers | impact mapping inside `create-spec`, `plan-change`, or `implement-change` |
| A reusable pattern entry or context pack is needed | `pattern-context` |
| Work needs a roadmap, multiple horizons, or Agile MVP/version/iteration decomposition | `cascade-project-management:plan-project` |
| Independent owners, resumable handoffs, dependencies, evidence joins, or reconciliation exist | `cascade-project-management:manage-project` |
| Accepted behavior needs a quality plan or test design | `cascade-qa:plan-quality` or `cascade-qa:design-tests` |
| The exact namespaced route is ambiguous or the request spans plugin domains | `cascade-coordinator:select-capabilities` |
| A validated capability selection needs multiple nodes, ordering, parallelization, an artifact handoff, or a join | `cascade-coordinator:plan-workflow` |
| An authorized frozen QA plan needs target execution | `run-qa-plan` |
| Frozen evidence needs a quality recommendation | `cascade-qa:assess-quality` |
| Public, cross-boundary, security-sensitive, harness-semantic, large, or requested review | `cascade-software-architect:review-change` |
| Failure ownership is uncertain | `cascade-qa:triage-defects` |
| QA proves `TEST_DRIFT` and test files must change | `repair-tests` |
| Existing durable state or a reusable handoff must be finalized | `closeout` |
| Project completion or retention needs assessment | `cascade-project-management:close-project`, then `closeout` for authorized host effects |
| The requested output is a tracker-ready issue, story, task, enabler, or experiment | `cascade-project-management:define-work-item` |

A bounded one-owner task creates no spec, lane, work graph, report, receipt, or
archive entry by default.

## Role Contracts

Repo-local roles provide context, permission, and independence boundaries; they
do not duplicate plugin methods.

- `product-designer`: scoped product discovery, market/positioning evidence, persona
  preparation, prompts, design-work planning and bounded rehearsal through the
  selected plugins; owns mockups and frontend handoff. Portfolio/growth strategy,
  project-wide coordination, campaign execution and independent acceptance retain
  their existing owners. Load methods on demand, not the entire skill map.
- `software-engineer`: scoped target implementation and proportional verification.
- `frontend-engineer`: approved-design UI implementation and rendered fidelity evidence.
- `code-reviewer`: read-only diff review; separate context required for independence.
- `orchestrator`: proportional normal routing, host market/product adapters,
  implementation, and evidence.
- `agent-engineer`: Cascade maintenance, target onboarding through
  `cascade-coding-agent:adapt-harness`, reviewed agent-asset integration,
  tooling, observability, and eval wiring.
- `security`: read-only Security plugin selection with minimized sensitive
  evidence.
- `simulation-operator`: bounded mutable execution of one approved campaign
  run, evidence freezing, and cleanup.
- `simulation-evaluator`: independent read-only judgment of a frozen run.

The optional harness-evaluation CLI launches ephemeral read-only judges through
Cascade Evals and its `harness-evaluation/references/judge-profile.md`. The
legacy `harness-evaluator` receipt principal denotes the profile, not a host
role. Existing receipts, reservations and validation remain unchanged.

Use role contracts locally. Spawn or delegate only when the user explicitly
authorizes parallel agents. A separate user-visible task requires an explicit
request to create or fork one.

## Work State And Coordination

Start with one inline slice. Create durable state only when work must survive
tasks, cross owners, carry a real dependency, or join independently accepted
evidence.

For a request to check current work, run the read-only projection first:

```bash
npx --offline --yes bun@1.3.3 scripts/cascade.ts work audit --json --check
```

Read only the named lanes or graph needed to explain a collision, blocker,
handoff, or acceptance decision. Do not scan every report or revision.

Use `docs/work/active.md` as the current registry. Advanced Task Graph and
Coordination Graph states, joins, revisions, and partial repair live in
`docs/patterns/workflow/graph-shaped-work.md`. A graph is declarative and never
permission or automatic dispatch.

| Execution surface | Authority |
|---|---|
| `root` | Current scoped request |
| `internal-subagent` | Explicit delegation or parallel-agent authorization |
| `user-visible-task` | Explicit request to create, open, or fork a task |

A request to refresh a named active record permits a read-only audit and
in-scope local status synchronization. Mark it complete only when current
source, dependencies, criteria, and required validation pass. Historical,
partial, candidate-branch, blocked, or `NOT_RUN` evidence stays open.

Closeout may retire an accepted active projection. Archival is explicit and is
never an automatic closeout chain.

## Documentation And Context

Keep durable facts in the narrowest owner:

- product intent, requirements, journeys, scenarios, and metrics:
  `docs/product/`;
- interaction, accessibility, component, and visual rules: `docs/design/`;
- positioning, naming, tone, and content rules: `docs/brand/`;
- approved public or implementation contracts: `docs/specs/`;
- current resumable state: `docs/work/`;
- reusable workflow and architecture rules: `docs/patterns/`;
- vocabulary: `docs/glossary.md`.

Use `create-spec` only when durable source preservation or specification
persistence is warranted. Prefer links or generated projections over copied
prose, update only true consumers, and preserve dated reports as history. A
code-only refactor with no durable fact change needs no documentation map.

Create a durable spec only for an approved public contract, work that must
survive tasks, a true shared source across owners, or an explicit request.
Generated briefs are projections and never product authority.

## Personas And Simulations

Cascade Personas owns the canonical human model and compiled consumer-specific
projections. Cascade Simulations consumes a frozen simulation projection and
derives a bounded actor; it does not rewrite persona truth. Product, Market,
Cascade AI Architect, and Evals consume their own compiled projections.

Use `cascade-simulations:simulate` for one actor, interface, brief, outcome,
and bounded loop. Use `cascade-simulations:manage-simulation-campaign` only for
an explicitly versioned multi-case or multi-contour campaign, and
`cascade-simulations:execute-simulation-campaign` for its approved run.
Reviewing plugin source is Coding Agent maintenance, not campaign execution.

For campaigns, keep design/registration, mutable execution, frozen evidence,
independent evaluation, and aggregation separate. A campaign record grants no
external mutation authority. Mocked or local runs do not prove provider,
deployment, release, semantic, or pixel-parity behavior.

Useful deterministic checks:

```bash
bun scripts/cascade.ts campaign catalog --check
bun scripts/cascade.ts campaign self-test
```

## Evidence And Validation

Bind every claim to the current branch or revision, scenario, fixture, rubric,
model policy, and evidence as applicable. Report each required check as
`PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, or `NOT_APPLICABLE`.

Start with focused deterministic checks and widen only when the touched boundary
requires it. Preserve unaffected evidence; invalidate only consumers of a
changed source, fixture, rubric, model policy, or contract. Structural, local,
mocked, and historical evidence retain their narrower meaning.

Core repository checks:

```bash
bun scripts/cascade.ts validate
bun run test
```

The test command is a small runtime safety smoke suite, not exhaustive
module or campaign coverage. Select additional checks from
`harness.config.yaml` only when their source or public contract changed.
Plugin package tests and admission/evaluation/simulation corpora remain
separate, opt-in checks; they do not run for ordinary documentation changes.

## Harness Evaluation

Harness evaluation is conditional. Run catalog and self-test when harness eval
implementation, scenarios, expectations, or judge contracts change. Run a
focused live scenario only when mechanical evidence cannot decide a changed
semantic assertion.

Live harness traces, judgments, and coverage reports are disposable diagnostics
under ignored `.artifacts/harness-evals/`. They must not be promoted into
tracked work state or treated as product, simulation, provider, deployment,
release, or architecture evidence. Re-run the exact current source-bound case
when a semantic diagnostic is needed again.

Only an already registered simulation campaign with an explicit specialized
route/trace claim may retain its minimal digest-bound receipt inside the frozen
run package. That exception does not make the generic harness run durable or
prove target-product behavior.

```bash
bun scripts/cascade.ts eval catalog --check
bun scripts/cascade.ts eval audit
bun scripts/cascade.ts eval self-test
bun scripts/cascade.ts eval run --scenario HX-NNN --model-profile planning
bun scripts/cascade.ts eval evaluate --run-dir .artifacts/harness-evals/<run-id>
bun scripts/cascade.ts eval judge --run-dir .artifacts/harness-evals/<run-id>
```

Live targets run read-only. Accepted diagnostic coverage requires a current source-bound
scenario, complete trace, mechanical eligibility, and every configured
independent judgment. A semantic score cannot override a schema, permission,
mutation, or trace-integrity failure.

## Write Rules

Write only inside the request's authorized repository scope. Preserve unrelated
changes, use the configured target paths, and do not commit, push, deploy,
publish, create external resources, or widen permissions unless explicitly
requested. Secrets never belong in prompts, artifacts, reports, or command
output.

Finish with the outcome, changed files, exact evidence, residual risk, and any
next action. Ordinary completion needs no durable closeout artifact.
