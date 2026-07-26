# Workflow Graph Fragments

This folder contains reusable planning-time graph fragments. A fragment is not
an active workline, a Coordination Graph, an implementation plan, or a runtime
node. It is a versioned rule package that helps `plan-change`,
`orchestrate-work`, and `agentic-workflow-builder` decide which outcomes,
skills, actors, tests, gates, and repair routes a particular request needs.

Planning evaluates the complete catalog but instantiates only applicable
fragments. Every candidate receives one disposition:

- `SELECTED`: instantiate its required nodes, skill calls, tests, and gates;
- `MERGED`: preserve its requirements inside another selected fragment;
- `NOT_APPLICABLE`: record the inspected reason and emit no graph state;
- `BLOCKED`: a required definition, capability, source, or environment is
  missing.

Assurance fragments use `kind: assurance-overlay`. They attach review or test
obligations to selected delivery fragments and become separate worklines only
when they need independent ownership, writes, handoff, or evidence acceptance.

## Composition Contract

1. Inspect request criteria, behavior/failure trajectories, affected source and
   contract boundaries, visible states, data/state changes, integrations, and
   risks.
2. Evaluate each fragment's activation signals without treating a signal as
   sufficient evidence by itself.
3. Bind every selected `requires` port to a selected producer, an authoritative external
   source, or a recorded conditional omission.
4. Resolve actor capabilities to existing local roles or an explicitly
   authorized worker route. Do not invent an agent merely because a fragment
   names a capability.
5. Resolve skill calls against current skill and role wiring. Mark unsupported
   required calls `BLOCKED`; record cross-role support explicitly.
6. Resolve test strategies to current commands, fixtures, environments, and
   evidence locations from the target repository and `harness.config.yaml`.
7. Merge adjacent fragments when they share one outcome, owner, write scope,
   and acceptance seam. Split them only for independently meaningful ownership,
   writes, handoff, or evidence.
8. Connect selected ports, reject cycles and dangling required inputs, then
   synthesize the smallest lane-local Task Graph or cross-workline Coordination
   Graph that preserves the selected contracts.
9. Synthesize one terminal evidence join from selected required gates. Omitted fragments
   must not contribute phantom nodes, gates, tests, or evidence.

The machine-readable shape is defined by
[`graph-fragment.schema.json`](graph-fragment.schema.json). Files matching
`GF-*.fragment.json` are the canonical reusable fragments.
