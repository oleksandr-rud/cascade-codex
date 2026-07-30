# Agentic Workflow Packet

Status: `<draft | ready | blocked | superseded>`
Created: YYYY-MM-DD
Workflow: `<workflow-or-lane-id>`

## Dispatch Manifest

Packet readiness is not execution authorization.

| Step Or Lane | Execution Surface | Dispatch State | Authorization Evidence | Runtime Handle | Dependency Gate | Merge Owner |
|---|---|---|---|---|---|---|
| `WF-01` | `<root | internal-subagent | user-visible-task>` | `<NOT_AUTHORIZED | AUTHORIZED | DISPATCHED | RUNNING | BLOCKED | COMPLETE>` | `<request-or-approval-reference | none>` | `<agent-id | task-id | none>` | `<gate>` | `<owner>` |

`internal-subagent` remains inside the current task tree.
`user-visible-task` requires an explicit user request to create, open, or fork
separate tasks or threads.

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

## Graph Fragment Composition

Use the selected planning ledger when available. Otherwise evaluate materially
plausible definitions under `docs/patterns/workflow/fragments/`. This packet
projects selected obligations into skill calls; it does not become active graph
authority.

| Fragment Instance / Source Version | Disposition / Reason | Bound Requires / Provides | Owning Workline | Resolved Role / Worker | Skill Calls | Tests / Evaluator | Omission Consequence |
|---|---|---|---|---|---|---|---|
| `FI-01 / GF-001@1` | `<SELECTED_MERGED_NOT_APPLICABLE_BLOCKED>` | `<PORT_BINDINGS>` | `<WL-ID>` | `<ROLE_OR_ROUTE>` | `<SKILLS_AND_CONDITIONS>` | `<TESTS_AUTHORITY>` | `<NONE_OR_GAP>` |

- Emission handoff: `<ATOMIC_NO_GRAPH | LANE_LOCAL_TASK_GRAPH | COORDINATION_GRAPH>`
- Active graph authority path or next owner: `<PATH_OWNER_OR_NONE>`
- Rejected bindings or unsupported capabilities:

## Workline Discovery

Do not begin with a requested or default count. Derive candidates from the
objective, criteria, boundaries, writes, dependencies, and evidence seams.

| Candidate | Outcome | Primary Criteria | Write / Contract Boundary | Dependencies | Validation Seam | Disposition / Reason |
|---|---|---|---|---|---|---|
| `C-01` | `<OUTCOME>` | `<IDS>` | `<BOUNDARY>` | `<IDS_OR_NONE>` | `<CHECK>` | `<SELECT_MERGE_SERIALIZE_DEFER>` |

## Selected Worklines

| Workline | Fragment Instances | Outcome | Primary Criteria | Requires / Produces | Owner Route | Execution Mode | Integration / Handoff |
|---|---|---|---|---|---|---|---|
| `WL-01` | `<FI-IDS>` | `<OUTCOME>` | `<IDS>` | `<INPUTS_OUTPUTS>` | `<AGENT_OR_LOCAL>` | `<SERIAL_PARALLEL_UNASSIGNED>` | `<OWNER_TARGET>` |

## Workflow Checklist

Each step should point to existing agents or authorized subagents and the
global skills to use at that step.

| Step | Workline | Status | Owner Route | Execution Surface | Dispatch State | Skill Calls | Source Order | Delegation Prompt | Output | Validation | Handoff |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `WF-01` | `WL-01 / FI-01` | `<open>` | `<agent-or-subagent>` | `<surface>` | `<dispatch-state>` | `<skill-a, skill-b>` | `<paths-inputs>` | `P-01` | `<artifact>` | `<check>` | `<next-step>` |

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
- Integration/materialization owner:
- Integration target:
- Conflict paths:

## Stop Rules

- Stop for missing required source.
- Stop for unauthorized external write, live delegation, dynamic agent
  creation, user-visible task creation, or destructive action.
- Stop when validation is blocked by missing preconditions.
- Stop when the packet output contract is complete.

## Execution Guidance

- Serialized steps:
- Parallel-safe steps:
- Integration/materialization owner:
- Approval points:
- Next route:
