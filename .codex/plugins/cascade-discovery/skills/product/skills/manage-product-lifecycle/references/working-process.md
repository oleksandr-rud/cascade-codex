# Product working methods

Read for discovery, research synthesis, method selection, launch, live learning
or retirement. Apply only the components needed by the current decision. The
methods below are a Cascade synthesis of the primary guides in
[source-guide.md](source-guide.md), not evidence of one universally best process.

## Choose the work

Inspect the accepted intent, current behavior, affected people, consequence of
error and actual uncertainty before choosing a method.

| Situation | Smallest useful route |
| --- | --- |
| A known defect or already accepted mechanical change | Host implementation and proportional verification; do not manufacture discovery or a new Product gate |
| An unclear problem, affected population or useful outcome | define-product frames the problem; validate-product designs the needed research |
| A supported problem with competing solutions | define-product compares mechanisms and assumptions; validate-product tests the important risk |
| A cross-product investment or changed priority | manage-product-lifecycle compares outcome, evidence, capacity and exposure |
| Accepted behavior needs a combined specification | cascade-specs:synthesise-spec; the host persists its accepted output |
| Several owners or delivery dependencies need coordination | cascade-project-management:plan-project; use the current tracker and accepted scope |
| A launch, live outcome or retirement decision | Lifecycle review with the relevant operational and learning evidence below |

Discovery and delivery can run concurrently on different decisions. Reuse
current accepted evidence; revisit only premises the change challenges. The
six lifecycle states remain decision gates, not compulsory calendar phases.
This guide does not permit skipping a schema-enforced forward gate. A known
fix outside a new Product decision uses the host route directly.

## Frame the decision

State the decision_owner, user and business outcome, product unit, current
workaround/baseline, scope, non-goals, constraints and exposure at risk. Identify
who uses, benefits, pays, operates, and may be harmed. For Jobs to Be Done,
describe the progress sought in a real circumstance, including relevant social
and emotional constraints; demographics or a feature request alone are weak
problem definitions.

For a consequential concept, draft a short Working Backwards narrative: who
benefits, what changes for them, why the current alternative falls short, and
the hard questions about operation, economics and adoption. Label it a proposed
future, not a release announcement or customer testimony. A full PRFAQ is
optional. Use the [blank decision brief](../assets/product-decision-brief.md)
when a reusable brief is requested; update the existing owner document when
one already serves the decision.

## Discover and synthesize

1. Select one decision question and the unknown that could change the answer.
   Record represented users, recruitment/access needs, method, data destination,
   owner, budget, consent/handling constraints and the planned decision use.
   No universal interview count or weekly ceremony is required.
2. Investigate actual recent experiences, task context, workarounds and observed
   behavior. Separate what a participant reports from what was observed. Avoid
   leading with the proposed solution. Route external demand/economics work to
   Cascade Market and canonical human models to Cascade Personas.
3. Retain source locators and relevant dates for each observation. Use privacy-
   appropriate participant/source identities; do not put raw personal data or
   client transcripts in this portable plugin. Count distinct represented
   participants only when that information exists; duplicate tickets or repeated
   quotes are not independent people. Sample frequency is not prevalence.
4. Interpret meaning through LLM claims with explicit class, source support,
   uncertainty, scope and counterevidence. Keyword matching, regular expressions,
   phrase lists and lexical scores must never substitute for claims, clustering,
   intent, risk or opportunity judgments, including examples and fallbacks.
   Code may parse exact formats, count declared identities and validate fields.
5. Compare candidate themes against the original observations, outliers and
   contrary sources. Check whether disagreements reflect different populations,
   dates, conditions or instruments. Preserve unexplained contradictions rather
   than choosing the more convenient source or averaging away a failed risk.
6. State supported findings, weaker inferences, alternative explanations and the
   next deciding evidence. Connect outcome -> opportunity -> solution ->
   assumption/test in the existing sections, requirements and traceability;
   an opportunity tree is optional, not a second database.

## Shape alternatives and investment

Use Double Diamond's problem/solution distinction when framing is unsettled:
broaden observations before choosing the problem, then compare plausible ways
to solve it before committing. It need not produce four documents. Compare a
useful software slice, process/service change and deliberate non-build when
they are credible alternatives. Preserve an explicitly selected mechanism.

Examine value, usability, feasibility and business viability separately. Name
the risk, the assumption that can fail, its owner and the evidence needed.
Value needs relevant real-user or market behavior; task testing informs
usability; technical investigation informs feasibility; economics and operating
constraints inform viability. One passing risk cannot compensate for another
blocking risk. Prefer the cheapest test that can change the investment decision.

Use Shape Up's appetite to bound an investment when scope is negotiable: state
time/cost capacity, a complete useful outcome, important unknowns and exclusions.
An appetite is a proposed spending limit, not an effort estimate or evidence of
feasibility. Stop or reshape when the outcome cannot fit the accepted constraint.

Use qualitative comparison when quantities are unknown. RICE is optional when
reach, impact, confidence and effort have comparable, traceable definitions;
its confidence term is a prioritization judgment, not statistical confidence.
Keep unknowns unknown and eligibility separate from ranking. Now–Next–Later
can express outcome priorities and differing commitment; retain actual external
deadlines explicitly and send committed scheduling to Project Management.

## Validate, release and learn

Freeze the represented population, baseline, outcome, instrument, observation
window, success/kill rules and guardrails before execution or release. Proposed
values are decision terms awaiting owner acceptance, with claims NOT_RUN;
missing observations are not zeros. No single retention or engagement target
fits all products: a finite job can succeed through completion and safe exit.

For a usable learning contract:

- connect goal -> observable signal -> measure; distinguish output/activity,
  completed task, useful outcome and incremental effect;
- verify instrumentation, event/denominator definitions, missingness, comparable
  cohorts and timing before interpreting a change;
- for causal questions, select a defensible controlled design where feasible;
  predeclare allocation, analysis and stopping conditions, and inspect assignment
  and exposure failures before reading the outcome;
- classify invalid telemetry as inconclusive and investigate the measurement;
  it establishes neither success nor failure of the intervention;
- keep real-user, market, usability, functional, simulation and semantic evidence
  separate. A prototype task pass cannot establish demand, and model judges
  cannot establish human calibration.

At a delivery handoff, make the supported slice, requirements, complete journey,
failure/recovery, non-goals and learning conditions visible. Route interaction
design to Cascade Design, specification synthesis to Cascade Specs, quality
planning/evidence to Cascade QA and delivery coordination to Project Management.
The host owns implementation, rollout, verification and authorized release.
Choose the team's accepted Scrum, Kanban or other execution arrangement; do not
install a second backlog or claim a hybrid framework without its actual rules.

Before a launch recommendation, identify rollout population/exposure, support
and operational owner, compatibility/access needs, monitoring, pause/rollback
conditions and the accepted learning contract. Reuse existing evidence for these
controls. Missing decision-critical terms prevent a delivery-ready recommendation;
do not invent them or postpone measurement design until after launch. Product
approval, verified implementation and actual deployment are separate states.

Review observed outcomes, support/reliability, adoption burden, costs and
guardrails over the declared horizon. Compare with the prior hypothesis and
record continue, expand, revise, narrow, pause or stop plus the contrary result
that would change the decision. Delivery completion can precede outcome evidence.
Reopen only the challenged premises and their named downstream consumers.

## Retire responsibly

A STOP investment proposal does not complete a shutdown. Identify affected
users and integrations, how the underlying need will be met, transition or
replacement, notice/support ownership, data export/retention/deletion obligations,
contractual dependencies, decommission proof and an observable completion rule.
Unknown obligations require their owning evidence. A material transition gap
blocks readiness for shutdown; it does not require continued feature investment.
Retirement is a working mode in existing sections, journeys and requirements,
not an invented seventh lifecycle enum. Keep execution and actual completion
NOT_RUN until the host supplies the relevant evidence.
