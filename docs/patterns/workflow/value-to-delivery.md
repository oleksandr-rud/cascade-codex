# Value decisions through feature delivery

Cascade Product and Cascade Marketing integrate the Desire to Value v0.5.0
methods into existing plugin ownership. Marketing keeps the internal ID
cascade-market for compatibility. Agent roles remain unchanged.

| Original method | Canonical owner |
|---|---|
| desire-to-value-strategist | cascade-product:manage-product-lifecycle |
| market-opportunity-researcher | cascade-market:research-market |
| contrarian-wedge-planner | cascade-market:evaluate-market-opportunity; expression in brand-positioning |
| product-value-modeler | cascade-product:define-product, references/value-model.md |
| feature-value-analyst | cascade-product:define-product, references/feature-investment.md |
| value-capture-and-offer-designer | cascade-product:define-product, references/value-model.md |
| outcome-progress-evaluator | cascade-product:validate-product |
| portfolio-learning-operator | cascade-product:manage-product-lifecycle |
| growth-channel-strategist | cascade-market:plan-growth, references/channels.md |
| value-growth-planner | cascade-market:plan-growth, references/value-growth.md |
| value-experience-designer | cascade-design:ux-flow-review |
| agentic-value-modeler | cascade-ai-architect:design-agent-blueprint |

Source: desire-to-value-v0.5.0.zip, SHA-256
209924f999b928f84c7674827227dd64d500e3402c328fd1bad9a312d57d7248.
The adaptation incorporates the reviewed v0.5.0 methods. The original archive
is retained outside runtime packages. The earlier personal cascade-product
and cascade-marketing exports are superseded by the repository packages and
should not remain enabled beside them. Runtime has no dependency on the old
desire-to-value namespace or on the older Python harness export.

## Flow and ownership

Market evidence and an entry hypothesis inform Product's value model. Product
forms feature candidates, compares smaller alternatives and records outcomes,
offers, non-goals, evidence, costs and uncertainties. Growth contributes
hypotheses about audience, promise, activation, completion/return, payment,
distribution and economics.

Existing typed Product sections hold value/offer models and feature rationale.
Accepted requirements retain stable IDs, source evidence and acceptance behavior.
Unresolved proposals remain distinct from approved scope. The new
growth-strategy artifact binds its sources, bounded next test, economics and
product-feedback owners; readiness never grants execution.

Host plan-change consumes the accepted requirement, outcome, proof and delivery
boundary. Project Management coordinates actual dependencies. Implementation
preserves accepted behavior and relevant measurement. Functional success does
not establish efficacy or demand. Design and AI Architect contribute only when
their specialist uncertainty matters; QA and Evals retain their evidence roles.

Observed outcomes and growth failures return to Product lifecycle, which reopens
the earliest challenged decision and marks affected consumers provisional.
Ordinary fixes reuse accepted requirements without restarting market research.
The capability catalog declares growth feedback as an optional Product input;
the workflow planner selects it only when relevant and checks its availability
and order. Pre-product growth planning can omit a product contract.
For example, weak activation can motivate clearer expectations, a simpler first
action, a changed offer or a feature; evidence must diagnose the failed link.

## Verification

Check plugin structure, references, unique artifact ownership, catalog routing,
growth schema/cross-field rules and the growth-to-Product plan. Cover finite
jobs, unknown economics and product feedback with bounded scenarios. Avoid
wording tests for each paragraph. Deterministic eligibility and live semantic
or market evidence remain separate.
