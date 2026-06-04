# Codex Surface Quality Checklist

Use before closing a non-trivial Codex best-practices audit or design decision.

## Objective And Scope

- [ ] Objective, user benefit, and non-goals are explicit.
- [ ] Autonomy level and human review expectations are clear.
- [ ] Risk level and blast radius are named.
- [ ] State duration is known: thread-only, work-lane, durable repo rule, or
      external tool state.

## Surface Choice

- [ ] The smallest durable surface owns the change: prompt, `AGENTS.md`,
      `CODEX.md`, `.codex/config.toml`, skill, Cascade agent, Codex custom
      subagent, hook, command rule, MCP/tool connector, plugin, docs, pattern,
      or validator.
- [ ] The rule is not enforced only by prose when a schema, permission, hook,
      tool contract, test, or validator can enforce it.
- [ ] Repeated workflows are skills before they become agents.
- [ ] Distributed integrations are plugins only when packaging, bundled MCP,
      hooks, or app integration requires it.
- [ ] Native Codex layout and Cascade compatibility layout are not conflated:
      `.agents/skills` for Codex repo-skill discovery, `.codex/skills/` for
      current Cascade harness skills, `.codex-plugin/plugin.json` for plugins.
- [ ] Project `.codex/config.toml` contains only trusted project-safe settings;
      provider credentials/routing, profiles, notification commands, and
      telemetry remain in user or system config.

## Tooling And Permissions

- [ ] Tool contracts have narrow inputs, typed outputs, explicit error states,
      and permission checks.
- [ ] MCP/tool guidance distinguishes reads, writes, external actions, and
      private context.
- [ ] Command allow/deny policy uses `rules/*.rules` when it must control
      commands outside the sandbox.
- [ ] Hooks are used only for mechanical lifecycle enforcement, with
      `hooks.json` or inline `[hooks]` next to an active config layer.
- [ ] Subagent delegation is narrow, authorized, and has a clear done
      condition.
- [ ] Spawnable custom-agent TOML uses top-level `name`, `description`, and
      `developer_instructions`.

## Context And Memory

- [ ] Required source paths are listed for specs, product, design, brand, work,
      backlog, patterns, and code.
- [ ] Memory is scoped and does not replace tracked rules.
- [ ] Compaction and rehydration paths preserve source references.
- [ ] Handoffs include source files, changed surfaces, evidence, open risks,
      and next workflow entry when useful.

## Validation And Observability

- [ ] Validator wiring covers required files, skills, agents, and surface
      contracts.
- [ ] Validation signal is concrete: command, diff check, parser, scenario,
      eval, trace, or failure probe.
- [ ] Stale names and paths were searched with targeted `rg -n`.
- [ ] Residual risks and skipped checks are named.
