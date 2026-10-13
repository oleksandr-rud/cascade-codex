> Local governing process: [Design index](../../../../../README.md), [one brief](../../../../../process/intake.md) and [evidence/authority](../../../../../process/review-and-evidence.md). Full [license](../../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/product-configurator-design/references/configurator-decision-criteria.md; SHA256 f1587bd82d9aca953ca2b9473d5decc3dc9d75e217f00473a62ccc79e8fbbe72. License: [retained MIT notice](../../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../process/prototype-and-build.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# Configurator decision criteria

When configurators earn the build vs when bundles serve.

A configurator is meaningful work. Constraint logic, real-time pricing, validation, save-and-share, cart handoff, ongoing maintenance. The configurator earns this investment only when specific conditions are present.

---

## When configurators earn the build

Five conditions that, when present, make a configurator a strong investment.

**The product has genuinely customizable parameters that affect outcome and cost.** Not just cosmetic options; real parameters that change what the user gets.

**The audience values customization beyond what bundles offer.** Some audiences want choice; others prefer curated bundles.

**The team can support the configuration logic.** Validation, pricing, fulfillment for variable configurations.

**The combinatorial space is meaningful but constrained.** Not literally infinite; not so small that bundles would suffice.

**The success metric is defined.** Configuration completion rate, configuration-to-purchase rate, average configuration price.

When all five are present, a configurator is strong investment. When two or fewer are present, bundles often serve better.

---

## When configurators do NOT earn the build

Funnels where configurators add complexity without lift.

**The product is essentially bundles.** Calling them configurations is marketing.

**The audience prefers curated options.** Some audiences resent customization friction.

**The combinatorial space is too large.** No audience can navigate.

**Customization produces invalid combinations.** Team cannot prevent; users hit failures.

**A simpler tool would serve.** Comparison, calculator, or selection tool.

The honest assessment matters. Configurators are sometimes the wrong tool.

---

## Configurators vs bundles

When each fits.

**Bundles strengths.** Simple; clear; no decision paralysis. Easy to maintain.

**Bundles weaknesses.** Audiences that need customization underserved.

**Configurators strengths.** Match real customer needs; capture revenue from edge cases.

**Configurators weaknesses.** Build cost; complexity.

**The combined approach.** Some products offer bundles AND a configurator for users who want custom.

---

## The opportunity-cost frame

Configurators are significant work.

**Build cost.** Constraint logic, pricing engine, save-and-share, validation, cart integration. 60-200 engineering hours typical.

**Maintenance cost.** Product changes trigger configurator updates. 4-12 hours per quarter.

**Opportunity cost.** Better bundles, comparison tool, calculator. The configurator has to clear those alternatives.

The decision frame. Configurators earn investment when they produce more revenue than bundle-only or alternative formats.

---

## Decision worked example

A B2B SaaS with seat-based + add-on pricing.

**Conditions check.**

- Genuinely customizable: yes (seats, add-ons, integrations).
- Audience values customization: yes; team size and add-ons vary.
- Team can support: yes.
- Combinatorial space: meaningful but constrained.
- Success metric: defined.

**Decision.** Build the configurator.

The decision was deliberate.

---

## Decision worked example: when bundles serve

A consumer SaaS with three plans.

**Conditions check.**

- Genuinely customizable: no; plans are bundles.
- Audience values customization: no; users pick plans.
- Combinatorial space: trivial.

**Decision.** Bundles. No configurator needed.

The decision was right-sized.

---

## When to retire a configurator

Configurators can become wrong over time.

**Retire when:**

- Conversion declined and refinements have not moved it.
- Most users default-and-purchase; customization unused.
- Product changed; configurator no longer matches.

The retire-or-redesign discipline frees capacity.

---

## Methodology-level choices that stay in the public skill

The five conditions for configurators. The five against. Configurators vs bundles. Opportunity-cost frame. Decision worked examples. The retire decision.

## Implementation choices that stay internal

Specific configurator decisions for specific products. Capacity benchmarks. Tooling. These vary by team.
