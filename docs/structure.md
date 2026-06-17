# Harness Structure And Write Targets

Use this file as the Cascade folder map. Keep project facts in docs and
config; keep reusable workflow rules in skills, agents, and patterns.

## Core Folders

| Folder | Purpose | Written By |
|---|---|---|
| `docs/work/` | Active work lanes, copyable lane examples, lane packets, reports, handoffs | `orchestrate-work`, `market-validation`, `plan-change`, `validate-change`, `closeout` |
| `docs/specs/` | Incoming and transformed specs | `ingest-spec`, `synthesis-to-spec`, `compose-spec`, `discover`, `docs-impact-map`, `adapt-harness` |
| `docs/product/` | Product intent, requirements, journeys, personas, scenarios | `discover`, `market-validation`, `synthesis-to-spec`, `compose-spec`, `ingest-spec`, `docs-impact-map` |
| `docs/design/` | Interaction model, tokens, components, design constraints | `discover`, `design-system`, `ingest-spec`, `docs-impact-map` |
| `docs/brand/` | Naming, tone, content, visual direction | `discover`, `brand-positioning`, `ingest-spec`, `docs-impact-map` |
| `docs/backlog/` | Follow-up candidates with acceptance criteria | `discover`, `synthesis-to-spec`, `compose-spec`, `validation-experiments`, `docs-impact-map`, `issue-intake`, `closeout` |
| `docs/patterns/` | Reusable workflow, boundary, testing, context rules | `closeout`, `adapt-harness`, Agent Engineer skills |
| `.codex/skills/` | Reusable workflow skills | `develop-skill`, Agent Engineer skills |
| `.codex/agents/` | Role contracts and skill maps | Agent Engineer skills |

## Active Work Paths

- Active registry: `docs/work/active.md`
- Lane template: `docs/work/lane-template.md`
- Lane examples: `docs/work/examples/`
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
- Domain-owned product folders under `docs/product/<domain>/` are allowed only
  when the target repo already uses or explicitly defines that catalog shape;
  otherwise use the flat required owner docs.
- Interaction, accessibility, component, token, and design constraints:
  `docs/design/`
- Naming, tone, content, and visual direction: `docs/brand/`
- Active work lane: `docs/work/active.md` or `docs/work/lanes/W-XXX-slug.md`
- Codebase vocabulary: `docs/glossary.md`

## Business Analysis Paths

- Market validation reports and research lane outputs: `docs/work/reports/`
  when requested, multi-turn, blocked, or decision-heavy.
- Plan-ready product synthesis and authoring: existing owner docs under
  `docs/product/`, `docs/specs/transformed/`, and `docs/backlog/_index.md`.
- Source preservation: `docs/specs/incoming/` only when `ingest-spec` decides a
  raw research or source packet should be preserved.
- Doc routing: use the shared Doc Routing Decision Matrix before appending
  durable market, product, spec, design, brand, backlog, glossary, or pattern
  facts.

## Cross-Folder Impact Paths

Use `docs-impact-map` when a durable product, design, brand, spec, backlog,
glossary, or pattern fact may affect sibling docs. Store compact impact reports
under `docs/work/reports/` only when requested, multi-turn, blocked, or
decision-heavy; otherwise update the smallest existing owner docs.

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

## Closeout Thin Diffs

At task finishing, `closeout` may append small sourced deltas to existing owner
docs when the final diff changed durable facts:

- product/spec/design/brand facts: `docs/product/`, `docs/design/`,
  `docs/brand/`, or `docs/specs/`
- architecture, public contract, adapter, state-machine, or runtime invariant:
  `docs/patterns/boundaries.md`
- stack, command, source root, runner, tracker, or memory path:
  `harness.config.yaml` in target repositories
- codebase vocabulary: `docs/glossary.md`

If no existing doc owns the delta, write a concise report under
`docs/work/reports/` and route larger discovery or spec normalization through
`discover` or `ingest-spec`.

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
