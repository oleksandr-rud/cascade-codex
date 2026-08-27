# Cascade Personas architecture

## Authority

build-persona exclusively creates or revises the canonical versioned human model. evaluate-persona only audits a frozen canonical artifact or projection, and compile-persona only produces immutable purpose-limited projections. Cascade Simulations consumes the canonical projection and owns runtime persona/actor execution; Cascade AI Architect consumes it for architecture context and never creates a parallel canonical model. No Persona skill executes a simulation, determines market truth, prioritizes a product, authors generic prompt mechanics, or reduces a generic evaluation.

## Integration aliases

| Alias | Purpose | Required when |
| --- | --- | --- |
| cascade-simulations:simulation-persona | Validate the simulation projection contract | Target is simulation |
| cascade-simulations:simulation-actor | Derive runtime actor policy from a projection | Actor policy is requested |
| cascade-evals:evaluate | Run generic evaluation lifecycle and reduction | An evaluation is executed |
| cascade-evals:build-judge | Build/calibrate semantic judge profiles | Semantic quality is measured |
| cascade-prompt:prompt | Compile or audit model-facing persona prompts | A production prompt is requested |

Dependencies are resolved from the current enabled plugin registry by exact alias. Missing required dependencies fail closed as BLOCKED; package instructions are never vendored or silently approximated.

## Data flow

sources -> claim ledger -> canonical persona + digest -> projection manifest + digest -> Product | Market | Cascade AI Architect | Simulations | Evals

Every downstream artifact binds the canonical digest and mapping version.
Canonical artifacts use the packaged `scripts/canonicalize_json.mjs`
implementation of RFC 8785 JSON Canonicalization Scheme and SHA-256 over
canonical UTF-8 bytes. Draft 2020-12 structure is enforced by the canonical
persona v2, projection v5, and handoff v2 schemas;
`scripts/validate_artifact.py` enforces cross-references, typed state and
bounds, complete non-overlapping per-leaf and per-array-member projection
lineage with exact source-slice claim coverage, validator-bound receipts,
immutable projection state, destination policy, freshness, and handoff closure.
Declarative mappings leave semantic transformation quality NOT_RUN. A
simulation projection can claim semantic PASS only when its payload and
compiler-generated mapping table match exactly and the digest-bound enabled
Simulations cross-field validator accepts the payload.

For a simulation consumer,
`scripts/compile_simulation_persona.py` maps the canonical v2 contract into
the exact enabled Cascade Simulations persona v1 schema and emits a
source/schema/semantic-validator digest receipt after enforcing canonical
consumer, destination, and transfer policy. The compiler accepts only its own
packaged dependency manifest and the exact schema/validator paths from the
enabled installed Cascade Simulations cache; a caller-selected self-consistent
bundle is invalid. It maps raw source locators to digest-only locators and
invokes the installed, manifest-bound Simulations cross-field validator before
writing output. Cross-plugin transfers conform to
`schemas/handoff-envelope.schema.json`. A source or contract change
invalidates only affected projections and their dependent runs.

Canonical models own baseline state, variable definitions, and transition rules. A simulation run owns its mutable state instance and journal; runtime state never mutates or changes the canonical persona/projection digest.

Evaluation uses a v2 manifest that binds every runtime skill, prompt, schema,
validator, adapter, case suite, judge profile, and exact installed dependency
artifact. The declared packet builder, judge-packet schema, and model policy
are bound and enforced rather than treated as descriptive fields. Cascade
Evals constructs target/sealed/judge packets and freezes
builder, target, and judge model plus reasoning effort in its receipt. The
subject adapter gates only deterministic status identity; two isolated judges
own semantic assessment.

## Non-goals

- autonomous actor execution;
- claiming statistical representativeness from synthetic personas;
- inferring sensitive traits or optimizing consequential treatment;
- replacing interviews, analytics, market research, or human calibration.
