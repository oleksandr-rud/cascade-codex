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

