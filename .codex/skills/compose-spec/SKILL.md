---
name: compose-spec
description: Compose durable product and spec artifacts such as PRDs, personas, product specs, requirements, journeys, scenarios, transformed specs, and backlog-ready acceptance criteria with stable names, IDs, references, and traceability.
---

# Compose Spec

Use when validated research, approved product intent, source specs, tickets, or
business-analysis synthesis need to become durable product/spec docs with clear
artifact names, IDs, cross-references, and traceability.

This skill preserves the PRD, persona, journey, requirement, scenario, and
plan-ready spec structures as first-class artifacts. It composes the right set
of product/spec docs and reference rows; it does not run market research,
decide unsupported product intent, implement code, or repair tests.

## Source Order

1. Latest user request, approved source spec, ticket, synthesis packet, or
   market-validation finding.
2. Existing product/spec docs:
   - `docs/product/_index.md`
   - `docs/product/requirements.md`
   - `docs/product/journeys.md`
   - `docs/product/scenarios.md`
   - `docs/product/personas/`
   - `docs/specs/transformed/`
3. Current `synthesis-to-spec`, `ingest-spec`, `docs-impact-map`, and active
   work-lane outputs when present.
4. Related `docs/design/`, `docs/brand/`, `docs/backlog/_index.md`,
   `docs/glossary.md`, and current code or UI copy when needed to ground
   behavior.
5. `docs/structure.md` and `docs/patterns/workflow.md`, especially the shared
   Doc Routing Decision Matrix.

If source evidence is weak, missing, or research-heavy, route to
`market-validation`, `discover`, or `ingest-spec` before authoring.

## Scope

Use this skill for:

- PRDs and product specs;
- personas and persona index rows;
- durable requirements and acceptance criteria;
- journeys with carried state;
- product scenario rows for functional checks;
- transformed plan-ready spec packets;
- backlog-ready candidates with acceptance criteria;
- traceability between source, product docs, scenarios, functional evidence,
  and implementation planning.

Do not use this skill for brand positioning, design-system rules, raw source
preservation, competitor research, pain mining, economic modeling, code
implementation, or test autorepair.

## Checklist

1. Confirm the source is ready to author:
   - source identity is known;
   - facts are evidence-backed or explicitly user-provided;
   - assumptions are marked;
   - open questions are not silently converted into requirements.
2. Choose the smallest useful artifact set:
   - `templates/product-prd.md` when behavior spans multiple requirements,
     users, journeys, dependencies, non-goals, or validation criteria;
   - `templates/persona.md` when user roles, goals, constraints, permissions,
     content, design, or journeys change behavior;
   - `templates/product-spec.md` for compact product specs;
   - `templates/requirement-row.md` for `docs/product/requirements.md`;
   - `templates/journey.md` for `docs/product/journeys.md` or a journey doc;
   - `templates/scenario-row.md` for `docs/product/scenarios.md`;
   - `templates/transformed-spec.md` for `docs/specs/transformed/`.
3. Allocate names and IDs before writing. Check existing docs first and choose
   the next stable ID or path:
   - PRD or product spec path: `docs/product/<capability-slug>.md`;
   - persona file: `docs/product/personas/<persona-slug>.md`;
   - transformed spec path:
     `docs/specs/transformed/<source-or-capability-slug>.md`;
   - persona IDs: next `P-XXX` in `docs/product/personas/_index.md`;
   - requirement IDs: next `PR-XXX` in `docs/product/requirements.md`;
   - journey IDs: next `J-XXX` in `docs/product/journeys.md`;
   - scenario IDs: next `PS-XXX` in `docs/product/scenarios.md`.
4. Use kebab-case slugs from the strongest source identity: issue/request ID,
   source spec title, capability name, persona role, or market-validation lane.
   Do not use generic names such as `product-spec.md`, `new-feature.md`,
   `persona.md`, or `notes.md` for durable artifacts.
5. Compose artifacts in dependency order:
   - source identity and transformed spec;
   - personas;
   - PRD or compact product spec;
   - requirements;
   - journeys;
   - scenarios;
   - backlog candidates;
   - Doc Routing Decision Matrix rows.
6. Preserve traceability:
   `source -> artifact -> requirement/scenario IDs -> functional evidence -> work lane`.
7. Use exact IDs and paths in references. Do not reference placeholder IDs in
   final docs. If an ID cannot be allocated safely, mark the row `GAP` or
   `BLOCKED` and route to `docs-impact-map`.
8. Update indexes and row ledgers together:
   - persona files require `docs/product/personas/_index.md`;
   - PRDs should cite affected requirement, journey, and scenario IDs;
   - requirements should cite scenario IDs when known;
   - journeys should cite scenario IDs and carried state;
   - scenarios should cite source and functional evidence.
9. Use the Doc Routing Decision Matrix for every durable fact, gap, deferred
   item, blocked item, or explicit `NO_DOC_NEEDED` decision.
10. Run `docs-impact-map` when the authored fact may affect sibling product,
   design, brand, spec, backlog, glossary, or pattern docs.
11. Keep doc changes thin. Add the minimum durable artifact or row needed for
   future planning and validation.
12. Route implementation-ready behavior to `plan-change` and product-visible
   checks to `functional-qa`.

## Naming And Reference Rules

- Prefer existing artifact names and IDs when updating an existing concept.
- New IDs must be monotonic within their owner file and never reuse superseded
  IDs.
- Every authored artifact must name its source identity.
- Every authored requirement or scenario must include a functional evidence
  target or a clear blocker.
- Every persona must state behavior implications; otherwise it is probably not
  durable enough to store.
- Every PRD must list non-goals and dependencies across product, design, brand,
  spec, backlog, and glossary when relevant.
- References should use exact repo paths and stable IDs, not prose-only labels.
- If a source finding is too broad for one artifact, split it into several
  named artifacts rather than creating one omnibus spec.

## Write Targets

- PRDs or product specs: `docs/product/<slug>.md`
- Personas: `docs/product/personas/<slug>.md` and
  `docs/product/personas/_index.md`
- Requirements: `docs/product/requirements.md`
- Journeys: `docs/product/journeys.md` or `docs/product/<journey-slug>.md`
- Scenarios: `docs/product/scenarios.md`
- Transformed specs: `docs/specs/transformed/<slug>.md`
- Backlog candidates: `docs/backlog/_index.md`
- Product vocabulary: `docs/glossary.md`
- Impact reports: `docs/work/reports/` when requested, blocked, multi-turn, or
  decision-heavy.

## Templates

- `templates/product-prd.md`
- `templates/persona.md`
- `templates/product-spec.md`
- `templates/requirement-row.md`
- `templates/journey.md`
- `templates/scenario-row.md`
- `templates/transformed-spec.md`

## Output

- artifact type and source identity;
- product/spec docs created, updated, proposed, or intentionally unchanged;
- requirement, persona, journey, scenario, transformed-spec, or backlog IDs;
- assumptions, non-goals, open questions, and gaps;
- Doc Routing Decision Matrix rows;
- next route: `docs-impact-map`, `synthesis-to-spec`, `plan-change`,
  `functional-qa`, `ingest-spec`, `market-validation`, or `closeout`.
