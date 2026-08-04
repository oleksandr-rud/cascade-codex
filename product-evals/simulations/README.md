# Cascade Simulation Definitions

Simulation definitions use two explicit authority roots:

- `harness/` contains deterministic framework fixtures that prove Cascade's
  schemas, runners, reducers, evidence, and evaluation mechanics. Their output
  cannot establish target-product behavior or release eligibility.
- `product/` contains simulations of a named target product. A product-scoped
  manifest identifies intended authority only; product claims still require
  current target evidence, non-fixture calibration when declared, and the
  campaign's ordinary policy, oracle, evaluation, and cleanup gates.

Every manifest must declare `simulation_scope` and live at
`product-evals/simulations/<simulation_scope>/<simulation-id>/manifest.json`. Runtime
resolution rejects scope/path mismatches. Shared schemas stay at this root.

The separate `harness-evals/` tree is the Cascade skill/agent harness-evaluation
corpus. It grades routes and traces and is not a simulation-definition root.

Persona-derived populations bind an exact reviewed product persona, derivation
manifest, generator input digest, governed evidence metadata, and typed actor
behavior. Claim files separately declare whether they need no population
authority, persona-derived authority, or estimated-prevalence authority.
Coverage allocation must not be presented as prevalence.

Synthetic findings are proposal-only. A proposal may be reviewed into a
separate append-only disposition receipt, but even an accepted disposition only
routes evidence into `synthesis-to-spec`; it does not edit or validate the
source persona. External evidence manifests contain minimized metadata and
digests, not raw sensitive source material.
