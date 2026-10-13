> Local governing process: [Design index](../../../../../README.md), [one brief](../../../../../process/intake.md) and [evidence/authority](../../../../../process/review-and-evidence.md). Full [license](../../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/onboarding-wizard-design/references/user-type-variation-patterns.md; SHA256 4a84476fbaed635e3fa51d2e16b8625b234b25a450823b4cf56439db6ea4ba80. License: [retained MIT notice](../../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../process/direction.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# User type variation patterns

Admin vs end-user, technical vs non-technical, size-based branching. When one wizard does not serve all users.

Different users may need different wizards. The discipline is to differentiate where the audience genuinely splits, without producing unmaintainable proliferation.

---

## The differentiation principle

Differentiate where the audience genuinely splits into segments with materially different needs, language, or paths. Do not differentiate where one wizard serves all.

**The win.** Admins set up the workspace; end-users start using it. A single wizard tries to serve both and fails both. Differentiated wizards serve each meaningfully.

**The fail.** A team builds 5 wizard variants for 5 imagined personas. Maintenance burden compounds; the variants diverge over time; no variant is excellent.

The discipline. Start with one wizard. Differentiate only when data shows segments with different needs and the differentiation produces meaningfully different paths.

---

## Common differentiation axes

Three axes recur.

**Admin vs end-user.**

- Admins set up the workspace, invite teammates, configure integrations.
- End-users start using what admins set up.
- Their first sessions look different; the ah-ha moments differ.

**Technical vs non-technical.**

- Technical users want depth (see the API, see the integration succeed, configure deeply).
- Non-technical users want outcome (see the result, no API).
- Tone, content, and step coverage differ.

**Size of team.**

- Solo founders configure for one.
- Small teams configure for collaboration.
- Enterprise teams have additional setup (SSO, governance, compliance).

---

## Differentiation patterns

How to implement.

**Pattern A: Role-based branching.**

How it works. First step asks role; subsequent steps adapt.

When to use. When the role split is clear and produces different paths.

**Pattern B: Use-case-based branching.**

How it works. First step asks use case; wizard tailors to that use case.

When to use. When the product serves multiple use cases that warrant different ah-ha moments.

**Pattern C: Size-based branching.**

How it works. First step asks team size; solo, team, enterprise paths differ.

When to use. When the product has materially different setups for different scales.

**Pattern D: Inferred branching.**

How it works. Wizard uses signals (signup source, email domain, prior interaction) to infer the segment without asking.

When to use. When asking would feel intrusive but the inference is reliable.

**Pattern E: No branching.**

How it works. Single wizard for all.

When to use. Most products. Branching adds maintenance; only branch when the value is clear.

---

## Admin vs end-user wizard design

How they differ.

**Admin wizard.**

- Setup-heavy. Connect data, invite team, configure permissions.
- Ah-ha moment: "the workspace is ready; my team can use it."
- Often longer; admins accept guided setup.

**End-user wizard.**

- Action-light. Find the feature, take the first action, see the result.
- Ah-ha moment: "I did the thing I came to do."
- Often shorter; end-users want to start using.

**Cross-talk.** Admins sometimes also become end-users in single-person teams. The wizard may need to detect and serve both modes.

---

## Technical vs non-technical wizard design

How they differ.

**Technical wizard.**

- API depth visible (configuration shown, integration tested).
- Tone: precise, terse, references documentation.
- Ah-ha moment: "the integration works; my data is flowing."

**Non-technical wizard.**

- Outcome visible (result shown, no API exposed).
- Tone: warm, supportive, hides technical complexity.
- Ah-ha moment: "I see the result the product promised."

**Cross-talk.** Some users are technical for some products and not for others. The wizard may infer rather than ask.

---

## Size-based wizard design

How they differ.

**Solo founder wizard.**

- Single-user setup.
- Skip team-related steps.
- Ah-ha moment: individual productivity.

**Small team wizard.**

- Collaboration setup highlighted.
- Invite-team step prominent.
- Ah-ha moment: team coordination.

**Enterprise wizard.**

- SSO, governance, compliance setup.
- Often involves admin handoff to IT or security.
- Ah-ha moment: deployment-ready configuration.

---

## When to combine vs separate

Designing the matrix.

**Combine when:**

- The differentiation is small (1-2 different steps).
- Maintenance burden is the bigger concern.
- The audiences overlap significantly.

**Separate when:**

- The paths differ in 3+ steps.
- Tone and language differ significantly.
- Audience-fit is critical (B2B SaaS where different roles experience the product very differently).

**The 2-3 variants max rule.** More than 3 wizard variants becomes unmaintainable. If 4+ variants seem necessary, reconsider whether the segmentation is too granular or whether different wizards should be different products.

---

## Differentiation testing

Verify the differentiation works.

**Cohort comparison.** Compare activation rates across variants. Did differentiation help?

**Per-segment satisfaction.** Survey users post-wizard. Does each segment feel served?

**Drop-off per variant.** Are some variants dropping off more than others? Which steps?

The data informs whether the differentiation earned its complexity.

---

## Common differentiation failures

**Over-differentiation.** Too many variants; maintenance burden; no variant is excellent.

**Under-differentiation.** One wizard for distinct audiences; everyone feels poorly served.

**Wrong axis.** Differentiated by an axis that does not predict need (e.g., gender when role would have been the right split).

**Inferred wrongly.** Inference logic mistakes audience; users see wrong wizard.

**Stale differentiation.** Audience composition shifted; old branching no longer fits.

---

## Methodology-level choices that stay in the public skill

The differentiation principle. Common differentiation axes. Patterns A through E. Admin vs end-user design. Technical vs non-technical design. Size-based design. Combine-vs-separate decision. Differentiation testing. Common failures.

## Implementation choices that stay internal

Specific wizard variants for specific products. Specific copy per variant in brand voice. Specific inference logic. The team's variant maintenance calendars. These vary by team and product.
