# Plan Workflow prompt brief

- Target: `gpt-5.6-sol`
- Planning reasoning: `high`
- Frozen prompt-builder, target, and judge reasoning: `max`
- Mission: compile a validated capability selection into the smallest
  dependency-safe, artifact-complete plugin DAG.
- Required inputs: Task Envelope identity and digest, capability-catalog
  identity and digest, capability-selection identity and digest, available
  artifact identities, user model policy, and authority ceiling.
- Preflight: verify serialized identities before schema or route inspection;
  return the first blocker immediately and never reconstruct a selection from a
  prose summary or candidate skill bodies.
- Required output: one `cascade-plugin-plan` candidate conforming to
  `references/plugin-plan.schema.json` with claim bindings, versions, artifact
  edges, order, safe parallel groups, rejected candidates, gates, stop rules,
  blockers, and `dispatch_authorized: false`.
- Prompt compactness: keep an execution prompt at or below 400 words, state
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
- Core cases: exact selection preservation, redundant upstream output already
  supplied, missing required dependency or artifact edge, incompatible
  authority, artifact join, safe parallel read branches, transitive dependency
  collision, model drift, and attempted self-dispatch.
