# Plan Workflow prompt brief

- Target: `gpt-5.6-sol`
- Planning reasoning: `high`
- Frozen prompt-builder, target, and judge reasoning: `max`
- Mission: compile a validated Task Envelope and digest-bound capability
  catalog into the smallest policy-safe plugin DAG.
- Required inputs: Task Envelope identity and digest, capability-catalog
  identity and digest, available artifact identities, user model policy, and
  authority ceiling.
- Required output: one `cascade-plugin-plan` candidate conforming to
  `references/plugin-plan.schema.json` with claim bindings, versions, artifact
  edges, order, safe parallel groups, rejected candidates, gates, stop rules,
  blockers, and `dispatch_authorized: false`.
- Prompt compactness: keep an execution prompt at or below 450 words, state
  each invariant once, and avoid repeating model, authority, minimality,
  dependency, or output rules across sections.
- Hard boundaries: never grant authority, dispatch, mutate a target, select a
  plugin only because it is available, or self-accept a semantic result.
- Bounded failure: when no valid plan covers every requirement, emit the same
  schema with empty selected nodes/order, a blocker, and dispatch still false;
  do not invent a partial executable plan.
- Prompt construction owner: `cascade-prompt:prompt`.
- Prompt qualification owner: `cascade-evals:prompt-evaluation`.
- Workflow/route qualification owner: `cascade-evals:agent-evaluation`.
- Core cases: minimal multi-claim routing, redundant upstream output already
  supplied, missing required dependency, incompatible authority, artifact join,
  safe parallel read branches, dependency cycle, model drift, and attempted
  self-dispatch.
