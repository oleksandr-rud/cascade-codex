---
name: brand-positioning
description: Create, revise, or audit source-grounded brand positioning, message hierarchy, naming, tone, proof language, trust language, copy rules, or marketing direction from accepted market, product, and audience evidence; do not use to invent market proof, redefine product behavior, or implement UI.
---

# Brand Positioning

When the reason to choose is undecided, use the entry-strategy method through
cascade-market:evaluate-market-opportunity before turning it into a promise.
Keep a claim-to-proof map by audience, product version, population, measure and
horizon. Demonstrations support demonstrated capability, not unmeasured efficacy.
For creative concepts, acquisition-to-outcome continuity or channel/lifecycle
strategy, use cascade-market:plan-growth; retain message wording here.

Lead product and marketing surfaces with the actor's useful result, supported
proof, relevant conditions, and a matching action. Process stories and system
activity are secondary unless they help that decision. Microcopy states the
actual pending, confirmed, partial, or failed result and the next useful action;
it never upgrades a request or an assumption into success. Route visual treatment
through cascade-design:design-system and its shared outcome UI default; Marketing
owns the promise and meaning, while Design owns composition and visual materials.

For interactive product or marketing surfaces, consume the shared Generative UI
practice through `cascade-design:design-system`, `references/generative-ui.md`.
Bind promise, proof, conditions and call to action to the supported view and
actual state in the existing message map; a simulated example proves no outcome.

Create one reviewable marketing candidate. This skill owns positioning and
marketing-language semantics. Cascade Market research and opportunity methods
own external market facts,
Product owns accepted product behavior, Personas owns canonical audience
models, Design owns design-system decisions, and the target host owns durable
repository writes.

## Delivery mode

Choose the delivery mode before following artifact-production steps below.
For a standalone explanation, recommendation, review or prose draft without a
structured-output request, return one useful answer. Preserve every applicable
substantive requirement: evidence and source authority, uncertainty, conflicts,
permissions, acceptance/recovery conditions, decision status and next action.
The output lists specify information to cover, not extra files or repeated prose.
Do not invent IDs, hashes, receipts or approval to make a prose answer look formal.
Do not label that answer a validated canonical artifact or completed handoff.

For an explicitly requested structured/canonical artifact, persistence,
evaluation, or actual cross-plugin handoff, apply all artifact-production steps,
required schemas, fields, source bindings, ledgers, digests, validators and gates
below unchanged. Provide the artifact once; add only the explanation needed to
use it. A prose projection never substitutes for required machine-readable data.
Missing material evidence or authority remains a gap or blocker in either mode.

## Source Order

1. Latest user brief and explicit decisions.
2. Frozen `cascade-market:research-market` evidence and, when a decision is
   needed, `cascade-market:evaluate-market-opportunity` output for category,
   alternatives, buying context, or proof claims.
3. Accepted `cascade-product:define-product` intent and behavior.
4. Frozen `cascade-personas:compile-persona` projection when audience detail
   is material.
5. Existing brand, marketing, design, glossary, public-copy, and support
   artifacts supplied by the host.

Separate explicit source facts from assumptions. Do not invent market claims,
competitors, proof points, or research conclusions.

## Scope

Use this skill for:

- positioning statements;
- audience and category framing;
- promise, proof, differentiation, and trust language;
- naming and terminology;
- message hierarchy and value props;
- tone, voice, microcopy, error copy, and empty-state copy rules;
- visual direction notes that affect design tokens or UI treatment;
- content non-goals and avoid lists.

Do not use this skill for product acceptance criteria, component implementation,
style-system coding, architecture, or issue-only writeups unless brand/content
intent is the blocker.

## Checklist

1. Classify the brand change:
   - positioning;
   - naming or terminology;
   - audience or category;
   - promise and proof;
   - message hierarchy;
   - tone and copy rules;
   - visual direction;
   - content risk or avoid list.
2. Bind every audience, category, promise, differentiation, and proof statement
   to its source. Mark unsupported proposals as hypotheses; never promote them
   into facts.
3. Identify the affected audience or persona projection. Route behavior changes
   back to Cascade Product rather than encoding them as marketing copy.
4. Write positioning in this shape:
   `For <audience>, <product/category> helps <job> by <promise>, proven by <proof>.`
5. Define message hierarchy:
   - primary promise;
   - secondary value props;
   - proof points;
   - trust or safety language;
   - terms to use and avoid.
6. Define tone and copy rules:
   - register;
   - personality;
   - directness;
   - error and empty-state behavior;
   - prohibited phrasing.
7. Record visual direction only as brand intent. Route tokens, components,
   accessibility, and interaction rules to `cascade-design:design-system`.
8. Return downstream impacts for product, design, glossary, public copy,
   support, and evaluation. Route prompt construction to
   `cascade-prompt:prompt` and semantic qualification to
   `cascade-evals:agent-evaluation`; do not mutate those owners from this
   skill.

## Templates

- `templates/brand-positioning.md`
- `templates/message-map.md`

## Output

Keep the user-facing answer concise. Output requirements specify information,
not extra headings. Preserve required schemas, evidence and permissions. Avoid
duplicate artifact prose, empty sections, unsolicited variants and extra files
unless needed for the requested delivery or an actual handoff.
Use status precisely:

- `PROPOSED` when accepted sources support a reviewable marketing candidate;
- `GAP` when missing or conflicting market, product, persona, or proof evidence
  prevents a grounded candidate or claim;
- `ABSTAIN` when the requested effect is product redefinition, UI/runtime
  implementation, publication, outreach, external write, or spend rather than
  positioning work; preserve any supplied candidate and route each effect to
  its owner without performing it;
- `BLOCKED` only when an otherwise in-scope positioning task has the necessary
  inputs but a required installed dependency or authorized environment is
  temporarily unavailable.

Do not use `BLOCKED` as a synonym for refusing an out-of-scope effect.

- brand artifact type and source identity;
- positioning, audience, promise, proof, tone, and naming decisions;
- assumptions and open questions;
- source bindings and hypothesis labels;
- affected Product, Design, Persona, glossary, public-copy, support, and
  evaluation consumers;
- candidate versus accepted state;
- next owner and every phase that remains `NOT_RUN`.

For a Cascade Evals case whose visible fixture contains `output_contract`,
return exactly one strict I-JSON object with exactly these top-level fields:
`disposition`, `content`, `source_bindings`, `authority_boundaries`, and
`handoffs`. `disposition` is the case status string (`PROPOSED`, `GAP`,
`ABSTAIN`, or `BLOCKED`), never a nested object. `content` is a non-empty
object containing only the grounded candidate, gaps, or preserved boundary
state that applies to the case.

Each `source_bindings` item has exactly `kind`, `id`, `version`, `sha256`,
`status`, `supports`, and `limitations`. Preserve every visible frozen source
identity exactly once. `supports` is an array of strings and `limitations` is a
non-empty string; do not replace a missing identity, digest, time, or proof with
an invented value. Each `authority_boundaries` value is a non-empty string.
Each `handoffs` item has exactly `owner`, `required_artifact`, `next_action`,
and `status`, with `status: "NOT_RUN"`; use the exact owners named by the
fixture. This evaluation envelope is a candidate/result contract, not durable
publication, downstream execution, or proof that the underlying market claims
are true.
