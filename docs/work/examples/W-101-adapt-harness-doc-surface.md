# Work Lane: W-101 Adapt Harness Doc Surface

Status: `EXAMPLE_NON_ACTIVE`
Owner: `project-onboarder`
Created: 2026-06-04
Lane Model: `sequential-pipeline`
Next Gate: `validate-change`

## Request

Adapt Cascade to a target repository by filling project identity,
validation commands, source roots, and docs routing without changing runtime
code.

## Acceptance Criteria

- `AGENTS.md` contains target identity, stack summary, hard guardrails, and real
  validation commands.
- `harness.config.yaml` contains source roots, test roots, public contracts,
  tracker settings, and memory paths.
- `docs/structure.md` routes product, design, brand, specs, work, backlog, and
  patterns to the right owners.
- `.codex/skills/` and `.codex/agents/` references validate after adaptation.

## Scope

In:

- Harness configuration, instruction pointers, docs map, glossary seeds, and
  validation command routing.

Out:

- Product/runtime code changes.
- New delegated agents.
- External tracker ticket creation unless explicitly requested.

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| Request | Current setup request | Defines adaptation scope and non-goals | Current / high |
| Config template | `harness.config.example.yaml` | Source of required adapter fields | Current / high |
| Instructions | `AGENTS.md`, `CODEX.md` | Boot contract and workflow route | Current / high |
| Docs map | `docs/structure.md` | Write-target policy | Current / high |
| Work | `docs/work/active.md` | Active follow-up state | Current / medium |
| Code | `rg --files -uu --hidden -g '!/.git/**'` | Source roots and test roots | Current / high |

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| S-001 | Given a target repo has a frontend and API package, when adaptation runs, then config names both source roots and their validation commands. | `harness.config.yaml` diff and command list | `PASS` |
| S-002 | Given an incoming product note is found, when docs are routed, then product facts stay in `docs/product/` and execution state stays in `docs/work/`. | `docs/structure.md` and docs search | `PASS` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| `AGENTS.md` | `project-onboarder` | `write` | Keep thin; no long inventories. |
| `harness.config.yaml` | `project-onboarder` | `write` | Target-specific adapter values only. |
| `docs/structure.md` | `project-onboarder` | `write` | Folder map and write targets. |
| `.codex/skills/` | `agent-engineer` | `read` | Write only if adaptation reveals broken skill references. |
| `.codex/agents/` | `agent-engineer` | `read` | Write only if role wiring breaks. |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| `rg` | Local file inventory and reference search | `ALLOWED` | Summarize source/test roots. |
| `python3 scripts/validate_cascade_codex.py` | Harness consistency check | `ALLOWED` | Preserve pass/fail output. |
| Context7 | Optional current framework docs when target stack APIs affect commands or examples | `ALLOWED_READ_ONLY` | Record library ID, topic, and source URL; do not store raw long output. |
| Plugin-provided MCPs | Optional only when target runtime already enables a plugin | `NEEDS_CONFIG_REVIEW` | Record plugin, server, tool, and approval mode. |
| External write MCPs | Not needed | `FORBIDDEN` | Route to `issue-intake` if user asks for a ticket. |

## Plan

1. Inventory files, branch state, and target stack.
2. Fill `harness.config.yaml` and thin instruction placeholders.
3. Update docs routing only where target repo structure proves a need.
4. Run harness validator and target syntax/path checks.
5. Merge evidence into `docs/work/active.md` or closeout report.

## Parallel Dependencies

- Can run with: read-only product/design discovery.
- Must wait for: user answer only if validation commands or source roots cannot
  be inferred from code.
- Conflicts with: runtime implementation changes touching the same config/docs.

## Handoff And Merge Contract

- Handoff summary: target repo identity, changed docs/config, skipped unknowns.
- Required output: adapted instructions/config plus validation evidence.
- Merge owner: `project-onboarder`.
- Merge target: `docs/work/active.md` and final closeout note.
- Evidence to preserve: command output, unresolved placeholders, stale docs
  found by search.
- Stop condition: validator passes or blocked placeholders are explicitly named.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| Harness validator | `python3 scripts/validate_cascade_codex.py` | `PASS` |
| TOML/YAML parse | Target parser or editor syntax check | `PASS` |
| Stale names | `rg -n "<OLD_NAME>|<OLD_PATH>"` | `PASS` |

## Closeout

- Merge evidence: validator output and unresolved target placeholders.
- Report: only if setup spans turns or leaves blocked decisions.
- Remaining risk: inferred commands may be wrong until target CI confirms.
