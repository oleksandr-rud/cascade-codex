# Workflow control and plugin consolidation

Current source: the active Cascade checkout declared by the repository boot
contract. This report records the 2026-10-06 change; the earlier usage audit is
a historical snapshot of the fourteen-package catalog.

## Result

Nine public packages retain all 65 portable methods:

| Package | Components | Methods |
|---|---|---:|
| Discovery | Market, Product, Personas | 11 |
| Engineering | Software Architect, Coding Agent | 9 |
| Workflows | Coordinator, Project Management | 6 |
| Quality | QA, Evals | 10 |
| AI Architect | Agent architecture and improvement | 11 |
| Prompt | Prompt/context authoring | 1 |
| Design | UI, UX, accessibility and visual review | 5 |
| Security | Trust boundaries and audits | 3 |
| Simulations | Actor and campaign methods | 9 |

The marketplace, role skill maps, local aliases, dependency paths, evaluation
manifests and runtime bundle use the new public namespaces. Nine retired
installations/config entries were removed with the native CLI. Component
manifests identify their evaluation subjects, not extra marketplace plugins.
Unrelated plugin settings were preserved.

Existing capability selection remains the semantic method selector. New host
control binds observations and LLM decisions to a frozen plan, artifact versions,
history and limits. It checks dependencies, output evidence, retries, deadlines,
cancellation and uncertain attempts. RSI is an offline candidate-only handoff
after recorded failure. Execution and issue acceptance remain host decisions.

Interview evaluation now obtains strict response-bound LLM observations instead
of lexical question/intent/state extraction. Invalid observations receive one
format repair, then remain unresolved. The independent v5 judge sees source
responses directly. Inspection calls retain their execution receipts and usage.

## Evidence

- `bun scripts/cascade.ts validate`: PASS; nine source agents and nine host skills.
- `bun run test`: 95 PASS, zero failures; seven retained files, including grouped
  routing, control boundaries and the generated target runtime.
- `bun scripts/cascade.ts eval self-test`: PASS, 68 synthetic scenarios.
- Seven component/package contract validators: PASS against installed dependencies.
- Three installed-skill resolver suites: 20 PASS each; nested discovery and
  ambiguous identities included. Agent evaluator: 29 PASS; blind packets: four
  PASS; bounded improvement: 37 PASS.
- Existing interview regression runner and catalog validator: PASS; 47 interview
  fixtures and four independent judge profiles remain declared.
- Native `skills/list`: all 65 exact public names discovered in nine packages,
  zero Cascade loading errors. All 767 non-cache package files match source bytes.
- Fresh `gpt-6-astra/high` interview runs `complete-quick-v1` and
  `declined-hard-authority-v1`: both independently judged `ACCEPTED`. The second
  records `NEEDS_INPUT -> BLOCKED` and the typed source-authority intent.
- `git diff --check`: PASS. No commit, push or Nexus task dispatch was performed.

Detailed local receipts are retained under
`.artifacts/workflow-control-20261006/`. Recovery snapshot identifier:
`workflow-groups-20261005T211825Z`; it preserves the source, original Git diff
and pre-change Codex configuration, including prior unfinished work.

These two live interviews qualify the exercised interpreter paths. They do not
qualify every native skill trigger, prove an RSI improvement, or establish an
autonomous workflow executor. The controller's execution remains host-owned.
Nexus integration currently consists of the shared CLI projection/control
contracts and the design handoff; the tracker adapter/UI are not implemented.

## Current reading

- [All methods, package ownership and agent skill maps](../../patterns/workflow/plugin-groups.md).
- [Control and Nexus integration](../../patterns/workflow/nexus-integration.md).
- [AI Architect workflow skill](../../../.codex/plugins/cascade-ai-architect/skills/design-agent-workflow/SKILL.md).
- The prior usage audit is historical context outside this commit boundary.
  Observed skill loading is a proxy, not proof of execution or a reason to delete unobserved methods.
