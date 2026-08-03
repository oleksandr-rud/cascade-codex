---
name: simulation-campaigns
description: Use when versioned simulation campaigns across command, terminal, browser, desktop, mobile, or agent-response contours must be authored, selected, validated, coordinated, replay-planned, aggregated, or reported with explicit claims, policies, oracles, evidence, identity, and handoffs.
---

# Simulation Campaigns

Use this skill to own campaign intent and portfolio lifecycle: definition,
selection, dispatch coordination, receipt aggregation, replay planning, claim
projection, and reporting. A campaign may exercise a command directly, a PTY,
a browser, a native desktop application, a mobile simulator or device, or an
agent-response harness.

`simulation-execution` owns the mutable run. `simulation-evaluation` owns
independent cross-contour evidence judgment. This skill does not perform either
role and does not treat an authored campaign as an executed result.

## Source Order

1. Latest request plus any named campaign, run, task, claim, or policy IDs.
2. Current-checkout campaign sources, when present:
   - `evals/campaigns/`
   - `evals/tasks/`
   - `evals/simulations/`
   - `evals/claims/`
   - `evals/policies/`
   - `evals/oracles/`
   - `evals/metrics/`
   - `evals/treatments/`
   - `evals/calibrations/`
   - `evals/rubrics/`
   - `docs/product/personas/` only through explicit persona derivation
     manifests; never through inferred Markdown parsing;
   - the generated campaign catalog.
   - `templates/starter/package.template.json` when bootstrapping a new target
     simulation.
3. Current program and lane state under `docs/work/`.
4. `harness.config.yaml`, `docs/structure.md`, and `docs/glossary.md`.
5. Immutable run evidence under `.artifacts/campaigns/<run-id>/`.
6. Execution and evaluation receipts from `simulation-execution`,
   `simulation-evaluation`, and specialized `harness-evaluation`.
7. The adjacent `functional-qa` and `codex-maintenance` contracts.
8. Candidate-branch material only when the active lane names that branch as an
   integration source. Never substitute it for current-checkout authority.

If a referenced source or runner is absent, report `GAP`. If a campaign exists
but has not run, report `NOT_RUN`.

## Scope

Use for:

- authoring or changing a versioned campaign manifest or portfolio;
- previewing or initializing one complete target-project simulation package;
- selecting campaigns by contour, driver, tier, risk, cost, platform, or
  claim;
- validating campaign references, budgets, permissions, fixtures, evidence,
  cleanup, and handoff contracts;
- dispatching a resolved campaign to `simulation-operator`;
- planning a replay without mutating prior attempts;
- analyzing claim-to-policy-to-oracle mappings;
- aggregating immutable execution and evaluation receipts;
- projecting a claim ledger through the mechanical reducer;
- reporting exact authored, validated, executed, graded, and cleanup status.

Route elsewhere when:

- one selected campaign must execute, freeze evidence, clean up, and hand off:
  `simulation-execution` and `simulation-operator`;
- one frozen run needs independent evidence, policy, oracle, semantic, and
  claim assessment: `simulation-evaluation` and `simulation-evaluator`;
- one product behavior needs visible acceptance proof without a campaign
  lifecycle: `functional-qa`;
- Cascade skills, routes, agents, or JSONL traces need deterministic or golden
  grading: `harness-evaluation`;
- a campaign schema, runner, validator, skill, agent, or repository wiring must
  change: `codex-maintenance`, then `plan-change` and `implement-change`;
- product or runtime behavior must be repaired: `implement-change`.

## Contours, Drivers, and Tiers

Supported contours are `command`, `terminal`, `browser`, `desktop`, `mobile`,
and `agent-response`.

Choose a driver explicitly:

- direct process for non-interactive command execution;
- PTY for interactive terminal behavior;
- Playwright or an equivalent browser driver for web interaction;
- platform automation for native desktop applications;
- emulator, simulator, or device automation for mobile;
- Computer Use for visual interaction when a supported environment and
  evidence contract exist;
- agent runtime for standalone Codex-agent or Cascade-harness responses.

Computer Use is a driver. It is never the expected-result oracle.

Choose a tier explicitly: deterministic fixture, controlled integration,
platform canary, or semantic evaluation. Split campaigns when isolation,
permissions, platform, cost, cleanup, runtime, or claim scope differ
materially.

## Campaign Workflow

1. Establish authority and state.
   - Identify what is authored, mechanically validated, runnable, executed,
     graded, calibrated, deployed, and release-eligible.
   - Confirm both the campaign source and its runtime adapter or runner exist.
   - For a new target simulation, derive an approved lowercase simulation ID
     and owning `W-NNN` lane, preview with `simulation init ... --dry-run`,
     inspect every path, then initialize without an overwrite mode.
2. Resolve the definition graph.
   - Resolve manifest, task, simulation, claim, policy, oracle, fixture, and
     digest references, including populations, scenarios, stateful worlds,
     dataset partitions, metrics, treatments, and calibration inputs.
   - Resolve the campaign's versioned evaluation profile and rubric. Permit a
     fixture provider only for `deterministic-fixture`; require the Codex
     provider for `semantic-evaluation`.
   - Reject duplicate IDs, unknown references, stale generated catalogs, and
     ambiguous versions.
   - For persona-derived populations, resolve the approved derivation manifest,
     exact product-persona ID/revision/path/digest, generator identity,
     behavioral dimensions, invariants, mutation axes, and allocation mode.
     Preview deterministic generation with `simulation derive-population ...
     --dry-run`; model-backed generation requires a separately authorized path.
3. Validate the execution contract.
   - Record contour, driver, tier, platform, permissions, runtime identity,
     fixture identity, timeout, budget, evidence targets, cleanup, and handoff.
   - Resolve each referenced policy against the exact campaign, task, kind,
     driver, action, and optional path or command prefix before provisioning.
     Zero applicable referenced policies and ambiguous matches fail closed.
   - Bind distinct operator, evaluator, target, simulator, aggregator, and
     recovery sessions; lease/recovery authority; confirmation receipt expiry;
     required budget dimensions; redaction capability; frozen-evidence
     producer/platform/lineage; terminal verification; and retry parentage.
4. Preflight before execution.
   - Do not start when required runtime, permission, identity, fixture, oracle,
     or cleanup inputs are missing.
5. Dispatch the bounded execution.
   - Hand the resolved selection, permission envelope, budgets, identities,
     evidence targets, cleanup contract, and exact evaluator to
     `simulation-operator`.
   - Do not continue aggregation until an immutable execution receipt exists.
6. Route independent evaluation.
   - Route Cascade agent-response trace claims through the specialized
     `harness-evaluator` first and require its receipt.
   - Send the exact frozen run plus any required specialized receipt to
     `simulation-evaluator`.
   - Preserve the selected provider/model/profile, frozen input manifest,
     input-manifest digest, provider trace, output digest, and attempt result.
     If the declared provider fails or returns stale/mismatched output, block
     without falling back to another provider.
7. Aggregate claims.
   - Verify execution and evaluation receipt identities and digests.
   - Store each accepted evaluation receipt under a new immutable evaluation
     ID beside the finalized execution namespace, then emit a separate
     aggregation/projection receipt with its own ID, source digest, aggregator
     identity, and exact input receipt digests.
   - Let the mechanical reducer combine applicable policies, required oracles,
     and evaluator receipts; do not invent missing verdicts.
   - Reduce accepted frozen simulated/reference scores into a separate
     append-only calibration receipt. Verify per-treatment required slices,
     sample thresholds, human agreement, treatment-rank and linear
     correlation, reference freshness, and invalidation inputs.
   - Use `SUPPORTED`, `PARTIALLY_SUPPORTED`, `UNSUPPORTED`, `CONFLICTING`,
     `BLOCKED`, `NOT_RUN`, or `INVALID` for claim-ledger entries. Only
     `SUPPORTED` satisfies a required claim.
   - Validate evaluator refinement candidates against the exact persona and
     derivation identities and frozen evidence paths, then freeze them once in
     `refinements/` before terminal finalization. They remain `PROPOSED` and
     route to simulator repair, external research, or `synthesis-to-spec`.
8. Verify cleanup and handoffs.
   - Require operator cleanup verification plus matching execution and
     evaluation receipts containing campaign ID, run ID, source revision,
     environment, evidence root, result digest, and next owner.
9. Report exact status.
   - Use `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, or `GAP` for campaign and task
     execution status.
   - Keep claim-ledger status in the separate vocabulary above.
   - Never collapse a partial portfolio into an umbrella release pass.

## Hard Gates

- Unknown or duplicate references and stale catalogs invalidate selection.
- A referenced policy that cannot apply to its task action invalidates
  selection before provisioning; an unreferenced action remains default-denied
  at execution.
- Simulation initialization refuses path collisions, renders only tracked
  templates, validates the complete generated graph, and regenerates the
  catalog only after the new sources resolve.
- Missing runtime or permission blocks dispatch; it does not become a failed
  product claim.
- A denied policy, failed required oracle, missing evidence body, failed
  cleanup, or identity mismatch cannot pass the affected claim.
- Driver completion is not expected-result evidence.
- Semantic judgment cannot override schema, permission, safety, identity,
  evidence-integrity, or cleanup failures.
- Semantic campaigns cannot fall back to fixture evaluation, and failed or
  missing provider receipts cannot reach aggregation.
- Evidence stored only in mutable external state or supplied without an
  operator receipt is insufficient.
- Operator and evaluator identities must differ; an evaluator may not judge
  evidence it produced through target execution.
- Run, evaluation, and aggregation IDs are atomically reserved and
  append-only; no stage may overwrite another stage's namespace.
- Platform-specific evidence proves only the platform and scope it exercised.
- Frozen evidence must record producer, platform, timestamp, digest, redaction
  status, and lineage; terminal handoff requires manifest verification.
- Authored, validated, executed, graded, calibrated, deployed, and
  release-eligible are separate states.
- A framework-fixture, stale, partial, missing, or failed calibration cannot
  support a target-project release claim.
- Coverage, stress, and counterfactual actor weights are test allocation, not
  population prevalence. Synthetic output cannot self-confirm or directly
  mutate its source product persona; promotion requires external evidence,
  accountable human review, and a new persona revision.

Use `templates/campaign-design.md` before creating or materially changing a
campaign. Use `checklists/campaign-quality.md` before accepting a campaign or
report.

## Output

- campaign and run identity;
- contour, driver, tier, platform, runtime, and selection reason;
- resolved source graph and digests;
- population/scenario coverage, dataset partitions, metrics, treatment
  identities, and calibration status;
- persona derivation identities and allocation semantics, plus proposal IDs
  and their external-evidence/human-review blockers when present;
- selection, dispatch, execution-receipt, evaluation-receipt, cleanup, and
  handoff status;
- claim ledger with policy, oracle, evidence, and support status per claim;
- frozen artifact root and replay inputs;
- blockers, gaps, residual risk, and next owner;
- explicit distinction between authored, validated, executed, graded,
  calibrated, deployed, and release-eligible status.
