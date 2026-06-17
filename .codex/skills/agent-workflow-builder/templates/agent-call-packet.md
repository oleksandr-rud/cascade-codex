# Agent Call Packet

Status: `<draft | ready | blocked | superseded>`
Created: YYYY-MM-DD
Workflow: `<workflow-or-lane-id>`

## Role

- Agent: `<agent-name>`
- Role contract: `.codex/agents/<agent>/AGENT.md`
- Manifest: `.codex/agents/<agent>.toml`
- Skill map: `.codex/agents/<agent>/skills.yaml`

## Objective

`<one measurable outcome>`

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

## Checklists

- `<path-or-inline-checklist>`

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
- Stop for unauthorized external write, live delegation, or destructive action.
- Stop when validation is blocked by missing preconditions.
- Stop when the packet output contract is complete.
