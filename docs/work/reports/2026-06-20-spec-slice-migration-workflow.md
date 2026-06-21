# Agentic Workflow Packet

Status: ready
Created: 2026-06-20
Workflow: spec-slice-harness-migration

## Objective

Migrate Cascade from one global processed-spec bucket to per-slice spec folders
under `docs/specs/{slice-slug}/`, update every affected harness surface, validate
the invariant mechanically, and open upstream GitHub issues for the remaining
release work.

## Agent And Global Skill Inventory

### Available Agents

| Agent Or Subagent Route | Manifest | Role Contract | Skill Map | Role Checklists | Use In Workflow |
|---|---|---|---|---|---|
| `orchestrator` | `.codex/agents/orchestrator.toml` | `.codex/agents/orchestrator/AGENT.md` | `.codex/agents/orchestrator/skills.yaml` | none | Selected for routing, sequencing, validation, and closeout. |
| `agent-engineer` | `.codex/agents/agent-engineer.toml` | `.codex/agents/agent-engineer/AGENT.md` | `.codex/agents/agent-engineer/skills.yaml` | none | Selected for harness design, validator, source-context, and workflow packet decisions. |
| `project-onboarder` | `.codex/agents/project-onboarder.toml` | `.codex/agents/project-onboarder/AGENT.md` | `.codex/agents/project-onboarder/skills.yaml` | none | Selected only for adapter/setup reference impact; not owner of active implementation. |
| `business-analyst` | `.codex/agents/business-analyst.toml` | `.codex/agents/business-analyst/AGENT.md` | `.codex/agents/business-analyst/skills.yaml` | none | Rejected for execution; no market or product-validation research lane remains. |
| `security` | `.codex/agents/security.toml` | `.codex/agents/security/AGENT.md` | `.codex/agents/security/skills.yaml` | `.codex/agents/security/checklists/security-agent-workflows.md` | Rejected; migration does not alter secrets, auth, RBAC, tool permissions, or external writes beyond GitHub issue creation. |
| `designer` | `.codex/agents/designer.toml` | `.codex/agents/designer/AGENT.md` | `.codex/agents/designer/skills.yaml` | `.codex/agents/designer/checklists/designer-workflows.md` | Rejected; migration has no UI, visual, accessibility, token, or design-system surface. |

### Relevant Global Skills

| Skill | Source | Trigger Reason | Planned Step Calls |
|---|---|---|---|
| `context` | `.codex/skills/context/SKILL.md` | Establish branch, active work, docs, and changed state. | WF-01 |
| `codex-maintenance` | `.codex/skills/codex-maintenance/SKILL.md` | Harness rules, validator, skills, agents, docs, source-context surfaces. | WF-01, WF-02, WF-03, WF-07 |
| `docs-impact-map` | `.codex/skills/docs-impact-map/SKILL.md` | Spec-storage rule affects docs, skills, validator, config, glossary, reports. | WF-02, WF-07 |
| `agentic-workflow-builder` | `.codex/skills/agentic-workflow-builder/SKILL.md` | User requested an agentic workflow for the whole request. | WF-06 |
| `validate-change` | `.codex/skills/validate-change/SKILL.md` | Aggregate validator, compiler, syntax, stale-reference, and diff checks. | WF-07 |
| `closeout` | `.codex/skills/closeout/SKILL.md` | Persist audit, workflow packet, validation evidence, and issue follow-up. | WF-08 |
| `issue-intake` | `.codex/skills/issue-intake/SKILL.md` | GitHub issue bodies if live issue creation is blocked. | WF-09 fallback |

## Workflow Checklist

| Step | Status | Owner Route | Skill Calls | Source Order | Delegation Prompt | Output | Validation | Handoff |
|---|---|---|---|---|---|---|---|---|
| WF-01 | done | orchestrator | context, codex-maintenance | User request, `git status`, `rg --files`, `AGENTS.md`, `CODEX.md` | P-01 | Reference inventory | `rg` inventory completed | WF-02 |
| WF-02 | done | agent-engineer | codex-maintenance, docs-impact-map | `docs/structure.md`, `docs/specs/`, `docs/patterns/`, affected skills | P-02 | Surface decision | Old-path scan identified affected files | WF-03 |
| WF-03 | done | agent-engineer | codex-maintenance | Templates, validator, config, skill refs, agent refs | P-02 | Local migration | Validator PASS | WF-04 |
| WF-04 | done | orchestrator | validate-change | `scripts/validate_cascade_codex.py`, compiler script, stale-reference searches | P-01 | Validation evidence | Validator/compiler/py_compile PASS | WF-05 |
| WF-05 | done | agent-engineer | docs-impact-map | Moved persona files, reports, glossary, patterns | P-02 | Durable audit report | `docs/work/reports/2026-06-20-spec-slice-harness-audit.md` | WF-06 |
| WF-06 | done | agent-engineer | agentic-workflow-builder | Agent inventory, selected skills, changed surfaces | P-03 | Workflow packet | Packet quality checklist applied | WF-07 |
| WF-07 | done | orchestrator | validate-change | Final diff, stale-reference search, validator, compiler, GitHub auth | P-01 | Final validation summary | Validator, compiler, syntax, stale-search, and diff checks passed | WF-08 |
| WF-08 | done | orchestrator | closeout | Audit report, workflow packet, GitHub issue results | P-01 | Closeout summary | Harness issues remain #1-#3; #4 closed as project-specific | WF-09 |
| WF-09 | done | orchestrator | GitHub connector | Issue pack from audit report | P-04 | GitHub issues #1-#3; #4 closed as not planned | Connector returned issue URLs | done |

## Global Orchestration Skill Calls

| Gate | Skill | When To Call | Required Output |
|---|---|---|---|
| context | `context` | Start or resume harness migration | Branch, diff, source tree, active work state. |
| impact | `docs-impact-map` | Any write-target rule changes | Impact matrix and narrow owner docs. |
| maintenance | `codex-maintenance` | Validator, skill, agent, config, or docs changes | Surface decision and validator update. |
| workflow packet | `agentic-workflow-builder` | User asks for workflow artifact | This packet with roles, prompts, write scopes, and validation gates. |
| validation | `validate-change` | After edits and before issue creation | Validator, compiler, stale-reference, syntax, and diff evidence. |
| closeout | `closeout` | After local validation and issue attempt | Final handoff, unresolved risks, issue URLs or blockers. |

## Delegation Prompt Bank

### P-01: Orchestrator

Role:

- Agent: `orchestrator`
- Role contract: `.codex/agents/orchestrator/AGENT.md`
- Manifest: `.codex/agents/orchestrator.toml`
- Skill map: `.codex/agents/orchestrator/skills.yaml`

Prompt:

```text
Coordinate the spec-slice harness migration. Load AGENTS.md, CODEX.md, the
current diff, docs/work reports, and the validation commands. Keep work
serialized because the validator, skills, and docs share the same invariant.
Run final validation, record blockers, and do not open GitHub issues until local
stale-reference and validator checks pass.
```

Allowed skills:

| Skill | Source | Reason |
|---|---|---|
| `context` | `.codex/skills/context/SKILL.md` | Orient to branch and changed files. |
| `validate-change` | `.codex/skills/validate-change/SKILL.md` | Aggregate evidence. |
| `closeout` | `.codex/skills/closeout/SKILL.md` | Persist outcome. |
| `issue-intake` | `.codex/skills/issue-intake/SKILL.md` | Fallback if live GitHub issue creation is blocked. |

Write scope:

- Allowed: `docs/work/reports/`, final status docs.
- Forbidden: unrelated product/design/brand edits.

### P-02: Agent Engineer

Role:

- Agent: `agent-engineer`
- Role contract: `.codex/agents/agent-engineer/AGENT.md`
- Manifest: `.codex/agents/agent-engineer.toml`
- Skill map: `.codex/agents/agent-engineer/skills.yaml`

Prompt:

```text
Own the harness rule migration. Replace the global legacy processed-spec bucket model
with docs/specs/{slice-slug}/. Update skills, agents, config, docs, templates,
validator, and source-context rules. Keep .codex/skills and .codex/agents as the
canonical harness surfaces. Add mechanical validator guards for the old path and
template name.
```

Allowed skills:

| Skill | Source | Reason |
|---|---|---|
| `codex-maintenance` | `.codex/skills/codex-maintenance/SKILL.md` | Harness-surface changes. |
| `docs-impact-map` | `.codex/skills/docs-impact-map/SKILL.md` | Cross-doc owner routing. |
| `agents-best-practices` | `.codex/skills/agents-best-practices/SKILL.md` | Context packaging and semantic-core invariants. |

Write scope:

- Allowed: `CODEX.md`, `README.md`, `harness.config*.yaml`,
  `.codex/skills/`, `.codex/agents/`, `docs/structure.md`,
  `docs/specs/`, `docs/patterns/`, `docs/glossary.md`,
  `scripts/validate_cascade_codex.py`.
- Forbidden: unrelated runtime code, unrelated product docs.

### P-03: Workflow Packet Author

Role:

- Agent: `agent-engineer`
- Role contract: `.codex/agents/agent-engineer/AGENT.md`
- Manifest: `.codex/agents/agent-engineer.toml`
- Skill map: `.codex/agents/agent-engineer/skills.yaml`

Prompt:

```text
Use agentic-workflow-builder to prepare a reviewable workflow packet. Inventory
all existing agents and relevant skills before selecting roles. Mark rejected
roles with reasons. Include exact source order, write scope, validation gates,
handoff rules, and stop conditions. Do not invent dynamic agents or assume
parallel delegation is authorized.
```

Allowed skills:

| Skill | Source | Reason |
|---|---|---|
| `agentic-workflow-builder` | `.codex/skills/agentic-workflow-builder/SKILL.md` | Explicit workflow artifact request. |

Write scope:

- Allowed: `docs/work/reports/2026-06-20-spec-slice-migration-workflow.md`.

### P-04: GitHub Issue Publisher

Role:

- Agent: `orchestrator`
- Role contract: `.codex/agents/orchestrator/AGENT.md`
- Manifest: `.codex/agents/orchestrator.toml`
- Skill map: `.codex/agents/orchestrator/skills.yaml`

Prompt:

```text
Open issue-sized follow-ups against oleksandr-rud/cascade-codex only after
local validation passes. Use the issue pack from the audit report. If GitHub
authentication or permissions are unavailable, create durable issue bodies in
the closeout instead of pretending they were filed.
```

Allowed skills:

| Skill | Source | Reason |
|---|---|---|
| `issue-intake` | `.codex/skills/issue-intake/SKILL.md` | Fallback issue-body creation. |

Write scope:

- Allowed: GitHub issues or `docs/work/reports/` fallback.
- Forbidden: PR creation or pushing unless explicitly requested.

## Execution Guidance

- Serialized steps: all rule, validator, and template changes. These share one
  invariant and one merge owner.
- Parallel-safe steps: none in the current local session.
- Merge owner: `orchestrator`.
- Approval points: satisfied through the GitHub connector; local `gh` remains
  unauthenticated, and no labels/projects were applied.
- Stop rules:
  - Stop if `python scripts/validate_cascade_codex.py` fails.
  - Stop if stale old-path search finds a non-validator old reference.
  - Stop if GitHub auth is unavailable; write issue bodies instead.
  - Stop for destructive git operations, push, or PR creation without explicit
    user request.

## Validation Evidence Required

| Evidence | Command Or Check | Required? | Status |
|---|---|---|---|
| Harness validator | `python scripts/validate_cascade_codex.py` | yes | PASS locally |
| Compiler script | `python scripts/compile_persona_context.py` | yes | PASS locally |
| Python syntax | `python -m py_compile scripts/compile_persona_context.py scripts/validate_cascade_codex.py` | yes | PASS locally |
| Stale old-path search | `rg -n "legacy processed-spec bucket|legacy spec-packet token"` | yes | PASS except validator stale guards |
| Diff whitespace | `git diff --check` | yes | PASS locally; line-ending warnings only |
| GitHub issues | GitHub connector issue creation | yes if auth permits | Created harness issues [#1](https://github.com/oleksandr-rud/cascade-codex/issues/1), [#2](https://github.com/oleksandr-rud/cascade-codex/issues/2), and [#3](https://github.com/oleksandr-rud/cascade-codex/issues/3); corrected #1 notes to keep follow-ups harness-only; closed project-specific [#4](https://github.com/oleksandr-rud/cascade-codex/issues/4) as not planned |
