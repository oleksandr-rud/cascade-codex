---
name: context
description: Rehydrate the minimum current repository state needed to start, resume, replan, or hand off work; use deeper lane or graph recovery only when an existing durable work record is actually in scope.
---

# Context

Build a compact, current snapshot that lets the next action proceed safely. This
skill reads state; it does not authorize or perform implementation.

## Choose the smallest mode

- **Task**: identify the request, governing instructions, relevant source, branch,
  and nearby dirty work.
- **Discovery**: additionally build a compact inventory of observed facts,
  user-provided facts, assumptions, conflicts, source locators, and the earliest
  missing decision, then select the smallest namespaced plugin owner.
- **Resume**: additionally recover the named active lane, its latest evidence,
  blockers, and next safe action.
- **Graph**: additionally recover the named Coordination Graph and only the
  worklines or joins needed for the requested decision.

Do not load every active lane, archived report, or repository document merely
because it exists. Use archives only when the user asks for history or current
sources explicitly point there.

## Build the snapshot

1. Read the latest user request and applicable repository instructions.
   Bind project identity and the workspace profile from `harness.config.yaml`
   when present. Cascade is tooling in a `target-project`; only `cascade-source`
   identifies this source-development workspace. Load target-owned architecture
   context only for the relevant request, not because a plugin packages it.
2. Inspect the current branch, revision, and dirty files before proposing writes.
3. Locate the smallest set of current source and tests that govern the request.
4. If resuming durable work, compare the active record with current source and
   evidence. Mark only affected claims or consumers stale.
5. In Discovery mode, route reusable interpretation directly to the owning
   `cascade-product`, `cascade-personas`, `cascade-market`, `cascade-design`, or
   other namespaced plugin skill. Preserve source locators, freshness,
   authority, and privacy; do not invent a local fallback.
6. Separate facts, assumptions, conflicts, blockers, and evidence that was not
   run. Never convert historical evidence into a current pass.
7. Select the proportional next route. A normal bounded change should proceed
   to `plan-change`; use `cascade-project-management:manage-project` only for a
   real active-record collision, stale project state, or coordination boundary.

## Output

Return a concise snapshot with:

- request and success criteria,
- governing sources and current revision,
- relevant dirty work,
- current facts and assumptions,
- source inventory and selected plugin route in Discovery mode,
- stale or conflicting items,
- blockers and unrun evidence,
- the next skill or action.

Include graph revision, workline state, joins, or invalidation sets only in Graph
mode. Preserve unrelated work and do not create a spec, lane, graph, or report
from this skill.
