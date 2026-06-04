---
name: ingest-spec
description: Ingest incoming product, design, implementation, or testing specs into the Cascade Codex docs structure, behavior examples, acceptance checks, and plan-ready packets.
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
3. Extract behavior examples in plain language or Given/When/Then form.
4. Separate visible outcomes from implementation constraints.
5. Identify functional acceptance checks and likely automated test layer.
6. Identify open questions and ask only blockers.
7. Write or update the smallest relevant docs using these exact targets:
   - `docs/specs/incoming/` for raw imported specs only when a preserved copy
     is useful;
   - `docs/specs/transformed/` for normalized plan-ready packets;
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
8. Hand off to `discover` when source material lacks enough product/design
   context, otherwise hand off to `plan-change` with behavior examples and
   validation plan.

## Required Packet Shape

Use `templates/transformed-spec.md` for normalized specs. Use
`templates/scenario-row.md` for durable scenario rows. Each packet must expose:

- source identity and preservation decision;
- classification by write target;
- behavior examples;
- functional acceptance checks;
- likely codebase terms and source areas;
- non-goals and open questions;
- next workflow gate.

Do not store these packets in `AGENTS.md`.

## Templates

- `templates/transformed-spec.md`
- `templates/scenario-row.md`

## Output

- source material classified;
- transformed docs written or proposed;
- behavior examples;
- acceptance checks;
- open questions;
- next workflow step.
