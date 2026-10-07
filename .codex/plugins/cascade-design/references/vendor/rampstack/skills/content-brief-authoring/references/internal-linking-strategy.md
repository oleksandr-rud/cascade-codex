> Local governing process: [Design index](../../../../../README.md), [one brief](../../../../../process/intake.md) and [evidence/authority](../../../../../process/review-and-evidence.md). Full [license](../../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/content-brief-authoring/references/internal-linking-strategy.md; SHA256 583fc4c14248b6cfca9a36fb538307419406aa3b6ee114f9fe4c427417f67ceb. License: [retained MIT notice](../../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../process/direction.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# Internal linking strategy

Outbound and inbound linking patterns, orphan-content prevention, self-cannibalization check.

---

## Two link directions to specify

Every brief specifies links in two directions.

**Outbound from this piece.** 3 to 5 pages this piece should link to. Anchor text and target page named explicitly. The writer is not deciding internal links during drafting; the strategist already knows the cluster and which pieces should reinforce each other.

**Inbound to this piece, post-publish.** 1 to 3 existing pages that should add a link to this piece after it publishes. This is a follow-up task queued in the brief, not a request to the writer.

---

## Outbound link selection

The cluster pieces. The brief lists the supporting cluster pieces this piece should link to, with anchor text that matches each target's primary keyword.

**Example for a pillar piece on "experimentation analytics dashboards":**

> **Outbound links (writer integrates)**
>
> 1. Link to "CUPED variance reduction" (cluster piece) using anchor "CUPED" or "variance reduction with CUPED" in the methodology H2.
> 2. Link to "warehouse-native experimentation" (sister pillar) using anchor "warehouse-native experimentation" in the platform-vs-warehouse comparison H2.
> 3. Link to "feature flag tools comparison" (commercial-intent piece) using anchor "feature flag tools" in the deployment H2.
> 4. Link to "data warehouse setup" (foundation piece) using anchor "data warehouse" in the prerequisites H2.

The discipline: anchor text matches the target's primary keyword. Generic anchors ("click here," "this article") do not pass ranking signals; keyword anchors do.

---

## Inbound link queue

The brief queues 1 to 3 existing pages that should add a link to the new piece after it publishes. The strategist updates these as part of the publish checklist.

**Example continuing the same pillar:**

> **Inbound link updates (post-publish task)**
>
> 1. Update "feature flagging" pillar to link to the new piece in the "measuring feature impact" section using anchor "experimentation analytics dashboards."
> 2. Update "PostHog vs Statsig" comparison to link to the new piece in the analytics-comparison H2.
> 3. Update homepage "Resources" section to add the new piece to the "Pillars" list.

The inbound queue prevents the orphan-content failure mode.

---

## The orphan-content failure mode

Symptom: piece publishes, no other piece links to it, search engines deprioritize it, AI engines do not see it as cluster-anchored.

Cause: internal linking was an afterthought, handled by the writer or by SEO at publish time without strategic intent. The writer linked out to 3 pages because the brief said to; nobody linked back in because nobody owned that task.

Fix: the brief queues the inbound updates explicitly. The publish checklist includes the inbound updates as a tracked task. Without a tracked task, the inbound updates do not happen; without inbound links, the piece is an orphan.

The "5-link rule" diagnostic. This upstream editorial diagnostic is an example, not a universal ranking or quality gate. Use actual information architecture and relevant discovery/access evidence. If a piece has fewer than 5 inbound links at the 30-day check, audit the inbound queue and add the missing links.

---

## The self-cannibalization check

Before briefing a new piece, check whether it would compete with an existing piece for the same keyword cluster.

**The check.** Search the site for the target keyword. If an existing piece is in the top 5 of internal search results, flag it.

**Three options when self-cannibalization is detected:**

1. **Consolidate.** Merge the planned piece into the existing piece. Update the existing piece with the new angle, the new entities, the new examples. Keep one URL ranking; do not split ranking authority across two URLs.
2. **Differentiate.** Sharpen the angle of the new piece so it does not compete. The existing piece covers "what is feature flagging"; the new piece covers "feature flag rollout strategies for enterprise teams." Different intent, different audience, different SERP target.
3. **Kill one.** Determine which piece serves the cluster better. Redirect the loser to the winner. This is rare and usually signals the program does not have clear pillar structure.

The discipline: flag self-cannibalization in the brief, not after the piece is written. Late detection is the expensive failure mode; the writer has already invested hours that now have to be either rewritten or thrown away.

---

## Brief field: how to populate internal linking

> **Internal linking**
>
> **Outbound (3 specified, 2 optional)**
> - Required: link to "CUPED variance reduction" with anchor "CUPED" in methodology H2
> - Required: link to "warehouse-native experimentation" with anchor "warehouse-native" in comparison H2
> - Required: link to "feature flag tools 2026" with anchor "feature flag tools" in deployment H2
> - Optional: link to "data warehouse setup" with anchor "data warehouse" in prerequisites H2 (writer's call based on flow)
> - Optional: link to "experiment-design skill" with anchor "experiment design" in introduction (writer's call)
>
> **Inbound (post-publish, queued)**
> - Update "feature flagging" pillar (insert link in section 4)
> - Update "PostHog vs Statsig" comparison (insert link in analytics-comparison H2)
>
> **Self-cannibalization check**
> - Existing pieces on adjacent keywords: "experiment dashboards introduction" (different angle, no conflict)
> - No conflict; proceed with brief

The brief is explicit about what is required, what is optional (writer chooses), and what is queued for post-publish. Three layers of discipline.
