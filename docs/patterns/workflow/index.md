# Workflow Patterns

Use this entry for proportional task routing and for durable coordination only
when work must survive tasks, cross owners, or join evidence. Detailed Task
Graph and Coordination Graph semantics live in
[`graph-shaped-work.md`](graph-shaped-work.md).

The plugin-to-plugin and plugin-to-host responsibility map, including the
conditional QA branch, lives in
[`plugin-orchestration.md`](plugin-orchestration.md).

## Workflow Prompt Routing

"Workflow" describes many outputs; route by the requested result.

| Requested result | Primary route |
|---|---|
| Normal non-atomic change | `context -> plan-change -> implement-change -> validate-change` |
| Agent or skill workflow design | `cascade-ai-architect:design-agent-workflow`, then `cascade-coding-agent:integrate-agent-assets` only for target binding |
| Tracker-ready issue, story, task, enabler, or experiment | `cascade-project-management:define-work-item` |
| Multi-horizon roadmap or Agile MVP/version/iteration plan | `cascade-project-management:plan-project` |
| Independently owned or resumable work, dependencies, evidence joins, status, or reconciliation | `cascade-project-management:manage-project` |
| Quality planning or test design for accepted behavior | `cascade-qa:plan-quality` or `cascade-qa:design-tests` |
| Authorized target execution of a frozen QA artifact | `run-qa-plan` |
| Frozen quality evidence assessment | `cascade-qa:assess-quality` |
| UX or security review | Installed namespaced Cascade Design or Cascade Security skill |
| Market research or experiment design | `cascade-market:research-market` or `cascade-market:design-market-experiments` |
| Current evidence aggregation | `validate-change` |
| Durable handoff or active-record finalization | `closeout` |
| Completion or retention assessment | `cascade-project-management:close-project`, then `closeout` for authorized host effects |

Atomic mechanical edits may bypass planning. Bounded one-owner work uses a short
inline plan and creates no spec, lane, graph, report, receipt, or archive record.

## Active Work

`docs/work/active.md` is the current registry. Create a lane packet only when
the work needs its own status across tasks, an independent owner or handoff, a
real dependency, or separately accepted evidence. A row or chat plan is enough
otherwise.

Before resuming a lane, compare its source identity and acceptance criteria with
current code and evidence. Mark only affected claims or consumers stale.
Completed or unrelated lanes are historical context and must not be loaded into
ordinary task planning.

A lane or graph is declarative state. It grants no permission, performs no
dispatch, and does not imply a branch, worktree, external action, or provider
spend.

## Iteration Planning

Use `cascade-project-management:plan-project` only for a requested roadmap,
Agile delivery decomposition, or work that cannot be delivered as one bounded
slice. The compact form classifies grounded slices as `FIRST`, `NEXT`, `LATER`,
`DEFERRED`, or `REMOVED`. The Agile form maps one accepted MVP into versions,
iterations, stories, and tasks, fully decomposing only the first MVP iteration.
Both forms keep proposals distinct from committed scope.

Do not invent dates, cadence, capacity, staffing, points, owners, or active IDs. Use
`cascade-project-management:manage-project` only when FIRST contains real
cross-owner work, durable handoffs, dependencies, or evidence joins. The host
separately applies any authorized durable-state or execution effect.

## Work Graphs

Use a work graph only when several independently meaningful obligations require
typed dependency ordering, ownership, dispatch state, evidence joins,
invalidation, partial repair, or one terminal acceptance gate. Use the smallest
shape that represents the real coordination boundary.

The graph must identify its current source, outcomes, owners, dependencies,
joins, acceptance, and revision. It is not required merely because work is
non-atomic. Lifecycle and advanced graph mechanics are centralized in
[`graph-shaped-work.md`](graph-shaped-work.md).

After terminal acceptance, ask
`cascade-project-management:close-project` for a retention proposal. Remove a
projection from active state only through `closeout`, when its remaining
consumers and durable evidence are accounted for and current authority permits
the exact host mutation. Retention is never automatic.

## Parallel Rules

Parallelize only when writes are disjoint or one merge owner is explicit,
unfinished outputs are not mutually required, unresolved intent is not shared,
and each slice has independent validation. Serialize overlapping public
contracts, state machines, permissions, or mutation boundaries.

## Execution Surfaces And Dispatch

Readiness is not dispatch.

| Surface | Meaning | Required authority |
|---|---|---|
| `root` | Current Codex task | Current scoped request |
| `internal-subagent` | Child inside the current task | Explicit authorization for delegation or parallel agents |
| `user-visible-task` | Separate Codex task | Explicit request to create, open, or fork a task |

Record runtime handles only for dispatched durable work. If an authorized
surface is unavailable, report it as blocked; do not silently substitute another
surface.

## Automatic Status Reconciliation

A request to check or refresh a named active record permits a read-only audit and
an in-scope local status synchronization. Mark it complete only when current
source, dependencies, required criteria, and validation all pass. Keep partial,
stale, historical, candidate-branch, blocked, or NOT_RUN work open.

Status reconciliation does not authorize missing implementation, external
tracker mutation, archival, or unrelated cleanup.

## Work-To-Source Coverage

For a material change, map only the current criteria:

| Criterion | Current artifact | Check | State | Note |
|---|---|---|---|---|
| `<CRITERION>` | `<SOURCE_OR_OUTPUT>` | `<CHECK>` | `PASS/FAIL/BLOCKED/NOT_RUN/NOT_APPLICABLE` | `<NOTE>` |

Bind claims to the current branch or revision. Historical, local, mocked, or
structural evidence retains its narrower meaning.

## Cross-Folder Impact Scan

Use `create-spec` only when a durable fact may affect sibling product,
design, brand, spec, backlog, glossary, or pattern documents. Identify the
authoritative owner and true consumers; prefer links or generated projections
over duplicated prose.

A code-only refactor with no durable fact change records no documentation map.

## Trajectory Coverage

Choose the smallest representative set of behavior paths that can expose the
important success, failure, state, boundary, or permission risks. One path may
be enough for a narrow change; use several only when the behavior actually has
distinct outcomes.

Preserve material contradictions, edge cases, rejected paths, and uncertainty.
Do not generate decorative alternatives or require lossless retention of every
minor observation.

## Planning Knowledge Contract

An inline plan should retain only what implementation needs:

- intended behavior and non-goals,
- authoritative source and current assumptions,
- affected producer and consumer boundaries,
- mutation ownership and compatibility constraints,
- focused validation and stop conditions.

Create a durable plan or spec only when the contract is public, the work must
survive tasks, several owners require a shared source, or the user explicitly
requests it. Replanning invalidates only dependent slices and evidence; current
unaffected work remains valid.

## Adaptive Workline Planning

Start with one coherent slice. Split only when another slice has an
independently meaningful outcome, owner, write boundary, handoff, dependency, or
acceptance seam. Merge candidates that share unresolved intent or evidence that
cannot be accepted independently.

A workline becomes an active lane only when its status must persist. The number
of files, skills, tests, or available agents is not a reason to split work.

## Composable Graph Fragments

The reusable catalog under [`fragments/`](fragments/) is optional planning
support for connected or program work that crosses delivery or assurance
surfaces. Do not inspect every fragment for a bounded change.

For selected fragments, bind only the ports, owners, skills, tests, and evidence
needed by the request. Merge fragments sharing one outcome and acceptance seam.
Omitted fragments create no phantom nodes or validation requirements.

## Research Coverage

For research that may become durable, record the decision it informs, source
families checked, evidence class, claim support, conflicts, missing evidence,
and promotion status. Simulation output, local design intent, market evidence,
and empirical product proof remain distinct evidence classes.

Close research when the decision has sufficient current support or is explicitly
inconclusive, not when a target document has reached a desired length.

## Doc Routing Decision Matrix

| Durable fact | Owner |
|---|---|
| Product intent, requirement, journey, scenario, metric | `docs/product/` |
| Interaction, accessibility, component, visual rule | `docs/design/` |
| Positioning, tone, naming, message rule | `docs/brand/` |
| Approved implementation or public contract packet | `docs/specs/` |
| Active resumable execution state | `docs/work/` |
| Reusable workflow or architecture rule | `docs/patterns/` |
| Codebase vocabulary | `docs/glossary.md` |
| No durable fact | no documentation write |

Update the narrowest owner and affected consumers. Preserve dated reports as
history rather than silently rewriting them.

## Closeout Drift Scan

At completion, inspect whether the final diff changed a durable fact, an
existing active record, or a reusable handoff. If not, the final response is
sufficient.

When durable state is affected, update only the owner documents or active
records, record exact evidence states, and preserve unresolved risk. A report is
warranted only when a future task cannot cheaply recover the handoff from
current source and tests.

## Memory

- Current resumable state belongs in `docs/work/active.md` and necessary lane
  or graph records.
- Reusable rules belong in the narrowest skill, role, or pattern owner.
- Product, design, brand, and spec facts remain in their owning trees.
- Reports are exceptional handoffs, not a transcript of every task.
- Archives are explicit historical cleanup and never current authority.

Compact repetition, but preserve identity, provenance, status, permissions,
negative constraints, and the difference between authored, executed, judged,
and accepted evidence.
