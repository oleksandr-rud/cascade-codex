# Shared workflow shapes

These recipes are reusable composition guidance, not automatic routing,
mandatory phases, accepted plans or execution authority. Select methods from
current catalog descriptors and validate the resulting plan. Existing frozen
artifacts can satisfy a stage without repeating its producer. Missing subject,
criteria, authority or material evidence remains an explicit gap.

| Outcome | Compatible composition and handoff |
|---|---|
| Create and measure a prompt | `cascade-prompt:prompt` consumes a `prompt-brief` and `authoritative-sources`, producing a frozen `prompt-candidate`. The subject owner supplies `prompt-evaluation-cases`; `cascade-quality:prompt-evaluation` consumes candidate and cases. Reuse supplied candidates when authoring is already complete. |
| Design and qualify an agent | AI Architect resolves blueprint/workflow and `prepare-agent-prompt` produces a `prompt-brief` for Prompt; `prepare-agent-evaluation` produces `agent-evaluation-request` and `agent-evaluation-cases` for `cascade-quality:agent-evaluation`. Add dynamic execution only for a declared behavioral case. |
| Exercise a persona-derived journey | Discovery owns canonical Persona and `compile-persona` projections; Simulations validates the simulation projection, derives an actor, binds brief/adapter/outcome/limits, then freezes a run. `cascade-quality:simulation-evaluation` consumes the verified frozen evidence for independent judgment. |
| Assess a delivery quality gate | `cascade-quality:plan-quality` consumes accepted behavior; `design-tests` supplies cases and execution requests when needed. The host executes authorized checks; `assess-quality` consumes the frozen evidence. `triage-defects` is conditional on uncertain failure ownership. |

The QA and Evals components share the Quality package, but own different work
products. Persona criteria stay with Discovery, agent criteria with AI
Architect, and generic judges/lifecycle with Quality. Simulations produces
observations, not its own independent acceptance. Product/Design consumers may
reuse the same canonical Persona through their separate allowed projections.

## Artifact handoff

Every planned producer-to-consumer transfer has an explicit edge naming the
declared artifact type. Host observation control prepares the consumer only
after the producer is COMPLETED with current evidence. The prepared action
contains exact `input_bindings` (type, ID, version, path, SHA-256), expected
outputs and the catalog-bound method/model identity. A provided external input
retains its original binding; a produced input comes from that edge's completed
producer. Ambiguous or stale bindings cannot be delivered.

Different artifact types cannot be bridged by renaming a report. If a consumer
needs an evaluation-subject, controller verification or frozen evidence,
prepare that view under its existing owner and record provenance to the source.
Structural identity does not establish truth, permission or semantic quality.

The host's shared cycle is `admit -> select -> prepare -> act -> observe ->
verify -> complete or recover`. Keep local skills as thin adapters to it.
Reference a stable recipe for repeated target-specific work; never generate a
new skill from every task plan or copy these portable methods into the host.
