# Evidence for an optimization experiment

Apply the generic evaluation lifecycle and the selected subject adapter.
This reference supplies experiment-design constraints. It adds no target
runner, optimizer, promotion action or automatic simulation loop.

## Freeze before search

Bind the task/population, baseline, mutable instruction locations, source
versions, adapter/environment, model configuration, permission envelope,
mechanical gates, semantic judges, metrics/floors and maximum search budget.
Freeze the selection and final acceptance rules before opening their results.
The candidate generator cannot rewrite the evaluator, relax a floor, change
a permission or relabel a failing case to improve its score.

Use distinct diagnostic, selection and sealed acceptance evidence, with
semantic deduplication by conversation/document/actor where appropriate.
Map these roles to the adapter's existing partition names. For AI Architect
they are build, validation and sealed-promotion, with shadow-regression kept
separate. Repeated candidate selection consumes validation as search data;
never report that score as a fresh final test.

Give the optimizer a bounded clear-text diagnostic packet: case/input and
observed output/effect identities, the failed criterion, eligible trace
locations, environmental errors and their uncertainty. Keep full evidence
digest-bound outside that packet. Preserve independent judge visibility and
sealed labels/thresholds; feedback cannot leak them to the target or builder.
Numeric scores without the observable failure are insufficient diagnosis.

## Compare candidates fairly

Evaluate the unchanged baseline and eligible candidate under matched cases,
environments, model/adapter, order/repetition and budget rules. Count failures,
timeouts, invalid output and incomplete coverage. Verify deterministic
correctness where a domain oracle exists; use blind semantic judgments for
meaning-dependent quality. Do not invent a lexical correctness oracle.

Keep per-case outcomes and quality/cost/latency objectives alongside the
aggregate. A frontier contains alternatives under selection evidence; it
cannot override hard gates or qualify an automatic action. Each merged or
revised instruction has new lineage and needs its own valid comparison.
Reused receipts are eligible only when every consuming binding is unchanged.

Separate model answer probabilities/concentration from empirically calibrated
correctness. A frontier or optimizer's self-confidence cannot supply missing
calibration or qualify a host threshold. Preserve raw native outputs and the
decision-model adapter's response-integrity checks.

## Acceptance and claims

Select a candidate under the frozen rule, then evaluate it on sealed evidence.
Keep final feedback out of that search. A failed or contaminated final test
cannot be repaired by continuing the same search against those cases; preserve
the failure and define a new experiment with a fresh acceptance set.
Report lineage, excluded/rejected candidates, coverage, uncertainty, regressions,
total search and deployment usage, stopping reason and rollback reference.
Keep auxiliary history outside immutable bundle/receipt schemas.

Task quality concerns the resulting artifact. Optimizer quality concerns
repeatable improvement across tasks/search seeds over a declared comparison
method, including search cost and failure rates. Measure these as separate
claims. A fixed optimizer producing one better candidate has not demonstrated
recursive improvement, generalization or improved permissions.

No improvement claim exists until the required runs, independent judgments
and reductions are valid. Preserve NOT_RUN/BLOCKED/INVALID/INCONCLUSIVE states
and the adapter's staging/promotion boundary.

## Source basis

Checked 2026-10-03. [AlphaEvolve's primary description](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/)
grounds the usefulness of verified behavior and measured candidate scoring.
[GEPA's pinned overview](https://github.com/gepa-ai/gepa/blob/fb1ed589fd83372caef499cffc2c73173d3b096b/README.md)
grounds trace feedback and alternative-candidate search. The visibility,
holdout, authority and acceptance rules above are Cascade's experiment
requirements; those sources do not establish task-specific qualification.
