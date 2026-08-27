# Cascade Runtime Bridge

This file is the compact runtime router between the repository boot contract,
repo-local host skills and roles, installed Cascade plugins, current source, and
validation tooling. Detailed reusable procedures belong in their owning skill,
plugin, pattern, or schema—not here.

## Load Order

1. `AGENTS.md`
2. This file
3. The selected skill entrypoint
4. A specialist role contract only when that role is used
5. The smallest current source and documentation set needed by the request
6. Existing active work only when the request names, resumes, or audits it

Current code outranks stale planning prose. Preserve unrelated dirty work and
never infer authority from a work record, plugin, prompt, or passing check.

## Plugin-First Capability Routing

Plugins own portable methods, schemas, templates, and generic evaluation
contracts. The host owns current repository context, permissions, mutations,
durable paths, target commands, campaign state, and acceptance.

| Capability | Plugin route | Host owner |
|---|---|---|
| Prompt creation and prompt diagnosis | `cascade-prompt:prompt` | Requesting role |
| Cross-plugin claim, policy, dependency, and artifact ordering | `cascade-software-architect:plan-workflow` | Orchestrator |
| Software, plugin, and workflow architecture, patterns, and independent review | `cascade-software-architect:<skill>` | Requesting role; Agent Engineer for host integration |
| AI-agent topology, behavior, roles, skills, prompt briefs, persona requirements, and evaluation briefs | `cascade-ai-architect:<skill>` | Requesting role; Agent Engineer for host integration |
| Harness audit, maintenance, and asset integration | `cascade-coding-agent:<skill>` | Agent Engineer |
| Market research, opportunity scoring, experiments | `cascade-market:<skill>` | Orchestrator |
| Positioning, messaging, naming, tone, proof, and trust language | `cascade-market:brand-positioning` | Orchestrator |
| Product definition, lifecycle, and validation | `cascade-product:<skill>` | Orchestrator |
| Canonical personas and compiled projections | `cascade-personas:<skill>` | Orchestrator |
| UX, accessibility, visual, and design-system review | `cascade-design:<skill>` | Requesting role or Orchestrator |
| Codebase, auth, and secure-design review | `cascade-security:<skill>` | Security or Agent Engineer |
| Bounded actor simulation and run review | `cascade-simulations:<skill>` | Requesting role |
| Approved simulation-campaign execution and evidence freeze | `cascade-simulations:execute-simulation-campaign` | Simulation Operator |
| Frozen simulation outcome or policy judgment | `cascade-evals:simulation-evaluation` | Simulation Evaluator |
| Cascade route, skill, agent, output, or JSONL-trace evaluation | `cascade-evals:harness-evaluation` | Harness Judge (`harness-evaluator`) |
| Prompt or adaptive-interview evaluation | `cascade-evals:prompt-evaluation` | Requesting role; independent judge identity declared by the frozen evaluation |
| AI-agent, role, skill, workflow, tool-loop, or architecture evaluation | `cascade-evals:agent-evaluation` | Requesting role; independent judge identity declared by the frozen evaluation |
| Generic evaluation design or judge-contract construction | `cascade-evals:evaluate` or `cascade-evals:build-judge` | Requesting role; Agent Engineer only for harness-owned judge contracts |
| Project planning, coordination, reconciliation, and closeout assessment | `cascade-project-management:<skill>` | Orchestrator |
| Quality planning, test design, assessment, and defect triage | `cascade-qa:<skill>` | Requesting role |

Resolve required namespaced skills from the enabled installed inventory. Missing
required dependencies are `BLOCKED`; do not restore copied local
implementations or search caches as a hidden fallback.
For this repository-owned marketplace, a resolved route
`cascade-<plugin>:<skill>` has the deterministic source path
`.codex/plugins/cascade-<plugin>/skills/<skill>/SKILL.md`, and a selected local
role has `.codex/agents/<role>/AGENT.md`. Use those exact paths without a broad
`.codex` inventory. Do not probe alternative skill files merely to record a
rejection after the primary route and owner are already supported.

## Model Routing

Use `gpt-5.6-sol` for planning, synthesis, security reasoning, architecture,
prompt construction, target execution, and independent evaluation. Prompt and
evaluation campaigns freeze `max` reasoning for builder, target, and judge
unless a versioned explicit comparison says otherwise.
The exact configured model and reasoning effort in `.codex/config.toml` and
agent TOML are the runtime authority; evaluation commands may explicitly pin a
different approved profile for a controlled experiment.

No retired 5.5 model belongs in active routing.

## Task Admission And Proportional Route

Run the cheap task-admission microkernel for every request. Its Task Envelope is
a proportional routing hint: it does not grant permission, create work,
dispatch an agent, or establish a pass. Correct an obvious lexical
misclassification in-process from the direct request and current repository
evidence.

The default non-atomic route is:

`context -> plan-change -> implement-change -> validate-change`

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
| Two or more plugin capabilities need semantic selection, exclusion, ordering, parallelization, or a join | `cascade-software-architect:plan-workflow` |
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

- `orchestrator`: proportional normal routing, host market/product adapters,
  implementation, and evidence.
- `agent-engineer`: Cascade maintenance, target onboarding through
  `cascade-coding-agent:adapt-harness`, reviewed agent-asset integration,
  tooling, observability, and eval wiring.
- `security`: read-only Security plugin selection with minimized sensitive
  evidence.
- `harness-evaluator`: human-facing Harness Judge for independent outcome and
  trajectory judgment after deterministic harness gates.
- `simulation-operator`: bounded mutable execution of one approved campaign
  run, evidence freezing, and cleanup.
- `simulation-evaluator`: independent read-only judgment of a frozen run.

The harness-evaluation CLI launches an ephemeral read-only Codex judge and
explicitly loads `.codex/agents/harness-evaluator/AGENT.md` plus
`cascade-evals:harness-evaluation`. The custom-agent TOML remains its host
adapter, while `harness-evaluator` remains the machine principal recorded in
handoffs, schemas, reservations, and receipts.

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
bun scripts/cascade.ts admission validate
bun scripts/cascade.ts admission corpus
bun scripts/cascade.ts target self-test
bun scripts/cascade.ts campaign catalog --check
bun scripts/cascade.ts campaign self-test
bun scripts/cascade.ts brief check
bun test --max-concurrency 4 scripts/cascade
```

## Harness Evaluation

Harness evaluation is conditional. Run catalog and self-test when harness eval
implementation, scenarios, expectations, or judge contracts change. Run a
focused live scenario only when mechanical evidence cannot decide a changed
semantic assertion.

```bash
bun scripts/cascade.ts eval catalog --check
bun scripts/cascade.ts eval audit
bun scripts/cascade.ts eval self-test
bun scripts/cascade.ts eval run --scenario HX-NNN --model-profile planning
bun scripts/cascade.ts eval evaluate --run-dir .artifacts/harness-evals/<run-id>
bun scripts/cascade.ts eval judge --run-dir .artifacts/harness-evals/<run-id>
```

Live targets run read-only. Accepted coverage requires a current source-bound
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
