---
name: evaluate-harness
description: Prepare and coordinate a target-repository coding-agent harness evaluation through the installed Cascade Evals harness-evaluation adapter. Use for skill triggering, role routing, tool and permission behavior, output quality, execution traces, regression coverage, model-policy comparisons, or release evidence while keeping target scenarios local and repairs separate.
---

# Evaluate Harness

Connect target-owned harness cases and assertions to Cascade Evals. Do not edit
the harness while evaluating it and do not treat fixture success as live or
release evidence.

## Ownership

- The target repository owns scenarios, source digests, deterministic
  assertions, runners, response/trace schemas, and release policy.
- `cascade-evals:harness-evaluation` owns generic phase states, judge contracts,
  validation, recomputation, conservative aggregation, and receipts.
- Cascade Simulations owns approved dynamic execution adapters and frozen-run
  review when selected.
- `$maintain-harness` owns confirmed source repair.

## Workflow

1. Freeze claim, repository revision/source digest, scenario selection, target
   model, runner, environment, permissions, budgets, profiles, and stop rules.
2. Resolve `cascade-evals:harness-evaluation` with
   `../../scripts/resolve_plugin_skill.py`. Bind installed plugin/skill identity
   and return `BLOCKED` without fallback when unavailable or invalid.
3. Keep expected answers, evaluator source, thresholds, peer outputs, and prior
   judgments outside target context. Use GPT-5.6 Terra for target and judge by
   default unless the frozen experiment explicitly declares a comparison.
4. Run deterministic source/catalog/schema/route/permission checks first.
   Mechanical failures cannot be repaired by a semantic judge.
5. Invoke the target runner read-only or in an approved sandbox. Normalize
   loaded skills/roles, tool calls, mutations, output, errors, usage, and
   terminal state into immutable evidence.
6. Hand eligible evidence to Cascade Evals for independent outcome and
   trajectory judgment. Require distinct judge identities and context IDs and
   deterministic score recomputation.
7. Attribute failures to harness source, target behavior, model variance,
   scenario defect, evaluator defect, or environment blocker. Do not edit under
   this skill.
8. Return a version-bound receipt preserving `NOT_RUN`, `BLOCKED`, `INVALID`,
   `FAIL`, `INCONCLUSIVE`, and `PASS`. Route confirmed source defects to
   `$maintain-harness` with evidence; release remains target-authority policy.

## Output

Return frozen identities and digests; selected cases; dependency receipt;
mechanical findings; execution evidence; independent judgments; recomputed
scores; coverage; cost/latency; root-cause class; overall state; and every
unexecuted or unavailable phase.
