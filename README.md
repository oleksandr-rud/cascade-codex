# Cascade Codex

Cascade Codex is a standalone harness for agentic engineering. It gives coding
agents a reusable operating structure for real software work: orient to the
repository, translate fuzzy requests into behavior slices, plan before editing,
validate product-visible outcomes, repair stale tests only when behavior is
still correct, and leave useful handoff memory behind.

Use Cascade Codex when a repository needs more than a single prompt file. The
harness combines agent instructions, route maps, adapter configuration,
documentation write targets, functional acceptance patterns, work-lane tracking,
and release validation into one reusable package.

## Repository Shape

The current tree is organized around a thin boot contract, a runtime bridge, and
a durable documentation skeleton:

| Path | Purpose |
|---|---|
| `AGENTS.md` | Repository instruction entrypoint for coding agents. Keep project identity, hard guardrails, validation commands, and operating rules here. |
| `CODEX.md` | Runtime bridge that defines load order, the canonical task route, role references, work packets, and write targets. |
| `harness.config.example.yaml` | Project adapter template for stack details, paths, validation commands, routing, memory, and tracker settings. Copy it to `harness.config.yaml` in a target project. |
| `docs/structure.md` | Folder map for where specs, product facts, design facts, active work, patterns, and architecture notes belong. |
| `docs/_index.md` | Top-level documentation index and source-of-truth rule. |
| `docs/work/` | Active work registry, lane template, copyable lane examples, lane packets, reports, and handoffs. |
| `docs/specs/` | Incoming source material and transformed plan-ready specs. |
| `docs/product/` | Product requirements, journeys, personas, and scenario examples. |
| `docs/design/` | Interaction model, tokens, components, accessibility, and design constraints. |
| `docs/brand/` | Naming, voice, content, and product-language references. |
| `docs/backlog/` | Follow-up candidates with acceptance criteria. |
| `docs/glossary.md` | Codebase vocabulary and project terms. |
| `docs/patterns/` | Reusable workflow, boundary, testing, and context-memory rules. |
| `scripts/validate_cascade_codex.py` | Packaging and consistency validator for a complete Cascade Codex distribution. |

`CODEX.md`, `docs/structure.md`, `docs/patterns/`, and the validator also
reserve `.codex/skills/` and `.codex/agents/` as the canonical locations for
reusable workflow skills and role contracts in a complete release package.

## Core Workflow

Cascade Codex routes non-atomic engineering work through this path:

```text
context -> ingest-spec/discover if needed -> docs-impact-map when durable docs may affect sibling rules -> orchestrate-work -> plan-change -> functional-qa -> implement-change -> review-change -> validate-change -> test-autorepair only if stale tests -> closeout
```

Use `issue-intake` only for issue bodies or tracker tickets. Use
`test-autorepair` only when automated tests are stale, flaky, or failing while
the product behavior still matches the intended contract.

For discovery-heavy work, use:

```text
discover -> ingest-spec -> docs-impact-map -> plan-change -> functional-qa
```

## Install In A Target Repository

1. Copy the Cascade Codex files into the target repository root.
2. Copy `harness.config.example.yaml` to `harness.config.yaml`.
3. Fill in the target project's stack, source roots, test roots, public
   contracts, validation commands, tracker settings, and memory paths.
4. Replace placeholders in `AGENTS.md`, `docs/glossary.md`,
   `docs/patterns/boundaries.md`, and any product/design/spec docs that should
   guide future work.
5. Add the release-bundle `.codex/skills/` and `.codex/agents/` assets when the
   target runtime should load reusable Cascade Codex skills or role contracts.
6. Run `python3 scripts/validate_cascade_codex.py` from the repository root
   after the full package is present.

## Where Content Belongs

Keep project-specific facts in:

- `harness.config.yaml`
- `AGENTS.md`
- `docs/glossary.md`
- `docs/product/`
- `docs/design/`
- `docs/brand/`
- `docs/specs/`
- `docs/work/`

Keep reusable agentic engineering rules in:

- `.codex/skills/`
- `.codex/agents/`
- `docs/patterns/`

## Validation

The validator checks for required harness files, expected skill and role assets,
canonical route tokens, TOML validity, stale naming, and project-specific
leakage. A complete Cascade Codex release should pass:

```bash
python3 scripts/validate_cascade_codex.py
```

Run repository-specific install, test, typecheck, lint, build, functional, and
end-to-end commands from the values filled into `harness.config.yaml`.
