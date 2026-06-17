---
name: competitive-map
description: Use during market validation to map direct, substitute, infrastructure, and workflow competitors with positioning, pricing, gaps, evidence quality, and business-analysis implications.
---

# Competitive Map

Use when market validation, product strategy, or business analysis needs a
current map of competitors, substitutes, infrastructure providers, adjacent
workflow tools, and gaps.

This skill identifies what users can choose instead of the proposed product. It
does not decide implementation scope by itself.

## Source Order

1. Latest market-validation frame, target segment, geography, and assumptions.
2. Existing product/spec/brand docs, backlog notes, and prior competitor
   reports.
3. Competitor websites, docs, pricing pages, changelogs, public reviews,
   marketplaces, analyst summaries, and public filings when available.
4. Current code, UI, integrations, and public contracts when an existing
   product surface is being compared.
5. `docs/patterns/workflow.md` for the Doc Routing Decision Matrix.

Use live research for current competitors, pricing, positioning, geography,
availability, and public claims.

## Checklist

1. Define competitor categories:
   - direct;
   - substitute;
   - infrastructure;
   - agency or manual service;
   - internal workflow or do-nothing option.
2. Identify target user, buyer, geography, pricing model, core workflow, and
   positioning for each competitor.
3. Record strengths, gaps, switching costs, integrations, distribution, and
   proof points.
4. Separate verified claims from inferred positioning.
5. Mark evidence freshness and confidence.
6. Identify product implications and protected adjacent behavior.
7. Route gaps to `pain-mining`, `market-economics`,
   `validation-experiments`, `hypothesis-scoring`, `docs-impact-map`, or
   `synthesis-to-spec`.
8. Record Doc Routing Decision Matrix rows when durable facts or gaps are
   produced.

## Templates

- `templates/competitive-map.md`

## Output

- competitor categories and source map;
- positioning, pricing, workflow, and geography comparison;
- gaps, risks, and opportunities;
- evidence quality;
- routes to scoring, experiments, or spec synthesis;
- Doc Routing Decision Matrix rows.
