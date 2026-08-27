---
name: improve-agent-system
description: Run a bounded, offline, evidence-driven improvement experiment for an AI agent, skill, prompt, workflow, or agentic-system architecture. Use when Codex must diagnose measured failures, select a prompt or workflow optimization method, generate versioned candidate patches, compare candidates with a frozen baseline through held-out Cascade Simulations runs, or decide whether a candidate has enough current evidence to be accepted to staging. Do not use for live online learning, direct production mutation, unbounded optimization, or promotion.
---

# Improve Agent System

Improve an authored agent-system artifact through a finite experiment. Emit
candidate patches and immutable receipts only. Never edit the active artifact,
install a candidate, or promote it.

## Source order

1. Latest improvement request, measured failure, and explicitly authorized
   write scope.
2. Frozen baseline artifact, architecture packet, source bindings, and prior
   accepted receipts.
3. `../prepare-agent-evaluation/` architecture subject pack and installed
   `cascade-evals:agent-evaluation` generic evaluation contract.
4. Installed `cascade-simulations:simulate` and
   `cascade-simulations:simulation-review` skills for bounded execution.
5. Installed `cascade-prompt:prompt` for prompt drafting or audit.
6. [evaluation-protocol.md](references/evaluation-protocol.md) for corpus,
   judge, budget, and stopping rules.
7. [method-router.md](references/method-router.md) only when choosing or
   escalating an optimization method.

If a required external skill is unavailable, return `BLOCKED`; do not copy its
instructions, search caches, or substitute an unbound evaluator.

## Non-negotiable boundary

- Work offline against a frozen baseline and versioned candidate copies.
- Keep build, validation, sealed-promotion, and shadow-regression partitions
  digest-bound and semantically deduplicated.
- Hide sealed expected answers, thresholds, peer outputs, and prior promotion
  traces from candidate generation.
- Separate deterministic eligibility from semantic judgment.
- Require blind, independent outcome and trajectory judge receipts.
- Treat reflection, critique, research, and optimizer output as candidate
  hypotheses, never as promotion evidence.
- Never fetch or execute optimizer code from research sources.
- Never self-modify, write into the active skill or prompt, install a
  candidate, or authorize promotion.

## Workflow

### 1. Freeze the experiment

Copy `assets/experiment-template.json` into a new experiment artifact
directory. Bind the claim, baseline and candidate versions, architecture,
model capability envelope, environment, adapters, personas or actors, brief,
outcome, policy, corpus partitions, rubric, budgets, and stop rules by digest.
Place every runtime artifact under one explicit evidence root and record its
relative path, artifact type, artifact identity, and digest. The reducer
recomputes each file digest and verifies its embedded type and identity;
matching digest strings without those files are ineligible. Fix thresholds
and maximum candidate count before reading results.

Record every phase separately as `AUTHORED`, `VALIDATED`, `EXECUTED`,
`MECHANICALLY_ELIGIBLE`, `JUDGED`, `MEASURED_CANDIDATE`,
`ACCEPTED_TO_STAGING`, `BLOCKED`, `INVALID`, `NOT_RUN`, `REJECTED`, or
`INCONCLUSIVE`.

### 2. Establish a baseline

Run matched repeated simulations before proposing a candidate. Default to
three fresh runs per case and balance A/B order. Increase repetitions only
under the fixed adaptive rule for unstable or near-threshold results. Preserve
raw frozen traces; summaries are not substitutes.

### 3. Diagnose and select a method

Express each diagnosis as `evidence -> defect hypothesis -> smallest mutable
surface -> expected effect -> falsifier`. Route it with:

```bash
python3 scripts/route_method.py diagnostic.json
```

Start with a structured expert repair through Cascade Prompt. Escalate only
when current evidence satisfies [method-router.md](references/method-router.md).
Workflow mutation requires prior prompt-method failure, an isolated sandbox,
and an explicit allowlist.

### 4. Generate bounded candidates

Generate at most the predeclared candidate count. Give each candidate a new
version, parent version, method, source digest, hypothesis, patch digest,
rollback reference, and declared mutation surface. Store the patch outside the
active artifact. Reject undeclared or overlapping mutation authority.

### 5. Evaluate fairly

Apply static, schema, reference, permission, source, trace, and candidate-skill
validation first. For eligible candidates, run paired baseline/candidate
simulations under matched bindings on validation cases, then evaluate the one
selected candidate once on sealed-promotion cases.

Outcome and trajectory judges must run through the generic Cascade Evals
response and reduction contract with the bound `prepare-agent-evaluation`
architecture profiles. The experiment accepts only digest-bound Cascade Evals
receipts containing both profile IDs, distinct judge identities and contexts,
mechanical `PASS`, and a terminal semantic `PASS` or `FAIL`. It never ingests
raw judge responses or recomputes their ratings. Its reducer owns only
candidate lineage, paired comparisons, budgets, and staging reduction.

### 6. Reduce and stop

Validate and reduce the completed experiment:

```bash
uv run --with jsonschema python scripts/reduce_experiment.py experiment.json \
  --schema references/experiment.schema.json
```

The reducer is fail-closed. Missing evaluation receipts, stale bindings, contamination,
timeouts, incomplete repetitions, calibration failures, and budget exhaustion
cannot become acceptance. Per-run usage must stay within canonical case ceilings,
and aggregate usage may not under-report comparison receipts. An accepted
result is only
`ACCEPTED_TO_STAGING`; `promotion_authorized` remains `false`.

Stop with one of `TARGET_MET`, `NO_IMPROVEMENT`, `REGRESSION`,
`MAX_ITERATIONS`, `HARD_BUDGET_EXHAUSTED`,
`DIAGNOSTIC_BUDGET_EXHAUSTED`, `BLOCKED`, `CONTAMINATED`,
`STALE_BINDING`, `MISSING_EVALUATION_RECEIPT`, `CALIBRATION_FAILED`, `TIMEOUT`, or
`INCONCLUSIVE`. Do not continue merely because
the target has not been met.

## Output contract

Return:

- experiment ID, claim, frozen binding digest, baseline, and candidate lineage;
- method choice and evidence-backed hypothesis;
- candidate patch path and digest, clearly labeled `CANDIDATE_ONLY`;
- partition digests, matched-run coverage, Cascade Evals receipt identities,
  calibration, and receipt-bound conservative scores;
- cost, latency, token, run, wall-time, iteration, and diagnostic-budget usage;
- reducer receipt with state, stop reason, failed gates, and evidence paths;
- explicit `promotion_authorized: false` and the separate human-controlled
  promotion route.

## Validation

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 uv run --with jsonschema \
  python -m unittest discover -s scripts/tests -p 'test_*.py'
PYTHONDONTWRITEBYTECODE=1 python3 scripts/reduce_experiment.py --self-test
```

Never describe fixture or structural validation as a live simulation result.
