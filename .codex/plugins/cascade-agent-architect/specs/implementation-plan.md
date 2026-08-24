# Historical Cascade AI Architect implementation plan

> This is the frozen implementation record for the superseded
> `cascade-ai-architect` identity. The active package is
> `cascade-agent-architect`; its current manifest and integration contracts
> supersede the names and ownership boundaries below.

Status: `COMPLETE`  
Revision: 4  
Scope: a personal, skills-only Codex plugin at `/Users/royrud1902/plugins/cascade-ai-architect`

## Intended behavior

Turn an unstructured AI-agent or agentic-system request into a versioned architecture packet. The plugin must extract source-grounded capabilities, cluster them into behavioral responsibilities, choose the smallest sufficient topology, generate complete building blocks, route prompt work through Cascade Prompt, route bounded execution through Cascade Simulations, and stage improvements only after controlled evaluation.

## Assumptions

- The plugin is provider-neutral and works with closed or open models through capability envelopes rather than provider rankings.
- Codex plugins package skills, resources, scripts, hooks, and MCP configuration; they do not have a native custom-agent directory. Generated agents are reviewable role/behavior artifacts for the target harness.
- `cascade-prompt:prompt` and `cascade-simulations:*` are external optional collaborators. Their runtime instructions are never copied.
- The existing Cascade repository is a read-only source of patterns for this implementation because its worktree contains unrelated user changes.
- “Self-learning” means an offline, bounded, versioned experiment loop. It does not mean silent production mutation, online weight learning, or self-promotion.

## Success criteria

1. The personal marketplace exposes `cascade-ai-architect` with ten focused skills.
2. A broad request routes through the umbrella skill and produces one coherent architecture packet.
3. Capability records use semantic slugs and source locators, not arbitrary claim IDs.
4. The architecture covers mission, non-goals, inputs, outputs, loop, state, context, memory, tools, permissions, skills, roles, handoffs, budgets, recovery, observability, and evaluation.
5. Multi-agent topology is selected only when a split has independent goals or evaluation, a real context/tool/permission boundary, or useful parallelism.
6. Prompt generation resolves and invokes Cascade Prompt or returns `BLOCKED`; it does not recreate prompt policy.
7. Evaluation resolves Cascade Simulations or returns `BLOCKED`; deterministic eligibility remains separate from semantic judgment.
8. Improvement candidates are versioned, evaluated on held-out cases, and accepted only to staging. Production promotion requires an explicit action.
9. Every skill, schema, script, manifest, and integration path passes focused validation.

## Skill set and ownership

| Skill | Owns | Does not own |
|---|---|---|
| `architect-ai-system` | End-to-end compilation and final packet | Target implementation or dispatch |
| `map-agent-capabilities` | Evidence extraction, ambiguity handling, capability records, clusters | Prompt prose or topology implementation |
| `design-agent-blueprint` | Complete system and per-agent behavior contracts | Workflow execution |
| `design-agent-workflow` | Loop, state, routing, handoffs, recovery, stop rules | Runtime dispatch |
| `build-agent-roles` | Target-harness role contracts and responsibility boundaries | Registering or spawning agents |
| `build-agent-skills` | Skill design briefs and optionally scoped skill packages | Silent installation or activation |
| `build-agent-prompts` | Prompt briefs and delegation to Cascade Prompt | Prompt policy or model-provider rankings |
| `evaluate-agent-system` | Architecture corpus, mechanical gates, judge contracts, evidence receipts | Generic simulation runtime |
| `improve-agent-system` | Candidate methods, experiments, reducer, stopping and staging | In-place self-modification or promotion |
| `design-simulation-persona` | Grounded or explicitly synthetic simulation personas | Simulation actor execution |

## Implementation slices

### Slice A: semantic core

- Write architecture, capability, workflow, role, and skill contracts.
- Add human-readable YAML templates with semantic identifiers.
- Add an architecture schema and deterministic cross-reference validator.

Evidence: valid sample packet, invalid fixtures rejected, skill validation.

### Slice B: external integrations

- Add a deterministic installed-plugin resolver.
- Define Cascade Prompt request/response contract.
- Define Cascade Simulations execution/review contract.
- Fail closed when a dependency or skill is absent or disabled.

Evidence: resolver tests against installed inventory and unavailable fixtures.

### Slice C: evaluation and improvement

- Add a compact architecture task catalog and split manifest.
- Add independent outcome and trajectory rubrics.
- Add a deterministic improvement receipt schema and promotion reducer.
- Preserve `NOT_RUN`, `BLOCKED`, `INVALID`, and semantic `FAIL` separately.

Evidence: reducer fixtures for accept, regression, missing judge, stale digest, timeout, and budget failure.

### Slice D: persona preservation

- Copy the validated Cascade Simulations persona assets, schema, and validator.
- Rename the skill to avoid an implicit-trigger collision while preserving provenance and behavior.
- Adapt its handoff to the new evaluation skill; keep actor execution in Cascade Simulations.

Evidence: original persona test corpus passes from the new location.

### Slice E: packaging and forward tests

- Validate every skill and the plugin manifest.
- Run unit tests and source-path checks.
- Forward-test at least a minimal single-agent request, a justified multi-agent request, a missing-authority request, and an improvement request.
- Install the cache-busted plugin and verify discovery in a fresh invocation context when possible.

Status: source validation, forward probes, personal-marketplace installation,
source/cache equality, and fresh-host discovery complete. See
`specs/validation-report.md` for the exact effectiveness boundary.

### Slice F: adversarial trust-boundary hardening

- Bind evaluation eligibility to confined, content-addressed evidence artifacts
  and typed receipts instead of accepting self-reported gate booleans.
- Bind improvement decisions to canonical judge verdicts, per-case budgets,
  calibration policy, aggregate usage, and typed runtime evidence.
- Enforce complete per-agent contracts, topology cardinality, role ownership,
  and canonical source digests.
- Resolve external skills only through each installed plugin manifest's declared
  skill root, rejecting malformed, escaping, or unreadable roots.

Evidence: exact bypass regressions, 90 focused unit tests, independent
adversarial re-review, cache-busted reinstall, and fresh-host discovery.

## Protected contracts

- Do not edit `/Users/royrud1902/Documents/cascade-codex`.
- Do not alter or remove `/Users/royrud1902/plugins/cascade-prompt` or `/Users/royrud1902/plugins/cascade-simulations`.
- Do not copy their prompt or simulation runtime instructions.
- Do not claim a live evaluation passed when only structure or fixtures passed.
- Do not let a semantic score compensate for a permission, schema, trace, or evidence failure.

## Expected impact

- Requests become explicit capability and boundary decisions before prompt authoring.
- Agent-count inflation is reduced by simple-first topology selection.
- Complete behavior blocks reduce prompt-only designs that omit tools, state, recovery, permissions, or observability.
- External prompt and simulation plugins remain independently versioned.
- Improvement becomes measurable and reversible instead of subjective or self-authorizing.
