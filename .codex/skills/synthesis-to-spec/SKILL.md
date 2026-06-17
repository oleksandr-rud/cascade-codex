---
name: synthesis-to-spec
description: Use after validated business-analysis, market-validation, research, experiment, or source findings to synthesize plan-ready inputs for compose-spec, planning, functional validation, and doc routing.
---

# Synthesis To Spec

Use when validated market research, business analysis, experiment evidence,
source-context packets, or source packets need to become plan-ready inputs for
`compose-spec`, planning, validation, and doc routing.

This skill is the evidence-backed business-analysis handoff before product/spec
authoring. It chooses what should become durable product/spec docs and routes
authoring to `compose-spec`. It does not implement code.

## Source Order

1. Latest market-validation report, lane outputs, scorecard, critic report, and
   validation experiment evidence.
2. User brief, source spec, ticket, or incoming research packet.
3. Existing `docs/product/_index.md`, `docs/product/requirements.md`,
   `docs/product/journeys.md`, `docs/product/scenarios.md`,
   `docs/product/personas/`, `docs/specs/`, `docs/design/`, `docs/brand/`,
   `docs/backlog/_index.md`, and `docs/glossary.md`.
4. Current code, UI copy, public contracts, tests, analytics, or support
   workflows when the spec affects an existing system.
5. Current `docs-impact-map` report.
6. `docs/structure.md` and `docs/patterns/workflow.md`, especially the shared
   Doc Routing Decision Matrix.

## Scope

Use this skill for:

- PRD or product spec synthesis from validated findings;
- durable requirements and acceptance criteria;
- product scenarios and journeys;
- personas when roles, goals, constraints, permissions, content, or design
  implications affect behavior;
- backlog candidates with acceptance criteria;
- transformed plan-ready specs;
- evidence-to-doc traceability;
- source-context trajectory analysis before durable promotion;
- explicit no-doc-needed decisions for weak or non-durable findings.

Do not use this skill for raw research gathering, competitor mapping, pain
mining, brand positioning, design-system rules, code implementation, or test
repair.

## Checklist

1. Confirm the source packet is ready:
   - enough evidence exists;
   - critical assumptions are marked;
   - critic blockers are resolved or explicitly accepted;
   - weak findings are not promoted to requirements.
2. For each problem, requirement, or gap, run several trajectory passes per
   `docs/patterns/workflow.md#trajectory-coverage`; every trajectory must cover
   a real problem, requirement, or gap, and the final PRD/spec/backlog synthesis
   must preserve major and minor inspected details from every trajectory.
3. Run the docs/spec source-context trajectories before durable promotion:
   - source identity and freshness;
   - entity mapping for requirement, scenario, persona, journey, decision,
     code artifact, work lane, or evidence node;
   - relationships such as `DERIVED_FROM`, `IMPLEMENTS`, `VALIDATED_BY`,
     `CONFLICTS_WITH`, `SUPERSEDES`, `DEPENDS_ON`, `AFFECTS`, and `ROUTES_TO`;
   - evidence maturity: observed, user-provided, inferred, weak, validated, or
     blocked;
   - current/superseded status;
   - contradiction owner and resolution route;
   - acceptance behavior and implementation bridge.
4. Choose the smallest owner target:
   - `compose-spec` for PRDs, personas, compact product specs,
     requirement rows, journey rows, scenario rows, transformed specs, and
     backlog-ready acceptance criteria;
   - existing domain-owned product folders when the target repo already uses
     them for the affected capability;
   - `docs/product/requirements.md` for stable requirement rows;
   - `docs/product/scenarios.md` for functional behavior examples;
   - `docs/product/journeys.md` when state carries across steps;
   - `docs/product/personas/` when roles change behavior;
   - `docs/specs/transformed/` for normalized plan-ready source packets;
   - `docs/backlog/_index.md` for follow-up work with acceptance criteria.
5. Preserve traceability:
   `source -> finding -> requirement or scenario -> functional check -> work lane`.
6. Preserve the target repo's current catalog shape: use domain-specific specs,
   scenario files, or journey files only when already defined by the repo's
   product docs or `docs/structure.md`; otherwise use the flat required ledgers.
7. Use `docs-impact-map` before writing when the fact may affect sibling
   product, design, brand, spec, backlog, glossary, or pattern docs.
8. Write only thin sourced deltas. Do not create broad product essays or dump
   all research into product docs.
9. Use `ingest-spec` when incoming material needs normalization before
   synthesis.
10. Route product/spec document production to `compose-spec`.
11. Route implementation-ready behavior to `plan-change` and product-visible
   acceptance to `functional-qa`.
12. Record Doc Routing Decision Matrix rows for every durable fact, gap,
   deferred item, blocked fact, and explicit `NO_DOC_NEEDED` decision.

## Templates

- `templates/spec-synthesis-packet.md`

## Output

- synthesis source identity and evidence status;
- source-context trajectory status and contradiction handling;
- PRD, requirement, scenario, journey, persona, transformed spec, or backlog
  docs to author, update, propose, or intentionally leave unchanged;
- doc routing decisions;
- assumptions, non-goals, and open questions;
- scenario IDs, requirement IDs, journey IDs, or backlog entries affected;
- next route: `compose-spec`, `docs-impact-map`, `ingest-spec`,
  `plan-change`, `functional-qa`, or `closeout`.
