---
name: simulation-evaluation
description: Independently evaluate the semantic outcome, policy support, or claim support of one frozen Cascade Simulations run after controller verification. Use when a mechanically reviewed actor run needs blind judging or conservative evidence reduction; do not execute, repair, or redefine the simulation.
---

# Simulation Evaluation

Consume a frozen run; never operate the target.

## Source order

1. Evaluation claim and immutable run identity.
2. Simulation, adapter, actor, persona binding, brief, outcome, limits, journal,
   result, and source digests.
3. `cascade-simulations:simulation-review` mechanical receipt.
4. Versioned semantic profiles, rubrics, policies, oracles, and evidence.

## Workflow

1. Resolve the enabled installed `cascade-simulations:simulation-review`
   skill and bind its plugin/manifest/skill digests.
2. Require controller verification and a mechanically eligible review receipt.
   `BLOCKED`, `INVALID`, or `NOT_RUN` cannot proceed to semantic judgment.
3. Freeze the claim and blind evidence packets. Do not expose success labels,
   expected route, thresholds, or peer judgments.
4. Invoke `$evaluate` with the simulation adapter and independent required
   profiles. Recompute scores and retain the lower required-judge score.
5. Report support only for this run and claim scope. One run is not release,
   persona-fidelity, or population evidence.

Self-review is diagnostic and cannot satisfy an independence requirement.
