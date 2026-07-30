# Simulation Execution Quality Checklist

## Before Execution

- [ ] Campaign selection, approval, version, revision, run ID, and retry
      lineage are exact.
- [ ] The run ID and execution lease were atomically reserved before side
      effects; an existing or finalized identity cannot be reused.
- [ ] Task, simulation, claim, policy, oracle, fixture, runner, adapter,
      driver, and environment references resolve.
- [ ] Population, scenario, world, dataset partition, metric, treatment, and
      calibration sources are digest-bound before execution.
- [ ] Runtime, permissions, isolation, credentials, budgets, artifact
      writability, oracles, and cleanup capability pass preflight.
- [ ] Failed required preflight produces no target execution events.

## During Execution

- [ ] Actions remain inside declared permissions and budgets.
- [ ] Decisions, approvals, actions, observations, errors, and earliest failure
      are recorded.
- [ ] Stateful fixtures preserve observable state-before/state-after and reset
      to the declared world fixture during cleanup.
- [ ] Driver completion is not treated as expected-result evidence.
- [ ] Deterministic oracles use public-boundary observations.
- [ ] Partial and failed runs preserve available evidence.

## Evidence And Cleanup

- [ ] Required evidence bodies are frozen inside the new run package.
- [ ] Evidence records digest, timestamp, producer, platform, redaction, and
      lineage.
- [ ] Prior attempts remain unchanged.
- [ ] Cleanup runs on pass, failure, blocker, timeout, and cancellation.
- [ ] Cleanup verification and residual resources are explicit.
- [ ] Crash recovery can clean up and finalize an interrupted attempt without
      resuming target actions or hiding an unknown external outcome.

## Handoff

- [ ] Execution status is `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, or `GAP`.
- [ ] Receipt binds campaign, run, revision, environment, evidence root,
      result digest, operator and target identities, cleanup, retry lineage,
      finalization, and next evaluator.
- [ ] Execution evidence and receipt content were atomically finalized before
      evaluation; later receipts use separate sibling namespaces.
- [ ] The operator makes no semantic, portfolio, deployment, or release claim.
