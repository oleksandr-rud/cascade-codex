> Local governing process: [Design index](../../../../README.md), [one brief](../../../../process/intake.md) and [evidence/authority](../../../../process/review-and-evidence.md). Full [license](../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/usability-testing/SKILL.md; SHA256 98350aa232686167b8ada86f5d40432fb149613f45dde5477536bcd00ded38bd. License: [retained MIT notice](../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../process/direction.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# Usability Testing

Plan and run tests that find usability problems before users hit them in production. Stack-agnostic. Tool-agnostic.

This skill is for testing existing designs or prototypes. For broader discovery research, use [local ux research reference](../ux-research/guide.md). For conversion testing in production, use [local review and evidence procedure](../../../../process/review-and-evidence.md).

---

## When to use

- Before launching a new flow or major redesign
- After a redesign to verify it doesn't introduce new problems
- When analytics show drop-off but you don't know why
- When customer support tickets pattern around specific UI areas
- Pre-launch user validation
- Comparing two design directions

## When NOT to use

- Discovery / generative research (use [local ux research reference](../ux-research/guide.md))
- Live conversion optimization (use [local review and evidence procedure](../../../../process/review-and-evidence.md))
- Mapping the broader experience (use [local journey mapping reference](../journey-mapping/guide.md))
- Pure quantitative measurement (use [local review and evidence procedure](../../../../process/review-and-evidence.md))

---

## Relevant inputs and actual execution prerequisites

- The design or prototype to test (functional or near-functional)
- Specific tasks users would do
- The audience (who should be tested)
- Testing infrastructure (moderated tool, unmoderated tool, in-person setup)

---

## The framework: 5 phases

### 1. Define what to test

Don't test the whole product. Test specific tasks.

**Task selection criteria:**

- The task represents a real user goal (not "click around and explore")
- The task has a clear start and end
- The task is achievable in 2 to 10 minutes
- The task is one of: most common, most strategic, most problematic

**Examples of testable tasks:**

> "You want to find a contractor near you who can install a fence. Show me how you'd do that on this site."

> "You're a first-time visitor. You want to understand if this product fits your needs. Walk me through how you'd evaluate it."

> "Your team needs a new tool to manage projects. Use this site to figure out which plan is right for a 12-person team."

**Task framing rules:**

- State the user goal, not the system action ("find a place to stay" not "click the search button")
- Provide context (why are you doing this?)
- Don't reveal the path
- Don't use product terminology in the task framing

### 2. Choose moderated or unmoderated

**Moderated** (live, with researcher):

- Researcher observes and probes in real time
- Best for early-stage prototypes, complex tasks, novel concepts
- Higher cost, smaller sample (5 to 8 participants typical)
- Catches surprises and probe deeper

**Unmoderated** (recorded, asynchronous):

- Participant completes alone, often via tool (UserTesting, Maze, Lookback)
- Best for stable designs, simple tasks, larger sample
- Lower cost, larger sample (15 to 30 participants typical)
- Catches patterns at scale, less depth per session

For most teams: moderated for early/critical decisions, unmoderated for ongoing validation.

### 3. Define the actual participant plan

Sample relevant task users and experience/device/segment differences for the decision being tested. Record actual access, recruiting operator, budget and consent/recording terms before execution. Participant counts are chosen for scope and uncertainty; there is no fixed count or issue-discovery percentage guarantee. Without access return the full task guide and participant plan, with user testing NOT_RUN. Synthetic rehearsal is not a participant.

### 4. Run the test

**Pre-task setup:**

- If recording is actually authorized and consented, verify the setup; otherwise use the approved notes method.
- Brief participant (purpose, anonymity, recording, "no wrong answers")
- Obtain actual appropriate participant consent under the authorized recording/data plan; do not infer it from attendance or silence.
- Have participant share screen if remote

**Moderated session structure:**

1. **Warm-up** (2 to 3 min). Easy questions to put participant at ease.
2. **Pre-test questions** (3 to 5 min). Background context, current behavior with similar products.
3. **Task 1** (5 to 10 min). Describe task. Have participant attempt while thinking aloud.
4. **Post-task questions** (1 to 2 min). What was easy/hard? Anything confusing?
5. **Repeat for tasks 2, 3, 4** (typically 3 to 5 tasks per 60-minute session).
6. **Overall debrief** (5 to 10 min). General reactions, comparisons to alternatives, anything else.
7. **Close** (2 min).

**Moderation principles:**

- Encourage think-aloud ("What's going through your mind?")
- Don't help unless they're truly stuck (and even then, only after a long pause)
- Don't lead ("Are you looking for the menu?" - bad)
- Note where they hesitate, scroll, or backtrack
- Note their language vs the product's language
- Note emotional reactions

**Anti-patterns:**

- Talking too much (researcher should talk maybe 20% of the time)
- Defending the design when participants struggle
- Helping prematurely
- Asking participants to predict their future behavior
- Treating participant suggestions as features ("Users want X" - test demand for X separately)

### 5. Synthesize and report

Patterns across participants are signal. Single-participant complaints are weaker (but worth investigating).

**Synthesis steps:**

1. **Issue inventory.** Every issue observed, with which participant, which task, severity.
2. **Cluster.** Issues that are the same root problem.
3. **Severity.**
   - **Critical:** Blocks a consequential task; record the actual observed incidence separately, including rare severe blockers.
   - **Major:** Significantly impairs the task; report sampled incidence and limits separately.
   - **Minor:** Friction. Some users hit this. Workaround exists.
   - **Cosmetic:** Polish. Doesn't affect task.
4. **Recommendations.** For each issue, propose specific fixes.
5. **Prioritize.** By severity and effort.

**Report structure:**

```markdown
# Usability Test: [Design / flow]

## Summary
[2 to 3 paragraphs covering: what was tested, headline findings, top 3 priorities]

## Method
[Moderated/unmoderated, sample size, audience, dates, tasks]

## Critical findings
[Each with description, frequency, supporting evidence (quotes/clips), recommendation. Where evidence was not obtained, state the gap per the data-availability rule]

## Major findings
[Same structure]

## Minor findings
[Brief]

## Cosmetic findings
[Briefest]

## What worked well
[Calibration: capture successes too]

## Recommendations
[Prioritized list with effort estimates]

## Next steps
[Test re-run schedule, design iteration plan]
```

---

## Workflow

1. **Define the goals.** What decisions hinge on this? What tasks matter most?
2. **Design tasks.** 3 to 5 specific, realistic, goal-framed tasks.
3. **Choose moderated vs unmoderated.** Match to stage and depth needed.
4. **Prepare the audience-specific participant plan.** Execute recruitment only under actual operator authorization/access/budget/consent; otherwise fieldwork remains NOT_RUN.
5. **Pilot.** 1 to 2 sessions before main batch. Refine tasks if needed.
6. **Run.** Follow the protocol. Stay disciplined.
7. **Synthesize during, not just after.** Patterns emerge by session 4 or 5.
8. **Report.** Multiple formats - written report + highlight clips.
9. **Track fixes.** Every critical issue should have an owner and date.
10. **Re-test after fixes.** Verify the fix worked, didn't introduce new issues.

---

## Failure patterns

- **Testing the whole product instead of specific tasks.** Vague results.
- **Tasks that reveal the path.** ("Click the menu and find...")
- **Friends and family as participants.** Biased, not representative.
- **Researcher leading the participant.** Findings reflect the researcher.
- **Defending the design when participants struggle.** Misses real issues.
- **Helping too quickly.** Participant doesn't experience the friction.
- **Treating participant suggestions as features.** Users solve their problem; product team designs the solution.
- **One participant = data point.** A single strong opinion isn't a finding.
- **Skipping severity scoring.** All findings treated equally; team can't prioritize.
- **Reports no one reads.** Highlight clips and live walkthroughs work better than 80-page decks.
- **Testing once, never re-testing.** Fixes that introduce new problems go undetected.

---

## Output format

Default outputs:

1. **Test plan** (before testing) - `usability-test-plan-[topic].md`
2. **Task script** (per session) - `usability-tasks-[topic].md`
3. **Findings report** (after synthesis) - `usability-findings-[topic].md`
4. **Highlight clips** (separately produced)

---

## If required data is unavailable

This skill's output depends on data, measurements, or tool results it cannot generate on its own. When a required input, tool, or data source is unavailable or unverifiable, the sanctioned output is the deliverable with the gap stated: what was needed, what was actually obtained or verified, and which parts of the output are affected. Fabricating, estimating, or interpolating a required number to complete the deliverable is never sanctioned. A stated gap is a complete answer.

---

## Reference files

- [`references/task-script-patterns.md`](references/task-script-patterns.md) - Task framing patterns by common product type, with good and bad examples.
