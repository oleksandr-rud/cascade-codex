# Claims/actions agent authoring checks

Contract: `stateful-agent-authoring@2.0`; source contract, 2026-10-06.
Apply only to an accepted [Analyzer–Admission–Policy Engine–Composer
architecture](analyzer-policy-composer.md). Other topologies retain their own
accepted boundaries. The [simple modular profile](simple-modular-agent.md) is
the default implementation recipe for this family.

| Concern | Required behavior | Owner contract |
| --- | --- | --- |
| Smallest topology | Start with one application boundary, one store and direct calls. Add a graph, another process or a separate read model only for a concrete branch, recovery or ownership requirement. | [Runtime binding](runtime-binding.md) |
| Analyzer | Return `analysis.v1` claims, action requests and uncertainty. No writable targets, mutation operations, candidate groups or permission fields. | [Admission](claims-actions-admission.md) |
| Meaning | LLMs interpret free text and emit declared claims/enums. Code checks schemas, issued identifiers, current state and authority; it cannot determine meaning from lexical rules or promote an inference into a fact. | [Semantic boundary](semantic-decision-boundary.md) |
| Admission | Validate the original Analysis object against the issued subject, predicate, observation and source catalogs. Reject invalid output before storage or dispatch. Admission establishes eligibility, not truth or permission. | [Admission](claims-actions-admission.md) |
| Policy Engine | Host code checks current authority, budgets and revision, then selects the permitted next action. Model recommendations never authorize their own execution. | [Role boundaries](analyzer-policy-composer.md) |
| Context Builders | Build a fresh, scoped context for Analyzer, Researcher and Composer separately. Keep invocation identity, revision and authorization outside model messages. Builders cannot broaden source or tool access. | [Contexts](event-projections-and-context-format.md) |
| Research | Retrieve only from the admitted request's allowed sources. Store observations with source identity; analyze and admit them in a new round before composition. Missing evidence stays unresolved. | [Research](analyzer-policy-composer.md) |
| Composition | Compose from admitted claims, their support, uncertainty and referenced evidence. Independently verify semantic support before separately authorized publication. | [Response gate](implementation-and-completeness.md) |
| Persistence | Host commits use compare-and-swap, idempotency and scope-bound receipts. Models run outside transactions. Recheck the observed state after every commit; discarded evidence cannot support a later answer. | [Simple profile](simple-modular-agent.md) |
| Recovery | Replay a completed response or a pending user question without a model call or duplicate publication. Unknown external effects need reconciliation before retry. | [Runtime binding](runtime-binding.md) |
| Memory | Preserve source, support, corrections and uncertainty. Adding durable memory requires its own admitted lifecycle and deletion policy; the model output is never a generic store mutation language. | [Claims and memory](selective-state-claims-memory.md) |
| Bounds | Count every role call, research round, retry and verification under explicit host budgets. Propagate cancellation to actual adapters; a timed-out invocation does not prove no external effect occurred. | [Implementation gates](implementation-and-completeness.md) |
| Optional presentation | Voice, streaming and interim status require separately accepted delivery contracts and actual receipts. A model cannot certify delivery or playback. | [Interim messages](interim-responses.md) |
| Evidence | Separate syntax/source validation, controlled callback tests, live provider integration and independent semantic evaluation. A fixture PASS grants no production readiness. | [Evaluation gates](implementation-and-completeness.md) |

## Target binding before activation

Freeze the target's schemas and role prompts, subject/predicate/source catalogs,
authentication and authorization callbacks, compare-and-swap store, cancellation,
idempotency and reconciliation behavior. Bind the independent response verifier
to the accepted Quality profile with a different context from the author.
Missing authority or evaluation inputs keep the affected path unresolved.

Use the [executable reference](../scripts/agent_runtime.mjs) to inspect concrete
boundaries and callback requirements. The optional [block projection
formatter](executable-projections.md) can render issued role inputs; rendering,
cache equality and opaque handles cannot grant access. A framework checkpoint
cannot become the authority for accepted domain records.

Review one frozen source and its actual target evidence. Include old-wire
rejection, source/subject denial, stale contexts, denied dispatch/publication,
research re-analysis, independent verification failure, duplicate terminal replay
and bounded cancellation. Compare held-out outcomes with a simpler baseline
before claiming quality, latency or cost improvements.
