---
name: closeout
description: Finalize durable work state or a reusable handoff after implementation and validation. Ordinary completed tasks may close in the final response without loading this skill.
---

# Closeout

Use this skill when completion must update an existing lane or graph, preserve a
cross-task handoff, record a durable lesson, or synchronize governed
documentation. It is not a mandatory final phase for every bounded change.

## Close

1. Confirm the requested outcome and required validation against the current
   revision.
2. Inspect the final diff and preserve unrelated dirty work.
3. Record exact PASS, FAIL, BLOCKED, NOT_RUN, and NOT_APPLICABLE evidence without
   broadening claims.
4. If durable documentation changed, verify that the authoritative owner and
   every true consumer were updated or explicitly left unchanged; preserve
   references and historical records, and use `create-spec` for unresolved
   specification persistence.
5. If an active lane or Coordination Graph exists, update only its affected
   state, acceptance evidence, blockers, and next handoff.
6. Create a report only when another task or maintainer needs information that
   cannot be recovered cheaply from current source and tests.
7. Route reusable operating lessons to the appropriate documentation or pattern
   owner; do not duplicate them across reports.
8. When durable project state may leave the active projection, first consume a
   current `cascade-project-management:close-project` artifact. Apply only its
   exact `RETIRE_PROPOSED` records when the user or active-state contract grants
   current host mutation authority; revalidate indexes and preserve the source
   artifact, failed history, and rehydration path. Retention is never automatic.

## Output

Return outcome, changed files, evidence, residual risk, durable updates,
retention proposal identity and applied records when applicable, and the next
owner or action. If no durable update was needed, say so and finish without
creating artifacts.
