---
name: agent-evaluation
description: Adapt the generic Cascade Evals lifecycle to an AI agent, role, skill, workflow, tool loop, or architecture packet. Use for agent-task corpora, trace eligibility, outcome and trajectory judging, version comparison, or improvement evidence; keep agent-architecture-specific packs with their owning Cascade AI Architect source.
---

# Agent Evaluation

Evaluate one digest-bound agent-system claim through `$evaluate`.

## Boundary

- The owning agent or Cascade AI Architect package supplies subject-specific cases,
  rubrics, schemas, permissions, and success oracles.
- Cascade Evals owns lifecycle, judge validation, score recomputation,
  aggregation, calibration state, and receipts.
- Cascade Simulations owns bounded dynamic execution and frozen-run integrity
  when an agent-response or interface simulation is required.
- This skill never edits or promotes the target agent.

## Workflow

1. Freeze the agent/role/skill/workflow/architecture digest and capability
   envelope.
2. Bind an explicit subject pack and validate every reference; missing packs
   are `BLOCKED`, not replaced by generic cases.
3. Apply deterministic schema, ownership, tool, permission, trace, budget, and
   prohibited-action gates only to structured artifacts that can actually be
   recomputed. A keyword search over narrative output is not a mechanical gate;
   route narrative correctness to independent judges.
4. Use the installed `cascade-simulations:simulate` contract only for declared
   dynamic execution. Consume its frozen review receipt without converting it
   into semantic acceptance.
5. For a compatible case suite, invoke
   `../../scripts/run_agent_evaluation.py` from this plugin. Bind the exact
   digest-bearing subject manifest, case suite, subject assertion adapter,
   outcome and trajectory profiles, new output directory, model, reasoning
   effort, and evaluation-wide timeout. Run without `--execute` only for a
   `NOT_RUN` preflight; add `--execute` only with execution authority and
   budget.
   The runner performs a separate model-backed builder review, then executes
   the suite-declared balanced target batches and independent judges in
   separate disposable filesystem views. Target outputs are merged only in
   frozen split order. Every context has enforced read denial for sealed
   subject evaluation sources and installed cache.
   The target receives manifest-bound dependency aliases, versions, paths, and
   digests as non-secret runtime identity context, but not dependency source
   bytes unless the subject contract separately includes them.
   If the subject requires cryptographic fields that a tool-free target cannot
   compute, its bound assertion adapter may expose `finalize_target` and the
   suite must declare `digest-only-json-response-v1`. The runner retains the
   raw output, accepts changes only to lowercase 64-character `sha256` or
   `*_sha256` JSON leaves, emits a controller receipt for every changed pointer,
   and rejects any semantic, structural, identity, status, or routing change.
6. Run blind outcome and trajectory judges through `$evaluate`; preserve the
   architecture pack's dimension semantics while using the generic response
   and reduction contract.
7. Return a candidate evaluation receipt. Promotion remains a separate target
   authority action.
