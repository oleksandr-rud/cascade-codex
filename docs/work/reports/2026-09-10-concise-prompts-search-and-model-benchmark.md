# Concise prompts, retrieval coverage, and model pilot

Cascade Prompt now requests the shortest complete delivery, with conditional
notes and no automatic reports, attachments, repeated explanations, or fixed
list quotas. Retrieval rules cover public web search, exact-domain/version
research, and combined web/database answers. Model defaults remain unchanged.

## Changes

Research answers use the grounded-answer template even when retrieval involves
tools; continued action over state/history selects contextual-agent. This
distinction repairs two observed wrong-template selections. The runtime requires
inspected pages, claim-specific source authority, freshness and conflict handling,
bounded calls/retries, and explicit partial coverage. Hybrid retrieval also
preserves tenant/query scope, keeps private database values out of public web
tools, and joins only exact compatible keys.

Three new authoring fixtures specify target answers of at most 150 words for
general research, 180 for PostgreSQL 17 official-documentation research, and 220
for public features joined to purchased database entitlements. Citations and
material gaps remain mandatory. These are fixture-specific caps, not universal
plugin limits. The catalog now contains 14 target tasks, 39 interview fixtures,
and 64 mapped rule groups.

Evaluation previously ignored campaign model flags. The launcher now records
and forwards the selected author/target configuration before dispatch. A
separate judge reasoning setting fixes Sol/max judges across both comparison
arms and participates in judgment cache identity. A transient Windows slot-file
open failure exposed another execution gap: bounded retries now apply only to
pre-open EPERM failures, and persistent setup failures stop shared dispatch.
Ownership checks and the shared three-invocation limit remain intact.

## Model configuration

| Surface | Existing setting, retained |
|---|---|
| Repository Codex session | Astra/max |
| Eight named roles | Sol/high |
| Simulation operator | Sol/medium |
| Fourteen plugin model policies | Sol; planning high, evaluation max |
| Prompt Evals defaults | Sol/max author, target, and independent judge |
| Added optional benchmark configuration | Astra/high author and target; Sol/max judges |

The pilot compares Astra/high against Sol/max. It does not benchmark Sol/high
roles or establish a replacement for every plugin.

## Original frozen pilot

One observation for each of six cases in each arm; fixed Sol/max judges.
Prompt `0.7.3+codex.20260910133309`, Evals
`0.3.5+codex.20260910133309`; 153 frozen files. Builder/target deadlines were
600 seconds and judge deadlines 720 seconds, excluding shared-pool waiting.

| Case | Astra/high | Sol/max |
|---|---|---|
| Quick concise rewrite | ACCEPTED, 0.9625 | ACCEPTED, 1.0 |
| General web prompt | ACCEPTED, 1.0 | No verdict: slot-file open failure before dispatch |
| Specialized web prompt | ACCEPTED, 1.0 | REJECTED: wrong template reads |
| Web + database prompt | ACCEPTED, 1.0 | REJECTED: wrong template reads |
| Code-review packet | ACCEPTED, 1.0 | No verdict: target timed out after 600 seconds |
| Workflow-plan packet | REJECTED, 0.775 | REJECTED, 0.65 |

Astra had five accepted cases and one rejection; Sol had one accepted case,
three rejections, and two incomplete cases. Incomplete results are not semantic
failures. The first Sol web failure invoked no model in its failed phase; the
code-review timeout did dispatch, retained partial evidence, and has unknown
complete token usage.

Both workflow targets returned the required valid JSON, but their prompts lacked
a usable failure branch for incompatible packet evidence. Sol additionally
instructed unconditional verbatim output and treated factual conflicts as inert.
The fixture itself requires exact successful output values without defining an
error channel; this ambiguity limits model-ranking conclusions from that case.
The original verdicts are preserved. A future workflow benchmark should define
success and failure outputs before adding incompatible-input controls.

The quick case produced 60 displayed words with Astra versus 117 with Sol;
operative prompts were 55 versus 97 words. Author execution took 21.4 versus
56.0 seconds, with 242 versus 1,446 reported output tokens. Astra's small score
deduction concerned missing failure behavior after an unsuccessful repair.
Shortness alone is not acceptance evidence.

## Fresh research repair cohort

The same three research requests were repeated once per arm against Prompt
`0.7.4+codex.20260910134732` and Evals `0.3.6+codex.20260910134732`, after the
template-routing and Windows-open repairs. Judges remained Sol/max. This is a
separate 153-file freeze; its results are not pooled with the original pilot.

| Case | Astra/high | Sol/max | Author seconds: Astra / Sol |
|---|---|---|---|
| General web prompt | ACCEPTED, 0.9625 | ACCEPTED, 0.9625 | 46.9 / 225.8 |
| Specialized web prompt | ACCEPTED, 1.0 | ACCEPTED, 1.0 | 51.7 / 187.7 |
| Web + database prompt | ACCEPTED, 0.9625 | ACCEPTED, 0.9625 | 62.5 / 394.4 |

All six cases passed their 114 mechanical checks, including 50 required-read
and 18 forbidden-read checks. Neither repair arm had an execution block. Small
semantic deductions concerned the conditional Astra API/Responses host check,
or an explicit rule for reversible assumptions and outcome-changing questions.
ACCEPTED does not mean every dimension scored perfectly.

Total author execution was 161.2 seconds for Astra/high versus 807.8 for Sol/max;
reported output tokens were 3,833 versus 23,904. Displayed author responses were
2,028 versus 1,776 words, so Astra was faster here but did not produce less text.
The fixed judges separately used 1,768.3 execution seconds and 54,398 reported
output tokens across six calls. These measurements do not establish monetary
cost or isolate model effects from reasoning-effort effects.

## Integration and proof boundary

After the freezes, upstream master advanced to `9b41001`. Its path-resolution,
readiness, optional-question, literal-label, host-isolation, and interview-oracle
repairs were merged without discarding the changes above. The resulting source
and installed packages are Prompt `0.7.5+codex.20260910140800` and Evals
`0.3.7+codex.20260910140800`. Frozen model verdicts remain attached to their
actual earlier source/runner identities; they are not relabeled as a new live
qualification of the merged package.

The merged state passed the 41 core smoke tests (348 assertions), source and
installed Prompt Evals catalog validation, and focused execution/interview/
quality regression checks (17 test entries passed, two platform-specific skips).
Variance-runner checks also passed. Direct CLI inspection confirmed the host
isolation feature is available. Seven dependency manifests passed, and all 13
enabled Cascade packages matched source across 578 files, including 379 files
in the eight refreshed packages. Security's source manifest was checked; that
package is not installed on this host. Repository validation and whitespace
checks passed. The merged source commit is `bf3f7d9`.

Research cases execute real prompt authoring with staged, audited knowledge
reads and independent semantic judgment. They do not execute live web/database
retrieval. The code/workflow cases use frozen text packets, not repository
mutations. Native UI trigger discovery, portable-instruction execution, human
judge calibration, variance, monetary cost, and Qwen/Gemma/Kimi/DeepSeek target
execution were not measured by this pilot. No default-model change is justified
by one observation per case.

Local raw contracts, frozen sources, read traces, responses, judgments, failures,
usage, and the derived summary remain under
`.artifacts/concise-search-benchmark-20260910/`; `benchmark-plan.json` and
`repair/repair-plan.json` predeclare the separate cohorts. `summarize.py` reads
these receipts without rewriting them. Word counts use whitespace; recorded
model output tokens are distinct from displayed words. Execution time excludes
queue waiting and judge time; unknown usage is not zero.
The completed derived summary SHA-256 is
`838d8db9db3999c49e7b3c67ee25387d30775bb3ce88b1423b4e23d8c97510e4`.
