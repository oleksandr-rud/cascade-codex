# Iteration Delivery Plan

Status: `<DRAFT | HORIZON_READY | ITERATION_PROPOSED | ITERATION_COMMITTED | ITERATION_READY | BLOCKED | SUPERSEDED>`
Delivery Plan Revision: `<1>`
Source Plan / Revision: `<PATH_OR_ID / REVISION>`
Source Completeness: `<COMPLETE | PARTIAL | BLOCKED>`
Coordinator: `<ROLE_OR_USER>`
Commitment Authority: `<SOURCE_OR_UNRESOLVED>`
Integration Owner: `<SOURCE_OR_UNRESOLVED>`
Review Authority: `<SOURCE_OR_UNRESOLVED>`
Terminal Acceptance Authority: `<SOURCE_OR_UNRESOLVED>`
Cadence / Capacity Basis: `<EXPLICIT_VALUE_OR_UNKNOWN>`

## Outcome And MVP Boundary

- User or operational outcome:
- MVP acceptance boundary:
- First-iteration learning or delivery goal:
- First-iteration commitment state: `<PROPOSED | COMMITTED>`
- Non-goals:

## Delivery Disposition Map

| Disposition | Outcome | Slice IDs | Candidate IDs | State | Promotion / Reconsideration Trigger |
|---|---|---|---|---|---|
| `FIRST_ITERATION` | `<OUTCOME>` | `<SL-IDS>` | `<CW-IDS>` | `<PROPOSED_OR_COMMITTED>` | `<REVIEW_RULE>` |
| `NEXT` | `<OUTCOME_OR_NONE>` | `<SL-IDS_OR_NONE>` | `<CW-IDS_OR_NONE>` | `CANDIDATE` | `<PROMOTION_RULE>` |
| `LATER` | `<OPTION_OR_NONE>` | `<SL-IDS_OR_NONE>` | `<CW-IDS_OR_NONE>` | `UNSCHEDULED` | `<RECONSIDERATION_RULE>` |
| `DEFERRED` | `<OUTCOME_OR_NONE>` | `<SL-IDS_OR_NONE>` | `<CW-IDS_OR_NONE>` | `DEFERRED` | `<RECONSIDERATION_RULE>` |
| `REMOVED` | `<EXCLUDED_OUTCOME_OR_NONE>` | `<SL-IDS_OR_NONE>` | `<CW-IDS_OR_NONE>` | `REMOVED` | `<SOURCE_AND_RATIONALE>` |

Each slice and candidate appears in exactly one delivery disposition. MVP
membership is recorded separately and may span dispositions.

## Ordered Backlog

| Rank | Candidate | Disposition | MVP Membership | Outcome | Slice / Criterion IDs | Priority Evidence | Dependencies | Ordering Rationale | Promotion Trigger |
|---|---|---|---|---|---|---|---|---|---|
| `1` | `CW-01` | `FIRST_ITERATION` | `MVP_REQUIRED` | `<OUTCOME>` | `<IDS>` | `<SOURCE_LINKED_VALUE_LEARNING_RISK>` | `<IDS_OR_NONE>` | `<RATIONALE>` | `<RULE_OR_NONE>` |

Rank expresses delivery priority. Dependencies express legal execution order.

## Candidate Delivery Contracts

| Candidate | Owner / Write Boundary | Definition of Ready | Definition of Done | Acceptance Evidence | Evidence State | Mandatory Assurance | Review Route | Capacity Basis |
|---|---|---|---|---|---|---|---|---|
| `CW-01` | `<OWNER_PATHS>` | `<ENTRY_CONDITIONS>` | `<TERMINAL_CONDITIONS>` | `<COMMAND_OR_CHECK>` | `<PLANNED_NOT_RUN_PASS_FAIL_BLOCKED_STALE>` | `<REQUIRED_CONDITIONAL_NOT_APPLICABLE_BLOCKED + ROUTE>` | `<ROUTE_AND_TRIGGER>` | `<EXPLICIT_OR_UNKNOWN>` |

## First Iteration Contract

- Iteration goal:
- Thin vertical entry point and end-to-end path:
- Vertical-slice feasibility: `<PASS | NO_FEASIBLE_VERTICAL_SLICE | UNKNOWN>`
- Included committed candidates, or proposed candidates when uncommitted:
- Excluded scope:
- WIP limit or concurrency basis:
- Dependency order:
- Integration owner, if needed:
- Iteration Definition of Done:
- Terminal acceptance owner:
- Review checkpoint:
- Stop or replan condition:

## Capacity And Feasibility

| Bound | Supplied Basis | Required Load | Result | Gap / Replan Route |
|---|---|---|---|---|
| Aggregate capacity | `<PEOPLE_TIME_WIP_OR_OTHER>` | `<TOTAL>` | `<PASS_UNKNOWN_VIOLATED>` | `<DETAIL>` |
| Dependency critical path | `<CADENCE_OR_DEADLINE>` | `<LONGEST_CHAIN>` | `<PASS_UNKNOWN_VIOLATED>` | `<DETAIL>` |
| Role-specific capacity | `<ROLE_CAPACITY>` | `<ROLE_LOAD>` | `<PASS_UNKNOWN_VIOLATED_NOT_APPLICABLE>` | `<DETAIL>` |
| Write/resource serialization | `<BOUNDARY>` | `<LOAD_OR_CHAIN>` | `<PASS_UNKNOWN_VIOLATED_NOT_APPLICABLE>` | `<DETAIL>` |

Do not divide a dependency chain by team size or assume internal slice
parallelism. A violated material bound prevents `ITERATION_READY` and any
execution handoff. A feasible horizontal subset does not satisfy the first
iteration when it lacks the declared entry point and observable outcome.

## MVP Coverage

| MVP Criterion | Required Slices | Delivery Dispositions | Planned Evidence | Coverage Status | Gap / Blocker |
|---|---|---|---|---|---|
| `<CRITERION_ID>` | `<SL-IDS>` | `<FIRST_ITERATION_NEXT_LATER_DEFERRED>` | `<CHECKS>` | `<COVERED_PARTIAL_GAP_BLOCKED>` | `<DETAIL_OR_NONE>` |

## Assurance Ledger

| Obligation | Disposition | Candidate / Slice | Route / Owner | Evidence State | Rationale / Blocker |
|---|---|---|---|---|---|
| `<SECURITY_INTEGRITY_ACCESSIBILITY_MIGRATION_ROLLBACK_FUNCTIONAL_REVIEW_VALIDATION>` | `<REQUIRED_CONDITIONAL_NOT_APPLICABLE_BLOCKED>` | `<IDS>` | `<ROUTE>` | `<PLANNED_NOT_RUN_PASS_FAIL_BLOCKED_STALE>` | `<DETAIL>` |

## Source Conflicts And Retrieval Gaps

| Source / Tool | State | Conflict Or Gap | Affected Candidates / Decisions | Resolution Authority / Route |
|---|---|---|---|---|
| `<ID>` | `<CURRENT_STALE_MISSING_TRUNCATED_FAILED_CONFLICTING>` | `<DETAIL>` | `<IDS>` | `<OWNER_OR_ROUTE>` |

## Evidence-Driven Promotion

| Evidence Or Event | Affected Candidate | Promote / Keep / Reorder / Defer / Remove / Stop | Decision Owner | Plan Revision Trigger |
|---|---|---|---|---|
| `<SIGNAL>` | `<CW-ID>` | `<ACTION>` | `<OWNER>` | `<RULE>` |

## Existing Active Work

| Active Identity | Current Authority / Revision | Proposed Impact | Reconciliation State | Receipt / Blocker | Preservation / Invalidation Rule |
|---|---|---|---|---|---|
| `<W_CG_OR_WG_ID>` | `<PATH_REVISION>` | `<UNCHANGED_REPRIORITIZE_SUPERSEDE_CLOSE>` | `<NONE_RECONCILE_REQUIRED_RECONCILED_PLAN_CHANGE_REQUIRED_CLOSEOUT_REQUIRED_BLOCKED>` | `<ID_OR_REASON>` | `<RULE>` |

## Revision History

| Revision | Effective State | Trigger / Changed Source | Prior Revision Disposition | Changed Candidates | Evidence Preserved / Invalidated / Rerun | Affected Consumers | Commitment Authority |
|---|---|---|---|---|---|---|---|
| `1` | `<CURRENT_OR_SUPERSEDED>` | `<TRIGGER>` | `<NONE_OR_SUPERSEDED_BY>` | `<IDS>` | `<DETAIL>` | `<CONSUMERS>` | `<SOURCE_OR_UNRESOLVED>` |

## Handoff

- First-iteration commitment state: `<PROPOSED_OR_COMMITTED>`
- Commitment authority and capacity basis:
- Integration, review, and terminal acceptance authorities:
- Capacity and critical-path feasibility:
- Eligible committed candidates:
- Coordination route: `<DIRECT_IMPLEMENTATION_ORCHESTRATE_WITHOUT_GRAPH_TASK_GRAPH_CANDIDATE_COORDINATION_GRAPH_CANDIDATE_BLOCKED>`
- Existing-work route: `<NONE_RECONCILE_REQUIRED_RECONCILED_PLAN_CHANGE_REQUIRED_CLOSEOUT_REQUIRED_BLOCKED>`
- Next route:
- Assumptions:
- Blockers:
