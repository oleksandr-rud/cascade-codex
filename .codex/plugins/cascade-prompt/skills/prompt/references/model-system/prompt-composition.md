# Prompt Composition

Compose prompts from independent layers so model adaptation does not erase task
requirements.

`Final Prompt = Core Task Contract + Task Overlay + Risk Overlay + Tier Overlay + Surface Adapter`

## Core Task Contract

Include the objective, authoritative inputs, constraints, exclusions, output
contract, failure behavior, and validation criteria derived from the claims.
This layer is invariant across model tiers.

## Task Overlay

Add only the specialization instructions justified by the task profile. Use
`specialization-overlays.md` for the available patterns.

## Risk Overlay

Add source boundaries, permissions, abstention, review, privacy, reversibility,
or escalation controls proportional to consequence. Do not replace evidence or
qualified review with a disclaimer.

## Tier Overlays

### `efficient-structured`

- Use short sections, explicit verbs, local definitions, and one clear output
  schema.
- Decompose complex work into bounded steps with visible intermediate artifacts.
- Provide one or two representative examples when format or classification
  boundaries are subtle.
- Repeat critical constraints near the relevant step rather than relying on
  distant global prose.
- Minimize optional context, implicit dependencies, and open-ended reflection.

### `balanced-production`

- Use a clear objective, scoped context, ordered workflow, and explicit done
  condition.
- Allow moderate autonomy inside named tool and permission boundaries.
- Use examples for ambiguous edge cases, not for every ordinary case.
- Require concise validation and a bounded repair attempt for detectable defects.

### `frontier-generalist`

- State outcomes, constraints, evidence standards, and invariants precisely;
  avoid micromanaging routine reasoning.
- Organize long instructions around authority, dependencies, and completion
  criteria.
- Permit adaptive planning and targeted retrieval while bounding tools,
  iterations, and unsupported claims.
- Ask for concise conclusions, evidence, calculations, or decision logs rather
  than hidden chain-of-thought.

### `frontier-autonomous`

- Define objective, authority, environment, durable state, checkpoints, stop
  conditions, recovery, escalation, and terminal evidence.
- Separate planning, execution, observation, repair, and completion gates.
- Make external effects, approvals, budgets, retry bounds, and cleanup explicit.
- Require progress artifacts that survive long contexts or handoffs without
  requesting private reasoning traces.

## Surface Adapter

Translate the composed prompt into the target surface: system/developer/user
roles, tool declarations, structured-output schema, context-window mechanics,
reasoning controls, or UI fields. Keep provider-specific syntax here; do not
rewrite the task contract around a provider brand.
