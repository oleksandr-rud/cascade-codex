# Codex Harness Maintenance Checklist

Use before closing changes to Cascade Codex skills, agents, instruction files,
config, hooks, MCP/tool guidance, plugins, validator checks, or maintenance
templates.

## File Tree And References

- [ ] Current branch, diff, and untracked files were inspected.
- [ ] A complete non-`.git` file tree was generated with `rg --files -uu --hidden -g '!/.git/**'`.
- [ ] Every directly affected file was read fully.
- [ ] Targeted `rg -n` searches found all references to changed names, paths,
      skills, agents, commands, and stale terms.
- [ ] Generated, cache, and `.git` files were excluded from source-of-truth
      decisions.

## Surface Choice

- [ ] The change is assigned to the smallest Codex surface that fits:
      prompt/thread, `AGENTS.md`, `CODEX.md`, `.codex/config.toml`, skill,
      role contract, custom subagent, hook, command rule, MCP/tool connector,
      plugin, docs, pattern, validator, or work handoff.
- [ ] Codex audit rules were applied when the surface choice involves
      permissions, memory, observability, evals, subagents, hooks, MCP/tools,
      plugins, or handoff structure.
- [ ] `AGENTS.md` remains a thin durable repo convention file.
- [ ] Skill instructions, templates, checklists, references, and scripts are
      documented under `.codex/skills/{skill}/`.
- [ ] Native Codex skill mirrors, plugin packages, or subagent packages are
      treated as packaging targets rather than primary harness documentation.
- [ ] Project `.codex/config.toml` does not contain user-only provider,
      profile, notification, credential-routing, or telemetry settings.
- [ ] Skill changes are not disguised as agent changes.
- [ ] Cascade role contracts are not confused with Codex custom subagent files.
- [ ] Plugin, hook, and MCP guidance is added only when distribution,
      lifecycle enforcement, or live external context truly requires it.

## Skill And Agent Quality

- [ ] Every skill has `name` and trigger-focused `description` frontmatter.
- [ ] Skill source order, scope, anti-scope, outputs, artifacts, and validation
      are explicit.
- [ ] New templates or checklists prevent a real missed step.
- [ ] Agent TOML, `AGENT.md`, and `skills.yaml` agree.
- [ ] Custom subagent artifacts, when intended for spawning, include Codex
      `name`, `description`, and `developer_instructions`.
- [ ] User authorization is required before parallel delegation.
- [ ] Command approval behavior, when needed, is captured in `rules/*.rules`
      rather than only in prose.

## Handoff And Validation

- [ ] Reference inventory or handoff artifacts were written only when useful.
- [ ] Durable lessons went to the narrowest owner.
- [ ] `scripts/validate_cascade_codex.py` covers new required files, skills,
      wiring, and surface contracts.
- [ ] `python3 scripts/validate_cascade_codex.py` passed.
- [ ] `git diff --check` passed.
- [ ] Residual risks and skipped checks are named.
