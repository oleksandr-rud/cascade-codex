# Harness Structure And Write Targets

Use this file as the Cascade Codex folder map. Keep project facts in docs and
config; keep reusable workflow rules in skills, agents, and patterns.

## Core Folders

| Folder | Purpose | Written By |
|---|---|---|
| `docs/work/` | Active work lanes, lane packets, reports, handoffs | `orchestrate-work`, `plan-change`, `validate-change`, `closeout` |
| `docs/specs/` | Incoming and transformed specs | `ingest-spec`, `discover`, `adapt-harness` |
| `docs/product/` | Product intent, requirements, journeys, personas, scenarios | `discover`, `ingest-spec` |
| `docs/design/` | Interaction model, tokens, components, design constraints | `discover`, `ingest-spec` |
| `docs/brand/` | Naming, tone, content, visual direction | `discover`, `ingest-spec` |
| `docs/backlog/` | Follow-up candidates with acceptance criteria | `discover`, `issue-intake`, `closeout` |
| `docs/patterns/` | Reusable workflow, boundary, testing, context rules | `closeout`, `adapt-harness`, Agent Engineer skills |
| `.codex/skills/` | Reusable workflow skills | `develop-skill`, Agent Engineer skills |
| `.codex/agents/` | Role contracts and skill maps | Agent Engineer skills |

## Active Work Paths

- Active registry: `docs/work/active.md`
- Lane template: `docs/work/lane-template.md`
- Lane packets: `docs/work/lanes/W-XXX-slug.md`
- Durable reports: `docs/work/reports/YYYY-MM-DD-slug.md`

## Spec Translation Paths

- Raw/imported specs: `docs/specs/incoming/`; preserve only when useful for
  traceability, source comparison, or future re-normalization.
- Normalized specs: `docs/specs/transformed/`; use for plan-ready packets with
  source classification, behavior examples, acceptance checks, and open
  questions.
- Product scenarios: `docs/product/scenarios.md`
- Product intent, requirements, journeys, and personas: `docs/product/`
- Interaction, accessibility, component, token, and design constraints:
  `docs/design/`
- Naming, tone, content, and visual direction: `docs/brand/`
- Active work lane: `docs/work/active.md` or `docs/work/lanes/W-XXX-slug.md`
- Codebase vocabulary: `docs/glossary.md`

## Architecture Translation Paths

- Repo boot contract and hard guardrails: `AGENTS.md`
- Runtime bridge: `CODEX.md`
- Adapter variables: `harness.config.yaml`
- Codebase folder map and boundary rules: `docs/patterns/boundaries.md`
- Reusable architecture lessons: `docs/patterns/boundaries.md`
- Stack details, source roots, test roots, commands, runners, tracker settings,
  and memory locations: `harness.config.yaml`
- Project-specific architecture facts: `harness.config.yaml`,
  `docs/patterns/boundaries.md`, or `docs/glossary.md`

## Thin Entrypoint Policy

`AGENTS.md` is autoloaded. Keep it to project identity, primary users, a tiny
stack summary, hard guardrails, real validation commands, and pointers. Do not
store full dependency lists, long architecture essays, product/spec detail,
role inventories, historical decisions, or learned lessons there.

## Pattern Files

- `docs/patterns/workflow.md`
- `docs/patterns/boundaries.md`
- `docs/patterns/testing.md`
- `docs/patterns/context-memory.md`
