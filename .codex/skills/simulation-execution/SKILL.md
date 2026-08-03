---
name: simulation-execution
description: Use when one approved, versioned simulation campaign must be preflighted, provisioned, seeded, executed, observed, frozen into immutable evidence, cleaned up, or handed off across command, terminal, browser, desktop, mobile, or agent-response contours.
---

# Simulation Execution

Use this skill to operate one selected campaign through a bounded runtime. It
owns runtime preparation, typed driver execution, raw observations, evidence
freezing, cleanup, and the execution handoff receipt.

It does not author campaign intent, change claims or policies, perform semantic
judgment, aggregate a portfolio, or decide release eligibility.

## Source Order

1. Approved campaign selection and exact campaign/run request.
2. Current-checkout campaign, task, simulation, population, scenario, world,
   dataset, metric, treatment, calibration, claim, policy, oracle, fixture,
   and generated-catalog sources.
   For persona-derived populations, include the approved derivation manifest
   and exact product-persona revision/path/digest without copying raw research
   content into the run.
3. Runtime adapter, environment provider, permission envelope, and budget
   definitions.
4. Prior attempt and retry lineage without mutating prior artifacts.
5. `simulation-campaigns`, `functional-qa`, `docs/structure.md`,
   `docs/glossary.md`, and the owning work lane.
6. The new run package under `.artifacts/campaigns/<run-id>/`.

If selection, approval, source identity, runtime, permissions, fixture, oracle,
cleanup contract, or artifact destination is missing, stop before execution
and report `BLOCKED` or `GAP`.

## Scope

Use for:

- preflighting one already-selected campaign;
- provisioning an isolated CLI, PTY, browser, desktop, mobile, or agent
  environment;
- seeding digest-bound fixtures and initial state;
- executing typed adapter actions within declared permissions and budgets;
- collecting raw command, terminal, UI, device, application, tool, and model
  observations;
- invoking declared deterministic oracles without rewriting their expected
  results;
- freezing required evidence bodies, logs, traces, and identities;
- cleaning up and verifying reset;
- emitting an execution receipt for independent evaluation.

Route campaign design, selection, replay planning, or portfolio aggregation to
`simulation-campaigns`. Route independent evidence and claim judgment to
`simulation-evaluation`. Route Cascade trace grading to `harness-evaluation`.
Route runtime or adapter defects to `codex-maintenance` or
`implement-change`; do not repair them during an evidence run.

## Execution Workflow

1. Verify authorization and selection.
   - Resolve the exact campaign version, source revision, task order, contour,
     driver, tier, platform, permission envelope, and approval.
   - Reject stale catalog entries, ambiguous IDs, changed inputs, or a reused
     run ID.
2. Create the immutable run identity.
   - Record campaign, task, simulation, population, scenario, world, dataset,
     metric, treatment, calibration, fixture, policy, oracle, runner, adapter,
     driver, source, environment, operator, target actor, simulator, and
     parent/retry identities before side effects.
   - Atomically reserve a new run ID and execution lease before provisioning;
     reject an existing, active, or finalized identity rather than racing or
     appending to it.
3. Preflight.
   - Check runtime availability, credentials without exposing them,
     permissions, isolation, budgets, input digests, output capacity,
     artifact writability, oracle availability, and cleanup capability.
   - Emit no target execution events after a failed required preflight.
4. Provision and seed.
   - Create only the declared isolated environment.
   - Seed the exact fixture and record its digest and initial-state evidence.
5. Execute.
   - Use the typed driver for the declared contour.
   - Enforce step, time, token, cost, network, filesystem, application,
     account, and action limits.
   - Record decisions, actions, observations, approvals, errors, and the
     earliest failure.
6. Observe and invoke deterministic oracles.
   - Capture public-boundary state.
   - Treat driver completion as an observation, never as the oracle.
7. Freeze evidence.
   - Copy required evidence bodies into the run package.
   - Record digests, timestamps, producer, platform, redaction, and lineage.
   - Redact or quarantine secrets before content enters the immutable evidence
     namespace; fail closed when required evidence cannot be retained safely.
   - Never replace or edit a prior attempt.
8. Clean up in every terminal path.
   - Attempt cleanup after pass, failure, blocker, timeout, or cancellation.
   - Verify reset and record remaining resources or contamination.
   - After an operator crash or lost session, a recovery operation may perform
     cleanup and finalize the interrupted attempt, but it must not resume target
     actions or silently retry them.
9. Hand off.
   - Produce an execution receipt containing status, identities, evidence
     root, digests, cleanup outcome, blockers, retry lineage, and exact next
     evaluator.
   - Atomically finalize the execution namespace only after terminal status,
     cleanup, and receipt content are durable. Evaluation and aggregation write
     only to their separate sibling namespaces.

## Hard Gates

- Execute only an approved, resolved campaign version.
- Do not combine authoring changes with an evidence-producing run.
- Do not widen permissions or budgets during execution.
- A missing runtime, permission, fixture, oracle, cleanup capability, or
  artifact destination blocks before target execution.
- A denied action remains denied even if later output appears successful.
- A timeout, required-oracle failure, missing evidence body, identity
  mismatch, or unverified cleanup cannot produce execution `PASS`.
- Computer Use is a driver and cannot judge its own success.
- Semantic model output cannot override mechanical runner status.
- A retry receives a new run ID and preserves its parent attempt unchanged.
- An action with an unknown external outcome is never retried automatically;
  preserve the uncertainty and require an explicit recovery disposition.
- The operator never edits a product persona or treats synthetic actor behavior
  as persona validation; refinement candidates belong to independent
  evaluation and governed proposal storage.

Use `checklists/execution-quality.md` before accepting a run package. Use
`templates/execution-receipt.md` when the runner does not yet emit a typed
receipt.

## Output

- campaign, run, task, source, fixture, environment, runner, driver, operator,
  and target-actor identity;
- approval, permission, isolation, timeout, budget, and platform scope;
- lifecycle status for preflight, provision, seed, execute, observe, oracle,
  freeze, cleanup, and handoff;
- raw observation and deterministic-oracle evidence;
- immutable artifact root and digests;
- execution status: `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, or `GAP`;
- cleanup status and residual resources;
- execution receipt and exact next evaluator;
- explicitly unproven semantic, portfolio, deployment, and release claims.
