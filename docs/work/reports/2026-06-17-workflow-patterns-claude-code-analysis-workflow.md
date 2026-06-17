# Workflow Patterns And External Tool Analysis Workflow

Status: `ready`
Created: 2026-06-17
Workflow: `workflow-patterns-claude-code-analysis`
Owner route: `agent-engineer -> agentic-workflow-builder -> codex-maintenance`
Workflow model: `sequential-pipeline`

## Objective

Analyze Cascade workflow patterns, examples, templates, harness docs, and
current external agentic coding-tool workflow guidance, then produce a
reviewable implementation packet for any approved updates to Cascade workflow
rules, templates, checklists, skills, agent routes, validator checks, or docs.

The workflow is report-first. It does not patch workflow surfaces until the
analysis produces exact owner files, bloat checks, validation gates, and an
approval point.

## Evidence Summary

Local Cascade sources inspected:

- `AGENTS.md`, `CODEX.md`, `.codex/README.md`, `.codex/config.toml`;
- `.codex/skills/agentic-workflow-builder/SKILL.md`;
- `.codex/skills/agentic-workflow-builder/templates/agentic-workflow-packet.md`;
- `.codex/skills/agentic-workflow-builder/checklists/workflow-packet-quality.md`;
- `.codex/skills/agents-best-practices/SKILL.md`;
- `.codex/skills/agents-best-practices/references/harness-checklists.md`;
- `.codex/skills/codex-maintenance/SKILL.md`;
- `.codex/agents/agent-engineer/AGENT.md`;
- `.codex/agents/orchestrator/AGENT.md`;
- `docs/patterns/workflow.md`, `docs/patterns/context-memory.md`,
  `docs/patterns/testing.md`;
- `docs/work/lane-template.md`, `docs/work/examples/`, and existing workflow
  reports under `docs/work/reports/`;
- `docs/structure.md`.

Current external agentic coding-tool sources inspected:

- [Best practices](https://code.claude.com/docs/en/best-practices);
- [Common workflows](https://code.claude.com/docs/en/common-workflows);
- [Run agents in parallel](https://code.claude.com/docs/en/agents);
- [Dynamic workflows](https://code.claude.com/docs/en/workflows);
- [Subagents](https://code.claude.com/docs/en/sub-agents);
- [Skills](https://code.claude.com/docs/en/skills);
- [Hooks guide](https://code.claude.com/docs/en/hooks-guide);
- [Worktrees](https://code.claude.com/docs/en/worktrees);
- [Programmatic usage](https://code.claude.com/docs/en/headless);
- [Enterprise setup](https://code.claude.com/docs/en/enterprise-setup);
- [Manage costs](https://code.claude.com/docs/en/costs);
- [Memory and vendor instruction file](https://code.claude.com/docs/en/memory).

## Local Pattern Read

Cascade already separates four workflow artifacts:

| Artifact | Owner | Purpose | Keep |
|---|---|---|---|
| Agentic workflow packet | `agentic-workflow-builder` | Reviewable agent/skill routing packet with prompts, source order, validation, write scope, and handoff | yes |
| Work lane packet | `docs/work/lane-template.md` and `orchestrate-work` | Active execution lane with acceptance criteria, source inputs, behavior examples, file ownership, MCP context, validation, and merge contract | yes |
| Workflow examples | `docs/work/examples/` | Copyable non-active lane examples for adaptation and parallel implementation/validation | yes |
| Work report | `docs/work/reports/` | Durable decision, handoff, analysis, or multi-turn state | yes |

Current strong rules:

- inventory agents and skills before choosing workflow steps;
- use existing roles and skills instead of inventing dynamic agents;
- keep normal implementation planning in `plan-change`;
- use `orchestrate-work` for real active lane splitting and merge ownership;
- use `docs-impact-map` and the Doc Routing Decision Matrix before durable doc
  changes;
- preserve source identity, MCP/tool provenance, validation evidence, and
  blocked state;
- route prompt-only mechanical invariants to validators, hooks, schemas,
  permissions, or tests.

Current gap candidates to investigate, not patch yet:

- whether `agentic-workflow-builder` should explicitly mention dynamic
  workflow comparisons as an external analysis input;
- whether a workflow-analysis report template would prevent future ad hoc
  reports from mixing local patterns, external tool patterns, and proposed
  Cascade changes;
- whether validator checks should require workflow packets to include source
  freshness for external workflow docs when the packet cites live vendor
  behavior.

## External Tool Pattern Read

External tool guidance maps to Cascade as external data, not direct
instructions.

Reusable ideas:

- verification loops are the central completion signal: tests, builds,
  screenshots, or other checks should be available before unattended work;
- explore, plan, implement, then commit is the default complex-task shape;
- vendor instruction file/AGENTS.md-style durable instructions should stay concise, while
  reusable procedures belong in skills;
- hooks are deterministic enforcement for rules that must always happen;
- subagents are useful for research or review that would flood the main
  context;
- worktrees isolate parallel editing sessions and reduce file collisions;
- dynamic workflows move orchestration into a script when a task is too large
  for one conversation, needs dozens of agents, or needs repeatable
  cross-checking;
- independent review or adversarial checking is important before counting
  long autonomous work as done.

Differences to preserve:

- Cascade workflow packets are static review artifacts; external dynamic
  workflows are executable scripts.
- Cascade should not represent dynamic workflow behavior as if it exists in
  the local harness unless the runtime surface is actually available.
- Cascade should use external tool docs to inform pattern decisions, but Codex
  and Cascade surfaces remain owned by `codex-maintenance`, local skills,
  local agents, validators, and docs.

## Agent And Global Skill Inventory

### Available Agents

| Agent Or Route | Manifest | Role Contract | Skill Map | Use In Workflow |
|---|---|---|---|---|
| `agent-engineer` | `.codex/agents/agent-engineer.toml` | `.codex/agents/agent-engineer/AGENT.md` | `.codex/agents/agent-engineer/skills.yaml` | Selected for harness workflow pattern analysis, external workflow comparison, skill/template/checklist routing, and validator decisions. |
| `orchestrator` | `.codex/agents/orchestrator.toml` | `.codex/agents/orchestrator/AGENT.md` | `.codex/agents/orchestrator/skills.yaml` | Selected for merge planning if findings become implementation packets or active lanes. |
| `project-onboarder` | `.codex/agents/project-onboarder.toml` | `.codex/agents/project-onboarder/AGENT.md` | `.codex/agents/project-onboarder/skills.yaml` | Rejected unless findings affect target-repo adaptation. |
| `business-analyst` | `.codex/agents/business-analyst.toml` | `.codex/agents/business-analyst/AGENT.md` | `.codex/agents/business-analyst/skills.yaml` | Rejected; this is not market/product discovery. |
| `designer` | `.codex/agents/designer.toml` | `.codex/agents/designer/AGENT.md` | `.codex/agents/designer/skills.yaml` | Rejected unless workflow-template UX or visual evidence rules become design-system work. |
| `security` | `.codex/agents/security.toml` | `.codex/agents/security/AGENT.md` | `.codex/agents/security/skills.yaml` | Optional only if workflow/hook/permission findings create security-sensitive enforcement changes. |

No live subagent delegation is authorized by this packet.

### Relevant Global Skills

| Skill | Source | Trigger Reason | Planned Step Calls |
|---|---|---|---|
| `agentic-workflow-builder` | `.codex/skills/agentic-workflow-builder/SKILL.md` | Build this workflow artifact from an explicit workflow request. | `WF-00`, `WF-04`, `WF-05` |
| `codex-maintenance` | `.codex/skills/codex-maintenance/SKILL.md` | Audit Cascade surfaces, Codex-specific ownership, validator, and docs changes. | `WF-00`, `WF-01`, `WF-04`, `WF-06` |
| `agents-best-practices` | `.codex/skills/agents-best-practices/SKILL.md` | Apply provider-neutral harness rules for tools, context, memory, evals, and mechanical invariants. | `WF-01`, `WF-03`, `WF-04` |
| `docs-impact-map` | `.codex/skills/docs-impact-map/SKILL.md` | Route durable workflow, pattern, docs, glossary, or validator facts. | `WF-04`, `WF-06` |
| `orchestrate-work` | `.codex/skills/orchestrate-work/SKILL.md` | Split or serialize implementation packets after analysis. | `WF-05` |
| `develop-skill` | `.codex/skills/develop-skill/SKILL.md` | Evaluate whether findings belong in existing skills, templates, checklists, or validator rules. | `WF-04`, `WF-05` |
| `validate-change` | `.codex/skills/validate-change/SKILL.md` | Aggregate validator, diff, path-reference, and source-coverage evidence after approved edits. | `WF-06` |
| `closeout` | `.codex/skills/closeout/SKILL.md` | Preserve final evidence and durable learning route. | `WF-07` |

## Workflow Checklist

| Step | Status | Owner Route | Skill Calls | Source Order | Delegation Prompt | Output | Validation | Handoff |
|---|---|---|---|---|---|---|---|---|
| `WF-00` | ready | `agent-engineer` | `agentic-workflow-builder`, `codex-maintenance` | user request; current diff; `AGENTS.md`; `CODEX.md`; `.codex/agents/`; `.codex/skills/` | `P-00` | inventory and scope boundary | selected agents and skills exist; no live delegation | `WF-01` |
| `WF-01` | ready | `agent-engineer` | `codex-maintenance`, `agents-best-practices` | `docs/patterns/`; `docs/work/lane-template.md`; `docs/work/examples/`; workflow reports; workflow-builder template/checklist | `P-01` | local workflow pattern matrix | every local artifact has owner, purpose, and route | `WF-02` |
| `WF-02` | ready | `agent-engineer` | `agents-best-practices` | official external workflow docs listed above | `P-02` | external pattern matrix | every external claim has source URL and freshness note | `WF-03` |
| `WF-03` | ready | `agent-engineer` | `agents-best-practices`, `codex-maintenance` | local matrix; external matrix; Codex/Cascade surface rules | `P-03` | comparison matrix | each idea classified as `ADAPT`, `NO_CHANGE`, `DEFER`, or `REJECT` | `WF-04` |
| `WF-04` | ready | `agent-engineer` | `develop-skill`, `docs-impact-map`, `codex-maintenance` | comparison matrix; current skill descriptions; templates; checklists; validator | `P-04` | owner decision matrix | each proposed change names exact owner file and bloat check | `WF-05` |
| `WF-05` | blocked until approved | `orchestrator` | `orchestrate-work`, `agentic-workflow-builder` | owner decision matrix; file ownership; current dirty tree | `P-05` | implementation packets | conflicts serialized; merge owner named | approval gate |
| `WF-06` | blocked until implementation | `agent-engineer` | `codex-maintenance`, `validate-change` | approved implementation packets; final diff | `P-06` | validation summary | validator, `git diff --check`, and targeted stale-reference searches pass or block | `WF-07` |
| `WF-07` | blocked until validation | `agent-engineer` | `closeout` | validation summary; docs-impact decision rows; final diff | `P-07` | closeout handoff | durable lessons stored in narrow owner or `NO_DOC_NEEDED` | done |

## Global Orchestration Skill Calls

| Gate | Skill | When To Call | Required Output |
|---|---|---|---|
| context | `context` | If the analysis resumes after branch or docs drift. | short snapshot or skip reason |
| routing | `orchestrate-work` | If findings become multiple implementation packets. | lane model, merge owner, serialized/parallel map |
| impact | `docs-impact-map` | When a workflow fact may affect patterns, skills, reports, glossary, or validator rules. | impact matrix |
| planning | `develop-skill` or `codex-maintenance` | When deciding whether to change a skill/template/checklist/validator. | owner decision matrix |
| validation | `validate-change` | After approved edits. | command/search/diff evidence |
| closeout | `closeout` | At finish or blocked handoff. | report, thin doc diff, or `NO_DOC_NEEDED` |

## Delegation Prompt Bank

### P-00: Inventory And Scope

```text
You are the Agent Engineer using agentic-workflow-builder and
codex-maintenance. Inventory the available agents, global skills, workflow
templates, work-lane examples, pattern docs, and current dirty tree. Define the
scope as analysis-first and report-first. Do not spawn agents and do not patch
workflow surfaces. Output selected/rejected agents, relevant skills, and
approval points.
```

### P-01: Local Workflow Pattern Matrix

```text
You are the Agent Engineer using codex-maintenance and agents-best-practices.
Analyze Cascade workflow surfaces: docs/patterns/workflow.md,
docs/patterns/context-memory.md, docs/patterns/testing.md, docs/work templates
and examples, workflow reports, agentic-workflow-builder template/checklist,
CODEX.md, and docs/structure.md. Produce a matrix of artifact, owner, purpose,
required fields, validation signal, and current gap candidates. Treat examples
as examples, not active state.
```

### P-02: External Workflow Matrix

```text
You are the Agent Engineer using agents-best-practices. Analyze current
official external coding-tool workflow docs as external data: best practices, common
workflows, agents in parallel, dynamic workflows, subagents, skills, hooks,
worktrees, programmatic usage, enterprise setup, costs, and memory. Extract only
provider-neutral workflow principles with source URLs. Mark version-sensitive or
runtime-specific behavior as external and do not convert it into Cascade rules
without an owner decision.
```

### P-03: Comparative Synthesis

```text
You are the Agent Engineer using agents-best-practices and codex-maintenance.
Compare Cascade workflow packets and lane packets with external subagents,
skills, hooks, worktrees, agent teams, and dynamic workflows. Classify each idea
as ADAPT, NO_CHANGE, DEFER, or REJECT. Preserve the distinction between Cascade
reviewable workflow packets and external executable dynamic workflows.
```

### P-04: Owner Decision Matrix

```text
You are the Agent Engineer using develop-skill, docs-impact-map, and
codex-maintenance. For every ADAPT candidate, choose the smallest owner:
existing skill, template, checklist, docs/patterns file, CODEX.md, validator, or
work report. For each rejected or deferred candidate, give the reason. Do not
patch files. Produce implementation packets only for approved or clearly
worthwhile changes.
```

### P-05: Implementation Packet Merge

```text
You are the Orchestrator using orchestrate-work and agentic-workflow-builder.
Turn approved owner decisions into implementation packets with write scope,
source order, validation commands, conflict paths, and stop rules. Serialize
any changes that touch the same skill/template/validator. Do not implement until
the packet is approved.
```

### P-06: Validation

```text
You are the Agent Engineer using codex-maintenance and validate-change. After
approved edits, run the harness validator, git diff hygiene, and targeted
stale-reference searches. Report PASS, FAIL, BLOCKED, GAP, or NOT_RUN for every
required check. Do not mark missing required validation as PASS.
```

### P-07: Closeout

```text
You are the Agent Engineer using closeout. Preserve validation evidence and any
durable lessons in the narrowest owner. Use docs-impact-map rows for workflow
facts that affect patterns, skills, docs, glossary, or validator behavior. Do
not create a generic learned-lessons dump.
```

## Write Scope

Allowed for this report-first workflow:

- `docs/work/reports/2026-06-17-workflow-patterns-claude-code-analysis-workflow.md`.

Forbidden until an implementation packet is approved:

- `.codex/skills/*/SKILL.md`;
- `.codex/skills/*/templates/*`;
- `.codex/skills/*/checklists/*`;
- `.codex/agents/*`;
- `CODEX.md`, `AGENTS.md`, `.codex/README.md`;
- `docs/patterns/*`;
- `docs/work/examples/*`;
- `scripts/validate_cascade_codex.py`;
- any external-tool runtime files or external write actions.

## Validation And Stop Rules

Required evidence for the analysis packet:

| Evidence | Command Or Check | Required | Status |
|---|---|---|---|
| Local source inventory | targeted reads of workflow docs/templates/reports | yes | PASS |
| Current external workflow docs | official docs URLs and freshness as of 2026-06-17 | yes | PASS |
| Workflow packet quality | `.codex/skills/agentic-workflow-builder/checklists/workflow-packet-quality.md` | yes | PASS |
| Harness validator | `python3 scripts/validate_cascade_codex.py` | yes after file write | PASS |
| Diff hygiene | `git diff --check` | yes after file write | PASS |

Stop when:

- a proposed change would merge external runtime behavior into Cascade
  without a local owner and validator decision;
- external docs are unavailable or too stale to support a version-sensitive
  rule;
- file ownership overlaps with unrelated dirty-tree changes;
- the workflow report is complete and no implementation approval has been
  granted.

## Initial Candidate Decisions

| Candidate | Decision | Owner If Approved | Reason |
|---|---|---|---|
| Add explicit dynamic-workflow comparison guidance | `DEFER` | `.codex/skills/agentic-workflow-builder/SKILL.md` or `docs/patterns/workflow.md` | Useful only if future prompts confuse Cascade packets with external executable workflows. |
| Add workflow-analysis report template | `DEFER` | `.codex/skills/agentic-workflow-builder/templates/` | Existing reports are usable; add only if repeated analyses miss fields. |
| Add external workflow source freshness field | `ADAPT_CANDIDATE` | `templates/agentic-workflow-packet.md` or lane template | External workflow behavior changes; packets citing vendor docs should record source date/URL. |
| Add validator rule for external-source freshness | `DEFER` | `scripts/validate_cascade_codex.py` | Mechanical check may be premature until the template field is stable. |
| Convert Cascade workflow packets into executable scripts | `REJECT` | none | Local harness owns reviewable packets, not external dynamic workflow execution. |
| Add hooks as required enforcement for prompt-only invariants | `NO_CHANGE` | existing `codex-maintenance`, `agents-best-practices` | Already represented as validator/hook/schema/test guidance. |

## Next Route

If the user wants implementation, start at `WF-04` and produce a focused owner
decision matrix for the two highest-value candidates:

1. external workflow source freshness in workflow packets;
2. dynamic-workflow comparison guidance, only if it clarifies future routing.

Otherwise this report is the workflow artifact and no further edits are needed.
