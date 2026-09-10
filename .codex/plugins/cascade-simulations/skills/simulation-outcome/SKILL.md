---
name: simulation-outcome
description: Define an observable outcome contract for a goal-directed simulation. Use when success, required evidence, failure conditions, and prohibited shortcuts must be specified without turning them into a prescribed checklist or accepting driver completion as proof.
---

# Simulation Outcome

Define what must be observably true when the actor finishes, independent of the
route taken.

## Workflow

1. Resolve the real work result and which declared adapter observations can
   expose it.
2. Write outcome-state conditions, not action-sequence conditions.
3. Write unique achieved conditions and map each exact condition once to its
   declared observation path and grounded evidence requirement. Name important
   failure states and bypasses.
4. Use `references/outcome-prompt.md` to produce the `outcome` section.
5. Reject circular evidence such as actor assertion, tool success, or driver
   completion when the target state itself can be checked.

An ordinary outcome contract proves only this run's bounded result. It does not
establish release readiness, population prevalence, or general product quality.

Keep the user-facing answer concise. Output requirements specify information,
not extra headings. Preserve required schemas, evidence and permissions. Avoid
duplicate artifact prose, empty sections, unsolicited variants and extra files
unless needed for the requested delivery or an actual handoff.
