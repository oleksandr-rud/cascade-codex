---
name: market-economics
description: Use during business-analysis or market-validation lanes to analyze willingness-to-pay, pricing, unit economics, velocity, acquisition assumptions, and feasibility.
---

# Market Economics

Use when a market-validation lane needs economic reasoning: pricing,
willingness-to-pay, unit economics, sales or adoption velocity, rough
acquisition assumptions, margin constraints, or feasibility.

This skill creates an assumption-backed model. It does not claim financial
certainty or replace implementation planning.

## Source Order

1. Latest market-validation frame, segment, geography, buyer, and pain
   clusters.
2. Existing product/spec/backlog docs and prior economics reports.
3. Competitor pricing, public buyer evidence, reviews, procurement notes,
   public filings, pricing calculators, market reports, and provided customer
   data.
4. Current product costs, runtime costs, support load, operations, sales motion,
   or implementation constraints when available.
5. `docs/patterns/workflow.md` for the Doc Routing Decision Matrix.

Use live research for pricing, public market, competitor, geography, and
regulatory facts that can change.

## Checklist

1. Define buyer, user, purchase trigger, budget owner, and value metric.
2. Estimate willingness-to-pay from observed evidence, comparable pricing, or
   explicit customer data.
3. Model unit economics assumptions:
   - delivery cost;
   - support or operations load;
   - gross margin pressure;
   - onboarding cost;
   - usage or infrastructure cost;
   - sales or channel cost.
4. Estimate velocity:
   - time to value;
   - buying cycle;
   - trial or pilot path;
   - conversion blockers;
   - renewal or repeat-use signal.
5. Mark assumptions, confidence, sensitivity, and missing evidence.
6. Route weak economics to `validation-experiments` or
   `hypothesis-scoring`.
7. Record Doc Routing Decision Matrix rows when durable facts, blockers, or
   follow-ups are produced.

## Templates

- `templates/economics-model.md`

## Output

- buyer and value metric;
- pricing and willingness-to-pay assumptions;
- unit economics model;
- velocity and acquisition assumptions;
- sensitivity and evidence gaps;
- score and experiment routes;
- Doc Routing Decision Matrix rows.
