---
name: design-system
description: Use when a reusable design or UX rule is missing or changing for tokens, components, generative UI templates, interaction states, layout density, responsive behavior, accessibility, motion, content constraints, or visual-evidence expectations; do not use for one-off feature UX, product intent, brand positioning, runtime implementation, or unsupported style preference.
---

# Design System

Own reusable design rules. Convert validated recurring needs into observable
token, component, interaction, responsive, accessibility, or visual-evidence
contracts. Do not decide product intent, create brand positioning, or implement
UI code.

For new or unconstrained product and marketing UI, apply the
[Cascade outcome UI standard](references/outcome-ui-standard.md): Hybrid,
informative minimal composition, restrained liquid controls, fast interaction, and truthful
outcome states. Explicit target design authority and approved mockups govern
their scope; bind the chosen source rather than silently substituting a style.
For the basic component system and page compositions, read
[Hybrid foundations](references/hybrid-foundations.md). Its reference assets
provide concrete tokens and anatomy; the host owns target implementation.
For UI that benefits from structured choices, summaries or results, apply the
shared [Generative UI practice](references/generative-ui.md) across Product,
Marketing, Design, architect and implementation handoffs. It guides composition
from frontend-owned components and bounded data. Its optional example is not a
required backend, protocol or target implementation.

## Source order

1. Latest request and supplied product/design source, screenshot, mockup,
   Figma frame, current UI, or review finding.
2. Current design-system implementation: tokens, theme, primitives,
   components, and tests.
3. Accepted design, product, persona, journey, scenario, brand, and spec
   sources in the target repository.
4. Current browser, screenshot, accessibility, and visual-regression evidence.
5. `references/design-system-contract.md` for the reusable rule contract.

Current implementation is the strongest evidence of current behavior; an
accepted design or product authority still governs intended behavior. Preserve
and report conflict rather than overwriting either silently.
For an approved mockup, apply the
[mockup fidelity contract](references/design-system-contract.md#approved-mockup-fidelity):
faithful implementation is the default, with exact reference/viewport/state
bindings and a rendered comparison loop. Specify evidence and deviations in the
handoff; this skill defines the rule while the host implements it.

## Workflow

1. Bind the proposed rule and classify it as token, component, interaction
   state, layout/responsive, accessibility, motion, content, visual evidence,
   or unresolved design gap.
2. Establish reuse evidence and a source of truth. An explicit user or platform
   decision setting a reusable default establishes its declared scope; repeated
   screenshots are not required to authorize that decision. One isolated
   screenshot or unscoped preference is insufficient for a global rule; return
   `GAP` or route the feature-specific issue to `cascade-design:ux-flow-review`.
3. Write the rule observably: user-visible effect, allowed states and
   transitions, responsive constraints, accessibility expectations, content
   constraints, and validation evidence.
4. For tokens, define semantic name, purpose, allowed values, theme/mode
   behavior, consumers, accessibility constraints, and migration impact.
5. For components, define anatomy, variants, loading/empty/error/disabled and
   interactive states, content rules, responsive behavior, accessibility,
   tokens, and visual/functional checks.
6. Separate ownership:
   - missing product behavior -> `cascade-product:define-product` when
     installed;
   - persona/user-model evidence -> `cascade-personas:compile-persona` when
     installed;
   - missing brand positioning or message authority ->
     `cascade-market:brand-positioning` when installed;
   - feature-specific UX -> `cascade-design:ux-flow-review`;
   - accessibility evidence -> `cascade-design:accessibility-review`;
   - screenshot proof -> `cascade-design:visual-qa`;
   - prompt behavior -> `cascade-prompt:prompt` only when the rule governs a
     model-facing interface contract;
   - semantic evaluation -> `cascade-evals:evaluate` only for a versioned
     evaluation claim;
   - code change -> host planning and implementation.
7. Build each handoff directionally. `required_input` contains only the
   currently available request, observations, source identities, and unresolved
   decision/gap ledger that the next owner will consume. `expected_output`
   names the new artifact or decision that owner must produce. Never repeat a
   missing desired output as its own required input. In particular, a
   `cascade-product:define-product` handoff consumes the current request,
   observed UI/primitive context, and unresolved actor/decision/state/
   permission/audit fields; it produces the accepted product definition.
   Missing desired artifacts belong in evidence requirements, never in
   `source_of_truth_ids`.
8. Make implementation-dependent reviews an explicit sequence. When
   accessibility, visual, or functional evidence requires a runtime change,
   first hand off the rule to the host implementation owner. Each downstream
   review handoff must say that it starts only after that owner returns the
   reviewable diff and the exact rendered or executable artifacts, and must
   consume those returned artifacts together with the rule and governing
   sources. Do not present a source-only review handoff as executable, and do
   not imply that the future implementation output is already supplied.
9. Propose the target repository's declared design owner and sibling-impact
   check. Do not write product, brand, or implementation state without its
   owner and authority.

## Output contract

For reusable handoff or evaluation output, emit one JSON object conforming to
`../../schemas/design-review.schema.json` with `selected_skill` set to
`design-system`. Otherwise render the same fields concisely. Include rule
type, reuse evidence, source of truth, observable behavior, states, responsive
and accessibility constraints, evidence plan, owner routes, and false boundary
flags. Missing or conflicting product/design definition, reuse evidence,
source, or decision authority is `GAP`. Use `BLOCKED` only when a valid,
already-defined requirement cannot be exercised because its environment, tool,
or required plugin is temporarily unavailable.

Artifact status describes readiness of the rule proposal, not implementation
or owner approval. Use `READY` when governing sources and reuse evidence are
sufficient to define a coherent rule plus evidence plan; implementation and
validation may remain planned. Use `GAP` only when missing/conflicting product
or design foundations, authority, or reuse evidence prevent a coherent rule.

Use `templates/design-rule.md` for a reusable rule and
`templates/component-rule.md` for a reusable component/pattern. Complete
`checklists/design-system.md` before proposing a durable rule.

## Guardrails

- Do not turn one feature choice or screenshot preference into a global rule.
- Do not invent product requirements or brand claims.
- Do not implement runtime code.
- Do not persist credentials, private customer data, regulated data, or
  sensitive screenshots.
