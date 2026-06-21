---
name: agentic-workflow-builder
description: Use when the user explicitly asks to build, prepare, audit, or refine an agent/skill workflow artifact such as an agentic workflow, workflow checklist, workflow packet, delegation workflow, or multi-agent workflow that inventories available agents and global skills before wiring step-level prompts, skill calls, source order, write scope, validation, handoff, and stop rules.
---

# Agentic Workflow Builder

Use when a user explicitly asks to build, prepare, audit, or refine an
agent/skill workflow artifact, such as an agentic workflow, workflow checklist,
workflow packet, delegation workflow, or multi-agent workflow made of one or
more agent role calls, specialist prompts, lane tasks, or subagent routes.

This skill produces reviewable workflow packets that use existing agents,
subagents when available and authorized, and global skills to get a request or
task done. It does not create dynamic agents, spawn agents, activate external
tools, or approve delegation by itself.

## Source Order

1. Latest user request, explicit prompts, desired agents, constraints, and
   delegation authorization.
2. Agent and global skill inventory:
   - `.codex/agents/*.toml`;
   - `.codex/agents/*/AGENT.md`;
   - `.codex/agents/*/skills.yaml`;
   - `.codex/skills/*/SKILL.md` frontmatter and names.
3. `AGENTS.md`, `CODEX.md`, and `.codex/config.toml`.
4. `.codex/agents/{agent}.toml`, `.codex/agents/{agent}/AGENT.md`, and
   `.codex/agents/{agent}/skills.yaml` for each selected agent or subagent
   route.
5. `.codex/skills/{skill}/SKILL.md` for each planned global skill call.
6. Agent checklists under `.codex/agents/{agent}/checklists/` when present.
7. `docs/patterns/workflow.md`, `docs/patterns/boundaries.md`, and
   `docs/patterns/testing.md`.
8. Relevant `docs/product/`, `docs/design/`, `docs/brand/`, `docs/specs/`,
   `docs/work/`, `docs/backlog/`, and `docs/glossary.md` sources.
9. Current diff, file ownership, validation commands, and unresolved blockers.

For the initial inventory, use file names, frontmatter, and `skills.yaml`
references to choose candidates. Read full `AGENT.md` and `SKILL.md` files only
for agents and skills selected for the workflow.

## Scope

Use this skill for:

- workflows assembled from existing agents, subagents, and global skill calls;
- implementation-oriented workflow packets only when the user asks for a
  workflow artifact; route planning, implementation, acceptance, validation,
  and closeout work to their owning skills;
- checklist-style execution plans where each step names owner, skill route,
  prompt, source inputs, output, validation, and handoff;
- prompts for specialist roles;
- subagent or delegation packet drafting;
- lane-level task packets with source order, allowed skills, validation, and
  handoff contracts;
- audits of whether agent prompts, checklists, and skills are correctly formed.

Do not use this skill just because the task involves implementation, planning,
execution, validation, or delegation; use it only when the requested artifact is
an agent/skill workflow, workflow checklist, or workflow packet. Do not use it
for product, UX, security, market, or experiment workflows unless the requested
output is an agent/skill workflow artifact that coordinates those owning skills.
Do not use this skill when a normal single-agent implementation plan is enough;
use `plan-change`. Do not use it for issue bodies; use `issue-intake`. Do not
use it to fill missing product intent; route to `discover`,
`market-validation`, `synthesis-to-spec`, or `compose-spec`.

## Workflow

1. Build the agent and global skill inventory before choosing the workflow.
   Record available agents, their skill maps, role checklists, and global
   skills relevant to the request.
2. Identify the objective, expected output, risk, required evidence, and
   whether delegation was explicitly authorized.
3. Translate the request into workflow phases. Name the global orchestration
   skill calls first, such as `context`, `orchestrate-work`,
   `docs-impact-map`, `plan-change`, `functional-qa`, `validate-change`, or
   `closeout` when those gates are needed.
   For research or source-discovery workflows, also name the coverage facets,
   evidence classes, query-vocabulary families, known-item recovery pass, and
   miss-audit gate before retrieval starts.
4. Choose the smallest static role set from existing agents or authorized
   subagents. Do not invent new dynamic agents.
5. Build a checklist-style workflow where every step has:
   - step ID and status;
   - owning agent or subagent route;
   - global skill or skills to load at that step;
   - source order;
   - delegation prompt;
   - output artifact;
   - validation or evidence;
   - handoff and stop rule.
6. Verify every selected agent has TOML, `AGENT.md`, and `skills.yaml`.
7. Verify every selected skill exists and is wired to the target agent, or mark
   it as an explicit cross-role support exception.
8. Split lanes only when they have disjoint writes, independent validation, and
   a deterministic merge owner.
   For research lanes, split by source-family coverage and evidence class as
   well as by work ownership; "enough evidence to answer" is not the same as
   "coverage complete."
9. Build the workflow packet and per-role delegation prompts using
   `templates/agentic-workflow-packet.md`.
10. Check packets with `checklists/workflow-packet-quality.md`.
11. Return the workflow checklist, delegation prompt bank, serialized or
    parallel execution guidance, validation gates, and approval points.

## Packet Rules

- The packet starts with the agent/global skill inventory used to make routing
  choices.
- Each checklist step names objective, owner route, skill calls, source order,
  prompt, output contract, validation evidence, stop rules, and handoff target.
- Each delegation prompt is written for an existing role or authorized subagent
  and names the skills it should use at specific steps.
- Each packet names exact files or folders for allowed and forbidden writes.
- Global orchestration skill calls are explicit; do not hide `context`,
  `orchestrate-work`, `docs-impact-map`, validation, or closeout gates inside
  prose.
- Product, design, brand, security, architecture, and implementation concerns
  route to their owning skills or roles only when they materially affect the
  work.
- Implementation packets must not bypass `plan-change`, `functional-qa`,
  `implement-change`, `validate-change`, or `closeout` when those gates are
  needed.
- Prompt-only rules are not enough for mechanical invariants. Route recurring
  checks to validators, hooks, schemas, permissions, or tests.
- Research workflow packets must distinguish retrieval completeness, claim
  support, and promotion readiness. Include retrieval miss audits, evidence
  class labels, and workflow weakness review when the packet can promote
  research into durable specs, prompts, policies, or runtime behavior.

## Templates

- `templates/agentic-workflow-packet.md`

## Checklists

- `checklists/workflow-packet-quality.md`

## Output

- workflow model: `single-lane`, `sequential-pipeline`, `parallel-sectioning`,
  `parallel-voting`, `orchestrator-workers`, or `evaluator-optimizer`;
- agent and global skill inventory summary;
- checklist-style workflow steps with step-level skill calls;
- delegation prompt bank for selected agents or subagents;
- parallel-safe lanes and serialized lanes with reasons;
- source inputs, allowed skills, checklists, write scope, and validation gates;
- merge owner, approval points, stop rules, and next route.
