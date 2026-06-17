---
name: market-validation
description: Use for broad market validation or long business-analysis discovery with research lanes for market universe, assumptions, competitors, pain, economics, geography, constraints, experiments, scoring, synthesis, and doc routing.
---

# Market Validation

Use when a product idea, market, segment, opportunity, or broad feature request
needs evidence-backed business analysis before product planning or
implementation.

This is the main workflow router for the `business-analyst` role. It frames the
research universe, creates scoped lanes through `orchestrate-work`, gathers
evidence with focused skills, and routes validated findings to
`docs-impact-map`, `ingest-spec`, `synthesis-to-spec`, and closeout.

## Source Order

1. Latest user brief, target market, product idea, explicit constraints, and
   requested geography or segment.
2. Existing `docs/product/`, `docs/specs/`, `docs/design/`, `docs/brand/`,
   `docs/backlog/_index.md`, `docs/glossary.md`, active work lanes under
   `docs/work/lanes/`, and work reports.
3. Current code, UI copy, public contracts, analytics, support workflows, and
   tests when the market question is tied to an existing product.
4. Prior lane reports under `docs/work/reports/` and current
   `docs-impact-map` findings.
5. Live external sources when facts can change, including competitor sites,
   pricing pages, public reviews, forums, app stores, communities, public
   filings, regulation pages, and geography-specific sources.
6. `docs/structure.md` and `docs/patterns/workflow.md`, especially the shared
   Doc Routing Decision Matrix.

## Scope

Use this skill for:

- broad market validation;
- long business-analysis discovery loops;
- market universe framing and assumptions;
- competitor, substitute, and infrastructure mapping;
- user pain mining from real evidence;
- economics, willingness-to-pay, pricing, and velocity assumptions;
- geography, segment, channel, and operational fit;
- regulatory or operational constraints when relevant;
- ranked hypotheses and validation experiments;
- synthesis into PRD, requirement, scenario, transformed spec, or backlog
  handoff.

Do not use this skill for ordinary implementation planning when product intent
is already clear. Do not implement code or repair tests from this skill.

## Workflow

1. Frame the market universe:
   - problem space;
   - target and excluded users;
   - geography and segment assumptions;
   - direct, substitute, and infrastructure categories;
   - source freshness requirements;
   - non-goals and stop conditions.
2. Create research lanes with `orchestrate-work`. Each lane must name:
   - source inputs;
   - evidence standard;
   - owner or execution mode;
   - required template;
   - synthesis output;
   - blocked or follow-up route.
3. For each problem, requirement, or gap, run several trajectory passes per
   `docs/patterns/workflow.md#trajectory-coverage`; trajectories may vary by
   segment, persona, geography, competitor category, pain source, economics,
   constraint, experiment, or implementation route, but every trajectory must
   cover a real problem, requirement, or gap.
4. Use focused lane skills:
   - `competitive-map` for competitor and substitute mapping;
   - `pain-mining` for real user pain;
   - `market-economics` for pricing, willingness-to-pay, velocity, and
     economic assumptions;
   - `validation-experiments` for experiments and kill criteria;
   - `hypothesis-scoring` for ranked clusters;
   - `adversarial-critic` for stress testing and missing evidence.
5. Add geography, segment, regulatory, operational, integration, or support
   constraint lanes when those factors can change feasibility.
6. Run complementary passes when a finding may imply adjacent workflows,
   personas, product features, design constraints, brand positioning, public
   contracts, or follow-up research.
7. Synthesize trajectories losslessly before routing findings: preserve major
   and minor inspected details, edge cases, contradictions, rejected paths,
   open questions, and follow-up gaps from every trajectory.
8. Run `docs-impact-map` before changing durable product, design, brand, spec,
   backlog, glossary, or pattern docs.
9. Use `ingest-spec` for raw or mixed source packets that need normalization.
10. Use `synthesis-to-spec` to synthesize validated findings, then
   `compose-spec` to produce PRDs, personas, requirements,
   scenarios, journeys, backlog candidates, and plan-ready specs.
11. Close with Doc Routing Decision Matrix rows and a next route.

## Evidence Standards

- Separate observed facts, user-provided facts, assumptions, inference, and
  open questions.
- Cite source identity, URL or path, date accessed or source date, and
  confidence for research-derived claims.
- Treat unsourced or weak signals as assumptions, gaps, or experiments, not
  product requirements.
- Mark stale or conflicting sources explicitly.
- For live research, prefer primary sources and current pages for competitors,
  pricing, regulation, geography, and public claims.
- Record why each lane is complete enough, blocked, or deferred.

## Lane Matrix

| Lane | Purpose | Skill | Evidence Standard | Template | Status |
|---|---|---|---|---|---|
| Market frame | Universe, scope, assumptions | `market-validation` | source map plus assumptions | `templates/market-validation-report.md` | `<status>` |
| Competitors | direct, substitute, infra | `competitive-map` | current sourced map | `templates/competitive-map.md` | `<status>` |
| Pain | real user pain | `pain-mining` | sourced pain quotes or summaries | `templates/pain-mining-report.md` | `<status>` |
| Economics | pricing, WTP, velocity | `market-economics` | model with assumptions | `templates/economics-model.md` | `<status>` |
| Geography | segment and location fit | `market-validation` | sourced segment logic | `templates/market-validation-report.md` | `<status>` |
| Constraints | regulatory or operational | `market-validation` | sourced constraints | `templates/market-validation-report.md` | `<status>` |
| Experiments | proof and kill tests | `validation-experiments` | measurable test plan | `templates/validation-experiment-plan.md` | `<status>` |
| Score | rank hypotheses | `hypothesis-scoring` | scored evidence quality | `templates/hypothesis-scorecard.md` | `<status>` |
| Critic | stress test | `adversarial-critic` | objections and gaps | `templates/critic-report.md` | `<status>` |
| Synthesis | PRD/spec/backlog | `synthesis-to-spec` -> `compose-spec` | routed facts | `templates/spec-synthesis-packet.md` | `<status>` |

## Templates

- `templates/market-validation-report.md`

## Output

- market universe and assumptions;
- research lane plan and lane evidence;
- source map and confidence notes;
- ranked hypotheses;
- validation experiments;
- adversarial gaps and follow-ups;
- synthesis route to `docs-impact-map`, `ingest-spec`, `synthesis-to-spec`,
  `compose-spec`, `plan-change`, `functional-qa`, or `closeout`;
- Doc Routing Decision Matrix rows.
