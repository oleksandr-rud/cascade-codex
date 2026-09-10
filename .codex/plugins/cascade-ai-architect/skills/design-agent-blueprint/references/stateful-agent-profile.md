# Stateful-agent blueprint profile

Load only after this architecture is explicitly requested or adopted by the target.
Defaults below apply within this profile, not to agent architecture generally.
Commands run from the design-agent-blueprint skill directory.

For stateful conversational agents, use
[Analyzer–Policy Engine–Composer](analyzer-policy-composer.md) as the
preferred reference default and fill
[its template](../assets/analyzer-policy-composer.template.md). Analyzer emits only
state-change proposals; deterministic runtime owns policy, state, and context;
Main Composer owns canonical meaning. Voice adds presentation-only composition;
Researcher runs only for an admitted delta request. Read the contract before
adopting it. Record target evidence, variants, and any exception; this default
does not assert measured superiority or require separate services.
Use the [simple modular profile](simple-modular-agent.md) by default:
vertical use-case slices, current-state transactions and direct context builders.
CQRS, persisted read models, event sourcing, brokers and generic process-manager
frameworks are optional decisions with concrete evidence, not template defaults.

For an implementation starting with state, claims, memory and graph relationships,
use [the selective storage and context example](selective-state-claims-memory.md).
It reuses existing Operation values for a bounded persistence slice, supplies
prepared data and context/evaluation templates, and preserves domain authority.
Treat its tests as backend evidence; provider and semantic evaluation are separate.

When specifying delta updates, policy data, memory or downstream context, read
[the state and projection contract](state-delta-policy-projection.md).
Use [the machine schema bundle](agent-contracts.schema.json) as the
wire authority and [the completeness assessment](implementation-and-completeness.md)
for target implementation gates. Validate candidate payloads using
`python3 scripts/validate_agent_contracts.py` and run
`python3 scripts/test_agent_contracts.py` from this skill directory when modifying
these contracts. Separate definitions, collected values and derived evaluations; bind field
identity, transaction/no-op semantics, role projections and summary coverage.

For this pattern, also bind [event projections and model text](event-projections-and-context-format.md):
checkpoint-owned attempts/deltas/state/context references; optional accepted-event
journals/read-model cursors; multi-policy local/canonical references; JSON Analyzer output (optional YAML);
and compact block-text role inputs with a stable prompt/catalog prefix. Follow
its authoring rules in role, workflow and prompt briefs. Do not add a duplicate
TurnState store or send raw YAML/JSON state catalogs as model context.
Runtime envelopes are not model payloads. Policy Engine builds a semantic prompt
view; render it as readable text sections with `role-text@1`. Keep checkpoint,
revision, digest, timing and invocation metadata in a private runtime manifest,
outside both prefix and suffix. Expose only reference handles needed to cite or
address task content. `compileBlocks` is a diagnostic codec only.
For conversation reuse, follow [iterative caching](iterative-context-caching.md):
system then role instructions then policies; optional admitted history precedes
current state/policy effects. Projection freshness and access checks precede reuse.
Keep cache candidates private and specify summary/window invalidation.
When interim text or voice feedback is requested, use the optional
[interim response profile](interim-responses.md): existing status purpose,
approved phrase selection, current role projections and nonblocking delivery gates.
The host reference codec uses its existing `yaml` package. Run
`bun test ./scripts/context_transport.test.mjs` from this skill directory after
changing transport or rendering. Provider cache hits and semantic output reliability
require separate target evidence.

For the stateful reference family, apply the shared
[architecture authoring checklist](architecture-best-practices.md).
Carry its source-bound obligations into roles, workflow, prompt and evaluation
briefs; distinguish source conformance from target activation and runtime proof.
Use the [executable schema/value projection contract](executable-projections.md)
for the default representation and wiring: trusted YAML/JSON profiles, admitted
role/task slices, compact object/schema/value blocks and scoped local block reuse.
Bind the supplied issuer to current host admission and token accounting. Use its
four-role fixtures as examples; raw formatter success is not admission evidence.
