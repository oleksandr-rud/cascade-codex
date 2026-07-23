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
- Ownership handoff: `<NOT_APPLICABLE | PENDING | ACCEPTED>`
- Handoff acceptance record: `<RECORD_ID_PRIOR_OWNER_INCOMING_OWNER_GRAPH_REVISION_OR_NONE>`
- Mutation rule during handoff: both prior and incoming owners remain blocked
  until explicit handoff acceptance binds the incoming owner and new revision.
- Authoritative state sources:
- Derived projections and reconciliation rule:

### Entity And State Authority

| Entity / Field | Stable Identity | Authority / Source Of Truth | Mutable By | Derived From | Lifecycle / Retention |
|---|---|---|---|---|---|
| `<ENTITY>` | `<ID_RULE>` | `<OWNER>` | `<ACTOR>` | `<SOURCE_OR_NONE>` | `<RULE>` |

### State Transitions

| Subject | From | To | Transition Owner | Preconditions | Required Evidence | Invalidation Condition | Failure / Resume Route |
|---|---|---|---|---|---|---|---|
| `<ENTITY>` | `<STATE>` | `<STATE>` | `<ACTOR>` | `<CONDITIONS>` | `<EVIDENCE>` | `<INVALIDATION>` | `<ROUTE>` |

### Typed Dependencies And Gates

Keep prerequisite nodes, acceptance gates, and external conditions structurally
separate. Walk the dependency order before implementation; an aggregate or
terminal gate must not make a producer depend on its own consumer.

#### Requires Nodes

| Dependency ID | Prerequisite Node ID | Consumer Node ID | Required State | Input Version / Freshness | Invalidation / Reopen Rule |
|---|---|---|---|---|---|
| `DN-01` | `<NODE_ID>` | `<NODE_ID>` | `ACCEPTED` | `<VERSION_RULE>` | `<RULE>` |

#### Requires Gates

Gate IDs are lane-scoped. A cross-lane gate reference must also name its
producer lane.

| Dependency ID | Producer Lane ID | Acceptance Gate ID | Consumer Node ID | Required State | Evidence Version / Freshness | Invalidation / Reopen Rule |
|---|---|---|---|---|---|---|
| `DG-01` | `<LANE_ID_OR_CURRENT_LANE>` | `<GATE_ID>` | `<NODE_ID>` | `ACCEPTED` | `<VERSION_RULE>` | `<RULE>` |

#### External Conditions

| Condition ID | Condition | Authority / Source | Consumer Node ID | Satisfaction / Freshness Rule | Block / Invalidation Route |
|---|---|---|---|---|---|
| `EXT-01` | `<CONDITION>` | `<OWNER_OR_SOURCE>` | `<NODE_ID>` | `<RULE>` | `<ROUTE>` |

### Retry And Resource Bounds

| Subject | Attempt / Maximum | Time / Token / Tool / Cost Bound | Exhaustion Route | Idempotency / Cleanup |
|---|---|---|---|---|
| `<ID>` | `<CURRENT_MAX>` | `<BOUNDS_OR_NONE_WITH_REASON>` | `<BLOCK_ESCALATE_REPLAN>` | `<RULE>` |

### Readiness And Cross-Lane Inputs

Readiness must cover typed accepted dependencies, current versioned inputs,
external conditions, permissions/tools, write or integration/materialization
ownership, attempt and
exhaustion bounds, and any paid/live cost, idempotency, and cleanup bounds.

| Subject | Ready-State Authority | Input / Source Versions | Permissions / Tools / Write Scope | Cross-Lane Producer Lane / Gate / Evidence / Integration Owner | Block / Invalidation Route |
|---|---|---|---|---|---|
| `<NODE_OR_WORKLINE>` | `<AUTHORITATIVE_STATE_SOURCE>` | `<VERSIONS>` | `<BOUNDS>` | `<IDS_OR_NONE>` | `<ROUTE>` |

## Behavior And Failure Trajectories

| ID | Given / Starting State | When | Expected Outcome | Failure Or Adjacent Mode | Evidence |
|---|---|---|---|---|---|
| `TR-01` | `<STATE>` | `<ACTION>` | `<OUTCOME>` | `<NEGATIVE_STALE_AUTHORIZATION_RESUME_CONCURRENT>` | `<CHECK>` |

## Graph Fragment Composition

Evaluate the reusable catalog in `docs/patterns/workflow/fragments/`. This is a
planning ledger, not active graph state. Atomic work may record one explicit
catalog-bypass reason. Non-atomic work must disposition every materially
plausible delivery fragment and assurance overlay.

### Delivery Surface And Assurance Audit

| Fragment / Version | Activation Evidence | Disposition / Reason | Requires | Provides | Omission Consequence |
|---|---|---|---|---|---|
| `GF-001@1` | `<REQUEST_SOURCE_BOUNDARY_IDS>` | `<SELECTED_MERGED_NOT_APPLICABLE_BLOCKED>` | `<PORTS>` | `<PORTS>` | `<NONE_OR_RISK_GAP>` |

### Fragment Port Bindings

| Binding ID | Consumer Fragment / Port | Producer Fragment / Port Or External Authority | Condition / Version | Owning Workline | Invalidation / Reopen Rule |
|---|---|---|---|---|---|
| `FP-01` | `<GF-ID/PORT>` | `<GF-ID/PORT_OR_SOURCE_ID>` | `<RULE>` | `<WL-ID_OR_PENDING>` | `<RULE>` |

### Actor, Skill, Test, And Assurance Resolution

| Fragment Instance | Actor Capability | Resolved Role / Worker Route | Skill Calls And Conditions | Test Strategies -> Commands / Fixtures / Environment | Evaluator / Reviewer | Status |
|---|---|---|---|---|---|---|
| `FI-01` | `<CAPABILITY>` | `<EXISTING_ROLE_AUTHORIZED_WORKER_BLOCKED>` | `<SKILL_WHEN_REQUIRED>` | `<STRATEGY_COMMAND_DATA_ENV>` | `<INDEPENDENT_AUTHORITY>` | `<READY_BLOCKED_GAP>` |

### Assembled Flow

- Emission: `<ATOMIC_NO_GRAPH | LANE_LOCAL_TASK_GRAPH | COORDINATION_GRAPH>`
- Composition rationale:
- Selected fragment instances:
- Merged fragment obligations:
- Synthesized nodes and gates:
- Terminal evidence join:
- Rejected topology or unresolved bindings:

## Workline Discovery

Discover candidate worklines from the request and inspected boundaries. Do not
start from a requested or default number.

| Candidate | Independent Outcome | Definitions / Criteria Owned | Write Scope | Dependencies | Validation Seam | Disposition / Reason |
|---|---|---|---|---|---|---|
| `C-01` | `<OUTCOME>` | `<IDS>` | `<PATHS>` | `<IDS_OR_NONE>` | `<CHECK>` | `<SELECT_MERGE_SERIALIZE_DEFER>` |

## Selected Workline Map

| Workline | Fragment Instances | Outcome | Primary Criteria | Requires / Produces Ports | Ownership / Writes | Actor / Skills | Validation / Evaluator | Materialization | Status |
|---|---|---|---|---|---|---|---|---|---|
| `WL-01` | `<FI-IDS>` | `<OUTCOME>` | `<CRITERION_IDS>` | `<BOUND_PORTS>` | `<OWNER_PATHS>` | `<ROLE_SKILLS>` | `<CHECK_AUTHORITY>` | `<SAME_LANE_NEW_LANE>` | `<OPEN_BLOCKED_READY>` |

Every request criterion must have one primary workline owner. Protected
consumers may reference the same criterion, but ownership must not be
ambiguous. A selected workline becomes a separate active lane only when it
needs independent status, ownership, dependencies, validation, or handoff.

## Implementation Slices

| Slice | Workline / Fragment | Implements | Inputs | Files / Contracts | Output | Acceptance Evidence | Repair / Stop Boundary |
|---|---|---|---|---|---|---|---|
| `SL-01` | `WL-01 / FI-01` | `<DEF_CRITERION_TRAJECTORY_IDS>` | `<SOURCE_BOUNDARY_PORT_IDS>` | `<PATHS>` | `<OUTPUT>` | `<EVIDENCE>` | `<ROUTE>` |

## Traceability

| Requirement / Definition | Primary Workline | Implementation Slice | Artifact | Evidence | Status |
|---|---|---|---|---|---|
| `<ID>` | `<WL-ID>` | `<SL-ID>` | `<PATH_OR_OUTPUT>` | `<CHECK_OR_JOIN>` | `<OPEN_COVERED_BLOCKED_DEFERRED>` |

## Replanning And Preservation History

| Plan Revision | Trigger | Preserved | Changed / Added | Invalidated / Superseded | Worklines Re-evaluated | Evidence Impact |
|---|---|---|---|---|---|---|
| `1` | `<INITIAL_OR_TRIGGER>` | `<IDS>` | `<IDS>` | `<IDS>` | `<IDS>` | `<IMPACT>` |

Material replanning appends a plan-revision row before replacing current
projections. An instantiated graph-only amendment belongs in the lane's graph
amendment history and does not add a plan-revision row unless planning
knowledge, definitions, workline boundaries, or implementation decisions also
changed. Preserve the identity and disposition of invalidated decisions; do not
silently delete them from the planning record.

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
