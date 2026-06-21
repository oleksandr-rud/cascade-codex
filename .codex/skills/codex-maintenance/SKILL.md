---
name: codex-maintenance
description: Use when changing or auditing Cascade surfaces such as skills, agents, AGENTS.md, CODEX.md, .codex/config.toml, hooks, MCP/tool guidance, memory, observability, evals, handoffs, file trees, or validators.
---

# Codex Maintenance

Use this skill when maintaining Cascade itself, auditing Codex surface
choices, or changing Codex-specific surfaces: `AGENTS.md`, `CODEX.md`,
`.codex/config.toml`, `.codex/skills/`, `.codex/agents/`, hooks, MCP/tool
guidance, plugin guidance, permissions, memory, observability, evals, scope,
validator wiring, or docs that define how Codex agents gather context and hand
off work.

This skill keeps harness maintenance grounded in current Codex behavior while
preserving Cascade's local role contracts, templates, rules, invariants,
checklists, and validation gates. It does not patch product/runtime code unless
the user explicitly redirects the work through `implement-change`.

## Source Order

1. Latest user request, selected text, active goal, and explicit constraints.
2. Current branch, diff, untracked files, and recent local edits.
3. Complete file tree and reference inventory:
   - `rg --files -uu --hidden -g '!/.git/**'`
   - `git status --short`
   - targeted `rg -n` searches for each skill, agent, path, command, or stale
     reference being changed.
4. Current Cascade surfaces:
   - `AGENTS.md`
   - `CODEX.md`
   - `.codex/README.md`
   - `.codex/config.toml`
   - `.codex/skills/*/SKILL.md`
   - `.codex/agents/*.toml`
   - `.codex/agents/*/AGENT.md`
   - `.codex/agents/*/skills.yaml`
   - `docs/structure.md`
   - `docs/patterns/*`
   - `docs/work/active.md`
   - `docs/specs/`
   - `docs/product/`
   - `docs/design/`
   - `docs/brand/`
   - `docs/backlog/_index.md`
   - `scripts/validate_cascade_codex.py`
5. Official Codex guidance when Codex behavior or file placement matters:
   - best practices;
   - skills;
   - `AGENTS.md`;
   - project `.codex/config.toml`;
   - MCP/tool configuration;
   - rules and permission policies;
   - hooks;
   - plugins;
   - subagents and custom agent files.
6. `agents-best-practices` for provider-neutral harness invariants before
   adapting them to Codex/Cascade surfaces.
7. Existing templates, checklists, and validator invariants before adding new
   artifacts.

## Surface Decision Rules

- Prompt or current thread: one-off task constraints and temporary context.
- `AGENTS.md`: durable repo conventions, commands, verification steps, review
  expectations, and thin pointers only.
- `CODEX.md`: Cascade route, role references, work packet rules, and write
  targets.
- `.codex/config.toml`: trusted project-scoped Codex settings plus Cascade
  Codex registry values. Do not place user-only provider, credential,
  notification, profile, or telemetry settings here.
- Skill: reusable workflow with trigger, anti-trigger, source order, outputs,
  artifacts, templates, checklists, and validation rules. In Cascade,
  document and maintain skills under `.codex/skills/`. Treat native Codex
  repo-skill or plugin layouts as packaging targets, not the primary harness
  documentation surface.
- Agent role contract: local Cascade role behavior in
  `.codex/agents/{name}/AGENT.md`, with TOML identity/wiring and `skills.yaml`.
- Codex custom subagent: standalone TOML intended for spawned sessions; require
  top-level Codex-compatible `name`, `description`, and
  `developer_instructions` when the artifact is meant to be spawned by Codex
  rather than used as a local role contract.
- Hook: lifecycle enforcement around tool calls, prompts, compaction, subagent
  starts/stops, or turn-stop events. Use `hooks.json` or inline `[hooks]` next
  to an active config layer; project hooks load only for trusted projects.
- Rule: command approval policy in `rules/*.rules` next to an active config
  layer when the need is controlling commands outside the sandbox.
- MCP server or connector: live external data, private workspace context, or
  authorized tools. Configure MCP servers in `config.toml` with narrow tool
  allow/deny lists and per-tool approval modes when needed.
- Plugin: installable distribution bundle for skills plus optional MCP, hooks,
  app integrations, or marketplace metadata. Plugin packages require
  `.codex-plugin/plugin.json`; repo-local marketplace entries live under
  `.agents/plugins/marketplace.json`.
- Docs/patterns: reusable project-neutral rules that do not belong to one skill
  or role.
- Validator: mechanical checks for required files, stale paths, registered
  skills, agent wiring, surface contracts, and packaging invariants.

## Codex Audit Rules

For every proposed Codex surface, record:

- objective;
- autonomy level;
- risk level;
- state duration;
- tool surface;
- permission gate;
- validation signal;
- owning file or artifact.

Apply these rules before approving a harness design or file change:

- Separate model responsibility from harness responsibility. The model can
  propose and explain; schemas, permissions, hooks, tests, and validators
  enforce.
- Do not rely on prompt text for a rule that must always hold. Put durable
  enforcement in `.codex/config.toml`, a hook, a tool contract, or
  `scripts/validate_cascade_codex.py`.
- Keep tool contracts narrow: typed inputs, typed results, explicit error
  states, permission checks, and source links for live or private data.
- Make each skill trigger-focused. The description should say when to load it,
  not summarize every rule inside it.
- Keep skills progressively disclosed. Add references, templates, checklists,
  or scripts only when they prevent a real missed step or make validation
  deterministic.
- Keep `AGENTS.md` thin. Route inventories, long architecture notes, product
  facts, learned rules, and active work to the dedicated docs tree.
- Treat memory as scoped context, not authority. Required team rules belong in
  tracked files; memory can point to them or summarize recent state.
- Define compaction and rehydration paths when a workflow spans enough context
  to lose source references. Handoffs must name the source files that matter.
- Require source paths for product-sensitive work. Skills that benefit from
  product specs must name the relevant `docs/specs/`, `docs/product/`,
  `docs/design/`, `docs/brand/`, `docs/work/`, and backlog sources.
- Use the shared Doc Routing Decision Matrix in `docs/patterns/workflow.md`
  when a harness change creates, changes, validates, or closes out durable
  facts across product, design, brand, specs, backlog, glossary, patterns,
  skills, agents, config, or validator wiring.
- Add planning loops only when objective, budget, checkpoint cadence, and done
  condition are clear.
- Prefer direct replacement of stale names, paths, and routes unless a live
  compatibility contract requires a temporary bridge.
- Add observability before autonomy grows: command evidence, validator output,
  traceable tool calls, failure probes, evals, and launch gates.
- Keep handoffs scoped: changed surfaces, reference inventory, validation
  evidence, unresolved risks, and next workflow entry. A handoff never replaces
  the source docs it cites.

## Codex Structure Invariants

- Every new skill has `SKILL.md` frontmatter with `name` and trigger-focused
  `description`.
- Every skill used by an agent appears in that agent's `skills.yaml` with an
  existing `source` path.
- Every Cascade agent has TOML identity, `AGENT.md`, `skills.yaml`, delegation
  policy, use scope, and avoid scope.
- Skill, agent, config, hook, MCP, plugin, subagent, and docs changes update
  `scripts/validate_cascade_codex.py` when they add a required surface or
  invariant.
- File-tree and reference inventories are required for changes that can miss
  skills, agents, templates, docs, specs, work lanes, tools, or validator
  references.
- Product/spec/design/brand/backlog context must stay separated by source:
  product facts in `docs/product/`, design facts in `docs/design/`, brand facts
  in `docs/brand/`, normalized specs in `docs/specs/{slice-slug}/`, raw sources
  in `docs/specs/source/`, execution state in `docs/work/`, and candidates
  in `docs/backlog/_index.md`.
- Shared doc routing decisions live in `docs/patterns/workflow.md`; reusable
  closeout matrices use `.codex/skills/closeout/templates/doc-routing-decision.md`.

## Codex Documentation Basis

Use current official Codex guidance as the external source of truth for Codex
behavior and surface choice:

- Best practices: start with task context, keep durable guidance in
  `AGENTS.md`, configure Codex for the workflow, turn repeated work into
  skills, and validate/review changes.
- Skills: keep each skill focused, make the description trigger-focused for
  implicit invocation, use `SKILL.md` as the primary contract, keep optional
  `agents/openai.yaml` metadata aligned when present, and add scripts only when
  deterministic tooling is needed. Cascade documents harness skills under
  `.codex/skills/`; if a skill must be mirrored into native Codex repo-skill or
  plugin packaging, record that as a packaging/migration decision.
- `AGENTS.md`: keep durable repo guidance concise, practical, and scoped by
  directory precedence. Codex loads global and project instructions once per
  run/session, closest files override broader files, and large instruction
  chains can hit `project_doc_max_bytes`.
- Config: keep project-scoped Codex settings in trusted project config and
  personal defaults outside the repo. Project `.codex/config.toml` cannot own
  provider credentials, provider routing, profiles, notification commands, or
  telemetry settings; keep those in user/system config.
- MCP/tools: use connectors or MCP servers for live external data or actions;
  keep server instructions narrow, configure tools in `config.toml`, and use
  allow/deny plus approval modes for sensitive tools.
- Rules: use `rules/*.rules` for command approval policy outside the sandbox;
  do not model command allow/deny behavior as prose-only skill guidance.
- Hooks: use lifecycle hooks for mechanical enforcement around tool use,
  prompts, compaction, subagent starts/stops, or turn-stop events. Project
  hooks require trusted project config and changed hooks require trust review.
- Plugins: use plugins when skills need distribution, bundled MCP, hooks, app
  integrations, or marketplace metadata. Start with local skills while
  iterating; package with `.codex-plugin/plugin.json` when distribution is the
  requirement.
- Subagents: use narrow custom agents for explicit delegated work; avoid
  recursive or broad fan-out unless the user asks and the work is parallel-safe.
  Spawnable custom agent TOML uses top-level `name`, `description`, and
  `developer_instructions`.

Compatibility invariant: maintain the current Cascade `.codex/skills/`
and `.codex/agents/` harness layout unless the user explicitly requests a
layout migration. When building a distributable plugin, native Codex skill
mirror, or spawnable custom subagent package, keep `.codex/skills/` as the
documented source unless the requested output is explicitly a layout migration.

## Maintenance Checklist

1. Build the file tree and reference inventory before editing.
2. Classify the requested change by Codex surface and Cascade owner.
3. Read every directly affected file fully, plus every reference discovered by
   targeted search.
4. Preserve existing templates, checklists, rules, and validator invariants
   unless the change explicitly replaces them.
5. For skill changes:
   - verify `name` and `description` frontmatter;
   - keep the description trigger-focused for implicit invocation;
   - define source order, scope, anti-scope, outputs, artifacts, and validation;
   - document skill instructions, templates, checklists, references, and
     scripts under `.codex/skills/{skill}/`;
   - when a skill must also be packaged elsewhere, document the package mapping
     instead of moving the source skill docs;
   - add templates, checklists, references, or scripts only when they prevent a
     real missed step;
   - wire the skill into the owning agent's `skills.yaml`;
   - register it in `scripts/validate_cascade_codex.py`.
6. For agent changes:
   - distinguish Cascade role contracts from Codex custom subagents;
   - use top-level `name`, `description`, and `developer_instructions` only for
     spawnable Codex custom-agent TOML;
   - update TOML, `AGENT.md`, `skills.yaml`, docs, and validator checks
     together;
   - avoid adding a new agent when a skill cleanly owns the repeated workflow;
   - require explicit user authorization before parallel delegation.
7. For tools, MCP, hooks, plugins, or config:
   - keep tool surfaces narrow and permissioned;
   - document where configuration lives;
   - keep user-only provider, profile, notification, and telemetry settings out
     of project `.codex/config.toml`;
   - use `rules/*.rules` for command approval policy outside the sandbox;
   - prefer hooks only for mechanical lifecycle enforcement;
   - prefer plugins only when distribution or bundled integrations are needed.
8. Record handoff artifacts only when useful: reference inventory, surface
   decision, changed files, validation evidence, unresolved risks, and next
   workflow entry.
9. Validate with the Cascade validator, path/reference searches, TOML
   parsing, and `git diff --check`.

## Required Artifacts

Use `templates/reference-inventory.md` when a maintenance request can miss files,
specs, agents, skills, templates, scripts, or docs.

Use `templates/codex-practice-audit.md` when the result should persist as a
reviewable best-practices finding, handoff input, or maintenance decision.

Use `templates/maintenance-handoff.md` when work spans turns, changes a
validator or role contract, leaves unresolved follow-up, or needs a durable
handoff.

Use `checklists/harness-maintenance.md` before closing non-trivial skill,
agent, tool, hook, plugin, MCP, validator, or instruction-surface changes.

Use `checklists/codex-surface-quality.md` before closing a non-trivial Codex
surface design or audit.

## Output

- Codex surface decision and rationale;
- file tree and reference inventory summary;
- provider-neutral rule applied and Codex-specific structure rule applied;
- skill/agent/tool/config artifacts changed;
- missing file paths, templates, rules, invariants, or validator updates
  preserved or added;
- validation commands and results;
- handoff, unresolved risks, or next workflow entry.
