# Cascade Prompt and plugin ownership audit

Date: 2026-09-08. Source: `master`, base commit
`95bfafd318091b87040920cf9992710f1ade9c73`, with the existing uncommitted agent
architecture, role and design work preserved. This report describes the inspected
working tree, not a released or installed package.

## Result and proof boundary

Repaired concrete prompt, ownership and design-contract gaps. Retain the 62
plugin skills and the specialized evaluation roles. No replacement was shown to
cover a removed skill's trigger, inputs, permissions, outputs and consumers.
Short instructions and specialized adapters are not evidence of inferior quality.
No skills, installed plugins, historical records or frozen evidence were deleted.

Applied `cascade-prompt:prompt` in Diagnose/Advanced mode, with its evaluation,
coding/tool and frontier-autonomous guidance. Method package:
`0.6.0+codex.20260826233510`; installed SKILL.md SHA-256:
`03fb610eb44bcfbce3fc6ba7c41160c36088d9b93095b75f914f0f60d4fc672e`.
The audit checked objective, inputs, source authority, permissions, operative
instructions, output/schema agreement, missing/conflicting data, completion and
bounded cases. Revised prompts are the linked source contracts below.

This was an in-context source audit and deterministic verification, not a
separate model-backed Cascade Prompt campaign or independent semantic judgment.
No efficacy score, live authoring success, pixel parity or release claim follows.

## Findings and corrections

| Priority | Problem and effect | Correction / revised source |
|---|---|---|
| P1 | `create-design` qualification had only missing-input/tool cases. It did not cover a successful candidate handoff, injected source instructions, conflicting requirements or output pressure. | Expanded [design cases](../../../.codex/plugins/cascade-design/evals/cases.json) from 15 to 19 total, including seven authoring cases. The existing read-only runner receives explicit synthetic host observations for READY cases; this tests handoff semantics, not real rendering. |
| P1 | Design readiness checked states and viewports separately. Desktop/default plus mobile/empty could hide missing requested combinations. | Added explicit `coverage.required_views` pairs to the [schema](../../../.codex/plugins/cascade-design/schemas/design-review.schema.json), [validator](../../../.codex/plugins/cascade-design/scripts/validate_artifact.py) and [create-design instructions](../../../.codex/plugins/cascade-design/skills/create-design/SKILL.md). A shared rule cannot substitute for a required preview. Tests reproduce the incomplete-pair case. |
| P2 | The shared design schema forced at least one finding, encouraging invented defects in a clean candidate/review. | Allow empty findings; GAP/BLOCKED still needs an explicit gap or blocked handoff. Added regression coverage for clean and unexplained-gap artifacts. |
| P1 | Coding Agent maintenance and integration called `harness-evaluation` the generic lifecycle/judge owner, which could misroute non-harness subjects. | Corrected [maintain-harness](../../../.codex/plugins/cascade-coding-agent/skills/maintain-harness/SKILL.md), [integrate-agent-assets](../../../.codex/plugins/cascade-coding-agent/skills/integrate-agent-assets/SKILL.md) and capability dependencies: generic lifecycle → `evaluate`, judge construction → `build-judge`, route/trace subjects → `harness-evaluation`, other agent subjects → `agent-evaluation`. |
| P2 | `build-agent-skills` required a particular initializer and duplicated native metadata/packaging rules; its activation wording could repeat already supplied authorization. | [Build Agent Skills](../../../.codex/plugins/cascade-ai-architect/skills/build-agent-skills/SKILL.md) now owns the architecture brief and delegates packaging rules to the current native `skill-creator`, preserving existing explicit session authority. |
| P2 | Review method names could be mistaken for proof of independent context. | [Review Change](../../../.codex/plugins/cascade-software-architect/skills/review-change/SKILL.md) and [Review Architecture](../../../.codex/plugins/cascade-software-architect/skills/review-architecture/SKILL.md) explicitly distinguish local self-review from a separate-context gate. |
| P2 | New execution roles lacked an explicit durable closeout route, and closure did not state how a required independent gate remains open. | Wired the existing [closeout](../../../.codex/skills/closeout/SKILL.md) into Product Designer, Software Engineer and Frontend Engineer. Closure consumes current required independent evidence; it neither replaces it nor requires judges on every task. |

## Evaluation and closeout ownership

- **Code Reviewer**: source/diff findings for a fixed change. Independence needs
  a separate context; the role name alone does not establish it.
- **Harness Judge (`harness-evaluator`)**: independent outcome/trajectory judgment
  of a mechanically eligible coding-agent trace. The source runner loads its
  contract in `scripts/cascade/evals.ts`; campaign principals and receipt
  validators bind its stable identity. It remains outside the core target bundle.
- **Simulation Evaluator**: independent support assessment of a frozen run and
  fixed claim, after controller verification.
- **QA assess-quality**: reconciles required evidence against a fixed quality gate.
- **Project Management close-project**: assesses terminal completion and proposes
  retention of exact durable records; it does not archive them.
- **Host closeout**: persists authorized results and updates existing work state.
  It cannot synthesize missing evaluations, approve release or erase failed history.

Use independent judgment when the accepted contract requires it or the requested
semantic claim cannot be established mechanically. Do not run a whole evaluation
chain merely to complete an ordinary local change.

## Inventory and overlap dispositions

Inventory covered every capability descriptor and skill entrypoint in the 14
source plugins. Deeper contract reads concentrated on the collision groups below;
this is not behavioral qualification of every skill or an exhaustive code audit
of every packaged script.

| Plugin | Skills | Closest overlap and disposition |
|---|---:|---|
| Prompt | 1 | Prompt authoring/audit vs Evals execution: retain the method/runtime boundary. |
| Simulations | 9 | `simulation-review` verifies a run; `simulation-evaluation` owns independent reduction. Persona consumption validates the exact runtime payload rather than rebuilding a canonical persona. |
| Evals | 6 | Keep generic lifecycle and subject adapters; fixed claims, evidence contracts and independent judge contexts differ. |
| AI Architect | 10 | Architecture briefs/cases precede prompt, native skill packaging and Evals execution. Removed duplicated packaging instructions, not the brief capability. |
| Software Architect | 4 | Architecture candidates, pattern selection, architecture review and concrete diff review have distinct inputs and outputs. |
| Coding Agent | 4 | Audit, target adaptation, scoped maintenance and reviewed-asset integration have distinct starting states. Repaired evaluation routing. |
| Personas | 3 | Canonical model creation, purpose-limited compilation and quality evaluation remain distinct from simulation consumption. |
| Product | 3 | Product outcomes and validation decisions consume Market, Simulations and Evals evidence without owning those methods. |
| Market | 4 | Market experiment instruments and observed demand evidence remain separate from product decisions and synthetic simulation. |
| Design | 5 | Create mockups; review feature UX; define reusable rules; inspect accessibility; compare rendered appearance. Repaired authoring incompleteness instead of deleting it. |
| Security | 3 | Broad inventory, auth-specific tracing and pre-implementation secure design retain explicit anti-triggers. |
| Project Management | 4 | Delivery horizons and terminal assessment differ from Coordinator artifact ordering and host closeout writes. |
| QA | 4 | Plans, test designs, evidence assessment and failure classification consume execution receipts; host validation executes target checks. |
| Coordinator | 2 | Capability selection and dependency-safe artifact ordering do not replace project schedules or host implementation planning. |

Exact-body checks found no identical plugin SKILL.md bodies and no repeated
normalized paragraphs longer than 170 characters across these entrypoints.
All 66 directly linked local Markdown resources resolved. These mechanical
checks cannot prove the absence of semantic duplication.

Byte-identical source scripts were found in:

- `resolve_plugin_skill.py` and its tests in Evals, AI Architect and Coding Agent;
- `canonicalize_json.mjs` in Market and Product;
- the small `test_check_plugin.py` wrapper in Security and Design.

These are standalone-package mechanics or test wrappers, not competing skill
authority. Removing a copy without a packaged dependency would break isolated
installation. A shared build-time source is a possible future maintenance
change, but its package parity and distribution need to be proven first.
Installed cache copies, generated catalogs and frozen `.artifacts` snapshots
were excluded from the active-ownership duplicate count.

## Validation

- Cascade validator: PASS, 10 roles, 9 host skills, no project-specific leakage.
- Capability catalog: PASS, 14 plugins, 62 plugin routes.
- Harness scenario catalog: PASS, 142 registered scenarios; registration is not execution.
- Design plugin tests: PASS, 23 deterministic tests, including malformed artifacts,
  missing preview/view pairs, empty findings and the 19-case assertion adapter.
- Native skill validation for `create-design`: PASS.
- Core runtime bundle test: PASS, 97 files, including the role/skill bindings.
- Harness self-test: PASS, 31 fixture cases.
- `git diff --check`: PASS.

NOT_RUN: independent model-backed prompt/role qualification, real design creation,
visual comparison, live provider behavior, full plugin behavioral suites,
installation/activation and release. No candidate was ranked weaker based only
on prose length, directory count or unrun evaluation scores.

Source changes require a later versioned package release and installed discovery
check before their behavior can be claimed for installed consumers. Do not
remove an old capability until replacement trigger coverage, contract and
permission parity, consumer migration, discovery and regression evidence exist.
