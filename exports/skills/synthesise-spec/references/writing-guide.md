# Human-Readable Software Specification Writing Guide

Use this guide for feature, change, task, design, integration, and acceptance
documents. Its goal is comprehension and trustworthy decisions, not a
particular tone or an attempt to disguise machine-generated text.

## What Human-Readable Means

A useful specification lets each reader answer, without reconstructing the
feature from other files:

- What problem changes, for whom, and why?
- What happens now, and what should happen instead?
- What can trigger the behavior?
- What will the user and connected systems observe?
- Which component owns each decision and side effect?
- What happens when a dependency is slow, unavailable, or inconsistent?
- How will we know the change works?

Do not “humanize” by adding errors, slang, personal anecdotes, filler, or
random stylistic variation. Edit for clarity, specificity, rhythm, and respect
for the reader's time.

## Design Three Reading Passes

### One-Minute Pass

Put the outcome, status, affected users, important decision, and largest risk
near the top. A reader should know whether the document is ready for a product
decision, design review, implementation, or validation.

### Five-Minute Pass

Explain the product case, exact behavior change, expected outputs, main user
journeys, business process, and important dependencies.

### Implementation Pass

Describe component ownership, integration contracts, state, data, failure and
recovery behavior, rollout, observability, and acceptance evidence.

Progressive disclosure is not omission. The detail remains available, but the
reader does not have to cross it to understand the outcome.

## State Truth On Separate Axes

Do not make one overloaded status answer three different questions:

| Axis | Labels | Meaning |
|---|---|---|
| Behavior time | `CURRENT`, `TARGET` | what exists now versus what should exist |
| Authority | `DECIDED`, `PROPOSED`, `CONFLICTING`, `UNKNOWN` | whether a governing owner has made the choice |
| Evidence | `OBSERVED`, `NOT_INSPECTED`, `NOT_RUN`, `PASS`, `FAIL`, `BLOCKED` | what was inspected or executed |

An approved target API can be `TARGET + DECIDED + NOT_RUN`: decided as a
contract, not yet proven in implementation. Record `ASSUMPTION` and `OPEN`
items separately with owners and impact; they are not evidence states.

Never use target behavior as proof of current behavior. Never call a generated
diagram, mockup, implementation plan, HTTP status, or agent statement evidence
unless it is tied to an observable check.

Use readiness just as precisely. `READY_FOR_REVIEW` means reviewers can make
the named decision. `READY_FOR_IMPLEMENTATION` means no material product,
design, integration, state, security, invariant, failure, or recovery decision
remains. Neither label means code or tests exist.

## Sentence Rules

- Lead with the actor and the action: “The worker records the receipt,” not
  “A receipt is recorded.”
- Put one main claim in each sentence.
- Prefer present tense for rules and current behavior.
- Use concrete verbs: creates, rejects, queues, persists, retries, displays.
- Name the object and boundary: “The API rejects an expired token before the
  write,” not “The system validates security.”
- Put conditions before effects when order matters: “If the provider times
  out, the job remains pending and the worker retries after 30 seconds.”
- Put the product value before implementation vocabulary: explain why the
  person benefits, then name the component or contract that delivers it.
- Define a domain term before relying on its identifier or abbreviation.
- Keep exceptions next to the rule they change.
- Use numbers, durations, limits, state names, and exact fields when known.
- Preserve normative force: “alerts operations” is not “can alert,” and “must
  reject” is not “may reject.”
- Mark unknown values instead of replacing them with vague adjectives.

Avoid:

- “handle,” “support,” “manage,” or “process” without the exact behavior;
- “robust,” “seamless,” “user-friendly,” “scalable,” or “secure” without a
  measurable property;
- “etc.,” “and so on,” or “as needed” where completeness matters;
- nominalizations such as “perform validation” when “validate” is clearer;
- several abstract nouns in a row;
- throat-clearing such as “This document aims to provide an overview of”;
- restating the same rationale in product, design, and implementation sections.

## Paragraph And Section Rules

- Start a section with its conclusion or controlling rule.
- Keep one topic in each paragraph.
- Use short paragraphs, but do not break one causal explanation into fragments.
- Use descriptive or question-shaped headings. “What changes for the user?” is
  more useful than “Details.”
- Use one descriptive document title at H1 and major sections at H2. Keep the
  hierarchy shallow; most packets need no more than three levels.
- Remove a heading when the section has no content. Do not leave “N/A” walls.
- Put source links beside the claims they support.
- Explain why near the decision, not in a distant background section.

## Choose The Right Form

Use prose for causality, rationale, tradeoffs, and nuanced constraints.

Use bullets for a true set whose order is not important. Use numbered lists
for an ordered procedure or priority.

Use tables for exact mappings or comparisons: current versus target, trigger
to result, component to responsibility, source to claim, or criterion to
evidence. Avoid wide tables that force paragraph-length cells. Split an
integration into a short summary row and a readable detail block instead.

Use diagrams when spatial, sequential, or lifecycle relationships are harder
to understand in prose. Keep the equivalent rule or transition table in text.

For invariants, prefer an enforcement mapping over reassuring prose. Name the
durable mechanism, the race or exception that tests it, recovery, and the
observable evidence. “The service prevents duplicates” is not usable without
where and how.

## Describe Journeys As Carried State

A journey is more than a sequence of screens. For every step, record:

- actor and trigger;
- user action or external event;
- system response;
- visible result;
- state carried to the next step;
- alternate, permission, failure, and recovery behavior when material.

Use the user's vocabulary for goals and actions. Use implementation vocabulary
only where the boundary itself matters.

## Describe Integrations As Observable Contracts

Do not stop at “Service A calls Service B.” Explain initiation, guards, fields,
completion, state change, failures, recovery, user-visible effect, and evidence.
When a machine-readable OpenAPI, AsyncAPI, schema, or provider contract exists,
link to it. The prose explains product and failure semantics; it does not
reproduce every schema field.

## Question Protocol

Inspect available sources before asking. Ask only if the answer can materially
change one of these:

- target user or outcome;
- business rule or permission;
- design behavior or content meaning;
- external contract or durable state;
- privacy, security, legal, or tenant boundary;
- failure, recovery, rollout, or acceptance criteria.

Ask at most three questions per round. Format each question as:

```text
Decision: <short question>
Why it matters: <behavior or artifact affected>
Recommended default: <safe default, or “none”>
If different: <what changes>
```

Use an explicit assumption for a reversible, low-risk detail. Never use an
assumption to decide a material product, security, data, or external-contract
question.

Collect unresolved items in one `Open Decisions And Risks` section. Give each
an owner, next action, impact, and whether it blocks review or implementation.

## Five Editorial Passes

### 1. Audience And Flow

Can product, design, engineering, QA, and operations find their decisions? Does
the document support the one-minute, five-minute, and implementation passes?

### 2. Specificity

Replace vague verbs and adjectives. Add actors, triggers, conditions, state,
limits, visible results, and failure behavior.

### 3. Truth And Source Status

Separate current, target, decided, proposed, assumed, and observed statements.
Add exact source references and surface contradictions.

### 4. Compression

Remove repeated context, copied source material, filler, template residue, and
details that belong in an owned schema or design artifact.

### 5. Accessibility And Scanability

Check heading order, link text, tables, code blocks, diagrams, text
equivalents, and reliance on color. Ensure the packet still works when diagrams
do not render.

## Before And After

Vague:

> The system should seamlessly handle failed integrations and notify users as
> needed.

Specific:

> If the payment provider does not respond within five seconds, the API leaves
> the invoice in `PAYMENT_PENDING` and returns the existing operation ID. The
> worker retries twice with the same idempotency key. After the final failure,
> the invoice moves to `PAYMENT_ACTION_REQUIRED`, and the billing owner sees a
> retry action and the provider error category. The UI never displays raw
> provider text.

The second version is longer because it carries necessary behavior, not because
it sounds more formal.

## Final Readability Check

- [ ] The title says what changes.
- [ ] The first screenful states outcome, status, users, and decision.
- [ ] Behavior time, authority, and evidence cannot be confused.
- [ ] Every sentence has a clear subject or an intentional rule form.
- [ ] Vague verbs and unmeasured adjectives are gone.
- [ ] Expected outputs and journeys name visible results.
- [ ] Integration descriptions cover failure and recovery.
- [ ] Tables map; prose explains; diagrams clarify.
- [ ] Each diagram has a complete text equivalent.
- [ ] Each diagram states its question, audience, scope, time, and render evidence.
- [ ] Each material invariant names enforcement, race, recovery, and evidence.
- [ ] Assumptions, questions, conflicts, and `NOT_RUN` evidence are visible.
- [ ] Open decisions and risks are consolidated with owners and readiness effects.
- [ ] No source is copied when a precise link and implication are enough.
- [ ] No template placeholders or empty headings remain.

## Primary Guidance Behind These Rules

- [Digital.gov plain-language writing](https://digital.gov/guides/plain-language/writing)
  recommends audience-specific language, active voice, present tense, and
  direct verbs.
- [Digital.gov headings guidance](https://digital.gov/guides/plain-language/design/headings)
  recommends descriptive headings that orient readers and a shallow hierarchy.
- [Digital.gov clear and short guidance](https://digital.gov/guides/plain-language/writing/clear-short)
  recommends one idea per sentence and one topic per paragraph or section.
- [W3C guidance for complex images](https://www.w3.org/WAI/tutorials/images/)
  requires a complete text equivalent for detailed diagrams and graphs.
