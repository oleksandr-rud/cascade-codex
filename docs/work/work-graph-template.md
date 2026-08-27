# Work Graph: WG-XXX

Status: `<DRAFT | PLANNED | ACTIVE | BLOCKED | COMPLETE | SUPERSEDED>`
Work Graph ID: `<WG-XXX>`
Work Graph Revision: `<INTEGER>`
Owner: `<PROJECT_STATE_OWNER>`
Scope: `<TASK | STORY | EPIC | INITIATIVE>`
Terminal Gate: `<WG-XXX-GX>`

Use this portable graph-shaped projection only when several independently
meaningful items need typed dependencies, owners, evidence joins, invalidation,
or partial repair. `cascade-project-management:manage-project` owns the method;
the host adds current execution bindings and receipts separately.

## Purpose

- Outcome: `<OBSERVABLE_OUTCOME>`
- Current source identity: `<PATH_REVISION_OR_DIGEST>`
- Non-goals: `<BOUNDARIES>`

## Worklines

| Workline | Outcome | Owner | Requires | Produces | State |
|---|---|---|---|---|---|
| `<W-ID>` | `<BOUNDED_OUTCOME>` | `<OWNER>` | `<INPUTS_OR_NONE>` | `<ARTIFACT_OR_RECEIPT>` | `<PENDING_READY_RUNNING_REVIEW_ACCEPTED_BLOCKED>` |

## Node Registry

| Node | Workline | Outcome | Requires | Produces | State |
|---|---|---|---|---|---|
| `<WG-XXX-NXX>` | `<W-ID>` | `<BOUNDED_OUTCOME>` | `<NODE_GATE_OR_EXTERNAL_IDS>` | `<ARTIFACT_OR_RECEIPT>` | `<PENDING_READY_RUNNING_REVIEW_ACCEPTED_BLOCKED>` |

## Gate Contracts

| Gate | Subject | Required Current Inputs | Acceptance | Invalidation / Repair |
|---|---|---|---|---|
| `<WG-XXX-GX>` | `<NODE_WORKLINE_OR_TERMINAL>` | `<EVIDENCE_DECISIONS_OR_GATES>` | `<RULE>` | `<AFFECTED_SET_AND_ROUTE>` |

## Conditional QA

| Applicability | Accepted Behavior / Risk Inputs | QA Artifact | Host Receipt | QA Result |
|---|---|---|---|---|
| `<REQUIRED_NOT_APPLICABLE>` | `<SOURCE_IDS_OR_REASON>` | `<FROZEN_ARTIFACT_OR_NONE>` | `<RUN_QA_PLAN_RECEIPT_OR_NOT_RUN>` | `<ASSESSMENT_TRIAGE_OR_NOT_APPLICABLE>` |

QA is optional evidence, not the graph owner or universal terminal gate.

## Host Execution Bindings

Readiness does not authorize dispatch.

| Node / Workline | Surface | Authority | Runtime Handle | Allowed Actions / Writes | Input Identity | Receipt |
|---|---|---|---|---|---|---|
| `<ID>` | `<root_internal-subagent_user-visible-task>` | `<REQUEST_OR_APPROVAL>` | `<HANDLE_OR_NONE>` | `<BOUNDARY>` | `<REVISION_OR_DIGEST>` | `<RECEIPT_OR_NONE>` |

## Current Frontier

- Ready: `<IDS_OR_NONE>`
- Running or review: `<IDS_OR_NONE>`
- Blocked: `<IDS_REASON_ROUTE_OR_NONE>`
- Accepted and preserved: `<IDS_OR_NONE>`
- Next authorized action: `<ACTION_OR_NONE>`

## Closeout

- Terminal gate evidence: `<CURRENT_RECEIPTS_OR_DIGESTS>`
- Remaining consumers or risks: `<LIST_OR_NONE>`
- `cascade-project-management:close-project` proposal:
  `<KEEP_ACTIVE_RETIRE_PROPOSED_ARCHIVE_DEFERRED>`
- Authorized host closeout action: `<ACTION_OR_NONE>`

Retain durable graph and evidence history. Removing an active projection or
moving frozen records requires explicit host authority; it is never automatic.
