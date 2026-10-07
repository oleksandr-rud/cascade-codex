# Value decisions through feature delivery

The Product and Market components of Cascade Discovery integrate the Desire to
Value v0.5.0 methods. Their method ownership remains distinct inside one public
plugin package; agent roles remain unchanged.

| Original method | Canonical owner |
|---|---|
| desire-to-value-strategist | cascade-discovery:manage-product-lifecycle |
| market-opportunity-researcher | cascade-discovery:research-market |
| contrarian-wedge-planner | cascade-discovery:evaluate-market-opportunity; expression in brand-positioning |
| product-value-modeler | cascade-discovery:define-product, references/value-model.md |
| feature-value-analyst | cascade-discovery:define-product, references/feature-investment.md |
| value-capture-and-offer-designer | cascade-discovery:define-product, references/value-model.md |
| outcome-progress-evaluator | cascade-discovery:validate-product |
| portfolio-learning-operator | cascade-discovery:manage-product-lifecycle |
| growth-channel-strategist | cascade-discovery:plan-growth, references/channels.md |
| value-growth-planner | cascade-discovery:plan-growth, references/value-growth.md |
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
For product and marketing UI, Cascade Design owns the
[outcome UI standard](../../../.codex/plugins/cascade-design/skills/design-system/references/outcome-ui-standard.md).
The shared [Generative UI practice](../../../.codex/plugins/cascade-design/skills/design-system/references/generative-ui.md)
guides structured choices, summaries and results in existing Product, Marketing,
Design, AI/Software Architect and implementation handoffs. Its component and
data/state decisions are part of UI design; the optional example creates no
separate backend task or additional agent role.
Product binds outcomes to visible behavior, Marketing binds promise and proof
to a matching action, and the host implements the governing design. The default
is informative, minimal, modern and liquid, with accessibility, truthful state
and actual response performance retained. Accepted target designs govern their scope.
The capability catalog declares growth feedback as an optional Product input;
the workflow planner selects it only when relevant and checks its availability
and order. Pre-product growth planning can omit a product contract.
For example, weak activation can motivate clearer expectations, a simpler first
action, a changed offer or a feature; evidence must diagnose the failed link.

## Development cycles and entry conditions

Select the smallest applicable cycle from the requested outcome and current
evidence. Interpret that meaning with the LLM; these examples are routing
guidance, never keyword rules. A plugin is a method owner, not a mandatory
phase, agent or separate workstream.

| Entry condition | Existing owners and sequence | Result and feedback |
| --- | --- | --- |
| A problem or market is open and current external evidence is missing | Market `research-market`, then `evaluate-market-opportunity` only when comparison is needed; Product `manage-product-lifecycle` for the investment decision | Frozen evidence and opportunities; accept, narrow, research, defer or reject before defining scope |
| Supplied inputs must become ideas, offers or feature candidates | Product `define-product`; request Market research only for a decision-critical gap | Compare features with smaller workflow, offer and non-build alternatives; keep hypotheses separate from accepted requirements |
| Competitors or alternative solutions may have changed | One bounded Market `research-market` refresh against the prior scope and evidence; Product lifecycle only if a prior decision is challenged | Supported delta or no material change; preserve the baseline and invalidate only affected consumers |
| Accepted behavior is ready for a delivery slice | Host `plan-change -> implement-change -> validate-change`; Design, Security, QA and Evals only for applicable uncertainty or risk | Current implementation receipts; observed product outcomes return to Product lifecycle, which reopens the earliest invalidated decision |
| A redesign changes an experience or useful user outcome | Product definition when behavior/value is undecided; Design review/design for the interaction; host implementation and validation | Accepted behavior and interaction states with recovery; cosmetic edits can reuse the accepted product definition |
| Similar implementations, libraries or structures must inform a refactor | Host `context` gathers current primary technical sources; Software Architect design/pattern selection or review only when boundaries are unresolved; host plan, implementation and validation | Source-bound technical options and preserved behavior; Market is added only for an actual market question |
| Measured agent, skill or prompt failures need an optimization experiment | AI Architect `run-improvement-cycle`, the owning candidate author and the matching Quality subject adapter; Simulations only when an actor/environment is material | Candidate and receipts with a terminal stop reason; target integration is a separate authorized Coding Agent action |

Personas is optional: use an accepted actor description directly when sufficient;
build a canonical Persona only when a reusable human model is needed, then
compile the consumer projection. Project Management is optional: use it for
requested roadmaps or durable dependencies and coordination, rather than every
bounded change.

Each Coordinator plan remains acyclic. A learning cycle is a host-owned sequence
of bounded iterations with frozen inputs, expected outputs, affected owners,
budget, stop condition and a declared resume point. Finish the current evidence
handoff before admitting the next iteration. Never create a recursive
Market-to-Product invocation, allow a candidate to enlarge its own budget, or
interpret a plan as execution authority.

Recurring research needs an explicitly scoped host schedule: questions, sources,
baseline, cadence, run budget and meaningful-change notification rule. In Codex,
use the native automation facility when the user requests that schedule. The
research skill supplies one run; this pattern adds no scheduler or automatic
feature approval. A changed source, failed retrieval, no change and an unresolved
claim are distinct outcomes.

## Verification

Check plugin structure, references, unique artifact ownership, catalog routing,
growth schema/cross-field rules and the growth-to-Product plan. Cover finite
jobs, unknown economics and product feedback with bounded scenarios. Avoid
wording tests for each paragraph. Deterministic eligibility and live semantic
or market evidence remain separate.
