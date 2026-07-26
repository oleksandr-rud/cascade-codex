---
name: implement-change
description: Use after a clear request or approved plan to make scoped code or doc changes through behavior-slice implementation and feedback-loop-first bug fixing.
---

# Implement Change

Use for implementation, bug fixing, refactoring, or documentation updates after
enough context is gathered. Do not use for open-ended planning.

## Source Order

1. Latest user request.
2. Current plan and behavior examples when present.
3. Feature Impact Matrix rows from the current work lane when present.
4. Current code and tests.
5. Relevant architecture, product, design, and testing patterns.
6. Validation output from failed checks or repros.
7. The current plan's graph-fragment composition ledger and applicable
   `docs/patterns/workflow/fragments/GF-*.fragment.json` definitions when the
   implementation slice was composed from reusable fragments.
8. For graph-shaped work, `docs/patterns/workflow/graph-shaped-work.md`, the
   applicable lane-local Task Graph, and any authoritative
   `docs/work/graphs/CG-XXX-*.md` Coordination Graph with its gate, dispatch,
   transport, materialization, batch, amendment, and repair records.

## Graph-Bound Execution When Applicable

Atomic work with one bounded obligation and no useful dependency, join, repair,
or revision structure may omit graph execution fields. It still follows the
normal scope, permission, review, validation, and closeout rules below.

For graph-shaped work, execute only an authoritatively `READY` node or workline.
Before any write or external action, bind the assignment to all of these current
fields:

- fragment instance and source fragment ID/version, disposition, bound input and output ports,
  owning workline, resolved actor/role and skill calls, selected test strategies,
  evaluator authority, and omission/invalidation rule when the
  plan used graph fragments;
- node and workline ID, objective, actor/type, plan revision, graph revision,
  and attempt/maximum;
- named source/input versions and source commit or digest when available;
- allowed write scope and integration/materialization owner, including any
  protected adjacent work;
- required tools and permissions, plus explicit cost, idempotency, and cleanup
  bounds for paid/live or externally mutating work;
- per-node acceptance gate, expected output receipt, repair route, exhaustion
  route, and deterministic stop/resume route;
- current typed prerequisite nodes, acceptance gates, external conditions, and
  cross-lane producer lane, lane-scoped gate, evidence version, integration
  owner, and invalidation route that established readiness; and
- for a Coordination Graph dispatch, its graph/dispatch IDs, branch/worktree/
  base SHA, immutable producer transport identity, consumer presence proof,
  coordination-state/materialization owner, and target/integrated gate.

Use the authoritative lane and/or Coordination Graph records, not Current
Frontier, a status board, queue view, worker completion claim, or prior snapshot,
to confirm the subject and graph revision. Do not run when readiness is stale or
incomplete, a permission/tool is missing, an input version changed, the attempt
is exhausted, the write scope conflicts, the exact producer transport is absent
from a dependent worktree, or a later graph revision superseded the assignment.
Return a bound `BLOCKED` receipt/proposal with the named precondition and route
instead.

Only the lane-state owner records Task Graph transitions, and only the
coordination-state/materialization owner records Coordination Graph, queue,
batch, or terminal transitions. A worker may execute a current assignment and
emit receipts or proposed transitions; it must not mutate shared state, derived
boards, materialization queues, or gates. If another proposal conflicts with
the worker's expected prior/next state, stop,
preserve both proposals as evidence/history, and route reconciliation to the
applicable state owner rather than selecting or overwriting a transition.

Successful output proposes `IN_PROGRESS -> REVIEW`, never `ACCEPTED`. The
per-node gate and its named evaluator/reviewer authority control later
acceptance. A failed or blocked execution proposes its current failure/block
route; retry or blocker resolution returns through `PENDING` readiness
recalculation and cannot jump directly to `READY`.

### Version-Bound Execution Receipt

Every graph-bound execution result, including a blocked or failed result,
returns one receipt containing:

- stable receipt ID; subject node, workline, and acceptance gate;
- plan revision, graph revision, attempt/maximum, prior state, and proposed
  transition;
- named source/input versions and source commit/digest;
- producer/actor, thread or execution identity, and production time;
- assigned allowed writes, actual changed paths, integration/materialization
  owner, and protected contracts;
- tools/permissions used and applicable time/token/tool/cost, idempotency, and
  cleanup bounds;
- outputs, checks with exact states, and evidence/artifact references;
- cross-lane producer lane, lane-scoped gate, evidence version, integration
  owner, and invalidation route when a cross-lane input applies;
- blockers or conflicting proposals, invalidation conditions, and preserved
  accepted work; and
- deterministic repair, exhaustion, stop, or resume route plus the next
  candidate action.

For Git-backed work, also bind branch, worktree, base SHA, head SHA, owned
commit IDs when used, worktree cleanliness, and one immutable transport
identity: preferably the accepted commit set, otherwise a content-addressed
patch/diff digest. A dependent consumer also records its base SHA and proof that
the exact producer transport is present. Missing required bindings leave the
receipt an untrusted proposal. Rebase, amended commits, transport/diff change,
consumer-base change, conflict resolution, or input/source-version drift
invalidates the prior receipt and requires a new receipt plus affected checks.

## Dedicated-Worktree Materialization

Materialization is a root-owned implementation action that makes one accepted,
receipt-bound workline result appear in the designated active worktree. It is
not a branch merge or authorization to commit the current branch. Only the
Coordination Graph's named materialization owner may perform it.

Before moving a queue item from `QUEUED`, the owner must:

1. verify the current graph revision, accepted workline gate, immutable source
   transport, queue order, target path/branch, allowed paths, and repair route;
2. record target HEAD, active baseline/diff fingerprint, staged/unstaged state,
   and every pre-existing tracked or untracked dirty path;
3. block rather than overwrite when a source path overlaps unexplained target
   changes or ownership is unresolved; and
4. verify required predecessor materializations and focused gates are accepted.

Apply only the scoped transport and preserve unrelated dirty state. Record each
legal transition without skipping the canonical happy path
`QUEUED -> APPLYING -> APPLIED -> VALIDATING -> ACCEPTED`; use `FAILED`,
`BLOCKED`, or `SUPERSEDED` only from a prior state allowed by the canonical
table. Do not clean, reset, broadly stage, commit, push, publish, or rewrite
current-branch history as an implied materialization action. Equal target HEAD
before/after is expected for no-commit materialization; the resulting bound diff
proves the change appeared.

### Materialization Receipt

Every materialization attempt returns or records one stable receipt containing:

- materialization receipt and queue IDs, workline/source receipt, graph revision,
  prior/proposed lifecycle state, and owner/time;
- source branch/worktree/base/head plus immutable commit-set or patch/diff
  transport identity;
- target active worktree/branch and HEAD before/after;
- active baseline fingerprint, pre-existing dirty paths, and preserved
  unrelated changes;
- allowed/applied paths, transport method, conflicts, applied-delta identity,
  and resulting combined diff fingerprint;
- staged/unstaged/mixed state, focused checks with exact results, and evidence
  references; and
- invalidation condition plus deterministic rollback, repair,
  rematerialization, stop, or resume route.

Worker-local receipts remain provisional for the combined result. Required
integrated checks bind target HEAD plus the combined diff fingerprint separately
from every producer transport identity.

## Checklist

1. Restate the implementation slice and success criteria.
2. Restate affected and protected feature contracts from the Feature Impact
   Matrix when present, including adjacent behavior that must not change.
3. For graph-shaped work, verify the authoritative `READY` node/workline and
   bind its Task/Coordination Graph revision, dispatch, transport/presence,
   attempt, inputs, writes, tools/permissions, gate, receipt, and stop routes
   before editing. Atomic bypass does not bypass normal gates.
4. When the plan used graph fragments, verify the assigned fragment instance is
   `SELECTED` or legally `MERGED`, all required ports are bound, actor and skill
   resolution is current, and required local test strategies have exact target
   checks. Do not implement a `NOT_APPLICABLE`, `BLOCKED`, stale, or superseded
   fragment instance.
5. Inspect touched files before editing.
6. Prefer existing patterns, helpers, and module boundaries.
7. Edit only files required by the slice and protected feature contracts.
8. For bugs, reproduce or identify the failure signal first when feasible.
   Sharpen the loop before patching: make it faster, more deterministic, and
   more specific to the reported symptom when feasible.
9. For hard bugs, rank falsifiable hypotheses and tag temporary
   instrumentation with a unique prefix such as `[DEBUG-abc123]` so it can be
   searched and removed before closeout.
10. Add or update the selected fragment tests only when they preserve meaningful
    behavior coverage; do not add tests from omitted fragments.
11. Run targeted checks and feed failures back through the smallest next action.
12. For a dedicated-worktree materialization, perform the dirty-target preflight,
    apply only as the named owner, preserve unrelated changes, emit the full
    materialization receipt, and leave commit/push/cleanup outside scope.
13. Emit a version-bound receipt and proposed transition for graph-shaped work;
    do not self-accept or overwrite a conflicting transition.
14. Route stale failing tests to `test-autorepair`; route missing acceptance
   evidence to `functional-qa`.

## Rules

- Do not weaken public contracts without explicit approval.
- Do not add speculative abstractions.
- Do not patch unrelated files.
- Do not suppress type, lint, or test failures just to pass.
- Remove tagged debug instrumentation, throwaway harnesses, and speculative
  code before closeout.

## Output

- files changed;
- behavior implemented;
- affected and protected feature contracts preserved or changed;
- tests or checks added;
- fragment instance/source version, bound ports, resolved actor/skills/tests,
  produced port/evidence, and any invalidated consumers when composed;
- validation still needed;
- unresolved risks;
- for graph-shaped work, the full version-bound execution receipt and proposed
  transition for the applicable state-owner reconciliation;
- for materialization, the target HEAD/diff-bound receipt, lifecycle proposal,
  preserved dirty-state evidence, focused checks, and integrated validation
  still required.
