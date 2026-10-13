> Local governing process: [Design index](../../../../../README.md), [one brief](../../../../../process/intake.md) and [evidence/authority](../../../../../process/review-and-evidence.md). Full [license](../../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/product-configurator-design/references/common-configurator-failures.md; SHA256 36237cc604675bab8299b7c7cc9223badc3090e7bfbf6cacf69a3fcb65a168ab. License: [retained MIT notice](../../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../process/prototype-and-build.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# Common configurator failures

9+ failure patterns with diagnoses and cures.

---

## "Users abandon halfway through configuration."

**The diagnosis.** Likely infinite-options pattern; too many decisions.

**The cure.** Smart defaults; reduce option count; escape hatches into deeper customization.

---

## "Configurator generates valid-looking configs that fail at fulfillment."

**The diagnosis.** Under-constrained; constraint logic missing.

**The cure.** Add constraint logic. Detail in [local reference](constraint-logic-patterns.md).

---

## "Users complain about price surprises at checkout."

**The diagnosis.** Pricing not real-time or hidden until end.

**The cure.** Real-time pricing throughout. Detail in [local reference](real-time-pricing-patterns.md).

---

## "Sales says many users contact for help configuring."

**The diagnosis.** Configurator too complex for audience; defaults wrong.

**The cure.** Audit defaults; reduce option exposure; consider canned bundles for simple cases.

---

## "Users save configurations but do not return."

**The diagnosis.** Save mechanism works but follow-up missing.

**The cure.** Reminder email after save; nudge before configuration expires.

---

## "Configurator works on desktop, breaks on mobile."

**The diagnosis.** Mobile UX broken.

**The cure.** Mobile-first design and testing.

---

## "Audience completes but conversion to purchase is low."

**The diagnosis.** Configurator works; commitment friction at handoff.

**The cure.** Audit cart handoff; ensure configuration preserved; reduce checkout friction.

---

## "We added more options; abandonment climbed."

**The diagnosis.** Crossed cognitive-load threshold.

**The cure.** Cut options; surface fewer; defer complexity behind escape hatches.

---

## "Constraint engaged but user did not understand why."

**The diagnosis.** Communication broken.

**The cure.** Constraint copy specific; explains why; offers paths.

---

## "Configurations frequently differ from cart."

**The diagnosis.** Handoff broken.

**The cure.** Test cart handoff. Configuration ID system; single pricing source.

---

## "Sales says enterprise customers want full configurations sales-led."

**The diagnosis.** Enterprise audience wants white-glove; configurator self-serve does not match expectation.

**The cure.** Enterprise path: configurator surfaces "Talk to sales for custom" for above-threshold configurations.

---

## "We A/B tested adding more options; conversion went down."

**The diagnosis.** Crossed the threshold.

**The cure.** More is not always better. Maintain option discipline.

---

## "Returning users see different prices than they saved."

**The diagnosis.** Pricing shifted; configurator silently updated.

**The cure.** Honest about price changes on resume.

---

## "Mobile configuration completion is half of desktop."

**The diagnosis.** Mobile UX significantly worse.

**The cure.** Mobile-first redesign; reduce option exposure on mobile.

---

## "Validation rejects valid international inputs."

**The diagnosis.** Validation too strict.

**The cure.** Audit validation rules; allow international formats.

---

## "Some configurations work; others fail post-checkout."

**The diagnosis.** Constraint logic incomplete; some invalid combinations slip through.

**The cure.** Audit constraints. Add missing rules.

---

## "Configurator's average configuration is more expensive than baseline."

**The diagnosis.** May not be a problem (real customization adds cost) or may be (default biased toward expensive).

**The cure.** Audit defaults. Defaults should reflect typical use, not flatter revenue.

---

## "Sales pipeline shrunk after configurator launch; people self-serve."

**The diagnosis.** Configurator absorbed the audience that would have called.

**The cure.** This may be intentional (cost reduction) or unintentional (loss of complex deals). Decide if the shift is desired.

---

## "Configurator launched; analytics broke."

**The diagnosis.** Instrumentation missed.

**The cure.** Verify analytics post-launch. Per-step instrumentation for diagnostic.

---

## The pattern across failures

Most configurator failures fall into one of three patterns.

**Pattern 1: Cognitive overload.** Infinite-options, too many decisions, no defaults. The fix is guided-configuration.

**Pattern 2: Trust damage.** Hidden pricing, price drift, unclear constraints, lost state. The fix is transparency.

**Pattern 3: Handoff failures.** Cart loses configuration; checkout disappears it. The fix is loop closure.

The metric pattern: configurator failures often look fine on engagement. Signal is in completion rate, conversion to purchase, downstream order accuracy.

---

## Methodology-level choices that stay in the public skill

The catalog of failure patterns with diagnoses and cures. The pattern across failures (cognitive overload, trust damage, handoff). The principle that engagement alone is insufficient.

## Implementation choices that stay internal

Specific failure cases the team has encountered. Specific dashboards. Specific cures. The team's audit and retirement processes. These vary by team.
