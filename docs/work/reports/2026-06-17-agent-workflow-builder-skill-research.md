# Agent Workflow Builder Skill Research

Date: 2026-06-17
Status: draft
Owner route: `agent-engineer -> develop-skill -> codex-maintenance`
Source: user request to audit skill wiring and research skills for building
agent-call workflows from specific prompts, checklists, tasks, and agent skill
sets.

## Wiring Audit

Current Cascade Codex layout is intentionally central-skill, role-wired:

- reusable skills live under `.codex/skills/{skill}/SKILL.md`;
- agent folders live under `.codex/agents/{agent}/`;
- each agent folder owns `AGENT.md`, `skills.yaml`, and optional role
  checklists;
- agent folders should not contain reusable `SKILL.md` files unless the
  harness explicitly migrates to a different packaging model.

Audit result:

- agents: 6;
- skills: 35;
- wired skills: 35;
- missing `skills.yaml` sources: none;
- unwired skills: none;
- nested `SKILL.md` under `.codex/agents/`: none.

This means all current skills are wired correctly by reference from per-agent
`skills.yaml` files. The skills themselves are not supposed to be copied into
each per-agent folder.

## Imported Harness Insights Kept

Useful generic patterns from the inspected source harness:

- role folders can own role-specific checklists while reusable workflows stay
  central under `.codex/skills/`;
- workflow prompts should be packets with role, objective, source order,
  allowed skills, checklist, artifacts, validation, and stop rules;
- scenario validation should choose between executable proof and source-blind
  browser proof;
- specialist roles should not implement unless explicitly routed through
  planning and implementation;
- architecture and security work should produce findings, owner routes, and
  validation probes, not broad reports without next gates.

Product-specific source-project pieces were not carried forward as workflow-builder
requirements: MongoDB-only skills, repair-agent-specific rules, and app-specific
scenario runner commands.

## Proposed Skill

Name candidate: `agent-workflow-builder`

Owning role: `agent-engineer`

Purpose: build explicit, reviewable workflow packets for one or more agent role
calls from a user request or plan. The skill should form the prompt, checklist,
task packet, source order, allowed skills, validation, and handoff contract for
each agent lane without directly spawning or delegating unless the user
authorizes delegation.

## Trigger Contract

Use when the user asks to:

- build a workflow from agent calls;
- create prompts for multiple agents or specialist roles;
- define a role-call sequence with checklists and tasks;
- prepare subagent/delegation packets;
- turn a plan into agent-specific work packets;
- audit whether agent prompts, checklists, and skills are formed correctly.

Do not use when:

- a normal single-agent implementation plan is enough; use `plan-change`;
- the user only asks for code changes; use `implement-change` after planning;
- the work is tracker-only issue drafting; use `issue-intake`;
- product intent is missing; route to `discover`, `market-validation`,
  `synthesis-to-spec`, or `compose-spec` first.

## Required Source Order

1. Latest user request, desired agents, explicit prompts, constraints, and
   delegation authorization.
2. `AGENTS.md` and `CODEX.md`.
3. `.codex/config.toml` role registry.
4. `.codex/agents/{agent}.toml`, `AGENT.md`, and `skills.yaml` for every
   requested or inferred agent.
5. `.codex/skills/{skill}/SKILL.md` for every planned skill route.
6. Role checklists under `.codex/agents/{agent}/checklists/` when present.
7. `docs/patterns/workflow.md`, `docs/patterns/boundaries.md`, and
   `docs/patterns/testing.md`.
8. Relevant product, design, brand, spec, work, backlog, or glossary sources.
9. Current diff and validation requirements.

## Workflow Packet Shape

Each agent-call packet should include:

```yaml
agent: "<agent-name>"
role_contract: ".codex/agents/<agent>/AGENT.md"
objective: "<one measurable outcome>"
prompt: "<agent-facing prompt>"
source_order:
  - "<path-or-input>"
allowed_skills:
  - name: "<skill>"
    source: ".codex/skills/<skill>/SKILL.md"
checklists:
  - "<path-or-inline-checklist>"
write_scope:
  allowed: []
  forbidden: []
validation:
  commands: []
  evidence_required: []
handoff:
  artifacts: []
  status_terms: ["DONE", "DONE_WITH_CONCERNS", "BLOCKED"]
stop_rules:
  - "<approval-needed | blocked | done | budget>"
merge_contract:
  owner: "<agent-or-human>"
  conflict_paths: []
```

## Correctness Checks

Before returning packets, the skill should verify:

- every named agent has TOML, `AGENT.md`, and `skills.yaml`;
- every named skill exists under `.codex/skills/{skill}/SKILL.md`;
- every skill listed in a packet is present in the target agent's
  `skills.yaml`, or the packet marks it as an explicit cross-role support
  exception;
- prompts include objective, scope, source order, allowed skills, forbidden
  actions, output contract, and validation evidence;
- checklists are either existing files or concise inline checklists;
- write scopes are disjoint for parallel lanes or name one merge owner;
- security, design, product, and architecture concerns are routed to their
  specialist roles only when they materially affect the work;
- implementation prompts do not bypass `plan-change`, `functional-qa`,
  `implement-change`, `validate-change`, and `closeout` when those gates are
  needed;
- no prompt-only invariant is used for a rule that should be enforced by
  validator, hook, permission policy, schema, or test.

## Artifact Decision Matrix

| Artifact | Decision | Reason |
|---|---|---|
| `SKILL.md` | create later | Distinct repeated workflow: composing agent-call packets. |
| `templates/agent-call-packet.md` | create later | Prevents missing role, prompt, checklist, validation, and handoff fields. |
| `checklists/workflow-packet-quality.md` | create later | Reusable review gate for packet correctness. |
| `references/agent-call-patterns.md` | optional | Use only if detailed examples become bulky. |
| `scripts/validate_agent_workflow_packets.py` | optional | Useful if workflow packets become durable files. |
| validator | update when created | Register skill, template, checklist, and owning agent wiring. |

## Recommended Next Implementation

Create `agent-workflow-builder` as an `agent-engineer` skill with:

- concise `SKILL.md`;
- `templates/agent-call-packet.md`;
- `checklists/workflow-packet-quality.md`;
- wiring in `.codex/agents/agent-engineer/skills.yaml`;
- docs mention in `.codex/README.md` and `CODEX.md` optional escalations;
- validator registration for new files and trigger description.

Do not add an actual subagent runner yet. The first version should build
reviewable packets only. Live delegation remains explicit-user-approval work.
