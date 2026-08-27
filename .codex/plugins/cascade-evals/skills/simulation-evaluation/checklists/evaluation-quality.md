# Simulation Evaluation Quality Checklist

## Independence And Identity

- [ ] Evaluation is read-only and bound to one exact immutable run.
- [ ] Campaign, source, environment, evidence, evaluator, rubric, and judge
      identities are explicit.
- [ ] Operator, target actor, and evaluator role/session identities are
      explicit; evaluator identity differs from both operator and target.
- [ ] Evaluator expectations and rationale were not exposed to the target.
- [ ] Prior runs are comparison evidence only.

## Mechanical Gates

- [ ] Required artifacts, evidence bodies, and digests verify.
- [ ] Evaluation profile, provider, model, reasoning effort, rubric, and
      output/receipt schema versions match the campaign source graph.
- [ ] Required population/risk slices, dataset partition identities, metric
      definitions, treatment identities, and calibration inputs verify.
- [ ] Policies, decisions, oracles, cleanup, and platform scope are applicable
      and complete.
- [ ] Failed schema, permission, safety, identity, evidence, oracle, trace, or
      cleanup gates cannot be overridden semantically.
- [ ] Cascade trace claims use a harness-evaluator receipt.

## Semantic Judgment And Claims

- [ ] Semantic judgment is used only for declared semantic claims.
- [ ] Required independent judge contexts or profiles remain separate.
- [ ] Each raw judgment and conservative reduction is preserved.
- [ ] Codex evaluation preserves the frozen input manifest, command, complete
      JSONL trace, stderr, provider output digest, and usage.
- [ ] Claims use `SUPPORTED`, `PARTIALLY_SUPPORTED`, `UNSUPPORTED`,
      `CONFLICTING`, `BLOCKED`, `NOT_RUN`, or `INVALID`.
- [ ] Only `SUPPORTED` satisfies a required claim.
- [ ] Persona refinement candidates bind current persona/derivation IDs and
      frozen evidence, distinguish simulator defects, and remain hypotheses
      requiring external evidence and accountable human review.

## Receipt And Routing

- [ ] Evaluation status and root-cause class are explicit.
- [ ] Receipt binds the run, evidence, policy/oracle results, rubric, judges,
      claim ledger, uncertainty, and next route.
- [ ] Receipt storage uses a new immutable evaluation ID in a sibling
      namespace and cannot modify the execution package.
- [ ] Failed, incomplete, malformed, stale, or mismatched provider output
      blocks aggregation and does not fall back to fixture evaluation.
- [ ] Calibration is reduced from accepted frozen receipts into a separate
      append-only receipt with reviewer, label, metric, treatment, threshold,
      freshness, and invalidation identities.
- [ ] A framework-fixture or stale calibration receipt cannot support a
      target-project release claim.
- [ ] The evaluator did not execute, repair, rewrite policy, modify evidence,
      or decide release eligibility from incomplete scope.
- [ ] The evaluator did not accept, self-validate, or directly mutate a source
      product persona.
