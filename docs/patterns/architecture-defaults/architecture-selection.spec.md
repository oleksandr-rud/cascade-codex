# Architecture Selection Strategy

- Pair ID: `architecture-selection`
- Graph: `docs/patterns/architecture-defaults/architecture-selection.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use this decision before choosing frameworks or generating source trees when a
new system, major service, client, tenant boundary, or integration can be built
in more than one credible topology. Skip it for changes that remain inside an
already coherent architecture.

## Default Architecture

```text
constraints and quality attributes
  -> candidate topology
  -> ownership, data, interface, and failure boundaries
  -> ADOPTED / ADAPTED / REJECTED / GAP
  -> stack profile
  -> optional extensions
  -> validation and reassessment triggers
```

The default is the simplest sufficient topology. For server-side work, begin
with one deployable modular application and explicit module boundaries. Split
services only for demonstrated deployment, ownership, scaling, regulatory, or
failure-isolation needs. A client, CLI, experiment, or independently released
library remains its own archetype, but uses the same evidence and
classification discipline.

Evaluate these candidate shapes:

| Shape | Prefer when | Avoid when |
|---|---|---|
| Modular monolith | One team or coordinated teams, shared transactions, fast iteration | Independent deployability or hard isolation is required now |
| Service split | Ownership, scaling, release, or failure boundaries are independent | The split creates distributed consistency without a compensating benefit |
| Event-driven extension | Work is asynchronous, fan-out is real, or producers must not wait | A direct call is simpler and latency/consistency are synchronous |
| Client archetype | Product behavior executes on web or native surfaces | Server invariants would be trusted to the client |
| CLI archetype | Automation or operator workflows need a stable command contract | A library or existing interface is the real reusable boundary |
| Experiment archetype | Evidence must be reproducible before promotion | The code is already production-owned behavior |
| SDK/library archetype | A package is independently versioned, released, distributed, or consumed | Code is only an internal folder within one owning application |

## Reference File Structure

Record the choice in existing target-owned architecture or work docs:

```text
docs/
  architecture/
    context-and-constraints.md
    boundary-map.md
    decisions/
      <decision>.md
  work/
    <lane-or-plan>.md
```

Do not create this tree when the target already has ADRs, RFCs, specs, or a
boundary document. Map the same information into its current owners.

## Default Decisions

- Define product behavior, criticality, team ownership, data, interfaces,
  consistency, latency, security, compliance, scale, cost, and deployment
  constraints before comparing shapes.
- Treat independently deployed, versioned, or distributed units, data
  ownership, and public contracts as the primary architecture boundaries.
- Use `architecture-selection` first, then `tenancy-strategy` and
  `interface-strategy`, then `stack-selection`, then only applicable
  application-technology, infrastructure, event, or frontend policy
  extensions.
- Record rejected alternatives and the observable conditions that would reopen
  them.
- Preserve coherent target conventions; defaults are comparison candidates,
  not migration authority.

## Validation Contract

- Trace one critical read, write, background, failure, and recovery path across
  the proposed boundaries.
- Verify every state change has one source of truth and one owning boundary.
- Confirm synchronous and asynchronous dependencies have explicit timeout,
  retry, idempotency, and consistency expectations where applicable.
- Confirm operational or release ownership, deployment or distribution,
  migration, compatibility, and rollback are feasible for every application
  or package unit.
- Check that the selected stack maps onto the topology without collapsing or
  bypassing its boundaries.

## Exceptions

Use a target-specific ADR or RFC when regulatory constraints, organizational
ownership, an existing platform, extreme scale, hard real-time behavior, or a
vendor contract fixes the architecture. Mark the catalog result `ADAPTED`,
`REJECTED`, or `GAP` and preserve the evidence and validation gates.
