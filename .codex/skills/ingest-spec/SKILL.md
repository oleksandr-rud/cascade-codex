---
name: ingest-spec
description: Use when incoming product, design, implementation, testing, screenshot, ticket, or research material must be classified and normalized into specs, behavior examples, acceptance checks, or plan-ready packets.
---

# Ingest Spec

Use when the user provides specs, tickets, design notes, screenshots, docs, or
research that should be normalized into the harness documentation structure.

This skill prepares work for `plan-change` and `functional-qa`. It does not
patch product/runtime code.

## Source Order

1. Latest user-provided spec material.
2. Current codebase vocabulary, source files, public APIs, UI copy, tests, and
   `docs/glossary.md`.
3. Existing product/design/brand/spec/work docs.
4. Existing behavior examples and scenario ledgers.
5. `harness.config.yaml` paths when available.
6. `docs/structure.md` for write targets.
7. `docs/patterns/workflow.md` for the shared Doc Routing Decision Matrix.

## Classification

Classify incoming material as one or more:

- product intent;
- design interaction or visual constraint;
- implementation constraint;
- architecture or boundary constraint;
- stack, runtime, config, command, or runner fact;
- acceptance criterion;
- functional test scenario;
- backlog candidate;
- codebase vocabulary;
- runtime invariant;
- retrieval/source-context constraint;
- durable pattern;
- open question.

## Transformation Checklist

1. Preserve explicit user constraints and source links.
2. Replace vague language with codebase-specific terms after inspecting source.
3. For each source problem, requirement, or gap, run several trajectory passes
   per `docs/patterns/workflow.md#trajectory-coverage`; every trajectory must
   cover a real problem, requirement, or gap, and the spec packet must
   synthesize trajectories losslessly without omitting major or minor inspected
   details.
4. Extract behavior examples in plain language or Given/When/Then form.
5. Separate visible outcomes from implementation constraints.
6. Identify functional acceptance checks and likely automated test layer.
7. Identify open questions and ask only blockers.
8. Write or update the smallest relevant docs using these exact targets:
   - `docs/specs/source/` for provided or imported source docs saved mostly
     as-is when a preserved copy is useful; add only compact metadata such as
     category, task or issue type, preservation mode, routing target, and
     planning status;
   - `docs/specs/{slice-slug}/` for normalized plan-ready packets;
   - `docs/product/` for product intent, requirements, journeys, personas, and
     scenarios;
   - `docs/design/` for interaction, accessibility, tokens, components, and
     design constraints;
   - `docs/brand/` for naming, tone, content, and visual direction;
   - `docs/work/active.md` or `docs/work/lanes/` for active execution state;
   - `docs/backlog/_index.md` for real follow-up work with acceptance
     criteria;
   - `docs/glossary.md` for reusable codebase terms;
   - `docs/patterns/boundaries.md` for reusable architecture and boundary
     rules;
   - `harness.config.yaml` for stack, source/test roots, commands, runners,
     tracker settings, and memory paths;
   - `.codex/skills/`, `.codex/agents/`, or `docs/patterns/` only for
     repeated workflow or architecture rules.
9. Record Doc Routing Decision Matrix rows for durable facts, explicit
   `NO_DOC_NEEDED` decisions, gaps, and deferred owner updates.
10. Hand off to `discover` when source material lacks enough product/design
   context. Hand off to `market-validation` when product facts require long
   business-analysis research before synthesis. Hand off to
   `synthesis-to-spec` when product facts need PRD, persona, requirement,
   journey, scenario, non-goal, success-metric, spec-packet, or backlog
   synthesis. Hand off to `compose-spec` when source material is
   ready to become PRDs, personas, requirements, journeys, scenarios,
   spec packets, or backlog-ready acceptance criteria. Hand off to
   `brand-positioning` when brand, naming, tone, content, message hierarchy, or
   visual direction needs durable structure.
   Hand off to `design-system` when design tokens, components, accessibility,
   layout, responsive behavior, interaction states, or visual evidence need
   durable structure. Hand off to `docs-impact-map` when normalized facts may
   affect sibling product/design/brand/spec/backlog/glossary/pattern docs.
   Otherwise hand off to `plan-change` with behavior examples and validation
   plan.

## Required Packet Shape

Use `templates/source-packet.md` only for preserved source material under
`docs/specs/source/`. Use `templates/spec-packet.md` for normalized specs. Use
`templates/scenario-row.md` for durable scenario rows. Each packet must expose:

- source identity and preservation decision;
- category, task or issue type, preservation mode, routing target, and planning
  status when saving preserved source material;
- classification by write target;
- behavior examples;
- functional acceptance checks;
- likely codebase terms and source areas;
- non-goals and open questions;
- next workflow gate.

Do not store these packets in `AGENTS.md`.

## Templates

- `templates/spec-packet.md`
- `templates/source-packet.md`
- `templates/scenario-row.md`

## Output

- source material classified;
- source packets preserved when needed;
- doc routing decisions;
- spec packets written or proposed;
- behavior examples;
- acceptance checks;
- open questions;
- next workflow step.
