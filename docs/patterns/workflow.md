# Workflow Patterns

Use this file for active work lanes, autonomous Orchestrator orchestration, current
work-to-source coverage, refactoring, and durable handoff memory.

## Active Work

Use `docs/work/active.md` as the single active registry. Use
`docs/work/lanes/W-XXX-slug.md` only when a row is not enough.
Use `docs/work/examples/` only as copyable reference material for first-time
lane adaptation; example lanes are not active state.

Create a lane packet when the workstream needs its own:

- acceptance criteria;
- behavior examples;
- dependency/conflict tracking;
- validation commands;
- source inputs and freshness;
- file ownership and merge owner;
- MCP/tool context policy;
- blocked/deferred handoff.

## Parallel Rules

Parallel lanes are allowed only when:

- they write disjoint files or have one merge owner;
- they do not depend on each other's unfinished output;
- they do not share unresolved product/design decisions;
- each lane has independent validation;
- each lane records any MCP/tool context it loaded and how results were
  summarized;
- evidence can be merged deterministically.

Serialize lanes when file ownership, public contracts, state machines, or
product intent overlap.

## Work-To-Source Coverage

Use this matrix during validation and closeout:

| Source criterion | Code or doc artifact | Test or check | Status | Notes |
|---|---|---|---|---|
| `<REQUEST_OR_CRITERION>` | `<FILE_OR_MODULE>` | `<COMMAND_OR_FUNCTIONAL_CHECK>` | `<PASS_FAIL_BLOCKED_NOT_RUN>` | `<NOTE>` |

Rules:

- Use only the latest request and directly relevant current work/spec criteria.
- Do not pull completed or unrelated historical lanes into the matrix.
- Mark missing required coverage as `FAIL` unless explicitly deferred or
  blocked.
- Mark missing required preconditions as `BLOCKED`.
- Mark optional or out-of-scope checks as `NOT_RUN` with a reason.

## Cross-Folder Impact Scan

Run `docs-impact-map` before planning or closeout when a durable product,
design, brand, spec, backlog, glossary, or pattern fact changes and may affect
sibling docs.

Use the scan to classify affected owner docs as `UPDATED`, `NO_CHANGE`,
`DEFERRED`, `BLOCKED`, or `GAP`. Route `GAP` to `discover` or `ingest-spec`
before `plan-change`. Route missing acceptance or scenario coverage to
`functional-qa` or `plan-change` depending on whether expected behavior is
already clear.

## Closeout Drift Scan

Run at task finishing after validation evidence exists. Compare the final diff
and work-lane criteria against existing docs before writing memory.

Append a thin sourced doc diff only when the change creates or changes a
durable:

- product behavior, requirement, journey, persona, or scenario;
- design interaction, accessibility, component, token, or state constraint;
- brand, naming, tone, content, or visual direction;
- normalized spec acceptance criterion or implementation constraint;
- architecture boundary, public contract, adapter, state-machine, or runtime
  invariant;
- stack/runtime command, runner, source root, tracker, or memory path fact;
- codebase term that affects future planning or validation.

Do not rewrite broad docs at closeout. If no existing doc owns the fact, write a
short work report and route substantive discovery to `discover` or source
normalization to `ingest-spec`.

## Refactoring

Use for structural moves, import changes, module reshaping, shared extraction,
dead-code deletion, or stale-path cleanup.

1. Scan callers, imports, docs, generated artifacts, tests, and old paths.
2. State behavior that must be preserved.
3. Move or delete in the smallest coherent pass.
4. Update all consumers found by inventory.
5. Run targeted syntax, type, lint, test, and old-path searches.
6. Update patterns only when a reusable rule changed.

Guardrails:

- Never combine unrelated refactors.
- Shared code needs real consumers.
- Name by behavior, not origin.
- Prove behavior preservation at the affected public boundary.

## Memory

| Type | Location | Write When |
|---|---|---|
| Active work registry | `docs/work/active.md` | A lane opens, changes status, blocks, or closes |
| Lane packet | `docs/work/lanes/W-XXX-slug.md` | A row needs criteria, examples, dependencies, or validation detail |
| Lane examples | `docs/work/examples/` | First-time adaptation needs copyable non-active lane examples |
| Durable report | `docs/work/reports/` | Requested, multi-turn, durable decision, blocked handoff, or complex merge |
| Thin product/spec/architecture diff | Existing owner doc in `docs/product/`, `docs/design/`, `docs/brand/`, `docs/specs/`, `docs/patterns/boundaries.md`, `harness.config.yaml`, or `docs/glossary.md` | Closeout detects a validated durable fact not already documented |
| Durable skill rule | `.codex/skills/` | Repeated workflow lesson |
| Durable role rule | `.codex/agents/` | Delegation or role-boundary lesson |
| Durable pattern | `docs/patterns/` | Reusable implementation/testing/process rule |
| Codebase term | `docs/glossary.md` | Term affects future planning or validation |
| Durable rejected scope | Existing backlog note, pattern, decision, or work report | A rejected concept should not be re-suggested later |

Do not create a generic learned-pattern dump. If a lesson has no clear owner,
it is probably not durable enough to keep.
