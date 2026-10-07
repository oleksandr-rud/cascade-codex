> Local governing process: [Design index](../../../../../README.md), [one brief](../../../../../process/intake.md) and [evidence/authority](../../../../../process/review-and-evidence.md). Full [license](../../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/product-configurator-design/references/save-and-share-mechanics.md; SHA256 241966cddc019c782b1d96959a7c5c0d90f2c15eb349c5af82ada464b1a1e672. License: [retained MIT notice](../../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../process/prototype-and-build.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# Save-and-share mechanics

Email-link, account, anonymous, shareable URL, embed.

Configurations users return to or send to others. Multi-decision purchases require deliberation; B2B configurations often need stakeholder review. Save-and-share supports these workflows.

---

## The deliberation-friendly principle

Configurators that serve real decision-making produce configurations users want to save and share.

**The win.** User configures complex purchase. Saves via email-link. Shares with stakeholders. Returns days later. Configuration intact; price unchanged; ready to buy.

**The fail.** User configures; cannot save; loses work between sessions; abandons.

The discipline. Save mechanisms support multi-session and multi-stakeholder workflows.

---

## Pattern A: Email-link save

User enters email; link emailed.

**How it works.**

- "Save and resume later" CTA.
- User enters email.
- Link emailed; user clicks to return.

**Strengths.** No account required; cross-device.

**Weaknesses.** Email deliverability; link expiration.

**When to consider.** Only when actual user tasks require email-based cross-device recovery and the authorized product supports it; no default email/account expansion.

---

## Pattern B: Account-based save

Logged-in users save automatically.

**How it works.**

- User logs in.
Return the applicable result in the current host-owned brief/handoff; any file path comes from the host scope. See [intake](../../../../../process/intake.md).
- User returns; finds saved configurations.

**Strengths.** Multi-configuration management.

**Weaknesses.** Account creation friction.

**When to use.** When configurator is part of a logged-in product.

---

## Pattern C: Anonymous-session save

Browser-based persistence.

**How it works.**

- Configuration saved to browser local storage.
- User returns same browser; configuration restored.

**Strengths.** Lowest friction.

**Weaknesses.** Lost on browser change; limited persistence.

**When to use.** As supplement to other patterns.

---

## Pattern D: Shareable URL

Configuration may be represented by an authorized scoped reference in a URL when sharing is actually required. Do not expose private values or infer permissions from a link.

**How it works.**

- Use only the product's supported, access-controlled share representation; sensitive configuration does not belong in URL parameters.
- User shares URL; recipient opens; sees same configuration.

**Strengths.** Easy sharing across channels.

**Weaknesses.** URL length; pricing may shift over time.

**When to use.** Shareable configurations; B2B stakeholder review.

---

## Pattern E: Embed code

Configuration embeddable on other sites.

**How it works.**

- Configurator generates embed code.
- User pastes into other sites or proposals.

**Strengths.** Used in B2B proposals.

**Weaknesses.** Cross-site complexity.

**When to use.** B2B sales contexts.

---

## Pattern F: Hybrid

Combining patterns. Common for production configurators.

**Common combination.** Email-link save + shareable URL + anonymous-session backup.

**Strengths.** Multiple paths.

**Weaknesses.** Complexity.

---

## Save trust communication

Users hesitate to save partial sensitive configurations.

**What to communicate.**

- What is saved.
- How long it persists.
- Who can access it.
- How to delete.

The discipline. Trust communication explicit; not buried in privacy policy.

---

## Resume experience

When user returns.

**The principle.** Resume should be uninterrupted.

**The pattern.**

- User clicks recovery link or logs in.
- Lands at the configuration; rest preserved.
- Continues without re-doing.

**Resume failures.**

- Configuration partially preserved; values lost.
- Pricing changed; user surprised.
- Constraint logic shifted; configuration now invalid.

The discipline. Resume preserves; communicate any changes (e.g., "Pricing has updated since you last visited").

---

## Pricing on resume

When prices change between save and resume.

**Honest pattern.** Show the saved configuration with original price; surface "Pricing has changed; updated price is X" with explanation.

**Dishonest pattern.** Silently update price; user does not notice.

The discipline. Honesty about price changes.

---

## Sharing privacy

Shared configurations may include sensitive info.

**Considerations.**

- What is in the URL/embed.
- Who can see it.
- How long links are valid.

The discipline. Sharing respects user privacy; sensitive details may need account-based sharing rather than URL.

---

## Save-and-share analytics

Track usage.

**Metrics.**

- Save rate.
- Resume rate per saved configuration.
- Share rate.
- Configurations completed via save-and-share path.

---

## Common save-and-share failures

**No save mechanism.** Users lose work; abandon.

**Save mechanism brittle.** Links expire; account access broken.

**Resume loses state.** User lands at start; loses work.

**Pricing surprise on resume.** Silent price update.

**Sharing exposes sensitive info.** Embedded URLs share more than intended.

**Save trust missing.** Users do not save because they distrust persistence.

---

## Methodology-level choices that stay in the public skill

The deliberation-friendly principle. Patterns A through F. Save trust communication. Resume experience. Pricing on resume. Sharing privacy. Analytics. Common failures.

## Implementation choices that stay internal

Specific save mechanisms for specific configurators. Specific tooling for URL encoding and embed generation. Privacy review processes. These vary by team.
