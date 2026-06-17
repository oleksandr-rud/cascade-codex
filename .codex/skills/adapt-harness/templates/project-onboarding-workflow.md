# Project Onboarding Workflow

Status: `<draft | ready | blocked | superseded>`
Created: YYYY-MM-DD
Workflow: `<target-project-onboarding>`
Workflow model: `sequential-pipeline`
Merge owner: `project-onboarder`

## Objective

Adapt Cascade Codex to `<TARGET_PROJECT>` and produce routed project-part,
feature, stack, architecture, security, design, brand, visual, validation, and
context-memory specs without inventing facts or creating broad dump folders.

## Agent And Global Skill Inventory

### Available Agents

| Agent Route | Manifest | Role Contract | Skill Map | Use In Workflow |
|---|---|---|---|---|
| `project-onboarder` | `.codex/agents/project-onboarder.toml` | `.codex/agents/project-onboarder/AGENT.md` | `.codex/agents/project-onboarder/skills.yaml` | merge owner and default executor |
| `agent-engineer` | `.codex/agents/agent-engineer.toml` | `.codex/agents/agent-engineer/AGENT.md` | `.codex/agents/agent-engineer/skills.yaml` | harness, skill, agent, validator, context-memory support |
| `designer` | `.codex/agents/designer.toml` | `.codex/agents/designer/AGENT.md` | `.codex/agents/designer/skills.yaml` | visual, UX, design-system, brand support when UI evidence exists |
| `security` | `.codex/agents/security.toml` | `.codex/agents/security/AGENT.md` | `.codex/agents/security/skills.yaml` | security, auth, data, abuse-case, and boundary support |
| `orchestrator` | `.codex/agents/orchestrator.toml` | `.codex/agents/orchestrator/AGENT.md` | `.codex/agents/orchestrator/skills.yaml` | optional lane scheduling only when the scan is broad enough to split safely |

### Relevant Global Skills

| Skill | Source | Planned Step Calls |
|---|---|---|
| `context` | `.codex/skills/context/SKILL.md` | `ON-00`, resume |
| `adapt-harness` | `.codex/skills/adapt-harness/SKILL.md` | all steps, merge |
| `agentic-workflow-builder` | `.codex/skills/agentic-workflow-builder/SKILL.md` | workflow packet creation or refinement |
| `orchestrate-work` | `.codex/skills/orchestrate-work/SKILL.md` | only if lanes split |
| `architecture-review` | `.codex/skills/architecture-review/SKILL.md` | `ON-02`, `ON-03` |
| `codebase-audit` | `.codex/skills/codebase-audit/SKILL.md` | `ON-04` |
| `auth-analysis` | `.codex/skills/auth-analysis/SKILL.md` | `ON-04` when auth/session/role code exists |
| `secure-design` | `.codex/skills/secure-design/SKILL.md` | `ON-04` for workflow or agent/tool risks |
| `ingest-spec` | `.codex/skills/ingest-spec/SKILL.md` | `ON-05` for incoming mixed source |
| `discover` | `.codex/skills/discover/SKILL.md` | `ON-05` when product/design/brand facts are missing |
| `synthesis-to-spec` | `.codex/skills/synthesis-to-spec/SKILL.md` | `ON-05` when evidence needs synthesis |
| `compose-spec` | `.codex/skills/compose-spec/SKILL.md` | `ON-05` for durable product docs |
| `visual-qa` | `.codex/skills/visual-qa/SKILL.md` | `ON-06` when UI can be run or evidence exists |
| `ux-flow-review` | `.codex/skills/ux-flow-review/SKILL.md` | `ON-06` for task flow quality |
| `design-system` | `.codex/skills/design-system/SKILL.md` | `ON-06` for reusable design rules |
| `brand-positioning` | `.codex/skills/brand-positioning/SKILL.md` | `ON-06` for brand/content rules |
| `functional-qa` | `.codex/skills/functional-qa/SKILL.md` | `ON-07` |
| `docs-impact-map` | `.codex/skills/docs-impact-map/SKILL.md` | `ON-03` through `ON-08` before durable writes |
| `validate-change` | `.codex/skills/validate-change/SKILL.md` | `ON-09` |
| `closeout` | `.codex/skills/closeout/SKILL.md` | `ON-08`, `ON-09` |

## Workflow Checklist

| Step | Status | Owner Route | Skill Calls | Source Order | Output | Validation | Handoff |
|---|---|---|---|---|---|---|---|
| `ON-00` | `<open>` | `project-onboarder` | `context`, `adapt-harness` | request, repo root, branch, existing harness/docs/manifests | source inventory and blockers | no writes before inventory | `ON-01` |
| `ON-01` | `<open>` | `project-onboarder` | `adapt-harness` | manifests, build files, test config, README, entrypoints | stack, roots, commands, runners | paths and commands are real or marked blocked | `ON-02` |
| `ON-02` | `<open>` | `project-onboarder` | `adapt-harness`, `architecture-review` | source roots, tests, public contracts | project-part spec list and first packets | one packet per justified area, skipped areas explained | `ON-03` |
| `ON-03` | `<open>` | `project-onboarder` | `architecture-review`, `docs-impact-map` | project-part packets, boundaries, glossary | boundary and vocabulary updates | Doc Routing Decision Matrix rows | `ON-04` |
| `ON-04` | `<open>` | `security` or `project-onboarder` | `codebase-audit`, `auth-analysis`, `secure-design` | auth, data, config, API, adapters, logs docs | security/data notes and validation probes | sensitive data omitted, risks separated from evidence | `ON-05` |
| `ON-05` | `<open>` | `project-onboarder` | `ingest-spec`, `discover`, `synthesis-to-spec`, `compose-spec` | routes, UI copy, APIs, tests, specs, README | feature specs, scenarios, journeys, transformed specs | each feature has source identity or `GAP` | `ON-06` |
| `ON-06` | `<open>` | `designer` or `project-onboarder` | `visual-qa`, `ux-flow-review`, `design-system`, `brand-positioning` | running app, screenshots, UI code, design and brand docs | visual/design/brand/product deltas | viewport/state evidence or blocked reason | `ON-07` |
| `ON-07` | `<open>` | `project-onboarder` | `functional-qa`, `docs-impact-map` | feature specs, scenarios, public contracts, runners | acceptance and test map | no missing required check marked pass | `ON-08` |
| `ON-08` | `<open>` | `project-onboarder` | `docs-impact-map`, `closeout` | all durable facts and owner docs | context-memory and doc routing matrix | narrow owner for every retained fact | `ON-09` |
| `ON-09` | `<open>` | `project-onboarder` | `validate-change`, `closeout` | changed files, validator, target checks | validation and handoff | validator and available target checks recorded | done |

## Write Scope

Allowed:

- `AGENTS.md`
- `CODEX.md`
- `harness.config.yaml`
- `docs/glossary.md`
- `docs/product/`
- `docs/design/`
- `docs/brand/`
- `docs/specs/incoming/` only when source preservation is useful
- `docs/specs/transformed/`
- `docs/backlog/_index.md`
- `docs/patterns/workflow.md`
- `docs/patterns/boundaries.md`
- `docs/patterns/testing.md`
- `docs/patterns/context-memory.md`
- `docs/work/active.md`
- `docs/work/lanes/`
- `docs/work/reports/`

Forbidden:

- broad dump folders for security, backend, frontend, or memory;
- unrelated product/runtime code changes;
- destructive repository operations;
- sensitive screenshots, credentials, tokens, private customer data, raw logs,
  or regulated sensitive data.

## Delegation Prompts

### P-01: Project Onboarder

```text
Use project-onboarder with adapt-harness as the merge owner. Inspect the target
repository before writing. Fill configuration and docs only from observed
sources. Produce project-part specs with templates/project-part-spec.md when a
project area has independent behavior or validation risk. Route durable facts
through docs-impact-map and the existing owner docs. Keep AGENTS.md thin. Run
the Cascade validator and available target checks before closeout.
```

### P-02: Designer Support

```text
Use designer only when UI evidence exists or can be gathered. Use visual-qa for
screenshot-backed layout, hierarchy, spacing, responsive behavior, style, and
state evidence; ux-flow-review for task-flow quality; design-system for
reusable token/component/layout rules; and brand-positioning for durable
brand/content rules. Route feature-specific findings to product or spec docs
and reusable rules to design or brand owners.
```

### P-03: Security Support

```text
Use security only for security-sensitive source areas. Use codebase-audit for
current-code trajectory inventory, auth-analysis for auth/session/role or
tenant boundaries, and secure-design for workflow or agent/tool risks. Separate
proven controls, likely risks, gaps, and assumptions. Route durable boundary
and validation rules to existing pattern files, and follow-up work to backlog
only with acceptance criteria.
```

### P-04: Agent Engineer Support

```text
Use agent-engineer only for harness, skill, agent, validator, workflow, source
context, connector, or memory-routing changes. Keep prompt rules separate from
mechanical validator or hook invariants. Preserve project-neutral Cascade
surfaces and update validators when a new required artifact is added.
```

## Stop Rules

- Stop for missing target repository access or missing required source roots.
- Stop before overwriting unrelated user-authored instructions.
- Stop before delegated specialist execution without authorization.
- Stop when product, design, brand, security, architecture, or validation facts
  are missing; mark `GAP` or `BLOCKED` instead of inventing facts.
- Stop when validation is unavailable and no blocked reason is recorded.

## Done Condition

Onboarding is done when the harness points at real project roots and commands,
project facts have narrow owner docs, project-part specs are written or skipped
with reasons, feature specs and acceptance routes are recorded, visual/design
and brand evidence is routed when available, security and architecture facts
have owners, context-memory routing is explicit, and validation evidence or
blockers are recorded.
