# Cascade Wiring

This directory contains reusable workflow skills and role contracts.

This source checkout also contains plugin packages and lab tooling. A normal
target does not copy this tree wholesale: `bun run build:runtime` emits a core
profile with 9 host skills, 3 roles, the frozen capability catalog, admission,
Coordinator validation, and Workspace MCP. Plugin source and eval/simulation
labs stay here and resolve separately through installed plugins or explicit
lab packs.

## Harness Tooling

`.codex/harness-tooling/` is the isolated dependency boundary for browser
simulations. Install it with
`bun install --cwd .codex/harness-tooling --frozen-lockfile`; do not replace or
merge a target application's root package manifest or lockfile.

## Repo-Local Plugins

`.codex/plugins/` contains repo-local plugin source packages. Their catalog is
`.agents/plugins/marketplace.json`; local source paths in that catalog resolve
from the repository root. The catalog owns 14 sources: Cascade Prompt,
Coordinator, Simulations, Evals, AI Architect, Software Architect, Coding
Agent, Personas, Product, Market, Design, Security, Project Management, and QA under
`.codex/plugins/<plugin-name>/`. Source presence is distinct from installed,
active, or published state.

Cascade is plugin-first. Plugins own reusable behavior, schemas, templates,
deterministic package validators, and subject evaluation packs. Repository
agents and `.codex/skills/` retain only target discovery, current source and
dirty-state binding, permissions, mutation, durable write targets, campaign
infrastructure, and repository validation. A host adapter must resolve the
exact namespaced plugin skill and fail closed; it cannot embed a fallback copy.

| Plugin | Reusable owner |
|---|---|
| Cascade Prompt | Prompt and context-plan construction or audit |
| Cascade Coordinator | Claim-bound capability selection and non-dispatching cross-plugin workflow planning |
| Cascade AI Architect | AI-agent capability maps, behavior blueprints, workflows, roles, skills, prompt briefs, persona requirements, evaluation requests, and bounded improvement |
| Cascade Software Architect | Software boundaries, pattern selection, and independent architecture/change review |
| Cascade Coding Agent | Coding-agent harness audit, target adaptation, maintenance, asset integration, and evaluation coordination |
| Cascade Personas | Canonical human models, purpose-limited projections, and persona evaluation |
| Cascade Simulations | Runtime actors, persona consumption, briefs, outcomes, adapters, campaign governance/execution, bounded actor loops, and frozen-run review |
| Cascade Evals | Generic evaluation lifecycle, judge contracts, response validation, score reduction, calibration state, and receipts |
| Cascade Product | Product definition, lifecycle decisions, and product validation |
| Cascade Market | Market research, opportunity assessment, experiments, positioning, category, proof, messaging, naming, tone, and trust language |
| Cascade Design | UX, accessibility, visual, and reusable design-system review |
| Cascade Security | Codebase security trajectories, auth/session/tenant analysis, secure-design review, typed findings, and filename-only stack inventory |
| Cascade Project Management | Tracker-ready work-item definition, project planning, coordination, reconciliation, lifecycle state, and closeout assessment |
| Cascade QA | Quality planning, test design, evidence assessment, and defect triage |

Every repo-local plugin exposes a typed `capabilities.yaml`; the deterministic
compiler writes the canonical route registry to
`.codex/plugin-capabilities.generated.json`. The `[cascade.plugin_skills]`
table in `.codex/config.toml` is a validator-checked alias projection, not a
second route authority. Cascade Coordinator selections and workflow plans
validate through `scripts/cascade.ts workflow validate-selection` and
`scripts/cascade.ts workflow validate-plan` before the host may dispatch.
Project Management, QA, Design, and focused Market capabilities use namespaced
plugin skills directly.
Security methods route directly to installed namespaced skills; the Security
role binds target context and sensitive-evidence boundaries. Other host skills
remain only where repository
context, mutation, execution, or persistence adds behavior. Campaign methods
live in Simulations and Evals; this repository still owns its `product-evals/`
registries, runners, artifact policy, and actual runtime authority.

## Workspace MCP

The project registers one `cascade_workspace` MCP server in
`.codex/config.toml`. It exposes bounded context/resource reads and two-phase
artifact preparation/persistence from `scripts/cascade/workspace-mcp.ts`.
Coordinator remains a non-dispatching planner: the active Codex host selects
skills, calls tools, and retains authority. Durable plugin candidates route
through `closeout` and `.codex/artifact-destinations.json`; standalone plugins
do not embed repository writes or require the server to produce an artifact.

## Task Admission And Skills

Every request first runs the bounded task-admission microkernel through
`.codex/task-admission/` and `scripts/cascade.ts admission`. Its Task Envelope
selects proportional controls but cannot grant authority, dispatch work, or
auto-approve a tool. Project hooks in `.codex/hooks.json` require normal Codex
trust review; the full chain below is a conditional non-atomic fallback, not
the default for direct answers or atomic edits.

The runtime compiler loads only its policy, control catalog, and envelope
schema. `harness-evals/task-admission/cases.yaml` is a 981-case source
regression corpus and is never read during normal request admission. The core
target profile blocks the corpus command as source-only.

Core non-atomic fallback:

`context -> plan-change -> implement-change -> validate-change`

Source intake, docs impact, and pattern context are conditional. Portable
iteration forecasting, coordination, reconciliation, and project closeout
assessment route directly to Cascade Project Management. Portable quality
planning, test design, evidence assessment, and defect triage route directly
to Cascade QA only when applicable. The harness keeps `run-qa-plan`,
`repair-tests`, and `closeout` for target effects. Bounded one-owner work
creates no spec, lane, graph, report, receipt, or archive entry by default.

`create-spec` may register stable product domains and capabilities in
`docs/product/catalog.yaml` and author a per-slice `brief.yaml`. The
`product_briefs` registry in `.codex/config.toml` points to the schemas and
deterministic Bun compiler; generated briefs remain projections rather than
product authority.

`cascade-project-management:close-project` proposes retention and `closeout`
applies exact authorized host changes. Retention is not automatic.

Host skills (9):

- `closeout`
- `context`
- `create-spec`
- `implement-change`
- `pattern-context`
- `plan-change`
- `repair-tests`
- `run-qa-plan`
- `validate-change`

Portable Market, Product, Persona, Design, Security, Architect, Coding Agent,
Simulation, Evaluation, Project Management, QA, and Prompt methods route
directly to namespaced plugin skills. Host skills remain only for context,
mutation, validation, QA target execution/repair, spec or pattern persistence,
and closeout effects.

## Dynamic Simulation Plugin

When installed from the repository marketplace, `cascade-simulations:simulate`
is the default route for one actor performing meaningful work through a
declared interface toward an observable outcome. It uses a compact
interface-adapter, persona, actor, domain-and-feature brief, outcome, and limits
contract. Use `cascade-simulations:manage-simulation-campaign` for controlled
comparisons and `cascade-simulations:execute-simulation-campaign` for an
approved campaign run. Independent semantic judgment remains
`cascade-evals:simulation-evaluation`; none of these methods is duplicated in
the host skill tree.

## Agents

Harness judgment is an optional Cascade Evals subject profile, not a registered
host role. The legacy receipt principal remains compatible. Completion checks
use the existing closeout skill and shared CLI/Stop-hook implementation.

- `orchestrator`: orchestrates the cascade.
- `product-designer`: owns scoped product discovery and design, using Product,
  Market, Personas, Project Management, Prompt and simulation methods on demand;
  creates mockups and implementation handoffs through Cascade Design. Portfolio
  strategy, cross-owner coordination and independent acceptance retain their
  existing owners; the role's `skills.yaml` and `AGENT.md` define exact routes.
- `software-engineer`: owns scoped software implementation and verification.
- `frontend-engineer`: implements approved UI designs with rendered evidence.
- `code-reviewer`: reviews a fixed diff without edits; independence requires a separate context.
- `agent-engineer`: owns Cascade maintenance, target-project onboarding and
  adaptation, and host integration of reviewed AI-agent and harness assets
  across Codex surfaces, source context, tools, observability, and eval wiring.
- `security`: read-only host role that selects installed
  `cascade-security:<skill>` methods, supplies redacted current target evidence,
  and owns repository-specific validation and implementation handoff only.
- `simulation-operator`: owns bounded mutable execution of one approved
  campaign, immutable evidence freezing, cleanup, and execution handoff.
- `simulation-evaluator`: owns independent read-only cross-contour evidence,
  policy, oracle, semantic, and claim-support evaluation.

Agent TOML files use the current Codex custom-agent schema with top-level
`name`, `description`, `model`, and `developer_instructions`. Planning,
synthesis, execution, and judged-evaluation roles default to `gpt-6-astra` with
`high` reasoning, as do new prompt and evaluation campaigns. Explicit model
choices and frozen comparison settings retain their recorded configurations. Detailed Cascade scope,
delegation, workflow, and skill mapping stay in the companion `AGENT.md` and
`skills.yaml` files.

Cascade is skill-first. Market/product analysis stays in plugin-backed skills
under Orchestrator, and onboarding uses
`cascade-coding-agent:adapt-harness` under Agent Engineer. Retain roles only
for a real permission, mutable-execution, or
independent-review boundary. Use subagents only when the user explicitly
authorizes delegation in the target runtime.
