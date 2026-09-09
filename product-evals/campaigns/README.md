# Cascade Campaigns

A campaign is a versioned simulation plan. Authorship proves only that the
complete definition graph resolves; a `PASS` exists only in an immutable run
summary under `.artifacts/product-evals/<run-id>/`.

Campaigns bind a simulation, evaluation profile, typed tasks, claims, policies,
oracles, with metrics, populations, datasets, treatments, and calibration only when the claims need them. Supported contours are:

- `command` and `terminal`;
- `browser`, `desktop`, and `mobile`;
- `agent-response`.

Simulation definitions are physically and semantically separated:

- `product-evals/simulations/harness/<simulation-id>/` proves Cascade machinery only;
- `product-evals/simulations/product/<simulation-id>/` is reserved for a named target
  product and still requires target evidence before product or release claims.

Every simulation manifest declares the matching `simulation_scope`. Campaign
catalog entries expose that resolved scope; tier and scope are independent.
Execution resolves and validates only the selected campaign and its complete
dependency graph. Use `campaign catalog --check` or `campaign self-test` for an
explicit repository-wide catalog audit; an unrelated catalog entry does not
block a selected run.

Optional session blocks must bound total and per-step duration, total and
per-episode steps, parallel steps, surface cardinality, checkpoint bytes, and
lease TTL. Parallelism is opportunistic: the runner schedules only tasks with
disjoint task, policy-budget, target-resource, and driver conflict keys.
For a live general evaluator, the lease must cover its configured timeout plus
30 seconds for evidence persistence. The default includes that bound, and the
operator renews the lease immediately before evaluation.
Long histories roll into 1,000-entry journal and checkpoint segments; this is
bounded durable execution, not an unlimited-duration guarantee.
SIGINT and SIGTERM propagate through the command dispatcher to the session,
active adapter and evaluator. Cancellation retains the terminal journal and
cleanup evidence; it never authorizes replay of an uncertain dispatch.

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

Harness scope alone does not require a specialized evaluator. `NOT_APPLICABLE`
reserves no extra principal and writes no empty specialized receipt. Existing
frozen receipts remain verifiable. `REQUIRED` still reserves an independent
principal and locks its declared claims out of general evaluation.

A required specialized handoff freezes execution and writes
`specialized-evaluations/<run-id>-specialized-evaluation/input/input-manifest.json`.
The independent `cascade-evals:harness-evaluation` producer consumes that exact
manifest and returns a sibling evidence package containing the canonical
`receipt.json`, `provider/trace.json`, and `provider/output.json`. Each path in
its evidence manifest is relative to the supplied package root, under the same
specialized evaluation namespace. The receipt contract and typed provider
packet are owned by `scripts/cascade/harness-evaluation-receipts.ts`.

Keep the incoming package in a repository-contained sibling directory.
Resume with `--specialized-evidence-root <package-root>` and the existing lease
(or the ordinary expired-lease recovery contract). Cascade validates all bytes,
identities, claims, source/execution digests, provider bindings, and existing
frozen inputs before importing the receipt. It reuses completed execution and
never replays a target to obtain a missing evaluation. A rejected package does
not become evaluation evidence. This handoff is explicit; the operator cannot
self-judge its execution.

When all claims belong to specialization, general reduction records
`provider: none`, an empty ledger, and no provider trace. Its empty reduction
status is not model or semantic evidence. There is no general model invocation.

General model evaluation copies the scenario definitions, task inputs, results,
policies, oracles and supporting evidence into its isolated input. Automatically
included harness implementation, admission test corpus and authoring templates
stay in the full frozen source archive instead of being copied again. Explicit
task inputs always take precedence; a file shared with the harness baseline is
frozen once and remains available to the evaluator. Evaluator contracts come
from the same frozen source snapshot.
The model receives frozen contracts, task inputs and evidence bodies over stdin.
Shell and delegation tools stay disabled. Hash inventories and automatic harness
sources stay outside model text; the controller verifies their bindings and the
inline evidence against the frozen packet. Binary bodies remain unassessed and
cannot support a claim that requires their contents.

Completed and blocked attempts use one input-manifest verifier. It checks each
copied execution file against the original frozen bytes and rejects missing
required evidence or substituted contracts. Older full-source packets remain
readable; reducing the input does not change claim authority or release gates.
