# Cascade Design capability map

Version: 0.1.0+codex.20260909141643

`specs/extraction-manifest.json` freezes the pre-cutover Designer role and four
repository skill packages as historical extraction evidence. The plugin owns
reusable design semantics and candidate artifact authority; the requesting
host owns target paths, product authority, implementation, functional
acceptance, optional sandboxing, and release decisions.

| Capability | Development source | Plugin owner | Explicit boundary |
| --- | --- | --- | --- |
| Editable mockups, inspected previews, responsive/interaction states and frontend handoff | New plugin-native authoring contract | `create-design` | Host persists candidates; no production integration or self-approval |
| Actor/job flow, hierarchy, carried state, interruption, recovery, and feature state coverage | `.codex/skills/ux-flow-review` | `ux-flow-review` | Feature-specific UX only; no product invention, reusable-rule ownership, or implementation |
| Semantics, accessible names, keyboard/focus, contrast, target size, forms, status, motion, and mobile accessibility evidence | `.codex/skills/accessibility-review` | `accessibility-review` | Review and test planning only; no legal certification or code patching |
| Viewport/state visual evidence, layout, hierarchy, overflow, tokens, responsive behavior, and visual regression classification | `.codex/skills/visual-qa` | `visual-qa` | Visual evidence only; no functional acceptance or blind snapshot update |
| Reusable token, component, interaction, responsive, accessibility, motion, content, and visual-evidence rules | `.codex/skills/design-system` | `design-system` | Requires reuse evidence; no product intent, brand authority, or implementation |
| Combined review selection and read-only method authority | pre-cutover `.codex/agents/designer` extraction evidence | Direct `cascade-design:<skill>` routing by the requesting role or Orchestrator | Select the smallest namespaced skill; optional host sandboxing cannot duplicate plugin procedures |

Brand positioning remains with its existing owner. Product definition and
lifecycle remain with Cascade Product. Persona source/projections remain with
Cascade Personas. Goal-directed actor execution remains with Cascade
Simulations. Prompt authoring remains with Cascade Prompt. Generic measurement,
judges, and receipts remain with Cascade Evals. Target code changes and visible
acceptance remain with the host harness.

The user-selected Hybrid default, small component foundation, optional
generative UI templates/catalog and reference
assets belong to `design-system`. `create-design` applies them to candidate
pages; the target host owns production adaptation and rendered verification.
