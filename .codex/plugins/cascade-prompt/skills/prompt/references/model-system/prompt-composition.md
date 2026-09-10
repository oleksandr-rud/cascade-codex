# Prompt Composition

Compose prompts from independent layers so model adaptation does not erase task
requirements.

`Final Prompt = Core Task Contract + Task Overlay + Risk Overlay + Tier Overlay + Surface Adapter`

## Core Task Contract

Include the objective, authoritative inputs, constraints, exclusions, output
contract, failure behavior, and validation criteria derived from the claims.
This layer is invariant across model tiers.

Minimize the delivery without dropping obligations. State each distinct rule
once, except useful local reinforcement of a material boundary. Omit generic
preambles, recaps, repeated explanations, empty sections, unsolicited variants
and attachments. Use bullets or nesting only when the content benefits from
that structure. Extra files require a requested or concrete use/review need.
Keep schemas, requested depth, citations, source gaps and permissions intact.
The default generated answer should be the shortest complete result; internal
working state and validation need not become user-facing text.

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
- Decompose complex work into bounded steps; expose intermediate artifacts only
  when needed for a decision, verification, or handoff.
- Provide a representative example when it resolves a subtle format or
  classification boundary; there is no minimum example count.
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
- Require durable progress only when continuity or handoff needs it; keep those
  operational records separate from concise user updates and final results.

## Surface Adapter

Translate the composed prompt into the target surface: system/developer/user
roles, tool declarations, structured-output schema, context-window mechanics,
reasoning controls, or UI fields. Keep provider-specific syntax here; do not
rewrite the task contract around a provider brand.

At runtime, the selected `prompt_adapter` in `runtime/model-index.yaml`
(relative to SKILL.md) supplies version-specific surface rules. This lookup
also applies when the tier is already known. Never transfer native roles,
reasoning controls or history defaults merely because model sizes are similar.
Use `runtime/context-composition.md` for one selected reusable context template;
it preserves this composition contract and does not introduce a topology.
