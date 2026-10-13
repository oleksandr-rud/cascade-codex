> Local governing process: [Design index](../../../../README.md), [one brief](../../../../process/intake.md) and [evidence/authority](../../../../process/review-and-evidence.md). Full [license](../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/journey-mapping/SKILL.md; SHA256 5d25b07dd3c6a8a09b8f7e5fff46ca595db3e678cabffd77c8250ee3f93eae54. License: [retained MIT notice](../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../process/research-and-ia.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# Journey Mapping

Build journey maps and service blueprints that surface friction, align teams, and identify opportunities. Stack-agnostic. Tool-agnostic.

This skill is for mapping the experience. For testing specific touchpoints, use [local usability testing reference](../usability-testing/guide.md). For broader generative research, use [local ux research reference](../ux-research/guide.md). For analyzing conversion, use [local review and evidence procedure](../../../../process/review-and-evidence.md).

---

## When to use

- Departments have different mental models of the customer experience
- Customer experience feels disjointed across touchpoints
- Specific friction or drop-off points need diagnosis
- Strategic planning needs a shared view of the user
- Service design (front-stage and back-stage) needs alignment
- New product or feature needs to be designed in context of broader experience

## When NOT to use

- Testing a single touchpoint or page (use [local usability testing reference](../usability-testing/guide.md))
- Generative research before journey mapping (use [local ux research reference](../ux-research/guide.md))
- Operational process mapping that doesn't involve users
- Funnel optimization (use [local review and evidence procedure](../../../../process/review-and-evidence.md))

---

## Relevant inputs and actual execution prerequisites

- Identified user persona or segment to map (one map per segment)
- Existing research and data about that segment
- Cross-functional access (you cannot map back-stage without ops/support/engineering input)
- Time and stakeholder commitment (a real journey map is a project, not an afternoon)

---

## The framework: 3 deliverables

### 1. Customer journey map

The user-facing view of the experience.

**Structure (rows / lanes):**

- **Phase.** The major stages in the journey (e.g., Awareness, Consideration, Onboarding, Activation, Retention, Advocacy). Phases vary by product type.
- **Steps.** Specific things the user does within each phase.
- **Touchpoints.** Where the user interacts with the product, brand, or service (web, app, email, support, social, in-person).
- **Goals.** What the user is trying to accomplish at this step.
- **Thoughts.** What's going through their mind.
- **Emotions.** The emotional state (often visualized on a curve).
- **Pain points.** Where things go wrong, friction, frustration.
- **Opportunities.** Where the experience could improve.

**Format:**

Typically a horizontal timeline with vertical lanes for each row. Phases across the top, touchpoints, thoughts, emotions, etc. underneath.

### 2. Service blueprint

The back-stage view that supports the customer-facing experience.

**Adds these layers below the journey map:**

- **Front-stage actions.** What employees do that the user sees (sales calls, support chats, in-store interactions).
- **Back-stage actions.** What happens behind the scenes (order fulfillment, data processing, internal handoffs).
- **Supporting processes.** Systems, vendors, infrastructure (CRM, payment processors, fulfillment partners).
- **Lines of visibility.** The line between front-stage (visible to user) and back-stage (invisible).

The service blueprint shows where customer-facing problems originate in back-stage failures (e.g., the user's "shipping is slow" experience traces to a vendor handoff issue).

### 3. Synthesized opportunity map

Output of the mapping work.

**Captures:**

- **Top friction points.** Where the experience consistently fails users.
- **Untapped opportunities.** Moments where the experience could surprise and delight.
- **Disconnects.** Where front-stage and back-stage are misaligned.
- **Strategic gaps.** Where competitors have something the brand lacks (or vice versa).
- **Quick wins.** Low-effort, high-impact improvements.
- **Strategic bets.** Higher-effort transformations.

This is the deliverable that produces decisions. The journey map and service blueprint are inputs; the opportunity map is the output that drives action.

---

## Common phases by product type

### Most products

```
Awareness → Consideration → Decision → Onboarding → Active use → Renewal/Repurchase → Advocacy
```

### SaaS

```
Trigger → Discovery → Evaluation → Trial → Onboarding → Activation → Habit → Expansion → Renewal → Advocacy
```

### Ecommerce

```
Need recognition → Discovery → Research → Decision → Purchase → Wait/Anticipation → Receive → Use → Reorder/Recommend
```

### Service

```
Awareness → Inquiry → Quote → Decision → Service delivery → Resolution → Follow-up → Repeat business
```

### Healthcare / high-stakes purchases

```
Trigger → Research → Provider selection → Appointment → Treatment → Recovery → Follow-up → Long-term outcome
```

Phases are not mandatory. Start with the user's actual experience and let the phases emerge from the steps.

---

## How to gather the inputs

A good journey map combines multiple sources of truth.

### From users

- **In-depth interviews.** Walk users through their actual experience. Ask for specifics from a recent occurrence.
- **Diary studies.** Users log their experience over the duration of the journey.
- **Surveys.** Quantitative signal at scale; less depth.

### From the business

- **Internal interviews.** Sales, support, success, ops. They see the experience from different angles than product or design.
- **Operational data.** Funnel data, support ticket categories, NPS responses, churn reasons.
- **System inventory.** What touchpoints exist, what tools support them, what data flows where.

### Cross-validate

- The user's experience as they describe it
- The data the business has about their behavior
- The internal team's perception of the experience

These three views often disagree. The disagreements are themselves findings.

---

## Workflow

1. **Define scope.** One persona, one journey, one timeframe. Trying to map all users in one map produces a mess.
2. **Gather relevant existing inputs first.** Prepare focused inquiry only for a decision-changing gap; external interviews/diaries require actual operator authority. No fixed multi-week study is required.
3. **Draft the journey.** Phases, steps, touchpoints. Get to a working draft fast; iterate.
4. **Add the layers.** Goals, thoughts, emotions, pain points.
5. **Add a service blueprint only when back-stage handoffs materially explain the scoped task.** A local control need not map a full service organization.
6. **Identify opportunities.** Use the friction points and disconnects.
7. **Validate only with real available user evidence.** Otherwise label the journey as observed source/inference/proposed and specify the next test; synthetic role-play is rehearsal.
8. **Review the consequential decision with the existing owner.** A workshop is optional when it improves a real cross-team choice, not a prerequisite to every edit.
9. **Translate to action.** Specific projects, owners, timelines.
10. **Maintain.** A journey map is a living document. Revisit annually or after major changes.

---

## Failure patterns

- **Mapping without research.** A journey map built from internal assumptions reflects assumptions, not users.
- **One map for all users.** The mid-market buyer and enterprise buyer have different journeys. Don't merge.
- **No back-stage layer.** The map shows symptoms, not causes.
- **Beautiful map, no action.** Investment in production value at the expense of decisions.
- **Map as artifact, not tool.** Filed in Figma, never re-opened.
- **Ignoring emotional layer.** The "what" without the "how it feels" misses the point of journey mapping.
- **Vague pain points.** "Frustrating onboarding" - what specifically? When? Why?
- **Quick wins identified, never executed.** Same as research findings that don't ship.
- **Annual exercise without followup.** Year-old journey map describes year-old user.

---

## Output format

Default outputs:

1. **Journey map** (visual, typically Figma / FigJam / Miro, plus a markdown narrative version)
2. **Service blueprint** (visual, typically same tool)
3. **Opportunity map** (markdown, prioritized list)

Markdown narrative version of journey map:

```markdown
# [Persona] journey map

## Phase 1: [Phase name]

### Step: [Step name]
- **Touchpoint:** [Where this happens]
- **Goal:** [What the user wants here]
- **Thoughts:** [What they're thinking]
- **Emotion:** [State on the emotional curve]
- **Pain points:** [Friction]
- **Opportunities:** [Improvement potential]

### Step: [Step name]
[Same structure]

## Phase 2: [Phase name]
[Repeat]

## Service blueprint additions

### Phase 1
- **Front-stage actions:** [What employees do user-visibly]
- **Back-stage actions:** [What happens behind the scenes]
- **Supporting processes:** [Systems involved]

[Repeat per phase]

## Opportunity map

### Critical friction
1. [Specific issue, with evidence]
2. [Specific issue, with evidence]

### Quick wins
1. [Specific opportunity, with effort/impact]

### Strategic bets
1. [Specific opportunity, with effort/impact]

### Cross-team disconnects
1. [Specific disconnect, with implication]
```

---

## If required data is unavailable

This skill's output depends on data, measurements, or tool results it cannot generate on its own. When a required input, tool, or data source is unavailable or unverifiable, the sanctioned output is the deliverable with the gap stated: what was needed, what was actually obtained or verified, and which parts of the output are affected. Fabricating, estimating, or interpolating a required number to complete the deliverable is never sanctioned. A stated gap is a complete answer.

---

## Reference files

- [`references/journey-map-template.md`](references/journey-map-template.md) - Fillable journey map and service blueprint template.
