# Cascade Campaigns

A campaign is a versioned simulation plan. Authorship proves only that the
complete definition graph resolves; a `PASS` exists only in an immutable run
summary under `.artifacts/product-evals/<run-id>/`.

Campaigns bind a simulation, evaluation profile, typed tasks, claims, policies,
oracles, metrics, treatments, and optional calibration. Supported contours are:

- `command` and `terminal`;
- `browser`, `desktop`, and `mobile`;
- `agent-response`.

Simulation definitions are physically and semantically separated:

- `product-evals/simulations/harness/<simulation-id>/` proves Cascade machinery only;
- `product-evals/simulations/product/<simulation-id>/` is reserved for a named target
  product and still requires target evidence before product or release claims.

Every simulation manifest declares the matching `simulation_scope`. Campaign
catalog entries expose that resolved scope; tier and scope are independent.

Optional session blocks must bound total and per-step duration, total and
per-episode steps, parallel steps, surface cardinality, checkpoint bytes, and
lease TTL. Parallelism is opportunistic: the runner schedules only tasks with
disjoint task, policy-budget, target-resource, and driver conflict keys.
Long histories roll into 1,000-entry journal and checkpoint segments; this is
bounded durable execution, not an unlimited-duration guarantee.

Playwright is a browser-task runtime, not an agent permission system. It is
available through the isolated `.codex/harness-tooling/` package. A browser
campaign still requires an implemented, explicitly authorized driver adapter;
authored definitions do not imply executable coverage.

```bash
bun scripts/cascade.ts campaign list
bun scripts/cascade.ts campaign catalog --check
bun scripts/cascade.ts campaign validate simulation-contract-smoke
bun scripts/cascade.ts campaign run simulation-contract-smoke \
  --run-id example-run --lease-id supervisor-held-lease
bun scripts/cascade.ts campaign resume example-run \
  --lease-id supervisor-held-lease
bun scripts/cascade.ts campaign verify example-run
```

`resume` re-resolves the reserved campaign and refuses changed source,
identities, platform, session contract, journal/checkpoint linkage, persisted
result digests, or campaign-wide policy budgets. While the operator lease is
active, continuation requires its exact lease ID. After expiry, pass the exact
reserved recovery subject with a fresh lease ID (or let Cascade derive the
retry-stable replacement):

```bash
bun scripts/cascade.ts campaign resume example-run \
  --recovery local-simulation-recovery \
  --recovery-reason "operator process ended before finalization"
```

An expired-lease takeover is append-only and generation-bound. It may continue
only from a verified durable checkpoint. A dispatch without a matching
completion checkpoint becomes `UNKNOWN_OUTCOME` and is never replayed. Existing
execution, evaluation, aggregation, and summary stages are reused only when
their non-temporal content matches exactly. Finalized runs cannot be resumed,
and stale mutation locks fail closed rather than being reclaimed implicitly.
