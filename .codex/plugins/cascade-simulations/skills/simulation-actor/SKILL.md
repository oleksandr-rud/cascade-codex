---
name: simulation-actor
description: Derive an executable simulation actor from an evidence-backed persona, user-provided role, or explicitly synthetic hypothesis. Use when a simulation needs realistic goals, knowledge boundaries, uncertainty, constraints, decision rules, communication, abstention, and stopping behavior without promoting a synthetic actor into a product persona.
---

# Simulation Actor

Turn persona evidence or an explicit hypothesis into a fixed run actor. Keep
persona authority separate from simulated behavior.

## Workflow

1. Classify the source as `evidence-backed`, `user-provided`,
   `synthetic-hypothesis`, or `none`.
   When a purpose-limited projection is required but not supplied, route its
   creation to `cascade-personas:compile-persona`; do not reconstruct it here.
2. Preserve supported facts, assumptions, uncertainty, and source references.
   Never infer demographics, prevalence, expertise, or motives from a label.
3. When a validated `simulation-persona` profile exists, select only claims,
   tendencies, and state variables relevant to the simulation job and bind its
   profile reference and digest. Do not copy the whole profile into runtime.
4. Use `references/actor-prompt.md` to create the `persona` and `actor`
   sections.
5. Require concrete decision, abstention, and stop rules. The actor may adapt
   beliefs, declared dynamic state, and strategy during the run, but not its
   identity, evidence, constraints, or goal.

A synthetic actor is suitable for mechanics and hypothesis exploration only.
One run cannot validate or mutate its source persona.

Keep the user-facing answer concise. Output requirements specify information,
not extra headings. Preserve required schemas, evidence and permissions. Avoid
duplicate artifact prose, empty sections, unsolicited variants and extra files
unless needed for the requested delivery or an actual handoff.
