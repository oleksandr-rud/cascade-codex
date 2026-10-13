# Plugin-First Cascade Architecture

Date: 2026-08-25; updated 2026-08-27
Decision state: repository source implemented; repository-owned package refresh
and installed-route validation complete.

## Decision

Cascade uses standalone plugins as the canonical owners of reusable AI-system
capabilities. Repository agents and skills are hosts: they discover current
sources, bind exact plugin skills, preserve permissions and dirty state, apply
authorized changes, execute real target adapters, persist repository artifacts,
and run repository validation.

A host adapter cannot copy a plugin workflow, schema, template, reducer, or
runtime actor as a fallback. An unavailable exact namespaced dependency returns
`BLOCKED`. Repository source, installed plugin/cache bytes, immutable execution
artifacts, and a released package are distinct states.

This is a harness/package-topology decision rather than a new target-agent
architecture packet. Cascade Architect contracts were used to separate
capabilities and topology; no synthetic target agent was invented.

## Capability Owners

| Plugin | Source version | Skills | Canonical capability |
|---|---:|---:|---|
| Cascade Prompt | `0.6.0+codex.20260826233510` | 1 | Prompt and context-plan construction, audit, conversion, and test design |
| Cascade Architect | `0.3.0+codex.20260826233510` | 15 | Plan Workflow; software and agent architecture; pattern selection; architecture and change review; topology, workflows, roles, skills, prompt briefs, evaluation packs, bounded improvement |
| Cascade Coding Agent | `0.2.0+codex.20260827091703` | 4 | Coding-agent harness onboarding, audit, maintenance, and reviewed workflow/asset integration |
| Cascade Personas | `0.1.20+codex.20260826233510` | 3 | Canonical human models, purpose-limited projections, and persona evaluation |
| Cascade Simulations | `0.2.4+codex.20260826233510` | 9 | Actors, persona consumption, briefs, outcomes, adapters, bounded runs, campaign planning/execution, and frozen-run review |
| Cascade Evals | `0.2.0+codex.20260826233510` | 6 | Generic evaluation lifecycle, Sol/max builders and targets, judges, response validation, deterministic reduction, calibration state, receipts, and subject adapters |
| Cascade Product | `0.1.24+codex.20260826233510` | 3 | Product lifecycle, product definition, and product validation |
| Cascade Market | `0.2.0+codex.20260827155001` | 4 | Market research, opportunity/PMF assessment, experiment design, positioning, messaging, naming, tone, and trust language |
| Cascade Design | `0.1.0+codex.20260827151509` | 4 | UX flow, accessibility, visual, and reusable design-system review |
| Cascade Security | `0.1.0+codex.20260827145322` | 3 | Codebase audit trajectories, authentication/session/tenant analysis, secure-design review, and filename-only stack inventory |
| Cascade Project Management | `0.1.0+codex.20260827101842` | 4 | Lean project planning, typed work-item definition, dependency-aware coordination, reconciliation, and evidence-preserving closeout proposals |
| Cascade QA | `0.1.0+codex.20260827143141` | 4 | Quality planning, test design, quality assessment, and defect/test-drift triage |

The exact callable aliases are the machine-owned
`.codex/config.toml` `[cascade.plugin_skills]` table. The validator verifies
that each alias resolves to a repository plugin source skill and that every
declared host adapter has the exact ordered dependency list in each consuming
agent's `skills.yaml`.

## Dependency Shape

```text
Cascade Prompt ------------------------------> prompt artifacts
Cascade Personas ----------------------------> canonical model + projections
Cascade Simulations <--- simulation projection ---> runtime actor + frozen run
Cascade Evals <---------- frozen evidence ----------> independent receipt

Cascade Architect
  -> Plan Workflow compiles claims, policies, typed dependencies, and artifact
     edges into a non-dispatching plugin DAG
  -> Prompt for authored prompts
  -> Personas for agent-architecture requirements
  -> Simulations for bounded dynamic execution
  -> Evals for generic judgment and reduction

Cascade Coding Agent
  -> Cascade Architect only for agent-system design
  -> Prompt only for prompt-specific repair
  -> Personas/Simulations only for a required human-model or dynamic run
  -> consumes a frozen Evals receipt only when repairing a confirmed harness defect

Cascade Evals
  -> is the sole reusable owner of harness evaluation, judge construction,
     independent judgment, deterministic reduction, coverage, and receipts

Market -> frozen market evidence and positioning -> Product
Market + Product + Personas -> approved positioning and message contracts
Market -> Prompt -> Evals for positioning-bound prompt qualification
Product/Market/Design -> Personas, Simulations, Prompt, or Evals only when the
specific task requires the dependency

Cascade Project Management
  -> consumes accepted Product, Market, Design, Engineering, and QA artifacts
  -> calls QA only when a quality plan or assessment is the current boundary
  -> returns plans, status, reconciliation, or closeout proposals to the host

Cascade QA
  -> consumes accepted requirements, journeys, risks, implementation evidence,
     and execution receipts
  -> returns quality plans, tests, gate recommendations, or defect dispositions
  -> never owns project priority, project status, execution, or release

Cascade Security
  -> Prompt only after Security specifies prompt controls
  -> Cascade Architect for agent-system topology gaps
  -> Cascade Coding Agent for reviewed repository integration
  -> Simulations only for an explicitly requested bounded abuse rehearsal
  -> Evals for independent semantic qualification
```

Cross-plugin dependencies are conditional. Market and Product use a terminal
frozen handoff rather than recursive calls, avoiding a runtime cycle. No plugin
depends back on Cascade Coding Agent.

## Personas And Synthetic Actors

`cascade-personas:build-persona` is the only canonical persona author.
`compile-persona` produces immutable, purpose-limited projections such as
`product`, `market`, `agent-architecture`, and `simulation`. A projection
preserves grounding, privacy, uncertainty, transfer policy, and source digest;
it is not population truth.

Cascade Architect consumes the `agent-architecture` projection only to derive
user-model requirements. It does not create a second persona. Cascade
Simulations validates the separate `simulation` projection, derives a runtime
actor policy, initializes mutable run state, applies state transitions, and
records the run journal. Runtime emotions, beliefs, goals, constraints, and
transitions are bounded by the supplied persona evidence or explicitly labeled
synthetic hypotheses; a run never mutates the canonical persona.

Product, Market, and Design may supply a frozen brief and outcome
to Simulations for rehearsal or validation. Synthetic behavior remains
simulation evidence, not real-user, market, clinical, demographic, or product
acceptance evidence. Cascade Evals independently judges an eligible frozen run
when a semantic claim is requested.

## Harness Boundary

The local harness retains:

- task admission, current repository source hierarchy, role selection, and
  target-specific instructions;
- exact paths, permissions, mutation authority, dirty-work protection,
  persistence, validation, and closeout;
- `harness-evals/` subject cases, assertions, runner integration, and release
  policy;
- `product-evals/` multi-case and multi-contour campaign manifests, real host
  adapters, frozen artifact lineage, policies, claims, oracles, and
  aggregation;
- implementation-slice planning, implementation, validation aggregation, and
  target execution workflows that are specific to a target repository;
  Architect and Security plugin routes bind current source directly without
  duplicate host method bodies;
- `create-spec` as the target persistence boundary for source intake, validated
  artifact rendering, and true-consumer documentation impact mapping;
- `pattern-context` as the repository-owned `docs/patterns/` storage,
  retrieval, and context-pack compilation boundary;
- thin `run-qa-plan`, `repair-tests`, and `closeout` effect adapters that
  execute accepted plugin artifacts without copying plugin methodology.

The local harness does not retain reusable market, design, security-review,
agent architecture, skill-design, Codex-maintenance methodology, persona
construction, compact actor execution, generic judge construction, generic
evaluation reduction, discovery method, simulation campaign method, or generic
specification composition method. Same-purpose local entries are thin
adapters. The Simulations plugin owns the portable campaign plan and execution
protocol; the host retains real adapter authority, persisted run state, and
immutable evidence infrastructure.

## Host Skill Disposition

| Disposition | Skills | Reason |
|---|---|---|
| Keep as lightweight host kernel | `context`, `plan-change`, `implement-change`, `validate-change` | They bind current repository state, authority, mutation, and proportional evidence rather than portable domain reasoning. `context` includes lean Discovery mode. |
| Keep as authorized host effects | `run-qa-plan`, `repair-tests`, `closeout` | They execute target adapters, mutate exact host state, or persist authorized closeout state. |
| Keep as host context/persistence | `create-spec`, `pattern-context` | `create-spec` combines source intake, validated artifact rendering, and documentation impact; `pattern-context` owns target pattern-pack storage and retrieval. |
| Removed in favor of direct plugin routes | `agentic-workflow-builder`, `architecture-review`, `auth-analysis`, `codebase-audit`, `review-change`, `secure-design` | Architect, Coding Agent, and Security now accept the target repository bindings directly; host agents retain permissions, source selection, and effect handoffs. |
| Moved to Project Management | `issue-intake` | `cascade-project-management:define-work-item` now owns typed bugs, issues, stories, tasks, enablers, and experiments; tracker filing remains an explicit target-host effect. |
| Remove in favor of direct plugin routes | `adapt-harness`, `agents-best-practices`, `brand-positioning`, `codex-maintenance`, `develop-skill`, `discover`, `docs-impact-map`, `harness-evaluation`, `judge-eval-builder`, `market-validation`, `ingest-spec`, `compose-spec`, `synthesis-to-spec`, `validation-experiments`, `simulation-campaigns`, `simulation-execution`, `simulation-evaluation` | Their portable method now resolves directly to Coding Agent, Architect, Market, Evals, Product, Personas, Simulations, or the consolidated host boundaries above. |

No remaining local skill is approved for blind relocation. A future move is
eligible only when the reusable method can be removed from the host without
losing current-path, permission, mutation, campaign-state, or persistence
authority.

## Agent Ownership Audit

Plugins and agents are not one-to-one objects. A plugin is a reusable callable
capability package; an agent is a host execution identity with model,
permissions, context visibility, mutation authority, and handoff constraints.
The repository currently has twelve plugin sources and seven host agents.

| Host agent | Plugin-owned methods it consumes | Host-only value | Disposition |
| --- | --- | --- | --- |
| `orchestrator` | Cascade Architect, Product, Market, Personas, Design, Project Management, QA | Admission, coordination, mutation, review, validation, repair, and closeout authority | Keep |
| `agent-engineer` | Cascade Architect, Coding Agent, Evals, Security, Simulations, Product, Personas, Market | Current-repository integration, target execution, validator ownership, and campaign infrastructure | Keep |
| `designer` | Design plus conditional Product, Personas, and Market | Sol read-only isolation, current target evidence selection, ordered review, and host handoff | Keep; its checklist contains no design or market method copy |
| `security` | Security plus conditional Product | Sol read-only isolation, sensitive-evidence minimization, current target binding, and validation/implementation handoff | Keep; its checklist contains no security method copy |
| `harness-evaluator` | Evals | Independent read-only harness-judge visibility and receipt identity; confirmed repairs hand off separately to Coding Agent | Keep |
| `simulation-operator` | Simulations and Product | Workspace-write execution identity, permissions, cleanup, and immutable evidence freeze | Keep |
| `simulation-evaluator` | Simulations and Evals | Independent read-only cross-contour policy, oracle, and claim judgment | Keep |

Project Onboarder and Business Analyst were removed after their final host
routes were reassigned: Agent Engineer calls
`cascade-coding-agent:adapt-harness`, while Orchestrator calls Market and
Product directly and uses `create-spec` only for target persistence.
Designer, Security, both evaluators, and Simulation Operator remain because
they enforce permission or evidence-independence boundaries.

## Defects Closed

- Removed copied Persona authoring and validation assets from Cascade Architect's
  `design-simulation-persona`; it now consumes only a frozen Persona
  projection.
- Replaced embedded raw-judge validation and score recomputation in Agent
  Architect improvement with digest-bound Cascade Evals receipts. Agent
  Architect now reduces only paired effects, budgets, lineage, and staging.
- Removed Cascade Architect's parallel judge-response schema.
- Moved reusable market, design, agent-best-practice, skill-development,
  Coding-Agent maintenance, judge-builder, discovery, synthesis, and related
  workflow bodies to plugins; removed their copied host resources and routers.
- Removed the nine direct Design and focused Market aliases after rewiring
  consumers to exact namespaced plugin skills.
- Extracted the three reusable Security methods, six templates/checklists, and
  filename-only scanner into Cascade Security. Replaced the local Security
  method bodies with three fail-closed host adapters and reduced the Security
  agent checklist to selection, redaction, and handoff only.
- Moved `plan-iterations`, `orchestrate-work`, `reconcile-work-graph`, and
  `archive-work` into Cascade Project Management, then removed the harness
  copies.
- Moved `functional-qa` and `test-autorepair` into Cascade QA, then removed the
  harness copies. The host retains only `run-qa-plan` and `repair-tests` as
  execution adapters; `closeout` is likewise an effect adapter.
- Separated PM from QA in routing: QA is a conditional gate owner and evidence
  producer, never the universal project hub. The registered host-skill count is
  now 9.
- Added exact alias, agent-delegate, and adapter-resource invariants to the
  Cascade validator.
- Added a retired-model guard: pre-5.6 model generations cannot enter active
  harness/plugin policy except explicit fail-closed guard tests or frozen
  historical reports.
- Renamed the cross-plugin controller to `Plan Workflow`, added typed
  capability descriptors for all 12 source plugins, and added a deterministic
  catalog and DAG validator that preserves Task Envelope authority and rejects
  self-dispatch.
- Merged portable brand positioning and Market Intelligence into Cascade
  Market; moved reusable software architecture, pattern selection,
  architecture review, and change review into Cascade Architect and removed
  the superseded host adapters.
- Renamed Cascade Harness Engineering to Cascade Coding Agent and merged the
  former Agent Architect package into Cascade Architect.
- Folded `discover` into `context` Discovery mode and merged `ingest-spec`,
  `compose-spec`, synthesis persistence, and `docs-impact-map` into
  `create-spec`; retained `pattern-context` only for target pattern-pack state.
- Removed host `harness-evaluation`, `judge-eval-builder`, and simulation
  campaign/evaluation routers. Evals and Simulations now own those methods;
  the harness keeps cases, real adapters, permissions, receipts, and effects.
- Removed the duplicate `cascade-coding-agent:evaluate-harness` route and its
  support files. `cascade-evals:harness-evaluation` is now the sole portable
  harness-evaluation adapter; Coding Agent begins only at confirmed source
  repair or reviewed asset integration.

## Installed State

Repository source contains all twelve plugins. The enabled inventory now
contains exactly twelve Cascade plugins, all from the repository-owned
`cascade-project` marketplace and all resolving to
`.codex/plugins/<plugin>`. There are no duplicate active Cascade installations.
All twelve packages were refreshed from the local marketplace, and every
active installed cache is byte-identical to its current repository source after
excluding generated `__pycache__` and `.pyc` files. Immutable older cache
directories are not active plugin authorities.

The source/install check does not silently upgrade Git state. All package
sources and manifests physically exist under `.codex/plugins/`, and no
non-generated plugin source or manifest is ignored. The dirty worktree records
tracked modifications and removals plus new plugin trees. The index already
contains 12 intermediate `cascade-harness-maintainer` to
`cascade-harness-engineering` rename records that are superseded by the current
working-tree `cascade-coding-agent` package; this pass did not alter staging.
Index reconciliation, commit, push, release, and publication remain separate
maintainer actions.

## Model And Evidence Policy

Cascade Evals defaults builder, target, and independent judge contexts to
`gpt-5.6-sol` with `max` reasoning. A versioned comparison may explicitly bind
another supported model or reasoning effort; every role and override must be
frozen in the bundle and receipt. `gpt-5.6-terra` remains the supported
balanced-production comparison profile. The retired predecessor appears in
active source only as an explicit forbidden-model guard and is absent from the
executable model matrix. A structural test, source audit, or synthetic fixture
is not a live semantic score.

## Alternatives Rejected

- One monolithic Cascade plugin: rejected because it creates broad triggers,
  release coupling, circular authority, and poor standalone reuse.
- Plugin plus copied local fallback: rejected because copies drift and can
  silently run when the required package is unavailable.
- Moving all campaign infrastructure into Simulations: rejected because real
  host adapters, permissions, claim policy, multi-run aggregation, and
  repository execution state are target-harness responsibilities.
- Implicitly refreshing installed plugins: rejected because repository source
  authorization does not grant package-state mutation authority.

## Validation Evidence

- Repository validator: `PASS` with 7 agents, 9 host skills, and zero
  project-specific leakage.
- Repository suite: `561/561` tests and 5,416 assertions pass across 23 files
  in an isolated run with the current digest-bound harness profile. A prior
  concurrent run that overlapped Sol/max evaluation produced three five-second
  timeouts and is retained as environment-contended evidence, not as a failure
  of the isolated suite.
- Admission: policy validation passes; `981/981` corpus cases pass with no
  under-control or over-control cases.
- Harness and simulation gates: 26 target self-tests, 31 harness-evaluation
  self-test cases, the 9-skill/134-scenario catalog, 17 campaign definitions,
  campaign self-test, both product briefs, and the active-work audit with zero
  reconciliation issues pass. The harness catalog digest is
  `da9be83e249654aa94001c58e5b4ff418cb98e99a1ddfecda0be2b3b03b15eb4`,
  the harness source digest is
  `c0bdb9a4e7dd311fe29e5eab4f66ca05a300b9e449fe77a3e6f483100790921a`,
  and the campaign catalog digest is
  `289f8e4dc2d28d115ccefa52363473fe7e337013b257f3c0d00c73c461a894ed`.
- Plugin topology: the generated catalog contains 12 packages and 60/60 unique
  namespaced routes. All 7 required and 79 optional dependency links resolve;
  its exact-current digest is
  `f1bde5842798916cc0fe8db284e3e8f7946bb8c32f28319461357017c8f080b4`.
  The host contains 7 agents and 9 skills. No host skill shares an unqualified
  name with a plugin skill, and no removed portable method remains as a host
  fallback.
- Plan Workflow prompt qualification used Sol/max for the target and judge. The
  promoted r3 run is mechanically exact, `ACCEPTED`, and scores 1.00 outcome,
  1.00 trajectory, and 1.00 conservative effectiveness with the overall budget
  gate passing. Its generated prompt digest is
  `975c63d817e5476f45760ec0124b6ccf1bfc30772b8891c5cbefd72435e4a309`.
  The builder response was supplied explicitly, so builder execution tokens are
  `NOT_MEASURED`; they are not inferred. Diagnostic r1 and r2 scores were 0.825
  and 0.95 and remain preserved.
- Focused harness canaries are exact-current and independently judged with
  Sol/max. HX-055 r3 passes deterministic eligibility and scores 100 outcome /
  100 trajectory for plugin-first Evals routing. HX-057 r4 passes deterministic
  eligibility and scores 96.25 outcome / 100 trajectory for plugin-first
  simulation execution routing. Each used two focused source-read commands.
  Coverage is exactly 2 accepted scenarios out of 134; the remaining 132 are
  not promoted or described as broad harness effectiveness.
- Plugin component evidence: package Python suites pass with 402 cases under
  the offline dependency environment; all 12 generic plugin validators, all 7
  package-specific structural checkers, all 3 RFC 8785 Node canonicalization
  tests, and the Prompt fixture validator pass. The Prompt fixture inventory is
  14 tasks, 12 interview cases, 4 tiers, 7 configurations, and 3 judges. All
  twelve repository plugin manifests are Git-trackable, and no non-generated
  plugin source is ignored.

Seven installed source revisions have exact-current live semantic
qualification with `gpt-5.6-sol` and `max` reasoning for the builder, target,
and two independent judges. Mechanical checks remain authoritative and all
accepted conservative scores meet the 0.95 threshold:

| Plugin and exact installed version | Mechanical | Outcome | Trajectory | Conservative | Receipt |
|---|---:|---:|---:|---:|---|
| Cascade Personas `0.1.20+codex.20260826233510` | PASS | 1.00 | 1.00 | 1.00 | `.artifacts/plugin-evals/current-cascade-personas-sol-max-20260827-r1/controller/evaluation-receipt.json` |
| Cascade Project Management `0.1.0+codex.20260827101842` | PASS | 1.00 | 0.95 | 0.95 | `.artifacts/plugin-evals/current-cascade-project-management-sol-max-20260827-r7/controller/evaluation-receipt.json` |
| Cascade Product `0.1.24+codex.20260826233510` | PASS | 0.95 | 1.00 | 0.95 | `.artifacts/plugin-evals/current-cascade-product-sol-max-20260827-r1/controller/evaluation-receipt.json` |
| Cascade Market `0.2.0+codex.20260827155001` | PASS | 0.96 | 0.96 | 0.96 | `.artifacts/plugin-evals/current-cascade-market-sol-max-20260827-r14/controller/evaluation-receipt.json` |
| Cascade QA `0.1.0+codex.20260827143141` | PASS | 1.00 | 1.00 | 1.00 | `.artifacts/plugin-evals/current-cascade-qa-sol-max-20260827-r4/controller/evaluation-receipt.json` |
| Cascade Security `0.1.0+codex.20260827145322` | PASS | 1.00 | 1.00 | 1.00 | `.artifacts/plugin-evals/current-cascade-security-sol-max-20260827-r4/controller/evaluation-receipt.json` |
| Cascade Design `0.1.0+codex.20260827151509` | PASS | 1.00 | 1.00 | 1.00 | `.artifacts/plugin-evals/current-cascade-design-sol-max-20260827-r4/controller/evaluation-receipt.json` |

Diagnostic iterations are retained but not promoted: QA first exposed an
ambiguous repair-owner contract and unresolved-risk-reference defect, then its
exact-current r2 and r3 attempts exposed undigested-test and qualified-source-
identity gaps before r4 passed. Design r1 and exact-current r3 each scored
0.9375; the iterations exposed status alignment, brand-source disposition,
and missing automated-source disposition before r4 passed. Market r4 scored
0.90; r5 was mechanically invalid; r6 had an
invalid builder response; r7 was environment-invalid; r8 scored 0.88 outcome /
0.96 trajectory; r9 lost transport; r10 failed the READY-status gate; and r11
exposed a contradiction-identity defect before judging. Repairs bound exact
instrument and event-schema bytes, corrected blocked-handoff identity, split
design readiness from execution authority, and made missing source locators
nullable while retaining distinct source identity. After dependency refresh,
r13 again exposed an external-action/design-readiness status defect before
judging; r14 is the promoted exact-current result at 0.96. No diagnostic
receipt or rejected attempt was rewritten.

Five installed packages do not have a promoted generic root-plugin subject
adapter, so a comparable current-version percentage is `NOT_RUN` rather than
inferred from component tests: Cascade Architect, Cascade Coding Agent,
Cascade Prompt, Cascade Simulations, and Cascade Evals. Prompt has the focused
qualification above; Simulations and harness routing have focused canary
evidence; Architect and Coding Agent design or integrate subject systems; and
Evals cannot independently qualify itself with its own judge context. Those
boundaries are intentional, not silent passes. Full 134-scenario live coverage,
human judge calibration, index reconciliation, commit, push, deployment, release, and
publication remain `NOT_RUN` or `NOT_REQUESTED`.

## Closeout Disposition

| Durable fact | Source | Owner target | Disposition |
|---|---|---|---|
| Reusable capabilities are plugin-owned; repository skills are hosts and fail-closed adapters. | User request and validated source diff | `.codex/README.md`, `CODEX.md`, `harness.config.yaml`, `docs/structure.md`, this report | Recorded and validated |
| Persona projections, runtime actors, host campaigns, and independent evaluation have distinct authority. | Plugin contracts and simulation tests | This report and runtime bridge | Recorded and validated |
| The prior W-007 Cascade-profile r4 consumed a superseded harness/profile/catalog identity. | Current-source closeout scan | `docs/work/lanes/W-007-agent-response-task-assessment-refactor.md` and `docs/work/active.md` | Preserved as historical; fresh canary required |

No managed lane or Coordination Graph was created for this change. Existing
evaluation receipts remain under ignored `.artifacts/`; local package
installation and duplicate-install removal were performed. Git staging,
index reconciliation, commit, push, deployment, release, and publication are
`NOT_RUN` or `NOT_REQUESTED`; exact-current semantic qualification is complete
only for the seven packages named in the table above.
