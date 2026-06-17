---
name: agent-workflow-builder
description: Use to build agent-call workflow packets from a request, plan, or prompts, wiring agents, skills, checklists, source order, write scope, validation, and handoff rules.
---

# Agent Workflow Builder

Use when a user asks to build, audit, or refine a workflow made of one or more
agent role calls, specialist prompts, checklists, tasks, or subagent/delegation
packets.

This skill produces reviewable workflow packets. It does not spawn agents,
activate external tools, or approve delegation by itself.

## Source Order

1. Latest user request, explicit prompts, desired agents, constraints, and
   delegation authorization.
2. `AGENTS.md`, `CODEX.md`, and `.codex/config.toml`.
3. `.codex/agents/{agent}.toml`, `.codex/agents/{agent}/AGENT.md`, and
   `.codex/agents/{agent}/skills.yaml` for each requested or inferred agent.
4. `.codex/skills/{skill}/SKILL.md` for each planned skill route.
5. Agent checklists under `.codex/agents/{agent}/checklists/` when present.
6. `docs/patterns/workflow.md`, `docs/patterns/boundaries.md`, and
   `docs/patterns/testing.md`.
7. Relevant `docs/product/`, `docs/design/`, `docs/brand/`, `docs/specs/`,
   `docs/work/`, `docs/backlog/`, and `docs/glossary.md` sources.
8. Current diff, file ownership, validation commands, and unresolved blockers.

## Scope

Use this skill for:

- workflows assembled from multiple agent role calls;
- prompts for specialist roles;
- subagent or delegation packet drafting;
- lane-level task packets with source order, allowed skills, validation, and
  handoff contracts;
- audits of whether agent prompts, checklists, and skills are correctly formed.

Do not use this skill when a normal single-agent implementation plan is enough;
use `plan-change`. Do not use it for issue bodies; use `issue-intake`. Do not
use it to fill missing product intent; route to `discover`,
`market-validation`, `synthesis-to-spec`, or `compose-spec`.

## Workflow

1. Identify the objective, expected output, risk, and whether delegation was
   explicitly authorized.
2. Choose the smallest role set. Prefer local role contracts over spawned
   agents unless the user explicitly asks for delegated work.
3. Verify every selected agent has TOML, `AGENT.md`, and `skills.yaml`.
4. Verify every selected skill exists and is wired to the target agent, or mark
   it as an explicit cross-role support exception.
5. Split lanes only when they have disjoint writes, independent validation, and
   a deterministic merge owner.
6. Build one packet per role call using `templates/agent-call-packet.md`.
7. Check packets with `checklists/workflow-packet-quality.md`.
8. Return packets plus serialized or parallel execution guidance and approval
   points.

## Packet Rules

- Each prompt names objective, scope, source order, allowed skills, forbidden
  actions, output contract, validation evidence, stop rules, and handoff target.
- Each packet names exact files or folders for allowed and forbidden writes.
- Product, design, brand, security, architecture, and implementation concerns
  route to their owning skills or roles only when they materially affect the
  work.
- Implementation packets must not bypass `plan-change`, `functional-qa`,
  `implement-change`, `validate-change`, or `closeout` when those gates are
  needed.
- Prompt-only rules are not enough for mechanical invariants. Route recurring
  checks to validators, hooks, schemas, permissions, or tests.

## Templates

- `templates/agent-call-packet.md`

## Checklists

- `checklists/workflow-packet-quality.md`

## Output

- workflow model: `single-lane`, `sequential-pipeline`, `parallel-sectioning`,
  `parallel-voting`, `orchestrator-workers`, or `evaluator-optimizer`;
- agent-call packets;
- parallel-safe lanes and serialized lanes with reasons;
- source inputs, allowed skills, checklists, write scope, and validation gates;
- merge owner, approval points, stop rules, and next route.
