# Task Overlay Pack

Select the smallest applicable set of compatible overlays; a numeric limit must
not omit material obligations. Triggers identify applicability; obligations
define what must be resolved. Do not copy
this whole pack into the generated prompt.

- **Extraction** — triggers: extract, parse, normalize, fields, OCR, schema.
  Resolve exact fields/types, source-only evidence, accepted labels or evidence
  patterns, missing/ambiguity behavior, normalization/conversion, exact schema,
  extra-output policy, malformed-input handling, and required source spans or
  citations (including when none are needed). Prefer deterministic controls and
  representative boundary examples. Preserve identifiers, amounts, and currencies unless
  transformation is explicit. Undefined labels or selection priority are
  request gaps, never invented defaults.
- **Classification** — triggers: classify, route, label, triage, score.
  Resolve allowed labels, decision boundaries, priority for mixed cases,
  insufficient/conflicting evidence, abstention or human review, and exact
  output shape.
- **Research/retrieval** — triggers: research, search, cite, current, compare
  sources, specialized web search, database or hybrid retrieval. Resolve
  authority, freshness/version, source/domain restrictions, query and tool
  boundaries, budgets and stop conditions, citation format, conflict policy,
  and unsupported-claim behavior. Use `grounded.md` for source inspection and
  separate web/database authority, private-data boundaries and stable joins.
- **Coding/diagnosis** — triggers: implement, debug, repair, refactor, inspect
  logs/code. Resolve intended behavior, relevant code/log/config context,
  protected contracts, permitted writes, smallest validation seam, and evidence
  required for completion.
- **Tool orchestration** — triggers: tools, agent, execute, automate, workflow.
  Resolve available tools, selection rules, permissions and confirmations,
  budgets, tool-error behavior, recovery/cleanup, and terminal proof.
  For an adopted workflow with separable steps, recommend a focused step prompt:
  one responsibility, required evidence/predecessor results, permitted actions,
  typed output, completion condition and explicit missing/stale-input behavior.
  Retain a direct single-call prompt when splitting adds no useful boundary.
  Bind code-owned retrieval, validation, joins, routing and commits as host
  obligations, not prose enforcement. Model classification may propose a route;
  deterministic host admission still decides dispatch. Coordinate the selected
  technique with the context slice and architecture brief; never invent a graph
  runtime, a new agent, or additional authority from prompt wording.
  Only for an explicitly requested or already adopted Analyzer–Policy Engine–Composer
  architecture (including `schema-values-text@1`), read [stateful-agent.md](stateful-agent.md).
  Generic tool use or the word "agent" does not activate that profile.
- **Comparison** — triggers: choose, compare, recommend, rank. Resolve
  candidates, disqualifiers, criteria/weights, evidence, uncertainty, and
  recommendation conditions. Missing evidence is unknown, not a low score.
- **Creative** — triggers: write, design, ideate, vary. Resolve audience,
  intent, must-preserve constraints, allowed variation, originality boundary,
  and selection criteria without over-specifying harmless choices.
- **Long-context synthesis** — triggers: source packet, corpus, many documents,
  synthesis. Resolve source identities, authority hierarchy, claim-to-source
  mapping, conflict policy, coverage, and stopping condition. Preserve exact
  facts across chunks and cross-source joins; window capacity does not prove
  recall. Use `context-composition.md` for the requested context layout.
- **Multimodal** — triggers: image, audio, video, screenshot, diagram. Resolve
  which modality supports each claim, unreadable/missing-region behavior, and
  evidence references, inspection order, and required precision.
- **Realtime** — triggers: streaming, voice, live, interruption, low latency.
  Resolve latency/length bounds, incremental state, interruption handling, and
  handoff boundaries, event order, stale observations, state reconciliation,
  and graceful degradation.

Risk may add permission, review, abstention, privacy, confirmation, recovery,
or independent-validation obligations. Target surfaces add tool,
structured-output, context, or execution constraints only when they change the
architecture. Missing risk controls do not automatically select a higher model
tier.
