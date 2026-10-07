> Local governing process: [Design index](../../../../../README.md), [one brief](../../../../../process/intake.md) and [evidence/authority](../../../../../process/review-and-evidence.md). Full [license](../../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/comparison-tool-design/references/axis-selection-patterns.md; SHA256 ee3ebf49e43c1fbf51282eb8d18046d1ac5089ad7623e963693c61f82cd29efc. License: [retained MIT notice](../../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../process/direction.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# Axis selection patterns

Strong axes, weak axes, the 8-12 rule.

Axes (the rows of the comparison) should be the dimensions that genuinely affect the decision. Done well, axes produce decisions; done poorly, they produce overwhelm.

---

## The decision-relevance principle

Each axis should affect the audience's decision. Axes that do not are decoration.

**The win.** A comparison tool with 10 axes covering capability, pricing, integration, support quality. Each axis materially affects whether the audience would choose.

**The fail.** Same tool with 35 axes including marketing-checkbox features. User overwhelmed; many cells provide no signal.

The discipline. Axes earn placement through decision relevance.

---

## Strong axes

Patterns that earn placement.

**Decision-relevant capabilities.** The 5-7 capabilities the audience explicitly evaluates.

**Cost dimensions.** Price, total cost of ownership, hidden costs.

**Constraint dimensions.** Capacity, scale ceilings, integrations, geography.

**Service dimensions.** Support quality, onboarding, SLA.

**Risk dimensions.** Vendor stability, security, compliance.

**Time dimensions.** Time to value, implementation timeline.

**The selection discipline.** Each axis answers "will this matter to the audience?" If no, cut.

---

## Weak axes

Patterns that fail.

**Marketing checkboxes.** Features on every option; checkmarks across the row. No signal.

**Nice-to-haves.** Features the audience does not weigh.

**Vendor-specific terminology.** Features named differently by each vendor; label confusion.

**Decoration features.** Added because brand has them.

**Generic checkmarks.** "Customer support: yes/yes/yes." Not differentiating.

---

## The 8-12 axis rule

Most production comparison tools work well with 8-12 axes.

**Why 8-12.**

- Below 8: comparison thin.
- Above 12: cognitive overload.

**Exceptions.**

- Highly technical audiences may absorb 15-20.
- Consumer audiences may tolerate 6-8.

**The over-12 trap.** Each axis beyond 12 reduces engagement.

---

## Axis ordering

Within the comparison, order matters.

**Strong order.** Most decision-relevant first.

**Weak order.** Random; alphabetical; feature-category without importance weighting.

**The first-axis discipline.** First axis should be one of the most important; users may skim past later axes.

---

## Axis grouping

When axes group naturally.

**Grouping patterns.** Capability axes together; cost together; service together; risk together.

**Strengths.** Easier to scan.

**Weaknesses.** Group dividers add visual complexity.

**When to use.** When axis count justifies (10+ axes).

---

## Axis content per cell

What each cell shows.

**Beyond checkmarks.** "Yes/no" rarely produces decisions. Numbers, descriptions, comparisons add depth.

**Examples.**

- Cost: "$X/month" not just "Yes" to "has pricing."
- Capacity: "Up to 1000 users" not just "Yes" to "scales."
- Support: "24/7 chat plus phone" not just "Yes" to "support."

The cell content discipline. Depth where decisions need it.

---

## Axis defaults

Which axes show by default; which behind toggle.

**Default-shown axes.** The 8-12 most decision-relevant.

**Toggle-shown axes.** Less critical; audience can expand.

**The hide-bias trap.** Hiding axes where brand loses; detection eventual.

**The honest-default principle.** Defaults reflect audience importance; not brand strength.

---

## Axis updates

Axes decay.

**What decays.**

- Axes that lost relevance.
- Axes that gained relevance.
- Axis content stale.

**Maintenance cadence.** Quarterly review.

---

## Axis testing

Validate axes with the audience.

**Methods.**

- User research: which axes do they consider?
- A/B test: different axis sets.
- Sales-call mining: which axes do prospects ask about?

The validation discipline. Axes are hypotheses; validate.

---

## Common axis failures

**Too many axes.** Cognitive overload.

**Too few axes.** Comparison thin.

**Wrong axes.** Audience does not weigh them.

**Marketing-checkbox axes.** No signal.

**Vendor-specific terminology.** Label confusion.

**Hidden axes where brand loses.** Bias detected.

**Stale axis content.** Pricing or features outdated.

**Axis ordering ignores importance.** First axes are not most critical.

---

## Methodology-level choices that stay in the public skill

The decision-relevance principle. Strong axes (6 patterns). Weak axes (5 patterns). The 8-12 rule. Axis ordering. Axis grouping. Cell content. Axis defaults. Updates. Testing. Common failures.

## Implementation choices that stay internal

Specific axes for specific tools. Specific cell content. Specific tooling. The team's audit calendar. These vary by team.
