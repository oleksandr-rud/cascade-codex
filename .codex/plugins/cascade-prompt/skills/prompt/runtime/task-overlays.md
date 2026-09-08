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
  For a supplied Analyzer–Policy Engine–Composer architecture brief, consume
  its frozen `event-projections-and-context-format` contract and authoring rules.
  Preserve checkpoint/attempt bindings in the private runtime manifest, proposal-only multi-policy JSON output
  by default (YAML only when configured), role/task policy-state slices issued
  by Policy Engine and admission,
  and readable semantic text sections. Never serialize the runtime envelope into
  model messages; omit its IDs/revisions/digests/timestamps even from the suffix.
  Keep only task-relevant evidence/target handles. Order approved stable content
  as system prompt, role instructions, then policy descriptions.
  Format the issued slice and approved prompt assets only; do not fetch state,
  expand references or infer broader permission. Missing content requires a new
  admitted slice. Keep task/step bindings in the private runtime manifest.
  Render selected schema/value objects as compact named blocks and ordered lists.
  Keep stable approved policy/schema descriptions separate from current values.
  Reuse identical authorized catalog fragments without changing their text;
  different preceding role instructions still prevent a shared provider prefix
  through those fragments. Local block reuse and provider cache hits are distinct.
  When the brief selects `schema-values-text@1`, bind the supplied executable
  profile/issuer contract and schema field order. The block schema is a supported
  subset, not arbitrary JSON Schema. Preserve required/optional/null distinctions;
  use admitted selected values and never replace missing host admission with
  successful parsing or formatting. Reference examples are fixture prompts.
  For iterative history caching, follow the architecture's `iterative-context-caching`
  contract: optional stable summary and completed history blocks precede current
  state/input; a changing recent-memory summary belongs in the suffix. Keep prior
  answers as attributed data, preserve admitted block bytes, and bind supported
  provider boundaries outside model text. Define compaction, window eviction and
  correction/revocation invalidation; freshness and access take precedence over reuse.
  Project definitions into the role catalog and relevant accepted state/policy-data
  effects into current context from a consistent snapshot. Reuse only after those
  projection checks; never substitute a cache lookup for policy admission.
  When the brief enables `interim-responses`, keep status separate from the main
  answer: select only an approved phrase, make no work/completion promises, and
  pass committed text to Voice. Put the selected status task in current context;
  runtime owns timing, dedupe, cancellation and priority over queued status.
  Advertise the model's semantic output schema separately from the runtime delta;
  never ask the model to fabricate private envelope fields. Changed approved rule
  definitions rebuild trusted instructions; policy-data values remain data.
  Whole-response validation precedes release unless the architecture explicitly
  supplies an incremental-release contract. Voice text is not a delivery receipt.
  Do not infer the input format from output transport or add a duplicate mutable turn store. Require
  resolvable contract content in the brief; do not invent it from the contract ID.
  Prefix equality is local evidence; cache hits and model adherence need execution.
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
