---
name: closeout
description: Use at task finish or handoff to record validation evidence, durable lessons, work reports, memory-routing decisions, thin doc diffs, final status, and the automatic archive-work disposition for completed lanes or graphs.
---

# Closeout

Use when work is done, blocked, or ready for handoff.

## Source Order

1. Latest user request.
2. Current diff and validation evidence.
3. Current work lanes and behavior examples.
4. `docs/patterns/workflow/index.md`, especially the Doc Routing Decision Matrix.
5. `docs/patterns/workflow/graph-shaped-work.md` plus the applicable lane-local
   Task Graph and/or authoritative `docs/work/graphs/CG-XXX-*.md` Coordination
   Graph, including dispatch, transport, materialization, batch, integrated
   evidence, terminal, amendment, and repair records.
6. Existing product, design, brand, spec, architecture, and glossary docs:
   - `docs/product/`
   - `docs/design/`
   - `docs/brand/`
   - `docs/specs/`
   - `docs/patterns/boundaries/index.md`
   - `docs/glossary.md`
7. Session memory and durable lesson locations.
8. `.codex/skills/archive-work/SKILL.md` and
   `docs/archive/work-reports/_index.md` when a lane or graph can complete.

## Checklist

1. Review the diff, validation evidence, unresolved risks, and user-facing
   behavior.
2. Compare current request and directly relevant criteria against changed files
   and tests.
3. For graph-shaped work, reconcile lane-local Task Graph and cross-workline
   Coordination Graph authority separately before reporting completion. Derive
   frontier/status from current nodes/worklines, gates, dispatch/transports,
   materialization queue/receipts, batch matrix, integrated evidence, latest
   amendment, and repair history. Stale projections or receipts cannot close a
   gate.
4. Evaluate terminal evidence without collapsing its classes: every required
   input must be current and `PASS`; required `FAIL`, `BLOCKED`, `GAP`, or
   `NOT_RUN` prevents lane completion; optional `NOT_RUN` records optionality
   and reason. An exhausted required obligation remains `BLOCKED` until its
   named replan or escalation resolves it.
5. Confirm an aggregate or terminal gate consumes only already accepted
   producers, accepts no producer on their behalf, and has no downstream
   consumer in the same graph. Closeout may propose a terminal gate state;
   only the applicable lane-state or coordination-state owner records it.
6. Bind every terminal proposed-transition output to an ordinary receipt with
   a stable receipt ID and subject node, workline, materialization, batch, and
   gate as applicable; plan and graph revisions; attempt; named input/source
   versions; producer transports; fixed-point source commit/digest and target
   HEAD/combined diff where applicable; producer role/actor, thread ID, and
   production time; outputs/evidence references; and invalidation condition. An
   incomplete binding remains an untrusted proposal and cannot close the gate.
7. Treat lane completion, Coordination Graph completion, and the user's overall
   goal as separate decisions.
   For every cross-lane input, verify its producer lane, accepted producer gate
   and current evidence, compatible version/freshness, immutable producer
   transport/presence proof where applicable, integration/materialization owner,
   and invalidation route. Report remaining required worklines, cross-workline
   gates, external conditions, or residual risks even when one lane's terminal
   gate can accept.
8. When a cross-lane producer reopens or changes version, recalculate consumer
   readiness and reopen only work whose inputs are no longer current.
9. For a Coordination Graph terminal gate, require every declared workline and
   materialization gate, batch, integrated active-worktree check/evaluation, and
   residual-risk input to be current and accepted for the same graph revision,
   target HEAD, combined diff fingerprint, and producer transports. Worker-local
   or pre-materialization success cannot close the graph.
10. Verify every required materialization reached `ACCEPTED`, unexplained dirty
   overlap is absent, and the materialization receipt preserves pre-existing
   target changes and binds staged state. An unchanged target HEAD is valid for
   no-commit materialization when the combined diff fingerprint is current.
11. If closeout evidence is invalidated, identify the earliest responsible node
   or workline and affected materializations/consumers/batches, preserve
   unrelated accepted work, and give a deterministic resume route through
   `PENDING` or `QUEUED` and readiness recalculation.
12. Return to implementation if required behavior is missing and feasible.
13. Run the closeout drift scan:
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
14. Mark deferred or blocked work with owner and next step.
15. Persist durable rejected-scope decisions only when they would prevent future
   re-suggestion: record the concept, why it is out of scope, and any prior
   request/report links in the narrowest existing decision, backlog, pattern,
   or report location.
16. Persist only reusable lessons, required handoff state, requested reports, or
   required thin doc diffs.
   For research-heavy work, update `docs/patterns/context-memory/index.md` with a
   compact research-memory row that points to owner reports, specs, packages,
   prompts, reusable rules, and validation evidence.
17. Do not create a generic learned-lessons dump.
18. For every lane or graph that becomes complete in this closeout, first
   preserve durable evidence in `docs/work/reports/`, confirm dependencies are
   resolved, and remove its derived active row instead of re-marking it as
   `CLOSED`. Incomplete or blocked work retains its current state and is not
   archive-eligible.
   Route unresolved duplicate, stale, superseded, or conflicting workline/graph
   identity through `reconcile-work-graph` before applying a cleanup proposal.
19. Preserve Coordination Graph entries, revisions, receipts, and evidence as
   durable history. Retire only derived active projections through the owning
   closeout route; do not invent a permanent `CLOSED` state or delete graph
   authority merely because the goal completed.
20. After completion evidence, report, and active-projection retirement are
   fixed, automatically invoke `archive-work` for the exact completed set.
   `archive-work` may return:
   - `ARCHIVED`: the frozen set moved and validated;
   - `ARCHIVE_DEFERRED`: completion remains valid, but archive blockers keep
     the source set in `docs/work/`; record blocker and resume route; or
   - `NOT_APPLICABLE`: no lane, graph, or durable work-report set exists.
   Closeout establishes completion; `archive-work` cannot accept worklines or
   terminal gates on its behalf.
21. Treat commit, push, publication, broad staging, cleanup, or reset as
   separate authority. An accepted uncommitted active-worktree state may satisfy
   an implementation goal; report unrequested Git publication actions as
   `NOT_REQUESTED`, not as missing implementation evidence.
22. Keep final handoff concise and honest about checks that did not run.

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
- Active work state: `docs/work/active.md`, `docs/work/lanes/`, and
  `docs/work/graphs/`
- Durable research memory: `docs/patterns/context-memory/index.md`
- Durable work handoff: `docs/work/reports/`
- Completed active registry cleanup: remove `COMPLETE` rows from
  `docs/work/active.md` in the completing closeout after evidence is preserved
  in a report
- Completed lane/graph/report compaction:
  automatic `archive-work -> docs/archive/work-reports/` after closeout;
  otherwise record `ARCHIVE_DEFERRED` or `NOT_APPLICABLE`
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

- outcome and lane/Coordination Graph status;
- current Task/Coordination Graph revision, terminal-gate proposal, required/
  optional evidence disposition, materialization/batch/integrated state, and
  lane/coordination-state authority when graph-shaped;
- terminal proposed-transition receipt ID; subject node/workline/materialization/
  batch/gate as applicable; plan/graph revisions; attempt; input/source versions;
  producer transports; fixed-point source commit/digest and target HEAD/combined
  diff where applicable; producer role/actor, thread ID, and time;
  outputs/evidence references; and invalidation condition;
- overall user-goal status, remaining terminal/cross-workline obligations,
  non-materialized or local-only work, target HEAD/combined diff binding,
  `NOT_REQUESTED` publication actions, and deterministic resume route when
  incomplete;
- files changed;
- validation evidence;
- doc routing decisions;
- thin doc diffs written or why none were needed;
- unresolved risks or blocked checks;
- archive result, capsule or deferral evidence, and archive resume route;
- memory written.
