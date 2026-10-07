---
name: run-workflow
description: Apply the shared Cascade host cycle to ambiguous capability requests or a multi-skill workflow, preparing semantic selection, ordered artifact handoffs and bounded observation control. Reuse one sufficient explicit method directly and keep ordinary implementation with the existing change skills.
---

# Run Workflow

The common host cycle is `admit -> select -> prepare -> act -> observe -> verify
-> complete or recover`. Apply it proportionally: an answer or one sufficient
method stays inline; connected plugin work uses the existing selection and plan
contracts. The cycle is the constant, not a mandatory list of plugins.

## Select and prepare

1. Complete current task admission. Bind the real target, current evidence,
   available artifact identities and native execution authority.
2. For one exact sufficient method, resolve its enabled installed entrypoint
   and use it directly. For an ambiguous request or several domain methods,
   prepare `workflow intake --envelope ENVELOPE --bindings BINDINGS --output
   INTAKE` through `scripts/cascade.ts`. An empty binding list is explicit;
   never label missing artifacts as available.
3. Apply `cascade-workflows:select-capabilities` to that intake. Interpret
   the desired outcome, subject, operation and evidence with the LLM. A group
   name such as Quality or an old name such as Evals is not a specific route.
   Preserve uncertainty; request only the missing decision that changes the
   method. Do not use lexical aliases or load all group skills.
4. Submit the declared JSON through `workflow accept-selection --intake INTAKE
   --response RESPONSE --output SELECTION`. The host stamps only digest
   fields, validates the selection and rechecks input bytes. BLOCKED is a
   terminal intake result, not permission to execute partial routes.
5. With a dependency, multiple nodes or an artifact handoff, use
   `cascade-workflows:plan-workflow` and `workflow validate-plan`. Otherwise
   execute the one selected method under its existing contract.

## Act, observe and verify

For an observation loop, use the existing `workflow control-init`,
`control-intake` and `control-step` operations. Freeze explicit budgets. A
prepared node supplies its exact method identity, model policy, required input
bindings and expected output types. The host resolves the installed method,
checks authority and performs only that action. PREPARED does not dispatch it.

Freeze actual outputs with artifact type, identity, version, path and digest;
record completion or failure. Pass the producer's bound output through the
plan's explicit edge to its consumer. A prose claim of success, planned output
or missing receipt cannot substitute for an artifact. Reuse accepted inputs
instead of re-running their producers.

Use relevant Quality gates and separate evaluation contexts when the claim
requires them. Changed inputs require fresh selection/planning. Measured
failures may hand off to `cascade-ai-architect:run-improvement-cycle` under its
existing limits; execution, promotion and acceptance retain their owners.

## Reuse

For recurring shapes, read the selected plugin planner's
`references/shared-workflows.md`. Recipes suggest compatible handoffs; the
current validated selection owns the actual routes. Keep reusable shapes with
that portable owner and project-specific accepted inputs with the target.
Create another local skill only for a stable, distinct task with useful target
behavior; reference the workflow and owning methods instead of copying them.

Return the methods chosen and why, completed outputs, current evidence,
unresolved input or authority, and the next action. Normal bounded work stays
inline; persist runtime JSON only where deterministic validation needs it.
