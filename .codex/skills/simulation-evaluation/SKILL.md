---
name: simulation-evaluation
description: Use when a frozen simulation run across command, HTTP, terminal, browser, desktop, mobile, or agent-response contours needs independent read-only evidence validation, policy and oracle assessment, semantic judgment, claim-ledger reduction, or an evaluation receipt.
---

# Simulation Evaluation

Use this skill after execution has produced an immutable run package and
execution receipt. It independently validates evidence and recommends claim
support without executing the target, changing artifacts, repairing defects,
or deciding a broader release from incomplete scope.

## Source Order

1. Exact campaign ID, run ID, requested claim scope, frozen READY simulation
   intake, and execution receipt.
2. Frozen `run.json`, source manifest, task results, policy decisions, oracle
   results, evidence bodies, cleanup result, and handoff receipt.
3. Digest-bound campaign, task, simulation, population, scenario, world,
   dataset, metric, treatment, calibration, claim, policy, oracle, fixture,
   rubric, and judge definitions.
4. Product-visible oracle results produced through `functional-qa`.
5. For Cascade agent-response profiles, the completed
   `harness-evaluation`/`harness-evaluator` receipt and trace packet.
6. Prior independent evaluations only for comparison, never as replacement
   evidence for the selected run.

If the run package, required evidence body, source identity, cleanup result, or
applicable definition is absent or mutable, return `BLOCKED` or `INVALID`.

## Scope

Use for:

- verifying run-package completeness, identity, digests, and lineage;
- verifying that intake claims and the bound Task Envelope/product brief did
  not drift between authoring and execution;
- checking policy applicability and recorded action decisions;
- checking declared deterministic-oracle results and evidence sufficiency;
- performing an allowed semantic judgment only from frozen evidence;
- comparing independent judge results conservatively;
- producing a per-claim support ledger and evaluation receipt;
- classifying execution, evidence, policy, oracle, evaluator, and environment
  failures without repairing them.

Route campaign authoring and portfolio selection to `simulation-campaigns`.
Route target execution, evidence collection, and cleanup to
`simulation-execution`. Route Cascade scenario/trace grading to
`harness-evaluation` and the `harness-evaluator` role. Route confirmed
implementation defects after evaluation to `codex-maintenance` or
`implement-change`.

## Evaluation Workflow

1. Establish read-only scope.
   - Bind the exact run, campaign version, source revision, claim set, rubric,
     judge profile, operator identity, target-actor identity, and evaluation
     identity.
   - Bind the tracked evaluation profile, provider, model, reasoning effort,
     timeout, and output/receipt schema versions.
2. Validate the packet.
   - Verify required files, digests, source lineage, platform and environment
     identity, execution receipt, cleanup result, and immutability.
   - Reject an evaluator role/session identity that matches the operator or
     target actor identity.
3. Apply non-compensating mechanical gates.
   - Reject invalid definitions, denied required policies, missing evidence,
     failed required oracles, stale identity, unsafe actions, failed cleanup,
     and unsupported platform scope before semantic judgment.
4. Select the evaluation route.
   - Use frozen product-visible oracle results for command, HTTP, terminal,
     browser, desktop, and mobile behavior.
   - Require the specialized harness-evaluator receipt for Cascade
     agent-response trace claims.
   - Use a declared semantic rubric only for claims that require human-like
     interpretation.
5. Judge independently.
   - Keep golden expectations and evaluator rationale out of target prompts.
   - Use separate judge contexts or profiles when independence is required.
   - Preserve each raw judgment and use the configured conservative reduction.
   - For the Codex provider, work only from the copied frozen packet in a
     separate read-only context; echo the packet manifest digest and preserve
     its JSONL trace and output digest.
6. Reduce claims.
   - Use `SUPPORTED`, `PARTIALLY_SUPPORTED`, `UNSUPPORTED`, `CONFLICTING`,
     `BLOCKED`, `NOT_RUN`, or `INVALID`.
   - Only `SUPPORTED` satisfies a required claim.
   - Never let a semantic score compensate for a failed mechanical gate.
   - When a persona-derived population is present, optionally emit typed
     refinement candidates bound to its exact persona and derivation IDs and
     frozen evidence paths. Separate product friction from simulator defects
     and research questions; emit no candidate when evidence is insufficient.
7. Validate calibration inputs when the claim requires calibration.
   - Check frozen score, metric, treatment, label, reviewer, required-slice,
     freshness, and invalidation identities.
   - Treat framework-fixture calibration as reducer proof only and refuse to
     project it as target-project release support.
8. Emit the evaluation receipt.
   - Bind evaluator, rubric, judge, run, evidence, claim-ledger, verdict,
     uncertainty, and next route identities.
   - Bind every emitted refinement candidate by unique proposal ID and
     canonical candidate digest so terminal artifact validation can prove an
     exact one-to-one relationship to the evaluator output.
   - Return digestable receipt content without writing into the run package;
     campaign aggregation stores it as a sibling immutable evaluation
     artifact under a new evaluation ID after identity checks and refuses to
     overwrite an existing receipt.
   - Return proposal candidates with the evaluation result. The receipt binds
     their IDs and digests; the operator-side artifact writer validates source
     and frozen-evidence bindings and freezes them as `PROPOSED`. The evaluator
     cannot mark them accepted or mutate persona source files.

## Hard Gates

- Evaluation is read-only and run-specific.
- Evaluator, operator, and target-actor role/session identities must be
  explicitly attributable; the evaluator cannot equal the operator or target.
- No trace or required evidence body means no live-evidence pass.
- No verified cleanup means no affected safety or release-support claim.
- Platform evidence proves only the exact platform/runtime/build/driver scope.
- A harness final answer cannot override a mutation, route, trace, or
  skill-load failure.
- The evaluator cannot repair the target, rerun it silently, rewrite policies,
  or modify frozen evidence.
- Prior-run evidence cannot replace missing current-run evidence.
- Provider failure, incomplete trace, malformed output, stale identities, or
  digest mismatch blocks evaluation; never substitute a fixture evaluator.
- Release eligibility remains a campaign aggregation decision after every
  required execution and evaluation receipt exists.
- Repeated synthetic findings do not validate their source persona. Every
  persona refinement requires external evidence, human review, and a new
  revision through `synthesis-to-spec -> compose-spec`.

Use `checklists/evaluation-quality.md` before accepting an evaluation. Use
`templates/evaluation-receipt.md` for a durable receipt.

## Output

- evaluation, campaign, run, source, environment, evaluator, rubric, and judge
  identity;
- packet-integrity and mechanical-gate results;
- policy applicability and oracle assessment;
- raw independent semantic judgments when applicable;
- per-claim support ledger with evidence references;
- evaluation status: `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, or `GAP`;
- root-cause class and earliest causal failure;
- uncertainty, untested scope, and explicitly unsupported claims;
- digestable evaluation receipt content for immutable campaign storage and the
  exact next route.
