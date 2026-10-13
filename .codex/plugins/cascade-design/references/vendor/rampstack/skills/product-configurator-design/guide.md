> Local governing process: [Design index](../../../../README.md), [one brief](../../../../process/intake.md) and [evidence/authority](../../../../process/review-and-evidence.md). Full [license](../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/product-configurator-design/SKILL.md; SHA256 cd0b2ae4d2e3e605545fd198fd627fa5e3378842344c20e434ef478412d1f854. License: [retained MIT notice](../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../process/prototype-and-build.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

> Additional local revision DR-R02, Cascade Codex, 2026-10-07: Route supported input/state/prototype concerns to their real local guides; leave numerical logic and commercial promises with Product/Marketing. The original pinned source and prior prepared copy remain unchanged audit evidence; the active text below is adapted, not verbatim upstream.

# Product Configurator Design

For an operational editor, use this full reference selectively for defaults, constraints, validation, retained draft/current state and switch/cancel/recovery. Pricing, purchase, cart, accounts, email/share and conversion are conditional on actual supported product behavior; none is introduced by this guide. Use [prototype and state decisions](../../../../process/prototype-and-build.md).

A senior product marketing director's playbook for designing build-your-own product configurators. Tesla-style vehicle configurators, custom-pricing builders, plan-builders, product customizers. Constraint logic, real-time pricing, validation, save-and-share mechanics. The discipline of building a configurator that produces configurations users actually commit to.

Most configurators fail in one of two ways. They expose every parameter at full granularity (47 toggles, 12 sliders) and produce decision paralysis; users abandon halfway through. Or they pretend to be configurators but are actually three pre-built bundles labeled "Custom"; the configurator framing was marketing while the product is bundles.

The configurators that work do something different. Smart defaults that produce a sensible starting configuration; meaningful constraints that prevent invalid combinations and surface why; escape hatches into deeper customization for users who want it; real-time pricing that responds to choices. Users feel guided rather than overwhelmed.

The voice is the senior product marketing director who has watched configurators double conversion when redesigned with smart defaults and watched them collapse when "more options" were added without constraint logic. Practical, opinionated about the constraints that protect users from themselves, willing to call out when canned bundles are the right answer.

When to use this skill: scoping a build-your-own configurator for the first time, auditing a configurator with high abandonment, designing the constraint logic that prevents invalid combinations, or deciding which parameters earn exposure vs which should default.

---

## What this skill covers

This skill spans build-your-own product configurators. The growth-tooling distinctions:

- Calculators give a numerical estimate from inputs; a configurator builds an option through multiple decisions. Use [domain controls](../../../../topics/domain-controls.md) for input units, constraints and feedback, and [prototype and build](../../../../process/prototype-and-build.md) for visible states and inspected previews. Product owns the actual formula, rounding and result meaning; missing numerical rules remain a gap.
- [local comparison tool design reference](../comparison-tool-design/guide.md) is comparing known options. This skill builds a custom option.
- [local multi step form design reference](../multi-step-form-design/guide.md) is data capture. This skill is configuration design.
- **[local product configurator design reference](guide.md) (this skill)** is constraint logic, real-time pricing, validation, save-and-share, and configurator-to-cart handoff.
- [local prototype and build procedure](../../../../process/prototype-and-build.md) is the spec for engineers building the configurator.

The audience: product marketers, growth marketers, ecommerce teams, B2B teams shipping configurable products, agencies running configurator work for clients.

Out of scope: defining a numerical calculation model, unconfirmed pricing or commercial promises, production implementation and platform configuration. Product owns calculation/configuration truth; Marketing owns offer and pricing-copy claims within that truth. For comparison presentation use the [local comparison reference](../comparison-tool-design/guide.md); for supported controls and prototype states use the local guides above. The [direction procedure](../../../../process/direction.md) applies to visual and interaction choices when that phase is needed.

---

## The configurator decision: when configurators earn investment vs when bundles suffice

Before designing the configurator, decide whether a configurator is the right answer.

**Configurators earn investment when:**

- The product has genuinely customizable parameters that affect outcome and cost.
- The audience values customization beyond what bundles offer.
- The team can support the configuration logic (validation, pricing, fulfillment).
- The combinatorial space is meaningful but constrained (not literally infinite).

**Configurators do NOT earn investment when:**

- The product is essentially bundles. Calling them "configurations" is marketing, not product.
- The audience does not value customization. Some audiences want to choose from curated options, not build.
- The combinatorial space is so large that no audience can navigate it.
- Customization produces invalid combinations the team cannot prevent.
- A simpler comparison or selection tool would serve.

The decision is not "should we have a configurator"; it is "is the configurator the right tool for this product and audience."

Detail in [`references/configurator-decision-criteria.md`](references/configurator-decision-criteria.md).

---

## Infinite-options vs canned-bundles-only vs guided-configuration

The keystone framing.

**Infinite-options.** Every parameter exposed at full granularity. 47 toggle switches and 12 sliders. Decision paralysis. Users abandon halfway through; few complete a configuration. Cost: design effort produces a configurator nobody completes; conversion suffers.

**Canned-bundles-only.** "Configurator" that is actually three pre-built bundles labeled Basic/Pro/Enterprise. No real customization. The configurator framing was marketing; the product is bundles. Cost: audience that came expecting customization feels deceived; conversion suffers because expectations did not match reality.

**Guided-configuration.** Smart defaults that produce a sensible starting configuration; meaningful constraints that prevent invalid combinations; escape hatches into deeper customization for users who want it; real-time pricing that responds to choices. Cost: design effort upfront is significant; conversion typically improves meaningfully because users complete configurations they commit to.

The litmus test. Hand the configurator to a stranger in the target audience. Do they reach a configuration they would actually buy in under 5 minutes without expert help? If yes, guided-configuration. If they paralyze at the options, infinite-options. If they only see bundles, canned-bundles-only.

---

## Default-configuration design

The starting point.

**The principle.** The configurator opens with a sensible default configuration. The user adjusts from there.

**Default selection.**

- The configuration most audiences would choose.
- Reflects audience research (sales-call mining, prior configurations).
- Inferable from referrer, query, or stated preference.

**Default presentation.**

- Default visible immediately; user sees a complete configuration with price.
- Adjust controls obvious; user knows what is changeable.
- Reset-to-default available; users who experiment can return.

**The blank-canvas trap.** Configurator opens empty; user must build from scratch. Decision paralysis at the start.

**The cure.** Default-heavy. The user adjusts; never builds from zero.

Detail in [`references/default-configuration-design.md`](references/default-configuration-design.md).

---

## Constraint logic

Preventing invalid combinations; surfacing why.

**The principle.** The configurator should not let users build invalid configurations (combinations that cannot ship, cannot be priced, or do not work together). When constraints engage, the configurator surfaces why.

**Constraint patterns.**

- **Hard constraints.** "Option A and Option B are incompatible." Configurator prevents the combination; explains why.
- **Soft constraints.** "Combining Option A with Option C is unusual but possible." Configurator allows; warns.
- **Implication constraints.** "Selecting Option A requires Option D." Configurator auto-includes D; explains.
- **Capacity constraints.** "This configuration exceeds shipping capacity." Configurator caps; explains.

**Constraint communication.**

- Why this constraint engaged.
- What user can do (different option, contact for custom).
- No friction-only blocking; always offer a path.

**The over-constrained trap.** Too many constraints; user feels boxed in.

**The under-constrained trap.** User builds configuration that fails at checkout or fulfillment.

Detail in [`references/constraint-logic-patterns.md`](references/constraint-logic-patterns.md).

---

## Real-time pricing and impact display

Pricing that responds to choices.

**When actual pricing is in scope:** make the effect of a supported choice visible and accurate. An operational node configuration instead shows actual parameter/value/validation consequences; do not invent price or purchase behavior.

**Strong pricing display.**

- Total price prominent and updated in real time.
- Per-choice impact visible ("Adds $X" or "Saves $X").
- Breakdown available ("How is this priced").
- Currency and locale appropriate.

**Weak pricing display.**

- Price hidden until the end.
- Per-choice impact invisible; user does not know what each option costs.
- Breakdown not available; total is opaque.

**The price-shock trap.** User configures heavily; reaches checkout; sees a price they did not expect; abandons.

**The cure.** Price visible throughout. No surprises at checkout.

Detail in [`references/real-time-pricing-patterns.md`](references/real-time-pricing-patterns.md).

---

## Validation and error patterns

When the configurator catches invalid input.

**The principle.** Validation should be helpful, not punitive.

**Validation patterns.**

- **Inline validation.** Error appears next to the invalid choice.
- **Pre-emptive validation.** Constraint logic prevents the error from being possible.
- **Final validation.** Pre-checkout review surfaces any remaining issues.

**Error communication.**

- Specific to the issue.
- Explains why.
- Offers a path (alternative option, contact for custom).

**The validation-strict trap.** Validation rejects valid edge-case inputs.

**The validation-loose trap.** Configurator accepts inputs that fail downstream.

Detail in [`references/validation-and-error-patterns.md`](references/validation-and-error-patterns.md).

---

## Save-and-share mechanics

Configurations users return to or send to others.

**The principle.** Configurators that serve real decision-making produce configurations users want to save and share.

**Save patterns.**

- **Email-link save.** User enters email; configuration link emailed.
- **Account-based save.** Logged-in users save automatically.
- **Anonymous-session save.** Browser-based persistence.

**Share patterns.**

- **Shareable URL.** Configuration encoded in URL; share via any channel.
- **Embed code.** Configuration embeddable on other sites or in proposals.
- **Email share.** Direct email-to-recipient with configuration.

**Why save-and-share matters.**

- Multi-decision purchases require deliberation.
- B2B configurations often need stakeholder review.
- Returning users continue rather than restart.

Detail in [`references/save-and-share-mechanics.md`](references/save-and-share-mechanics.md).

---

## Configurator-to-cart handoff

When the user commits.

**For an actual commerce flow:** preserve the configuration through its supported cart handoff. For an operational editor, preserve the supported selected-object/current/draft configuration through apply, switch, cancel or recovery; actual domain semantics govern.

**Handoff patterns.**

- Configuration becomes the cart item.
- Cart shows the configuration summary.
- Edit-from-cart returns to configurator with state preserved.

**The handoff failure.** Configuration partially preserved; cart shows a generic SKU; user cannot tell if their custom build is reflected.

**The cure.** Handoff loop closed. Configuration visible in cart; price matches; edits possible.

Detail in [`references/configurator-to-cart-handoff.md`](references/configurator-to-cart-handoff.md).

---

## Common failure modes

Rapid-fire. Diagnoses in [`references/common-configurator-failures.md`](references/common-configurator-failures.md).

- "Users abandon halfway through configuration." Likely infinite-options pattern; too many decisions.
- "Configurator generates valid-looking configs that fail at fulfillment." Under-constrained; constraint logic missing.
- "Users complain about price surprises at checkout." Pricing not real-time or hidden until end.
- "Sales says many users contact for help configuring." Configurator too complex for audience; defaults wrong.
- "Users save configurations but do not return." Save mechanism works but follow-up missing.
- "Configurator works on desktop, breaks on mobile." Mobile UX broken.
- "Audience completes but conversion to purchase is low." Configurator works; commitment friction at handoff.
- "We added more options; abandonment climbed." Crossed the cognitive-load threshold.
- "Constraint engaged but user did not understand why." Communication broken; users feel arbitrarily blocked.

---

## The framework: 12 considerations for configurator design

When designing or auditing a configurator, walk these 12 considerations.

1. **The configurator decision.** Is configurator the right tool, or do bundles serve?
2. **Guided-configuration, not infinite-options or canned-bundles-only.** Smart defaults plus meaningful constraints plus escape hatches.
3. **Default configuration sensible.** User adjusts from default; does not build from zero.
4. **Constraint logic prevents invalid combinations.** Hard, soft, implication, capacity constraints.
5. **Constraint communication clear.** Why constraint engaged; what user can do.
6. **Real-time pricing visible.** Price updates with choices; breakdown available.
7. **Validation helpful.** Inline; specific; offers paths.
8. **Save-and-share works.** Multi-session; shareable; B2B-friendly.
9. **Configurator-to-cart handoff preserves state.** Cart shows configuration.
10. **Mobile parity.** Configurator works on the devices the audience uses.
11. **Actual task success.** Use the product outcome: correct selection/configuration, recovery and observed application/persistence when supported; downstream purchase only for commerce.
12. **Maintenance discipline.** Configurations updated as product changes; quarterly audit.

The output of the framework is a configurator that earns the configuration that ships, with constraint logic, pricing, and handoff working together to produce commitments users keep.

---

## Reference files

- [`references/configurator-decision-criteria.md`](references/configurator-decision-criteria.md) - When configurators earn the build vs when bundles serve.
- [`references/default-configuration-design.md`](references/default-configuration-design.md) - The starting point. Default selection and presentation.
- [`references/constraint-logic-patterns.md`](references/constraint-logic-patterns.md) - Hard, soft, implication, capacity constraints. Communication patterns.
- [`references/real-time-pricing-patterns.md`](references/real-time-pricing-patterns.md) - Price updates with choices. Breakdown and impact display.
- [`references/validation-and-error-patterns.md`](references/validation-and-error-patterns.md) - Helpful validation. Inline, pre-emptive, final.
- [`references/save-and-share-mechanics.md`](references/save-and-share-mechanics.md) - Email-link, account, anonymous, shareable URL, embed.
- [`references/configurator-to-cart-handoff.md`](references/configurator-to-cart-handoff.md) - Handoff that preserves configuration; cart visibility; edit-from-cart.
- [`references/configurator-anti-patterns.md`](references/configurator-anti-patterns.md) - The patterns that look like configurators but degrade conversion.
- [`references/common-configurator-failures.md`](references/common-configurator-failures.md) - 9+ failure patterns with diagnoses and cures.

---

## Closing: configurators earn investment when they earn the configuration that ships

The configurators that work as compounding assets are the ones that produce configurations users commit to. Not 50-cell decision matrices. Not bundles dressed as configurators. Configurations the user built, priced, validated, saved, and bought.

That is the bar. Below the bar are infinite-options (decision paralysis; users abandon) and canned-bundles-only (configurator framing without real customization; users feel deceived). Above the bar are guided-configuration tools where smart defaults, meaningful constraints, real-time pricing, validation, and save-and-share work together to produce commitments.

The discipline is in the design choices. The decision to build a configurator at all. The default configuration that opens the experience. The constraint logic that protects users from invalid combinations. The pricing that updates with choices. The validation that helps without punishing. The save-and-share that supports multi-decision purchases. The cart handoff that preserves the configuration. The maintenance that keeps the configurator in sync with the product it represents.
