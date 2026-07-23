# Coordination Graph: CG-XXX

Status: `<OPEN | IN_PROGRESS | BLOCKED | INTEGRATION_REVIEW | COMPLETE | SUPERSEDED>`
Planning Status: `<DRAFT | DEFINITION_READY | IMPLEMENTATION_READY | BLOCKED | SUPERSEDED>`
Plan Revision: `<1>`
Coordination Graph Revision: `<1>`
Coordination-State / Materialization Owner: `<SOLE_OWNER>`
Created: `YYYY-MM-DD`
Execution Mode: `<shared-worktree | dedicated-worktrees | mixed | no-execution>`
Terminal Gate: `<CG-TG-01>`
Next Gate: `<GATE_OR_ACTION>`

Use this template only when at least two canonical worklines have a real
cross-workline dependency, evidence/batch join, materialization or integrated
validation boundary, invalidation relationship, or partial-repair route. A
Coordination Graph is a separate `docs/work/` entity, not a workline, lane,
source/spec document, worker, or runtime.

Keep rich definitions in their authoritative product, design, brand, spec,
pattern, plan, or lane documents. Reference stable IDs, versions, and paths
here. Do not copy this template into generated or source documents.

## Goal, Scope, And Non-Goals

Goal:

`<CROSS_WORKLINE_OUTCOME>`

In scope:

- `<COORDINATION_BOUNDARY>`

Out of scope:

- `<NON_GOAL>`
- automatic scheduling, worktree creation, graph parsing, state mutation,
  branch merge, commit, push, or publication

## Applicability Decision

| Decision | Workline Count | Qualifying Relations | Why Direct References Are Insufficient | Decision Owner / Time |
|---|---:|---|---|---|
| `<CREATE_GRAPH | NO_GRAPH>` | `<COUNT>` | `<DEPENDENCY_JOIN_MATERIALIZATION_INVALIDATION_REPAIR>` | `<AMBIGUITY_OR_NOT_APPLICABLE>` | `<OWNER_TIMESTAMP>` |

If `NO_GRAPH`, stop here and route work through ordinary lane/workline state.
Several unrelated worklines are not enough.

## Source And Definition References

| Ref ID | Authority / Source | Path Or URI | Version / Freshness | Referenced Criteria / Decisions | Invalidation Rule |
|---|---|---|---|---|---|
| `CG-SRC-01` | `<OWNER>` | `<PATH>` | `<VERSION>` | `<IDS>` | `<WHEN_RECHECKED>` |

## Graph Fragment Composition

Reference the planning-time composition ledger; do not copy reusable fragment
definitions here. Only instantiated `SELECTED` or legally `MERGED` obligations
may appear in this graph. `NOT_APPLICABLE` fragments contribute no nodes,
gates, tests, dispatches, batches, or terminal evidence.

| Fragment Instance | Source Fragment / Version | Disposition | Bound Requires / Provides | Owning Workline | Resolved Actor / Skills | Required Tests / Evaluator | Omission / Invalidation Rule |
|---|---|---|---|---|---|---|---|
| `CG-FI-01` | `GF-001@1` | `<SELECTED_MERGED>` | `<PORT_BINDINGS>` | `WL-01` | `<ROLE_SKILLS>` | `<TESTS_AUTHORITY>` | `<RULE>` |

- Composition source plan/revision:
- Rejected dangling ports, duplicate owners, unsupported capabilities, or
  cycles: `<NONE_OR_BLOCKED_RECORDS>`
- Synthesized terminal inputs from selected fragments:

## Boundary Contracts

| Boundary ID | Producer / Authority | Consumer | Input / Output Contract | Compatibility / Invalidation | Required Gate |
|---|---|---|---|---|---|
| `CG-BND-01` | `<WORKLINE_OR_OWNER>` | `<WORKLINE_BATCH_OR_TERMINAL>` | `<CONTRACT>` | `<RULE>` | `<GATE_ID>` |

## Authority And Direct Cutover

Only the named Coordination-State / Materialization Owner may record
authoritative cross-workline transitions, queue changes, evidence joins,
repairs, amendments, or ownership handoffs. Workers and reviewers return bound
receipts and proposed transitions only.

| Cutover ID | Prior Authority | New Graph / Revision | Migrated Edges / Gates / Queues | Preserved / Invalidated Evidence | Cutover Time | Status / Block Route |
|---|---|---|---|---|---|---|
| `CG-CO-01` | `<LANE_PLAN_OR_NONE>` | `CG-XXX@1` | `<IDS>` | `<PRESERVED_AND_INVALIDATED>` | `<TIME>` | `<ACCEPTED_OR_BLOCKED>` |

After accepted cutover, lane packets and `docs/work/active.md` contain
read-only references/projections only. Do not maintain a second authoritative
copy or fallback path.

## Canonical Workline Registry

Rows reference workline authority; they do not duplicate definitions or
lane-local Task Graphs.

| Workline | Fragment Instances | Lane / Packet | Outcome / Criteria Refs | Owner / Thread | Write Scope | Requires | Produces Gate / Artifact | Execution Location | Status / Revision |
|---|---|---|---|---|---|---|---|---|---|
| `WL-01` | `<CG-FI-IDS>` | `<W-ID_AND_PATH>` | `<CRITERIA_IDS>` | `<OWNER_THREAD>` | `<PATHS>` | `<CG_GATE_SOURCE_IDS_OR_NONE>` | `<GATE_AND_ARTIFACT>` | `<CURRENT_OR_WORKTREE>` | `<STATE_AND_REVISION>` |

## Typed Coordination Edges

Reject duplicate IDs, dangling subjects, undefined gates, and cycles.

| Edge ID | From | Type | To | Satisfaction Rule / Immutable Transport | Invalidation / Repair Route |
|---|---|---|---|---|---|
| `CG-E-01` | `<WORKLINE_GATE_BATCH_EXTERNAL>` | `<REQUIRES_GATE_EVIDENCE_JOIN_MATERIALIZES_INVALIDATES_TERMINAL_INPUT>` | `<SUBJECT>` | `<CURRENT_ACCEPTANCE_RULE_AND_COMMIT_SET_OR_PATCH_DIFF_DIGEST>` | `<REOPEN_SET_AND_ROUTE>` |

## Coordination Gates And Evidence Joins

| Gate ID | Type / Subject | Required Inputs | Optional Inputs | Evidence Producers | Evaluator / Reviewer Authority | Acceptance Rule | Invalidation / Reopen | State | Failure / Repair Route |
|---|---|---|---|---|---|---|---|---|---|
| `CG-AG-01` | `<WORKLINE_AGGREGATE_MATERIALIZATION_BATCH_TERMINAL>` | `<CURRENT_EVIDENCE_OR_GATES>` | `<IDS_OR_NONE>` | `<ACTORS_TOOLS>` | `<INDEPENDENT_AUTHORITY>` | `<ALL_REQUIRED_CURRENT_PASS>` | `<RULE>` | `<OPEN_ACCEPTED_FAILED_BLOCKED>` | `<ROUTE>` |

| Evidence ID | Subject / Gate | Graph Revision | Input / Source Versions | Source Commit / Digest / Diff | Producer / Time | Requirement | Result | Evaluator | Invalidation / Failure Route |
|---|---|---:|---|---|---|---|---|---|---|
| `CG-EV-01` | `<SUBJECT_AND_GATE>` | `<REV>` | `<VERSIONS>` | `<BINDING>` | `<PRODUCER_TIME>` | `<REQUIRED_OPTIONAL>` | `<PASS_FAIL_BLOCKED_GAP_NOT_RUN>` | `<AUTHORITY>` | `<RULE>` |

## Dedicated Worktree Dispatch

Complete this section when `Execution Mode` includes dedicated worktrees.

| Dispatch ID | Workline | Thread | Branch / Worktree | Base SHA | Required Producer Transport / Presence Proof | Allowed Writes | Producer Gate | Attempt / Max | Input Versions | Status | Invalidation / Stop Route |
|---|---|---|---|---|---|---|---|---:|---|---|---|
| `CG-D-01` | `WL-01` | `<THREAD>` | `<BRANCH_AND_PATH>` | `<SHA>` | `<COMMIT_SET_OR_PATCH_DIFF_DIGEST_AND_PROOF_OR_NONE>` | `<PATHS>` | `<GATE>` | `<1/3>` | `<IDS_AT_VERSION>` | `<READY_IN_PROGRESS_REVIEW_ACCEPTED_BLOCKED>` | `<RULE>` |

### Worker Receipts

| Receipt ID | Workline / Gate | Plan / Graph Revision | Branch / Worktree | Base / Head SHA / Owned Commits | Immutable Transport Identity / Producer Presence Proof | Allowed / Actual Paths | Inputs / Outputs | Exact Local Checks / Evidence | Cleanliness / Blockers | Prior / Proposed State | Invalidation / Repair Route |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `CG-WR-01` | `<WL_AND_GATE>` | `<PLAN_GRAPH_REV>` | `<BRANCH_PATH>` | `<SHAS_COMMITS_OR_NONE>` | `<COMMIT_SET_PREFERRED_OR_PATCH_DIFF_DIGEST_AND_CONSUMER_PROOF>` | `<PATHS>` | `<VERSIONS>` | `<COMMANDS_RESULTS_REFS>` | `<STATE>` | `<PRIOR_TO_REVIEW>` | `<RULE>` |

Worker commits may be immutable transport artifacts. They do not authorize an
automatic merge or commit in the active worktree. Local evidence remains
provisional until the required materialization and integrated gates accept it.
An uncommitted active-worktree materialization is not a consumer worktree's Git
base. Bind dependent readiness to an immutable producer commit set or patch/
diff digest and prove that exact transport is present in the consumer
worktree.

## Materialization Queue

Materialization means accepted workline changes appear in the designated
active worktree. It does not imply committing the current branch.

| Queue ID / Order | Workline / Receipt | Required Gates | Target Worktree / Branch | Target Baseline | Allowed Paths | Transport Method | State | Conflict / Invalidation Route |
|---|---|---|---|---|---|---|---|---|
| `CG-MQ-01 / 1` | `<WL_AND_RECEIPT>` | `<GATES>` | `<ACTIVE_PATH_BRANCH>` | `<HEAD_AND_DIFF_FINGERPRINT>` | `<PATHS>` | `<PATCH_CHERRY_PICK_NO_COMMIT_OTHER>` | `<QUEUED_APPLYING_APPLIED_VALIDATING_ACCEPTED_FAILED_BLOCKED_SUPERSEDED>` | `<RULE>` |

### Materialization Receipts

| Receipt ID | Queue / Workline | Graph Revision | Source Branch / Base / Head / Immutable Transport | Target HEAD Before / After | Active Baseline / Preserved Dirty Paths | Applied Paths / Combined Diff Fingerprint | Transport Method / Conflicts | Staged State | Focused Checks | Prior / Proposed State | Rollback / Repair Route |
|---|---|---:|---|---|---|---|---|---|---|---|---|
| `CG-MR-01` | `<QUEUE_WL>` | `<REV>` | `<SOURCE_BINDING>` | `<BEFORE_AFTER>` | `<BASELINE_DIRTY_PATHS>` | `<PATHS_FINGERPRINT>` | `<METHOD_CONFLICTS>` | `<STAGED_UNSTAGED_MIXED>` | `<COMMANDS_RESULTS>` | `<PRIOR_TO_PROPOSED>` | `<ROUTE>` |

Block on unexplained overlap with pre-existing active-worktree changes. Do not
clean, reset, broadly stage, commit, push, or publish as an implied graph
operation.

## Batch Evaluation Matrix

| Batch ID | Required Workline / Materialization Gates | Producer Transport Identities | Target HEAD / Combined Diff | Input / Definition Digests | Runner / Model / Environment / Rubric Versions | Shards / Expected Coverage | Required / Optional Evidence | Missing / Duplicate Policy | Aggregation Rule | State | Failure / Repair Route |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `CG-BATCH-01` | `<GATE_IDS>` | `<COMMIT_SETS_OR_PATCH_DIFF_DIGESTS>` | `<HEAD_DIFF>` | `<VERSIONS_DIGESTS>` | `<VERSIONS_OR_NA>` | `<SHARDS_COVERAGE>` | `<EVIDENCE_IDS>` | `<POLICY>` | `<ALL_REQUIRED_CURRENT_PASS>` | `<OPEN_ACCEPTED_FAILED_BLOCKED>` | `<EARLIEST_RESPONSIBLE_ROUTE>` |

Keep authored, deterministic, executed, reviewed, judged, calibrated,
historical, materialized, and accepted evidence distinct. A required missing
shard or required `FAIL`, `BLOCKED`, `GAP`, or `NOT_RUN` blocks acceptance.

## Integrated Active-Worktree Validation

| Validation ID | Subject / Combined State | Graph Revision | Target HEAD / Diff Fingerprint | Required Checks / Evaluations | Evidence | Result | Invalidation Rule | Repair Route |
|---|---|---:|---|---|---|---|---|---|
| `CG-IV-01` | `<MATERIALIZED_SET>` | `<REV>` | `<HEAD_DIFF>` | `<COMMANDS_BATCHES_REVIEWS>` | `<EVIDENCE_IDS>` | `<PASS_FAIL_BLOCKED_GAP_NOT_RUN>` | `<INPUT_GRAPH_DIFF_OR_CHECK_CHANGE>` | `<EARLIEST_RESPONSIBLE_AND_CONSUMERS>` |

Pre-materialization results cannot prove combined-state acceptance. The
terminal gate consumes only current workline, materialization, batch, and
integrated evidence for the same graph revision and combined state.

## Reconciliation And Dispositions

| Workline / Record | Current Authority / Evidence | Duplicate / Drift Comparison | Inbound Consumers | Disposition | Canonical Survivor / Migration | Retention / Active-Row Route | Status |
|---|---|---|---|---|---|---|---|
| `<W-ID>` | `<PATH_REFS>` | `<OUTCOME_CRITERIA_SCOPE_OUTPUT_EVIDENCE>` | `<IDS>` | `<KEEP_UPDATE_MERGE_INTO_SUPERSEDE_BY_RETIRE_ACTIVE_ROW_BLOCKED_REVIEW>` | `<SURVIVOR_AND_MIGRATED_REFS>` | `<PRESERVE_THEN_CLOSEOUT>` | `<PROPOSED_APPLIED_BLOCKED>` |

`BLOCKED_REVIEW` prevents cutover for the unresolved workline. Preserve durable
packets, reports, receipts, revisions, and evidence; never delete them merely
because active projections are stale or work is superseded.

## Transition And Repair History

| Transition ID / Time | Subject | Prior -> Next | Recorded By | Preconditions | Receipt / Evidence | Invalidation | Failure / Resume Route |
|---|---|---|---|---|---|---|---|
| `CG-TR-01 / <TIME>` | `<WORKLINE_GATE_QUEUE_BATCH>` | `<STATE_TO_STATE>` | `<SOLE_OWNER>` | `<RULE>` | `<IDS>` | `<RULE>` | `<ROUTE>` |

| Repair ID / Time | Failure Class / Cause | Failed Evidence / Input | Earliest Responsible Workline | Reopened Worklines / Gates / Queue / Batches | Preserved Accepted IDs | Versions / Attempts / Revisions | Resume Route |
|---|---|---|---|---|---|---|---|
| `CG-RP-01 / <TIME>` | `<CLASS_CAUSE>` | `<IDS>` | `<WL-ID>` | `<AFFECTED_SET>` | `<UNCHANGED_SET>` | `<BINDINGS>` | `<PENDING_OR_QUEUED_RECALCULATION>` |

## Amendment And Ownership-Handoff History

| Amendment ID / Time | Prior -> Next Graph Revision | Reason | Changed Worklines / Edges / Owners / Gates / Materialization | Stable New / Replacement IDs | Preserved / Invalidated Evidence | Affected Consumers | Recomputed Frontier |
|---|---|---|---|---|---|---|---|
| `CG-AM-01 / <TIME>` | `<1_TO_2>` | `<REASON>` | `<DELTA>` | `<IDS>` | `<PRESERVED_INVALIDATED>` | `<IDS>` | `<FRONTIER>` |

| Handoff ID | Prior Owner | Incoming Owner | Prior -> New Revision | Mutation-Blocked Window | Accepted Record / Evidence | Status | Resume / Invalidation Rule |
|---|---|---|---|---|---|---|---|
| `CG-OH-01` | `<PRIOR>` | `<INCOMING>` | `<REV_TO_REV>` | `<FROM_TO>` | `<RECORD_IDS>` | `<PENDING_ACCEPTED_REJECTED>` | `<RULE>` |

## Current Frontier (Derived)

- Coordination Graph / Plan revision: `<GRAPH / PLAN>`
- Ready worklines: `<IDS_OR_NONE>`
- In progress / review: `<IDS_OR_NONE>`
- Accepted workline gates: `<IDS_OR_NONE>`
- Materialization queue / applied / validating: `<IDS_AND_STATE>`
- Open evidence or batch joins: `<IDS_AND_ABSENT_INPUTS>`
- Blocked / failed: `<IDS_AND_ROUTE>`
- Preserved accepted work: `<IDS>`
- Next executable or materialization action: `<ID_OR_NONE>`
- Projection reconciliation: `<CURRENT_OR_REBUILT_FROM_AUTHORITY>`

## Terminal Gate

| Gate | Required Workline Gates | Required Materialization Gates | Required Batch / Integrated Evidence | Residual Risk Owner | Acceptance Rule | State | Reopen Route |
|---|---|---|---|---|---|---|---|
| `CG-TG-01` | `<IDS>` | `<IDS>` | `<IDS>` | `<OWNER>` | `<EVERY_REQUIRED_CURRENT_PASS_SAME_REVISION_AND_COMBINED_STATE>` | `<OPEN_ACCEPTED_FAILED_BLOCKED>` | `<EARLIEST_RESPONSIBLE_PARTIAL_REPAIR>` |

## Validation And Retention

| Check | Command Or Evidence | Status |
|---|---|---|
| topology and unique IDs | `<CHECK>` | `<OPEN_PASS_FAIL_BLOCKED>` |
| source/gate/evidence bindings | `<CHECK>` | `<STATUS>` |
| active-worktree overlap and materialization | `<CHECK>` | `<STATUS>` |
| batch and integrated acceptance | `<CHECK>` | `<STATUS>` |
| direct-cutover and projection reconciliation | `<CHECK>` | `<STATUS>` |

- Durable graph path and revision retained:
- Reports and evidence retained:
- Active-row retirement route:
- Commit/push/publication authority, if separately requested:
- Remaining risk and next gate:
