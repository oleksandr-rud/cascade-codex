# Deep Module Review Checklist

Use before cross-boundary implementation, public-contract changes, shared
abstractions, state-machine changes, or major refactors.

## Fit

- [ ] Intended behavior is stated in codebase-specific terms.
- [ ] Owning boundary is identified.
- [ ] Change type is classified: additive, behavior-preserving, breaking,
      state-machine, integration-sensitive, user-visible, or internal.

## Interface Depth

- [ ] The public interface is smaller than the behavior it owns.
- [ ] Callers do not need internal ordering, persistence details, retries,
      parsing steps, or tool choreography.
- [ ] Errors, idempotency, authorization assumptions, and side effects are
      visible at the boundary.
- [ ] Tests assert behavior at a stable public boundary.

## Required Passes

- [ ] Context map covers touched modules, callers, callees, persistence,
      external services, UI/client paths, tests, scenarios, and docs.
- [ ] Interface map covers public functions, endpoint contracts, model fields,
      state transitions, tool contracts, and emitted events.
- [ ] Hidden-consumer scan uses source search for names, paths, events, state
      keys, query keys, and scenario IDs.
- [ ] Seam scan explains whether proposed abstractions have real variation
      today.
- [ ] Dependency test category is named before introducing a seam or mock.

## Data Boundary Pass

- [ ] Access patterns are named before proposing data-shape changes.
- [ ] Source of truth, duplicated fields, update path, staleness tolerance, and
      validation checks are named for copied data.
- [ ] Unbounded histories or arrays are rejected unless the product need and
      retention rule require them.
- [ ] Query or index recommendations name the owner query and expected evidence.
- [ ] Tenant, account, auth, or caller scoping is included in data contracts
      when the target project has such a boundary.

## Shallow Module Warning Signs

- [ ] Module mostly forwards parameters without enforcing invariants.
- [ ] Signature is as complex as the implementation.
- [ ] Callers still perform orchestration before and after calling it.
- [ ] Multiple callers duplicate filters, guards, or error handling.
- [ ] Tests mock many internals to prove one visible behavior.

## Seam And Adapter Discipline

- [ ] A new seam has a real variation today.
- [ ] Existing codebase seams are reused first.
- [ ] Public contracts and generated artifacts are inventoried.

## Recommendation Quality

- [ ] Recommendation names a concrete module to deepen, split, merge, or leave.
- [ ] Alternatives and rejection reasons are explicit when relevant.
- [ ] Validation gates start targeted and broaden only with risk.
- [ ] Unresolved decisions have an owner and proposed default.
