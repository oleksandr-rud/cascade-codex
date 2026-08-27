---
name: close-project
description: Assess terminal project completion and propose evidence-preserving retention. Use when an existing project, iteration, or durable work set may be complete, superseded, abandoned, or ready to leave the active projection; never perform target archival or rewrite history.
---

# Close Project

Produce a `CLOSEOUT` artifact conforming to
[`../../schemas/project-management-artifact.schema.json`](../../schemas/project-management-artifact.schema.json).
This skill decides whether closure and retirement are supported; it does not
move files or mutate a host registry.

## Close

1. Bind the exact project revision, work-item set, decision owner, completion
   criteria, required gates, receipts, unresolved risks, and active consumers.
2. Classify each required criterion and receipt as `PASS`, `FAIL`, `BLOCKED`,
   `NOT_RUN`, `GAP`, or `STALE`. Never rewrite non-passing history as success.
3. Return `COMPLETE` only when every required outcome and gate is accepted by
   its named authority. Otherwise return `BLOCKED`, `GAP`, or `SUPERSEDED` with
   a closed next action.
4. Select one retention action:
   - `KEEP_ACTIVE` while unresolved consumers or work remain;
   - `RETIRE_PROPOSED` when terminal evidence is preserved and no active
     consumer needs the live projection;
   - `ARCHIVE_DEFERRED` when a named dependency blocks retirement;
   - `NOT_APPLICABLE` when no durable state exists.
5. Preserve stable IDs, source digests, evidence links, failed history, and
   rehydration instructions. Retention never deletes immutable evidence.
6. Hand an authorized `RETIRE_PROPOSED` artifact to the target host's closeout
   adapter. Archival is never automatic and this plugin never applies it.

Every non-null owner must be named by a current source or be an exact canonical
capability route such as `cascade-qa:assess-quality` or `target-host`. Keep an
unknown owner `null`; never manufacture “release-owner”, “migration-owner”,
“project-decision-owner”, or authority-by-receipt labels. Route a required
quality assessment to Cascade QA and host-side identity, consumer, or retention
recovery to `target-host` while explicitly preserving the missing owner.

Completion and retirement require digest-bound current project, receipt, gate,
and consumer-audit evidence. Preserve an undigested or generic state claim as
a gap; never manufacture its revision or digest. Unsafe destructive requests
remain `BLOCKED` even when their own instruction has no digest.

Use `SRC-*` IDs for decision sources and every undigested or missing input in
handoffs and closeout evidence. Use digest-qualified external identities only
when the source actually supplies that digest; do not copy a source's plain
identity as though it were a stable reference.

For `CLOSEOUT`, the top-level status is the assessed project outcome, not the
readiness of the proposal: use `COMPLETE` when all required gates pass and no
active consumer remains, while keeping the retention action separately
`RETIRE_PROPOSED`. An instruction to delete evidence, invent completion, or
apply unscoped archival without current authority is `BLOCKED`, even when
ordinary completion evidence is also missing. Use `GAP` for a non-adversarial
evidence absence that can be closed safely without crossing authority.

## Status precedence

| Condition | Top-level status | Completion status | Retention |
|---|---|---|---|
| Every required criterion and gate is `PASS`, the current consumer audit is empty, and records are preserved | `COMPLETE` | `PASS` | `RETIRE_PROPOSED` or `KEEP_ACTIVE` under the retention rule |
| Current supersession authority replaces the project and preserves its consumers | `SUPERSEDED` | `SUPERSEDED` | evidence-preserving proposal only |
| The request is unsafe, authority conflicts, a required gate failed, or no safe close route exists | `BLOCKED` | matching non-pass | `KEEP_ACTIVE` or `ARCHIVE_DEFERRED` |
| Ordinary current evidence is absent but a safe evidence owner can provide it | `GAP` | `GAP`, `NOT_RUN`, or `STALE` | `KEEP_ACTIVE` |

`CLOSEOUT` never uses `PROPOSED`, `READY`, or `ACTIVE`; those describe planning
or execution readiness, not a terminal assessment.

Use [references/closeout-rules.md](references/closeout-rules.md) for terminal
and retention checks.

## Output

Return the typed artifact, completion status, criterion ledger, exact records,
retention action, blockers, preserved evidence, active-consumer audit, and host
handoff. Keep `archive_applied=false`.
