# StateDelta, policy data, and role projections

Contract ID: `state-delta-policy-projection`\
Version: `2.3`
Status: `reference-design`\
Parent: [Analyzer–Policy Engine–Composer](analyzer-policy-composer.md)

This is a design contract for target implementations. It does not register a
state store, execute policy, or prove model behavior. The
[worked trace](../assets/state-delta-policy-projection.example.json) illustrates
the field identities and before/delta/after/context relationship.

## Wire authority and validation

[agent-contracts.schema.json](agent-contracts.schema.json) owns the versioned
logical shapes. This document owns lifecycle and enforcement semantics. Pattern 2.3
uses `state-delta.v3`, `analyzer-context.v2` and `composer-context.v2`; all other
wire IDs are declared by their definitions. Unknown versions and fields fail
closed. Do not reinterpret old payloads as the new version; rebuild contexts from
canonical source and re-analyze pending deltas after a target-controlled upgrade.
Policy, projection, identity, memory, plan, delivery and authorization bindings
are independent context dependencies, including their digests.

Use [event projections and context format](event-projections-and-context-format.md)
for checkpoint grouping, committed events, read-view cursors, multi-policy
references and state-machine coordination. Analyzer transport defaults to `analyzer-json@1`; `analyzer-yaml@1` is optional;
role inputs are `role-text@1` semantic text sections selected under policy. The
typed envelopes below are runtime contracts; their metadata stays in a private
manifest. Never serialize the complete envelope into model input. Preserve only
task-relevant evidence/target handles, resolved meaning and operative constraints.
JSON Schema remains the logical value validator, not a requirement to send JSON
to a model. Keep raw transport hashes separate from canonical typed identities.

The packaged validator checks schemas, invocation field/block registries,
selection receipts, candidate atomicity, revision arithmetic, projection paths,
source-window coverage and plan graph closure. It does not execute policy rules,
prove semantic entailment, enforce a database transaction, or validate an ACL.
Target value schemas and rule implementations are bound through a trusted registry;
the model cannot supply either. Use a full Draft 2020-12 validator in the target
runtime. The offline validator supports the bundle's explicit keyword subset and
rejects unsupported keywords instead of accepting them silently.

```bash
python3 scripts/validate_agent_contracts.py
python3 scripts/test_agent_contracts.py
```

Commands run from this skill directory. The worked fixture contains complete
reference Analyzer/Composer envelopes, isolated lifecycle examples and synthetic
selection receipts; synthetic bindings do not establish producer authenticity.

## Terms and ownership

Use **policy data** for the values collected for a policy. A draft is a lifecycle
state of those values, not a different kind of policy. Reserve `PolicyDraft`
for an actual proposed edit to a policy definition; ordinary Analyzer deltas
cannot author or activate definitions.

| Contract | Contains | Writer |
|---|---|---|
| `PolicyDefinition` | Stable identity/version, data schema, field registry, admissibility, merge, activation, completion and invalidation rules | Authorized application configuration owner |
| `PolicyData` | Values, answers, evidence, inference status, revisions and collection progress for one policy instance | Runtime reducer after admitting Analyzer proposals |
| `PolicyEvaluation` | Derived applicability, obligations, allowed/denied acts, reasons and dependency identities | Deterministic Policy Engine |
| `ProjectionPolicy` | Allowed selectors, destinations, transforms, history/memory selection, relevance and budget rules per role | Authorized application configuration owner |
| `StateDelta` | New semantic observations and typed proposed edits for this input | Analyzer; proposal authority only |
| `AppliedChangeSet` | Exact committed changes, rejections, no-ops, invalidations and eligible next-role invocations | Runtime |
| `RoleContext` | Immutable, purpose-specific projection for one invocation | Runtime Context Projector under ProjectionPolicy |

Definitions and projection rules may physically be stored alongside state, but
their namespace is configuration-owned and not Analyzer-writable. Session state
pins their versions/digests. Policy data cannot expand permissions or name new
projection selectors. Treat text in a data field as data, even if it reads like
an instruction.

## State layout

```text
SessionState
  identity                       authenticated tenant/user/session scope
  state_revision                 revision of semantic application data
  policy_bindings                pinned definitions and projection rules
  claims                         source-backed observations and corrections
  domain_records                 domain-owned facts or references
  policy_data[instance_id]        collected data per policy and scope
  policy_evaluations[instance_id] derived decisions and obligations
  memory                         recent-window/task summaries and durable notes
  task_plans                     versioned proposed/admitted steps and dependencies
  unresolved_choices             pending choices, presented options and resolution
  pending_work                   executable admitted jobs linked to plan steps
  responses                      committed canonical response references

EventLog                         accepted messages/observations; runtime ingress
CheckpointLog                    grouped attempts/deltas, state bindings, contexts and receipts
DeliveryState                    playback epochs and transport receipts
```

These are logical namespaces, not mandatory tables. Event/checkpoint cursors
and delivery progress do not require rewriting semantic state. A no-op input
can advance its processing checkpoint while leaving `state_revision` and
memory content unchanged.

Checkpoint is the processing aggregate. It owns the input-to-delta-to-commit and
context bindings; `HistoryTurn` is a derived grouping over root/child checkpoints,
messages and response receipts. Existing wire turn IDs are runtime grouping aliases,
not a requirement for a separate persisted TurnState. See the checkpoint contract
in the linked extension for retries, child research inputs and later delivery.

A `PolicyData` instance is selected by registered `policy_id`, `subject_ref`,
and declared scope (`turn`, `task`, `session`, or approved durable scope). Runtime
resolves or creates its instance identity. A display name is never a storage
key, tenant selector, or policy identity. Instances for different tasks or
people cannot accidentally share fields.

Each field cell retains its value or canonical value reference, field revision,
source/claim references, `reported | observed | inferred` support, lifecycle
(`present | cleared | conflicted | expired`), scope/expiry, and last-changing
event. Use one authoritative value: project a claim/domain reference when it
already owns the fact, rather than copying independently mutable values into
multiple policy records. Derived caches declare source revisions and refresh
atomically or are invalidated.

Record collection status (`empty | partial | ready | conflicted`) and policy
activation separately. Runtime derives these from the definition. The Analyzer
cannot set `ready`, `verified`, `authorized`, or `completed` as a shortcut.

## What the Analyzer receives

Provide the accepted finalized event, a runtime-issued input-context identity,
base state revision, checkpoint identity, relevant current policy instances and
their field revisions, unresolved questions, scoped claims/memory, and the
registered extraction contracts. For each writable field, expose canonical
`policy_id`, `field_id`, type/enumeration, merge semantics, permitted support
classes, source requirements and scope. Do not expose unrelated fields.

The runtime binds identity, base revision, checkpoint and idempotency key; the
model may echo them but cannot choose their authoritative values. In particular,
the base revision is not a request to read arbitrary historical state.

### AnalyzerContext

The Analyzer receives one immutable `AnalyzerContext`, compiled for the exact
event and purpose:

Wire definitions: `AnalyzerContext`. See the corresponding `$defs` in
[agent-contracts.schema.json](agent-contracts.schema.json).

`ConversationBackground` explains the current task, phase, entities, claims and
open questions. `ContinuityContext` supplies the bounded dialogue record and
recent memory, while `NextStepContext` supplies the current task's admitted work
and lifecycle. Together they let the Analyzer recognize novelty, corrections,
answers and missing information without reading the whole state. Each block states
what was omitted or unavailable as a typed limitation without leaking the omitted
values.

`writable_targets` is the model-visible policy-field write catalog. Other proposal
operations require the explicit `output_contract.allowed_operations` allowlist
and their registered schemas; they do not acquire field-write authority. It declares canonical
policy/instance/field identities, current field revision, value schema, supported
operations, evidence/support requirements and merge/expiry behavior. Supply the
registered `value_schema` inline as well as its reference; similarly expose each
block part's `feature_schema`. Analyzer has no tools to dereference schema IDs.
Runtime compares these constraints to its trusted registry; the model cannot
replace them. A background
field that is absent from `writable_targets` is read-only. This prevents contextual
visibility from becoming mutation authority.

The Analyzer uses background only to classify input and propose delta operations.
It does not emit response prose or formatting instructions. It may propose typed
response observations or intent data, such as `concern`, `one_step_at_a_time` or
`ask_one_question`, through registered policy-data fields. Policy Engine decides
whether and how those values become Composer constraints.

Analyzer responsibilities are bounded:

1. Identify new information, a correction, answer, preference, knowledge gap,
   or meaningful memory update relative to the supplied projection.
2. Ground each proposed value in an exact source reference; classify inference
   explicitly and preserve the literal source separately from normalization.
3. Map the information only to supplied canonical policy/field identities.
   Ambiguous names become an unresolved observation/question; no fuzzy write.
4. Emit known unambiguous changes as direct update groups. For each registered
   analysis block, emit independently selectable parts and multiple candidates
   when evidence supports several interpretations. Missing information produces
   no field edit. Return an empty delta when nothing changed.

## StateDelta wire contract

Wire definitions: `StateDelta`, `AnalysisBlock`, `PolicyFieldChange`. See the corresponding `$defs` in
[agent-contracts.schema.json](agent-contracts.schema.json).

`JsonValue` is a target-schema extension point, not permission for arbitrary
objects. Runtime validates the registered field's actual JSON Schema. Envelopes
and operations reject unknown keys and impose count/size limits. `Operation`
is the target's closed tagged union: this profile adds `change_policy_data` to
the versioned `propose_claim`, `supersede_claim`, `resolve_question`,
`request_research`, `propose_action`, `propose_memory`, `resolve_choice` and
`propose_plan_change` contracts. Bind every
enabled operation to its full target schema before implementation; unsupported
operations are rejected, not passed through.

`groups` carries simultaneous, non-alternative updates. It may contain many
operations across different fields, policy instances and record types. One group
is atomic; separate independent groups may produce a `PARTIAL` result. The same
delta can therefore update a name, response style, task phase and collection
entry in one Policy Engine invocation without flattening them into one record.

`blocks` carries interpretations that still need selection. A block is a named
Analyzer capability such as intent, entity, emotion, response need or research
need. Each block has independently selectable semantic parts; each part can
contain several candidates, and each candidate can propose several atomic update
groups. This avoids a Cartesian list of whole-state alternatives while preserving
which source fragment and Analyzer part produced every option.

Block IDs, part IDs, selection modes, selection-policy references, allowed
features, candidate/group/operation ceilings and candidate output schemas come
from the `AnalyzerContext` block contract. The Analyzer cannot invent selection
code, cardinality or cross-part constraints. `selection_features` is validated
against that registered schema and remains data. A model score helps rank or
route review but cannot establish truth, authorization or policy precedence.

All groups inside one selected candidate form one atomic candidate unit: if any
operation, dependency or invariant fails, none of that candidate's groups apply.
This does not reject unrelated direct groups or candidates from other parts
unless a declared cross-part invariant joins them.

Use `apply_all_eligible` for independent set-like findings. Use
`choose_zero_or_one` when ambiguity may remain unresolved, `choose_exactly_one`
only when the target can supply one choice or a typed gap, and `ordered_fallback`
only with configuration-owned ordering. Two candidates that write conflicting
values to the same scalar cannot both be selected. If policy cannot choose
safely, it selects none and returns `REQUIRE_INPUT`, `DEFER`, or a review
obligation. It never applies every variant to preserve ambiguity.

Do not manufacture variants for wording diversity. Candidates represent
materially different semantic interpretations or actions with different state
effects. Known multiple collection values belong in direct `add_item` operations
or `apply_all_eligible`; alternative scalar interpretations belong in a
single-select part.

Field rules are explicit:

| Operation or condition | Meaning |
|---|---|
| Field absent from delta | Preserve current value |
| `set` / `set_ref` | Proposed replacement after source, type, scope and revision checks |
| `clear` | Explicit retraction; preserve required audit lineage |
| `add_item` | Add a typed set/map entry under registered identity rules; duplicate equal entry is a no-op |
| `remove_item` | Remove the exact entry; no match is a no-op unless the definition requires an error |
| `null` | A value only when the field schema permits it; never an implicit deletion |
| Same scalar value | No field revision change unless new evidence/support changes its meaning |
| Conflicting changes to one scalar | Reject the group or create a declared conflict; never depend on JSON ordering |
| User correction | Supersede referenced evidence/value according to policy; no silent history rewrite |

Collection keys must resolve against the registry/current instance. Aliases and
normalization rules are explicit and versioned. Unknown keys, policies, roles,
fields, or ambiguous subjects produce a typed rejection or question. Operations
cannot edit definitions, evaluation results, projection contracts, receipts,
host identity, or generated revision numbers.

A research request is an explicit `request_research` operation linked to its
knowledge gap and any supporting policy-data changes in the same atomic group.
Filling a `research.query` field alone never starts work. Pending requests and
knowledge-gap data reference one canonical record rather than duplicating query
state. Similarly, an action-related field or response intent cannot itself
authorize a domain action.

## Applying a delta and updating records

The runtime preallocates event/checkpoint identities, then binds the delta to
that invocation. Before any change, verify schema, authenticated scope,
input-context identity, bound policy versions, allowed operations, source
references and idempotency. Under the authenticated scope, check an existing
idempotency receipt before rejecting an old base revision: an identical completed
request returns that receipt without another write or dispatch. Reusing a key with
different canonical typed input/delta content is rejected; YAML key order or
whitespace alone is not a different semantic request. A new attempt checks current
base revision and policy bindings; stale input is re-analyzed under a new
runtime-issued invocation key. Exactly one concurrent CAS can win.

Envelope/scope/revision failure rejects the whole delta. Otherwise validate each
block/part/candidate, run its registered selection policy, and compile only
selected candidate groups together with direct groups. Evaluate the compiled
groups in dependency order. Cycles or missing dependencies are invalid. A group
is atomic: if a claim, field update, or linked request is denied, none of that
group's dependent effects are admitted. Independent groups may still succeed.
If a predecessor is rejected, skip its dependent groups with an explicit reason.

Prepare each group in an isolated staging view; no group may commit or dispatch:

1. Resolve policy instances and exact record/field identities from runtime scope.
2. Apply field schemas, evidence rules, expiry, consent and merge/clear rules.
3. Build a candidate change set; validate cross-field/domain invariants.
4. Evaluate affected policies against the candidate state and current authority.
   Evaluate dependent policies in a declared acyclic order; do not iterate models
   until they agree. Cycles need an explicit bounded target design or are invalid.
5. Accumulate accepted values, derived evaluations, record updates, invalidations
   and proposed dispatch intents in the envelope staging view. Roll back an entire
   candidate unit on any member failure; do not keep its earlier staged groups.

After staging all eligible groups and candidate units, validate invariants across
all accepted groups. If they
conflict, reject the conflicting transaction or apply a predeclared deterministic
conflict rule; never publish a state assembled from individually valid but
jointly inconsistent groups. Only then perform one transaction/CAS for the entire accepted change set, its
receipt, checkpoint and dispatch intents. Advance semantic state revision exactly
once if any semantic record changed; advance each changed field once. A partial
receipt means that only independent eligible groups were included in this single
transaction. Persistence failure rolls back the whole transaction.
Across stores, publish no success until the target's durable consistency contract
and receipts resolve the outcome.

Evaluate applicable runtime transitions even for `groups: []` and `blocks: []`:
expiry, cancelled
work, revoked access, or a turn boundary can invalidate earlier policy data and
projections. Empty Analyzer output means no proposed semantic additions, not
permission to skip those checks. Report `NOOP` only when neither accepted
operations nor required runtime transitions change semantic state.

`AppliedChangeSet` contains input identity, `APPLIED | PARTIAL | NOOP | REJECTED`,
before/after revisions, per-block/part/candidate `selected | deferred | rejected |
ineligible` decisions with policy reasons, per-group/op `applied | noop |
rejected | skipped`, exact
changed record/field references and revisions, policy-evaluation references,
invalidated projection/memory/work references, checkpoint reference, and eligible
next invocations. Sensitive values may be represented by protected references
or digests in audit records. The target binds their visibility and retention.

Derived field completion is not evidence of task completion. A Composer receives
successful external action status only from a verified executor receipt.

## Deferred choices and subsequent answers

`UnresolvedChoice` is a runtime-owned state record, not only an audit message.
When selection defers, commit one choice per unresolved part in the same state
transaction. Bind task/subject scope, origin delta, block/part, candidate IDs and
immutable candidate proposal snapshots, base revision, selection-policy version,
question, expiry and evidence. Candidate snapshots remain in the protected delta
ledger; the role receives the authorized question and option labels through
resolved reference content. Never expose rejected private alternatives.

Lifecycle: `pending -> resolved | expired | superseded | cancelled`. Runtime can
append a question-presentation receipt and advance choice revision while pending.
The receipt records the exact presented candidate order and canonical response
identity. Only a later `resolve_choice` proposal with that presentation identity,
expected choice revision and new evidence can select an option. Resolve “the
second one” only against that exact presentation. If more than one question could
be meant, ask; JSON candidate order is not presentation order.

Resolution does not replay an old delta. Runtime rechecks scope, expiry, source,
current field revisions and policy; stale proposals require re-analysis. Admit
all groups of the selected candidate atomically, update its choice and supersede
losing proposals. Terminal choices cannot be reopened by replay; create a new
linked choice when the question changes. New unrelated input does not erase a
pending question. The Composer can phrase the admitted question but cannot choose
an alternative or commit its resolution.

## Plan ownership and step lifecycle

`task_plans[task_ref]` owns stable step IDs, `plan_revision`, dependencies and
status. `pending_work` owns executable jobs linked to admitted steps. Questions,
waits, explanations and handoffs are plan steps even when they create no job.
`NextStepContext` is a read projection of that plan and current receipts.

Analyzer emits `propose_plan_change` with expected plan revision, local IDs for
new steps, supersession pairs, cancellation suggestions and evidence. Runtime
allocates stable IDs once, records the local-to-stable mapping in the receipt,
resolves dependencies and validates the graph before commit. New steps are
`proposed`; the model cannot set `authorized`, `in_progress` or `completed`.
Registered ownership and action contracts constrain each proposed step owner.
Superseding a step requires a replacement and explicit treatment of every
remaining dependent step; do not silently redirect its meaning. Cancelling an
in-flight side effect may leave `unknown_outcome` until reconciliation.

Allowed runtime transitions:

| From | To | Required evidence/decision |
|---|---|---|
| proposed | awaiting_confirmation, authorized, blocked, cancelled, superseded | Policy evaluation; replacement for supersession |
| awaiting_confirmation | authorized, blocked, cancelled, superseded | Scope-bound confirmation or a denying/superseding decision |
| authorized | in_progress, blocked, cancelled, superseded | Prerequisites plus dispatch receipt, or withdrawal before dispatch |
| in_progress | completed, failed, unknown_outcome, blocked, cancelled | Executor/delivery/input receipt; cancellation acknowledgement for cancelled |
| unknown_outcome | completed, failed, cancelled | Reconciliation receipt; no blind retry |
| blocked | proposed, awaiting_confirmation, authorized, cancelled, superseded | Re-evaluated cause and current policy |
| failed | proposed, cancelled, superseded | Bounded retry policy and a new attempt identity |
| completed, cancelled, superseded | none | A new linked step is required for new work |

A question step completes under its specified delivery rule; its associated wait
step completes only after an admitted matching answer or stop event. Explanation
completion distinguishes canonical publication from required voice delivery.
An action requires an executor receipt, and research requires its result receipt.
Question wording and a model saying “done” cannot satisfy an action oracle.

## Scheduling, failure and context resolution

A turn decision explicitly chooses `compose`, `wait_for_research`, `request_input`,
`dispatch_action`, `status`, or `stop` under registered rules. Research requests
mark `response_dependency: blocking | nonblocking`. Blocking research prevents a
substantive canonical answer until its result is admitted or its deadline selects
a fallback. A bounded acknowledgement can precede it under a separate response
purpose. Nonblocking research cannot silently replace an already published answer;
an authorized follow-up receives a new response revision and purpose.

Serialize semantic state commits per session through CAS; route and validate
against one accepted snapshot. A new relevant user input invalidates stale work,
while unrelated input need not cancel every outstanding job. Bound total analysis
attempts, research rounds, semantic response repairs, wall time and tokens across
the entire task. Invalid model JSON gets a bounded repair or terminal gap, not an
unbounded retry. A safe fixed runtime error message may explain an unavailable
service without introducing domain claims. Log the actual failed stage.

Because Composer has no retrieval tools, the projector must resolve every reference
needed to understand or render the answer into authorized content. Keep compact
IDs for traceability, but bind an excerpt/label/value in the appropriate context
block or knowledge evidence. Missing required referenced content is `CONTEXT_GAP`.
The private audit manifest can retain additional references without disclosing
content. Revalidate authorization and all dependency bindings before publication;
a schema-valid model output still needs grounding checks and a bounded fallback.

## ProjectionPolicy and RoleContext

The Policy Engine decides what is permitted and which next work is eligible.
The deterministic Context Projector compiles that accepted state under a
versioned `ProjectionPolicy` and validates the destination role's input contract:

The reference registry binds Analyzer to `AnalyzerContext`, Main Composer to
`ComposerContext`, Researcher to `ResearchRequest`, and Voice Composer to
`VoiceContext`. Additional roles require a trusted registry entry and a versioned
input schema; a model-supplied role or contract name cannot register itself.
Research and voice use `history_mode: none` in the baseline: their bounded request
and canonical delivery input already carry the authorized task content. Giving
either role history or memory requires an explicit input-contract extension and
projection rules, rather than copying the Composer envelope.

```text
RoleContext = project(
  accepted state revision,
  admitted policy evaluations,
  projection policy version,
  destination role + purpose + invocation,
  current authorization + channel + budget
)
```

The full state may be available internally to the projector; it is not its
default output. Neither the Analyzer nor policy data supplies executable
selectors. Every projection rule declares:

- Stable rule identity, destination role, purpose and activation predicate.
- Registered source selectors (state, policy data/evaluation, claims, messages,
  summary, pending work or receipts) and dependency identities.
- Destination field and input schema; one owner or explicit conflict rule.
- Permitted support classes, freshness, scope, sensitivity and required authority.
- Allowed transforms: reference resolution, approved normalization, enum-to-style
  mapping, filtering, deduplication, redaction and deterministic formatting.
- Required/optional priority, max items/tokens, expiry, and missing-data behavior.

Define an explicit impact predicate for optional fields: current user request,
active task, unresolved question, allowed action, response constraints, or
retrieval need. Include mandatory safety/permission obligations even when they
do not change answer wording. A model may suggest relevance as policy data;
the selector and disclosure authority remain deterministic.

Select and validate role/purpose → evaluate activation → resolve source values
from the same revision → apply access/freshness/support checks → map and merge
fields → redact/dedupe → pack under budget → validate role input → freeze a
manifest. If required content cannot fit or a required value is missing, return
`CONTEXT_GAP`; never drop a hard requirement or fall back to full-state exposure.

`RoleContext` binds `context_id`, `schema_version`, `role_id`, `purpose`,
`invocation_id`, `state_revision`, event/checkpoint, definition/projection
versions and digests, authorization scope reference, source dependencies,
expiry, selected payload and output contract. The audit manifest records which
rules included/transformed/omitted which references and why. Keep hidden data
and denied-value metadata out of the role payload; an audit manifest need not
be sent to the model. Revalidate dependencies/authority before dispatch and
publication. Never mix fields from different state revisions unintentionally.

| Role | Typical projection | Excluded by default |
|---|---|---|
| Analyzer | Current event, writable policy field registry/current values, unresolved questions, bounded continuity, disclosed next steps and accepted evidence | Unrelated tasks, full private store, mutation credentials |
| Main Composer | Admitted facts, pending question, response intent/style, allowed acts, required caveats, bounded continuity, disclosed next steps and action receipts | Raw deltas, complete policy definitions, unrelated policy data, retrieval tools |
| Researcher | One authorized gap/query, source/ACL restrictions, identifiers needed for search, evidence contract and budgets | Whole conversation, tone/emotion history, unrelated memories, publication rights |
| Voice Composer | Approved canonical/spoken text, pronunciation/pace/prosody enums, language, response revision and delivery epoch | Original emotion observations, full history/memory, mutable domain facts and tools |
| Additional role | Registered role-purpose projection and output schema | All state fields without a rule; unregistered roles never receive a default dump |

Context is input, not permission to publish or execute. A valid context without
an eligible invocation creates no work. A memory/policy-data update need not
activate a Composer or Researcher. Research activation additionally requires
the explicit admitted request. Voice activation requires committed canonical
text and a currently enabled voice session.

## IdentityContext and PolicyContext

Keep authenticated identity separate from self-reported profile data:

Wire definitions: `IdentityContext`. See the corresponding `$defs` in
[agent-contracts.schema.json](agent-contracts.schema.json).

The runtime owns `authenticated_scope_ref`, actor/session/tenant binding, roles
and capabilities. `projected_profile` contains only policy-approved fields such
as preferred name, language or accessibility preferences. It is data with
provenance, not authentication evidence. A user saying “I am an administrator”
can create a reported claim but cannot change `role_refs`. For multi-participant
or voice sessions, preserve speaker/participant references and never infer a
speaker from text alone.

Each role receives a minimal identity projection. Analyzer may need canonical
speaker, session scope and writable subject/instance mapping. Main Composer may
need preferred form of address, language and relevant relationship, but usually
not tenant IDs or permissions internals. Researcher receives only opaque scope/
ACL references needed by its adapter. Voice Composer receives language/voice
preferences and active delivery identity, not account profile or authorization.

`IdentityContext` remains a separate top-level input block for Analyzer and Main
Composer. Use `minimal` for ordinary turns, `personalization` when approved
attributes affect interpretation or presentation, `identity_answer` for identity
questions, `introduction` for policy-required first
contact, and `capability_disclosure` when limitations or a handoff require an
explanation of the agent role. Every expansion binds its activation rule.
In identity-answer mode project only authorized attributes for the requested
subjects. An agent's self-description comes from a trusted, versioned agent or
product identity definition, never from model memory. Unknown or non-disclosable
attributes remain unknown instead of being inferred.

Modes are compiled per role invocation. The first Analyzer pass can use `minimal`
identity to classify an identity-related request from the accepted event. After
that proposal is admitted, Policy Engine can expand the Main Composer's
`IdentityContext` to `identity_answer`; an Analyzer re-invocation receives the
expanded mode only when a registered extraction contract actually requires it.

Wire definitions: `PolicyContext`. See the corresponding `$defs` in
[agent-contracts.schema.json](agent-contracts.schema.json).

The context carries selected policy data and evaluated effects, not a mutable
copy of every definition. Stable enum/rule IDs refer to trusted runtime-owned
definitions. Free text from policy data stays in the data channel and cannot be
promoted to an instruction. A destination sees a denial reason only when the
ProjectionPolicy permits it; it never receives secret rule inputs merely because
the rule matched.

Identity and policy contexts are independently versioned and invalidated. A role,
permission, consent, tenant/session, policy definition/evaluation or projected
profile change invalidates dependent RoleContexts before dispatch or publication.

`AgentIdentityDefinition` is a configuration-owned, digest-bound definition of
agent identity, mission, capabilities, limitations and approved self-description.
It is separate from the authenticated human/service actor and from reported
participant attributes. Every projected attribute names its subject explicitly.
Both Analyzer and Composer receive the minimal agent mission and limitations;
expanded presentation remains controlled by the identity activation rule. A user
claim cannot replace this definition or the actor authentication binding.

Wire definitions: `ConversationBackground`, `ContinuityContext`, `NextStepContext`. See the corresponding `$defs` in
[agent-contracts.schema.json](agent-contracts.schema.json).

Each ProjectionPolicy chooses a subset of these shapes. Empty arrays explicitly
mean that the category was selected and has no entries. An omitted category was
not selected, unavailable, or forbidden and must be named in
`omitted_categories` when that distinction can affect role behavior.

One continuity turn begins with one finalized accepted user input and contains
an ordered `messages[]` list. Each message binds its role, speaker, source and
canonical response revision when applicable. The turn is `open` until its
response/termination decision and `closed` afterward; closure is not delivery. The current accepted event can appear as an open turn only when
`includes_current_event` is true. Streaming fragments, speech filler, tool
payloads, hidden reasoning and audio frames do not count as turns. Twenty turns
is the reference profile's hard maximum; a target can select fewer under its role
budget. `formatted_history` preserves speaker attribution, order, corrections,
negation, critical literals and response delivery status while excluding
unrelated or forbidden content. `commit_status` belongs to the canonical message;
`delivery_attempts[]` independently records text/voice attempts, epochs, segment
acknowledgements and receipts. Text can be delivered while one voice attempt is
interrupted and a later repeat is delivered. Never overwrite the first attempt
or attribute a participant from message text. Delivery revision changes invalidate
continuity contexts even when the semantic state revision stays unchanged.

`continuity.recent_memory` is a short semantic projection over at most the
selected twenty-turn window. It is not derived by truncating an older cumulative
summary. It binds the exact selected turn set and coverage. Moving the window
invalidates that projection until a summary of the new range is admitted. It carries references for facts, decisions, unresolved
questions and preferences instead of turning the summary into new evidence.
`empty` is a valid first-turn or no-memory result; `stale` and `blocked` memory is
withheld or named as a limitation, never silently treated as current. History
preserves what was said; recent memory preserves what remains relevant. Separate
`memory.task_summary` carries the admitted cumulative task summary with its own
coverage, and `memory.relevant_durable_memory[]` carries current approved facts
and preferences from earlier tasks or turns. An important decision from turn 1
can therefore survive at turn 50 without pretending to be part of the recent
window. These are references/projections of one memory owner, not extra copies
of independently writable truth. The
projector deduplicates their overlap within one budget. Current input, hard policy,
pending questions and next-step safety fields take precedence; if these cannot fit,
the runtime compacts under a registered rule or returns `CONTEXT_GAP`.

`NextStepContext` contains every current-task-relevant step authorized for
disclosure to the role, including prerequisites, confirmations, dependencies and
real receipts. It excludes unrelated or forbidden work and names material
omissions. A step is `completed` only when its completion rule and receipt are
satisfied; generated intent or process liveness cannot substitute for completion.
`unknown_outcome`
preserves uncertain side effects instead of inviting an unsafe retry.
The Main Composer reference projection uses
`complete_for_authorized_task_projection`. A `partial` projection is valid only
for a role and purpose whose output cannot depend on omitted steps; otherwise the
projector returns `CONTEXT_GAP`.

## ComposerContext and ResponseContract

Main Composer receives accepted facts and an explicit response contract:

Wire definitions: `ComposerContext`, `ResponseContract`. See the corresponding `$defs` in
[agent-contracts.schema.json](agent-contracts.schema.json).

Composer `background` is a different projection from Analyzer background. It
normally includes the current user goal, task/interaction phase, pending question,
relevant entity labels and active response intent. `continuity` supplies compact
history and recent memory; `next_steps` supplies the admitted current-task work
and status needed for the answer. These blocks exclude writable field catalogs,
rejected raw deltas, unrelated policy data and hidden chain-of-thought. The
Composer uses them to answer consistently, not to derive new state.

`ResponseContract` tells the Composer both *what response act is permitted* and
*how to render it*. Policy Engine constructs it from admitted policy evaluations
and channel constraints. The Composer chooses wording within that boundary and
returns a `ResponseCandidate` tied to `context_id`. It cannot silently change
`answer_mode`, add a forbidden action, omit a required disclosure, exceed a hard
format limit, initiate research, or rewrite state. Candidate validation checks
schema, required/forbidden elements, claim references and current context before
canonical commit.

Composer reminders or response guidance are policy output, not conversational
memory. The engine compiles trusted rule IDs into `response_intents`, style and
format enums, required/forbidden elements, disclosures and allowed response acts;
their versioned rule/evaluation references remain in the context dependencies.
Do not copy arbitrary free text from memory or `PolicyData` into an instruction
position. This keeps guidance enforceable while `recent_memory` remains factual
continuity data.

Formatting and style use registered enums or schema references, not arbitrary
prompt fragments stored in policy data. If two style rules conflict, Policy
Engine resolves them before composition using declared precedence and records the
decision. Hard safety, truthfulness, confirmation and accessibility obligations
outrank tone preferences. A missing required response constraint yields
`CONTEXT_GAP`; the runtime does not pass a vague “respond appropriately” fallback.

## Tone, emotion, and response intent

Use separate typed fields such as `response-style.requested_tone`,
`response-style.emotion_observation`, and `response-style.response_intent`.
Explicit preferences and transient inferred cues have different provenance and
expiry. An inferred cue is uncertain, scoped to the current turn or short task
window, and cannot become a durable personality/health label. Current explicit
user preferences outrank older style hints unless a hard policy restricts them.

The engine can map an admitted concern cue to `acknowledge_concern`,
`plain_language`, `one_step_at_a_time`, or `ask_one_question`; a projection maps
those approved enums to the Composer's response constraints. Free-text data
cannot become a system instruction. Avoid deception, unsupported reassurance,
or assuming a diagnosis from wording. Style changes cannot remove required
uncertainty, alter factual claims, or authorize actions.

Voice receives a bounded delivery choice such as `pace: unhurried` after canonical
text validation. It never reinterprets the original emotional observation to
rewrite the answer independently.

## Message memory, summaries, and checkpoints

Separate accepted message history from derived memory. Runtime ingress records
messages with speaker/role, sequence, source and retention policy; Analyzer does
not reconstruct or duplicate the transcript. A user response creates a processing
checkpoint after validation. Filler/non-final speech is not a semantic input.

A checkpoint binds input event, processed sequence, accepted state revision,
policy versions, memory note/summary revisions and processing receipt. Context
and response/delivery references can be appended as later lifecycle receipts;
checkpoint creation never falsely declares playback complete.

The memory policy independently declares:

- **Read:** `none | relevant | all_authorized`; scope, purpose and size ceilings.
- **History:** `none | last_exchange | since_checkpoint | recent_window |
  summary_plus_recent | full`; exact window and authorized roles.
- **Write:** triggers for new durable facts, decisions, corrections, unresolved
  questions or substantive episodes; retention, consent and dedupe keys.
- **Summarize:** trigger (coverage/token threshold, task boundary, explicit
  request), source interval, required retained items and maximum size.

Default Analyzer/Main Composer context uses `ContinuityContext` with no more than
twenty formatted turns plus a short, valid recent-memory projection. It also
receives the relevant task summary, durable memory and `NextStepContext` for the current task. Researcher normally receives
only the authorized query context. Voice Composer receives no transcript, semantic
memory or next-step list; it renders the validated canonical response and bounded
delivery controls.
`full` history or `all_authorized` memory requires an explicit bounded rule and
is still scope-filtered/redacted. If it exceeds the budget, follow a declared
fallback or return `CONTEXT_GAP`; never silently truncate a promised full view.

A summary binds `summary_id`, revision, `base_summary_revision`, source message
range/references and digests, `coverage_through_checkpoint`, included claim/
decision/question references, expiry and status. The coverage cursor advances
only when summarization actually consumed that source range. A checkpoint alone
does not advance it. Composer output and a summary do not become new evidence.
Corrections/deletion/source revocation invalidate covered summaries and cached
contexts until rebuilt from permitted sources.

`propose_memory` distinguishes `append_note` from `replace_summary`. A note has
a semantic dedupe key, source/claim references and its triggering checkpoint.
A replacement summary requires expected summary revision, declared source
coverage and a triggered summarization request. Runtime validates coverage and
lineage; semantic faithfulness needs separate evaluation. If the input context
did not contain the whole authorized summarization range, the Analyzer cannot
claim to summarize it. It may propose the need for a bounded follow-up analysis
invocation under the same role; no new autonomous memory agent is required.

No new information means no memory operation, no note, and no summary rewrite.
Do not emit “nothing changed” as a memory note. Runtime can still record the
accepted message and `NOOP` processing receipt. If a summary needs to include
later dialogue, a declared summarization trigger can run despite no new domain
facts; this is a different condition from a no-op memory write.

The default `recent_window` mode selects the newest authorized turns, including
the current open turn only when configured; the open turn counts toward the
window limit and appears exactly once. The Analyzer always has its event field
even when continuity omits that event. A Composer must receive the current input
through its continuity projection.

The alternative `summary_plus_recent` mode projects the cumulative summary in
`memory.task_summary`, then selects messages
strictly after its covered sequence; `continuity.recent_memory` may cover only
those selected turns. Include any separately required exact
quotes or pending questions with deduplication. Preserve whether an assistant
response was merely generated, committed, interrupted, or delivered; summaries
must not claim the user heard an interrupted response.

## Review and acceptance cases

| Case | Required result |
|---|---|
| Name matches display label but not registered identity | No fuzzy cross-record update; resolve canonical identity or ask |
| One delta updates several slots/policies | Every eligible operation reaches its own registered field; one semantic revision and exact per-field receipt |
| One block has several parts and each has variants | Selection occurs independently per part under registered cardinality; conflicting variants are not co-applied |
| Selection cannot distinguish variants | No candidate effects applied; explicit question/defer/review outcome with candidate provenance |
| Missing field, explicit null, clear, equal value, collection replay | Distinct behavior with correct no-op/revision semantics |
| New claim plus policy reference in one group | Both accepted or neither; references resolve before commit |
| Independent group denied | Accepted groups remain valid; dependencies skipped and receipt shows partial outcome |
| Policy data attempts to alter definition/projection/permissions | Rejection before state or dispatch mutation |
| Query field populated without request | Zero research jobs/calls |
| User requests calmer phrasing | Only approved style/intent fields affect composition; factual/action authority preserved |
| Emotion inference becomes stale or contradicted | No durable label; current preference/expiry invalidates style projection |
| No new semantic or memory data | Empty delta; same semantic/memory revisions, new processing checkpoint if needed |
| Summary not refreshed at new checkpoint | Coverage stays at old checkpoint; uncovered messages remain in projection |
| Deleted or corrected message under a summary | Summary and dependent contexts invalidated; no resurrection |
| Required context too large or unauthorized | Explicit gap; no full-state fallback or required-field loss |
| New role with no projection contract | No dispatch/context disclosure |
| Policy/source/state changes before dispatch | Revalidate/recompile the affected invocation |

These are target acceptance obligations. Example consistency and document/schema
checks are design evidence only; runtime atomicity, authorization, semantic
faithfulness, privacy and voice behavior require target execution evidence.
