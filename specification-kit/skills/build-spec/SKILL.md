---
name: build-spec
description: Interview and compose or revise one product, company, scenario, test, full application or feature specification with concrete contracts, selected policies, diagrams and test design. Use when a specification must support coherent implementation or acceptance.
---

# Build Spec

Produce one primary specification in the user's language. For an application,
make frontend behavior, backend operations, handlers, data, rules and acceptance
concrete enough that implementation need not invent material contracts. Keep the
plugin portable; do not require a framework, particular model or agent delegation.

## Interview first

Read supplied answers, sources and relevant code. Establish users, useful outcome,
scope, exclusions and recognizable success before choosing architecture. Reuse
existing answers. Ask one focused question at a time when a material decision is
unresolved; offer alternatives only when they help the user decide. A supplied
clear requirement does not need another approval ceremony.

## Select content and resolve only the gaps

Read [policy-catalog.yaml](references/policy-catalog.yaml), choose one of the six
profiles through LLM interpretation, then load its template and applicable S
policies. Declare each policy's `INCLUDE / OMIT / UNRESOLVED` disposition and
reason. Resolve dependencies or keep the affected block visibly incomplete.
Use [profile-coverage.md](references/profile-coverage.md) for the selected subject.

Draft functions, scenarios, domain concepts, business/access rules and observable
acceptance early. Read [development-path.md](references/development-path.md) to
select `DIRECT / DEVELOP / UNRESOLVED` and the needed W methods. Research, idea
expansion and alternatives serve named decisions; they are not mandatory stages.
For a feature, inspect its baseline before applying S16.

When a project supplies method configuration, use
[policy-bindings.md](references/policy-bindings.md). Candidates are selected by
LLM interpretation of the current decision. Preserve the selected skill's native
inputs, source bindings, output and authority. Missing required input remains a
gap; a name in a preset cannot install, dispatch or authorize a method.

## Refine one behavior through its contracts

Read [composition.md](references/composition.md). For each consequential function,
connect scenarios to the contracts that apply: UI states/components, API payloads,
handlers/algorithms, tables/migrations, access checks, lifecycle and effects.
One function may need several operations or jobs. Select a stack only when needed.

Specify actual types, nullability, validation, errors, transaction boundaries,
recovery, module paths and run commands. Define a new contract inline or in one
linked owning file. Current code owns current facts; the spec owns intended
behavior. Resolve contradictions instead of merging incompatible versions.

Develop diagrams and tests alongside that behavior:

- `specification-kit:spec-diagrams` owns focused diagram projections, notation and
  evidence. Each substantive block gets a useful view or an exact shared view
  reference; explain omissions. Diagrams cannot replace concrete contracts.
- `specification-kit:spec-test-design` owns W04's cases, fixtures, levels, oracles
  and conditional campaign design. It supports unit, contract/integration, E2E
  and user simulation when they observe a relevant risk. Planned cases are
  `NOT_RUN`; missing testability returns the affected decision to development.
- W06 selects design authoring/review only for an actual interaction or design
  gap. Optional methods are `cascade-design:create-design`,
  `cascade-design:ux-flow-review`, `cascade-design:design-system`,
  `cascade-design:accessibility-review` and `cascade-design:visual-qa`.
- W07 plans a campaign only when coordinated cases, variants or contours need
  one. Optional methods are `cascade-quality:plan-quality`,
  `cascade-quality:design-tests`, `cascade-simulations:manage-simulation-campaign`,
  `cascade-simulations:simulation-brief`, `cascade-simulations:simulation-outcome`,
  `cascade-simulations:simulation-actor` and `cascade-simulations:simulation-persona`.

For researched product or architecture gaps, optional configured methods include
`cascade-discovery:define-product`, `cascade-discovery:research-market`,
`cascade-engineering:architect-software-system`,
`cascade-engineering:select-architecture-patterns` and
`cascade-security:secure-design`. Load only the selected method and needed inputs.
Use primary sources for uncertain technical claims and preserve uncertainty.

## Review and deliver

Apply W05 and [review-checklist.md](references/review-checklist.md): trace successful
and material failure scenarios through enforcing contracts to observable results.
Check diagrams and tests against the same owner revision. Interpret meaning with
the LLM; scripts may validate formats, identifiers, links, digests and syntax.

Return the primary spec, selected policies, assumptions, unresolved decisions and
actual evidence. Use `DRAFT / READY_FOR_REVIEW / READY_FOR_IMPLEMENTATION` as defined
in composition.md. Proposed behavior, authored diagrams and planned campaigns
are not implemented or accepted behavior. Persist only within authorized paths.

During implementation load the relevant spec slice, current code/schema/config
and applicable repository practices. Keep research history and unused policies
outside the repeated implementation context. This skill does not switch models,
execute tests or campaigns, or implement an operational world model.
