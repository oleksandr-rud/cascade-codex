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
7. For graph-shaped work, the current lane Task Graph, gate records, latest
   graph amendment, transition/repair history, and
   `docs/patterns/workflow/graph-shaped-work.md`.

## Graph-Bound Execution When Applicable

Atomic work with one bounded obligation and no useful dependency, join, repair,
or revision structure may omit graph execution fields. It still follows the
normal scope, permission, review, validation, and closeout rules below.

For graph-shaped work, execute only an authoritatively `READY` node. Before any
write or external action, bind the assignment to all of these current fields:

- node and workline ID, objective, actor/type, plan revision, graph revision,
  and attempt/maximum;
- named source/input versions and source commit or digest when available;
- allowed write scope and merge owner, including any protected adjacent work;
- required tools and permissions, plus explicit cost, idempotency, and cleanup
  bounds for paid/live or externally mutating work;
- per-node acceptance gate, expected output receipt, repair route, exhaustion
  route, and deterministic stop/resume route; and
- current typed prerequisite nodes, acceptance gates, external conditions, and
  cross-lane producer gate/evidence versions that established readiness.

Use the authoritative lane records, not Current Frontier, a status board, a
worker completion claim, or a prior snapshot, to confirm the node and graph
revision. Do not run when readiness is stale or incomplete, a permission/tool
is missing, an input version changed, the attempt is exhausted, the write scope
conflicts, or a later graph revision superseded the node. Return a bound
`BLOCKED` receipt/proposal with the named precondition and route instead.

Only the lane-state owner records authoritative transitions. A worker may
execute a current assignment and emit receipts or proposed transitions; it
must not mutate shared lane state, derived boards, merge queues, or gates. If
another proposal conflicts with the worker's expected prior/next state, stop,
preserve both proposals as evidence/history, and route reconciliation to the
lane-state owner rather than selecting or overwriting a transition.

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
- assigned allowed writes, actual changed paths, merge owner, and protected
  contracts;
- tools/permissions used and applicable time/token/tool/cost, idempotency, and
  cleanup bounds;
- outputs, checks with exact states, and evidence/artifact references;
- blockers or conflicting proposals, invalidation conditions, and preserved
  accepted work; and
- deterministic repair, exhaustion, stop, or resume route plus the next
  candidate action.

For Git-backed work, also bind branch, worktree, base SHA, head SHA, and owned
commit IDs. Missing required bindings leave the receipt an untrusted proposal.
Rebase, amended commits, conflict resolution, or input/source-version drift
invalidates the prior head-bound receipt and requires a new receipt plus the
affected checks.

## Checklist

1. Restate the implementation slice and success criteria.
2. Restate affected and protected feature contracts from the Feature Impact
   Matrix when present, including adjacent behavior that must not change.
3. For graph-shaped work, verify the authoritative `READY` node and bind its
   graph revision, attempt, inputs, writes, tools/permissions, gate, receipt,
   and stop routes before editing. Atomic bypass does not bypass normal gates.
4. Inspect touched files before editing.
5. Prefer existing patterns, helpers, and module boundaries.
6. Edit only files required by the slice and protected feature contracts.
7. For bugs, reproduce or identify the failure signal first when feasible.
   Sharpen the loop before patching: make it faster, more deterministic, and
   more specific to the reported symptom when feasible.
8. For hard bugs, rank falsifiable hypotheses and tag temporary
   instrumentation with a unique prefix such as `[DEBUG-abc123]` so it can be
   searched and removed before closeout.
9. Add or update tests only when they preserve meaningful behavior coverage.
10. Run targeted checks and feed failures back through the smallest next action.
11. Emit a version-bound receipt and proposed transition for graph-shaped work;
    do not self-accept or overwrite a conflicting transition.
12. Route stale failing tests to `test-autorepair`; route missing acceptance
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
- validation still needed;
- unresolved risks;
- for graph-shaped work, the full version-bound execution receipt and proposed
  transition for lane-owner reconciliation.
