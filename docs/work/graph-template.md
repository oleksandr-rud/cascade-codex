# Coordination Graph: CG-XXX

Status: `<OPEN | IN_PROGRESS | BLOCKED | INTEGRATION_REVIEW | COMPLETE | SUPERSEDED>`
Plan Revision: `<INTEGER>`
Coordination Graph Revision: `<INTEGER>`
Owner: `<SOLE_COORDINATION_STATE_OWNER>`
Created: `YYYY-MM-DD`
Terminal Gate: `<GATE_ID>`
Next Gate: `<PLUGIN_SKILL_HOST_ADAPTER_OR_COMMAND>`

Use this host projection only when at least two meaningful worklines have a
real dependency, evidence join, materialization boundary, invalidation
relationship, or partial-repair route. First obtain the portable project
artifact from `cascade-project-management:manage-project`.

## Goal And Applicability

- Goal: `<CROSS_WORKLINE_OUTCOME>`
- Qualifying relationship: `<DEPENDENCY_JOIN_MATERIALIZATION_INVALIDATION_REPAIR>`
- Why a lane table is insufficient: `<REASON>`
- Non-goals: `<BOUNDARIES>`

If no qualifying relationship exists, stop and keep direct lane references.

## Sources

| Source | Identity / Version | Supports | Invalidation |
|---|---|---|---|
| `<PATH_ARTIFACT_OR_TOOL>` | `<REVISION_OR_DIGEST>` | `<WORKLINES_DECISION_OR_CRITERIA>` | `<WHEN_STALE>` |

## Worklines

Rows reference the owning artifact or lane; they do not duplicate definitions.

| Workline | Outcome | Owner | Requires | Produces | Host Write / Action Boundary | State |
|---|---|---|---|---|---|---|
| `WL-01` | `<BOUNDED_OUTCOME>` | `<OWNER>` | `<INPUT_OR_GATE>` | `<ARTIFACT_OR_RECEIPT>` | `<PATHS_ACTIONS_OR_NONE>` | `<PENDING_READY_RUNNING_REVIEW_ACCEPTED_BLOCKED>` |

## Dependencies And Joins

| Relation | Producer | Consumer | Satisfaction Evidence | Invalidation / Partial Repair |
|---|---|---|---|---|
| `REL-01` | `<WORKLINE_GATE_OR_EXTERNAL>` | `<WORKLINE_OR_TERMINAL_GATE>` | `<CURRENT_RECEIPT_DECISION_OR_DIGEST>` | `<AFFECTED_ITEMS_AND_ROUTE>` |

Reject duplicate IDs, dangling consumers, conflicting owners, undefined gates,
or dependency cycles before activation.

## Conditional Quality Branch

| Applicability | Accepted Behavior / Risks | Frozen QA Artifact | Host Receipt | QA Assessment / Triage |
|---|---|---|---|---|
| `<REQUIRED_NOT_APPLICABLE>` | `<SOURCE_IDS_OR_REASON>` | `<ARTIFACT_OR_NONE>` | `<RUN_QA_PLAN_RECEIPT_OR_NOT_RUN>` | `<RESULT_OR_NOT_APPLICABLE>` |

QA is one optional evidence producer. It does not own this graph or gate
unrelated product, research, marketing, design, or engineering work.

## Execution Bindings

Readiness does not grant dispatch or mutation authority.

| Binding | Workline | Surface | Authority | Runtime Handle | Allowed Actions / Writes | Input Identity | Stop / Cleanup |
|---|---|---|---|---|---|---|---|
| `EX-01` | `WL-01` | `<root_internal-subagent_user-visible-task>` | `<REQUEST_OR_APPROVAL>` | `<HANDLE_OR_NONE>` | `<BOUNDARY>` | `<REVISION_OR_DIGEST>` | `<RULE>` |

## Receipts

| Receipt | Subject | Producer / Time | Source Identity | Actual Actions / Writes | Evidence | Proposed State | Invalidation |
|---|---|---|---|---|---|---|---|
| `R-01` | `<WORKLINE_OR_GATE>` | `<ACTOR_TIMESTAMP>` | `<REVISION_OR_DIGEST>` | `<ACTIONS_PATHS_OR_NONE>` | `<EXACT_RESULTS>` | `<STATE>` | `<WHEN_STALE>` |

Receipts are evidence proposals. Only the named owner records authoritative
graph transitions.

## Reconciliation

| Item | Current Authority / Consumers | Comparison | Proposed Disposition | Migration / Blocker |
|---|---|---|---|---|
| `<ITEM_ID>` | `<PATHS_IDS>` | `<OUTCOME_SCOPE_ARTIFACT_EVIDENCE>` | `<KEEP_UPDATE_MERGE_INTO_SUPERSEDE_BY_RETIRE_PROPOSED_BLOCKED_REVIEW>` | `<SURVIVOR_REFS_OR_BLOCKER>` |

## Current Frontier

- Ready: `<WORKLINES_OR_NONE>`
- Running or review: `<WORKLINES_OR_NONE>`
- Accepted and preserved: `<WORKLINES_OR_NONE>`
- Blocked and repair route: `<ITEMS_OR_NONE>`
- Next authorized action: `<ACTION_OR_NONE>`
- Projection reconciled from current authority: `<YES_NO_AND_TIME>`

## Terminal Gate And Retention

| Gate | Required Accepted Inputs | Current Evidence | State | Reopen / Repair Route |
|---|---|---|---|---|
| `<GATE_ID>` | `<WORKLINE_GATES_AND_EXTERNAL_DECISIONS>` | `<RECEIPTS_OR_DIGESTS>` | `<OPEN_ACCEPTED_FAILED_BLOCKED>` | `<EARLIEST_AFFECTED_ITEMS>` |

- Terminal source identity: `<REVISION_OR_DIGEST>`
- Remaining consumers or risks: `<LIST_OR_NONE>`
- PM close proposal: `<KEEP_ACTIVE_RETIRE_PROPOSED_ARCHIVE_DEFERRED>`
- Authorized host closeout action: `<ACTION_OR_NONE>`

Retention is never automatic. Preserve durable artifacts and receipts even
when an active projection is retired.
