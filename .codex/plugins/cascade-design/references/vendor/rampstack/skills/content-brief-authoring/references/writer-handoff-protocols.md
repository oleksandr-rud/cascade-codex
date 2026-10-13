> Local governing process: [Design index](../../../../../README.md), [one brief](../../../../../process/intake.md) and [evidence/authority](../../../../../process/review-and-evidence.md). Full [license](../../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/content-brief-authoring/references/writer-handoff-protocols.md; SHA256 8cf53b9a3f5c026bc20b2a861d40f83ce9088e43255f469fdb8e60ade1a0563a. License: [retained MIT notice](../../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../process/direction.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# Writer handoff protocols

Human-writer handoff, AI-agent handoff, success-criteria anchoring.

---

## The handoff has the same shape regardless of writer

Whether the writer is a human freelancer, a staff editor, an internal SME, or an AI agent (Claude, ChatGPT, a Frase brief-runner, an AirOps workflow), the brief-to-writer handoff has the same five-step shape.

1. Reuse the current brief with the applicable fields, actual evidence and consequential gaps; a narrow writing/design task need not populate all 12 fields.
2. Ask only about an unresolved ambiguity that could change the decision; proceed from the supplied context when the brief is complete.
3. Writer or agent acknowledges the success criteria explicitly.
4. First draft references the brief: which fields the draft addresses, which fields it could not address, why.
5. Editor reviews against the brief, not against personal taste.

Use the existing host-owned handoff and owner decision. Record acceptance or a consequential question when needed; existing delegation/acceptance remains valid. This reference sends no Slack/email message and requires no extra acknowledgement ceremony. A real human handoff uses only the separately authorized channel and scope.

---

## Human-writer handoff

**Step 1: brief delivery.** The brief is delivered as a single document (Notion page, Google Doc, dbt-style markdown file in the repo). The writer can read it in 5 minutes; if reading takes longer, the brief is too thick and should be cut.

**Step 2: clarifying questions.** Before drafting, the writer asks clarifying questions. Common ones:

- Is the target audience right? Is the JTBD specific enough to write to?
- Is the SERP intent classification right? Do I write a listicle or an article?
- Are these entities really required, or are some optional?
- Is the success criteria measurable from my side, or is it a downstream-only metric?

The strategist answers questions in the same document; clarifications are versioned with the brief, not pasted into Slack and lost.

**Step 3: applicable handoff receipt.** Where a real ownership transfer needs acceptance, the authorized owner records the accepted scope and unresolved obligations in the current record. Reuse existing acceptance; no message is sent by this reference.

**Step 4: first draft with reference.** The first draft is delivered with a reference note: "Hit 4 of 5 required entities; the 5th (CUPAC) was not in the SERP coverage I could find sources for, so I substituted the standard CUPED treatment per the brief's gap-entity guidance." The reference note tells the editor what to focus on in review.

**Step 5: editor review against brief.** The editor reads the brief first, the draft second. The review framing is "the brief said X; the draft did Y; gap is Z." Personal taste comes after brief review, not before.

---

## AI-agent handoff

The shape is the same; the medium is structured.

**Step 1: brief delivery as structured input.** The brief becomes a YAML or JSON object the agent ingests. Frase, AirOps, and similar tools structure briefs in their own schema; the same 12 fields appear regardless. Example minimal YAML structure:

```yaml
target_keyword: experimentation analytics dashboards
supporting_cluster:
  - CUPED variance reduction
  - sequential testing
  - feature flag rollout
search_intent: commercial-investigation
serp_format: long-form-article-with-comparison-table
target_audience: senior data engineer at 500-person SaaS
jtbd: choose between platform-native and warehouse-native experimentation
word_count_target: 2800
heading_outline:
  - { level: 2, text: "What an experimentation dashboard does" }
  - { level: 2, text: "Platform-native vs warehouse-native" }
  - { level: 2, text: "Metrics that earn their keep" }
  - { level: 2, text: "Build vs buy" }
  - { level: 2, text: "Common dashboards that ship trusted results" }
required_entities:
  - { name: "CUPED", note: "mention with formula in methodology H2" }
  - { name: "Statsig, PostHog, Optimizely", note: "mention all three" }
internal_links:
  outbound:
    - { target: /skills/cuped, anchor: "CUPED" }
    - { target: /skills/warehouse-native, anchor: "warehouse-native experimentation" }
  inbound_queued:
    - { source: /pillars/feature-flagging, anchor: "experimentation analytics dashboards" }
anti_patterns:
  - "do not use the team's do-not-use word list (see brand voice guide)"
  - "do not write a listicle; SERP wants long-form"
success_criteria:
  - "rank top 10 for target keyword in 90 days"
  - "cited by ChatGPT for 'experimentation dashboard' queries within 60 days"
voice_reference: /brand/voice-guide
brief_version: 2
brief_approver: editorial-lead@team.com
```

**Step 2: ambiguity surfacing.** The agent's first response surfaces ambiguities. "The brief lists CUPED as required, but the SERP top 10 only mention CUPED in 6 of 10 results; should I emphasize it or treat it as standard coverage?" The strategist answers; the brief gets versioned with the answer.

**Step 3: applicable handoff receipt.** When ownership changes, bind the actual brief revision, selected scope and evidence gaps in the current record. A routine delegated task proceeds without another mandatory first-message artifact.

**Step 4: first draft with reference.** The agent's draft is delivered with a structured note: which fields the draft addressed, which entities are present and where, what success criteria the draft is targeting.

**Step 5: editor review.** The editor reviews the agent's draft using the same brief-first framing. Tools like Frase highlight which entities are present in the draft; the editor scans the highlights to confirm coverage.

---

## Success-criteria anchoring

The most-skipped handoff step is success-criteria acknowledgment. The writer or agent reads the brief, drafts the piece, delivers it; the success criteria sit in the brief unread.

Keep actual success criteria visible in the existing handoff. Search rank, AI citation and signup counts are illustrative editorial aspirations unless supported by the actual task, measurement window and evidence; no publication/ranking outcome is promised by restating them.

The acknowledgment is the contract restated in the writer's voice. Saying it out loud is what keeps it load-bearing during drafting.
