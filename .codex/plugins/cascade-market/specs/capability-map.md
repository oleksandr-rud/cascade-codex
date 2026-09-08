# Cascade Market capability map

Version: 0.2.0+codex.20260908123549

This plugin consolidates the former repository Business Analyst, market
research skills, and Marketing positioning skill into four standalone
workflows.
`specs/extraction-manifest.json` freezes the source repository, revision, clean
listed paths, SHA-256 digests, and capability assignments. Development sources
remain provenance rather than runtime dependencies.

| Extracted capability | Development source | Plugin owner | Boundary |
| --- | --- | --- | --- |
| Market universe, source standards, lanes, evidence grading, contradictions | .codex/agents/business-analyst/AGENT.md, .codex/skills/market-validation | research-market | Does not make product requirements |
| Real user pain and workarounds | .codex/skills/pain-mining | research-market | Synthetic personas are not pain evidence |
| Competitor types, positioning, pricing, substitutes, and gaps | .codex/skills/competitive-map | research-market | Uses current attributable sources |
| Willingness to pay, pricing, unit economics, velocity, and acquisition assumptions | .codex/skills/market-economics | research-market and evaluate-market-opportunity | Assumptions remain typed and sensitivity-tested |
| Hypothesis scoring and adversarial criticism | .codex/skills/hypothesis-scoring, .codex/skills/adversarial-critic | evaluate-market-opportunity | Scores organize decisions but do not prove truth |
| Interviews, landing tests, pilots, smoke tests, and kill criteria | .codex/skills/validation-experiments | design-market-experiments | External execution requires explicit authority |
| Evidence synthesis into product inputs | .codex/skills/synthesis-to-spec, .codex/skills/compose-spec | Product handoff | Cascade Product owns durable product decisions |
| Positioning, messaging, naming, tone, proof, trust language, and downstream brand direction | former `.codex/skills/brand-positioning` and Cascade Marketing source | brand-positioning | Uses accepted evidence; Product and Design retain their own decisions |

The former Business Analyst role and host market/marketing method skills are
retired. Host skills may resolve these plugin routes but do not copy their
methods.

## Value and growth methods

Market selection adds comparable jobs, entrant reachability and evidence coverage.
Opportunity assessment adds falsifiable entry strategies matched to the business
objective. plan-growth owns channel choice, acquisition-to-outcome continuity,
cohort economics and product feedback through growth-strategy.schema.json.
These methods adapt Desire to Value v0.5.0; the aggregate plugin is not a dependency.
