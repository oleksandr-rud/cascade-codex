# Skill Design Brief: `<skill-name>`

Status: `<draft | reviewed | blocked | superseded>`
Date: YYYY-MM-DD
Owner role: `<agent-or-skill-owner>`
Source: `<REQUEST_OR_REPORT_OR_EXISTING_SKILL>`

## Context Inventory

| Surface | Path Or Query | Why Checked | Result |
|---|---|---|---|
| user request | `<request>` | intent | `<finding>` |
| existing skill | `<path-or-none>` | owner/collision | `<finding>` |
| adjacent skills | `<rg-query>` | trigger overlap | `<finding>` |
| owning agents | `<path>` | wiring | `<finding>` |
| route docs | `<path>` | workflow fit | `<finding>` |
| validator | `scripts/validate_cascade_codex.py` | invariants | `<finding>` |
| Context7 MCP | `<library-id + topic-or-n/a>` | latest version-specific technology docs | `<finding>` |
| Perplexity/web | `<query-or-n/a>` | first-pass approaches and best practices only | `<finding>` |

## Intent

- Problem prevented:
- Repeated task:
- Owning role:
- Target users:
- Runtime or packaging target:
- Expected outputs:
- Done condition:
- File write scope:

## Trigger Contract

| Prompt Or Situation | Should Trigger? | Route | Notes |
|---|---|---|---|
| `<example>` | `<yes-no-ambiguous>` | `<skill-or-agent>` | `<note>` |

## Ruleset

| Rule Type | Rule | Source | Status |
|---|---|---|---|
| required behavior | `<rule>` | `<source>` | `<kept-changed-new>` |
| forbidden behavior | `<rule>` | `<source>` | `<kept-changed-new>` |
| source order | `<rule>` | `<source>` | `<kept-changed-new>` |
| output contract | `<rule>` | `<source>` | `<kept-changed-new>` |
| validation gate | `<rule>` | `<source>` | `<kept-changed-new>` |

## Technology References

- Context7 library ID:
- Topic/query:
- Version or freshness signal:
- Distilled API/setup/technique facts:
- Perplexity/web discovery used only for:

## Artifact Decision Matrix

| Artifact | Decision | Why |
|---|---|---|
| `SKILL.md` | `<create-update-no-change>` | `<reason>` |
| `templates/` | `<create-update-no-change>` | `<reason>` |
| `checklists/` | `<create-update-no-change>` | `<reason>` |
| `references/` | `<create-update-no-change>` | `<reason>` |
| `scripts/` | `<create-update-no-change>` | `<reason>` |
| `assets/` | `<create-update-no-change>` | `<reason>` |
| `agents/openai.yaml` | `<create-update-no-change>` | `<reason>` |
| validator | `<create-update-no-change>` | `<reason>` |

## Validation

- Frontmatter:
- Path references:
- Agent wiring:
- Validator:
- Whitespace:
- Sample prompts:
- Forward-test status:

## Handoff

- Files changed:
- Deferred decisions:
- Next route:
