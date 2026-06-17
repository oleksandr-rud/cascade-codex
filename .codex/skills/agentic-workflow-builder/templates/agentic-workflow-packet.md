# Agentic Workflow Packet

Status: `<draft | ready | blocked | superseded>`
Created: YYYY-MM-DD
Workflow: `<workflow-or-lane-id>`

## Objective

`<one measurable outcome>`

## Agent And Global Skill Inventory

Use this section before selecting the workflow. Do not invent dynamic agents.

### Available Agents

| Agent Or Subagent Route | Manifest | Role Contract | Skill Map | Role Checklists | Use In Workflow |
|---|---|---|---|---|---|
| `<agent>` | `.codex/agents/<agent>.toml` | `.codex/agents/<agent>/AGENT.md` | `.codex/agents/<agent>/skills.yaml` | `<paths-or-none>` | `<selected-rejected-why>` |

### Relevant Global Skills

| Skill | Source | Trigger Reason | Planned Step Calls |
|---|---|---|---|
| `<skill>` | `.codex/skills/<skill>/SKILL.md` | `<why-this-skill-loads>` | `<step-ids>` |

## Workflow Checklist

Each step should point to existing agents or authorized subagents and the
global skills to use at that step.

| Step | Status | Owner Route | Skill Calls | Source Order | Delegation Prompt | Output | Validation | Handoff |
|---|---|---|---|---|---|---|---|---|
| `WF-01` | `<open>` | `<agent-or-subagent>` | `<skill-a, skill-b>` | `<paths-inputs>` | `P-01` | `<artifact>` | `<check>` | `<next-step>` |

## Global Orchestration Skill Calls

| Gate | Skill | When To Call | Required Output |
|---|---|---|---|
| context | `context` | `<start-or-resume-condition>` | `<snapshot-or-skip-reason>` |
| routing | `orchestrate-work` | `<split-serialize-merge-condition>` | `<lane-model>` |
| impact | `docs-impact-map` | `<cross-doc-condition>` | `<impact-matrix>` |
| planning | `plan-change` | `<implementation-condition>` | `<plan>` |
| acceptance | `functional-qa` | `<product-visible-condition>` | `<acceptance-plan>` |
| validation | `validate-change` | `<evidence-condition>` | `<validation-summary>` |
| closeout | `closeout` | `<finish-or-handoff-condition>` | `<handoff-or-thin-diff>` |

## Delegation Prompt Bank

### P-01: `<agent-or-subagent-route>`

Role:

- Agent: `<agent-name>`
- Role contract: `.codex/agents/<agent>/AGENT.md`
- Manifest: `.codex/agents/<agent>.toml`
- Skill map: `.codex/agents/<agent>/skills.yaml`

## Prompt

```text
<agent-facing prompt>
```

## Source Order

1. `<path-or-input>`
2. `<path-or-input>`
3. `<path-or-input>`

## Allowed Skills

| Skill | Source | Reason |
|---|---|---|
| `<skill>` | `.codex/skills/<skill>/SKILL.md` | `<why-needed>` |

## Step Checklist For This Prompt

- [ ] Load the role contract and selected skill files.
- [ ] Follow the step source order.
- [ ] Produce the required output artifact.
- [ ] Record validation evidence or blocker.
- [ ] Hand off to the named next step.

## Role Checklists

- `<path-or-inline-checklist-or-none>`

## Write Scope

Allowed:

- `<path-or-area>`

Forbidden:

- `<path-or-area>`

## Validation

| Evidence | Command Or Check | Required? | Status |
|---|---|---|---|
| `<evidence>` | `<command-or-check>` | `<yes-no>` | `<open>` |

## Handoff

- Output artifacts:
- Status terms: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, `BLOCKED`
- Merge owner:
- Merge target:
- Conflict paths:

## Stop Rules

- Stop for missing required source.
- Stop for unauthorized external write, live delegation, dynamic agent
  creation, or destructive action.
- Stop when validation is blocked by missing preconditions.
- Stop when the packet output contract is complete.

## Execution Guidance

- Serialized steps:
- Parallel-safe steps:
- Merge owner:
- Approval points:
- Next route:
