# Iteration Plan Quality Checklist

Use before marking a delivery plan `HORIZON_READY`, `ITERATION_PROPOSED`,
`ITERATION_COMMITTED`, or `ITERATION_READY`.

## Horizon Readiness

- [ ] The source plan and all required source identities are current and
      complete, or every gap is explicitly bounded.
- [ ] Every in-scope slice and candidate has exactly one delivery disposition.
- [ ] Every slice and candidate has one MVP membership classification.
- [ ] MVP is only an outcome/coverage boundary, never an exclusive delivery
      disposition.
- [ ] The ordered backlog has unique stable ranks, source-linked priority
      evidence, dependency predecessors, and explicit unresolved ties.
- [ ] Missing, stale, conflicting, inaccessible, or truncated sources are
      recorded and affected decisions are `DRAFT` or `BLOCKED`.
- [ ] Future candidates have no active IDs, dispatch state, or readiness.

## First Iteration Readiness

- [ ] The selected increment is a thin vertical path with an entry point,
      end-to-end behavior, and observable acceptance signal.
- [ ] If no grounded vertical path fits the controlling bounds, the plan is
      `BLOCKED`; it does not commit a horizontal enabling subset.
- [ ] Every included candidate satisfies its Definition of Ready.
- [ ] Every included candidate has a Definition of Done and terminal acceptance
      owner.
- [ ] Capacity and commitment authority are explicit. Unknown capacity cannot
      produce `COMMITTED` or `ITERATION_READY`.
- [ ] Aggregate effort fits total capacity, the longest dependency path fits
      the cadence/deadline, role-specific load fits role capacity, and known
      write/resource serialization is feasible. Team size was not used to
      shorten a dependency chain.
- [ ] Dependencies, write ownership, integration ownership, and WIP bounds are
      explicit.
- [ ] Commitment, integration, review, and terminal acceptance authorities are
      separately sourced; none was inferred from another role.
- [ ] Every DoR item claimed satisfied has current evidence. A planned
      prerequisite is not treated as an observed satisfied condition.
- [ ] Security, integrity, accessibility, migration, rollback, functional
      acceptance, review, and validation are each `REQUIRED`, `CONDITIONAL`,
      `NOT_APPLICABLE`, or `BLOCKED`, with rationale.
- [ ] Evidence distinguishes `PLANNED`, `NOT_RUN`, `PASS`, `FAIL`, `BLOCKED`,
      and `STALE`; planning does not present planned evidence as executed.
- [ ] The review checkpoint defines promotion, reordering, deferral, removal,
      stop, and replanning consequences.

## Authority, Graphs, And Revisions

- [ ] Changed active work has a canonical reconciliation receipt or an explicit
      blocker before its delivery disposition changes.
- [ ] The handoff names exactly one coordination route and creates no graph
      state.
- [ ] Only feasible committed first-iteration candidates are eligible for
      downstream orchestration; direct implementation or dispatch requires
      `ITERATION_READY`.
- [ ] A new revision preserves prior history but marks only one revision
      effective.
- [ ] Changed source identities identify invalidated evidence, reruns, affected
      consumers, and required reauthorization.
- [ ] Roadmap placement does not authorize graph creation, dispatch,
      delegation, external action, commit, push, release, or provider spend.
