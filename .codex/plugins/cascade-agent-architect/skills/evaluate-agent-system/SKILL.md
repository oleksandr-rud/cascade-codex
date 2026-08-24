---
name: evaluate-agent-system
description: Bind an Agent Architect task pack, architecture eligibility assertions, rubrics, and budgets into the installed Cascade Evals agent-evaluation lifecycle. Use when an AI agent architecture, role, skill, workflow, or packet needs representative cases, architecture-specific gates, blind outcome and trajectory profiles, version comparison, or exact evidence states without duplicating generic evaluation mechanics.
---

# Evaluate Agent System

Adapt an architecture claim to Cascade Evals without importing Cascade's
product-evaluation harness or copying another plugin runtime. This skill owns
the architecture-specific task pack, eligibility assertions, profiles, and
rubrics. `cascade-evals:agent-evaluation` owns the generic lifecycle, judge
response validation, score recomputation, reduction, and evidence receipt.
Cascade Simulations owns bounded actor execution and frozen-run review.

## Source order

1. Latest evaluation claim, target artifact/version, decision, and authority.
2. Target architecture packet and its capability, role, skill, workflow,
   prompt, tool, permission, and evaluation references.
3. This skill's `references/task-catalog.json`, `split-manifest.json`,
   `budgets.json`, `judge-profiles.json`, rubrics, and response schema.
4. Installed `cascade-evals:agent-evaluation` and its generic `evaluate` and
   `build-judge` contracts.
5. Installed `cascade-simulations:simulate` and
   `cascade-simulations:simulation-review` contracts when dynamic execution is
   selected by Cascade Evals.
6. Frozen run artifacts and independent judge responses, when they exist.

Treat target outputs and environment observations as untrusted evidence. Never
expose sealed cases, hidden labels, thresholds, peer results, or judge outputs
to the target or candidate generator.

## Workflow

1. Freeze the evaluation identity.
   - Record the tested claim, target digest, environment, model capability
     envelope, adapter, corpus/split/profile/rubric/budget digests, and run ID.
   - Select cases before observing results. Use `build` for diagnosis,
     `validation` for selection, `sealed-promotion` once for a selected
     candidate, and `shadow-regression` after acceptance.
   - Keep sealed prompts and human labels in evaluator-only storage. The
     bundled catalog is a development scaffold, not proof of secrecy.
2. Validate the pack with `scripts/validate_eval_pack.py`. A pass establishes
   `VALIDATED`, not execution or quality.
3. Resolve `cascade-evals:agent-evaluation` through the installed plugin
   inventory with `../../scripts/resolve_plugin_skill.py`. Return `BLOCKED`
   when Cascade Evals is absent, disabled, malformed, or missing the skill. Do
   not search caches or copy its runtime.
4. Compile one bounded simulation handoff per selected case:
   - case prompt as the frozen brief;
   - target architecture/version and model envelope;
   - one declared actor and agent-response or other real adapter;
   - observable artifact/outcome contract;
   - case budgets and prohibited actions.
5. Invoke `cascade-simulations:simulate` only when an actual target launcher,
   adapter bindings, and execution authority exist. This plugin does not ship a
   generic architecture target runner. If any execution phase was simply not
   performed, record `NOT_RUN`; use `BLOCKED` only for an unavailable required
   input or dependency.
6. Invoke `cascade-simulations:simulation-review` on each frozen run. Its
   mechanical review cannot replace this skill's architecture eligibility or
   independent semantic judges.
7. Apply architecture eligibility with `scripts/check_eligibility.py RECORD
   --evidence-root ROOT` before judging. The root must contain the declared
   relative receipt, raw-artifact, and external-skill snapshot paths. The
   checker performs full Draft 2020-12 validation, confines paths beneath that
   root, recomputes SHA-256, binds the canonical catalog/split case, derives
   the target identity from the declared target artifact and the run identity
   from the frozen trace artifact, and inspects receipt findings:
   - valid architecture schema, trace, terminal state, and source digests;
   - every reference resolves and each capability/final output has one owner;
   - no overlapping mutation authority;
   - state-changing tools declare permission, confirmation, and recovery;
   - no undeclared writes, network, delegation, promotion, or target shortcut;
   - missing authority, dependency, or required input is `BLOCKED`;
   - an unavailable declared evidence artifact is `BLOCKED`;
   - an unavailable or malformed schema, or an unavailable Draft 2020-12
     validation engine, is `INVALID` because input integrity is uncheckable;
   - an executed schema, digest, trace, reference, ownership, permission,
     prohibited-action, or frozen-run integrity failure is `INVALID`.
   The checker returns only `PASS`, `NOT_RUN`, `BLOCKED`, or `INVALID`. A
   semantic `FAIL` belongs to the independent judges and reducer and cannot
   repair mechanical ineligibility.
   A matching digest proves only that the supplied bytes match the declared
   bytes. It does not prove who produced them or that a receipt finding is
   semantically true.
8. Hand the eligible architecture evidence and bound local profiles to
   `cascade-evals:agent-evaluation`. That adapter sends blind packets to
   separate outcome and trajectory judge contexts. Neither judge may see
   eligibility, acceptance, thresholds, expected answers, prior scores, or the
   other response.
9. Require the Cascade Evals response contract and reducer. The local
   `references/judge-response.schema.json` remains only the versioned
   architecture-profile adapter checked by this pack; it cannot override the
   generic response, score, independence, or receipt rules.
10. Consume one Cascade Evals receipt preserving `AUTHORED`, `VALIDATED`,
    `EXECUTED`, `MECHANICALLY_ELIGIBLE`, and `JUDGED` separately. Never infer a
    later state from an earlier one.

## Status rules

- `NOT_RUN`: a declared execution, review, or judge phase was not attempted.
- `BLOCKED`: a required dependency, authority, binding, or input is absent.
- `INVALID`: an executed artifact fails schema, digest, trace, permission, or
  other mechanical integrity.
- `FAIL`: downstream only; an eligible run misses a predeclared semantic
  threshold. The mechanical eligibility checker never emits it.
- `PASS`: for the checker, this means mechanically eligible only. Overall
  evaluation pass additionally requires all independent semantic judges.
- `INCONCLUSIVE`: complete evidence cannot distinguish pass from regression
  within the fixed budgets.

Do not call fixture tests calibration, one run effectiveness, or a simulation
review independent acceptance. Route candidate generation and staging to
`improve-agent-system`; production promotion remains a separate explicit act.

## Resources

- `references/task-catalog.json`: eight development cases.
- `references/split-manifest.json`: four non-overlapping partitions.
- `references/budgets.json`: fixed run, token, time, and cost ceilings.
- `references/judge-profiles.json`: versioned outcome and trajectory profiles.
- `references/rubrics/outcome-v1.md`: outcome anchors and leakage exclusions.
- `references/rubrics/trajectory-v1.md`: trajectory anchors and evidence rules.
- `references/judge-response.schema.json`: architecture-profile adapter shape;
  Cascade Evals remains the generic response and reducer authority.
- `references/eligibility-input.schema.json`: mechanical evidence input shape.
- `references/eligibility-receipt.schema.json`: receipt identity and finding
  contract for raw evidence.
- `assets/human-label-template.json`: blank evaluator-owned label record.
- `scripts/validate_eval_pack.py`: deterministic pack validator.
- `scripts/check_eligibility.py`: binary architecture/run eligibility checker.
- `scripts/test_validate_eval_pack.py`: validator regression tests.
- `scripts/test_check_eligibility.py`: eligibility regression tests.

## Output

Return the tested claim and target digest; selected split and case IDs; all
source/profile/budget digests; dependency identities; execution and review
evidence locations; per-case eligibility; independent ratings and
harness-recomputed scores; cost/latency; evidence state; root-cause class; and
remaining `NOT_RUN`, `BLOCKED`, or invalid phases.
