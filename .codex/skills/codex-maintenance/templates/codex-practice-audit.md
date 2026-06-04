# Codex Best-Practices Audit

Date: YYYY-MM-DD

## Request

- User request:
- Selected text or source:
- Non-goals:

## Surface Decision

| Proposed Change | Owner Surface | Why This Surface | Why Not Another |
|---|---|---|---|
| `<change>` | `<surface>` | `<reason>` | `<tradeoff>` |

## Provider-Neutral Rule Applied

| Rule | Applied As | Evidence |
|---|---|---|
| Objective, autonomy, risk, state, tool, validation | `<mapping>` | `<source>` |
| Model proposes; harness enforces | `<mapping>` | `<source>` |
| Narrow tool contracts | `<mapping>` | `<source>` |
| Scoped memory and retrieval | `<mapping>` | `<source>` |
| Observable validation | `<mapping>` | `<source>` |

## Codex Structure Check

| Surface | Required Path Or Contract | Status |
|---|---|---|
| Instructions | `AGENTS.md` | `<ok-gap>` |
| Runtime bridge | `CODEX.md` | `<ok-gap>` |
| Project config | `.codex/config.toml`; trusted project-safe keys only | `<ok-gap>` |
| Cascade harness skills | `.codex/skills/<skill>/SKILL.md`, bundled resources, and owning `skills.yaml` | `<ok-gap>` |
| Skill package mapping | native Codex mirror or plugin-packaged copy, only when explicitly required | `<ok-gap>` |
| Skill app metadata | `agents/openai.yaml` when UI metadata, invocation policy, or tool dependency declaration is needed | `<ok-gap>` |
| Cascade agents | `.codex/agents/{name}.toml`, `AGENT.md`, `skills.yaml` | `<ok-gap>` |
| Spawnable custom agents | top-level `name`, `description`, `developer_instructions` | `<ok-gap>` |
| Hooks | `hooks.json` or inline `[hooks]`; trust-review state named | `<ok-gap>` |
| Command rules | `rules/*.rules` beside an active config layer | `<ok-gap>` |
| MCP or tools | `<tool-contract>` | `<ok-gap>` |
| Plugin package | `.codex-plugin/plugin.json` and optional `.agents/plugins/marketplace.json` | `<ok-gap>` |
| Validator | `scripts/validate_cascade_codex.py` | `<ok-gap>` |

## Official Codex Evidence

| Claim | Manual Section Or Source | Evidence Status |
|---|---|---|
| Skill discovery or packaging | Agent Skills / Build plugins | `<verified-gap>` |
| Instruction discovery | Custom instructions with AGENTS.md | `<verified-gap>` |
| Project config limits | Config basics / Advanced Configuration | `<verified-gap>` |
| MCP/tool configuration | Model Context Protocol | `<verified-gap>` |
| Rules or approvals | Rules / Agent approvals and security | `<verified-gap>` |
| Hook lifecycle | Hooks | `<verified-gap>` |
| Subagent schema | Subagents | `<verified-gap>` |

## Context Sources

| Source Type | Path | Needed For | Current Enough |
|---|---|---|---|
| Specs | `docs/specs/` | `<reason>` | `<yes-no>` |
| Product | `docs/product/` | `<reason>` | `<yes-no>` |
| Design | `docs/design/` | `<reason>` | `<yes-no>` |
| Brand | `docs/brand/` | `<reason>` | `<yes-no>` |
| Work | `docs/work/` | `<reason>` | `<yes-no>` |
| Backlog | `docs/backlog/_index.md` | `<reason>` | `<yes-no>` |

## Findings

- Gap:
- Recommendation:
- Minimal change:
- Validation signal:
- Handoff or follow-up:
