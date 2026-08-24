# Evaluation and controlled improvement specification

This specification defines the architecture-specific corpus, assertions,
rubrics, candidate lineage, and staging policy. Generic evaluation execution,
judge-response contracts, score recomputation, aggregation, and receipts are
owned by `cascade-evals:agent-evaluation` and `cascade-evals:build-judge`.
Bounded actor/environment execution and frozen-run evidence are owned by
Cascade Simulations.

## Evidence states

Preserve these states without collapsing them:

`AUTHORED -> VALIDATED -> EXECUTED -> MECHANICALLY_ELIGIBLE -> JUDGED -> MEASURED_CANDIDATE -> ACCEPTED_TO_STAGING -> PROMOTED`

`BLOCKED`, `INVALID`, `NOT_RUN`, `REJECTED`, and `INCONCLUSIVE` are distinct terminal or repair states.

## Corpus partitions

Use four digest-bound, semantically deduplicated packs:

1. `build`: visible failure diagnosis and candidate generation.
2. `validation`: candidate selection during search.
3. `sealed-promotion`: hidden from the candidate generator and opened once for the selected candidate.
4. `shadow-regression`: rotating post-acceptance drift cases.

The optimizer, target, and intermediate judges must not read sealed expected answers, thresholds, peer outputs, or prior promotion traces.

## Evaluation sequence

1. Freeze the claim, active baseline, target models, environment, adapters, personas/actors, brief, outcome, policies, corpus digests, rubrics, budgets, and stopping rules.
2. Run repeated baseline simulations.
3. Diagnose failures into explicit hypotheses.
4. Generate bounded, versioned candidates.
5. Apply static, schema, permission, source, and trace eligibility.
6. Run paired baseline and candidate simulations under matched conditions.
7. Run independent blind outcome and trajectory judges.
8. Ask Cascade Evals to recompute scores in its deterministic reducer.
9. Test the one selected candidate on sealed promotion cases.
10. Accept to staging or stop. Promotion is a separate explicit action.

## Method router

- Start with a structured expert repair through Cascade Prompt.
- Use critique/edit textual-gradient methods for a local instruction or output-contract defect.
- Use instruction-plus-demonstration search for multi-module prompts with enough examples.
- Use trace reflection and Pareto search when rich failures and multiple objectives exist.
- Use allowlisted workflow mutations only after prompt-level methods fail and only in an isolated sandbox.
- Store Reflexion-style lessons only when grounded in external outcome evidence and scoped to the experiment.

Any research-derived method enters as a recorded hypothesis. Never fetch and execute external optimizer code automatically.

## Mechanical eligibility

Hard gates include:

- valid output schema and complete trace;
- all capability, cluster, role, skill, workflow, prompt, tool, and evaluation references resolve;
- one primary owner per capability and final output;
- no overlapping mutation authority;
- every state-changing tool has permission and confirmation rules;
- missing authority or evidence yields `BLOCKED` or `GAP`;
- no undeclared write, network, delegation, or promotion action;
- candidate skill packages pass their deterministic validators.

A semantic judge cannot override these failures.

## Semantic judges

Outcome dimensions and weights:

- task fit: 25;
- capability coverage: 25;
- behavioral completeness: 20;
- safety and operability: 20;
- minimality and actionability: 10.

Trajectory dimensions and weights:

- source selection and grounding: 20;
- source-to-capability derivation: 25;
- cluster boundary quality: 20;
- building-block and topology selection: 20;
- adaptation efficiency: 15.

Use anchored integer ratings from 0 to 4. Require a weighted score of at least 0.80 and a minimum dimension rating of 2. Conservative quality is the lower of the outcome and trajectory scores. Judges are blind, independent, order-balanced, and calibrated against labeled adversarial cases.

## Promotion gate

A candidate may reach `ACCEPTED_TO_STAGING` only when:

- all hard gates pass;
- required runs and judges are current and complete;
- sealed cases are uncontaminated;
- critical slices meet absolute floors;
- no safety, permission, or severe regression appears;
- paired improvement exceeds the declared minimum effect, or quality is non-inferior while cost or latency improves materially;
- uncertainty does not cross the regression margin;
- hard budgets pass;
- judge calibration meets the declared policy;
- the candidate count, thresholds, and budgets were fixed before results;
- the candidate is versioned and rollback is defined.

Default stochastic coverage is three fresh runs per case, with adaptive repetition for unstable, near-threshold, or small-effect results. Budget exhaustion returns `INCONCLUSIVE`, never a forced decision.

## Stop rules

Stop with `TARGET_MET`, `NO_IMPROVEMENT`, `MAX_ITERATIONS`, `BUDGET_EXHAUSTED`, `BLOCKED`, `CONTAMINATED`, or `INCONCLUSIVE`. Never interpret “work until good enough” as permission for unbounded cost or in-place mutation.
