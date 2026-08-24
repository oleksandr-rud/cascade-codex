# Cascade Evals Architecture

Cascade Evals is the single owner of reusable evaluation mechanics. Subject
plugins retain their domain artifacts and adapt them to this contract.

## Ownership

- `evaluate`: evaluation identity, phase states, mechanical-first ordering,
  independent-judge orchestration, conservative reduction, and receipts.
- `build-judge`: judge profiles, anchored rubrics, response contracts,
  calibration cases, and score recomputation.
- `prompt-evaluation`: prompt and adaptive-interview tasks, runners, variance,
  judging, calibration, and receipts.
- `agent-evaluation`: agent, skill, workflow, role, or architecture subject
  adaptation.
- `simulation-evaluation`: semantic evaluation of a mechanically verified
  frozen Cascade Simulations run.
- `harness-evaluation`: coding-agent harness scenario and trace adaptation.

Cascade Prompt owns prompt authoring. Cascade Simulations owns actors,
interfaces, bounded execution, evidence freezing, and run-integrity review.
Agent Architect owns architecture-specific cases and rubrics. Harness
Maintainer owns target-repository harness integration and repair.

`scripts/run_agent_evaluation.py` is the executable agent-evaluation adapter.
It recomputes the subject allowlist digest; binds the contract, suite, profiles,
adapter, models, and installed Evals artifacts; and runs a separate builder
review. The declared packet builder, judge-packet schema, and model policy are
manifest-bound and enforced at runtime; changing the suite declarations cannot
silently select another contract. A suite binds a positive target invocation
count and `contiguous-balanced-parallel-v1`; the runner partitions the ordered
visible cases into that many non-empty balanced batches, executes each in an
independent disposable directory, and deterministically merges them back into
split order. The target context includes every digest-bound SKILL contract and
subject JSON Schema plus manifest-bound dependency aliases, versions, paths,
and digests, while dependency source bytes and non-operative scripts remain unavailable or digest-only metadata;
a case-declared JSON response contract must be serialized into the response
string and validated mechanically. A manifest-bound subject adapter may run an
explicit `digest-only-json-response-v1` finalizer between a tool-free target and
mechanical eligibility. The controller retains both copies, records every
changed pointer, and rejects changes outside lowercase SHA-256 leaves before
the finalized artifact reaches independent judges. Independent judges likewise use separate
concurrent contexts. All target and judge contexts use macOS sandbox read-denial for the original
subject, its installed cache, and historical evaluation artifacts.
An allowed-read control must succeed before the denied-read probe can count as
evidence, so an unavailable enclosing sandbox fails closed. No mechanical receipt, sealed
oracle, builder context, or peer response is materialized until all judges
exit. Only structured deterministic facts may pass the subject adapter;
semantic response quality belongs to the independent judges. Frozen,
digest-verified evidence then enters the generic reducer. Its output directory
is single-use and disjoint from the subject source; its timeout covers builder,
target, and all judge invocations.

## Dependency direction

Cascade Evals may resolve `cascade-prompt:prompt` while authoring prompt
subjects and `cascade-simulations:simulate` for dynamic execution. Neither
provider depends on Cascade Evals at runtime. Missing, disabled, ambiguous, or
identity-mismatched dependencies fail closed; no cache search or copied
fallback is allowed.

## Model policy

`gpt-5.6-terra` at the model-policy reasoning defaults is the default builder,
target, and judge configuration. A versioned evaluation may declare another
supported model or reasoning effort only as an explicit comparison
configuration. Every model and reasoning-effort value is frozen into the
bundle and copied into the receipt. Target and judge invocations remain
separate contexts even when they use the same configuration.
