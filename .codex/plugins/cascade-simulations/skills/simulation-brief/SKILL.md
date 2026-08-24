---
name: simulation-brief
description: Compile a grounded domain and feature brief for a goal-directed simulation. Use when an actor needs the current product or workflow context, terminology, business rules, starting state, meaningful job-to-be-done, and non-goals without receiving a click-by-click script.
---

# Simulation Brief

Provide enough context for the actor to work naturally while preserving the
environment as the source of current state.

## Workflow

1. Prefer current product code, specs, supplied records, and direct user intent.
   Give every used source its exact locator, authority class, revision, and
   SHA-256 snapshot digest so the frozen claim basis can be re-identified.
2. Separate durable domain rules from run-specific starting state.
3. State one meaningful job-to-be-done. Do not encode the expected UI sequence.
4. Use `references/brief-prompt.md` to produce the `brief` section.
5. Retain source references beside each material context claim and rule. Mark
   absent or conflicting authority explicitly rather than filling it from model
   memory.

The brief gives context, not action permission and not proof that the feature
works.
