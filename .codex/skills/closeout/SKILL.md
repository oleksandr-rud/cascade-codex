---
name: closeout
description: Use at task finish or handoff to record validation evidence, durable lessons, work reports, memory-routing decisions, thin doc diffs, and final status.
---

# Closeout

Use when work is done, blocked, or ready for handoff.

## Source Order

1. Latest user request.
2. Current diff and validation evidence.
3. Current work lanes and behavior examples.
4. `docs/patterns/workflow/index.md`, especially the Doc Routing Decision Matrix.
5. `docs/patterns/workflow/graph-shaped-work.md` plus authoritative graph,
   gate, amendment, and repair records when the current lane is graph-shaped.
6. Existing product, design, brand, spec, architecture, and glossary docs:
   - `docs/product/`
   - `docs/design/`
   - `docs/brand/`
   - `docs/specs/`
   - `docs/patterns/boundaries/index.md`
   - `docs/glossary.md`
7. Session memory and durable lesson locations.

## Checklist

1. Review the diff, validation evidence, unresolved risks, and user-facing
   behavior.
2. Compare current request and directly relevant criteria against changed files
   and tests.
3. For a graph-shaped lane, reconcile the derived frontier and status from the
   authoritative Task Graph, evidence gates, latest amendment, and repair
   history before reporting completion. Stale projections or receipts cannot
   close a gate.
4. Evaluate terminal evidence without collapsing its classes: every required
   input must be current and `PASS`; required `FAIL`, `BLOCKED`, `GAP`, or
   `NOT_RUN` prevents lane completion; optional `NOT_RUN` records optionality
   and reason. An exhausted required obligation remains `BLOCKED` until its
   named replan or escalation resolves it.
5. Confirm an aggregate or terminal gate consumes only already accepted
   producers, accepts no producer on their behalf, and has no downstream
   consumer in the same graph. Closeout may propose a terminal gate state;
   only the lane-state owner records the transition.
6. Bind every terminal proposed-transition output to an ordinary receipt with
   a stable receipt ID and subject node, workline, and gate as applicable; plan
   and graph revisions; node attempt; named input/source versions; fixed-point
   source commit or digest; producer role/actor, thread ID, and production time;
   outputs and evidence references; and invalidation condition. An incomplete
   binding remains an untrusted proposal and cannot close the gate.
7. Treat lane completion and the user's overall goal as separate decisions.
   For every cross-lane input, verify its producer lane, accepted producer gate
   and current evidence, compatible version/freshness, merge owner, and
   invalidation route. Report remaining required lanes, cross-lane gates,
   external conditions, or residual risks even when the current lane's
   terminal gate can accept.
8. When a cross-lane producer reopens or changes version, recalculate consumer
   readiness and reopen only work whose inputs are no longer current.
9. If closeout evidence is invalidated, identify the earliest responsible node
   and affected consumers, preserve unrelated accepted work, and give a
   deterministic resume route through `PENDING` and readiness recalculation.
10. Return to implementation if required behavior is missing and feasible.
11. Run the closeout drift scan:
   - identify whether the diff introduced or changed durable product behavior,
     design/brand constraints, normalized spec acceptance criteria,
     architecture/boundary rules, stack/runtime facts, or codebase vocabulary;
   - fill a Doc Routing Decision Matrix row for each detected durable fact, or
     one `NO_DOC_NEEDED` row when no durable doc fact exists;
   - use `docs-impact-map` when a durable product/design/brand/spec fact may
     affect sibling owner docs before appending a thin doc diff;
   - compare detected facts against existing docs before writing;
   - append a thin doc diff only when the fact is implemented, validated, and
     useful for future planning or validation;
   - write `no durable doc diff needed` in the closeout output when the change
     is mechanical, refactor-only, test-only, or already documented.
12. Mark deferred or blocked work with owner and next step.
13. Persist durable rejected-scope decisions only when they would prevent future
   re-suggestion: record the concept, why it is out of scope, and any prior
   request/report links in the narrowest existing decision, backlog, pattern,
   or report location.
14. Persist only reusable lessons, required handoff state, requested reports, or
   required thin doc diffs.
   For research-heavy work, update `docs/patterns/context-memory/index.md` with a
   compact research-memory row that points to owner reports, specs, packages,
   prompts, reusable rules, and validation evidence.
15. Do not create a generic learned-lessons dump.
16. For active work cleanup, prune completed rows only when the user explicitly
   asks for cleanup or the closeout scope includes registry maintenance; first
   preserve durable evidence in `docs/work/reports/`, confirm the row is
   complete, confirm dependencies are resolved, and remove the active row
   instead of re-marking it as `CLOSED`.
17. Keep final handoff concise and honest about checks that did not run.

## Thin Doc Diff Rules

Use `templates/thin-doc-diff.md` when closeout detects a durable product,
design, brand, spec, architecture, stack/runtime, or glossary change that is
not already captured.

Append, do not rewrite. A thin diff should be the smallest sourced delta that
helps the next agent plan, validate, or avoid regressing the new behavior.

Routes:

| Detected change | Append target |
|---|---|
| Product behavior, requirement, journey, persona, or scenario | Existing `docs/product/` file, usually `requirements.md`, `scenarios.md`, `journeys.md`, or a persona file |
| Design interaction, accessibility, component, token, or state constraint | Existing `docs/design/` file |
| Brand, naming, tone, content, or visual direction | Existing `docs/brand/` file |
| Normalized acceptance criterion or implementation/spec constraint | Existing `docs/specs/{slice-slug}/` packet or `docs/specs/_index.md` when no packet exists |
| Architecture boundary, public contract, adapter, state-machine, or runtime invariant | `docs/patterns/boundaries/index.md` or a target-specific architecture section named in `docs/structure.md` |
| Stack, source root, command, runner, tracker, or memory path fact | `harness.config.yaml` in a target repo, or `harness.config.example.yaml` only when the reusable harness contract changes |
| Codebase term that affects future planning or validation | `docs/glossary.md` |
| Follow-up work caused by the closeout scan | `docs/backlog/_index.md` with acceptance criteria |

Do not invent a broad product spec at closeout. If no existing doc can own the
fact, write a short work report under `docs/work/reports/` and route
substantive discovery to `discover` or source normalization to `ingest-spec`.

Every thin doc diff must include:

- source: request, lane, issue/spec, or changed file;
- changed behavior or invariant;
- validation evidence or reason it is blocked;
- date and lane/report reference when available;
- owner or next gate when the diff is provisional.

## Memory Routing

- Use `templates/learn-routing.md` when deciding whether a lesson should become
  durable memory.
- Active work state: `docs/work/active.md` and `docs/work/lanes/`
- Durable research memory: `docs/patterns/context-memory/index.md`
- Durable work handoff: `docs/work/reports/`
- Completed active registry cleanup: remove `COMPLETE` rows from
  `docs/work/active.md` only after evidence is preserved in a report and the
  cleanup scope is explicit
- Durable rejected scope: existing backlog, pattern, decision, or work report,
  only when it prevents repeat bad suggestions
- Durable workflow lessons: `.codex/skills/`, `.codex/agents/`, or
  `docs/patterns/`
- Codebase vocabulary: `docs/glossary.md`
- Product/spec facts: `docs/product/`, `docs/design/`, `docs/brand/`, and
  `docs/specs/`
- Folder/write-target rules: `docs/structure.md`
- Doc routing decision template: `templates/doc-routing-decision.md`
- Thin doc diff template: `templates/thin-doc-diff.md`

Never write stack inventories, product specs, role inventories, historical
decisions, or learned lessons into `AGENTS.md`.

## Output

- outcome and lane status;
- current graph revision, terminal-gate proposal, required/optional evidence
  disposition, and lane-state authority when graph-shaped;
- terminal proposed-transition receipt ID; subject node/workline/gate as
  applicable; plan/graph revisions; attempt; input/source versions; fixed-point
  commit/digest; producer role/actor, thread ID, and time; outputs/evidence
  references; and invalidation condition;
- overall user-goal status, remaining terminal/cross-lane obligations, and
  deterministic resume route when incomplete;
- files changed;
- validation evidence;
- doc routing decisions;
- thin doc diffs written or why none were needed;
- unresolved risks or blocked checks;
- memory written.
