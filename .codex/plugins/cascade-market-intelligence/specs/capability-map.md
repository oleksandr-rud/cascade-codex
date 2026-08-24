# Cascade Market Intelligence capability map

Version: 0.1.23+codex.20260824010051

This plugin extracts the evidence-producing capabilities of the repository
Business Analyst and its research skills into three standalone workflows.
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

The former Business Analyst role remains useful inside the repository. This plugin is the portable capability package.
