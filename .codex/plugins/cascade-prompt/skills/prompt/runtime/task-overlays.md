# Task Overlay Pack

Select one primary overlay and at most one material secondary overlay. Triggers
identify applicability; obligations define what must be resolved. Do not copy
this whole pack into the generated prompt.

- **Extraction** — triggers: extract, parse, normalize, fields, OCR, schema.
  Resolve exact fields/types, source-only evidence, accepted labels or evidence
  patterns, missing/ambiguity behavior, normalization/conversion, exact schema,
  and extra-output policy. Preserve identifiers, amounts, and currencies unless
  transformation is explicit. Undefined labels or selection priority are
  request gaps, never invented defaults.
- **Classification** — triggers: classify, route, label, triage, score.
  Resolve allowed labels, decision boundaries, priority for mixed cases,
  insufficient/conflicting evidence, abstention or human review, and exact
  output shape.
- **Research/retrieval** — triggers: research, search, cite, current, compare
  sources. Resolve authority, freshness, retrieval boundary and stop condition,
  citation format, conflict policy, and unsupported-claim behavior.
- **Coding/diagnosis** — triggers: implement, debug, repair, refactor, inspect
  logs/code. Resolve intended behavior, relevant code/log/config context,
  protected contracts, permitted writes, smallest validation seam, and evidence
  required for completion.
- **Tool orchestration** — triggers: tools, agent, execute, automate, workflow.
  Resolve available tools, selection rules, permissions and confirmations,
  budgets, tool-error behavior, recovery/cleanup, and terminal proof.
- **Comparison** — triggers: choose, compare, recommend, rank. Resolve
  candidates, disqualifiers, criteria/weights, evidence, uncertainty, and
  recommendation conditions.
- **Creative** — triggers: write, design, ideate, vary. Resolve audience,
  intent, must-preserve constraints, allowed variation, originality boundary,
  and selection criteria without over-specifying harmless choices.
- **Long-context synthesis** — triggers: source packet, corpus, many documents,
  synthesis. Resolve source identities, authority hierarchy, claim-to-source
  mapping, conflict policy, coverage, and stopping condition.
- **Multimodal** — triggers: image, audio, video, screenshot, diagram. Resolve
  which modality supports each claim, unreadable/missing-region behavior, and
  evidence references.
- **Realtime** — triggers: streaming, voice, live, interruption, low latency.
  Resolve latency/length bounds, incremental state, interruption handling, and
  handoff boundaries.

Risk may add permission, review, abstention, privacy, confirmation, recovery,
or independent-validation obligations. Target surfaces add tool,
structured-output, context, or execution constraints only when they change the
architecture. Missing risk controls do not automatically select a higher model
tier.
