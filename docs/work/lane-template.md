# Work Lane: W-XXX

Status: `<OPEN | IN_PROGRESS | BLOCKED | READY_TO_MERGE | COMPLETE | SUPERSEDED>`
Owner: `<ROLE_OR_USER>`
Created: `YYYY-MM-DD`
Plan Revision: `<INTEGER>`
Next Gate: `<PLUGIN_SKILL_HOST_ADAPTER_OR_COMMAND>`
Execution Surface: `<root | internal-subagent | user-visible-task>`
Dispatch State: `<NOT_AUTHORIZED | AUTHORIZED | DISPATCHED | RUNNING | BLOCKED | COMPLETE>`
Runtime Handle: `<AGENT_OR_TASK_ID | none>`

Use a lane only when work needs durable status, an independent owner or
handoff, a real dependency, or separately accepted evidence. Keep an ordinary
bounded change in the current task plan.

This file is a host projection. Cascade Project Management owns reusable
planning and coordination methods; Cascade QA owns reusable quality methods.
The repository harness owns current paths, authority, commands, execution, and
durable receipts.

## Request And Outcome

- Request: `<CURRENT_REQUEST_OR_TICKET>`
- Intended outcome: `<OBSERVABLE_OUTCOME>`
- Non-goals: `<EXPLICIT_BOUNDARIES>`
- Success criteria: `<CURRENT_ACCEPTANCE_CRITERIA>`

## Source References

Reference authoritative material instead of copying it.

| Source | Identity / Version | Supports | Freshness / Conflict |
|---|---|---|---|
| `<PATH_TICKET_OR_TOOL>` | `<REVISION_OR_DIGEST>` | `<DECISION_OR_CRITERIA>` | `<CURRENT_STALE_CONFLICTING>` |

## Work Items

Create only independently meaningful items. Files, skills, tests, or available
agents are not reasons to split work.

| Item | Outcome | Owner | Requires | Produces | Write Boundary | State | Next Gate |
|---|---|---|---|---|---|---|---|
| `WL-01` | `<BOUNDED_OUTCOME>` | `<OWNER>` | `<INPUT_OR_NONE>` | `<ARTIFACT_OR_RECEIPT>` | `<PATHS_OR_NONE>` | `<PENDING_READY_RUNNING_REVIEW_ACCEPTED_BLOCKED>` | `<ROUTE>` |

## Decisions And Risks

| ID | Decision, Assumption, Question, Or Risk | Authority / Owner | Impact | State / Resolution Route |
|---|---|---|---|---|
| `D-01` | `<STATEMENT>` | `<SOURCE_OR_OWNER>` | `<AFFECTED_ITEMS>` | `<ACCEPTED_OPEN_BLOCKED_SUPERSEDED>` |

## Dependencies And Joins

Use direct references for a small dependency. Create a separate Coordination
Graph only when two or more worklines need cross-owner joins, materialization,
invalidation, or partial repair that this table cannot express safely.

| Dependency / Join | Producer | Consumer | Satisfaction Evidence | Invalidation / Repair |
|---|---|---|---|---|
| `DEP-01` | `<ITEM_OR_EXTERNAL_SOURCE>` | `<ITEM_OR_GATE>` | `<CURRENT_RECEIPT_OR_DECISION>` | `<REOPEN_OR_BLOCK_ROUTE>` |

- Coordination Graph: `<ID_AND_PATH | NOT_APPLICABLE>`

## Quality Branch — Conditional

Quality work is present only when the outcome has product-visible behavior,
risky contracts, release evidence, or an explicit QA request. It is not a
prerequisite for research, strategy, documentation, or coordination work that
has no relevant quality claim.

| Applicability | Accepted Behavior / Risk Inputs | Frozen QA Artifact | Host Execution | Assessment / Triage |
|---|---|---|---|---|
| `<REQUIRED_NOT_APPLICABLE>` | `<SOURCE_IDS_OR_REASON>` | `<CASCADE_QA_ARTIFACT_OR_NONE>` | `<RUN_QA_PLAN_RECEIPT_OR_NOT_RUN>` | `<QA_RESULT_OR_NOT_APPLICABLE>` |

When applicable, `cascade-qa:plan-quality` or
`cascade-qa:design-tests` produces the portable artifact. `run-qa-plan`
performs only the authorized repository execution. Assessment and defect
classification return to Cascade QA.

## Execution Receipts

Readiness never grants dispatch or mutation authority.

| Receipt | Subject | Inputs / Source Identity | Actor / Surface | Actual Writes Or Actions | Checks / Evidence | Result | Invalidation |
|---|---|---|---|---|---|---|---|
| `R-01` | `<ITEM_OR_GATE>` | `<VERSIONS_OR_DIGESTS>` | `<OWNER_AND_SURFACE>` | `<PATHS_COMMANDS_OR_NONE>` | `<EXACT_RESULTS>` | `<PASS_FAIL_BLOCKED_NOT_RUN>` | `<WHEN_STALE>` |

## Current Frontier

- Ready now: `<ITEMS_OR_NONE>`
- Running or in review: `<ITEMS_OR_NONE>`
- Blocked: `<ITEM_REASON_ROUTE_OR_NONE>`
- Accepted and preserved: `<ITEMS_OR_NONE>`
- Next authorized action: `<ACTION_OR_NONE>`
- Projection checked against current authority: `<YES_NO_AND_TIME>`

## Closeout And Retention

`cascade-project-management:close-project` may propose completion and
retention after current outcomes, dependencies, consumers, and evidence are
known. `closeout` applies only an explicitly authorized host mutation.
Retention and archival are never automatic.

- Terminal source identity: `<REVISION_OR_DIGEST>`
- Accepted outcomes and gates: `<IDS>`
- Preserved artifacts and receipts: `<PATHS_OR_IDS>`
- Remaining consumers or risks: `<LIST_OR_NONE>`
- Retention proposal: `<KEEP_ACTIVE_RETIRE_PROPOSED_ARCHIVE_DEFERRED>`
- Active projection update: `<AUTHORIZED_ACTION_OR_NONE>`
