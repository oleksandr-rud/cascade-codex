# Generative UI practice

Rule: CASCADE-GENUI-1. Owner: Cascade Design. Authority: the user's shared UI
practice decision of 2026-09-09, building on the component/template request.
Consumers: Product, Marketing, Design, AI Architect, Software Architect and
the implementing agent. Use the [outcome UI standard](outcome-ui-standard.md)
and [Hybrid foundations](hybrid-foundations.md) for presentation, subject to
the target's accepted design authority.

## What it means

Generative UI composes a bounded region from components already defined by the
frontend. Structured data or an event selects a supported view and supplies its
content; a model can propose that selection when the product uses an agent.
The same components can appear in a chat, a web page or an application flow.
For example, structured appointment options render as a choice list, the user's
selection becomes a summary, and an observed result becomes a status view.

Treat this as a shared UI design and architecture practice. Adopting it means
using these decisions in relevant work; it requires no separate UI backend,
new service, agent role, transport protocol or runtime plugin. Structured data
can come from the target's existing state and interfaces. A model is optional.

## When to use it

During product and marketing UI work, consider whether a choice, comparison,
editable summary, next step or result would be clearer as a component than as
generated prose. Prefer existing components with bounded data when the useful
view varies with context. Keep ordinary pages and fixed forms simple when their
current composition already serves the outcome. Record a material choice in the
existing requirement, design note or architecture handoff; no separate report
or mandatory generative surface is needed for every screen.

## Shared rules

- The frontend owns component anatomy, layout, tokens, accessibility, responsive
  behavior and supported interactions. Reuse its catalog and page/chat shell.
- Data selects supported views and supplies bounded values. Validate it before
  rendering; unsupported or incomplete data gets a useful fallback. Generated
  markup, scripts, styling or handlers do not become executable UI authority.
- Bind each view to the information, decision and primary action the person
  needs. Preserve their input and focus through relevant updates; show loading,
  empty, error and recovery states where the interaction needs them.
- A rendered proposal, the user's intent, a pending operation and an observed
  outcome are distinct. Rendering or replaying data never executes an action;
  existing application owners retain authorization and effects. Completion
  copy follows observed state, not the model's claim.
- Use the same meaning and component behavior across web, app and chat. Their
  shells can differ without creating parallel catalogs or hiding essential
  information in narration.

## Role handoff

| Consumer | Apply in the existing work product |
|---|---|
| Product — `cascade-product:define-product` | Define the useful outcome, decision information, allowed action and recognizable result in requirements and journeys. Identify where a structured view helps. |
| Marketing — `cascade-market:brand-positioning`, `plan-growth` | Match promise, proof, conditions and call to action to the real UI states. Use structured choices or summaries when they improve understanding or activation. |
| Design — `cascade-design:create-design`, `design-system` | Select component/template anatomy, composition, states and accessible behavior under the accepted design system. |
| AI Architect — `cascade-ai-architect:design-agent-blueprint` | When an agent proposes UI, constrain its output to the supported catalog and data; keep proposal and observed state distinct in its existing behavior contract. |
| Software Architect — `cascade-software-architect:architect-software-system` | Place the catalog and UI state in the current frontend architecture; map relevant data and action ownership using existing project boundaries. |
| Implementing agent / Frontend Engineer | Consume the accepted mapping and reuse project components and interfaces within the assigned implementation scope. |

These are contributions from existing roles and skills, not extra agents to
dispatch. Load another specialist only when its unresolved decision needs that
expertise. Prompt authoring, if needed, continues through `cascade-prompt:prompt`.

## Readiness and evidence

For a practice or architecture-guidance request, readiness means the rule is
clear, reachable from its consumer instructions, and usable in their current
handoffs. A live model, server connection or production renderer is not a
prerequisite. Example completion is not a target implementation requirement.

For a requested design, inspect the relevant views and states. For separately
requested target implementation, verify the actual changed rendering, input,
fallback and action boundaries proportionally to risk. Keep those claims scoped
to that deliverable rather than creating an integration backlog for the practice.

## Optional illustration

Read [Generative UI reference example](generative-ui-example.md) only to inspect,
run or adapt the small `choice` / `summary` / `result` catalog and web/chat demo.
Its local event format and decoder limits illustrate one implementation. Targets
may apply the practice directly to their own components and data contracts.
