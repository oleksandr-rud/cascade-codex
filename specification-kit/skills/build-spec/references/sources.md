# Sources and actual method adoption

Checked 2026-10-10 against primary documentation and source files. This is an
independently authored adaptation. The initial package transferred a few mechanics;
this revision adds explicit methods for developing the solution behind the spec.
Framework commands, installations, agent dispatch and external approval rules
are not invoked by citing them. No GPT-6.1 Sol generation benchmark was executed.

## Scope of adoption

No whole external SKILL.md, runtime or implementation script was imported.
The package authors 18 content policies and five development policies from
selected mechanics; it does not reproduce every source workflow. See
[profile coverage](profile-coverage.md) for what the six subjects require and
which worked examples exist. File counts are not a completeness measure.

The optional [method bindings](policy-bindings.md) were checked against the
available entrypoints of knowledge-to-policy source-analysis, Cascade Discovery
research-market, Cascade Engineering select-architecture-patterns and Cascade QA
plan-quality/design-tests on 2026-10-10. Their implementations remain ecosystem
dependencies. They were inspected for configuration, not executed as research
or QA runs. A binding preserves native scope, required evidence and handoff
contracts; it adds no second copy of their policy bodies.

## Audit: source → mechanism → implemented method

| Primary source | Previously transferred | Now implemented and adapted |
|---|---|---|
| [Superpowers brainstorming, 8ca22db](https://github.com/obra/superpowers/blob/8ca22dba9a94f28898bbce59f2537ff4d87c747d/skills/brainstorming/SKILL.md) | Interview-first intent and alternatives | [Authoring paths](development-path.md), [W01](development-policies/W01-idea-space.md), [W03](development-policies/W03-solution.md): proportional depth, credible alternatives, optional bounded probe, contextual sketches. Existing authorization governs work; no prescribed question/idea quota. |
| [Spec Kit planning, 7666b74](https://github.com/github/spec-kit/blob/7666b7463ffc8b3dce49f75be017f163a46792fa/templates/commands/plan.md) | Requirements distinguished from technical choices | [W02](development-policies/W02-research.md), [W03](development-policies/W03-solution.md): turn technical unknowns into decision questions, consolidate choice/rationale/alternatives, then bind data/interface/run contracts. Results live in the owning SPEC sections. |
| Spec Kit [checklist](https://github.com/github/spec-kit/blob/7666b7463ffc8b3dce49f75be017f163a46792fa/templates/commands/checklist.md) and [analysis](https://github.com/github/spec-kit/blob/7666b7463ffc8b3dce49f75be017f163a46792fa/templates/commands/analyze.md) | General consistency review | [W04](development-policies/W04-test-design.md), [W05](development-policies/W05-consistency.md): requirements-quality review is distinct from application testing; detect contract contradictions and missing coverage through LLM interpretation. Keyword-derived coverage and stock checklist counts are not used. |
| OpenSpec [exploration](https://github.com/Fission-AI/OpenSpec/blob/9111a7654d7800391459431fff4eaf66e33a3d2e/skills/openspec-explore/SKILL.md) and [workflow schema](https://github.com/Fission-AI/OpenSpec/blob/9111a7654d7800391459431fff4eaf66e33a3d2e/schemas/spec-driven/schema.yaml) | [S16 baseline delta](policies/S16-feature-change.md) | [W03](development-policies/W03-solution.md), [W05](development-policies/W05-consistency.md): inspect actual code and baseline, resolve upstream decisions before dependent details, revisit affected contracts, apply technical design where complexity warrants it. Keep our full implementation contract in one SPEC. |
| BMAD [brainstorm convergence](https://github.com/bmad-code-org/BMAD-METHOD/blob/bda3c5929f672019b90f39a3ea27259d35d00974/skills/bmad-brainstorming/references/converge.md) | Product/architecture/UX viewpoints | [W01](development-policies/W01-idea-space.md): separate generating candidate mechanisms from evaluating them; choose a convergence method fitting the decision, preserve selected directions. No large idea quota or mandatory session artifacts. |
| BMAD [decision research](https://docs.bmad-method.org/plan/research-a-decision/), [technical research](https://github.com/bmad-code-org/BMAD-METHOD/blob/bda3c5929f672019b90f39a3ea27259d35d00974/skills/bmad-deep-recon/types/technical.md) and [verification](https://github.com/bmad-code-org/BMAD-METHOD/blob/bda3c5929f672019b90f39a3ea27259d35d00974/skills/bmad-deep-recon/references/verification.md) | Brief targeted-research advice | [W02](development-policies/W02-research.md): decision-specific sources/freshness, optional external research brief and imported-report processing, claim-level support/uncertainty and disconfirming evidence. A report or two repeated vendor claims do not establish reproduction. |
| BMAD [architecture](https://github.com/bmad-code-org/BMAD-METHOD/blob/bda3c5929f672019b90f39a3ea27259d35d00974/skills/bmad-architecture/SKILL.md) and [spec](https://github.com/bmad-code-org/BMAD-METHOD/blob/bda3c5929f672019b90f39a3ea27259d35d00974/skills/bmad-spec/SKILL.md) | Distinct design viewpoints and source ownership | [W03](development-policies/W03-solution.md), [S15](policies/S15-decisions-context.md), [W05](development-policies/W05-consistency.md): short rules preventing incompatible independent implementations; code owns current structural facts; coherence and preservation of material source claims. Retain our detailed technical contracts and direct SPEC editing; no canonical memlog or additional mandatory files. |
| [BMAD TEA test design, 81c8771](https://github.com/bmad-code-org/bmad-method-test-architecture-enterprise/blob/81c87714c3647077b83babe5e8de8dbcd3a8238c/docs/how-to/workflows/run-test-design.md) | Acceptance-case records | [W04](development-policies/W04-test-design.md), S14/S18: testability review, risk-specific cases, quality thresholds and planned evidence before implementation; changed decisions revise affected tests. No TEA installation, mandatory epic hierarchy or test-count target. |
| [IDEF primary collection](https://www.idef.com/downloads/) and [C4](https://c4model.com/diagrams) | Section viewpoints and bound diagrams | Existing S policies and [Spec Diagrams](../../spec-diagrams/SKILL.md) continue to supply the diagram methods. W03 uses only the views needed to understand a decision. |

The repository commits above were resolved during this inspection. Live BMAD
documentation was checked on the stated date. A source may change after that.

## OpenWorkbench: identified, public internals unavailable

The user confirmed [OpenWorkBench.co](https://www.openworkbench.co/). Its public
site advertises OpenSpecKit as a spec/build/verify rules engine with MCP and
OpenPattern as a patterns project. On 2026-10-10 the linked
[OpenSpecKit repository](https://github.com/OpenWorkBench-Co/OpenSpecKit) and
[OpenPattern repository](https://github.com/OpenWorkBench-Co/OpenPattern) returned
404 through both GitHub browsing and the public GitHub API.

This establishes only their unavailability to this inspection; it does not
establish why they are unavailable. No internal policy schema, pattern-selection
method or working implementation was inspected or adopted from those projects.
The website description is a lead for future research, not evidence of a usable
mechanism. Our W03 pattern selection is authored from the available sources above.
An accessible source would allow a specific follow-up comparison.

## Whole-application exemplars

- [Apache CAP backend, commit 7d041ed](https://github.com/apache/infrastructure-cap/blob/7d041ed2afb22b01996a7c37ab81a0cbe0b106f8/backend/SPEC.md):
  detailed DTOs, route handlers, schema, transaction and failure contracts.
- [Apache CAP frontend, commit b97f807](https://github.com/apache/infrastructure-cap/blob/b97f807ce82a0be8ed03bf589add14e2e9bcbaed/frontend/SPEC.md):
  route/component/API-client detail. This snapshot and the backend snapshot have
  different `/api` proxy assumptions; reconcile versions before combining them.
- [NanoMMO SPEC, commit a42be5c](https://github.com/thsilvadev/nanommo/blob/a42be5c7cbc0fcf92d044f0558e4fcd3c73089e7/SPEC.md),
  [architecture](https://github.com/thsilvadev/nanommo/blob/a42be5c7cbc0fcf92d044f0558e4fcd3c73089e7/ARCHITECTURE.md)
  and [frontend](https://github.com/thsilvadev/nanommo/blob/a42be5c7cbc0fcf92d044f0558e4fcd3c73089e7/FRONTEND_SPEC.md):
  complete module/data/runtime coverage with a distinct UI contract.
- [ClickClack SPEC, commit e455d43](https://github.com/openclaw/clickclack/blob/e455d43809a0e6e1c3210926b74ed0c6180b1aa7/SPEC.md):
  compact product/backend/frontend/storage/operations packet; preserve its unresolved
  implementation choices as unresolved rather than assuming readiness.

We inspected documentation; their applications and tests were not executed for
this package. DeskSlot is our authored worked example, not a reproduction of
their products. See the second skill's
[diagram sources](../../spec-diagrams/references/sources.md) for notation manuals.
