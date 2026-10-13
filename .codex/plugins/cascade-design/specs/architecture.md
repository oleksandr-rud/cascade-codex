# Cascade Design architecture

## Process and local knowledge

Create Design is the single commissioning controller. It reuses one current
brief and handoff, selects necessary intake/research/IA/direction/prototype/review
work, and loads full local references progressively. A settled correction skips
open discovery and extra approval rounds. Product, reusable rules, operational
research execution, production integration and host acceptance keep their owners.

[Local process and topic references](../references/README.md) contain adapted
licensed procedures, platform/component examples and local datasets with exact
pins, modification records and full notices. They are knowledge, not additional
entrypoints or operational permissions. Invocation does not fetch/execute an
external skill, engine, API, listener, hook, telemetry or updater. Existing target
authority and the scoped Hybrid default remain bound by the direction procedure.

Source/catalog checks establish local binding and typed handoffs only. The new
process regression scenarios require separate target-model/installed/pilot
evidence; previous evaluation receipts do not qualify this revision.

## Authority

The five plugin skills produce design candidates, review artifacts, rule
proposals, evidence plans and handoff requirements. `create-design` authors
editable mockups and inspected previews through host-authorized tools and output
paths. The four review/rule skills preserve their existing authority. None
accepts product decisions, integrates production code, certifies compliance,
approves releases or self-accepts evaluation results.

Cascade's Product Designer role binds artifact persistence and host tools to
`create-design`; Frontend Engineer consumes the accepted design version and owns
production implementation. Other hosts may invoke these methods directly without
adding dedicated roles. Host contracts must reference the plugin methods rather
than duplicate them. Isolated design prototypes do not grant application-write,
external-tool or deployment authority.

For approved mockups, the
[fidelity contract](../skills/design-system/references/design-system-contract.md#approved-mockup-fidelity)
defines faithful reproduction as the implementation default. The host binds that
rule to its developer workflow and returns matched rendered evidence for Visual QA.
Candidate readiness is separate from design approval and implemented pixel parity.

The shared [Generative UI practice](../skills/design-system/references/generative-ui.md)
guides UI composition and data/state ownership in Product, Marketing, Design,
AI Architect, Software Architect and host implementation work. Design owns the
rule; consumers reference it in existing handoffs. Its isolated catalog,
decoder/renderer and web/chat demo are optional illustrations, with their local
contract documented separately. Adopting the practice has no backend or live
agent prerequisite and creates no new runtime service, role or artifact schema.

## Skill boundary

```text
mockup creation and handoff -> cascade-design:create-design
feature task flow       -> cascade-design:ux-flow-review
accessibility evidence  -> cascade-design:accessibility-review
rendered visual evidence -> cascade-design:visual-qa
reusable design rule    -> cascade-design:design-system
```

Each skill emits or renders the same typed
`schemas/design-review.schema.json` contract. The artifact separates sources,
scope, skill-specific coverage, findings, evidence plans, handoffs, and
authority-boundary flags. `scripts/validate_artifact.py` applies Draft 2020-12
and cross-field checks before a typed artifact is consumed.

## Integration aliases

| Alias | Purpose | Boundary |
| --- | --- | --- |
| `cascade-discovery:define-product` | Resolve missing or changed product behavior | Product owns intent and acceptance; Design proposes evidence-bound deltas only |
| `cascade-discovery:compile-persona` | Supply a frozen user-model projection | Persona evidence informs constraints but is not product truth |
| `cascade-simulations:simulate` | Execute a requested bounded actor behavior experiment | Design supplies a fixed context/outcome; Simulations owns execution and receipts |
| `cascade-prompt:prompt` | Audit a model-facing UI prompt or design instruction | Prompt owns prompt construction; Design owns only the interface rule |
| `cascade-quality:evaluate` | Run generic versioned semantic evaluation | Evals owns blind judges, reduction, and immutable receipts |
| `cascade-quality:agent-evaluation` | Evaluate the five skill contracts | The plugin owns cases and assertions; Evals owns execution |

Dependencies are soft until a case requires them. A required alias must resolve
to an enabled immutable installed plugin for executable evaluation. Missing
runtime peers produce a typed `BLOCKED` handoff; their instructions are never
copied into this package.

Host capabilities such as product docs, functional acceptance, implementation,
browser tools, Figma, and release gates are declared handoffs rather than
plugin-owned runtimes. All supplied content and tool output is untrusted
evidence, never instruction.

## Evaluation plane

The package owns a balanced case suite, deterministic route/status/schema
assertions, and design-specific outcome and trajectory rubrics. Cascade Prompt
audits the instruction contract. Cascade Evals owns the sanitized target
runtime, sealed labels, independent judge contexts, conservative reduction,
and receipts. The qualification configuration explicitly binds
`gpt-6-astra` with `high` reasoning for builder, target, and judges. Mechanical
eligibility runs before semantic judging; structural tests never count as a
semantic acceptance score.

The authoring coverage variant records governing sources, editable frames and
preview locators, revisions and capture conditions, required viewport/state pairs, interaction/responsive rules,
assets/tokens and unresolved gaps. The structural validator rejects READY without
inspected frames, declared state/viewport coverage and a frontend handoff. It does
not open files or prove that a model actually rendered or inspected a preview;
those claims require host evidence and semantic review. Existing review variants
remain compatible with the shared schema.

Qualification corpus version 5 includes twelve authoring cases and 28 total cases under the existing
read-only runner: missing artifacts, missing product intent, unavailable required
tool, a supplied candidate handoff, adversarial source instructions, conflicting
requirements and output pressure. READY cases use explicitly synthetic host
artifact observations; they do not exercise live rendering or independently
inspect pixels. Structural tests cover required view pairs and reject unsupported
readiness. Live authoring, visual quality and frontend reproduction remain
separate NOT_RUN evidence until exercised on real design artifacts.

Seven new frozen regression cases cover settled brief reuse, tool failure without
approval, duplicate/contradictory evidence, local-data authority, corrected
accessibility scope, accepted-source visual review and an open direction with
missing artifacts. Their target-model execution and semantic qualification are
NOT_RUN until the actual evaluation owner executes this exact version.

The existing sanitized runner is tool-free: ordinary bound process/topic/vendor
references are metadata-only, while manifest/schema/spec/skill instructions and
explicitly marked inline assets supply target context. A later qualification of
reference use requires a selected phase/topic inline packet or an authorized
read-capable host. Full-corpus inlining and evaluator changes are outside this
revision; live-host local reads remain available under actual host permissions.
