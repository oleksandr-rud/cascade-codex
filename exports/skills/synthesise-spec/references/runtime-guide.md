# Synthesise Spec Runtime Guide

Use this compact guide for normal specification synthesis. The longer writing
and diagram guides remain reference material for audits and specialized work.

## Choose Proportional Depth

| Band | Typical scope | Target shape |
|---|---|---|
| Compact | one component, no new integration or lifecycle | 300–800 words; change, visible output, short journey, preserved behavior, acceptance |
| Standard | several product or component states | 900–2,200 words; primary spec, one useful process view, component and acceptance mappings |
| Cross-boundary | durable state, provider, event, job, migration, or recovery | 1,800–3,500 words; primary spec plus only the companion design detail needed to remove ambiguity |
| Task slice | one bounded implementation unit with approved parent behavior | 500–1,100 words, hard maximum 1,200 unless user-set; parent link, outcome, scope, implementation contract, invariant impact, acceptance, validation, and handoff |

These are editing targets, not reasons to omit a material rule. Prefer a short
table or exact source reference over repeated prose. Do not reproduce a full
template or source packet.

Measure the completed response approximately. If it exceeds its band, remove
facts repeated between ledger, product, integration, and acceptance sections;
keep exact identifiers, failure semantics, invariant enforcement, and recovery.
Do not exceed 3,500 words for cross-boundary output unless the user sets a
different limit or a material contract would otherwise be omitted.

Every ready feature/change depth band keeps the same visible core:
`Readiness`, `At A Glance`, `Product And Change`, `Expected Outputs`, `User
Journeys`, `Acceptance And Evidence`, `Open Decisions And Risks`, and `Next
Owner Or Action`. Compact packets add `Sources And References`; standard and
cross-boundary packets use a source ledger and artifact manifest after the
product/change core and journeys. Omit irrelevant technical sections instead
of leaving empty headings.

An explicitly requested implementation unit with approved parent behavior is
a task slice, not a compressed feature spec. Use `Readiness`, `Parent Product
And Change`, `Outcome`, `Expected Output`, `Scope`, `Implementation Contract`,
`Invariants And Integration Impact`, `Acceptance`, `Validation Plan`, `Open
Decisions And Risks`, and `Next Owner Or Action`. Keep exact parent IDs and one
sentence of product value, then link instead of restating the feature or user
journeys. Add preconditions or stop rules only when material. Do not add a
ledger, manifest, or diagram unless a separate companion was requested. Keep
Acceptance as the canonical scenario matrix; Expected Output summarizes
consumers, Scope names boundaries, and the implementation/invariant sections
link by ID instead of narrating the same cases again. In the invariant-impact
table, give each row distinct change/no-change, durable enforcement,
race/failure, recovery, and evidence cells.

When both are material, keep `Component Responsibilities` and `Integrations`
as separate headings. The first maps ownership and triggers; the second owns
boundary completion and failure semantics. Source ledger and artifact manifest
tables keep behavior time, authority, and evidence in separate columns.

## Choose The Highest Safe Readiness

- `READY_FOR_REVIEW`: the packet is coherent enough for its named review, but
  consolidated implementation decisions remain open with owners and effects.
- `READY_FOR_IMPLEMENTATION`: all material product, design, boundary, state,
  security, invariant, failure, and recovery decisions are resolved. Tests and
  implementation may still be `NOT_RUN`.
- `NEEDS_INPUT`: a missing decision changes a material branch or leaves a
  durable invariant, external mutation, permission, or recovery rule without a
  safe contract.
- `BLOCKED`: a required authoritative source cannot be inspected.

Never use a ready label as shorthand for implemented, deployed, or validated.

For both gated modes, use one descriptive H1 document title and place every
permitted section at H2. For `NEEDS_INPUT`, use only these sections:
`Readiness`, `Source Inventory`,
`Established Facts`, `Conflicts Or Invariant Gap`, `Questions`, `Affected
Artifacts`, and `Next Owner Or Action`. Target 300–1,200 words and omit the
ready-packet core, detailed ledger, diagrams, and acceptance matrix. For
`BLOCKED`, use only `Readiness`, `Missing Authority`, `Work Safely Completed`,
and `Smallest Unblock Action`, normally within 150–600 words.

Before finalizing a gated packet, scan for independent blockers across product
rules, design controls, API/job guards, state reasons, permissions, and
recovery. Map every visible action to its exact operation. If one UI state
groups reasons for which that operation rejects or is unsafe, record a separate
conflict and question rather than stopping at the first gap.

## Preserve Truth, Authority, And Evidence

Keep three columns or explicit labels; do not compress them into one status:

| Axis | Values |
|---|---|
| Behavior time | `CURRENT`, `TARGET` |
| Authority | `DECIDED`, `PROPOSED`, `CONFLICTING`, `UNKNOWN` |
| Evidence | `OBSERVED`, `NOT_INSPECTED`, `NOT_RUN`, `PASS`, `FAIL`, `BLOCKED` |

- Approved but unimplemented behavior is `TARGET + DECIDED + NOT_RUN`, not
  `PROPOSED`.
- Use only the listed labels. Do not invent combined labels; describe source
  inspection outside the claim-evidence field when needed.
- Call a read source `inspected`; do not label its behavior claim `OBSERVED`
  merely because the document was opened.
- Current code or runtime evidence establishes what exists, not what product
  policy should be.
- Approved product sources own intended outcomes. Proposed designs do not
  become approved policy.
- Record an assumption or open decision separately; neither is evidence or
  authority.
- Preserve exact identifiers, limits, durations, state names, quotations, and
  negation.
- Do not compress away stable field, event, error, receipt, metric, or recovery
  tokens that readers, tests, or operators must match. Spell a canonical field
  set out once instead of referring only to its size.
- Preserve normative force. Do not weaken `must`, `rejects`, or `alerts` into
  `may`, `can`, or `can alert`.
- Surface conflicts. Never invent precedence, permission, schema, provider
  behavior, or proof.

## Ask Only Material Questions

Ask at most three questions when an unresolved answer changes product outcome,
permission, external contract, durable state, security or tenant boundary,
recovery, rollout, or acceptance.

Use exactly:

```text
Decision: <decision needed>
Why it matters: <behavior or artifact affected>
Recommended default: <safe default, or none>
If different: <what changes>
```

Use a labeled assumption for a reversible low-risk detail. Do not ask for an
implementation preference when the source already fixes observable behavior.
If an invariant lacks a durable enforcement mechanism, ask for that mechanism
or governing design decision rather than assuming the prose rule enforces it.

## Write For Three Reading Passes

1. Start with readiness, outcome, affected users, decision, and largest risk.
2. Then explain product rules, current-to-target change, expected outputs,
   journeys, and business process.
3. Put component, integration, state, data, operations, and evidence detail
   afterward.

Lead with actors and concrete verbs. Put one main claim in each sentence. Put
conditions before effects. Replace “handle,” “robust,” “seamless,” and similar
words with observable behavior or `UNKNOWN`.

Use prose for causality, bullets for sets, numbered lists for order, and tables
for mappings. Keep headings shallow and descriptive. Remove empty sections,
duplicated rationale, template instructions, and generation commentary.

## Describe Journeys And Processes

Each material journey step carries:

- actor and trigger;
- action or external event;
- system response and durable state;
- visible result;
- alternate or recovery behavior.

Cover main, permission, failure, and recovery paths only when reachable and
material. A business process describes actor handoffs and decisions; a work
plan describes delivery dependencies. Do not mix them.

## Describe Components And Integrations

For each component, name one bounded responsibility, accepted and emitted
triggers, state ownership, integration references, and visible effect.

For each visible control, state the UI state and reason, exact trigger,
operation, server guard, completion, denied outcome, and recovery. A shared
label such as `ACTION_REQUIRED` does not prove the same action is legal for
every cause.

For an external mutation, trace authorization, durable queue, worker claim,
last atomic pre-dispatch fence, request-body dispatch, and unknown outcome.
Test callbacks, cancellation, or completion signals against every stage. Name
the provider-call count and the recovery when dispatch may already have begun;
an authorization transaction alone cannot cancel queued or claimed work.

For each material integration, cover:

- initiating actor/event and exact trigger;
- guards, permissions, tenant/account scope, and validation;
- source, destination, transport, operation, and contract reference;
- acknowledgement versus completion semantics;
- ordering, concurrency, idempotency, duplicates, timeout, retry, and limits;
- writes, events, receipts, and other side effects;
- partial or unknown outcome, compensation, reconciliation, and manual recovery;
- user-visible pending, degraded, success, and failure states;
- stable error translation, logs, metrics, traces, alerts, and evidence.

Do not combine boundaries with different completion or failure semantics.

## Make Invariants Implementable

For each material invariant, use one row with:

| Invariant | Durable Enforcement Point And Mechanism | Race Or Exception | Recovery Or Repair | Acceptance Evidence |
|---|---|---|---|---|

Apply this to tenant isolation, uniqueness, monotonic state, irreversible
completion, deduplication, and no-duplicate external mutations. Check the
mechanism against every transition that can escape it. A partial unique index,
for example, does not enforce a permanent rule after a record moves outside
the indexed predicate. A missing mechanism is `NEEDS_INPUT`, not a confident
target statement.

## Choose Diagrams By Reader Question

| Question | Format |
|---|---|
| How does a user move between states? | journey table; optional screen flow |
| How does work move across business actors? | actor-lane Mermaid flowchart |
| Which systems own which responsibilities? | C4-style context/container view |
| What happens in order across boundaries? | Mermaid sequence diagram |
| Which durable transitions are allowed? | state diagram plus transition table |
| How do changed records relate? | ER view |

Use BPMN only when formal message/timer/compensation semantics matter. Give
every diagram a question, intended audience, scope and abstraction, behavior
time (`CURRENT` or `TARGET`), and render/syntax evidence (`PASS`, `FAIL`, or
`NOT_RUN`; include tool and artifact when run). Include an adjacent text
equivalent that preserves every material node, relationship, transition, and
failure path. Do not rely on color or create a single giant diagram.

For a cross-boundary packet, include both a business-actor process and a
technical sequence or state view when both actor handoffs and boundary/runtime
semantics are material. Otherwise include only the justified view. Prefer at
most two primary diagrams; add a third only when it answers a distinct material
question.

Do not claim a Mermaid block renders merely because it was generated. If no
renderer or syntax check ran, label render evidence `NOT_RUN`.

## Connect Mockups Without Overclaiming

When mockups, screenshots, prototypes, or rendered UI states are supplied or
material, read `mockup-guide.md`.

- Register each material artifact once with a stable design ID, owner/version,
  behavior time, authority, source-inspection mode, behavior evidence, selected
  scope, and exact reference.
- Inspect the relevant rendered frames, states, and viewports when accessible.
  Source markup, filenames, or a second-hand description are not visual
  inspection.
- Keep source inspection separate from behavior evidence. A viewed target
  mockup shows what the artifact depicts; it does not prove implementation,
  interaction, persistence, or provider behavior.
- Reuse the design ID beside the expected output, journey step, visible
  component/integration state, Experience And Design row, acceptance check,
  and traceability row it constrains. Do not repeat raw paths everywhere.
- Map every visible action to its exact trigger, operation, guard, completion,
  denial, and recovery. Mark product/design/API mismatches `CONFLICTING` and
  give them an owner and readiness effect.
- Record unshown states as `NOT_SHOWN`; do not infer responsive, accessibility,
  loading, empty, degraded, error, recovery, or success behavior from a single
  frame.
- Do not generate or modify mockups unless the user requested design creation
  or editing. A preview is optional; the exact source reference is required.

## Make Acceptance Observable

Trace each product rule or expected output to a journey, component/integration,
design state, and acceptance check. Use Given/When/Then where it clarifies the
observable boundary. Include negative, duplicate, stale, timeout, partial, and
recovery cases when they can change user-visible or durable state.

Separate proposed checks from evidence already collected. A mock is not live
provider proof; an HTTP success is not durable completion; a screen transition
is not persistence. Use `NOT_RUN` for every applicable check not executed.

## Consolidate Open Decisions And Risks

Do not scatter material gaps through component or integration prose. End with
one mapping of item, owner, next action, impact, and readiness effect. Missing
payload shape, idempotency scope, ordering/replay, security scope, invariant
mechanism, or unknown-outcome recovery normally prevents
`READY_FOR_IMPLEMENTATION`.

## Final Editorial Passes

1. Audience and flow: can each reader find the decision they own?
2. Specificity: are actors, triggers, limits, state, and outcomes explicit?
3. Truth: are behavior time, authority, assumption, conflict, and evidence distinct?
4. Compression: can any repeated source fact or rationale be removed?
5. Accessibility: do headings, tables, diagrams, links, and text equivalents work without color or rendering?
