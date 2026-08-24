# Cascade Product capability map

Version: 0.1.24+codex.20260823213500

This plugin extracts product-lifecycle capabilities from the repository
Orchestrator and product/spec skills into three standalone, user-triggered
workflows. `specs/extraction-manifest.json` freezes the source repository,
revision, clean listed paths, SHA-256 digests, and capability assignments.
Those development sources remain provenance rather than runtime dependencies.

| Extracted capability | Development source | Plugin owner | Boundary |
| --- | --- | --- | --- |
| Sense, gather, route, plan, validate, learn | .codex/agents/orchestrator/AGENT.md | manage-product-lifecycle | Does not implement code or dispatch agents |
| Durable discovery and source normalization | .codex/skills/discover, .codex/skills/ingest-spec | manage-product-lifecycle | Uses accepted evidence, not invented research |
| Evidence synthesis into PRDs, personas, requirements, journeys, scenarios, and backlog | .codex/skills/synthesis-to-spec, .codex/skills/compose-spec | define-product | Persona canonical models move to Cascade Personas |
| MVP versus iteration scope and prioritized slices | .codex/skills/plan-iterations | manage-product-lifecycle and define-product | Delivery scheduling remains with the target harness |
| Validation experiments and functional acceptance routing | .codex/skills/validation-experiments, .codex/skills/functional-qa | validate-product | Market experiments and generic eval mechanics remain delegated |

The plugin adds product decision analysis, proposal, ledger, and learning-loop capability. Approval and state-transition authority stays with a named authorized decision owner. It does not create a new generic orchestration, prompt, simulation, or evaluation runtime.
