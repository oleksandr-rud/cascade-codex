---
name: product-discovery
description: Create or update product discovery artifacts such as PRDs, personas, user jobs, requirements, journeys, scenarios, non-goals, success metrics, and acceptance criteria when product intent is missing or changing.
---

# Product Discovery

Use when a feature idea, source spec, ticket, user brief, or planning blocker
needs durable product intent before implementation can be safely scoped.

This skill deepens `discover` for product-specific artifacts. It does not patch
product/runtime code and does not replace `plan-change`.

## Source Order

1. Latest user brief, source spec, ticket, research note, screenshot, or design
   note.
2. Existing product docs:
   - `docs/product/_index.md`
   - `docs/product/requirements.md`
   - `docs/product/journeys.md`
   - `docs/product/scenarios.md`
   - `docs/product/personas/`
3. Related `docs/specs/`, `docs/design/`, `docs/brand/`, `docs/backlog/`, and
   current `docs-impact-map` reports.
4. Current code, UI copy, public contracts, tests, analytics events, or support
   workflows when available and relevant.
5. `docs/glossary.md`, `docs/structure.md`, and active work state under
   `docs/work/`.

Separate observed facts, user-provided facts, assumptions, and open questions.
Ask only blocker questions after inspecting available sources.

## Scope

Use this skill for:

- PRD or product-spec creation, update, or validation;
- persona, role, user-job, or constraint documentation;
- product requirements, acceptance criteria, non-goals, and success metrics;
- journeys where state carries across steps;
- durable scenario rows that should guide `functional-qa`;
- product gaps discovered during planning, validation, or closeout.

Do not use this skill for brand positioning, design-system rules, architecture
boundaries, code implementation, or tracker-only issue bodies unless product
intent is the blocker.

## Checklist

1. Classify the request:
   - new product capability;
   - change to existing behavior;
   - unclear persona or target user;
   - missing journey or scenario;
   - acceptance criteria gap;
   - non-goal or scope boundary;
   - success metric or evidence gap.
2. Choose the smallest durable artifact:
   - one PRD when behavior spans multiple requirements or user paths;
   - one persona file or index row when user roles change behavior;
   - requirement rows when the fact is stable and compact;
   - scenario rows when functional checks need traceable examples;
   - journey doc when state carries across steps.
3. For PRDs, capture:
   - problem and user pain;
   - target users or personas;
   - intended outcome and success signal;
   - user stories or jobs;
   - requirements and acceptance criteria;
   - non-goals;
   - dependencies on brand, design, specs, backlog, or glossary;
   - functional test strategy.
4. For personas, capture:
   - role, source, job, constraints, expertise, frequency, environment;
   - behavior implications;
   - content/design implications;
   - scenario and journey links.
5. Convert ambiguous asks into behavior examples only when the source supports
   them. Mark weak assumptions instead of inventing product facts.
6. Preserve traceability:
   `source -> product artifact -> scenario IDs -> functional evidence -> work lane`.
7. Use `docs-impact-map` after creating or changing product docs when sibling
   brand, design, spec, backlog, glossary, or pattern docs may be affected.
8. Route plan-ready work to `plan-change`; route acceptance evidence to
   `functional-qa`; route large missing context back to `discover`.

## Write Targets

- PRDs or product specs: `docs/product/<slug>.md`
- Durable requirements: `docs/product/requirements.md`
- Personas: `docs/product/personas/<slug>.md` plus
  `docs/product/personas/_index.md`
- Journeys: `docs/product/journeys.md` or `docs/product/<journey-slug>.md`
- Scenarios: `docs/product/scenarios.md`
- Product follow-up work: `docs/backlog/_index.md`
- Product vocabulary: `docs/glossary.md`
- Cross-folder impact reports: `docs/work/reports/`

## Templates

- `templates/product-prd.md`
- `templates/persona.md`

## Output

- artifact type and source identity;
- observed facts, assumptions, open questions, and non-goals;
- product docs created, updated, proposed, or intentionally unchanged;
- scenario IDs, requirement IDs, or journey IDs affected;
- impact-map status;
- next route: `docs-impact-map`, `plan-change`, `functional-qa`, `discover`,
  or `ingest-spec`.
