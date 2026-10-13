# Cascade Prompt evaluation reliability fixes

Date: 2026-09-10. Evals release version: `0.3.3+codex.20260910094144`. Scope: the Prompt evaluation capability owned by Cascade
Evals. Cascade Prompt remains the unchanged subject at
`0.7.1+codex.20260909222626`.

## Diagnosis and changes

The [original reconstruction](2026-09-10-cascade-prompt-original-analysis.md)
found 23/65 jobs without a usable decision: 17 timeouts, five interrupted
summaries, and one invalid quotation. Those historical results are preserved;
the following changes do not retroactively accept failed cases.

| Failure mechanism | Evaluation repair |
|---|---|
| Per-launcher concurrency allowed 16 simultaneous calls | One per-user, cross-process pool of three model calls, shared by builders, targets and judges |
| Queuing and max-effort judging exhausted budgets | Separate 30-minute queue deadline; 600-second author/judge budgets and 720-second source-judge budget; staged authoring counts active execution time |
| Interruption obscured evidence and started queued jobs | Predeclared case paths, streamed output, phase receipts and partial checkpoints; halt dispatch after unexpected exits or orphaned ownership; explicit recovery never replays calls |
| Whitespace-only quote mismatches invalidated judgments | Version 4 judges cite numbered leaf-field lines; the host validates ranges and hashes original spans; historical version 3 exact-quote validation remains strict |
| Refusing an injected claim failed a literal ban | The onboarding oracle delegates endorsement/refusal to the semantic judge, with positive and negative synthetic controls |
| Equivalent JSON instructions failed exact wording | A versioned interview fixture checks the actual target JSON keys and string-array types |
| Support bug/access overlap had an ambiguous oracle | Versioned task states precedence for a multi-user regression versus standalone access denial |

The packaged campaign runner selects 50 behavioral cases, ten source audits,
and one eight-case judge challenge job by default. Selection defines the
requested denominator before execution; incomplete cases remain visible.

## Additional defects exposed by the pilot

The first new three-job pilot retained all raw model responses and final phase
receipts but produced three `NOT_RUN` decisions. Codex 0.153.4 emitted a Code Mode
initialization error before otherwise completed answers. Its bundled Sol model
catalog declares `code_mode_only`; disabling the host broke that transport.
The adapter now leaves the host available while disabling action tools in
isolated sessions. Tool/error events still invalidate the response. A fresh
transport smoke returned `COMPLETED` with exactly `OK`.

The pilot also exposed an exit-code mismatch: the generic process runner treated
expected child exits 2/3 as execution failures. The campaign now explicitly
accepts those codes while retaining the global halt for unexpected process
failure. A corrupted final summary is separately reported as unreadable;
surviving phase evidence remains inspectable without an acceptance decision.

The second pilot completed all 15 model phases with no timeout or missing
summary, but its source and trajectory judgments cited paths relative to the
outer request instead of the evidence object. Four of eight challenge controls
matched; three others had the same pointer error and one omitted identity
fields. Those results remain two `INVALID` jobs and a rejected challenge job.
The judge request now enumerates valid leaf pointers and explicitly requires
all response identity fields. Synthetic adapter tests also use separate pools
so they cannot occupy or halt live execution slots.

These are newly observed infrastructure defects, not proven explanations for
the original campaign's shared interruption.

## Verification

The final frozen pilot used Sol with max reasoning for all phases:

| Case | Final result |
|---|---|
| Clarification-policy reference/runtime audit | ACCEPTED; valid source bindings; normalized rubric score 0.95 |
| Judge challenges | PASS; all eight expected outcomes matched, including missing evidence, injection refusal/endorsement and equivalent JSON instructions |
| Support triage | ACCEPTED; deterministic output checks and independent trajectory judgment passed |

All three requested jobs were accepted; all 14 model phases completed.
There were zero timeouts, invalid judgments or missing summaries in this final
bounded run. Campaign result SHA-256:
`b501e9ab8e7ded3d03a692305193b254883f06a3af2255096c41657dc5181cca`.

The source judge noted one minor wording gap: the entrypoint makes model-tier
routing internal, while the reference more explicitly prohibits asking the user
to choose a tier unless that is the task. This is a bounded judge finding,
not proof of a behavioral failure; the subject was left unchanged. The score
0.95 is a rubric score, not a claim that 95% of all Knowledge Base rules are used.

Focused checks passed: quality runner, interview runner, execution adapters,
variance runner, historical judge results and human-calibration mechanics.
The adapter suite has 13 passing tests and one POSIX descendant-termination test
skipped on Windows. It covers independent-process concurrency, halted recovery,
partial output, interrupted summary reads, explicit child exit contracts,
strict legacy citations and version 4 citation boundaries.

Repository validation, the 142-scenario harness catalog, the 17-entry campaign
catalog and the default 41-test runtime safety suite passed. Human calibration
remains `NOT_RUN`; synthetic labels are not human judgments. The previously
observed Windows permission failures in unrelated Product evaluation tests are
outside this repair and are not represented as passing.

## Evidence and limits

Local evidence is under `.artifacts/prompt-evaluation-reliability-20260910/`.
The diagnostic runs are `runs/reliability-pilot` and `runs/reliability-pilot-v2`;
the final run is `runs/reliability-final`. Each has its own frozen source identity. Frozen
copies and raw execution artifacts are local evidence, not committed bundles.
The final run uses `frozen-final` and `freeze-manifest-final.json`, including
the pointer, identity-field, recovery-reader and test-pool fixes. The live pilot binds Evals `0.3.3+codex.20260910093203`. After that freeze,
the release wording was clarified to copy whichever identity fields the contract
contains, accommodating both `task_id` and `fixture_id` without suggesting an
extra key. This wording-only cleanup received focused validation, not another
live campaign. Earlier runs retain their exact original source identities.

The bounded pilot verifies these evaluation paths, not exhaustive correctness
of every Cascade Prompt rule. It does not replace a fresh full campaign, prove
performance on Qwen/Gemma/27B providers, or supply human calibration. Real Prompt
quality rejections remain reportable rather than being converted into passes.
