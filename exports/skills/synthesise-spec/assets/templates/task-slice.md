# Task Slice — {{Outcome-Oriented Name}}

> Keep this task thin. Link to the owning feature/change spec and exact
> behavior IDs instead of rewriting the product case.

| Field | Value |
|---|---|
| Specification readiness | `READY_FOR_REVIEW / READY_FOR_IMPLEMENTATION / NEEDS_INPUT / BLOCKED` |
| Delivery state | `NOT_STARTED / IN_PROGRESS / COMPLETE / SUPERSEDED` |
| Validation evidence | `NOT_RUN / PASS / FAIL / BLOCKED` |
| Parent spec | {{Exact reference}} |
| Behavior IDs | {{BR, OUT, J, INT, AC, or design IDs}} |
| Owner | {{Owner}} |
| Target area | {{Module, component, doc, schema, or test boundary}} |
| Last updated | {{YYYY-MM-DD}} |

## Readiness

**Status:** `READY_FOR_REVIEW / READY_FOR_IMPLEMENTATION / NEEDS_INPUT / BLOCKED`

**Why:** {{Highest safe use of this task contract.}}

## Parent Product And Change

**Problem and value:** {{One sentence or exact parent section reference.}}

**Behavior preserved or changed:** {{Exact parent BR, OUT, journey, integration,
or acceptance IDs.}}

**Sources and references:** {{Exact parent spec and inspected implementation
paths.}}

## Outcome

{{One observable result this task produces.}}

## Expected Output

Summarize consumers and effects here. Keep full Given/When/Then scenario detail
in Acceptance and refer to its criterion IDs elsewhere.

| Consumer | Trigger | Observable Output | Durable Effect | Evidence Target |
|---|---|---|---|---|
| {{User, system, or next task}} | {{Action, event, or check}} | {{Result}} | {{Write, event, artifact, or none}} | {{Test, review, receipt, or NOT_RUN}} |

## Scope

### Included

- {{Required behavior or artifact.}}

### Excluded

- {{Adjacent behavior that remains out of scope.}}

### Preserved

- {{Current behavior or public contract that must not regress.}}

## Preconditions And Dependencies

| Dependency | Required State Or Input | Owner | Evidence Or Blocker |
|---|---|---|---|
| {{Dependency}} | {{Condition}} | {{Owner}} | {{Reference}} |

## Implementation Contract

| Area | Change | Boundary Or Invariant | Likely Files Or Artifacts |
|---|---|---|---|
| {{Area}} | {{Smallest sound change}} | {{Rule that must hold}} | {{Paths or UNKNOWN}} |

State any changed trigger, request, event, state transition, data write,
side effect, failure behavior, and visible result. Link to the parent spec for
unchanged integration detail. Link to Acceptance IDs instead of restating each
scenario.

## Invariants And Integration Impact

| Invariant Or Boundary | Change Or No-Change | Enforcement Point And Mechanism | Race Or Failure | Recovery | Evidence |
|---|---|---|---|---|---|
| {{Rule, public contract, or integration}} | {{Exact delta or preserved behavior}} | {{Durable mechanism or parent reference}} | {{Relevant case}} | {{Repair or stop rule}} | {{Check or NOT_RUN}} |

## Acceptance

| Criterion | Given | When | Then | Evidence |
|---|---|---|---|---|
| {{Parent AC ID}} | {{Precondition}} | {{Action or event}} | {{Observable result and durable effect}} | {{Test or check}} |

## Validation Plan

| Check | Boundary | Command Or Method | Required | Status |
|---|---|---|---|---|
| {{Check}} | {{Unit, component, API, UI, data, provider}} | {{Exact command or procedure}} | `YES / NO` | `NOT_RUN` |

## Risks And Stop Rules

- Stop if {{missing decision, source, permission, migration gate, or external
  authority}}.
- Do not widen scope to {{adjacent change}}.
- Do not report complete until {{required evidence}} exists.

## Open Decisions And Risks

| Item | Owner | Next Action | Impact | Readiness Effect |
|---|---|---|---|---|
| {{Decision or risk, or “none”}} | {{Owner}} | {{Action}} | {{Impact}} | `BLOCKS_REVIEW / BLOCKS_IMPLEMENTATION / DOES_NOT_BLOCK` |

## Next Owner Or Action

- Changed artifacts: {{Paths or none}}
- Evidence: {{References and status}}
- Remaining `NOT_RUN`: {{Items}}
- Next owner or task: {{Owner, task, review, or none}}
