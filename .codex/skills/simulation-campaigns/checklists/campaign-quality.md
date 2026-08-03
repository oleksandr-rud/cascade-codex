# Simulation Campaign Quality Checklist

## Authority And Definition

- [ ] New target simulations were previewed with `simulation init --dry-run`;
      every output path and owning lane were reviewed before writing.
- [ ] Initialization used the tracked starter template, refused collisions,
      resolved the generated graph, and regenerated the catalog without an
      overwrite or compatibility path.
- [ ] Campaign ID, version, source revision, owner, and purpose are explicit.
- [ ] Authored, validated, runnable, executed, graded, calibrated, deployed,
      and release-eligible states are reported separately.
- [ ] Manifest, task, simulation, claim, policy, oracle, fixture, and catalog
      references resolve in the current checkout.
- [ ] Population actors, weights, source provenance, risk slices, scenarios,
      stateful world, and reset contract are explicit.
- [ ] Persona-derived populations bind an approved derivation manifest and
      exact persona revision/path/digest; coverage, stress, and counterfactual
      weights are labeled test allocation rather than prevalence.
- [ ] Development, regression, holdout, and calibration-reference case
      identities are exclusive; production-derived inputs are minimized and
      reference-windowed.
- [ ] Metrics record direction, unit, aggregation, hard-gate status, required
      slices, and deterministic or semantic source.
- [ ] Baseline and candidate treatments bind exact source, model, prompt,
      tool, and harness identities.
- [ ] Every campaign resolves a versioned evaluation profile; fixture
      providers are limited to deterministic-fixture campaigns and semantic
      evaluation uses its declared Codex profile and rubric.
- [ ] Duplicate IDs, unknown references, and stale generated catalogs fail
      validation.

## Selection And Safety

- [ ] Contour, driver, tier, platform, and selection reason are explicit.
- [ ] Runtime, permissions, identity, timeout, budget, isolation, fixture, and
      cleanup requirements are preflighted.
- [ ] Every referenced policy applies to the exact campaign, task, kind,
      driver, action, and optional path or command prefix before provisioning;
      zero matches and ambiguity fail closed.
- [ ] Required budget dimensions and named redaction capabilities are supported
      by the selected adapter and evidence store.
- [ ] Confirmation receipts bind the exact run, policy version and digest,
      campaign, task, action index and digest, confirmer, and expiry.
- [ ] Computer Use is treated as a driver, not an oracle.
- [ ] Platform-specific evidence is not generalized beyond its tested scope.

## Execution And Evidence

- [ ] The lifecycle records preflight, provision, seed, execute, observe,
      evaluate, freeze, cleanup, and handoff.
- [ ] Required evidence bodies are copied into the immutable run directory.
- [ ] Evidence includes producer, timestamp, digest, platform, and lineage.
- [ ] Operator, evaluator, target, simulator, aggregator, and recovery roles
      use distinct reserved sessions with explicit lease and recovery authority.
- [ ] Partial runs preserve the earliest failure and available evidence.
- [ ] Replay uses a new run ID, records parent-run lineage, and does not mutate
      frozen evidence.
- [ ] Run IDs and stage receipt IDs are reserved atomically; crash recovery,
      cancellation, and unknown external outcomes have explicit dispositions.
- [ ] Terminal finalization is atomic and the frozen file set and manifest
      digest are independently verified before handoff.

## Claims And Reduction

- [ ] Every claim maps to applicable policies and required oracles.
- [ ] Every verdict cites sufficient frozen evidence.
- [ ] Policy denial, missing evidence, failed required oracle, identity
      mismatch, or cleanup failure cannot produce `PASS`.
- [ ] Deterministic hard gates run before semantic judgment.
- [ ] Semantic judgment cannot override a hard-gate failure.
- [ ] Provider failure, stale identity/digest, or malformed output blocks
      aggregation without a fixture fallback.
- [ ] Claim entries use `SUPPORTED`, `PARTIALLY_SUPPORTED`, `UNSUPPORTED`,
      `CONFLICTING`, `BLOCKED`, `NOT_RUN`, or `INVALID`; only `SUPPORTED`
      satisfies a required claim.
- [ ] Portfolio aggregation preserves per-campaign and per-claim status.
- [ ] Claims that require calibration cannot become `SUPPORTED` from absent,
      stale, partial, uncalibrated, or framework-fixture receipts.
- [ ] Refinement proposals cite frozen evidence, remain `PROPOSED`, forbid
      direct persona mutation, and record external-evidence and human-review
      blockers.

## Calibration

- [ ] Calibration binds frozen simulated and reference scores, treatments,
      metric definitions, reference labels, reviewer identity, and source
      digests.
- [ ] Minimum sample count, required slices per treatment, human agreement,
      rank correlation, linear correlation, and freshness thresholds are
      predeclared and reduced mechanically.
- [ ] Calibration uses `CALIBRATED`, `PARTIALLY_CALIBRATED`, `UNCALIBRATED`,
      `STALE`, `BLOCKED`, `NOT_RUN`, or `INVALID` separately from execution
      and claim status.
- [ ] Framework fixtures prove reducer mechanics only; target-project
      calibration and release evidence remain `NOT_RUN`.

## Cleanup, Handoff, And Reporting

- [ ] Cleanup status and residual resources are explicit.
- [ ] Handoff receipt includes campaign ID, run ID, revision, environment,
      evidence root, result digest, and next owner.
- [ ] Execution, specialized evaluation, general evaluation, and aggregation
      receipts occupy separate append-only namespaces and bind exact producer
      role/session identities.
- [ ] Each campaign and task execution is `PASS`, `FAIL`, `BLOCKED`,
      `NOT_RUN`, or `GAP`, separately from claim-ledger status.
- [ ] Missing runtime is `GAP` or `BLOCKED`; an unexecuted campaign is
      `NOT_RUN`.
- [ ] The report does not infer deployment or release eligibility from
      authored, structural, or partial execution evidence.
