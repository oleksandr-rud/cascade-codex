---
name: simulation-adapter
description: Define or audit a reusable action-level interface adapter for a goal-directed simulation. Use when command, HTTP, terminal, browser, desktop, mobile, or agent-response actions and observations need explicit permissions, confirmation, idempotency, error, recovery, and cleanup behavior before a simulation can run.
---

# Simulation Adapter

Create the smallest Codex-host adapter that binds normalized simulation
capabilities to tools actually available in the current task. The surface says
where work happens; the driver says Codex executes it; the adapter defines the
allowed observations and actions for one target.

## Workflow

1. Inspect the actual target and available Codex tools. Map them with
   `../simulate/references/codex-capabilities.md`; never invent or assume an
   action, capability, permission, or observation.
2. Resolve target identity, surface, `codex-host` driver capabilities, separate
   execution authority, observation outputs and their producer actions, inputs,
   risk, confirmation, idempotency, before/after-dispatch errors, recovery, and
   action-bound cleanup with its producer-bound verification observation.
3. Ask only when a missing tool, target, or permission changes feasibility or
   safety. Otherwise disclose a conservative default.
4. Use `references/adapter-prompt.md` to produce one adapter definition.
5. Validate it with the schema and validator owned by the `simulate` skill.

Keep authorization mechanical. Prompt text may describe permission but cannot
grant it. Tool availability is not authority. The run contract freezes its
allowed-action subset; the adapter binds those actions to host capabilities and
Codex executes the target tool. Observations are outputs of actions, not an
uncontrolled second call path. The adapter never chooses the goal or declares
success.
