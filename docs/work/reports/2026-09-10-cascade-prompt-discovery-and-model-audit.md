# Cascade Prompt discovery, evaluation, and model audit

Audit date: 2026-09-10. Task Envelope: `TE-e5a198a0ff571bdd`.
Repository baseline: `bf40c485a8d89be0281733d1299d6c70c3ec631c`, including the
latest master documentation update fetched during this audit. Results describe
the Windows Codex host; machine-specific paths remain in local evidence.

The material inventory is complete, and the dedicated Astra, Qwen 27B, and Gemma
authoring cases work. Evaluation bookkeeping and installed-package resolution
had real defects. They are repaired. Native discovery still has recoverable
path errors and output-format deviations, and some prompts ask unnecessary
questions. This audit does not establish exhaustive model compliance.

**Evidence and versions.** Raw evidence remains under the ignored local
`.artifacts/prompt-discovery-audit-20260910/` directory. Original responses,
rejections, receipts, and campaign output were preserved. The report records
durable conclusions; it does not embed the full model transcripts.

| Surface | Prompt version | Evals version | Purpose |
|---|---|---|---|
| Original frozen campaign | `0.7.1+codex.20260909222626` | `0.3.3+codex.20260910094144` | 24 conditional-loading and boundary fixtures |
| Mapping canary | Original Prompt | `0.3.4+codex.20260910100455` | Verify declared child run identity |
| Native Evals repair probe | Original Prompt | `0.3.4+codex.20260910102042` | Repeat the identical natural design request |
| Prompt repair campaigns and native Prompt probe | `0.7.2+codex.20260910102749` | `0.3.4+codex.20260910102749` | Five context cases plus a missing-schema control |
| Final source and installed packages | `0.7.2+codex.20260910102749` | `0.3.4+codex.20260910110331` | Includes obsolete-flag rejection, corrected example, and Quick fixture metadata |

The final Evals-only edits do not change the repaired Prompt bytes. Live results
remain attached to their actual runner versions; they are not relabeled as
executions of the final Evals release. The final flag behavior has a focused
runner regression check. The Quick fixture's metadata changed from version 1 /
Advanced to version 2 / Quick; its request and acceptance rules were retained.

**Materials, triggers, and search.** Source/cache inspection found 35 Prompt
files and 118 Evals files. All 30 knowledge-inventory files exist and have
current declared hashes: 15 runtime files, 11 references, the entrypoint, and
three templates. The 18 model-index entries match the detailed model registry.
All 38 Prompt Markdown links and two Evals Markdown links resolve without
escaping the package. A separate scan checked 20 explicit local file references
across all six Evals entrypoints, including inline paths and command examples.
All exist. These counts use different reference syntaxes and are not duplicate
behavioral coverage counts.

The coverage contract maps 59 rule groups to 50 cases: 36 interviews and 14
quality tasks. This run executes the 24 conditional-loading interviews. The
source-to-runtime relationship is explicit, but the ten full semantic reference
audits and all 50 behavioral cases were not rerun. Some Advanced fixtures do
not independently require an intake-read assertion. File presence, mapped
consumers, observed reads, and semantic use are separate evidence levels.

Prompt has no separate search service: its entrypoint routes to local runtime
packs and `model-index.yaml`, then the host reads or searches those files. The
native probes actually exercised those host reads and `rg` searches. Catalog
compression diagnostics were present; they are not proof of a routing failure.
The three existing context templates cover grounded answers, structured
extraction, and tool-using agents. No duplicate template was added.

**Original campaign and the inflated missing count.**

All 24 child evaluations finished: **18 ACCEPTED, 6 REJECTED**, with all
87 model phases COMPLETED and **127/127 declared read checks passing**. There
were no orphaned or unbound results. Nevertheless, the original aggregate
reported PARTIAL with **24 NOT_RUN** because it could not find the child
summaries at their declared paths. Verified reconciliation recovered the real
outcomes; none of those 24 summary entries represented an unexecuted child.

The campaign supplied `--run-id`, but the original interview runner ignored it
and created a timestamp-named directory. The campaign then looked in the
declared directory and could not find the completed child summary. This is a
controller-to-child identity defect, not evidence that the knowledge files were
missing or that every model call failed.

`reconcile.mjs` explicitly verifies the frozen subject, fixture, runner bundle,
profile, requested run ID, child acknowledgment, response, execution receipts,
and raw-stream hashes before associating a historical child. It rejects
ambiguous, orphaned, or unbound evidence. `reconciled-results.json` is a separate
immutable result; the original campaign artifacts are unchanged. The repaired
runner uses the supplied safe run ID and refuses collisions or traversal. Its
one-case live campaign completed with 1/1 ACCEPTED at the declared child path.

All seven specific-model cases were ACCEPTED: Astra, Qwen 3.8/3.6/3.5 27B,
Gemma 3 27B, Gemma 4 31B, and Mistral Small 3.2 24B. Astra's judge score was
0.9625; the other six scored 1. Their 35 declared required/forbidden read checks
passed. Unknown-model handling, grounded/extraction templates, stateful contract
boundaries, knowledge-audit honesty, negative loading, explicit efficient tier,
current research with absent sources, and bounded high-stakes classification
also passed in the original run. The bounded document tool workflow was
ACCEPTED with judge score 0.9625.

| Fixture | Original outcome and cause | Fresh repair outcome |
|---|---|---|
| `agent-context-template-v1` | REJECTED: asked whether a retry may exceed the explicit total tool-call cap | ACCEPTED, judge 1 |
| `long-context-joins-v1` | REJECTED: requested a freshness threshold despite being able to report uncertainty | ACCEPTED, judge 1 |
| `multimodal-missing-v1` | REJECTED: requested alignment policy despite a conservative evidence-only fallback | ACCEPTED, judge 1 |
| `comparison-unknown-v1` | REJECTED: requested further eligibility/evidence choices instead of preserving unresolved values | ACCEPTED, judge 1 |
| `realtime-staleness-v1` | REJECTED: requested optional precedence/ordering choices | ACCEPTED, judge 1 |
| `multimodal-creative-brief-v1` | REJECTED: asked three questions about objective, channels, and image subsets while offering usable conservative defaults | NOT_RUN on the repaired Prompt; remains an open observed failure |
| `missing-structured-schema-v1` control | Already rejected in the earlier original-analysis report; outside this 24-case campaign | REJECTED: three questions exceed the two-question limit; required schema clarification and second-turn READY response were correct |

Original rejections above failed mechanical readiness/question gates, so judges
were correctly skipped. They were not semantic judge rejections or failed file
reads. The missing-schema control retains its failure: optional normalization
and source-excerpt preferences caused the extra question. The fixture limit was
not relaxed. Five targeted repair repetitions do not qualify every other case
on the new Prompt revision.

The two repair campaigns are complete: **5/5 targeted context failures became
ACCEPTED**, each with judge score 1; the separate missing-schema control
remained REJECTED. This is a six-case repair/control result, not a replacement
24-case pass rate. The creative-brief failure was not retested. Including the
one-case mapping canary, all seven added evaluations finished and were found
at their declared result paths.

Authoring and judging used `gpt-5.6-sol` / `max`, with independent judge contexts
and the unchanged v4 rubric. Model execution shared the existing per-user
three-slot pool. These are staged, tool-free authoring evaluations, not real
Qwen/Gemma target executions. Target execution is NOT_RUN. Token budgets remain
provisional; several cumulative staged-input measurements exceeded their
diagnostic budget. No cost or latency acceptance is claimed.

**Native installed-plugin discovery.** Six fresh, read-only Codex diagnostics
separately exercised installed skills. They did not expose evaluation gold
files. They test routing and observable reads, not the isolated evaluation
grade. Queue time is separate from active execution time.

| Probe | Completion | Active seconds | Queue seconds | Observation |
|---|---|---:|---:|---|
| Original implicit Prompt | COMPLETED | 321.721 | 71.522 | Selected Prompt, model index, Qwen adapter, tier, overlay, and extraction context; skipped required Advanced intake read |
| Updated implicit Prompt, identical request | COMPLETED | 299.034 | 170.182 | Recovered four wrong paths, then read intake and the other required packs; final heading still deviated |
| Original implicit Evals | TIMED_OUT | 600.045 | 0.001 | Correct evaluate → prompt-evaluation selection; 11 successful reads/searches, 50,636 captured tool-output characters, no final response |
| Original Evals, separate bounded request | COMPLETED | 153.211 | 309.240 | Two entrypoint reads and a concise deterministic evaluation design |
| Updated implicit Evals, original request | COMPLETED | 490.834 | 48.309 | Eight reads/searches, 33,473 characters; completed a design with unresolved semantics identified and execution honestly NOT_RUN |
| Direct extraction negative control | COMPLETED | 9.093 | 0 | Returned exactly `{"name":"Ada"}`; no skill/tool invocation |

The identical original/updated Evals request has SHA-256
`d30e162068366cb016cce23409fa247e0515fd48795827775f27a32fb9ff0d20`.
The identical original/updated Prompt request has SHA-256
`e47e978727f21056a06ad6a781c5c9a91814929b9237d5f5c74eacbdf363863a`.
One Evals before/after pair supports a completion observation, not a causal
latency guarantee or a general timeout-rate estimate.

The updated Prompt initially tried four paths under the package-level
`runtime/` directory. The actual files are under `skills/prompt/runtime/`.
All four failed reads were followed by successful corrected reads in the same
installed package. Its initial SKILL read returned exit 0 with no captured
output; the file itself was present, 11,799 bytes, and matched source. The empty
capture is an evidence limitation with no established cause, not an empty-file
finding. Both native Prompt responses used `Reusable prompt` instead of the
canonical `Final Prompt` heading. The staged harness's passing heading checks
therefore do not prove normal authoring-format conformance.

**Implemented repairs.**

- Honor and validate interview run IDs; preserve existing output directories.
- Resolve the exact enabled installed cache version, rather than the inventory's
  mutable checkout `source.path`; reject missing cache versions, unsafe identity
  components, path escapes, and absolute manifest skill roots. Intentional
  checkout evaluation retains the explicit `--subject-skill-root` override.
- Emit portable POSIX relative artifact paths from the Python agent runner and
  blind-packet builder. Windows junctions exercise the existing escape test
  without requiring symlink privileges.
- Reject the obsolete `--installed-plugin` flag before dispatch. It never
  enabled native discovery, so the example and guidance now use the actual
  installed-subject default and distinguish native discovery probes.
- Make Evals design-only loading proportional: execution schemas and model
  policy are required when their execution/configuration work is needed, while
  the evaluation design contract remains operative. Correct the false claim
  that default installed-subject discovery needs no Python.
- Clarify that Advanced Prompt mode requires relevant reading without forcing
  an interview. Apply total tool limits literally, preserve unknown freshness,
  and use disclosed safe defaults when they satisfy the hard requirements.
- Refresh source hashes, generated capability metadata, and seven peer
  evaluation manifests. Update the six already-installed dependent packages.
  Their old Evals 0.2.1 pins no longer matched the enabled Evals package.

Final local source/cache parity is 379/379 files across Prompt, Evals, Design,
Market, Personas, Product, Project Management, and QA. All 144 dependency
bindings across the six dependent installed evaluation packs verify. Security's
source manifest was refreshed, but Security was not newly installed. These are
Windows observations, separate from the macOS installation report on master.
A representative Design agent-evaluation preflight passed subject/dependency
binding and returned NOT_RUN without dispatch. Its intermediate Evals version
was `0.3.4+codex.20260910110027`; final dependency verification was repeated after
the final documentation-only release change.

**Model-specific support.**

| Requested family/checkpoint | Local authoring rules | Execution coverage |
|---|---|---|
| Astra, `gpt-6-astra` | `model-astra.md`; distinguishes Codex host limits/settings from the API | Authoring case accepted; a Sol-to-Astra configuration exists, but its target tasks were not rerun here |
| Qwen 27B | `model-qwen.md`; exact Qwen 3.8, 3.6, and 3.5 entries with version-specific thinking/history and sampling rules | All three authoring cases accepted; no configured live Qwen target |
| Gemma 27B | Gemma 3 `google/gemma-3-27b-it` in `model-open-weight.md`; user/model role handling | Authoring case accepted; no configured live Gemma target |
| Newer Gemma | Separate Gemma 4 `google/gemma-4-31B-it` entry with native system-role handling; this checkpoint is 31B | Authoring case accepted; no live target run |
| Kimi | No family adapter, registry entry, or dedicated fixture | NOT_CONFIGURED / NOT_RUN |
| DeepSeek | No family adapter, registry entry, or dedicated fixture | NOT_CONFIGURED / NOT_RUN |
| “Dela” | No local match; exact model name remains unresolved | NOT_CONFIGURED / NOT_RUN |

Current official model documentation was checked on the audit date. Qwen 3.8's
27B card supports distinct local-template and cloud parameters and preservation
of thinking history. [Qwen model card](https://huggingface.co/Qwen/Qwen3.8-27B).
Gemma 3's user/model convention must not be applied to the newer Gemma 4 system
role: [Gemma 3 card](https://huggingface.co/google/gemma-3-27b-it),
[Gemma 3 prompt structure](https://ai.google.dev/gemma/docs/core/prompt-structure),
[Gemma 4 31B card](https://huggingface.co/google/gemma-4-31B-it).
Astra's API settings are a separate surface from the installed Codex host:
[Astra API model documentation](https://developers.openai.com/api/docs/models/gpt-6-astra).
Kimi and DeepSeek have official model documentation, but that does not add
support to this plugin: [Kimi K3 card](https://huggingface.co/moonshotai/Kimi-K3),
[DeepSeek documentation](https://api-docs.deepseek.com/).

Generic model tiers remain usable when the exact checkpoint is unknown; they
are not a substitute for checkpoint-specific role, template, thinking, and
sampling rules. `command-json-v1` supplies an external adapter protocol, not
configured or tested provider endpoints. Adding Kimi/DeepSeek requires exact
checkpoint and serving-surface contracts, then authoring fixtures and real
target configurations if execution support is claimed.

**Validation and remaining limits.**

| Check | Evidence |
|---|---|
| Evals Python tests | 52/52 PASS; initial 46/50 result retained, including the four Windows/path failures subsequently repaired |
| Six JavaScript runner suites | PASS: execution adapters, human-calibration mechanics, interview runner, judge results, quality runner, variance runner |
| Latest interview-runner changes | Focused suite rerun PASS, including supplied run ID, collision/traversal rejection, and obsolete discovery-flag rejection |
| Prompt evaluation catalog | PASS: 14 tasks, 36 interviews, four tiers, eight configurations, four judge profiles |
| Runtime smoke suite | 41/41 PASS, 328 assertions; core runtime unchanged afterward |
| Generated catalogs | Capability, harness-evaluation, and campaign catalogs regenerated consistently |
| Repository validator and final diff | PASS after removing a machine-specific checkout path from this portable report; initial diagnostic retained in local evidence |
| Installed package/dependency integrity | 379 files without drift; 144 dependency bindings PASS |

The execution-adapter suite has one explicitly skipped POSIX descendant-process
termination check on Windows. The generic live agent-evaluation adapter requires
macOS sandbox read-denial; Windows Python tests and preflight do not qualify that
live surface. Isolation was not weakened to make it run here.

Remaining work is specific: eliminate optional clarification in complete
creative briefs and the missing-schema control; make native relative-path
resolution and final response format reliable; add grounded Kimi/DeepSeek
support if those checkpoints are selected; and qualify actual external target
endpoints. Full source semantic audits, repeated stochastic evaluation, human
judge calibration, and all-model live execution remain NOT_RUN for this audit.
Historical source-audit and judge-challenge receipts in earlier reports retain
their own versions and do not qualify the changed Prompt automatically.
