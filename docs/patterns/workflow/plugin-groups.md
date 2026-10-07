# Cascade packages, methods and host roles

Current source catalog snapshot: 2026-10-06. The marketplace has **9 packages,
65 portable methods**. Public route identities and exact entrypoints come from
`.codex/plugin-capabilities.generated.json`; this guide explains their purpose.
Use `bun scripts/cascade.ts workflow groups` for a current machine projection.

## What activates what

Every request applies `admit -> select -> prepare -> act -> observe -> verify
-> complete or recover` at proportional depth. The local
[run-workflow skill](../../../.codex/skills/run-workflow/SKILL.md) binds ambiguous
requests and connected artifact handoffs to the shared CLI. One sufficient
method stays direct; the cycle does not require every plugin.

The user's requested outcome and current evidence trigger a method through LLM
interpretation of its descriptor, including anti-triggers and missing inputs.
These descriptions are not keyword rules. One sufficient explicit route loads
directly; ambiguous/cross-domain work uses `select-capabilities`, then
`plan-workflow` only when dependency ordering or handoffs are needed. Code
validates structured selections, identities, source digests and authority.

A plugin packages methods/resources; it is not an autonomous agent, scheduler,
mandatory phase or new thread. A SKILL.md is the method contract; references,
schemas, assets and scripts support it. The host applies the method and runs
tools. Candidate outputs do not authorize execution, acceptance or persistence.

## Package ownership

| Public package | Methods | Responsibility |
|---|---:|---|
| cascade-prompt | 1 | Prompt, context and typed decision-question authoring. |
| cascade-simulations | 9 | Goal-directed actor execution and bounded simulation campaigns with frozen evidence. |
| cascade-quality | 10 | QA planning, tests, assessment and triage; independent Evals and judge contracts. |
| cascade-ai-architect | 11 | Agent capabilities, roles, skill briefs, behavior workflows, LangGraph binding and bounded RSI. |
| cascade-engineering | 9 | Software architecture and coding-agent harness integration; target execution stays with the host. |
| cascade-discovery | 11 | Market, Product and Personas: current evidence, opportunities, human models, value and learning. |
| cascade-design | 5 | Concrete UI/interaction design and UX, accessibility and visual review. |
| cascade-security | 3 | Trust boundaries, threat/abuse review and source-grounded security audits. |
| cascade-workflows | 6 | Semantic capability selection, artifact ordering and project/work-item coordination. |

The former Market/Product/Personas packages are Discovery components;
Software Architect/Coding Agent are Engineering; Coordinator/Project Management
are Workflows; QA/Evals are Quality. Prompt, AI Architect, Design, Security and
Simulations remain focused packages. Component manifests/evaluation subjects
retain their own identity/version; only the nine root manifests are installed.

Grouped source layout is `skills/<component>/skills/<method>/SKILL.md` under the
public package. Standalone layout is `skills/<method>/SKILL.md`. Method resource
paths remain relative to that canonical file. The catalog's component also
keeps Evals reasoning policy distinct from QA inside the shared Quality package.

## Every portable method

The final authority is each linked SKILL.md and its current descriptor. Input
types, optional prerequisites, outputs, anti-triggers and effect/authority
ceilings remain in the catalog; installation alone never requires a method.

### cascade-prompt

| Method | Purpose / entry condition |
|---|---|
| [cascade-prompt:prompt](../../../.codex/plugins/cascade-prompt/skills/prompt/SKILL.md) | Create, refine, diagnose, compare, convert, or test prompts, context plans, and Laya/Jev/Intern-Decision/Imajev typed questions with model-specific evidence and result semantics. |

### cascade-simulations

| Method | Purpose / entry condition |
|---|---|
| [cascade-simulations:manage-simulation-campaign](../../../.codex/plugins/cascade-simulations/skills/manage-simulation-campaign/SKILL.md) | Design, version, register, govern, and aggregate a multi-case or multi-contour simulation campaign without executing targets. |
| [cascade-simulations:run-simulation-campaign](../../../.codex/plugins/cascade-simulations/skills/run-simulation-campaign/SKILL.md) | Preflight and execute one approved campaign through host-authorized adapters, freeze immutable evidence, clean up, and emit an execution receipt. |
| [cascade-simulations:simulate](../../../.codex/plugins/cascade-simulations/skills/simulate/SKILL.md) | Prepare or run one bounded goal-directed actor simulation through a declared interface and observable outcome contract. |
| [cascade-simulations:simulation-actor](../../../.codex/plugins/cascade-simulations/skills/simulation-actor/SKILL.md) | Derive an executable simulation actor from grounded persona evidence, a supplied role, or an explicit synthetic hypothesis. |
| [cascade-simulations:simulation-persona](../../../.codex/plugins/cascade-simulations/skills/simulation-persona/SKILL.md) | Validate and consume a frozen Persona simulation projection as the immutable runtime persona contract. |
| [cascade-simulations:simulation-brief](../../../.codex/plugins/cascade-simulations/skills/simulation-brief/SKILL.md) | Compile a grounded domain and feature brief for an actor without prescribing a click-by-click script. |
| [cascade-simulations:simulation-outcome](../../../.codex/plugins/cascade-simulations/skills/simulation-outcome/SKILL.md) | Define observable success, evidence, failure, and prohibited-shortcut conditions for a simulation. |
| [cascade-simulations:simulation-adapter](../../../.codex/plugins/cascade-simulations/skills/simulation-adapter/SKILL.md) | Define or audit an action-level interface adapter with permissions, confirmations, idempotency, errors, recovery, and cleanup. |
| [cascade-simulations:simulation-review](../../../.codex/plugins/cascade-simulations/skills/simulation-review/SKILL.md) | Review one frozen dynamic simulation run against its actor, interface, brief, outcome, permissions, and limits. |

### cascade-quality

| Method | Purpose / entry condition |
|---|---|
| [cascade-quality:plan-quality](../../../.codex/plugins/cascade-quality/skills/qa/skills/plan-quality/SKILL.md) | Build a risk-based quality plan with evidence classes, contours, gates, and execution ownership from accepted behavior. |
| [cascade-quality:design-tests](../../../.codex/plugins/cascade-quality/skills/qa/skills/design-tests/SKILL.md) | Design traceable test cases, data, oracles, and execution requests from accepted behavior and quality scope. |
| [cascade-quality:assess-quality](../../../.codex/plugins/cascade-quality/skills/qa/skills/assess-quality/SKILL.md) | Assess frozen evidence against a fixed quality plan and acceptance gate without executing missing checks or approving release. |
| [cascade-quality:triage-defects](../../../.codex/plugins/cascade-quality/skills/qa/skills/triage-defects/SKILL.md) | Classify observed failures as product defect, test drift, environment failure, flake, or ambiguity from current boundary evidence. |
| [cascade-quality:evaluate](../../../.codex/plugins/cascade-quality/skills/evals/skills/evaluate/SKILL.md) | Design, validate, reduce, or audit a versioned evaluation with mechanical gates and independent semantic judges. |
| [cascade-quality:build-judge](../../../.codex/plugins/cascade-quality/skills/evals/skills/build-judge/SKILL.md) | Build or audit semantic judge profiles, anchored rubrics, schemas, labeled cases, and aggregation rules. |
| [cascade-quality:prompt-evaluation](../../../.codex/plugins/cascade-quality/skills/evals/skills/prompt-evaluation/SKILL.md) | Run controlled prompt and interview evaluations, and design native typed-decision evaluations with versioned evidence, model-specific adapters, repetitions, and independent judgments. |
| [cascade-quality:agent-evaluation](../../../.codex/plugins/cascade-quality/skills/evals/skills/agent-evaluation/SKILL.md) | Adapt the generic evaluation lifecycle to an agent, role, skill, workflow, tool loop, or architecture packet. |
| [cascade-quality:simulation-evaluation](../../../.codex/plugins/cascade-quality/skills/evals/skills/simulation-evaluation/SKILL.md) | Independently evaluate semantic outcome, policy support, or claim support for one frozen simulation run. |
| [cascade-quality:harness-evaluation](../../../.codex/plugins/cascade-quality/skills/evals/skills/harness-evaluation/SKILL.md) | Adapt evaluation to bounded, disposable diagnostics of coding-agent harness skills, routes, roles, outputs, and execution traces. |

### cascade-ai-architect

| Method | Purpose / entry condition |
|---|---|
| [cascade-ai-architect:architect-ai-system](../../../.codex/plugins/cascade-ai-architect/skills/architect-ai-system/SKILL.md) | Compile an end-to-end source-grounded AI agent or agentic-system architecture packet. |
| [cascade-ai-architect:map-agent-capabilities](../../../.codex/plugins/cascade-ai-architect/skills/map-agent-capabilities/SKILL.md) | Extract and cluster atomic source-grounded capabilities for an AI agent or agentic system. |
| [cascade-ai-architect:design-agent-blueprint](../../../.codex/plugins/cascade-ai-architect/skills/design-agent-blueprint/SKILL.md) | Design a bounded agent blueprint with outcome closure, semantic Analyzer findings, optional task plans, claims, memory, authorized actions, recovery and the smallest justified topology. |
| [cascade-ai-architect:design-agent-workflow](../../../.codex/plugins/cascade-ai-architect/skills/design-agent-workflow/SKILL.md) | Design a framework-neutral typed agent behavior flow with deterministic routes, bounded loops, recovery, budgets, and stop rules. |
| [cascade-ai-architect:bind-agent-runtime](../../../.codex/plugins/cascade-ai-architect/skills/bind-agent-runtime/SKILL.md) | Bind the accepted workflow to the smallest actual target runtime, using direct calls by default and a graph only when its state, branches or recovery requirements justify one. |
| [cascade-ai-architect:build-agent-roles](../../../.codex/plugins/cascade-ai-architect/skills/build-agent-roles/SKILL.md) | Generate exclusive reviewable role contracts from a selected AI-agent topology and workflow. |
| [cascade-ai-architect:build-agent-skills](../../../.codex/plugins/cascade-ai-architect/skills/build-agent-skills/SKILL.md) | Design focused triggerable skill briefs from coherent AI-agent capability clusters without creating a second skill-packaging authority. |
| [cascade-ai-architect:prepare-agent-prompt](../../../.codex/plugins/cascade-ai-architect/skills/prepare-agent-prompt/SKILL.md) | Compile one architecture-bound prompt brief and provenance binding for Cascade Prompt without authoring or grading the prompt. |
| [cascade-ai-architect:derive-persona-requirements](../../../.codex/plugins/cascade-ai-architect/skills/derive-persona-requirements/SKILL.md) | Translate a frozen Persona agent-architecture projection into evidence-bound user-model requirements for an AI-system blueprint. |
| [cascade-ai-architect:prepare-agent-evaluation](../../../.codex/plugins/cascade-ai-architect/skills/prepare-agent-evaluation/SKILL.md) | Compile architecture-specific cases, eligibility assertions, profiles, rubrics, and budgets into an agent-evaluation request. |
| [cascade-ai-architect:run-improvement-cycle](../../../.codex/plugins/cascade-ai-architect/skills/run-improvement-cycle/SKILL.md) | Run a bounded offline evidence-driven improvement experiment from frozen AI-agent evaluation receipts. |

### cascade-engineering

| Method | Purpose / entry condition |
|---|---|
| [cascade-engineering:architect-software-system](../../../.codex/plugins/cascade-engineering/skills/software-architect/skills/architect-software-system/SKILL.md) | Design source-grounded architecture before implementing a new application with unresolved boundaries; derive cohesive business modules from scenarios and invariants with explicit state owners. |
| [cascade-engineering:select-architecture-patterns](../../../.codex/plugins/cascade-engineering/skills/software-architect/skills/select-architecture-patterns/SKILL.md) | Disposition and compose compatible architecture patterns from a versioned host-supplied catalog. |
| [cascade-engineering:review-architecture](../../../.codex/plugins/cascade-engineering/skills/software-architect/skills/review-architecture/SKILL.md) | Independently review software, plugin, workflow, or AI architecture for ownership, boundary, dependency, and evidence defects. |
| [cascade-engineering:review-change](../../../.codex/plugins/cascade-engineering/skills/software-architect/skills/review-change/SKILL.md) | Independently review a current diff against its request, architecture, public contracts, consumers, and regression surface. |
| [cascade-engineering:pull-and-integrate](../../../.codex/plugins/cascade-engineering/skills/coding-agent/skills/pull-and-integrate/SKILL.md) | Integrate develop or the actual primary branch when develop is absent; resolve Git conflicts by branch authority rather than chronology and prepare reviewed changes for push with explicit readiness. |
| [cascade-engineering:audit-harness](../../../.codex/plugins/cascade-engineering/skills/coding-agent/skills/audit-harness/SKILL.md) | Audit a coding-agent harness for routing, ownership, dependency, permission, model, evidence, and installation defects. |
| [cascade-engineering:adapt-harness](../../../.codex/plugins/cascade-engineering/skills/coding-agent/skills/adapt-harness/SKILL.md) | Adapt a coding-agent harness to a target repository from current inventory, protected paths, commands, and installation state. |
| [cascade-engineering:maintain-harness](../../../.codex/plugins/cascade-engineering/skills/coding-agent/skills/maintain-harness/SKILL.md) | Implement a scoped authorized change to an existing coding-agent harness while preserving source ownership and validation. |
| [cascade-engineering:integrate-agent-assets](../../../.codex/plugins/cascade-engineering/skills/coding-agent/skills/integrate-agent-assets/SKILL.md) | Map reviewed architecture, skill, role, workflow, prompt, or evaluation candidates into target-owned harness surfaces with explicit authority, execution-surface, write-scope, validation, and handoff bindings. |

### cascade-discovery

| Method | Purpose / entry condition |
|---|---|
| [cascade-discovery:research-market](../../../.codex/plugins/cascade-discovery/skills/market/skills/research-market/SKILL.md) | Discover or refresh markets, competitors and alternative workflows using current evidence of jobs, demand, pricing, buying behavior and entrant reachability. |
| [cascade-discovery:evaluate-market-opportunity](../../../.codex/plugins/cascade-discovery/skills/market/skills/evaluate-market-opportunity/SKILL.md) | Compare markets and entrant opportunities, stress-test differentiation and PMF hypotheses against a frozen evidence ledger. |
| [cascade-discovery:design-market-experiments](../../../.codex/plugins/cascade-discovery/skills/market/skills/design-market-experiments/SKILL.md) | Design or audit real-world market experiments for demand, pricing, channel, positioning, retention, or buying behavior. |
| [cascade-discovery:brand-positioning](../../../.codex/plugins/cascade-discovery/skills/market/skills/brand-positioning/SKILL.md) | Create or audit positioning, messaging, naming, tone, proof language, trust language, and marketing direction from accepted evidence. |
| [cascade-discovery:plan-growth](../../../.codex/plugins/cascade-discovery/skills/market/skills/plan-growth/SKILL.md) | Choose channels and plan growth from acquisition through product value, payment, completion or retention, cohort economics and product feedback. |
| [cascade-discovery:manage-product-lifecycle](../../../.codex/plugins/cascade-discovery/skills/product/skills/manage-product-lifecycle/SKILL.md) | Manage value strategy, portfolio allocation, product priorities, owner-held gates and evidence-driven re-entry without implementation. |
| [cascade-discovery:define-product](../../../.codex/plugins/cascade-discovery/skills/product/skills/define-product/SKILL.md) | Turn supplied problems, opportunities and learning into value or offer models, idea and feature candidates, traceable requirements, acceptance behavior and the MVP. |
| [cascade-discovery:validate-product](../../../.codex/plugins/cascade-discovery/skills/product/skills/validate-product/SKILL.md) | Design or assess product validation, outcome measures, sustained progress, transfer and causal evidence alongside functional and independent evaluation. |
| [cascade-discovery:build-persona](../../../.codex/plugins/cascade-discovery/skills/personas/skills/build-persona/SKILL.md) | Create or revise a canonical source-grounded Persona with provenance, stable traits, dynamic state, uncertainty, and privacy controls. |
| [cascade-discovery:compile-persona](../../../.codex/plugins/cascade-discovery/skills/personas/skills/compile-persona/SKILL.md) | Compile a frozen canonical Persona into a digest-bound purpose-limited consumer projection. |
| [cascade-discovery:evaluate-persona](../../../.codex/plugins/cascade-discovery/skills/personas/skills/evaluate-persona/SKILL.md) | Independently audit a frozen Persona or projection for grounding, coherence, privacy, bias risk, and consumer compatibility. |

### cascade-design

| Method | Purpose / entry condition |
|---|---|
| [cascade-design:ux-flow-review](../../../.codex/plugins/cascade-design/skills/ux-flow-review/SKILL.md) | Review product journeys, onboarding burden, useful outcomes, completion, recovery and observable UX states within supplied product intent. |
| [cascade-design:design-system](../../../.codex/plugins/cascade-design/skills/design-system/SKILL.md) | Define or audit the Hybrid outcome UI default, basic components, shared generative UI practice, tokens, states, responsive behavior, motion, accessibility, and content constraints. |
| [cascade-design:accessibility-review](../../../.codex/plugins/cascade-design/skills/accessibility-review/SKILL.md) | Review UI semantics, names, keyboard and focus behavior, contrast, targets, forms, status messages, motion, and narrow viewports. |
| [cascade-design:visual-qa](../../../.codex/plugins/cascade-design/skills/visual-qa/SKILL.md) | Validate visual evidence across viewports and states for layout, hierarchy, overflow, spacing, tokens, responsiveness, and brand fit. |
| [cascade-design:create-design](../../../.codex/plugins/cascade-design/skills/create-design/SKILL.md) | Create editable product and marketing mockups, inspected previews and a version-bound frontend handoff from grounded requirements. |

### cascade-security

| Method | Purpose / entry condition |
|---|---|
| [cascade-security:codebase-audit](../../../.codex/plugins/cascade-security/skills/codebase-audit/SKILL.md) | Audit a target codebase through evidence-bound security trajectories and a current surface inventory without patching runtime code. |
| [cascade-security:auth-analysis](../../../.codex/plugins/cascade-security/skills/auth-analysis/SKILL.md) | Audit authentication, sessions, revocation, RBAC, tenant isolation, and client-server authorization contracts. |
| [cascade-security:secure-design](../../../.codex/plugins/cascade-security/skills/secure-design/SKILL.md) | Review a proposed feature, architecture, workflow, integration, or agent-tool plan for trust boundaries and abuse cases. |

### cascade-workflows

| Method | Purpose / entry condition |
|---|---|
| [cascade-workflows:select-capabilities](../../../.codex/plugins/cascade-workflows/skills/coordinator/skills/select-capabilities/SKILL.md) | Select the smallest sufficient Cascade capability set from request claims, triggers, exclusions, artifacts, authority, and current plugin identities. |
| [cascade-workflows:plan-workflow](../../../.codex/plugins/cascade-workflows/skills/coordinator/skills/plan-workflow/SKILL.md) | Compile an accepted capability selection into an ordered, dependency-safe, artifact-complete, non-dispatching Cascade plugin workflow plan. |
| [cascade-workflows:define-work-item](../../../.codex/plugins/cascade-workflows/skills/project-management/skills/define-work-item/SKILL.md) | Draft one grounded tracker-ready issue, bug, story, task, enabler, or experiment without filing or activating it. |
| [cascade-workflows:plan-project](../../../.codex/plugins/cascade-workflows/skills/project-management/skills/plan-project/SKILL.md) | Build or revise a lean delivery plan with horizons, milestones, dependencies, risks, and evidence gates from accepted objectives. |
| [cascade-workflows:manage-project](../../../.codex/plugins/cascade-workflows/skills/project-management/skills/manage-project/SKILL.md) | Assess, coordinate, update, or reconcile an existing project plan from current artifacts, blockers, dependencies, and receipts. |
| [cascade-workflows:close-project](../../../.codex/plugins/cascade-workflows/skills/project-management/skills/close-project/SKILL.md) | Assess terminal project completion and propose evidence-preserving retention without archiving or rewriting history. |

## Repository agents and their skill maps

Role contracts define responsibility and allowed execution surface; they do
not duplicate skill bodies. After explicit role assignment, read AGENT.md and
its skills.yaml before selecting a method. A listed skill is available to the
role, not an instruction to run every listed capability.

| Role | Host skills / plugin methods | Contract and map |
|---|---:|---|
| agent-engineer | 3 / 29 | [role](../../../.codex/agents/agent-engineer/AGENT.md), [skills](../../../.codex/agents/agent-engineer/skills.yaml) |
| code-reviewer | 1 / 2 | [role](../../../.codex/agents/code-reviewer/AGENT.md), [skills](../../../.codex/agents/code-reviewer/skills.yaml) |
| frontend-engineer | 5 / 6 | [role](../../../.codex/agents/frontend-engineer/AGENT.md), [skills](../../../.codex/agents/frontend-engineer/skills.yaml) |
| orchestrator | 10 / 41 | [role](../../../.codex/agents/orchestrator/AGENT.md), [skills](../../../.codex/agents/orchestrator/skills.yaml) |
| product-designer | 5 / 23 | [role](../../../.codex/agents/product-designer/AGENT.md), [skills](../../../.codex/agents/product-designer/skills.yaml) |
| security | 3 / 8 | [role](../../../.codex/agents/security/AGENT.md), [skills](../../../.codex/agents/security/skills.yaml) |
| simulation-evaluator | 0 / 2 | [role](../../../.codex/agents/simulation-evaluator/AGENT.md), [skills](../../../.codex/agents/simulation-evaluator/skills.yaml) |
| simulation-operator | 1 / 7 | [role](../../../.codex/agents/simulation-operator/AGENT.md), [skills](../../../.codex/agents/simulation-operator/skills.yaml) |
| software-engineer | 6 / 6 | [role](../../../.codex/agents/software-engineer/AGENT.md), [skills](../../../.codex/agents/software-engineer/skills.yaml) |

The ten host skills have repository-bound responsibilities:

| Host skill | Trigger and responsibility |
|---|---|
| run-workflow | Ambiguous method requests or connected plugin work need semantic selection and exact artifact handoffs under the common host cycle. |
| context | Relevant current code/docs and source authority are needed before a decision or edit. |
| plan-change | Non-atomic implementation needs accepted behavior, a small change slice and validation. |
| implement-change | Execute that authorized change in the actual target repository. |
| validate-change | Check current behavior and affected boundaries against the accepted change. |
| create-spec | Durable accepted behavior/source preservation is required; ordinary bounded work can stay inline. |
| pattern-context | A relevant reusable boundary/context rule is being introduced or changed. |
| run-qa-plan | Execute an accepted QA request with the target's real tools; portable QA owns planning/assessment. |
| resolve-validation-failure | Recover from evidence-bound product, test-drift, environment/tooling, flake or ambiguous failures; test-only repair authority requires its separate proof and cannot redefine product behavior to hide failure. |
| closeout | Apply an authorized durable update and verify current evidence/digests; it does not grant acceptance. |

See [value-to-delivery.md](value-to-delivery.md) for discovery/development cycles
and [nexus-integration.md](nexus-integration.md) for typed control, observations,
RSI feedback and tracker projections. Groups help find methods; current evidence
and owner decisions determine the actual workflow.
