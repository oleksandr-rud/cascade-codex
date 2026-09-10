# Evaluation simplification and installed plugins — 2026-09-10

The evaluator simplification, subsequent Prompt integration, and reliability
repairs are present in remote `master`. This snapshot records source revision
`7b162478752e40402feebe9de1896bfa1fefe2c6` and the installed Cascade packages on
the maintainer's macOS host. Installation was verified separately from Git
publication and model evaluation.

## Published changes and decisions

All six commits below were verified as ancestors of `origin/master`.

| Commit | Published change |
|---|---|
| `b1f4b2e` | Shared outcome UI and Generative UI guidance across the owning plugins. |
| `95e4f7d` | Direct model execution, shared judge validation, compact evaluator context, scoped campaign loading, and optional research scaffolding; 54 changed paths. |
| `7c774a3` | Integrated evaluator simplification with incoming UI guidance; regenerated the two conflicting catalogs from the combined sources. |
| `258d478` | Preserved source-bound Prompt evaluation, context templates, model coverage, and its diagnostic evidence before integration. |
| `6bdfd75` | Combined direct execution with source-bound Prompt coverage and strict replay verification. |
| `7b16247` | Added bounded cross-process model concurrency, interruption evidence, and versioned judge citation repairs. |

The retained implementation decisions are:

- Fresh Prompt phases call bounded execution adapters directly, with literal
  stdin, cancellation, output limits, isolated Codex context, and immutable
  dispatch/results. Historical controller receipts retain their read-only
  verifier. See the [Prompt evaluation contract](../../../.codex/plugins/cascade-evals/skills/prompt-evaluation/evals/README.md).
- Campaigns load their selected dependency graph. Basic starters emit 11 files;
  `--research` expands this to 21 when the claims require it. Existing product
  intake, seed, policy, and evidence gates still apply. See
  [simulation authoring](../../../product-evals/simulations/README.md).
- Mechanical evaluation and judge score validation have shared owners.
  `NOT_APPLICABLE` specialized evaluation creates no empty reserved receipt;
  `REQUIRED` evaluation still checks its independent binding. An empty general
  claim set uses provider `none` and makes no model call.
- General evaluators receive relevant frozen text evidence on stdin. Full
  source archives remain available for integrity verification; automatic
  runtime/template/corpus copies do not expand model context. Explicit task
  inputs remain included. Binary contents cannot support a text-only semantic
  claim. A live evaluator's lease covers its timeout plus 30 seconds for
  persistence. See the [campaign contract](../../../product-evals/campaigns/README.md).
- Current Prompt campaigns share a per-user pool of three model calls, retain
  partial evidence after interruption, and use versioned leaf-line citations.
  Legacy quotation checks and original failed outcomes remain unchanged. The
  [reliability report](2026-09-10-cascade-prompt-evaluation-reliability.md)
  owns the diagnosis, budgets, final pilot, and remaining limits.

The [Prompt evaluation report](2026-09-10-cascade-prompt-evaluation.md) and
[original campaign reconstruction](2026-09-10-cascade-prompt-original-analysis.md)
retain the wider coverage findings. This record does not replace their
rejections, interrupted denominators, or frozen subject identities.

## Installed package snapshot

The configured local `cascade-project` marketplace now reads the worktree at
the recorded source revision. Eleven outdated plugins were initially updated
at `6bdfd75`. After `7b16247` arrived, Evals was updated again and seven dependent
packages were refreshed because their evaluation manifests changed without a
package version change. Native `codex plugin add` performed each installation.

All 14 Cascade plugins are enabled. SHA-256 comparisons verified the complete
relative file sets and all **610 package files** against current source,
excluding Python bytecode and pytest caches. All 15 unrelated installed plugin
entries and their enabled states were preserved.

| Plugin | Installed version |
|---|---|
| cascade-ai-architect | `0.1.2+codex.20260909141641` |
| cascade-coding-agent | `0.2.1+codex.20260908133706` |
| cascade-coordinator | `0.1.0+codex.20260908124959` |
| cascade-design | `0.1.1+codex.20260909181000` |
| cascade-evals | `0.3.3+codex.20260910094144` |
| cascade-market | `0.2.0+codex.20260909141644` |
| cascade-personas | `0.1.20+codex.20260909140051` |
| cascade-product | `0.1.24+codex.20260909141642` |
| cascade-project-management | `0.1.0+codex.20260909140054` |
| cascade-prompt | `0.7.1+codex.20260909222626` |
| cascade-qa | `0.1.0+codex.20260909140053` |
| cascade-security | `0.1.0+codex.20260909141647` |
| cascade-simulations | `0.2.4+codex.20260909081821` |
| cascade-software-architect | `0.1.3+codex.20260909141641` |

## Verification and evidence boundaries

| Subject | Evidence and result |
|---|---|
| Recorded source and installation | Repository validator PASS; 14 enabled packages and 610 files match source; published commit ancestry verified. |
| Simplification integrated at `7c774a3`, macOS | PASS: 40 runtime smoke tests, 14 simplification tests, four evaluation-input tests, and 31 harness self-test cases. These results precede the later Prompt runtime changes. |
| September 9 live canaries | PASS for final invoice, installed-plugin interview, and general-evaluator scenarios using Sol/Luna with max reasoning. The general evaluator was live; its target was a deterministic fixture. |
| Later Prompt integration and reliability pilots | Evidence remains in the linked reports. Their successful bounded pilots do not erase wider Prompt quality findings or the reported Windows permission failures. |
| Model execution for this installation/documentation update | NOT_RUN; installation parity is not a fresh model execution or a full campaign result. |

The September 9 canaries observed these input-token changes:

| Phase | Before | After |
|---|---:|---:|
| Prompt builder | 174,542 | 39,002 |
| Target | 22,812 | 9,972 |
| General evaluator | 192,020 | 29,873 |

These are scoped observations, not guaranteed provider savings or current
benchmarks. Builder noncached input remained **28,122 against a 25,000-token
budget**. An earlier 300-second attempt timed out; a separate confirmation
completed in 247,986 ms with a 600-second limit. Broad stability, human judge
calibration, production behavior, physical-device proof, and release eligibility
were not established by these canaries.

Their local summary is
`.artifacts/plugin-model-validation/20260909T081821Z/results.json`, SHA-256
`df2d4c1e8e7894fe86ea579a5e6657355cb6d6d92ab27299a68492a3c870081f`.
It records the pre-commit dirty source identity and original run paths. Raw
success, failure, timeout, and blocked evidence stays in ignored `.artifacts/`
directories and is unavailable from a fresh clone. No historical result was
regraded during installation or documentation.

Five legacy `agent/w003-wl07-r5-cg1` through `agent/w003-wl11-r5-cg1` branch
tips dated 2026-07-23 remain outside `master` ancestry. They were not merged or
deleted as part of this work.
