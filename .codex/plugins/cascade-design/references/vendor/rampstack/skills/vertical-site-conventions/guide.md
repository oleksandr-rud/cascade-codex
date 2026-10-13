> Local governing process: [Design index](../../../../README.md), [one brief](../../../../process/intake.md) and [evidence/authority](../../../../process/review-and-evidence.md). Full [license](../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/vertical-site-conventions/SKILL.md; SHA256 f7477db56b1ad8ae4ba7539cca137d4dc0d2577aa51b4709b92cbacef6a4b302. License: [retained MIT notice](../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../process/direction.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# Vertical Site Conventions

Compose pages and whole sites to the layout, density, and merchandising conventions that make a build read as a credible member of its vertical. Stack-agnostic. Works on any framework that can express server-rendered pages and component composition.

This skill owns vertical-level composition: which modules go where, how dense the page is, how much of the catalog or offering is surfaced, and which paths the navigation serves. It routes the day-to-day visual decisions to [local design standards reference](../design-standards/guide.md), the aesthetic register to [local creative direction reference](../creative-direction/guide.md), the site-structure modeling to [local information architecture reference](../information-architecture/guide.md), and the component implementation to [local frontend component build reference](../frontend-component-build/guide.md). It does not duplicate any of them; it composes their outputs into a vertical-correct site.

It is the build-side counterpart to [local competitor experience audit reference](../competitor-experience-audit/guide.md). The audit measures the field on seven dimensions; this skill builds to those same seven, dimension by dimension. The two are deliberately structured as two sides of one standard so an experience bar produced by the audit maps one-to-one onto what this skill builds.

---

## When to use

- Building a new site in a vertical you have not built in before
- Fixing a build that reads as generic or off-vertical even though it is technically clean (the SEO, accessibility, and component implementation are correct, but the page does not read like its category)
- Building to an experience bar produced by [local competitor experience audit reference](../competitor-experience-audit/guide.md) (the audit-fed path is the intended use)
- Adding the merchandising, density, and navigation conventions a site in this category is expected to carry
- Building a showcase or demo where the build must read as its vertical, not as a generic SaaS landing page

## When NOT to use

- Day-to-day visual decisions on a known build (use [local design standards reference](../design-standards/guide.md))
- Defining the brand register or aesthetic from scratch (use [local creative direction reference](../creative-direction/guide.md), [local direction procedure](../../../../process/direction.md), [local intake procedure](../../../../process/intake.md))
- Building one component well (use [local frontend component build reference](../frontend-component-build/guide.md))
- Modeling site structure and navigation hierarchy from scratch (use [local information architecture reference](../information-architecture/guide.md))
- Building a formal design system or token system (use [local design system reference](../design-system/guide.md))
- Auditing the competitive field for what conventions exist (use [local competitor experience audit reference](../competitor-experience-audit/guide.md); this skill consumes that audit's output, it does not produce it)

---

## Relevant inputs and actual execution prerequisites

- The site shape the build is for, from the controlled list: `ecommerce-catalog`, `inventory-listing`, `directory-marketplace`, `local-service-booking`, `subscription-app`, `hospitality-food`, `institution-mission`, `b2b-manufacturer`, `ecommerce-standout`, `hospitality-experience`.
- An experience bar from [local competitor experience audit reference](../competitor-experience-audit/guide.md) (the cross-site patterns and gaps for the vertical). If absent, the skill falls back to the per-shape default conventions in the references; the audit-fed path is stronger and is the intended use.
- The brand register and aesthetic decisions (from [local creative direction reference](../creative-direction/guide.md) or already settled). This skill does not redefine them.
- The framework or technical context the build will use (the skill is stack-agnostic but the consumer needs to know).

If the site shape is unclear, ask. Building to the wrong shape's conventions produces a build that reads off-vertical, which is the exact failure this skill exists to prevent.

---

## The framework: build to the seven dimensions

The framework mirrors the seven dimensions [local competitor experience audit reference](../competitor-experience-audit/guide.md) measures. Each is expressed here as build guidance (what to do) rather than audit questions (what to observe). Run them in order; the synthesis in dimension 7 is the composition checklist that catches what the earlier six missed.

### 1. Build the primary task as the dominant, earliest element

The visitor arrives with a primary job. The leaders in the vertical lead with that job; off-vertical builds bury it behind marketing copy or competing CTAs.

- Identify the vertical's primary task from the experience bar or the per-shape reference. (Ecommerce-catalog: a fitment, search, or category-entry interaction. Hospitality-food: a menu or reservation entry. Inventory-listing: a search-and-filter. Local-service-booking: a "book now" or service-picker.)
- Give that task the largest, earliest interactive treatment in the hero.
- Demote competing CTAs. The hero gets one primary action; secondary actions live below the fold or in the chrome.
- Reach the core task without scrolling on the device class the vertical's visitors use.
- For commercial pages, sticky a compact version of the primary task to the chrome so it stays reachable on scroll.

If the primary task cannot be the hero (a constraint from a stakeholder, a regulated vertical), surface the closest equivalent and document the compromise. Do not silently push the primary task below the fold.

### 2. Build to the vertical's layout register and density

Most off-vertical builds default to a generic SaaS-airy landing page. Retail and catalog verticals are denser; editorial verticals are calmer; hospitality is image-led. Build to the field's density, not to a default.

- Identify the register from the experience bar or the per-shape reference (storefront-dense, editorial-calm, marketing-airy, image-led).
- Match the field's content-per-viewport: a catalog vertical surfaces more modules above the fold than a SaaS landing page.
- Choose the module count above the fold deliberately. State the count in the build notes.
- Route the actual color, type, and aesthetic choice to [local creative direction reference](../creative-direction/guide.md) and [local design standards reference](../design-standards/guide.md). This skill owns the density and module-count decision, not the visual register itself.

Composition decision lives here. Visual register lives there. Do not redefine either; route to the right skill.

### 3. Build the merchandising and category surface the vertical uses

How much of the catalog or offering is surfaced at once, and in what shape, is a per-vertical decision the build must own.

- Surface the catalog the way the vertical does: how many category, collection, or entry-point modules appear before scroll.
- Signal depth the way the vertical signals it: mega-menu hover, grid of category cards, faceted-search side rail, breadcrumb-driven hierarchy. Pick one and commit; do not stack three.
- Choose flat (one tier visible) or hierarchical (parent plus child categories shown together) per the vertical's convention.
- Use icon / image / text / hybrid category presentation per the vertical.

Cross-reference [local information architecture reference](../information-architecture/guide.md) for the structural modeling of the nav tree. This skill owns the compositional surface; that skill owns the structural model.

### 4. Build both the know-what-I-want and the browse path the vertical expects

Verticals differ on which path is primary. A catalog vertical needs both search and category browse, with search often primary. A hospitality-food site rarely needs search but always needs a menu and a reservation entry. Build to the paths the field actually offers, in the prominence the field gives them.

- List the paths the experience bar names (by category, by brand, by attribute, by vehicle, by location, by occasion, by audience).
- Score each path as primary, secondary, or absent per the vertical.
- Build the primary paths into the hero or primary nav. Build the secondary paths into the chrome or below the fold. Drop the paths the field does not use.
- Search input prominence is a per-vertical decision: header-primary, secondary in a side rail, or absent. Match the field.

Route the structural nav modeling to [local information architecture reference](../information-architecture/guide.md); route the search UX patterns to that skill or to the project's existing search component. This skill owns which paths exist and how prominent each is.

### 5. Build the brand posture consistently across the page

The brand register is set by [local creative direction reference](../creative-direction/guide.md) and [local direction procedure](../../../../process/direction.md). This skill does not redefine it. But composition decides whether the posture holds across the page or only in the hero.

- Carry the brand register from the hero into the nav, the cards, the empty states, the trust signals, and the footer. A premium-utilitarian register that disappears below the hero is a composition failure, not a brand failure.
- Apply the voice consistently in headings, microcopy, CTAs, and empty states. Do not let the empty states default to generic copy.
- Hold the imagery posture across the page: a vertical that uses studio product photography in the hero does not switch to abstract illustration in the trust section.

Route the actual register choice and the voice attributes to [local creative direction reference](../creative-direction/guide.md) and [local direction procedure](../../../../process/direction.md). Own the consistency requirement here.

### 6. Build the trust and conversion signals the vertical requires

Each vertical has a different set of trust signals it is expected to carry. A build that ships without them reads as not-yet-credible. Build them in.

- Identify the required signals from the experience bar or the per-shape reference. (Ecommerce-catalog: reviews, guarantees, pricing transparency, stock signals, fitment confirmation, shipping promises. Hospitality-food: hours, location, reservation availability, menu price range. B2b-manufacturer: certifications, customer logos, spec sheets. Local-service-booking: licensing, insurance, service-area, response time.)
- Surface them where the field surfaces them. Reviews near the buying action; service-area in the hero; certifications in the chrome.
- Honor the functional-vs-demo line for showcase builds: real where touchable (real reviews if they exist, real cart state), honestly demo where it needs a backend (clearly labeled demo checkout modal, no fake payment).

### 7. Run the synthesis as a composition checklist

The seventh dimension is the synthesis: the specific conventions a credible build in this vertical must have, named explicitly. Run this as a pre-ship checklist before declaring the composition done.

- Pull the conventions from the experience bar's dimension 7, or from the per-shape reference's recurring-conventions section.
- For each, confirm the build does it. Mark each item present, absent, or routed elsewhere (with a link to the routing decision).
- If three or more conventions are absent, the build is off-vertical. Go back to the earlier dimensions; this is not a polish-pass fix.
- If one or two are absent, name the reason: deliberate positioning (the wedge the build is exploiting from the audit's gaps section), constraint (stakeholder, technical), or oversight (fix before ship).

The synthesis is what catches builds that pass dimensions 1 through 6 individually but compose into something off-vertical anyway. Run it.

---

## How the skill consumes an experience bar

When [local competitor experience audit reference](../competitor-experience-audit/guide.md) has run for the vertical, its output is the input to this skill. The audit's seven dimensions map directly onto this skill's seven, in order. Concretely:

- The audit's `Primary-task prominence` pattern names what to build in this skill's dimension 1.
- The audit's `Layout register and density` pattern names the density target for dimension 2.
- The audit's `Merchandising and category surface` pattern names the surface shape for dimension 3.
- The audit's `Primary navigation and search paths` pattern names the path inventory for dimension 4.
- The audit's `Brand register and conviction` pattern names the register [local creative direction reference](../creative-direction/guide.md) should be working from, which this skill carries across the page in dimension 5.
- The audit's `Trust and conversion signals` pattern names the required signals for dimension 6.
- The audit's `Recurring vertical conventions` are the checklist for dimension 7.
- The audit's `Gaps` section names the positioning opportunity the build can exploit as its wedge.

If no audit has been run, fall back to the per-shape reference files in `references/`. The default conventions there are derived from observable cross-site patterns and are honest, but a vertical-specific audit is stronger and is the intended path.

---

## Stays in its lane (load-bearing)

This skill owns one thing: vertical-level page and site composition. It routes everything else, and that routing discipline is what keeps it useful and what keeps the catalog clean.

- Visual tokens, color, type, contrast, spacing scale: route to [local design standards reference](../design-standards/guide.md).
- Aesthetic register, archetype, voice attributes: route to [local creative direction reference](../creative-direction/guide.md) and [local direction procedure](../../../../process/direction.md).
- Site structure, nav hierarchy, URL design: route to [local information architecture reference](../information-architecture/guide.md).
- Component API, states, accessibility implementation: route to [local frontend component build reference](../frontend-component-build/guide.md).
- Formal design system, token library, component documentation: route to [local design system reference](../design-system/guide.md).
- The audit that produces the experience bar: route to [local competitor experience audit reference](../competitor-experience-audit/guide.md).
- On-page SEO and accessibility audits: route to [local research and ia procedure](../../../../process/research-and-ia.md) and [local accessibility audit reference](../accessibility-audit/guide.md).

If a build decision sits inside one of those skills, do not restate the standard here. Link to the skill and let it own its territory.

---

## Workflow

1. **Confirm the site shape and the experience bar.** Site shape from the controlled list. Experience bar from [local competitor experience audit reference](../competitor-experience-audit/guide.md) if run; the per-shape reference otherwise.
2. **Run dimensions 1 through 6 in order.** For each, name the build decision and which other skill it routes to (for the parts that route elsewhere).
3. **Run dimension 7 as a checklist.** Confirm every recurring convention from the vertical is present, absent for a stated reason, or routed elsewhere.
4. **Write the composition notes.** Use the template in [`references/shape-conventions-checklist.md`](references/shape-conventions-checklist.md). The notes are what [local frontend component build reference](../frontend-component-build/guide.md) and [local design standards reference](../design-standards/guide.md) read as the spec to implement against.
5. **Hand off to the implementation skills.** This skill's output is composition decisions, not finished components. The build is done when those decisions have been implemented through [local frontend component build reference](../frontend-component-build/guide.md), [local design standards reference](../design-standards/guide.md), and the project's component library.

---

## Failure patterns

When you spot one of these, push back before delivering.

- **"Make it look modern."** Vague. Ask which vertical, which experience bar, which conventions. "Modern" without a vertical produces the generic SaaS-airy build this skill exists to prevent.
- **Building to a generic / SaaS-airy default when the vertical wants a denser storefront.** Retail and catalog verticals surface more per viewport than a marketing page. If the build looks calm and roomy, check the density against the field.
- **Burying the primary task.** A hero stuffed with marketing copy and three competing CTAs is the most common off-vertical failure. Dimension 1 is not optional.
- **Redefining aesthetic vocabulary instead of routing to [local creative direction reference](../creative-direction/guide.md).** This skill does not coin new register names or invent new voice attributes. If the question is what posture the brand takes, that is [local creative direction reference](../creative-direction/guide.md)'s call.
- **Treating the experience bar as optional when it is available.** If [local competitor experience audit reference](../competitor-experience-audit/guide.md) has run for the vertical, the bar is the spec. Building to the per-shape default while ignoring the audit's bar is half a build.
- **Producing a template instead of building to the field's actual conventions.** Per-shape references are starting points, not finished templates. They name the patterns the field shares; the build still has to land them in this brand and this brief.
- **Skipping dimension 7.** A build that passes dimensions 1 through 6 individually can still compose off-vertical. The synthesis check is the one that catches it.
- **Calling implementation detail "composition".** Button radius, font size, color contrast are [local design standards reference](../design-standards/guide.md) decisions. Module count, primary-task prominence, category-surface depth are this skill's decisions. Do not bleed across the line.

---

## Output format

Return the applicable result in the current host-owned brief/handoff; any file path comes from the host scope. See [intake](../../../../process/intake.md).

1. The site shape and the experience bar consulted (or "no audit available; per-shape reference used")
2. Dimension-by-dimension build decisions (1 through 6)
3. The synthesis checklist (dimension 7), each convention marked present / absent / routed
4. The wedge (which gap from the audit's gaps section this build is exploiting, if any)
5. The hand-off list: what [local frontend component build reference](../frontend-component-build/guide.md), [local design standards reference](../design-standards/guide.md), and [local creative direction reference](../creative-direction/guide.md) need from these notes to implement

Keep notes under 1500 words. The notes are a spec for the implementation skills; if they need more detail, that is a sign one of those skills should own the deeper specification.

---

## Reference files

- [`references/shape-conventions-checklist.md`](references/shape-conventions-checklist.md) - The per-dimension build checklist applied as a pre-ship review. Mirror of the audit's dimension checklist on the build side.
- [`references/shape-ecommerce-catalog.md`](references/shape-ecommerce-catalog.md) - Default conventions for the ecommerce-catalog shape (first test case; auto-parts and similar dense storefronts).
- [`references/shape-inventory-listing.md`](references/shape-inventory-listing.md) - Stub; fill when the first inventory-listing demo is built.
- [`references/shape-directory-marketplace.md`](references/shape-directory-marketplace.md) - Stub.
- [`references/shape-local-service-booking.md`](references/shape-local-service-booking.md) - Stub.
- [`references/shape-subscription-app.md`](references/shape-subscription-app.md) - Stub.
- [`references/shape-hospitality-food.md`](references/shape-hospitality-food.md) - Stub.
- [`references/shape-institution-mission.md`](references/shape-institution-mission.md) - Stub.
- [`references/shape-b2b-manufacturer.md`](references/shape-b2b-manufacturer.md) - Stub.
- [`references/shape-ecommerce-standout.md`](references/shape-ecommerce-standout.md) - Stub.
- [`references/shape-hospitality-experience.md`](references/shape-hospitality-experience.md) - Stub.
