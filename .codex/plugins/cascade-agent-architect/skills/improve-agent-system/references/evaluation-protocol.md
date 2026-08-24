# Evaluation protocol

## Partition integrity

Bind four non-overlapping, semantically deduplicated partitions:

- `build`: visible diagnosis and candidate generation;
- `validation`: candidate search and selection;
- `sealed-promotion`: opened once for the selected candidate and never exposed
  to the generator;
- `shadow-regression`: rotating post-staging checks, never recycled into the
  same experiment.

A changed digest invalidates consuming evidence. Contamination returns
`INVALID/CONTAMINATED`; it is not repaired by rerunning a judge.

## Matched comparisons

Compare baseline and candidate under identical model envelope, environment,
adapter, actor/persona, brief, outcome, policy, case, and seed. Default to three
repetitions for every validation and sealed-promotion case. Balance candidate
position (`AB` and `BA`) across the experiment. Record timeouts and tool errors
as execution evidence rather than omitting them.

The deterministic reducer computes each side's quality as the lower of its
outcome and trajectory weighted scores. It computes paired candidate-minus-
baseline effects and a conservative 95% normal lower bound. Acceptance requires
the lower bound to meet the declared minimum effect, or predeclared quality
non-inferiority plus a material cost or latency improvement.

## Judges and calibration

Require complete outcome and trajectory receipts for both sides of every pair.
Consume the canonical `evaluate-agent-system` judge response: the two profiles
share the frozen target run ID, use distinct judge IDs, provide five
evidence-bearing rating rows with hyphenated dimension IDs, and report a clean
`blind`, `blind_to_expected`, `blind_to_peer`, and `excluded_inputs_seen`
leakage check. Normalize by dimension ID without relying on array order.
Recompute the canonical score and reject a supplied verdict that contradicts
its ratings.

Outcome weights: task fit 25, capability coverage 25, behavioral completeness
20, safety and operability 20, minimality and actionability 10.

Trajectory weights: source selection and grounding 20, source-to-capability
derivation 25, cluster boundary quality 20, building-block and topology
selection 20, adaptation efficiency 15.

Require calibration status `PASS` on a digest-bound labeled adversarial corpus
at or above the fixed `0.80` accuracy floor. Never accept a caller-selected
calibration denominator. No semantic score can override
mechanical, permission, trace, or binding failures.

## Budgets

Freeze total hard ceilings for runs, tokens, cost, wall time, iterations, and
candidates. They may not exceed the canonical `evaluate-agent-system` suite
maxima. Bind minimum quality and dimension ratings to its judge-profile
acceptance policy and repetitions to its per-case fresh-run policy. Freeze a
separate diagnostic budget for diagnosis and candidate generation. Either
ceiling is a stop condition, not permission to trade one resource against
another. Reaching or exceeding a ceiling before acceptance returns
`INCONCLUSIVE` with the specific budget stop reason.

Every baseline and candidate receipt must stay within canonical per-case turn,
tool, token, wall-time, and cost ceilings. Sum run, token, cost, and wall-time
usage from comparison receipts and require declared hard usage to cover it;
under-reporting is invalid.

## Promotion boundary

The reducer can accept a versioned candidate to staging only when current
validation and sealed evidence pass all gates, every critical slice meets its
floor, uncertainty stays outside the regression margin, no severe safety or
permission regression exists, and rollback is defined. Shadow-regression is a
post-staging input to a separate promotion process.

This skill never promotes. Promotion requires an explicit external action by
the target's authority owner.
