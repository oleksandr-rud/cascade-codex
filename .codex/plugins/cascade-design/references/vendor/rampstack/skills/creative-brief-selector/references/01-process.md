> Local governing process: [Design index](../../../../../README.md), [one brief](../../../../../process/intake.md) and [evidence/authority](../../../../../process/review-and-evidence.md). Full [license](../../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/creative-brief-selector/references/01-process.md; SHA256 d1b2156b567c09f7a0a75b4f1dc2ffe0a6191c1c1f94ac6fbacdd37aad8469f6. License: [retained MIT notice](../../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../process/direction.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# The five-step process

Each step concrete enough to execute. Use the full sequence only when a new visual direction is open. Portfolio divergence is optional and must not override established identity or task conventions.

---

## Inputs

The skill takes a business spec:

- **Name** (the brand name to be used in the brief)
- **Vertical** (e.g. western-boot maker, neighborhood barbershop, balloon-ride operator)
- **Shape** (the site shape: ecommerce-catalog, ecommerce-standout, local-service-booking, hospitality-experience, hospitality-food, institution-mission, inventory-listing, subscription-app, b2b-manufacturer, directory-marketplace)
- **One-line vibe** (a sentence describing what the brand wants to feel like)
- **Shipped-demos signatures file** (optional; the project artifact listing prior builds' signatures)

If actual portfolio evidence is absent, skip portfolio comparisons. Do not create a signatures artifact or invent prior builds. An established system can intentionally reuse its patterns.

---

## Step 1. Locate the design space

Read the business spec. Pick one to two candidate archetypes from [local direction procedure](../../../../../process/direction.md) that fit the vertical and shape.

**How to pick:**

- Read the vertical and shape against the 12 core archetypes. Most verticals have two or three plausible candidates; the shape narrows it.
- A western-boot maker maps plausibly to Luxe Considered (heritage premium), Rugged Utilitarian (workwear and craft), or Editorial Restrained (boutique editorial). The shape (ecommerce-standout, with a small editorial collection) narrows toward Luxe Considered with a Rugged Utilitarian secondary.
- A neighborhood barbershop maps plausibly to Warm Conversational (everyday-craft), Retro Nostalgic (period-specific), or Documentary Honest (real-people-real-work). The shape (local-service-booking, with a booking action) narrows toward Warm Conversational with a Retro Nostalgic secondary.
- A balloon-ride operator maps plausibly to Documentary Honest (landscape-and-light), Luxe Considered (aspirational-experience), or Warm Conversational (small-operator-warm). The shape (hospitality-experience, with a named arc and a booking flow) narrows toward Documentary Honest with a Luxe Considered secondary.

**Output of this step:**

- Primary candidate archetype (name)
- Optional secondary candidate archetype (name) with a note on which leads
- Two-sentence rationale tying each candidate to the vertical and shape

---

## Step 2. Run input-side divergence

Use only relevant supplied portfolio observations. The optional comparison below can surface similarities; the actual task, established identity and owner choice govern. No external artifact must be created or acquired.

**Procedure:**

- For each candidate (primary, then secondary if present):
  - For each shipped demo:
    - If archetype and hue match, record the similarity and whether it matters to this new-identity goal; retain deliberate reuse when justified.
    - If archetype, voice and structure match, inspect the task-level difference or deliberate system reuse; the current owner chooses whether adaptation helps.
- If the applicable comparison reveals a consequential mismatch, compare another direction or revise the specific mechanism; otherwise retain the current choice and rationale.

**Output of this step:**

- The surviving candidate (the chosen archetype)
- A rejection log listing any discarded candidates with the reason (which shipped demo collided and on which fields)

The rejection log is part of the brief output. It documents what the build was deliberately NOT.

---

## Step 3. Pull references

From `reference-bank/`, load the file matching the chosen archetype-and-vertical. Read the positive references and the negative references.

**If the bank has the combination:**

- Pull three to four positive references from the bank's list. Prefer the ones marked as canonical or most-recent.
- Read the negative references; they tell the build what register to avoid.

**If the bank is sparse for the combination:**

- Pull whatever positive references are available (one or two if that is all the bank has).
- Augment with one to two discovered live references that exemplify the position. Search the web for the vertical with the archetype's signal terms (e.g. for Luxe Considered DTC western boots: "premium western boot maker editorial photography prices visible").
Record a proposed local reference-bank update with source/observation date and rationale for the integration owner. Publication or commits are separate host-owned actions; this procedure grants neither.

**Output of this step:**

- A list of three to four live reference URLs, each with a one-line why
- A note on which references came from the bank versus which were discovered
- A list of negative references (registers to avoid)

---

## Step 4. Adapt

Take the chosen archetype's defaults from [local direction procedure](../../../../../process/direction.md) (palette, type, voice, layout, imagery direction). Shift them toward the business spec's specifics.

**Adaptations to document:**

- **Palette.** Pick 6 to 8 specific hex values that fit the brand. Name each with a token name (e.g. `Bone cream #f5ecd7`, `Saddle tan #a8753a`, `Pre-dawn navy #1a1f3a`). Each token gets a role (page background, primary text, primary CTA, accent, etc.).
- **Type system.** Pick the display family (often a serif from the archetype), the body family (often Inter or similar), and the micro-label treatment (tracking, casing, weight). Document the explicit differentiators from shipped demos (e.g. "tight uppercase tracking 0.04em on micro-labels, distinct from the loose 0.18em tracking the hospitality-experience build uses").
- **Voice.** Pick the voice register (e.g. story-forward third-person; atmospheric second-person; fitment-first technical). Write five to ten voice samples in this voice using the brand name.
- **Layout.** Pick the structural pattern (e.g. shoppable-grid-product-forward; arc-timeline-hero; fitment-selector-then-rails). Describe the spine moves the homepage will run (four to six numbered moves).
- **Section shapes.** Pick a `hero_shape` and a `footer_shape` from the vocabulary in [`05-section-shapes-vocabulary.md`](05-section-shapes-vocabulary.md). The hero shape carries the most visual weight on the page; pick it deliberately based on archetype, audience, and the shapes already shipped in the portfolio. Document the rejected shapes in the brief with one-line reasons. Skipping this step means the engine inherits the most recently built hero shape regardless of brief specification, which is the drift signal this skill exists to catch.
- **CTA grammar.** Pick the verb register (e.g. "Shop the collection," "Book a dawn," "See the morning"). Verb-first, shape-appropriate.
- **Imagery direction.** Describe the shoot's register (e.g. "warm-bone studio seamless, three-quarter angle, soft overhead, products fill 70 percent of frame"). Specify aspect ratios per page slot.

**Each adaptation choice gets a sentence of why.** The brief is a referenceable artifact; it should explain itself.

**Output of this step:**

- The full adaptation set, ready to render into the brief template.

---

## Step 5. Render and verify

Record applicable selected decisions in the current host-owned brief through [local direction](../../../../../process/direction.md); do not create a second commercial-demo template artifact.

After rendering, compute the brief's own signature and run output-side divergence:

- `archetype`: the chosen archetype (from step 1)
- `dominant_hue_family`: derived from the palette tokens
- `voice_register`: from the voice section
- `primary_structural_pattern`: from the spine moves
- `hero_shape`: from the section-shapes choice in step 4
- `footer_shape`: from the section-shapes choice in step 4

Compare this signature against every shipped demo using the full rule set in [`03-divergence-check.md`](03-divergence-check.md). The check now runs seven rules: the original three pairwise rules (archetype/hue, archetype/voice/pattern, recurring hue across archetypes) plus the three aggregate shape rules (hero shape collision warn at two matches, hero shape archetype-collision block at three matches with shared family, footer shape warn at three matches).

**Possible outcomes:**

- **passed.** No overlaps. The brief is ready to hand off.
- **warn-with-reasons.** The brief shares a single field (most commonly dominant_hue_family) with a shipped demo, but not enough to be sibling. Surface the warn with the matched fields so the consumer can make a deliberate call.
- **portfolio caution.** Explain any repetition that matters to this new-identity goal. Reuse can be deliberate under an accepted system; the current task and owner decision govern.

**Output of this step:**

- The rendered brief
- The references list (from step 3)
- The divergence-check result with all matched fields if any
- A one-line summary suitable for the build PR's description

---

## Failure modes

- **Skipping step 2.** Picking the archetype that "feels right" without checking against shipped demos is how the portfolio drifts toward house style.
- **Skipping step 5.** Adapting in step 4 without re-checking on output is how the brief itself becomes the carrier of drift.
- **Verbatim copying from the archetype's default palette.** The archetypes provide anchor points, not endpoints. If the brief's palette is the archetype's palette unchanged, the brief is the archetype, not a build.
- **Citing references without why-lines.** A reference URL without a one-line why is decoration. The why is what makes the reference usable in step 4.
- **Hand-waving the divergence check.** The check is not a vibe call. It is a mechanical comparison against the schema. If it produces a block, the adaptation is incomplete.
- **Treating the rejection log as overhead.** The rejection log is part of the deliverable. It tells the next build what is already taken.
