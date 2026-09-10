---
name: simulation-review
description: Review one frozen dynamic simulation run against its fixed actor, interface, brief, outcome, permissions, and limits. Use when the user asks whether a completed run achieved its goal, followed realistic actor behavior, respected the interface, or produced sufficient run-level evidence without executing or repairing the target.
---

# Simulation Review

Judge one frozen run read-only. Do not execute tools against the target, repair
the run, change the outcome after seeing results, or promote a synthetic actor
into a product persona.

## Workflow

1. Load the exact simulation, adapter, event stream, result, and source identity.
2. Run the `simulate` controller `verify` command, then apply mechanical gates:
   source and event digests, identity, schema, limits, capability binding,
   permission, prohibited shortcuts, dispatch/result matching, and required
   evidence presence.
3. Use `references/review-prompt.md` only after mechanical eligibility.
4. Return `SUPPORTED`, `PARTIALLY_SUPPORTED`, `UNSUPPORTED`, `CONFLICTING`,
   `BLOCKED`, `NOT_RUN`, or `INVALID`, with evidence and uncertainty.

Use `NOT_RUN` only when verification was not executed, `BLOCKED` when a required
review input is unavailable, and `INVALID` when executed verification fails.
Semantic support labels are allowed only after mechanical PASS.

Self-review is useful diagnosis, not independent acceptance or release proof.

Keep the user-facing answer concise. Output requirements specify information,
not extra headings. Preserve required schemas, evidence and permissions. Avoid
duplicate artifact prose, empty sections, unsolicited variants and extra files
unless needed for the requested delivery or an actual handoff.
