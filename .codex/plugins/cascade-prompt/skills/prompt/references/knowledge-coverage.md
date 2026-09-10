# Knowledge base coverage map

Scope: this package's `references` and `runtime`, confirmed by the maintainer.
Reviewed 2026-09-10. This maps operative rules to loading paths; it is not a
claim that every rule belongs in every prompt or that model adherence was tested.
Relative links below resolve from this file. Load this index for coverage audits
only; ordinary authoring follows SKILL.md's conditional routing.

## Reference-to-runtime coverage

| Reference owner | Rules that must survive composition | Active consumer / condition | Audit disposition |
|---|---|---|---|
| [Request profile](model-system/request-profile.md) | Exact values/negation, typed working state, scoped authority, facts versus inference, obligation/gap classification, invalidate only affected fields | [SKILL workflow 1/4](../SKILL.md), [intake](../runtime/intake-interview.md); all requests, interview only for material gaps/Advanced | Repaired supporting-context precedence and explicit working-state privacy/provenance; host hierarchy remains authoritative |
| [Clarification](model-system/clarification-policy.md) | Materiality gate, safe defaults, no invented labels/policy, <=3 grounded questions, merge answers, READY/NEEDS_INPUT/BLOCKED, repair omissions without asking | [Intake](../runtime/intake-interview.md) and SKILL; missing decisions only | Repaired bounded-option gate; resolved facts are never re-interviewed for a template |
| [Context acquisition](model-system/context-acquisition.md) | Minimum requirement evidence, source identity/authority/freshness, trust boundary, selection and stop rule; missing/stale/conflicting/excessive context | [Grounded](../runtime/grounded.md), [context composition](../runtime/context-composition.md); source-dependent claims or reusable context | Covered; added reusable rendering, budget and history mechanics |
| [Task profiling](model-system/task-profiling.md) | Capabilities before cost: reasoning/dependencies, context, modalities, tools, output, deployment, risk, latency and evaluation constraints | SKILL workflow 3, selected tier, [model index](../runtime/model-index.yaml); routing is material | Repaired capability checklist and internal evidence-backed ratings; no mandatory user-facing form |
| [Tier selection](model-system/tier-selection.md) | Four neutral envelopes, explicit model preserved, hard mismatch explained, quality/cost/latency selection, INFERRED without runs, escalation/downgrade | SKILL workflow 3 and [efficient](../runtime/tier-efficient-structured.md), [balanced](../runtime/tier-balanced-production.md), [generalist](../runtime/tier-frontier-generalist.md), [autonomous](../runtime/tier-frontier-autonomous.md); exactly one applicable tier | Covered; added explicit cost/latency tie-break and no parameter-count ranking |
| [Composition](model-system/prompt-composition.md) | Invariant core/task/risk/tier/surface layers, provider controls outside task meaning, concise evidence instead of private reasoning | SKILL workflow 3/4, selected adapter and [context composition](../runtime/context-composition.md) | Repaired surface discovery and added three usable templates |
| [Specializations](model-system/specialization-overlays.md) | Extraction schema/missing/normalization; classification labels/priority/abstention; research freshness/citations; coding scope/current source/protection/validation; tools permissions/retries/cleanup | [Task overlays](../runtime/task-overlays.md), [grounded](../runtime/grounded.md), [safety](../runtime/safety-high-stakes.md); smallest compatible set of material task overlays | Repaired numeric overlay cap and extraction malformed-input/evidence-location/edge-case omissions |
| [Specializations](model-system/specialization-overlays.md) | Comparison disqualifiers/criteria/unknown evidence; creative freedom/originality; long-context joins/coverage; modality precision/order; realtime staleness/reconciliation | [Task overlays](../runtime/task-overlays.md) for the respective trigger | Repaired missing unknown-versus-low score, chunk joins, modality order/precision, and realtime recovery detail |
| [Routing evaluation](model-system/routing-evaluation.md) | Separate routing from prompt quality; configuration identity/status, excluded candidates, fallback, failure ownership, comparable evidence | [Evaluation](../runtime/evaluation.md); audit/comparison/effectiveness claims, with compact design notes for ordinary routing | Repaired Test trigger, decision statuses/exclusions, and affected-case reruns; expanded open-weight configuration identity |
| [Model registry](model-system/model-registry.yaml) | Candidate/provenance/date, eligibility versus effectiveness, explicit target and per-provider controls | [Runtime index](../runtime/model-index.yaml) then named adapter; registry only for provenance/current research/comparison | Repaired known-tier model bypass; Astra and six exact open-weight checkpoints now have reachable adapters |
| [Routing cases](model-system/routing-cases.yaml) | Ordinary/boundary/missing/conflicting/explicit-model/high-risk/tool/surface scenarios | [Evaluation](../runtime/evaluation.md); fixtures for future controlled execution, not instructions for every prompt | Extended version and context boundaries; structural inspection is not behavioral execution |

## Runtime-specific rules and intentional exclusions

- [Safety](../runtime/safety-high-stakes.md) is selected by consequence,
  sensitivity or authority, never merely by model size. Template examples do
  not supply absent permissions or domain policy.
- [Stateful agent](../runtime/stateful-agent.md) remains restricted to an
  explicitly adopted Analyzer–Policy Engine–Composer architecture. Its issued
  slices, private manifests, schema-values-text, caching, interim response and
  release rules require the supplied architecture contracts. A generic context
  template must not import them or invent missing issuer contracts.
- [Astra](../runtime/model-astra.md), [Qwen](../runtime/model-qwen.md), and
  [other open weights](../runtime/model-open-weight.md) separate dated provider
  facts from Cascade's inferred composition advice. Dates do not establish
  access, runtime support, price or comparative performance.
- Detailed task ratings are internal working state when routing is material;
  source-ledger columns and exposed evaluation records are proportional
  diagnostic aids. Core authoring uses compact semantic state;
  there is no requirement to print internal maps, runtime IDs or JSON envelopes.
- Internal development archives and other plugins' knowledge are outside this
  audit. Prior dated reports remain historical; this index is the current
  coverage map, not a second copy of the underlying rules.

## Verification boundary

The maintainer's semantic interpretation rule is enforced in SKILL workflow 2,
classification/tool overlays, context composition, the stateful profile and
evaluation guidance: LLM-produced defined enums/claims precede deterministic
consumption. Regex/keyword semantic shortcuts, including partial-task prefilters
and fallback verdict extraction, are forbidden. This records guidance coverage,
not migration or measured correctness of existing classifiers.

The graph-authoring integration adds conditional guidance in
[context composition](../runtime/context-composition.md),
[tool orchestration](../runtime/task-overlays.md) and
[the stateful profile](../runtime/stateful-agent.md), selected through SKILL
workflow 3 and its existing conditional loads. Prompt owns focused step
instructions and rendering; the supplied architecture owns topology and the
host owns admission, state and execution. No generic context request selects
Analyzer–Policy Engine–Composer. Source integration is not model-efficacy proof.

Check links, YAML structure, registry/index parity, selected adapter paths,
package metadata and installed/source equality mechanically. Review sample
template substitutions for exact rule/schema/permission preservation. Model
execution must separately test the selected checkpoint and runtime with normal,
missing, conflicting, injected, truncated and multilingual inputs. Until such
execution occurs, adherence and comparative efficacy are `NOT_RUN`.
