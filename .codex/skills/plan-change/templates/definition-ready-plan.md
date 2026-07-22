# Definition-Ready Implementation Plan

Status: `<DRAFT | DEFINITION_READY | IMPLEMENTATION_READY | BLOCKED | SUPERSEDED>`
Plan Revision: `<1>`
Request Or Source ID: `<THREAD_TICKET_SPEC>`
Coordinator: `<ROLE_OR_USER>`
Active Lane References: `<W-XXX_OR_NONE>`

Use this template for non-atomic work whose implementation can lose important
definitions, boundary decisions, or workline dependencies. Keep detailed source
material in its authoritative owner and preserve compact identities, decisions,
statuses, and links here.

## Outcome Contract

- Problem or user pain:
- Intended behavior:
- Success criteria:
- Non-goals:
- Highest useful validation seam:

## Source Ledger

| Source ID | Authority / Owner | Path Or Reference | Version / Freshness | Supports | Status |
|---|---|---|---|---|---|
| `SRC-01` | `<OWNER>` | `<PATH_OR_ID>` | `<VERSION_CURRENT_STALE_UNKNOWN>` | `<CRITERIA_OR_DECISIONS>` | `<AUTHORITATIVE_SUPPORTING_CONFLICTING_BLOCKED>` |

## Definition And Decision Ledger

| ID | Definition Or Decision | Authority | Source | Consumers | Change / Invalidation Rule | Status |
|---|---|---|---|---|---|---|
| `DEF-01` | `<PRECISE_STATEMENT>` | `<OWNER>` | `SRC-01` | `<WORKLINES_FILES_SKILLS>` | `<WHEN_RECHECKED_OR_INVALIDATED>` | `<ACCEPTED_ASSUMED_OPEN_BLOCKED_SUPERSEDED>` |

Preserve negative constraints and rejected alternatives when losing them would
allow an unsafe or repeatedly rejected implementation.

## Assumptions, Questions, And Deferred Decisions

| ID | Type | Statement | Impact If Wrong | Resolution Route / Owner | Status |
|---|---|---|---|---|---|
| `Q-01` | `<ASSUMPTION_QUESTION_DEFERRED_REJECTED>` | `<STATEMENT>` | `<IMPACT>` | `<SOURCE_SKILL_OWNER>` | `<OPEN_BLOCKED_ACCEPTED_SUPERSEDED>` |

## Boundary Contracts

| Boundary ID | Producer / Authority | Consumer | Input / Output Contract | Compatibility / Invalidation Rule | Required Check |
|---|---|---|---|---|---|
| `BND-01` | `<OWNER>` | `<CONSUMER>` | `<CONTRACT>` | `<RULE>` | `<CHECK>` |

## Operational Semantics When Applicable

Use this section when the change introduces or modifies state, graphs,
dependencies, joins/gates, retries, queues, approvals, concurrency, or derived
projections. Omit it only when those mechanics are genuinely absent.

- Applicability: `<GRAPH_REQUIRED | ATOMIC_BYPASS>`
- Applicability rationale:
- Graph revision: `<REVISION_OR_NONE>`
- Lane-state owner:
- Authoritative state sources:
- Derived projections and reconciliation rule:

### Entity And State Authority

| Entity / Field | Stable Identity | Authority / Source Of Truth | Mutable By | Derived From | Lifecycle / Retention |
|---|---|---|---|---|---|
| `<ENTITY>` | `<ID_RULE>` | `<OWNER>` | `<ACTOR>` | `<SOURCE_OR_NONE>` | `<RULE>` |

### State Transitions

| Subject | From | To | Transition Owner | Preconditions | Required Evidence | Failure / Resume Route |
|---|---|---|---|---|---|---|
| `<ENTITY>` | `<STATE>` | `<STATE>` | `<ACTOR>` | `<CONDITIONS>` | `<EVIDENCE>` | `<ROUTE>` |

### Dependencies And Gates

Keep prerequisite nodes, acceptance gates, and external conditions in separate
fields. Walk the dependency order before implementation; an aggregate or
terminal gate must not make a producer depend on its own consumer.

| ID | Type | Prerequisite / Inputs | Consumer / Subject | Satisfaction / Acceptance Rule | Invalidation / Reopen Rule |
|---|---|---|---|---|---|
| `DEP-01` | `<NODE_GATE_EXTERNAL>` | `<IDS>` | `<ID>` | `<RULE>` | `<RULE>` |

### Retry And Resource Bounds

| Subject | Attempt / Maximum | Time / Token / Tool / Cost Bound | Exhaustion Route | Idempotency / Cleanup |
|---|---|---|---|---|
| `<ID>` | `<CURRENT_MAX>` | `<BOUNDS_OR_NONE_WITH_REASON>` | `<BLOCK_ESCALATE_REPLAN>` | `<RULE>` |

### Readiness And Cross-Lane Inputs

Readiness must cover typed accepted dependencies, current versioned inputs,
external conditions, permissions/tools, write or merge ownership, attempt and
exhaustion bounds, and any paid/live cost, idempotency, and cleanup bounds.

| Subject | Ready-State Authority | Input / Source Versions | Permissions / Tools / Write Scope | Cross-Lane Producer Gate / Evidence / Merge Owner | Block / Invalidation Route |
|---|---|---|---|---|---|
| `<NODE_OR_WORKLINE>` | `<AUTHORITATIVE_STATE_SOURCE>` | `<VERSIONS>` | `<BOUNDS>` | `<IDS_OR_NONE>` | `<ROUTE>` |

## Behavior And Failure Trajectories

| ID | Given / Starting State | When | Expected Outcome | Failure Or Adjacent Mode | Evidence |
|---|---|---|---|---|---|
| `TR-01` | `<STATE>` | `<ACTION>` | `<OUTCOME>` | `<NEGATIVE_STALE_AUTHORIZATION_RESUME_CONCURRENT>` | `<CHECK>` |

## Workline Discovery

Discover candidate worklines from the request and inspected boundaries. Do not
start from a requested or default number.

| Candidate | Independent Outcome | Definitions / Criteria Owned | Write Scope | Dependencies | Validation Seam | Disposition / Reason |
|---|---|---|---|---|---|---|
| `C-01` | `<OUTCOME>` | `<IDS>` | `<PATHS>` | `<IDS_OR_NONE>` | `<CHECK>` | `<SELECT_MERGE_SERIALIZE_DEFER>` |

## Selected Workline Map

| Workline | Outcome | Primary Criteria | Requires | Produces | Ownership / Writes | Validation | Materialization | Status |
|---|---|---|---|---|---|---|---|---|
| `WL-01` | `<OUTCOME>` | `<CRITERION_IDS>` | `<WORKLINE_GATE_OR_SOURCE_IDS>` | `<ARTIFACT_OR_DECISION>` | `<OWNER_PATHS>` | `<CHECK>` | `<SAME_LANE_NEW_LANE>` | `<OPEN_BLOCKED_READY>` |

Every request criterion must have one primary workline owner. Protected
consumers may reference the same criterion, but ownership must not be
ambiguous. A selected workline becomes a separate active lane only when it
needs independent status, ownership, dependencies, validation, or handoff.

## Implementation Slices

| Slice | Workline | Implements | Inputs | Files / Contracts | Output | Acceptance Evidence | Repair / Stop Boundary |
|---|---|---|---|---|---|---|---|
| `SL-01` | `WL-01` | `<DEF_CRITERION_TRAJECTORY_IDS>` | `<SOURCE_BOUNDARY_IDS>` | `<PATHS>` | `<OUTPUT>` | `<EVIDENCE>` | `<ROUTE>` |

## Traceability

| Requirement / Definition | Primary Workline | Implementation Slice | Artifact | Evidence | Status |
|---|---|---|---|---|---|
| `<ID>` | `<WL-ID>` | `<SL-ID>` | `<PATH_OR_OUTPUT>` | `<CHECK_OR_JOIN>` | `<OPEN_COVERED_BLOCKED_DEFERRED>` |

## Replanning And Preservation History

| Revision | Trigger | Preserved | Changed / Added | Invalidated / Superseded | Worklines Re-evaluated | Evidence Impact |
|---|---|---|---|---|---|---|
| `1` | `<INITIAL_OR_TRIGGER>` | `<IDS>` | `<IDS>` | `<IDS>` | `<IDS>` | `<IMPACT>` |

Replanning appends a revision row before replacing current projections. Preserve
the identity and disposition of invalidated decisions; do not silently delete
them from the planning record.

## Validation Plan

| Evidence | Proves | Command Or Check | Required | Status |
|---|---|---|---|---|
| `<EVIDENCE_ID>` | `<CRITERIA_DEFINITIONS_BOUNDARIES>` | `<COMMAND_OR_REVIEW>` | `<YES_NO>` | `<NOT_RUN_PASS_FAIL_BLOCKED_GAP>` |

## Compact Resume Contract

- Authoritative sources and versions:
- Accepted definitions and decisions:
- Negative constraints:
- Current worklines and dependencies:
- Changed artifacts and accepted evidence:
- Open questions, blockers, and invalidated knowledge:
- Next executable gate:
