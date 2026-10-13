---
name: simulation-evaluation
description: Independently evaluate the semantic outcome, policy support, or claim support of one frozen Cascade Simulations run after controller verification. Use when a verified actor run needs blind judging or conservative evidence reduction; do not execute, repair, or redefine the simulation.
---

# Simulation Evaluation

Consume a frozen run; never operate the target.

## Source order

1. Evaluation claim and immutable run identity.
2. Simulation, adapter, actor, persona binding, brief, outcome, limits, journal,
   result, and source digests.
3. Controller verification result bound to the same frozen run and source digests.
4. Versioned semantic profiles, rubrics, policies, oracles, and evidence.

## Workflow

1. Resolve the enabled installed Cascade Simulations controller and bind its
   plugin/manifest/skill digests. Use its read-only `verify` operation directly;
   consuming this controller does not select or dispatch the `simulate` workflow.
2. Verify the frozen run with its controller before semantic evaluation.
   `BLOCKED`, `INVALID`, or `NOT_RUN` cannot proceed to semantic judgment.
3. Freeze the claim and blind evidence packets. Do not expose success labels,
   expected route, thresholds, or peer judgments.
4. Invoke `$evaluate` with the simulation adapter and independent required
   profiles. Recompute scores and retain the lower required-judge score.
5. Report support only for this run and claim scope. One run is not release,
   persona-fidelity, or population evidence.

Self-review is diagnostic and cannot satisfy an independence requirement.
`cascade-simulations:simulation-review` is optional diagnosis. Its semantic
summary is not a prerequisite or a substitute for direct controller verification
and independent judgment.

Use `checklists/evaluation-quality.md` before accepting an evaluation and
`templates/evaluation-receipt.md` when the target host needs a durable receipt
shape. The target host remains the persistence and release-policy owner.

Keep the user-facing answer concise. Output requirements specify information,
not extra headings. Preserve required schemas, evidence and permissions. Avoid
duplicate artifact prose, empty sections, unsolicited variants and extra files
unless needed for the requested delivery or an actual handoff.
