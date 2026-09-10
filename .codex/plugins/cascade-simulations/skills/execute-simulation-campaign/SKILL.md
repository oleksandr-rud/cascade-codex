---
name: execute-simulation-campaign
description: Use when one approved, versioned simulation campaign must be preflighted, provisioned, seeded, executed, observed, frozen into immutable evidence, cleaned up, or handed off across command, HTTP, terminal, browser, desktop, mobile, or agent-response contours.
---

# Execute Simulation Campaign

Use this skill to operate one selected campaign through a bounded runtime. It
owns runtime preparation, typed driver execution, raw observations, evidence
freezing, cleanup, and the execution handoff receipt.

For a campaign task whose behavior is one goal-directed human or synthetic
actor, resolve and invoke `cascade-simulations:simulate` as the actor-loop
executor after this host skill has bound the campaign's exact adapter,
authority, persona/projection, brief, outcome, limits, artifact destination,
and cleanup contract. Preserve the plugin controller receipt inside the
campaign run. Deterministic command/HTTP/PTY/platform adapters that do not need
an actor loop remain host runtime code. Missing plugin availability blocks only
a task that declares the actor-loop dependency; never replace it with copied
prompt logic.

It does not author campaign intent, change claims or policies, perform semantic
judgment, aggregate a portfolio, or decide release eligibility.

## Source Order

1. Approved campaign selection, READY simulation intake, bound Task Envelope,
   and exact campaign/run request.
2. Current-checkout campaign, task, simulation, population, scenario, world,
   dataset, metric, treatment, calibration, claim, policy, oracle, fixture,
   and generated-catalog sources.
   For persona-derived populations, include the approved derivation manifest
   and exact product-persona revision/path/digest without copying raw research
   content into the run.
3. Runtime adapter, environment provider, permission envelope, and budget
   definitions.
4. Prior attempt and retry lineage without mutating prior artifacts.
5. `$manage-simulation-campaign`, the frozen `cascade-qa:design-tests`
   request, and target-supplied QA execution evidence when applicable.
6. The host-authorized immutable run destination.

If selection, approval, source identity, runtime, permissions, fixture, oracle,
cleanup contract, or artifact destination is missing, stop before execution
and report `BLOCKED` or `GAP`.

## Scope

Use for:

- preflighting one already-selected campaign;
- provisioning an isolated CLI, HTTP, PTY, browser, desktop, mobile, or agent
  environment;
- seeding digest-bound fixtures and initial state;
- executing typed adapter actions within declared permissions and budgets;
- collecting raw command, HTTP, terminal, UI, device, application, tool, and model
  observations;
- invoking declared deterministic oracles without rewriting their expected
  results;
- freezing required evidence bodies, logs, traces, and identities;
- cleaning up and verifying reset;
- emitting an execution receipt for independent evaluation.

Route campaign design, selection, replay planning, or portfolio aggregation to
`$manage-simulation-campaign`. Route independent evidence and claim judgment to
`cascade-evals:simulation-evaluation`. Route harness trace grading to
`cascade-evals:harness-evaluation`. Return runtime or adapter defects to
the target host for repair; do not repair them during an evidence run.

## Execution Workflow

1. Verify authorization and selection.
   - Resolve the exact campaign version, source revision, task order, contour,
     driver, tier, platform, permission envelope, and approval.
   - For product scope, reject execution unless the intake is READY and its
     Task Envelope, product brief, action, and policy digests still match.
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
   - When the selected task declares the standalone actor loop, require an
     exact enabled `cascade-simulations:simulate` identity and bind its
     manifest/skill digests. The plugin dispatches only through the
     host-authorized adapter; the campaign remains the permission, artifact,
     and run-identity authority.
   - Enforce step, time, token, cost, network, filesystem, application,
     account, and action limits.
   - Record decisions, actions, observations, approvals, errors, and the
     earliest failure.
   - When one purpose spans several screens or contours, run it through one
     bounded simulation session with a typed surface registry. Serialize
     overlapping surfaces or conflict keys; parallelize only independent
     steps. Roll long trajectories into bounded episodes and checkpoint after
     every dispatched batch.
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
     cleanup and finalize the interrupted attempt. It may replace an expired
     operator lease only through the exact reserved recovery identity, a
     monotonic lease generation, and an append-only takeover receipt.
   - A controlled continuation may rehydrate a completed checkpoint under the
     same still-valid operator lease or a recovery-issued replacement lease.
     Re-resolve and match the reserved campaign, identities, source digests,
     platform, session contract, persisted policy budgets, and journal/checkpoint
     chain first. If a journaled dispatch lacks its durable checkpoint,
     terminate as `UNKNOWN_OUTCOME`; never infer completion or replay the action.
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

Keep the user-facing answer concise. Output requirements specify information,
not extra headings. Preserve required schemas, evidence and permissions. Avoid
duplicate artifact prose, empty sections, unsolicited variants and extra files
unless needed for the requested delivery or an actual handoff.
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
