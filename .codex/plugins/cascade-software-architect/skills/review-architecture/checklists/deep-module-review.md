# Deep Module Review Checklist

Use before cross-boundary implementation, public-contract changes, shared
abstractions, state-machine changes, or major refactors.

## Fit

- [ ] Intended behavior is stated in codebase-specific terms.
- [ ] Owning boundary is identified.
- [ ] Change type is classified: additive, behavior-preserving, breaking,
      state-machine, integration-sensitive, user-visible, or internal.
- [ ] Every top-level module names a real domain entity, aggregate, cohesive
      capability, or selected infrastructure mechanism rather than a generic
      category such as core, common, services, helpers, or utils.
- [ ] A separately deployed service has a current release, scale, data,
      security, availability, or failure-isolation reason; source modularity
      alone is not treated as deployment evidence.
- [ ] A modular monolith uses public in-process contracts and acyclic module
      dependencies, without internal network or broker boundaries by default.

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
- [ ] A shared database does not permit cross-module storage access; each
      module owns its tables, migrations, and writes through public use cases.
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
- [ ] Shared technical code has at least two current consumers and owns stable
      mechanics without product or entity semantics.
- [ ] Existing codebase seams are reused first.
- [ ] Public contracts and generated artifacts are inventoried.
- [ ] Stale, duplicate, replaced, or legacy paths use direct migration,
      replacement, deletion, and validation before flags, shims, or dual paths.

## Stateful Agent Contract Pass (when applicable)

- [ ] The supplied source-bound agent contract distinguishes model proposals,
      runtime writes, policy definitions/data/evaluations and role projections.
- [ ] Advertised model schemas and private runtime bindings are not conflated.
- [ ] For `schema-values-text@1`, trusted profiles and selected values enter the
      issuer separately; opaque role/task slices are re-admitted before assembly.
      Check decoder limits, type/required-field enforcement, stable field order,
      token budgets and revocation on cache reuse. Local cache hits do not prove
      provider hits; fixture admission is not live ACL enforcement.
- [ ] Current state/receipts/pending work commit before context consumption; a
      projection failure has recovery without undoing committed effects.
- [ ] Vertical slices have no empty handler/processor/service forwarding chain.
      Required work does not depend on best-effort emitters. Publishers have a
      named consumer and delivery guarantee; current-state projection is default.
- [ ] If event/read-model profiles are selected, rebuild/replay invokes no
      model/tool; outbox recovery and external unknown outcomes are explicit.
      CQRS and full event sourcing are justified separate choices.
- [ ] History, summary and cache reuse preserve access/freshness/deletion rules;
      request/task budgets and queue limits include optional branches and retries.
- [ ] Canonical output passes its release gate; streaming, interim status and
      voice cannot bypass it, close the wrong task or self-certify delivery.
- [ ] Evidence separates reference fixtures, integrated runtime, semantic quality,
      provider behavior and physical delivery; installed activation is explicit.

## Recommendation Quality

- [ ] Recommendation names a concrete module to deepen, split, merge, or leave.
- [ ] Alternatives and rejection reasons are explicit when relevant.
- [ ] Validation gates start targeted and broaden only with risk.
- [ ] Unresolved decisions have an owner and proposed default.
