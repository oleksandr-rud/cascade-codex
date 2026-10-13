> Local governing process: [Design index](../../../../README.md), [one brief](../../../../process/intake.md) and [evidence/authority](../../../../process/review-and-evidence.md). Full [license](../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/creative-brief-selector/SKILL.md; SHA256 df4964fe8752031995f230a4259374d9292a6e46b9332e7a3f2efdd71b0a2df7. License: [retained MIT notice](../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../process/direction.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# Creative Brief Selector

A starting-point selector for brand and microsite builds. Given a business spec (name, vertical, shape, one-line vibe, optional list of shipped demos), produces a creative brief grounded in three things:

1. An archetype position from [local direction procedure](../../../../process/direction.md), picked or composed to be deliberately distinct from the shipped demos.
2. A small set of live reference sites for that archetype-and-vertical combination, drawn from a curated bank plus optional per-build discovery.
3. A divergence check against the shipped demos that flags palette, voice, structural pattern, and section-shape overlap before the brief is handed off.

The brief output is concrete tokens, not abstract families, including explicit section-shape choices (hero shape and footer shape) as first-class outputs alongside palette and voice. Keep the applicable decisions in the current host-owned brief; this selector is a subordinate optional reference for an open brand/site direction, not an independent artifact or controller.

---

## When to use

- Starting any new brand or microsite build that should land in a specific aesthetic position.
- The first build in a portfolio (no prior builds to diverge from yet, but the divergence schema can be seeded for the next one).
- The second through nth build in a portfolio, where the risk of sibling output is real.
- After a portfolio audit that surfaced sibling builds: this skill is the systemic fix for the pattern.
- When a build's creative direction is being chosen between two adjacent archetypes and the call needs a reference-grounded reason.

## When NOT to use

- The user wants pure aesthetic methodology guidance (use [local creative direction reference](../creative-direction/guide.md)).
- The user has a finished archetype and a finished brief and is asking for execution (skip to the downstream build skills).
- The user wants a logo or a finished identity (use [local direction procedure](../../../../process/direction.md), [local direction procedure](../../../../process/direction.md)).
- The user wants to define voice for an existing brand (use [local direction procedure](../../../../process/direction.md)).
- Defining brand strategy from zero positioning (use [local brand ideation reference](../brand-ideation/guide.md) first, then return to this skill).

---

## How this composes with other skills

This skill works upstream of build-time skills and parallel to the aesthetic methodology layer:

- **[local direction procedure](../../../../process/direction.md)** (upstream input). The archetype catalog this skill picks from. The skill names the archetype in the rendered brief; it does not redefine the archetype's defaults.
- **[local creative direction reference](../creative-direction/guide.md)** (parallel input). The four-axis vocabulary the archetypes reference. If the consumer needs the full axis brief, run [local creative direction reference](../creative-direction/guide.md) first; this skill's brief consumes its outputs.
- **[local direction procedure](../../../../process/direction.md)** (downstream). The existing design-system owner considers only an actual reusable identity-rule change; Frontend/host integrates the accepted scope. A brief decision does not invoke a foreign identity-authoring method or automatically replace the system.
- **[local direction procedure](../../../../process/direction.md), [local content and copy reference](../content-and-copy/guide.md), [local art direction reference](../art-direction/guide.md)** (downstream). Every downstream skill that produces aesthetic output references this skill's brief.

Direct verbatim copying of an archetype's default palette into a new brand is the failure mode this skill exists to prevent. The brief shifts the archetype's defaults toward the business spec's specifics.

---

## The framework: five steps, three rules, one hybrid bank

1. **Locate the design space.** Pick one to two candidate archetypes from [local direction procedure](../../../../process/direction.md) that fit the vertical and shape.
2. **Consider portfolio overlap only when relevant.** If supplied real portfolio observations and a new-identity goal justify it, compare candidate palette/voice/structure and explain useful differences or deliberate reuse. Do not discard an accepted direction solely for overlap.
Record a proposed local reference-bank update with source/observation date and rationale for the integration owner. Publication or commits are separate host-owned actions; this procedure grants neither.
4. **Adapt.** Shift the chosen archetype's defaults (palette, type, voice, layout, imagery direction) toward the business spec. The brief lands as concrete tokens, not abstract families.
- [Local direction procedure](../../../../process/direction.md) - One current brief and applicable fields; the upstream demo-selector template is evidence-only.

Full step-by-step in [`references/01-process.md`](references/01-process.md). The divergence schema and its three overlap rules are in [`references/03-divergence-check.md`](references/03-divergence-check.md).

---

## The hybrid references model

A curated bank that grows with each build. Each file under `references/reference-bank/` covers one archetype-and-vertical combination and holds three to six live reference URLs, each with a one-line why and optional palette or type observations. The bank ships with three seed combinations covering western-boot maker, heritage barbershop, and balloon-ride experience.

Record a proposed local reference-bank update with source/observation date and rationale for the integration owner. Publication or commits are separate host-owned actions; this procedure grants neither.

---

## The divergence schema

Each shipped demo carries a signature with seven fields:

- `slug`
- `archetype` (the canonical archetype name from [local direction procedure](../../../../process/direction.md))
- `dominant_hue_family` (the recognizable colour family, e.g. leather-bone-saddle, dawn-navy-coral, dark-linen-amber)
- `voice_register` (e.g. story-forward third-person, atmospheric second-person, fitment-first technical)
- `primary_structural_pattern` (e.g. shoppable-grid-product-forward, arc-timeline-hero, fitment-selector-then-rails)
- `hero_shape` (e.g. dual-column-image-and-text, wide-photograph-with-band-below, full-bleed-image-with-overlay; canonical vocabulary in [local reference](references/05-section-shapes-vocabulary.md))
- `footer_shape` (e.g. single-line-strip, multi-column-sitemap, type-only-no-links; same vocabulary file)

Overlap rules (full set in [`references/03-divergence-check.md`](references/03-divergence-check.md)):

- Two demos share archetype AND share dominant_hue_family => **SIMILARITY (optional portfolio note)**.
- Two demos share archetype AND share voice_register AND share primary_structural_pattern => **SIMILARITY (optional portfolio note)**.
- Two demos share only dominant_hue_family across different archetypes => **PORTFOLIO-EXAMPLE-WARN**.
- The candidate's hero_shape matches the hero_shape of two or more shipped demos => **PORTFOLIO-EXAMPLE-WARN**.
- The candidate's hero_shape matches three or more shipped demos AND any share an archetype family => **PORTFOLIO-EXAMPLE-BLOCK**.
- The candidate's footer_shape matches three or more shipped demos => **PORTFOLIO-EXAMPLE-WARN**.

The upstream demo-signatures template is intentionally evidence-only and not included in the operative corpus. Use [the local direction procedure](../../../../process/direction.md) and actual supplied portfolio observations when relevant.

---

## Trademark and attribution

Archetypes are NAMED for aesthetic families, NOT for brands, following the convention of [local direction procedure](../../../../process/direction.md). Live reference sites are cited as exemplars using nominative attribution language: "exemplified by [URL]", "characteristic of", "in the register of". This is descriptive and nominative fair use territory, durable across brand redesigns. A brand that pivots its identity does not invalidate the archetype it once exemplified.

---

## If required data is unavailable

This skill's output depends on data, measurements, or tool results it cannot generate on its own. When a required input, tool, or data source is unavailable or unverifiable, the sanctioned output is the deliverable with the gap stated: what was needed, what was actually obtained or verified, and which parts of the output are affected. Fabricating, estimating, or interpolating a required number to complete the deliverable is never sanctioned. A stated gap is a complete answer.

---

## Reference files

- [`references/00-overview.md`](references/00-overview.md) - The case for the skill, the hybrid references model, the two-direction divergence, the trademark posture.
- [`references/01-process.md`](references/01-process.md) - The five-step process, each step concrete enough to execute.
- [Local direction procedure](../../../../process/direction.md) - One current brief and applicable fields; the upstream demo-selector template is evidence-only.
- [`references/03-divergence-check.md`](references/03-divergence-check.md) - The signature schema and the overlap rules.
- [Local direction procedure](../../../../process/direction.md) - Actual context and decision/evidence replace the omitted upstream demo-signatures artifact.
- [`references/05-section-shapes-vocabulary.md`](references/05-section-shapes-vocabulary.md) - Canonical open vocabulary of hero and footer section shapes plus archetype affinities.

The curated reference bank lives in a `reference-bank/` subdirectory under `references/`. The bank ships with a README plus three seed archetype-and-vertical files: `premium-dtc-maker-western-boots.md`, `heritage-local-service-barbershop.md`, and `hospitality-experience-balloon-ride.md`. The bank's purpose and extension procedure are documented in its README; the seed files each carry three to four positive live references and one to two negative references for the chosen position. Load the bank file matching the build's archetype-and-vertical at step 3 of the process.
