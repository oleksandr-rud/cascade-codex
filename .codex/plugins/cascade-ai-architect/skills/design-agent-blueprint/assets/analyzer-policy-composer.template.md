# Agent architecture: <target>

Pattern: `analyzer-policy-composer@2.4`
Contract: [Analyzer, Policy Engine, and Composer](../references/analyzer-policy-composer.md)\
Disposition: `<ADOPTED | ADAPTED | REJECTED | GAP>`\
Target status: `CANDIDATE`\
Source request and snapshot: `<exact locators and digests>`

Copy this design template together with the complete
[agent blueprint](agent-blueprint.template.md). Resolve relative links to the
selected plugin/version when copying outside this package. Fill target choices;
do not treat example fields as a registered runtime schema or deployment.

## Selected variant

- Text: Analyzer → JSON delta → admission/selection → current-state transaction → direct context builder → Main Composer → validated canonical answer.
- Machine packet topology: `model_pipeline`; policy/runtime functions are workflows.
- Voice: `<disabled | add Voice Composer after canonical-answer validation>`.
- Research: `<disabled | optional policy-admitted web/KB requests>`.
- Deployment and model reuse: `<logical boundaries do not require services>`.
- Graph authoring: `<selected | deferred | unnecessary>` with reason; when selected,
  bind [step/context/prompt review](../references/graph-workflow-authoring.md),
  static/dynamic choice, branch completion and recovery in the existing workflow.
- Why selected, rejected alternatives, and reassessment evidence:
- Final semantic owner: Main Composer.
- State, policy, context, dispatch, and memory commit owner: `<runtime module>`.

## Contract bindings

Apply the [architecture authoring checklist](../references/architecture-best-practices.md)
and record each applicable target binding and its evidence state. Optional
features need an explicit activation decision; a filled template is not a runtime.

| Contract | Required binding |
|---|---|
| Accepted event | Schema, authenticated scope, ID, sequence, finalized transcript/source references |
| StateDelta | Logical v3 schema via analyzer-json@1 (optional analyzer-yaml@1), checkpoint/base revision, direct multi-policy groups, blocks/parts/candidates, typed refs and evidence |
| Checkpoint group | Root/child input lineage, attempts, delta/receipt refs, state revision bindings and immutable role context refs; no duplicate TurnState |
| Implementation profile | [Simple modular vertical slices](../references/simple-modular-agent.md); current state is authoritative, context is built directly; record reasons for optional extensions |
| CommittedEventBatch (optional) | Only for a selected journal/event-sourced profile: accepted payloads, stream ordering, policy bindings and local-to-canonical mapping |
| ProjectionCheckpoint (optional) | Only for a persisted read model: view version, processed transaction, source positions/dependencies and freshness status |
| Model text/cache | role-text@1 semantic renderer; system then role instructions then policy catalog; optional immutable history before current state; private cache candidates, compaction/invalidation rules and provider evidence; see [iterative caching](../references/iterative-context-caching.md) |
| Interim response (optional) | Existing status-update purpose, approved phrases, Composer/fixed-text path, channels, delay/expiry/count budget, main-answer priority, checkpoint dedupe and delivery receipts; see [interim responses](../references/interim-responses.md) |
| AnalyzerContext | Event/purpose, trusted identity and policy blocks, Analyzer background, writable targets, output limits and expiry |
| IdentityContext | Host-bound actor/session/tenant/channel and role refs plus policy-approved profile projection |
| PolicyContext | Bound definitions/evaluations/projection, selected policy data, obligations, acts, confirmations, restrictions and expiry |
| ConversationBackground | Role-specific task goal/phase, relevant entities/claims, pending questions and typed limitations |
| AgentIdentityDefinition | Trusted mission/capabilities/limitations, approved self-description and identity activation rules |
| MemoryContext | Independent task summary and relevant durable memory, coverage, invalidation and per-role budgets |
| UnresolvedChoice | Candidate snapshots, presented option order, revisions, expiry and later resolution |
| Plan proposal | Local-to-stable step mapping, plan CAS, supersession, cancellation and dependency treatment |
| ContinuityContext | Compact formatted history of at most 20 accepted turns plus short, source-bound recent memory |
| NextStepContext | Complete current-task step projection authorized for the role, with lifecycle, dependencies, confirmations and receipts |
| PolicyDefinition | Configuration owner, version/digest, canonical field IDs, schema, merge, activation and completion rules |
| PolicyData | Policy/subject/scope instance, typed cells or canonical references, field revisions, evidence, lifecycle |
| PolicyEvaluation | Derived decisions/obligations, source dependencies, invalidation rules |
| AppliedChangeSet | Atomic groups, record write set, applied/no-op/rejected/skipped outcomes, before/after revisions |
| ProjectionPolicy | Role/purpose, registered selectors, mapping/transforms, required/optional data, freshness, access and budgets |
| RoleContext | Invocation, accepted revision, source/authorization/definition/projection identities, typed payload, expiry |
| Claim | Typed value, literal span, normalization, source identity, status, scope, correction lineage |
| Selective storage and context | Domain-record/claim/source/memory ownership; derived graph links; per-section source, scope, freshness, dependency, budget and gap rules; optional [worked example](selective-memory/README.md) |
| PolicyDecision | Versioned rule matches, effects, obligations, reasons, accepted/rejected operations |
| ComposerContext | State/policy/source identities, allowed facts/acts, uncertainty, redaction, expiry, budget |
| ResponseContract | Answer mode, language/channel, intent, structure/schema, size, citations, style, required/forbidden content and missing-data behavior |
| ResponseCandidate | Context identity, answer/spoken text, claim references, requested response act |
| Canonical response | Validated response ID/revision/digest, current-policy check, publication receipt |
| ResearchRequest | Gap, query, allowed web/KB sources, ACL, revision, budget/deadline, cancellation, dedupe |
| ResearchResult | Status, evidence spans/chunks/digests, freshness, limitations, parent request identity |
| Memory proposal | Source/claim refs, purpose/scope, sensitivity, consent/policy, TTL/invalidation |
| TurnDecision | Explicit compose/research wait/input/action/status/stop route and admitted dependencies |
| ExecutionCommand / ExecutionReceipt | Action contract, authority, confirmation, idempotency, outcome and reconciliation |
| Voice delivery | Turn/response revision, text digest, epoch, segment order, client playback acknowledgement |

Use [the versioned wire schema bundle](../references/agent-contracts.schema.json)
and [implementation/completeness assessment](../references/implementation-and-completeness.md).
Run the packaged contract validator and negative regression suite before target
adoption. For every row supply the concrete schema and enforcing runtime entrypoint, or
mark `GAP`. Analyzer emits only StateDelta. Researcher and composers have no
state-write authority. ResearchResult returns to analysis as evidence.

## Policy and context choices

Use the [detailed state/projection contract](../references/state-delta-policy-projection.md)
and [worked trace](state-delta-policy-projection.example.json). Bind canonical
field IDs and record instance resolution; never use display names as write keys.

### Identity, policies, and role contexts

| Owner area | Target binding |
|---|---|
| Authenticated identity | Host adapter, actor/tenant/session/turn/channel binding, roles and expiry |
| Projected identity profile | Approved attribute schema, provenance, scope, retention and per-role visibility |
| Policy definitions | Configuration owner, registry path/store, version/digest and activation authority |
| Policy data | Instance-key derivation, field schemas, persistence owner, indexes and retention |
| Policy evaluations | Deterministic evaluator, dependency graph, receipts and invalidation |
| Projection policies | Role/task/step/purpose registry, selectors, transforms, redaction, budgets and precedence; Policy Engine/admission owns issuance |
| AnalyzerContext | Builder, separate identity/background/continuity/next-step blocks, writable targets and StateDelta limits |
| ComposerContext | Builder, separate identity/policy/background/continuity/next-step/knowledge projection and expiry |
| ResponseContract | Answer modes, channel/language, format/style enums, hard constraints and validator |

| Policy family | Source/version | Deterministic enforcement and conflict rule |
|---|---|---|
| Trust and claim admission | `<GAP>` | `<GAP>` |
| State transition and concurrency | `<GAP>` | `<GAP>` |
| Authorization and confirmation | `<GAP>` | `<GAP>` |
| Retrieval and external query disclosure | `<GAP>` | `<GAP>` |
| Memory, privacy, retention, deletion | `<GAP>` | `<GAP>` |
| Context selection and redaction | `<GAP>` | `<GAP>` |
| Output, voice delivery, and cancellation | `<GAP>` | `<GAP>` |
| Budgets, retries, and recovery | `<GAP>` | `<GAP>` |

- Slice issuance contract: Policy Engine/admission owner, role/task/step scope, committed source dependencies, approved policy/state fields, expiry and token ceiling:
- Context Compiler boundary: issued slice plus approved prompt assets only; no store access, reference expansion or independent selection:
- Block representation: selected object/schema/values, configured YAML/JSON source decoder, deterministic field order, object/list boundaries and literal preservation:
- Executable profile: `schema-values-text@1`; trusted profile/source bindings, host admission callback, tokenizer, issue/assemble call sites and focused adoption tests:
- Shared policy/catalog fragments: approved common blocks, role subsets, separate changing values, local rendered-block cache scope and provider-prefix eligibility:
- Initial Analyzer slice admission before any delta; subsequent issuance after commit:
- Separate client/task slice for frontend progress, controls and reconnect; gateway transports issued data only:
- Analyzer projection and token ceiling:
- Analyzer background, continuity/next-step blocks, writable target catalog, omitted-data limitations and expiry:
- Registered Analyzer blocks/parts, selection policies, candidate schemas and per-envelope ceilings:
- Main Composer projection and token ceiling:
- Composer background, compact formatted history and short recent-memory fields:
- Twenty-turn definition, lower role-specific limits, compaction/deduplication and `CONTEXT_GAP` behavior:
- Current-task next-step completeness, lifecycle statuses, confirmation references and completion receipts:
- Identity projection and `minimal | personalization | identity_answer | introduction | capability_disclosure` activation for Analyzer, Composer, Researcher and Voice Composer:
- Policy definition/data/evaluation locations and independent version bindings:
- ResponseContract answer modes, format schema, style enums, hard precedence and candidate validation:
- Policy-derived Composer reminders mapped to typed ResponseContract fields and source dependencies:
- Researcher request projection and ACL enforcement:
- Voice projection (canonical text plus delivery controls only):
- Atomic state/dispatch-intent commit and stale revision recovery:
- Policy/context expiry and revalidation before publication:
- Composer semantic validation and fail-closed fallback:
- Atomic group dependencies, cross-group invariants, and rejected/no-op receipts:
- Multi-slot direct updates, per-part candidate selection, unresolved-alternative and conflicting-candidate behavior:
- Role/purpose selectors, impact predicates, enum mappings, and missing-data rules:
- Tone/emotion support, scope/expiry, and bounded response intent mapping:

## Memory and claims

- Working-state schema, owner, revision, and checkpoint:
- Episodic retention, redaction, and replay rules:
- Durable memory admission, consent, scope, TTL, correction, and deletion:
- KB/vector/cache ACLs and invalidation propagation:
- Exact-span claim extraction, conflict and supersession rules:
- Risky-span confirmation and unresolved-question behavior:
- Compaction and rehydration without losing provenance or pending decisions:
- Independent message-log, memory-note, summary, and processing-checkpoint owners:
- Independent recent-window and cumulative-task coverage, durable memory selection and exact message window per role:
- Recent-memory status, source-turn coverage, fact/decision/question/preference references and invalidation:
- Researcher/Voice omission of history, semantic memory and next steps unless an explicit ProjectionPolicy grants a smaller purpose-bound view:
- Empty delta, no-memory-write, expiry-only, and summary-trigger behavior:

## Research and voice recovery

- No gap: absent research operation → no job and no retrieval call.
- Missing fact: delta request → policy admission → Researcher → observation
  → Analyzer delta → policy commit/context → Composer.
- Research timeout/no evidence/late result and fallback:
- Voice finalized-input and speaker/echo rules:
- Canonical answer ownership and spoken-variant validation:
- Interrupt epoch, buffer cancellation, stale-frame suppression:
- Repeat/retry semantics, ordering, reconnect, and delivery acknowledgement:

## Budgets and evaluation

Bind numeric ceilings or keep the target `GAP`: turns, total time, model tokens,
cost, tool calls, research rounds, retries, response/context sizes, concurrent
jobs, queued speech, and delivery deadlines. Zero research calls is valid when
research is disabled or unnecessary. Define stop/recovery for each ceiling.

Map each acceptance case in the pattern contract to a target scenario, oracle,
fixture, and evidence owner. Include the no-research path and voice cancellation.

| Evidence | Status | Exact target/source and receipt |
|---|---|---|
| Schema and ownership | `NOT_RUN` | |
| State/policy/context and memory | `NOT_RUN` | |
| Research routing and ACL | `NOT_RUN` | |
| Model semantics and grounding | `NOT_RUN` | |
| Voice provider and delivery | `NOT_RUN` | |
| Physical microphone/speaker behavior | `NOT_RUN` | |

## Target handoff

- Architecture packet and per-role/workflow references:
- Prompt brief per Analyzer, Main Composer, optional Voice Composer/Researcher:
- Target implementation files, authorizing request, rollout and rollback:
- Unresolved choices and affected capabilities:
- Evidence needed before acceptance or any claim of superiority:
