# {{Product unit name}}

Use an actual contour, module, feature, model or other established product
unit. Remove instructions and unused sections. Do not create all variants.

## Scope And Ownership

{{Accepted unit type/name, owner, status, stable catalog IDs and parent links;
if no IDs exist yet, use the host's convention without inventing external IDs}}

## Outcome And Behavior

{{Actors, useful outcomes, current/target behavior, accepted rules, constraints,
non-goals and visible/durable results; distinguish decisions from proposals}}

## Structure And Relationships

{{Owned features or models, boundaries and dependencies; link shared sources
and adjacent units, with one owner for each fact}}

## Requirements And Acceptance

{{Exact requirement/scenario IDs, observable behavior and sources/evidence.
If separate ledgers are needed, declare their paths in reference_documents;
reuse matching table columns from existing owners. Never duplicate rows.}}

Conditional owner table; use existing IDs, never prefilled example rows.

| ID | Source | Requirement | Acceptance Criterion | Scenario IDs | Status |
|---|---|---|---|---|---|

## Journeys And Models

Conditional: {{Reachable actor journeys, states, data/value models and their
exact authoritative references; no placeholder hierarchy or example solution}}

| ID | Persona | Type | Covers Scenario IDs | Functional Evidence | Status |
|---|---|---|---|---|---|

For a material journey, describe actor/trigger, action, response/durable state,
visible outcome and recovery in prose or a step table, linked by its existing ID.

## Scenarios

Conditional: observable source-bound acceptance; proposed checks remain NOT_RUN.

| ID | Source | User Goal | Given | When | Then | Functional Evidence |
|---|---|---|---|---|---|---|

These three owner tables may share this document: declare the same path under
each applicable reference_documents kind. Split them only when separate owners
or consumption need it. Remove empty tables and omit their catalog selection.

## Evidence And Open Decisions

{{Source/version/freshness, approval, inspected versus executed evidence,
confidence/uncertainty, gaps, accountable owner and next decision}}

## Linked Specifications

{{Only durable specs that implement this unit's accepted behavior; execution
status and check results stay in the numbered Work task}}
