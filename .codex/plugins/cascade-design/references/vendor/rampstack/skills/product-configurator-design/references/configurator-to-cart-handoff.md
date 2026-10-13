> Local governing process: [Design index](../../../../../README.md), [one brief](../../../../../process/intake.md) and [evidence/authority](../../../../../process/review-and-evidence.md). Full [license](../../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/product-configurator-design/references/configurator-to-cart-handoff.md; SHA256 dded80a2806dc007deed369981f5cdb1002a943817b18b4b77716f22f4635a4c. License: [retained MIT notice](../../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../process/prototype-and-build.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# Configurator-to-cart handoff

Handoff that preserves configuration; cart visibility; edit-from-cart.

When the user commits, the handoff to cart determines whether the commitment sticks. Done well, handoff preserves the configuration; done poorly, the cart shows generic SKUs and the user feels their custom build was lost.

---

## The preserve-the-build principle

The configuration becomes the cart item. The cart shows the configuration. Editing returns to the configurator with state preserved.

**The win.** User finishes configuration; clicks add to cart; cart shows the custom configuration with breakdown and price; user can edit, returning to configurator with all choices preserved.

**The fail.** User finishes; clicks add to cart; cart shows "Custom Product - $X" with no detail. User cannot tell if their build is reflected.

The discipline. Handoff loop closed.

---

## Cart presentation

How the configuration appears in cart.

**Configuration summary.** Key choices listed (not all; not none).

**Price breakdown.** Subtotal matches configurator's price.

**Edit link.** Clear path back to configurator with state preserved.

**Visual.** If configurator shows visual configuration, cart shows it too (or summary image).

---

## Edit-from-cart

When user wants to change.

**Pattern.** Cart includes "Edit configuration" link.

**Behavior.**

- Click; return to configurator.
- All choices loaded.
- Adjust; commit; cart updates.

**The lose-state-on-edit failure.** User clicks edit; configurator restarts; previous choices lost.

The cure. State preserved through the handoff loop.

---

## Multi-item handoff

When the user configures multiple items.

**Pattern.** Each configuration becomes a separate cart item with its own summary.

**Edit each independently.** User can edit one without affecting others.

---

## B2B configurator-to-quote

When the configurator generates a quote rather than direct cart.

**Pattern.** Configuration generates a quote; quote can be shared, approved, then converted to order.

**Strengths.** B2B workflows often require approval.

**The discipline.** Quote includes everything the configuration includes; conversion to order preserves.

---

## Handoff to checkout

After cart, checkout.

**The principle.** Configuration details flow through checkout. Confirmation email reflects the configuration.

**The drop-config-at-checkout failure.** Configuration disappears at checkout; user cannot verify.

The cure. Configuration visible throughout the funnel.

---

## Configuration ID

The technical bridge.

**Pattern.** Each configuration gets an ID. Cart, checkout, fulfillment all reference the ID.

**Strengths.** Stable reference.

**Weaknesses.** Requires backend infrastructure.

---

## Pricing consistency

Prices match across configurator, cart, checkout.

**The principle.** No price drift between stages.

**The drift failure.** Configurator shows $X; cart shows $Y; user feels deceived.

**Causes.** Caching, currency conversion, tax estimation, discount expiration.

**The cure.** Single source of truth for pricing; all stages query.

---

## Save-and-share-to-cart

When users return from saved configurations.

**Pattern.** Saved configuration link opens configurator with state; user can add to cart from there.

**The discipline.** Save mechanism integrates with cart workflow.

---

## Mobile cart handoff

On mobile, the handoff transition matters.

**Considerations.**

- Cart visible without horizontal scroll.
- Edit returns work on mobile.
- Configuration summary readable.

---

## Common handoff failures

**Cart shows generic SKU.** User cannot verify configuration.

**Edit restarts configurator.** Previous choices lost.

**Pricing drifts between stages.** User confused.

**Configuration disappears at checkout.** Cannot verify.

**Multi-item handoff broken.** Configurations conflict in cart.

**B2B quote misses details.** Quote does not match configuration.

**Confirmation email lacks configuration.** User cannot verify post-purchase.

---

## Methodology-level choices that stay in the public skill

The preserve-the-build principle. Cart presentation. Edit-from-cart. Multi-item handoff. B2B configurator-to-quote. Handoff to checkout. Configuration ID. Pricing consistency. Save-and-share-to-cart. Mobile considerations. Common failures.

## Implementation choices that stay internal

Specific cart implementations for specific configurators. Specific configuration-ID systems. Specific backend integrations. These vary by team.
