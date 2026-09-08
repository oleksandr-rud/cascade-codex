# Stateful-agent architecture best practices

Contract: `stateful-agent-authoring@1.5`; source design rules, 2026-09-08.
Scope: the optional Analyzer–Policy Engine–Composer reference family. The
[simple modular/vertical-slice profile](simple-modular-agent.md) is its default.
Other
topologies require their own justified boundaries, not automatic conversion.
Use this checklist in role, workflow, prompt, evaluation and integration briefs.
Resolve the linked owner contracts rather than copying their implementation.
The simple profile places policies under the module's domain layer, DTOs/use cases
under application, and controllers/handlers at the module root. Agent definitions
encapsulate role/prompt/context behavior and reference those domain policies;
shared libraries own mechanics, never conversation authority or data mappings.
Use `agents/assistant-agent/` for the concrete default. Colocate its state/store,
schemas, prompts and projections there; shared conversation records retain one
module owner. Application admission and policy orchestration invoke domain rules
and coordinate atomic writes. Role models cannot write through an agent store.
Reserve a base-agent abstraction for proven reuse, not a default inheritance layer.

## Required authoring checks

Keep projection representation simple: named objects, selected schema and values,
YAML/JSON decoding where needed, then deterministic compact text rendering.
Policy Engine/admission selects; rendering preserves boundaries and types. Share
identical approved policy/schema blocks across authorized profiles locally; keep
changing values separate. Provider prefix reuse additionally requires matching
preceding prompt content, so shared policy text alone does not imply cross-role
cache hits. Follow the linked transport and caching contracts for these rules.
Use [schema-values-text@1](executable-projections.md) as the executable baseline
for this representation. Bind trusted profile decoding, current host admission,
target token accounting and the issuer's task-bound assembly path. Schema/type,
slice/role/task mismatch and cache-revocation tests are required for adoption;
source-format acceptance and low-level rendering alone are insufficient.

| Concern | Rule to preserve in generated artifacts | Owner contract |
| --- | --- | --- |
| Fit and complexity | Start with one release boundary and one transactional store. Distinct roles are responsibilities, not mandatory processes. Compare with a simpler single-model baseline before claiming better quality/cost/latency. Add Researcher, voice LLM, event sourcing or a broker only for a material requirement. | [Implementation](implementation-and-completeness.md) |
| Authority | Analyzer proposes; runtime admits/commits/dispatches; Composer owns novel answer meaning; Voice presents; adapters report effects/delivery. A fixed approved status phrase is a narrow runtime exception, not a second semantic author. | [Role boundaries](analyzer-policy-composer.md) |
| Wire versus prompt | Advertise a semantic Analyzer output schema with needed target/evidence handles. Bind hidden metadata in the adapter and validate the full runtime delta afterward. Show which adapter stages exist and which are target obligations. | [Transport](event-projections-and-context-format.md#analyzer-output-profiles) |
| Multi-policy delta | Preserve direct groups, independently selectable parts, genuine alternatives, candidate atomicity, local-reference closure and cross-policy invariants. Selection policy is configuration-owned; confidence cannot authorize or establish truth. | [State/delta](state-delta-policy-projection.md) |
| Commit and recovery | Stage first; atomically commit current state, receipt and pending work; build context from committed records. Recover pending work without repeating effects. Event journals, persisted read models and replay are optional; adopted replay never invokes a model/tool. | [Simple profile](simple-modular-agent.md) |
| Policy governance | Separate definitions, accepted policy data, evaluations and projection rules. Hard constraints remain enforceable outside prompts; unresolved conflicts block the affected operation. Upgrades invalidate dependent contexts/intents and retain historical rule bindings. | [Policy ownership](state-delta-policy-projection.md) |
| Projection | Policy Engine and admission issue role- and task-specific policy/state slices, including initial Analyzer input. Trusted helpers resolve, redact and budget one snapshot. Context Compiler formats only the issued slice; it cannot query state or broaden scope. Recheck before dispatch/publication; gaps require reissuance, never a state dump. Frontend views have separate client/task admission. | [Role projections](state-delta-policy-projection.md#projectionpolicy-and-rolecontext) |
| Prompt order and cache | System, role instructions, approved policy descriptions, optional stable history, current projection. Changed definitions rebuild trusted catalog; policy data remains data. Caching cannot preserve revoked/stale content or grant access. | [Iterative caching](iterative-context-caching.md) |
| Memory and claims | Keep source/support, corrections, subject, scope, expiry and summary coverage. Recent-window, task and durable memory have separate purposes. A no-op need not create a note. Compaction must preserve required literals/uncertainty and respect deletion. | [Memory](state-delta-policy-projection.md#message-memory-summaries-and-checkpoints) |
| Research and actions | No admitted request means no retrieval. Research returns evidence through admission; actions require executor receipts. External unknown outcomes require reconciliation, not blind retries or a claim of success. | [Research/actions](analyzer-policy-composer.md) |
| Voice and streaming | Validate canonical output before release by default. Incremental release needs its own irrevocable-prefix protocol. A model cannot confirm playback; adapters/client receipts bind epochs, ordering, interruption and partial delivery. | [Output/voice](analyzer-policy-composer.md) |
| Interim messages | Use status purpose under the existing checkpoint, bounded approved phrases, selected channels and nonblocking failures. Main response supersedes queued status. Status cannot close the turn or satisfy a work completion oracle. | [Interim](interim-responses.md) |
| Security and privacy | Treat messages, memory and retrieval as data; resolved refs and cache keys grant no authority. Bind tools, retrieval/egress, tenant boundaries, consent and deletion to runtime controls; redact traces without hiding failure evidence. | [Trust boundaries](analyzer-policy-composer.md) |
| Budgets and operations | Account for every role call, retries, retrieval, summaries, interim and voice under the task budget. Define cancellation propagation, backpressure, provider timeout/outage and terminal user-visible outcomes. Never use unlimited queueing or recovery. | [Implementation gates](implementation-and-completeness.md) |
| Lifecycle and evidence | Bind schema/policy/prompt/projection/adapter versions, compatible migrations and rollback. Separate source conformance, offline tests, runtime integration, semantic quality and provider/physical delivery evidence. | [Evaluation gates](implementation-and-completeness.md) |

## Mandatory target decisions before activation

The reference does not invent product limits or infrastructure. An adopting target
must bind these decisions, or mark its affected execution path as not ready:

- Domain success oracle, claim verification/confirmation rules, supported channels
  and failure UX; quality, latency and cost thresholds with a representative corpus.
- Advertised Analyzer schema, handle resolver, runtime-envelope binder and strict
  decoder; role selector/transform registry and actual tokenizer/output reserve.
- Store transaction/isolation boundary, durable invocation intents, crash recovery,
  duplicate delivery and uncertain external-outcome reconciliation.
- Policy authority/conflict rules, permission/consent revocation propagation,
  redaction/retention/deletion across source stores, summaries, indexes and caches.
- Finite per-task budgets and queue limits. Reserve enough budget to report a
  terminal outcome; interim phrases must not consume the substantive-answer reserve.
- Response/streaming gate, delivery receipts and cancellation behavior; provider
  capability profile and actual cache measurements where caching is enabled.
- Version migration, rollback compatibility and a release gate tied to the source
  revision and target evidence. A passing reference fixture does not activate assets.

## Review evidence and change discipline

Review one frozen source/diff and map a claim to an observable failure case. Include
denied and missing inputs, concurrent commits, stale dependencies, retries after
commit, partial delivery and deletion/replay. Keep sealed model expectations out
of target context. Author review is not an independent semantic evaluation.

When this family changes, update its owning contracts, then only affected
consumers: role builder, workflow builder, prompt brief, evaluation brief and
target integration rules. Portable plugins consume supplied versioned contract
content; an unresolved name or a filesystem path to another installed package is
not a dependency contract. Do not silently modify installed caches or frozen
evaluation artifacts as part of a source documentation change.

For pattern grounding, CQRS can separate models within one store, while separate
stores add synchronization obligations; event sourcing adds reconstruction and
evolution obligations. Prefix caching relies on eligible matching provider input.
Sources checked 2026-09-08: [CQRS](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs),
[Event Sourcing](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing),
[Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching).
The role-specific rules above are this project's design decisions, not claims
that a provider or pattern guide guarantees agent correctness.
