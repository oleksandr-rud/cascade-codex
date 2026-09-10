---
name: closeout
description: Finalize durable work state, a reusable handoff, or a task-local evaluation cleanup proposal after implementation and validation. Ordinary completed tasks may close in the final response without loading this skill.
---

# Closeout

Use this skill when completion must update an existing lane or graph, preserve a
cross-task handoff, propose cleanup of task-local evaluations, record a durable lesson, or synchronize governed
documentation. It is not a mandatory final phase for every bounded change.

## Close

For executable closure, use the shared `cascade closeout check` implementation
and [runtime contract](references/runtime-check.md). This is a deterministic
file/evidence check, not an independent evaluator. The host prompt hook provides
the task/turn identity and optional contract path; the Stop hook reads that exact
contract and only surfaces gaps. It neither executes checks nor restarts work.
No separate check-closeout skill, task journal or mandatory report is needed.

1. Confirm the requested outcome and required validation against the current
   revision.
2. Inspect the final diff and preserve unrelated dirty work.
3. Record exact PASS, FAIL, BLOCKED, NOT_RUN, and NOT_APPLICABLE evidence without
   broadening claims.
   If the accepted task contract requires independent review or evaluation,
   require its separate-context result for the current subject and required
   scope. Missing or stale results leave that gate open. A closeout summary,
   self-review or structural PASS cannot substitute for it. Do not introduce
   an independent-judge gate for an ordinary task that does not require one.
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

## Temporary evaluation cleanup

When this task created a temporary harness evaluation suite, run
`cascade eval closeout --suite <exact-frozen-suite-path>` and include a short
cleanup proposal in the final response. Inspect only the named task's suite and
its bound runs; do not scan or delete unrelated artifacts. The command proposes
paths but never deletes files, starts evaluations or grants deletion authority.
Missing, failed, blocked, stale, incomplete or unjudged evidence must remain for
triage. A later passing attempt does not erase a failed attempt.

Before approving cleanup, consider each discovered defect for promotion to a
minimal permanent regression with an explicit risk and expected behavior. Do
not preserve every generated case or raw report. Keep core regression cases,
unresolved failures, required handoffs and registered campaign receipts outside
the temporary cleanup scope. Apply deletion only with user authorization for
the reviewed paths, after rechecking their identity and state. No temporary
suite means no cleanup step or new artifact.

## Validated artifact persistence

When a plugin skill returns a candidate artifact that must become durable
repository state, the active host—not the producer skill—routes the candidate
through closeout. If the `cascade_workspace` MCP server is available:

1. Read `cascade://workspace/artifact-destinations` and bind one exact artifact
   kind, target path, format, and optional repository schema. Do not infer a
   destination outside that registry.
2. Call `prepare_workspace_artifact`. Treat its receipt as mechanical evidence
   for path, format, size, current-target digest, and optional schema only; it
   is not user permission, semantic acceptance, or a plugin dispatch receipt.
3. Reconfirm that the current Task Envelope and direct user authority permit
   the exact target, that proportional validation passed, and that unrelated
   dirty work remains preserved.
4. Call `persist_workspace_artifact` with the exact short-lived preparation
   token, receipt identity, candidate digest, and expected current digest.
   Never reconstruct, reuse, or weaken those bindings.
5. Require the returned atomic read-back receipt before reporting a durable
   write. A stale target, expired/replayed token, schema failure, or path-policy
   failure is `BLOCKED`; re-prepare from current source rather than overriding
   the guard.

The MCP server never grants authority and cannot prove that this skill is
active. Its write tool is therefore a closeout-only host convention enforced
by this contract, Codex tool approval, destination policy, and validation—not a
plugin-to-plugin call. If the server is unavailable, standalone plugin skills
still return their candidate artifact and persistence handoff; use the same
host checks with ordinary repository tools instead of copying hub logic into
the plugin.

## Output

Return outcome, changed files, evidence, residual risk, durable updates,
retention proposal identity and applied records when applicable, and the next
owner or action. If no durable update was needed, say so and finish without
creating artifacts.
