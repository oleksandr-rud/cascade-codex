# Work Lane: W-002 Judged Harness Evaluations

Status: `COMPLETE`
Owner: `agent-engineer`
Created: 2026-07-22
Lane Model: `evaluator-optimizer`
Next Gate: `none`

## Request

Replace the legacy point-based harness grader with judged evaluations, update
the involved skills and agents, and add a reusable skill that can generate and
validate judges, rubrics, profiles, calibration inputs, and supporting cases.

## Acceptance Criteria

- Mechanical trace, schema, route, activation, status, handoff, and safety
  checks are binary eligibility gates with no quality score.
- Accepted live evidence requires independent outcome and trajectory model
  judgments using versioned rubrics.
- Judge ratings are anchored from 0 to 4; weights and thresholds are owned and
  recomputed by the harness rather than trusted from model output.
- Judge prompts are blind to prior eligibility verdicts, legacy scores, and
  other judge results.
- Coverage rejects legacy evidence without the current harness-source digest,
  eligibility artifact, and both required judgments.
- The `judge-eval-builder` skill owns judge/rubric/profile/calibration artifact
  creation and is distinct from read-only runtime judging.
- Harness evaluator, Agent Engineer wiring, docs, validator, catalog, and
  self-tests match the new contract.

## Scope

In:

- Harness runner, target/judge schemas, judge profiles and rubrics.
- Coverage and local artifact contracts.
- Harness evaluation and judge-building skills.
- Harness evaluator and Agent Engineer role wiring.
- Validator, routing docs, pattern docs, and eval cases.

Out:

- Deleting ignored historical run artifacts.
- Claiming new live effectiveness coverage without executing and judging the
  new catalog.
- Human calibration labels not actually supplied by humans.

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| Request | current task | migration objective | current |
| Runner | `scripts/run_harness_evals.py` | current grading and judging behavior | current working tree |
| Eval contracts | `evals/harness/` | schemas, cases, interactions, catalog | current working tree |
| Roles and skills | `.codex/agents/harness-evaluator/`; `.codex/skills/harness-evaluation/` | runtime ownership | current working tree |
| Historical evidence | `docs/work/reports/2026-07-09-harness-evaluation-lab.md` | migration risks only | historical |

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| JE-001 | Given a trace with a wrong route, when eligibility runs, then the case is ineligible without receiving a compensating quality score. | self-test | `PASS` |
| JE-002 | Given an eligible live trace, when only one required judge exists, then coverage reports executed but unaccepted. | self-test | `PASS` |
| JE-003 | Given outcome and trajectory ratings, when judgment validation runs, then the harness recomputes weighted scores and rejects dimension or threshold inconsistencies. | self-test | `PASS` |
| JE-004 | Given a judge prompt, when inspected, then it contains the evidence packet and rubric but no eligibility verdict, legacy score, or other judge result. | source and canary prompt check | `PASS` |
| JE-005 | Given an old run without the current harness-source digest, when coverage runs, then it is stale rather than current accepted evidence. | coverage check | `PASS` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| Target execution | JE-001 | runner; response schema | yes | serial read-only trace capture | self-test and canary | `PASS` | `done` |
| Semantic judging | JE-002 through JE-004 | judge schema; evaluator role; rubrics | yes | judges cannot override eligibility | self-test and judge canary | `PASS` | `done` |
| Coverage freshness | JE-005 | coverage ledger; source manifest | yes | stale and blocked evidence stay separate | coverage self-test | `PASS` | `done` |
| Skill routing | request | skill registry; generated catalog | yes | existing seven-case coverage remains | catalog check | `PASS` | `done` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| `scripts/run_harness_evals.py`; `evals/harness/` | Agent Engineer | write | one serialized owner |
| `.codex/skills/`; `.codex/agents/` evaluation surfaces | Agent Engineer | write | update together with validator |
| `.artifacts/harness-evals/` | eval runner | write | ignored evidence; do not delete history |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| local Python and Codex CLI | deterministic validation and bounded live canary | allowed; target and judges read-only | ignored JSONL evidence and summarized results |

## Plan

1. Replace graded target checks with eligibility artifacts and source digests.
2. Add judge profiles, rubrics, response validation, independent judge runs,
   and judged coverage.
3. Add and wire `judge-eval-builder`; update evaluator, docs, validator, and
   cases.
4. Regenerate the catalog, run self-tests and validators, then run a bounded
   live target-plus-judge canary when the local runtime is available.

## Parallel Dependencies

- Can run with: none.
- Must wait for: schema and runner contracts before live judging.
- Conflicts with: concurrent edits to harness eval sources, evaluator roles,
  runner, validator, or generated catalog.

## Handoff And Merge Contract

- Handoff summary: changed contracts, exact validation, live evidence status.
- Required output: judged-eval runner, schemas, rubrics, skill/agent wiring.
- Merge owner: Agent Engineer.
- Merge target: current branch.
- Evidence to preserve: command output, canary run paths, residual gaps.
- Stop condition: all offline gates pass and live checks are executed or
  explicitly reported blocked/not run.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| Python syntax | `python3 -m py_compile scripts/run_harness_evals.py scripts/validate_cascade_codex.py` | `PASS` |
| Judge/eligibility behavior | `python3 scripts/run_harness_evals.py self-test` | `PASS` (18 assertions) |
| Catalog freshness | `python3 scripts/run_harness_evals.py catalog --check` | `PASS` (39 skills, 299 scenarios) |
| Cascade invariants | `python3 scripts/validate_cascade_codex.py` | `PASS` |
| Fixed-point review | request, repository standards, and bounded live canary | `PASS` |

## Closeout

- Merge evidence: offline validation plus current-source run `w002-current-canary-20260722`.
- Report: `docs/work/reports/2026-07-22-judged-harness-evaluations.md`.
- Remaining risk: human-labeled judge calibration and full 299-scenario live execution are `NOT_RUN`; the canary correctly remains executed but unaccepted after both semantic judges found target-behavior failures.
