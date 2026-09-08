# State projections, multi-policy deltas and optional event profiles

Contract: `event-projections-and-context-format@1.7`
Pattern: `analyzer-policy-composer@2.4`\
Status: `reference-design`; accepted architecture extension, 2026-09-08.

This extends [state and policy semantics](state-delta-policy-projection.md).
The JSON Schema bundle describes logical values, independently of their transport.
Pattern 2.4 retains the 2.0 logical schema bundle and StateDelta v3; the new
transport, checkpoint storage grouping and event-store obligations do not silently
change those logical payloads. Target storage/event schemas are separate bindings.
Analyzer output defaults to **JSON**, with YAML as an explicitly configured
alternative. Both represent the same StateDelta. Model input is **compact block
text**, compiled from the role/task policy-state slice issued by Policy Engine
and admission. Optional read-model projections are a separate storage mechanism.
The output transport does not determine downstream input structure or authority.
The [simple modular profile](simple-modular-agent.md) is the default. Sections
about committed-event reconstruction and persisted read views apply only when
those optional profiles are selected; neither is required to build role context.

## Accepted flow and owners

```text
accepted input -> Policy Engine/admission issue Analyzer task slice -> compile
  -> Analyzer -> JSON StateDelta -> safe parse + schema validation
  -> Policy Engine: admission, per-part selection, staged changes, invariants
  -> one atomic commit: current state + receipt + pending work
  -> Policy Engine/admission: issue role/task slice with access, freshness, budget
  -> Context Compiler: format issued slice only
  -> compact block text -> eligible Composer / Researcher / Voice invocation
```

The Process Manager owns eligible invocations, waits, cancellation and timeout
decisions. A context projection does not dispatch work. Research needs an admitted
request; a populated search field alone creates no job. Voice consumes the
canonical response. Model results return through their established admission gate.

Use direct operations and current-state projection within one module/store first.
Do not require CQRS models or an event journal. The default pure boundaries are:

```text
decide(state, proposal, policySnapshot, recordedInputs) -> acceptedChanges
apply(state, acceptedChanges) -> nextState
issueSlice(state, admittedTask, role, policySnapshot, authorizedScope) -> roleTaskSlice
compile(issuedRoleTaskSlice, formatVersion) -> compactText
```

Reducers/projectors do not call models, tools, networks or the live clock. Record
time/expiry and external observations explicitly. Source evidence preserves
reported/inferred status; accepting a claim does not establish objective truth.

## Committed events and replay

Optional journal/event-sourced profile only. The current-state baseline persists
ordinary records and receipts; it does not promise historical reconstruction.
An accepted input envelope called `AcceptedEvent` is not an event-sourcing store.

`StateDelta` remains a proposal, including alternatives that might never apply.
`AppliedChangeSet` remains the processing receipt. Introduce a target-bound
`CommittedEventBatch` for accepted facts; record references/revisions alone do
not reconstruct state. Its required logical contract is:

| Part | Required content |
|---|---|
| Envelope | Schema version, batch/transaction ID, tenant/session stream, expected/new stream position, before/after semantic revision |
| Lineage | Input/delta/context refs, correlation/causation refs, pinned policy bindings, decision receipt |
| Events | Unique event ID, type/version, sequence within batch, subject/record identity, accepted payload, provenance and support |
| New identities | Local proposal ID to canonical record ID mapping allocated once at commit |
| External work | Durable dispatch intent refs; execution outcome comes from a separate receipt |

Target event types can include `ClaimRecorded`, `PolicyFieldChanged`,
`ChoiceDeferred`, `ChoiceResolved`, `PlanStepProposed`, `ResearchRequested` and
`MemorySummaryAccepted`. Each type binds an explicit schema and reducer. An
accepted payload contains the values required for replay or immutable, digest-bound
content references whose retention and resolution are owned. Mutable latest-value
references are insufficient. Reject unresolved types at profile activation.

Replay folds accepted events without Analyzer, Composer, Researcher or external
effects. Re-analysis generates a new proposal; policy re-evaluation records a new
decision without replacing historical decisions. Version/upcast event payloads
explicitly. Rebuilding a view never reissues historical dispatch intents; crash
recovery resumes only undispatched live intents under idempotency/reconciliation.

Three storage profiles are supported. The baseline owns current transactional
state with ordinary checkpoint/decision/delivery records and no required domain
event journal. An optional journal records accepted events alongside current state
for a named audit/integration need; derived views declare their authoritative
inputs. Full event sourcing makes the complete accepted stream the
authority and snapshots disposable accelerators. Select it only with complete
event payloads, stream concurrency, migrations and reconstruction tests. Never
claim event sourcing merely because an input-message log exists. If source data
was deleted/revoked, rebuild must preserve that restriction and report unavailable
content rather than resurrecting it from old events or summaries.

## Multiple policies and references

One Analyzer invocation may update several policy instances. Select a destination
by `(policy_id, instance_id, field_id)` from the runtime-issued writable catalog;
subject, scope and field revision remain bound to the invocation. No implicit
"current policy", display-name matching, YAML order or last-writer-wins rule.

| Situation | Required behavior |
|---|---|
| Name and tone are independent | Two direct groups; each can be admitted independently in one commit |
| One fact feeds several policies | One canonical claim, multiple registered claim-reference fields; no independently mutable copies |
| Claim and references must exist together | Put their operations in one atomic group |
| A later group needs an earlier group | Declare `depends_on`; reject cycles; reject/skip consumers if the producer fails |
| Different Analyzer parts propose alternatives | Select independently per part, then check the combined candidate state |
| Two policies write the same owned fact | Resolve through the single fact owner or reject; policy priority alone is not storage ownership |
| A candidate touches several policies | All candidate groups apply together or none apply |
| Reference belongs to a losing candidate | Cannot escape into another candidate/direct group; use an admitted durable record or an independent prerequisite |

References have separate meanings:

- **Evidence refs** resolve only against the input evidence catalog and retain
  source spans/digests. They establish provenance, not permission.
- **Existing record refs** resolve within authenticated scope and their expected
  revision. Display labels are payload, not record identity.
- **New local refs** use the operation's existing local identity field (for
  example `claim.local_ref` or a proposed step's `local_ref`). Reserve these names
  in the proposal namespace. Resolve them only within the atomic group or a
  declared dependency closure. Never resolve a local ref by searching the global
  database. Runtime allocates stable IDs and records the mapping once.
- **Definition refs** bind approved versions/digests. A reference cannot load
  executable rules from Analyzer text or expand a field's schema.

For `change_policy_data`, a field may hold a claim reference only if its registered
`value_schema` explicitly allows that shape, for example `{claim_ref: local-name}`.
This is typed field data, not a generic new reference syntax accepted everywhere.
The target reducer declares resolution for that field. Arbitrary strings are never
automatically dereferenced. Current reference schemas do not register domain-specific
claim-reference fields; each target must bind and test them before use.

For example, a target can register `identity.name_claim` and
`greeting.subject_name_claim` as claim-reference fields. In one group, Analyzer
proposes a claim with `local_ref: name-claim`, then sets both fields to the typed
value `{claim_ref: name-claim}`. Runtime stages the claim, allocates its canonical
ID once and resolves both references before committing the group. The two policies
then project the same accepted name from that claim. If claim admission fails,
neither reference survives. This is a target-binding example, not an extra field
silently added to the packaged identity policy or a claim of a running resolver.

In the model context, resolve required references into permitted values, labels
or excerpts with compact provenance. A model without retrieval tools must not
receive an opaque ID in place of the content needed for its task. Missing,
cross-scope, stale or ambiguous references yield rejection, re-analysis or a typed
context gap. Presentation aliases, if a target adds them, bind to one invocation
manifest; they never replace canonical IDs in storage or authorize resolution.

## Checkpoint as the processing aggregate

`StateDelta.checkpoint_id` binds every proposal to a runtime-reserved checkpoint.
The [grouped checkpoint example](../assets/checkpoint-grouping.example.yaml)
links the JSON delta, state revisions and both compiled context examples. It is
an illustrative record with explicit runtime-evidence limitations.
The checkpoint owns the processing group rather than introducing a separate
mutable `TurnState` record. Its target contract groups:

```text
Checkpoint
  checkpoint_id, scope_ref, input_event_ref, root_checkpoint_ref, conversation_alias
  parent_checkpoint_ref?                 research/timer/result continuation
  processing_revision, status            reserved | processing | committed | rejected
  attempts[]                            invocation/context/delta/receipt references
  state_binding                         base and accepted semantic revisions
  committed_batch_refs[]                exact accepted changes
  role_context_refs[]                   role/purpose/source cut/compiled digest
  response_refs[], dispatch_intent_refs[]
```

These are logical grouped references; large deltas, compiled text and immutable
state snapshots may live in content storage under this checkpoint. Do not copy
the entire state into each group. A state binding names a reconstructible revision
or immutable snapshot reference, not a mutable pointer to whatever is current.
Bound attempts/context lists and archive through the same owner; no unbounded
in-document arrays are required. The checkpoint must not duplicate canonical
messages, plans, claims, policy instances or delivery payloads.

One finalized user input reserves a root checkpoint before analysis; completion
records the accepted revision and receipt atomically with its changes. Retry or
bounded model repair adds an attempt under the same input checkpoint with its own
invocation identity. Only one semantic input commit can win; duplicate completion
returns its receipt. A later independent accepted input gets a new checkpoint.
Research results and timer events have their own child checkpoint/input identity,
linked to the conversation root; their processing does not reopen a committed
checkpoint or share its idempotency key.

Keep existing wire `turn_id`/`turn_ref` for compatibility as a runtime-issued
conversation grouping alias derived from the root-checkpoint mapping. It does not
require a separate persisted turn object. `HistoryTurn` and turn open/closed status
are read views derived from checkpoint lineage, canonical responses and the
admitted turn decision. Current checkpoint status and turn closure are different:
a processed user input can still be waiting for research. Late child results bind
their original root and current eligibility; they cannot join the newest turn by
arrival order. A turn's 20-window position counts root user checkpoints only.

Appending later response/context references uses checkpoint metadata revision/CAS;
it does not rewrite the original semantic receipt or claim voice was delivered.
Delivery attempts retain their existing independent lifecycle and are linked by
response/checkpoint refs. A NOOP records processing progress without a new semantic
state or memory version. Every compiled role context binds its exact checkpoint,
invocation and source revisions, so concurrent attempts cannot exchange contexts.

## Read projections and freshness

Default: Policy Engine/admission loads committed records and issues a role/task
policy-state slice in memory; the compiler formats its text. No stored projection,
cursor or subscriber is required. Access checks
and required-reference resolution occur before serialization. Never build a broad
cached view and rely on model instructions to hide forbidden fields.

Only if a reusable persisted read model is justified, apply the following rules.
Each persisted view owns a `ProjectionCheckpoint` with projection ID/version,
stream/partition ID, processed position, last complete transaction, source
dependency revisions and `ready | catching_up | invalid | failed` status. A
multi-stream view owns a position vector and explicit consistent-cut rule, not
a fabricated global timestamp order. Initially use one session stream.

Update a view and its cursor atomically. Ignore proven duplicates, detect gaps,
buffer or recover out-of-order arrivals, and expose only whole committed batches.
A NOOP may advance processing position without changing semantic revision. Delivery
has its own dependency revision. Invalidating a required source blocks dependent
contexts until refreshed. Changed policies invalidate their dependent views even
without new Analyzer operations.

Default: compile the response synchronously from the accepted snapshot. An async
view must cover the required commit and match other current dependencies before
dispatch. Otherwise wait within a bound, read the authoritative snapshot or return
`CONTEXT_GAP`. Never answer from revision 41 when the response requires commit 42.

For projection upgrades, build the new version separately to a complete cut,
validate it, then switch readers atomically. Keep version-bound cursors. A failure
must not advance the cursor or overwrite the active good view. Domain corrections
update/invalidate dependent views through their owner; rebuilding is not a source
of new domain facts.

## State-machine composition

Keep the existing [plan and choice lifecycles](state-delta-policy-projection.md)
and use separate state machines for turn, research request, action attempt,
choice and delivery attempt. A state machine owns its own transitions; it cannot
set another machine's status directly. Ordinary typed statuses and guarded
functions are sufficient; no state-machine framework is required. The owning
use-case processor coordinates accepted inputs/results and checks invariants
across affected lifecycles within one transaction.

| Input | Owner / guarded effect |
|---|---|
| Research request admitted | Request enters pending; blocking turn enters waiting |
| Research result accepted | Request finishes; turn becomes eligible for re-analysis |
| Deadline reached | Recorded timer event chooses configured timeout/fallback |
| Canonical response committed | Turn can close; delivery may still be pending |
| Voice interrupted | Attempt becomes interrupted; canonical meaning remains committed |
| Late old-epoch completion | Ignore for current delivery; retain attributed receipt |
| User resolves presented choice | Validate presentation/revision, then resolve choice and admit selected effects |

Timers persist their deadline and generation/attempt identity. Duplicate or stale
timer/results cannot revive terminal work. An external action's unknown outcome
needs reconciliation before retry. Process Manager state and outgoing work intent
share the commit boundary; use the existing event-driven outbox/inbox contracts
when durable delivery is required.

## Analyzer output profiles

Distinguish the model's semantic proposal from the bound runtime delta. The target
adapter supplies a versioned advertised schema for semantic operations, groups,
parts/candidates and required task handles only. It parses that output, rejects
runtime-owned envelope fields, resolves handles through the invocation manifest,
restores runtime bindings and validates the complete `StateDelta v3` before admission.
The advertised schema and restoration adapter remain required target bindings;
the packaged decoder/fixtures check the already-bound runtime form. Do not pass
that decoder directly to a model that was never given its envelope fields.

Default `analyzer-json@1` uses exactly one JSON object at each of these boundaries.
Reject duplicate keys, prose/fences, trailing documents, nonfinite
or unsafe numbers and excess depth/size. Use provider schema-constrained output
when supported by the selected adapter; schema validity never replaces admission.
The optional `analyzer-yaml@1` transports the same object using YAML 1.2, including
its JSON subset. No Markdown fences, introductory prose or second document. Use core
scalars, string mapping keys, finite JSON-compatible numbers, booleans, null,
arrays and mappings. Quote identifiers and ambiguous string scalars. Reject
duplicate keys, explicit tags, anchors, aliases, merge keys, non-string keys,
nonfinite numbers, excess depth/size and trailing documents before schema checking.
Reject unsafe numeric precision in the target language. A safe YAML parser alone
does not enforce this whole profile or the StateDelta schema.

Pipeline: configured JSON/YAML parse -> advertised semantic schema -> runtime
binding/reference resolution -> complete delta schema -> admission. Offline
already-bound decoding starts at the complete-delta boundary. Formatting/key order
is not semantic identity. Idempotency compares
canonical typed content using the target's versioned canonicalizer; retain raw
bytes/digest separately for audit. A key reused for different normalized content
fails. Formatting changes alone must not create a second effect. Bind the format
in the role/adapter configuration; never auto-switch after a malformed response.

The reference [JSON delta](../assets/analyzer-delta.example.json) updates two
policies and three fields; it matches the logical delta in the worked JSON trace.
The [optional YAML example](../assets/analyzer-delta.example.yaml) normalizes to
the identical value. JSON Schema validates either parsed value. A YAML adapter
needs its own parse/schema gate; JSON-only provider modes do not enforce YAML.

## Schema and value blocks

The default projection representation needs only named object boundaries, a
selected schema and matching values. Trusted profiles define field names, order,
types, descriptions and requiredness. Policy Engine/admission selects the allowed
profile and values for the role/task; rendering is a deterministic operation.
No generic transformation language or separate projection service is required.

```text
policy/catalog/schema assets in YAML or JSON + accepted state values
  -> safe decode and schema validation
  -> Policy Engine/admission selects and issues schema/value blocks
  -> deterministic render -> compact named text blocks
```

YAML/JSON parsing is deserialization; producing the model-facing text is rendering
or serialization to text. Do not parse that text back into authoritative state.
Already-typed database values need no YAML round trip. The existing Analyzer JSON
default and optional YAML output are independent of this source representation.
The target source decoder rejects duplicate keys, custom tags/aliases and invalid
types, and applies bounded input sizes. The existing StateDelta decoder is not a
general policy/catalog loader and must not be reused as one without an adapter.

Illustrative selected block, not a new runtime-envelope schema:

```yaml
object: Response style
schema:
  tone:
    type: string
    enum: [calm, neutral]
  format:
    type: string
    enum: [one_step, concise]
values:
  tone: calm
  format: one_step
```

The trusted schema can render once into the approved policy/catalog prefix:

```text
[Response style schema]
tone — calm | neutral
format — one_step | concise
```

The admitted values render separately in current task data:

```text
[Response style]
tone — "calm"
format — "one_step"
```

Emit each object's approved name once, nested objects as indented blocks and
arrays as ordered item lists. Use trusted schema order for fields and preserve
array order, scalar types, exact literals and absent/null/empty distinctions.
Unknown block-contract fields and invalid selected values return a gap; do not coerce or silently drop
required data. Escape untrusted values so they cannot create new block headings.
Selected schemas must exclude hidden fields and sensitive descriptions too.
Render schema details only when useful to the receiving role; a Composer may
need only the selected effects, while Analyzer needs the writable-slot schema.
Runtime provenance, access, revisions, cache keys and digests remain private.

Policies, catalogs and state use the same block mechanism, but preserve their
authority: approved rules/schema descriptions follow role instructions; accepted
values, observations and history stay in data blocks. Rendering cannot promote
state values into trusted instructions. The
[executable schema/value profile](executable-projections.md) now implements
supported-schema selection and mapping into the text assembler. General JSON
Schema interpretation, live authorization and provider tokenization remain
target bindings; use the documented supported subset, not arbitrary schemas.

## Policy Engine determines role input

The engine selects applicable approved policy definitions, evaluates their data,
and determines the role's policy effects, catalog visibility, required context and
allowed next work. It does not invent or rewrite policy definitions from model
output. Policy Engine and admission issue the selected role/task policy-state
slice using trusted projection helpers. The Context Compiler renders that issued
slice; it cannot query state, expand references, select more fields or change
policy decisions. Initial Analyzer, subsequent roles and frontend progress each
require their own scoped issuance under the canonical role-context contract.

Each projection rule binds source category, selector, source checkpoint/revision,
role/task/step/purpose, permission, transformation and missing-data behavior:

| Source | Downstream use |
|---|---|
| Current accepted input | Project relevant original text/evidence, preserving literal meaning |
| Earlier inputs/checkpoints | Select history, unresolved questions or memory only when needed and authorized |
| Analyzer input context | Reuse still-valid source references/content under a fresh role rule; do not forward its whole envelope or writable catalog |
| Analyzer output | Use admitted changes/evaluations; raw or rejected candidates remain outside Composer input |
| Current state and policy data | Read accepted values at the bound source cut, plus policy-selected obligations and response constraints |
| Approved definitions/catalog | Expose only the policy/field descriptions required by this role; keep stable profile material separate from current activation/data |

Thus Composer can receive a relevant excerpt from the input Analyzer saw, but
the reason is a Policy Engine projection rule, not inheritance from Analyzer.
Researcher gets its authorized gap/query; Voice gets canonical text and delivery
controls. The rule may select a smaller context or signal missing required data.
Previous inputs do not become higher-authority instructions through reuse.

## Model prompt view and plain text

The typed `AnalyzerContext`/`ComposerContext` envelopes are **runtime contracts**,
not prompt payloads. Never dump or losslessly serialize those envelopes to the
model. `context-blocks@1` and `compileBlocks` remain diagnostic codecs only;
`role-text@1` is the default model-facing format.

Policy Engine selects a `ModelPromptView`: ordered sections with trusted readable
headings and resolved semantic content. The offline shape is `{sections:[{title,
content}]}`; that structure is an internal compiler input, never the prompt text.
Content may contain nested objects or ordered lists when their meaning requires
it. `renderPromptView` emits headings, labelled lines and bullet items. It does
not select policies, summarize sources or invent missing content.

```text
[Current input]
"Я Олена. Я хвилююся. Поясни по одному кроку, без пошуку."

[Known facts]
Name — "Олена"
Source — "Користувач повідомив сам"

[Response task]
"Уточнити, що саме потрібно пояснити."

[Response guidance]
Language — "Українська"
Tone — "Спокійний, підтримувальний"
Limits — "До 4 речень, не більше одного запитання"
```

This is a shortened semantic example. The complete saved text examples are
illustrative Policy Engine selections, not direct serialization of full runtime
schemas. They contain no invented production prompt or provider result.

Runtime-only: checkpoint/context/invocation IDs, revisions, hashes, bindings,
source dependency vectors, timestamps used for expiry, idempotency keys, transport
ACL references and playback epochs. Keep them in a private `RuntimeManifest`
bound to the request and response outside model messages. A metadata-only change
must not alter any model-visible bytes. Model-visible: relevant input, accepted
facts, policy obligations, uncertainty, selected history/memory, next steps,
response requirements and task-relevant limits. A real domain date or identifier
must be preserved when it matters to the task; do not remove it by string matching.

Only expose reference handles when the model must cite evidence, choose an option
or identify a change target. For example `e1` labels an exact quoted source and
`conversation-identity.preferred_name` names a permitted slot. The manifest maps
these to immutable source/record identities and expected revisions. These handles
are task data, not permission. The Analyzer model's advertised output schema omits
runtime-owned envelope/revision fields; the adapter restores them from the bound
manifest before validating the internal StateDelta v3. Never require the model to
invent or echo hidden metadata. This is a target-adapter obligation; the offline
StateDelta fixture/decoder validates the already-bound runtime form.

Do not repeat a current message in both input and history, expose empty storage
collections by default, repeat facts through every policy cell, or copy a full
JSON Schema into every turn. Put stable field meaning, allowed operations and
output shape in the approved catalog prefix. Put current known values in a short
state section; missing/stale/conflicted values appear only if they affect the task.
Do not silently omit required confirmations, uncertainty or prerequisites.

Preserve arrays/order, labels, literal content, null/false/zero and meaningful
absence in the selected view. Omit entire irrelevant/empty sections by policy,
not during rendering. Strings are quoted with escaped line breaks so source text
cannot create a new structural heading; it remains untrusted data. Human-readable
headings and field labels come from registered templates. The renderer rejects
raw runtime envelopes and known metadata keys in semantic content. This is a
structural safeguard, not a substitute for access and semantic projection rules.

Budget actual model tokens after rendering, including fixed prefix and output
reserve. Re-project optional content under policy when needed; never truncate the
rendered text. Fewer characters are not proof of lower model cost or better answers.

## Stable prompt prefix and cache contract

Architecture specifies assembly and evidence requirements; Cascade Prompt owns
the actual role instructions. Construct the request in this order:

1. System prompt: stable shared agent identity, mission and global trust boundaries.
2. Role instructions after the system prompt: role responsibility, configured
   output format, evidence rules and plain-text input conventions.
3. Stable, authorized role/profile catalog after the role instructions: policy semantics, field
   schemas and fixed examples compiled as readable text blocks. Include only the needed profile.
4. Explicit cache boundary where the provider/model supports it.
5. Optional approved summary snapshot and immutable completed-history blocks.
   Place eligible history cache boundaries before the changing current projection.
6. Variable semantic context: relevant policy effects and accepted facts, changing
   memory/input, next steps and task-relevant limits. Runtime metadata is
   outside all model messages, including this suffix.

Keep the first three segments byte-stable for a fixed prompt/profile/format version.
The reference assembler emits system, developer (role instructions then catalog),
optional history data, and current user/data messages in that order. Adapters preserve that ordering and authority
using the provider's supported message types; the diagnostic prefix string is not
a claim about the provider's internal chat encoding. Runtime metadata remains
outside the messages.
Do not place current timestamps, session IDs or selected-state digests there.
Bind catalog/profile/identity and format versions in a stable deployment manifest;
changing one deliberately invalidates that prefix. Keep tools and provider output
settings stable too. A changed approved policy catalog selects/rebuilds the trusted
developer profile, deliberately invalidating the affected prefix. Only evaluated
policy effects and selected values belong in the data suffix; never move new rule
definitions there and rely on their text for enforcement. Do not expose additional
policies merely to increase cache hits. Preserve each role's own
prefix; Analyzer and Composer have different instructions.

Use an opaque cache namespace with the actual isolation scope, role, model and
prompt/profile version. A cache key is neither authorization nor a substitute
for an identical eligible prefix. Do not bypass revocation or retain forbidden
content to preserve cache reuse. The moving 20-turn window and changing summaries
may invalidate the suffix while the stable prefix remains reusable.

OpenAI documentation checked 2026-09-08 requires matching rendered prefixes;
eligible lengths, explicit breakpoints and retention vary by model. Place an
eligible breakpoint after the stable material when supported; a stable beginning
alone need not create a reusable cache entry. Measure cached input tokens, cache
writes where exposed, total input tokens, latency and realized cost over cold/warm
requests and a changed-catalog case. Do not hard-code a universal threshold or
claim good cache hit rates from local string equality.
[Provider reference](https://developers.openai.com/api/docs/guides/prompt-caching).

The [iterative caching contract](iterative-context-caching.md) defines assembly
for all four roles, optional `historyViews`, private cumulative cache candidates,
checkpoint-derived history, recent-memory placement, compaction and invalidation.
Conversation persistence and local rendering reuse are distinct from provider caching.

## Agent and prompt authoring rules

Apply these rules whenever writing a blueprint, role, workflow or prompt brief
for this pattern; consumers should reference this contract/version rather than
fork its semantics:

1. Name one owner for state, each canonical fact, policy definitions and response
   meaning. Analyzer proposes only typed delta in the configured transport;
   Composer renders only its contract.
2. Define the checkpoint group before adding persistence objects. Derive turn
   views from root/child input lineage; use separate records only for independent
   domain/delivery lifecycles or bounded physical storage.
3. Show a delta that updates at least two policies, plus reference/dependency and
   conflicting-candidate behavior. Field types and ownership stay explicit.
4. Separate source refs, proposal-local refs, stable record refs and definition
   versions. Every required model-facing ref includes resolved permitted content.
5. Define admission, current-state update, context selection and text compilation
   as distinct responsibilities. Add event fold/read-model maintenance only for
   a selected optional profile.
6. Preserve the selected semantic view during text rendering. Show objects, arrays,
   empty/null/absent values, provenance and literal strings in an actual example.
7. Keep policy definitions/instructions separate from user claims and policy data;
   never promote data text into instruction authority while compiling.
8. Describe stable prefix/profile and variable suffix explicitly. Bind cache
   boundary/settings in the provider adapter; measure token usage and cache reuse.
9. Define stale-reference, retry, timer, cancellation and no-op behavior. Add
   projection-lag/replay gates when those profiles are selected; a rebuild must
   not execute external effects.
10. Pair each claim with its evidence class: schema/codec checks, runtime/store
    tests, semantic model evaluation, or provider/physical voice observation.

## Evidence and adoption gates

Offline checks must cover YAML ambiguity/duplicates/tags, schema equivalence,
multi-policy deltas, semantic text preservation with critical literals and hostile strings,
stable prefix bytes across state changes, and changed-catalog invalidation.
Source revocation, transition races, actual token budgets, model output reliability
and provider cache performance require target integration tests. Add committed-event
reconstruction and projection restart/gaps/atomic cursor tests only for selected
optional profiles. This package supplies
reference serialization and contract examples, not a running Policy Engine.

From this skill directory, using the host's existing dependencies:

```bash
bun test ./scripts/context_transport.test.mjs
bun test ./scripts/projection_blocks.test.mjs
bun scripts/projection_example.mjs
python3 scripts/test_agent_contracts.py
bun scripts/context_transport.mjs decode-json assets/analyzer-delta.example.json
```

`decode-json` (or optional `decode-yaml`) only normalizes transport. Pass its parsed result through the schema
and invocation gates; it is never an admission command. The tests perform that
cross-check against the complete worked fixture. No package installation is implied.

Pattern sources: [CQRS](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs),
[materialized views](https://learn.microsoft.com/en-us/azure/architecture/patterns/materialized-view),
[event sourcing](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing),
[pure transitions](https://stately.ai/docs/pure-transitions), and
[Process Manager](https://www.enterpriseintegrationpatterns.com/patterns/messaging/ProcessManager.html).
