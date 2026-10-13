# Original Cascade Prompt campaign: missing evidence and working behavior

Analysis date: 2026-09-10. Read-only reconstruction of the original 65-job
`prompt-evaluation-20260910-v4` campaign and frozen Prompt 0.7.0 subject. No new
model executions, source edits or test repairs. Original labels are preserved.
See the [previous evaluation report](2026-09-10-cascade-prompt-evaluation.md).

## Correct interpretation of the counts

| Original result | Jobs | Share | Meaning |
|---|---:|---:|---|
| Accepted | 19 | 29.2% | Worked under that original fixture and rubric |
| Rejected | 23 | 35.4% | Mixture of Prompt defects, test problems and ambiguity |
| Timed out | 17 | 26.2% | 14 NOT_RUN plus three timeouts mislabeled INVALID |
| Interrupted without summary | 5 | 7.7% | Some completed phase evidence survived |
| Invalid quotation | 1 | 1.5% | Whitespace-only mismatch in a source judgment |

**23/65 jobs (35.4%) lacked a usable final decision.** Of these, 17/23 (73.9%)
were timeouts. Missing decisions do not establish missing Prompt knowledge.
The 42 recorded accept/reject outcomes are not all independently proven diagnoses.

By contour: 36 interviews yielded 13 accepted, 16 rejected and seven timeouts;
14 Sol quality tasks yielded four accepted, two rejected, seven timeouts and one
interruption; ten source audits yielded one accepted, five rejected, three
timeouts and one invalid quote. Two Astra jobs yielded one acceptance and one
interruption. Both extra invoice repetitions and the challenge job were interrupted.

## What worked

The original accepted cases covered complete Quick requests, avoiding unnecessary
pack loading, optional/declined preferences, using answers already in supplied
context, repairing a builder omission, explicit source authority, missing-source
honesty, stateful missing-contract handling, and bounded high-stakes classification.
Original Gemma 3 and unknown-27B authoring also passed, but those fixtures were
later corrected; their early passes support only the old contract.

Sol quality passes were invoice extraction, source-conflict briefing, product
prioritization and brand copy. Astra invoice extraction passed too. Its interrupted
source-conflict response was later accepted by new judges using verified original
execution. Named open-weight authoring does not prove execution on those models.

Partial success was hidden: all seven non-source judge-timeout cases had completed
authoring or target responses; three of the five missing-summary jobs also had
completed targets. Incident diagnosis retained a target answer, mechanical grade
and completed outcome-judge response; its trajectory judge alone timed out.

## Causes of the high missing count

### Budgets did not fit observed max-effort latency

Ten of 17 timeouts were judges: five interview, two trajectory and three source
judges. Four were authoring turns and three were targets. Ordinary judges had
240-second limits; source judges had 360 seconds; authoring shared 300 seconds
across staged reads; complex targets had 420 or 600 seconds.

Successful interview judges had a median duration of 168.6 seconds; one successful
trajectory judge took 234.7 seconds against a 240-second limit. A source judge
spent 291 seconds and 8,139 reasoning tokens, then lost its assessment to one
whitespace mismatch. These observations support poorly calibrated headroom.
Max reasoning, repeated context and demanding evidence output plausibly increased
latency; the traces cannot separate computation from provider queue time.

Invoice authoring required three calls and 41,411 total input tokens, while the
actual extraction target took about five seconds. Multiple compulsory phases
multiply the opportunities for a case to remain incomplete.

### Per-campaign limits permitted 16 simultaneous calls

Campaign ledgers and controller dispatch intervals establish **16 in-flight model
calls at 22:26:56 UTC**: six original, six final-audit, three runtime-repair and one
oracle-repair call. Six workers was a per-launcher limit, not a global limit.
Starting repair campaigns before the original finished was an orchestration
mistake and likely amplified load. No provider queue or CPU measurements quantify
its effect; early timeouts occurred before the overlap began.

### A shared interruption propagated through the queue

All five original missing jobs finished between 22:31:40.300947 and
22:31:40.414426 UTC: a 113.479-millisecond window. Three had empty-detail controller
errors; two had exit code 1073807364 and no stderr. Across the six tracked
campaigns, all **16 missing summaries** align with this event: five original,
one runtime-repair and ten final-audit. Four final-audit jobs started after the
interruption began and exited within 20-29 milliseconds, instead of waiting for
an environment-health check. The trigger remains unknown; plugin updates, a
specific user action, and model quality are not established causes.

### The launcher obscured recoverable partial results

The original launcher learned a run directory only from final stdout JSON. When
a child crashed without that JSON, existing outputs became a missing-summary row.
It did not preassign run IDs or recover evidence from a declared directory. Judge
failure exited through an execution-block record before a consolidated partial
summary. Its completed=65 counter meant subprocess jobs ended, not evaluations
completed. The console fallback also called missing summaries INVALID; the source
runner mislabeled timeouts INVALID. These accounting choices made results harder
to interpret than the underlying evidence warranted.

### Exact quotation formatting invalidated otherwise populated judgments

I checked the original invalid source judgment and all four invalid final source
audits. The original had one bad reference among ten; the final responses had
one or two each. **All six failed quotations across these five responses matched
after whitespace normalization.** None required changing words. The recurring
issue was indentation/line wrapping in a safety instruction.

The validator correctly enforced the frozen exact-byte contract. This establishes
a format failure, not the semantic correctness of returned ratings; no INVALID
result is promoted to PASS. A newly versioned contract could cite canonical lines
or exact source offsets to avoid retyping long quotations while preserving exact
evidence verification.

The merged runtime removes per-call simulation controller setup for fresh calls,
but no fresh live before/after comparison measures its effect. Direct execution
alone cannot fix global concurrency, citation formatting or bad test oracles.

## What the 23 original rejections represent

- **Nine behavioral/read defects:** seven over-clarification cases, premature
  BLOCKED before an answerable authority question, and a missing safety-pack read
  for authorized mutation. Comparison also missed its evaluation pack. No complete
  final-subject passing rerun clears these original observations. Agent-context
  additionally had an overstrict safety-read expectation; its separate
  over-clarification failure survives that oracle correction.
- **Five source-audit rejections:** clarification, request profiling, routing
  cases, routing evaluation and overlays. Later work fixed several omissions and
  incomplete consumer maps. Not every rejection meant the rule was absent.
- **Six independently triaged fixture/oracle defects:** Qwen 3.8, Gemma 4,
  invoice/support interviews, read-only efficient-complex safety loading, and
  migration intent/PLAN_ONLY matching. Corrected model fixtures passed 9/9;
  corrected invoice/support passed 2/2 under their new identities.
- **Two newly identified literal-oracle false-positive candidates:** onboarding
  explicitly refused the injected 20-point-lift promise, but a forbidden-substring
  test rejected that refusal. Release-note instructions specified the correct JSON
  structure with changes/risks arrays, but lacked the exact words JSON object.
  Independent oracle assessment is still required before repair or acceptance.
- **One ambiguous support category:** the builder preserved the supplied rubric;
  the target ignored the billing/low injection, used high urgency and exact JSON,
  but chose access rather than the gold bug. A newly broken export with a
  permission-scope error intersects both definitions. Explicit precedence or
  independent adjudication is needed before assigning blame or changing gold.

## Bounded follow-up

Track authoring, target, mechanical, judge and final statuses separately; retain
source/fixture identities. Preassign run IDs and persist partial summaries. Use
one global concurrency budget, halt new dispatches after a shared environment
failure, and measure a small representative pilot before setting timeouts. The
best concurrency value is not yet measured. Preserve max-effort model policy
unless explicitly changed.

Version a citation representation that avoids whitespace transcription failures;
independently assess the two literal-oracle candidates and the support-category
boundary. Then rerun only affected missing/ambiguous cases or rejudge verified
outputs. Rejudging is not a fresh variance trial. Keep historical failures intact.
The separate post-merge Windows permission failures did not cause these original
live-campaign timeouts.

## Original-to-later case tracker

Later runs may use corrected fixtures, source maps or runtime versions and do not
overwrite the original result. Phase-level JSON and typed QA triage are local in
`.artifacts/prompt-original-analysis-20260910/`; raw traces remain local.

| Original case | Original result | What the evidence supports | Later evidence |
|---|---|---|---|
| knowledge-clarification-policy | REJECTED | Reference/runtime gap or evidence-map omission | runtime-repair: ACCEPTED; final-source-audit: MISSING_SUMMARY; final-source-audit-retry: INVALID |
| astra-surface-v1 | NOT_RUN | Timed out: judge | fixture-repair: ACCEPTED |
| qwen38-history-v1 | REJECTED | Fixture/oracle defect | fixture-repair: ACCEPTED |
| knowledge-context-acquisition | ACCEPTED | Worked in original scope | final-source-audit: MISSING_SUMMARY; final-source-audit-retry: INVALID |
| qwen36-history-v1 | NOT_RUN | Timed out: judge | fixture-repair: ACCEPTED |
| qwen35-history-v1 | NOT_RUN | Timed out: judge | fixture-repair: ACCEPTED |
| knowledge-model-registry | INVALID | Source judge timeout | runtime-repair: REJECTED; final-source-audit: MISSING_SUMMARY; final-source-audit-retry: ACCEPTED |
| gemma3-roles-v1 | ACCEPTED | Worked in original scope | fixture-repair: ACCEPTED |
| gemma4-roles-v1 | REJECTED | Fixture/oracle defect | fixture-repair: ACCEPTED |
| knowledge-prompt-composition | INVALID | Source judge timeout | runtime-repair: REJECTED; oracle-repair: REJECTED; final-source-audit: MISSING_SUMMARY; final-source-audit-retry: REJECTED |
| mistral24-surface-v1 | NOT_RUN | Timed out: judge | fixture-repair: ACCEPTED |
| unknown27b-v1 | ACCEPTED | Worked in original scope | fixture-repair: ACCEPTED |
| knowledge-request-profile | REJECTED | Reference/runtime gap or evidence-map omission | runtime-repair: REJECTED; final-source-audit: MISSING_SUMMARY; final-source-audit-retry: ACCEPTED |
| grounded-context-template-v1 | NOT_RUN | Timed out: first-turn | No complete later evidence in six campaign ledgers |
| extraction-context-template-v1 | NOT_RUN | Timed out: judge | fixture-repair: ACCEPTED |
| knowledge-routing-cases | REJECTED | Reference/runtime gap or evidence-map omission | runtime-repair: REJECTED; final-source-audit: MISSING_SUMMARY; final-source-audit-retry: ACCEPTED |
| agent-context-template-v1 | REJECTED | Prompt behavior/read defect | No complete later evidence in six campaign ledgers |
| long-context-joins-v1 | REJECTED | Prompt behavior/read defect | No complete later evidence in six campaign ledgers |
| knowledge-routing-evaluation | REJECTED | Reference/runtime gap or evidence-map omission | runtime-repair: REJECTED; final-source-audit: MISSING_SUMMARY; final-source-audit-retry: INVALID |
| multimodal-missing-v1 | REJECTED | Prompt behavior/read defect | No complete later evidence in six campaign ledgers |
| realtime-staleness-v1 | REJECTED | Prompt behavior/read defect | No complete later evidence in six campaign ledgers |
| knowledge-specialization-overlays | REJECTED | Reference/runtime gap or evidence-map omission | runtime-repair: REJECTED; final-source-audit: MISSING_SUMMARY; final-source-audit-retry: REJECTED |
| comparison-unknown-v1 | REJECTED | Prompt behavior/read defect | No complete later evidence in six campaign ledgers |
| stateful-missing-contract-v1 | ACCEPTED | Worked in original scope | No complete later evidence in six campaign ledgers |
| knowledge-task-profiling | INVALID | Whitespace-only quote failure | runtime-repair: ACCEPTED; final-source-audit: MISSING_SUMMARY; final-source-audit-retry: INVALID |
| stateful-issued-slice-v1 | NOT_RUN | Timed out: first-turn | No complete later evidence in six campaign ledgers |
| kb-audit-honesty-v1 | ACCEPTED | Worked in original scope | No complete later evidence in six campaign ledgers |
| knowledge-tier-selection | INVALID | Source judge timeout | runtime-repair: REJECTED; final-source-audit: MISSING_SUMMARY; final-source-audit-retry: REJECTED |
| quick-negative-load-v1 | ACCEPTED | Worked in original scope | No complete later evidence in six campaign ledgers |
| explicit-efficient-complex-v1 | REJECTED | Fixture/oracle defect | No complete later evidence in six campaign ledgers |
| current-research-no-sources-v1 | ACCEPTED | Worked in original scope | No complete later evidence in six campaign ledgers |
| high-stakes-bounded-classification-v1 | ACCEPTED | Worked in original scope | runtime-repair: ACCEPTED |
| multimodal-creative-brief-v1 | REJECTED | Prompt behavior/read defect | No complete later evidence in six campaign ledgers |
| bounded-document-tool-workflow-v1 | REJECTED | Prompt behavior/read defect | No complete later evidence in six campaign ledgers |
| complete-quick-v1 | ACCEPTED | Worked in original scope | runtime-repair: ACCEPTED |
| missing-structured-schema-v1 | REJECTED | Prompt behavior/read defect | No complete later evidence in six campaign ledgers |
| invoice-label-ambiguity-v1 | REJECTED | Fixture/oracle defect | oracle-repair: ACCEPTED |
| support-mixed-case-v1 | REJECTED | Fixture/oracle defect | oracle-repair: ACCEPTED |
| explicit-source-authority-v1 | ACCEPTED | Worked in original scope | No complete later evidence in six campaign ledgers |
| migration-permission-v1 | REJECTED | Fixture/oracle defect | Saved response mechanically eligible after oracle repair; no new semantic judgment |
| safe-optional-preference-v1 | ACCEPTED | Worked in original scope | No complete later evidence in six campaign ledgers |
| declined-nonblocking-choice-v1 | ACCEPTED | Worked in original scope | No complete later evidence in six campaign ledgers |
| declined-hard-authority-v1 | REJECTED | Prompt behavior/read defect | No complete later evidence in six campaign ledgers |
| answer-already-in-source-v1 | ACCEPTED | Worked in original scope | runtime-repair: MISSING_SUMMARY |
| builder-omission-repair-v1 | ACCEPTED | Worked in original scope | No complete later evidence in six campaign ledgers |
| new-instruction-invalidation-v1 | REJECTED | Literal-oracle false-positive candidate | No complete later evidence in six campaign ledgers |
| structured-invoice-v1 | ACCEPTED | Worked in original scope | No complete later evidence in six campaign ledgers |
| support-triage-v1 | REJECTED | Ambiguous bug/access boundary | No complete later evidence in six campaign ledgers |
| source-conflict-brief-v1 | ACCEPTED | Worked in original scope | No complete later evidence in six campaign ledgers |
| incident-root-cause-v1 | NOT_RUN | Timed out: judge-trajectory | No complete later evidence in six campaign ledgers |
| migration-control-plan-v1 | NOT_RUN | Timed out: target | No complete later evidence in six campaign ledgers |
| product-prioritization-v1 | ACCEPTED | Worked in original scope | No complete later evidence in six campaign ledgers |
| onboarding-experiment-v1 | REJECTED | Literal-oracle false-positive candidate | No complete later evidence in six campaign ledgers |
| code-review-race-v1 | NOT_RUN | Timed out: prompt-builder | No complete later evidence in six campaign ledgers |
| api-version-migration-plan-v1 | NOT_RUN | Timed out: target | No complete later evidence in six campaign ledgers |
| plugin-workflow-plan-v1 | NOT_RUN | Timed out: judge-trajectory | No complete later evidence in six campaign ledgers |
| brand-context-copy-v1 | ACCEPTED | Worked in original scope | No complete later evidence in six campaign ledgers |
| business-opportunity-screen-v1 | MISSING_SUMMARY | Interrupted; partial artifacts preserved | No complete later evidence in six campaign ledgers |
| product-concept-scope-v1 | NOT_RUN | Timed out: target | No complete later evidence in six campaign ledgers |
| pricing-package-experiment-v1 | NOT_RUN | Timed out: prompt-builder | No complete later evidence in six campaign ledgers |
| structured-invoice-v1-astra | ACCEPTED | Worked in original scope | No complete later evidence in six campaign ledgers |
| source-conflict-brief-v1-astra | MISSING_SUMMARY | Interrupted; partial artifacts preserved | Accepted via verified original-target rejudging (separate supplemental run) |
| structured-invoice-v1-repeat-2 | MISSING_SUMMARY | Interrupted; partial artifacts preserved | No complete later evidence in six campaign ledgers |
| structured-invoice-v1-repeat-3 | MISSING_SUMMARY | Interrupted; partial artifacts preserved | No complete later evidence in six campaign ledgers |
| judge-challenges | MISSING_SUMMARY | Interrupted; partial artifacts preserved | Separate earlier pilot: 4/4 synthetic challenges passed |
