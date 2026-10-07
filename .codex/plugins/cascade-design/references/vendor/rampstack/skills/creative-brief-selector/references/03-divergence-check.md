> Local governing process: [Design index](../../../../../README.md), [one brief](../../../../../process/intake.md) and [evidence/authority](../../../../../process/review-and-evidence.md). Full [license](../../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/creative-brief-selector/references/03-divergence-check.md; SHA256 7624e929d0889201378eba0d44de2ea90378202cb6bcd52adf9cd84b25924dab. License: [retained MIT notice](../../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../process/direction.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# The divergence check

The signature schema, the overlap rules, and the comparison procedure.

---

## Signature schema

Each shipped demo carries a signature with seven fields. The schema is small on purpose: any field that takes judgment to populate gets argued about; a small mechanical schema gets used.

```yaml
- slug: <kebab-case slug, e.g. pinto-mesa-boots>
  archetype: <local descriptive aesthetic-family label for the actual direction; luxe-considered is an illustrative label, not a required foreign schema>
  dominant_hue_family: <named hue family, e.g. leather-bone-saddle>
  voice_register: <named register, e.g. story-forward-third-person>
  primary_structural_pattern: <named pattern, e.g. shoppable-grid-product-forward>
  hero_shape: <named shape from 05-section-shapes-vocabulary.md, e.g. dual-column-image-and-text>
  footer_shape: <named shape from 05-section-shapes-vocabulary.md, e.g. single-line-strip>
```

The last two fields (`hero_shape` and `footer_shape`) are the latest schema additions. The canonical vocabulary for both lives in [`05-section-shapes-vocabulary.md`](05-section-shapes-vocabulary.md).

### slug

The kebab-case slug for the shipped build. Used to identify the demo in rejection logs and warn or block reasons.

### archetype

Choose a descriptive aesthetic-family label from the actual local direction decision. Labels such as luxe-considered, documentary-honest and warm-conversational are illustrative vocabulary; no foreign core-archetypes folder or canonical schema is needed. When a relevant optional portfolio comparison uses a composed direction, record its local labels and explain the lead contribution through [local direction](../../../../../process/direction.md).

### dominant_hue_family

The recognizable colour family the demo reads as, in three to four words. Examples:

- `leather-bone-saddle` (Pinto Mesa Boots v2)
- `dawn-navy-coral` (Drift & Dawn after the dawn retune)
- `dark-linen-amber` (Pho Heights)
- `warm-walnut-brass` (Iron & Rye)
- `forest-green-cream` (Clearflow Initiative)
- `slate-and-amber` (the original Drift & Dawn pre-retune, kept for historical reference)
- `stone-and-amber` (the recurring family the imagery passes surfaced as the drift signal)

The naming convention: two to four colour terms separated by hyphens, lowercase. The terms should be specific enough that two demos with materially different palettes get different families even if they share an undertone.

### voice_register

The brand's voice in three to four words. Examples:

- `story-forward-third-person`
- `atmospheric-second-person`
- `fitment-first-technical`
- `evidence-and-mission-first`
- `restrained-citation-bearing`
- `warm-everyday-craft`

The naming convention: hyphenated phrase that names the register the voice samples in the brief operate in.

### primary_structural_pattern

The structural pattern the homepage runs, in three to five words. Examples:

- `shoppable-grid-product-forward`
- `arc-timeline-hero-with-packages-strip`
- `fitment-selector-then-rails`
- `editorial-hero-then-courses-grid`
- `barber-roster-then-services-menu`
- `theory-of-change-hero-then-evidence-band`

The naming convention: name the homepage's primary spine in a way another build can recognize from the rendered page.

### hero_shape

The shape of the hero section, drawn from the vocabulary in [`05-section-shapes-vocabulary.md`](05-section-shapes-vocabulary.md). Examples:

- `dual-column-image-and-text`
- `wide-photograph-with-band-below`
- `full-bleed-image-with-overlay`
- `type-led-prose`
- `centered-single-column`
- `asymmetric-large-image-small-text`
- `grid-of-elements`
- `data-table-or-spec-led`

A build that needs a shape not in the vocabulary documents and proposes a new label per the extension procedure in [local reference](05-section-shapes-vocabulary.md).

### footer_shape

The shape of the footer section, drawn from the vocabulary in [`05-section-shapes-vocabulary.md`](05-section-shapes-vocabulary.md). Examples:

- `single-line-strip`
- `multi-column-sitemap`
- `type-only-no-links`
- `editorial-colophon-with-masthead`
- `newsletter-band-with-credits`
- `dark-cta-then-credits`

---

## Overlap rules

The following upstream comparison heuristics are optional, uncalibrated examples for a real new-identity portfolio goal. They describe similarities rather than admission criteria. Use applicable observations and preserve deliberate reuse; no rule automatically changes or blocks the accepted task.

### Rule 1: Same archetype + same dominant_hue_family

If two demos share `archetype` AND share `dominant_hue_family`, they are **SIMILARITY (optional portfolio note)**.

Two demos in the same archetype with the same hue family will read as the same brand at a glance. This similarity may motivate an archetype/palette alternative when actual differentiation matters; it does not block delivery or override accepted identity.

### Rule 2: Same archetype + same voice_register + same primary_structural_pattern

If two demos share `archetype` AND share `voice_register` AND share `primary_structural_pattern`, they are **SIMILARITY (optional portfolio note)**.

This catches the case where the palettes diverge but the underlying skeleton is identical. The build will look different on first glance and identical on the second.

### Rule 3: Same dominant_hue_family across different archetypes

If two demos share `dominant_hue_family` but their `archetype` differs, the outcome is **PORTFOLIO-EXAMPLE-WARN**.

A recurring hue family across different archetypes is the most common drift signal in a portfolio. The warn surfaces the recurrence so the consumer can choose to break the pattern or accept it as the portfolio's signature.

### Rule 4: Hero shape collision (warn)

If the candidate's proposed `hero_shape` matches the `hero_shape` of two or more shipped demos, the outcome is **PORTFOLIO-EXAMPLE-WARN**.

The warn surfaces a deliberation note listing every shipped demo using the same shape. The brief author either justifies the repeat (and records that justification in the brief's section-shapes rationale) or picks a different shape from the vocabulary. The upstream count thresholds are illustrative portfolio heuristics, not validated perceptual boundaries. Actual audience/task evidence and deliberate system reuse determine whether the similarity matters.

### Rule 5: Hero shape archetype-collision (block)

If the candidate's proposed `hero_shape` matches the `hero_shape` of three or more shipped demos AND any of those matching demos share an archetype family with the proposed brief, the outcome is **PORTFOLIO-EXAMPLE-BLOCK**.

This catches the case where the brief is heading toward the strongest sibling result possible: the same hero shape AND a related archetype. This similarity calls for a contextual note when relevant; the owner may accept reuse or choose a materially helpful alternative without a forced palette/shape change.

Archetype-family overlap is computed by comparing the lead archetype tokens. Composed archetypes share a family if either of their tokens matches. For example, `editorial-restrained` and `editorial-restrained-documentary-honest` share the `editorial-restrained` family; `documentary-honest-luxe-considered` and `rugged-utilitarian-documentary-honest` share the `documentary-honest` family.

### Rule 6: Footer shape collision (warn)

If the candidate's proposed `footer_shape` matches the `footer_shape` of three or more shipped demos, the outcome is **PORTFOLIO-EXAMPLE-WARN**.

Footers tolerate more repetition than heroes since they carry less visual weight and are more functional than expressive. The threshold (three matching demos for a warn, not two) is correspondingly higher. There is no block-level rule for footer shapes at this scope; if a portfolio-wide footer shape emerges as the house default, it becomes part of the portfolio's signature rather than a per-build distinctness failure.

### Rule 7: Anything else

If no rule above fires, the outcome is **PORTFOLIO-EXAMPLE-PASSED**.

---

## Why shapes carry weight

Heroes carry the most visual weight on a page and the most signal to the visitor. Hero-shape repetition across a portfolio compresses the perceived distance between builds even when palette, voice, and structural pattern diverge. The early showcase portfolio surfaced this drift signal: most builds shipped a `dual-column-image-and-text` or `full-bleed-image-with-overlay` hero regardless of brief specification, because the engine pattern-matched the most recently built shape.

Footers carry less weight and are typically more functional than expressive. They tolerate more repetition before the repetition becomes a distinctness cost.

Rules 4, 5, and 6 exist to make hero-shape and footer-shape choice an explicit selection at brief time rather than an implicit inheritance from the most recently built demo.

---

## Comparison procedure

```
# Pairwise rules (run on every candidate-shipped pair):
for candidate in candidates:
  for shipped in shipped_demos:
    if rule_1(candidate, shipped):
      record_similarity(candidate, shipped, fields=['archetype', 'dominant_hue_family'])
      continue
    if rule_2(candidate, shipped):
      record_similarity(candidate, shipped, fields=['archetype', 'voice_register', 'primary_structural_pattern'])
      continue
    if rule_3(candidate, shipped):
      record_warn(candidate, shipped, fields=['dominant_hue_family'])
      continue

# Aggregate rules (run once per candidate against the full set):
for candidate in candidates:
  hero_matches = [s for s in shipped_demos if s.hero_shape == candidate.hero_shape]
  if len(hero_matches) >= 3 and any(shares_archetype_family(candidate, s) for s in hero_matches):
    record_similarity(candidate, hero_matches, fields=['hero_shape', 'archetype'])  # rule 5
  elif len(hero_matches) >= 2:
    record_warn(candidate, hero_matches, fields=['hero_shape'])  # rule 4

  footer_matches = [s for s in shipped_demos if s.footer_shape == candidate.footer_shape]
  if len(footer_matches) >= 3:
    record_warn(candidate, footer_matches, fields=['footer_shape'])  # rule 6
```

The optional check records pair/aggregate similarities and cautions with source observations. A no-overlap flag describes only this comparison; it is not evidence of design quality, readiness or owner acceptance.

### Input-side outcome

- Any overlap flag is a portfolio diagnostic. The owner considers actual differentiation goals, usability and accepted identity; no candidate is automatically discarded.
- Warns at input-side are surfaced in the rejection log but do not discard the candidate.

### Output-side outcome

After the brief is rendered, the brief's own signature is checked against every shipped demo using the same rules. The outcome is one of:

- **passed**: no blocks, no warns. The brief is ready to hand off.
- **warn-with-reasons**: warns only. The brief shares a single field (most commonly `dominant_hue_family`) with a shipped demo. Surface the warn with the matched fields so the consumer can make a deliberate call.
- **block-with-reasons**: at least one block. The brief is sibling to a shipped demo. Return to step 4 of the process and adapt further before re-rendering.

---

## What changes a block to a warn or a pass

Concretely:

- **Shift the dominant_hue_family.** Swap the dominant accent colour, change the page background's temperature, or change the accent colour family (saddle to oxblood to navy). Recompute the family.
- **Shift the primary_structural_pattern.** Change which move leads the page. A "product-forward" pattern becomes "story-forward" by reordering the spine moves. Recompute the pattern.
- **Shift the voice_register.** Change the voice from third-person to second-person, or from atmospheric to technical. Recompute the register.
- **Compose a different archetype pair.** If the chosen archetype is locked, change the secondary archetype to shift the brief's centre of mass.

Each adaptation should be a deliberate choice, recorded in the brief's adaptation notes (step 4 of the process).

---

## The signatures file

Use an existing host-supplied portfolio record only if actual new-identity work needs it. The schema above is illustrative; no signatures file or foreign project path is required or created. The omitted demo signatures remain audit evidence only.

If the owner has separately authorized maintaining a portfolio record, propose a source-bound update after an actual accepted build. This reference neither appends files nor claims a shipment.

---

## Failure modes

- **Filling fields with vibe words.** "vibrant-modern" is not a hue family; "saddle-bone-walnut" is. The schema works because the field values are specific. Vague values produce vague checks.
Use only applicable direction fields. Marketing hero/footer and portfolio signatures are optional for matching surfaces; an operational control or editor may need neither.
- **Treating warns as ignorable.** A warn is the portfolio's drift early-warning. Three consecutive warns on the same hue family is the portfolio adopting a house signature, which is the failure mode this skill exists to prevent.
- **Hand-waving the rules.** These are upstream portfolio heuristics. Evaluate applicability and deliberate reuse against the actual brief; there is no universal novelty gate.
