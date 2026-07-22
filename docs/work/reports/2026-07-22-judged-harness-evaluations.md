# Judged Harness Evaluations

Date: 2026-07-22
Lane: `W-002`
Status: `COMPLETE`

## Outcome

Cascade no longer uses a point-based deterministic grader to declare harness
effectiveness. Target traces first pass binary mechanical eligibility. Every
accepted case then requires independent `outcome-v1` and `trajectory-v1`
judgments, with anchored 0–4 dimension ratings and scores recomputed by the
runner. The conservative case effectiveness score is the lower required-judge
score.

## Measurement Contract

| Evaluation | Dimensions | Weights | Acceptance |
|---|---|---|---|
| Outcome | correctness, contract fulfillment, grounding, completeness, decision quality, handoff/recovery, clarity | 25/20/15/15/10/10/5 | score at least 80, every dimension at least 2, model verdict agrees |
| Trajectory | context selection, skill/tool selection, observation use, adaptation/recovery, scope/permission, efficiency | 20/20/20/15/15/10 | score at least 80, every dimension at least 2, model verdict agrees |

Mechanical eligibility covers structured output, primary and supporting route,
anti-trigger behavior, required skill load, read-only safety, trace integrity,
status, source evidence, and handoff. It has no compensating point total.

Coverage requires complete target and judge artifacts, exact current scenario
content, a current harness-source digest, eligibility `PASS`, and both accepted
judges. Legacy artifacts remain untouched but are stale under this contract.

## Skill And Role Changes

- `judge-eval-builder` now owns versioned profiles, rubrics, response schemas,
  calibration design, aggregation rules, and adversarial judge cases.
- `harness-evaluation` owns scenario execution, eligibility, independent judge
  invocation, coverage, and regression evidence.
- `harness-evaluator` is a read-only outcome or trajectory judge. It cannot see
  eligibility verdicts, old scores, summaries, or peer judgments.
- Agent Engineer owns judge-contract creation and routes completed contracts to
  runtime harness evaluation.

## Validation Evidence

| Check | Result |
|---|---|
| Python syntax | PASS |
| Harness self-test | PASS, 18 assertions |
| Catalog freshness | PASS, 39 skills and 299 scenarios |
| Static harness audit | PASS, no findings |
| Cascade validator | PASS, 7 agents and 39 skills |
| Diff whitespace | PASS |

## Live Canary

Current-source run: `.artifacts/harness-evals/w002-current-canary-20260722/`

The `HS-context-implicit` target trace passed mechanical eligibility. Both real
judge invocations completed with schema-valid outputs and no validation errors:

| Judge | Verdict | Computed Score | Minimum Dimension | Root Cause |
|---|---|---:|---:|---|
| `outcome-v1` | FAIL | 75.00 | 2 | `target-behavior` |
| `trajectory-v1` | FAIL | 68.75 | 1 | `target-behavior` |

The trace claimed exact git and work-state facts whose corresponding recorded
command output did not preserve those facts, and it overread supporting
documents for a short snapshot. Coverage therefore reports the case as
executed but unaccepted, with effectiveness score 68.75. Current totals are
1/299 executed and 0/299 accepted.

An earlier pre-fix canary exposed an unvalidated supporting route and premature
`model-variance` classification. The runner now rejects unallowed supporting
skills mechanically and permits `model-variance` only with repeated target
runs. Its older source digest is correctly excluded from current coverage.

## Evidence Boundaries And Remaining Work

- The live canary proves the target, eligibility, dual-judge, score,
  artifact-integrity, and coverage paths execute end to end.
- It does not prove the 299-scenario catalog effective; 298 scenarios remain
  unexecuted under the new source digest.
- Judge calibration against human-labeled cases is `NOT_RUN`. Agreement,
  false-pass rate, false-fail rate, repeated-judgment stability, and calibration
  confidence must not be inferred from the synthetic self-test or one canary.
- The new builder skill defines the required calibration packet and metrics for
  that next evidence campaign.
