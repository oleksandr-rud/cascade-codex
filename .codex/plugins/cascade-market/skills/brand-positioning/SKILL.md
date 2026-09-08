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

Create one reviewable marketing candidate. This skill owns positioning and
marketing-language semantics. Cascade Market research and opportunity methods
own external market facts,
Product owns accepted product behavior, Personas owns canonical audience
models, Design owns design-system decisions, and the target host owns durable
repository writes.

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
