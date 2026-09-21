# Context composition and template selection

Use for an explicit context layout or material multi-source/history composition.
A research answer combining public web evidence with an internal knowledge base
or database requires the grounded-answer template even without a template request.
This pack renders the resolved contract; it does not choose an agent topology.

## Select one starting template

| Need | Template relative to this pack |
|---|---|
| Answer/synthesize from one or more sources | [grounded-answer.md](../assets/templates/grounded-answer.md) |
| Bounded source-only extraction into a supplied schema | [structured-extraction.md](../assets/templates/structured-extraction.md) |
| Authorized tool work with current state and history | [contextual-agent.md](../assets/templates/contextual-agent.md) |
| Adopted state/claims/memory flow with distinct interpretation and response roles | [selective-state-context.md](../assets/templates/selective-state-context.md) |

Choose by the requested result: a source-backed answer or research synthesis
uses grounded-answer even when retrieval needs web/database tools. Add its
resolved retrieval controls from grounded.md and task-overlays.md. Choose
contextual-agent when continued action over current state/history is itself
the task. The presence of tools or a call budget alone does not select it.

Templates are starting points, not extra mandatory sections. Fill resolved
variables from the request and omit irrelevant blocks. Unresolved material
schema, authority or decision rules still follow the intake gate. Expose
remaining source placeholders in Variables to Fill; never invent content.
Insert each full source/history placeholder once unless separate copies are
required by the resolved task; use block names for later references. Merge
overlapping obligations rather than repeating template prose. Keep the
requested output shape; otherwise require the shortest useful answer with
necessary evidence and gaps. Internal source ledgers and validation steps are
not automatic user-facing sections or separate attachments.

## Compose only needed context

Content relevance, claim extraction and meaning-dependent selection require LLM
interpretation into structured proposals. Deterministic selectors consume
validated fields and explicit scope/freshness rules; do not use keyword/regex
matches to decide meaning or promote evidence. Search may locate candidate
passages, but matching words alone cannot establish relevance or support.

1. Put trusted stable task rules, output definitions and permissions in the
   strongest role supported by the host. Provider settings stay outside prose.
2. Add only source passages needed for each material requirement. Use source
   identity, section, freshness and scope where needed for citations/conflicts;
   keep implementation-only digests and runtime IDs outside model messages.
3. Treat retrieved passages, tool observations and prior answers as attributed
   data. Use separate messages or escaped, consistently delimited blocks; source
   text containing a closing delimiter must not create a trusted instruction.
4. Put current input and volatile state after stable content. Include accepted
   decisions and unfinished work only when necessary; summaries must preserve
   exact constraints, corrections, negations, source identities and open gaps.
   A prior answer or summary is not independent factual evidence.
5. Budget trusted instructions + selected evidence + history + tools/modalities
   + generation against the actual deployment window, reserving output and
   internal reasoning capacity where applicable. No universal 27B token quota.
   If it does not fit, retrieve/chunk by requirement; preserve cross-source joins
   and audit coverage. Do not silently truncate hard rules or pretend all
   documents were read.
6. Stop retrieving once material claims are supported or remaining gaps are
   explicit. Cache only eligible stable prefixes; cache hits require provider
   evidence. Invalidate summaries/reuse when source authority, permissions or
   accepted decisions change. Freshness outranks reuse.

For schema output, validate the final answer against the supplied schema and
claim/evidence rules. A schema-valid unsupported answer still fails. One bounded
repair may consume concrete validation errors; unavailable tools or missing
authority are gaps, not reasons to invent successful execution.

For state/claims/memory targets, bind sections to their actual owners: trusted
role rules, current input, domain state, evidence/claims, continuity, valid memory,
pending work and response requirements. Use only sections required by that role.
Claims are assertions, domain records own operational state, and summaries are
derived memory. Each section declares source, scope, freshness, dependencies,
budget and gap handling. Initial interpretation must work from the current input
and known task before proposing any additional semantic retrieval. Graph links
assist selection; they do not establish truth or disclosure authority.

## Recommended option: context for one workflow step

For an adopted multi-step workflow with meaningful dependency or authority
boundaries, recommend a distinct context slice per model step. For one bounded
task, retain the single-context baseline. This pack does not choose or execute
the graph.

Map each step's objective and output obligations to required evidence and
accepted predecessor results. Include stable role rules, current task/input,
relevant decisions, unresolved obligations and source handles. Keep other
material retrievable only through authorized paths. Distinguish unavailable,
pending, rejected and conflicting results; a join or previous answer is not
independent evidence. If required content cannot fit, preserve the gap rather
than silently omitting it.

Bind source selection, freshness and dependency validation to the host owner.
Invalidate affected context after corrections, revocation or accepted state
changes. Format the issued slice with stable instructions before volatile data;
keep execution IDs, revisions and digests in the private manifest. In the
stateful profile, only Policy Engine/admission issues a replacement slice;
the context renderer gains no store access or retrieval authority.

Review the context slice with its step prompt and architecture contract.
Compare against the simpler baseline using evidence coverage, unsupported
claims, context size and task completion; do not infer quality from token
reduction or a graph diagram.

Never add Analyzer–Policy Engine–Composer state contracts for a generic context
template. Only an explicitly adopted architecture selects `stateful-agent.md`.
