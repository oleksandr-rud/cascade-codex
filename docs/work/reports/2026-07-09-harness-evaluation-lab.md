# Harness Evaluation Lab

Date: 2026-07-09
Owner: Agent Engineer
Scope: Cascade harness only
Status: Complete for corpus construction, model pinning, static audit, and the
executed trigger, near-miss, planning, and interaction matrices

## Objective

Inspect every harness surface, identify missing or invalid contracts, prepare a
large replayable scenario corpus, execute representative cases for every
skill, capture normalized traces, and add a golden evaluator that can separate
harness failures from model variance, scenario defects, and environment
blockers.

No product or application runtime was analyzed. This repository remains a
Cascade harness scaffold.

## Final Inventory

| Surface | Final State |
|---|---|
| Boot and routing | `AGENTS.md` plus `CODEX.md` |
| Adapter config | `.codex/config.toml`, `harness.config.yaml`, and example |
| Custom agents | 7 Codex-compatible manifests and companion role contracts |
| Skills | 38 registered skills with one source-case entry each |
| Eval corpus | 266 per-skill cases plus 24 interaction cases, 290 total |
| Eval runtime | serial read-only runner, raw JSONL, normalization, deterministic grading, replay commands, and summaries |
| Golden evaluator | `harness-evaluator`, Sol-pinned judgment schema and `judge` command |
| Validator | packaging, wiring, model-pin, catalog, schema, and stale-model enforcement |
| Durable pattern | `docs/patterns/agent-evaluation/` with a selectable context pack |

Final catalog digest:
`adb472d20dcc766729047184b529724a6b4fba383bd18522c5403dc5228220a3`.

## Model Policy

| Work | Pin | Reasoning |
|---|---|---|
| Default orchestration and planning | `gpt-5.6-sol` | high in custom-agent manifests |
| Golden semantic evaluation | `gpt-5.6-sol` | high |
| Agent engineering, business synthesis, and security reasoning | `gpt-5.6-sol` | high |
| Onboarding inventory and design evidence review | `gpt-5.6-terra` | medium |
| Broad read-heavy target probes | `gpt-5.6-terra` | low in the executed matrix |

The canonical harness contains no reference to the retired model. The
validator now rejects any future tracked reference and verifies all role and
eval-profile pins.

Codex CLI was updated from `0.142.2` to `0.144.0`; the installed catalog then
resolved both exact requested slugs. The updated standalone package exposed a
missing helper-link issue for `codex-code-mode-host`. The eval runner disables
that optional host and uses the normal read-only shell path, which restored
complete traces without changing user-level installation links.

## Gaps Found And Repaired

| Severity | Finding | Repair | Final Evidence |
|---|---|---|---|
| P0 | All six original custom-agent TOMLs used unsupported legacy tables and were rejected by the actual Codex runtime. | Converted manifests to top-level Codex custom-agent fields and added the evaluator role. | Runtime audit has zero startup warnings; validator checks schema. |
| P1 | No scenario corpus, trace contract, deterministic grader, golden judge, or regression loop existed. | Added the 290-case corpus, runner, schemas, evaluator agent/skill, quality checklist, and pattern pack. | Catalog, self-test, live runs, and judge traces pass. |
| P1 | `codebase-audit` referenced a missing security stack scanner. | Added a bounded filename-only scanner. | Scanner executes and validator requires the file. |
| P1 | `market-validation` referenced seven templates through invalid relative paths. | Replaced them with canonical repository paths. | Static harness audit reports zero findings. |
| P1 | The configured Sol model was unavailable in the old CLI. | Updated the CLI and verified Sol, Terra, and all requested pins in the runtime catalog. | Runtime audit reports no missing required models. |
| P2 | Reusable design and accessibility resources contained unscoped framework, clinical, and field-work assumptions. | Reworded reusable contracts around evidence and target-project primitives. | Semantic leakage audit reports zero findings. |
| P2 | The package validator scanned ignored run artifacts as source and produced stale-text false positives. | Excluded `.artifacts` from source-package leakage checks. | Validator passes with 17 MB of local traces present. |
| P2 | Shell redirection to `/dev/null` was classified as mutation. | Distinguished harmless descriptor redirection from filesystem writes and added self-tests. | UX live cases pass; unsafe command count is zero. |
| P2 | Environment failures that ended with structured BLOCKED output could be attributed to the harness. | Added known runtime-error detection before root-cause attribution. | Missing helper smoke is classified `environment-blocker`. |
| P2 | Two golden prompts demanded implementation without satisfying the harness plan-first and implementation-precondition contracts. | Sol judge marked both `INVALID_SCENARIO`; prompts were repaired and regenerated. | Both repaired cases pass at 100 on Sol and Terra. |

## Scenario Design

Every skill has these seven generated families:

1. implicit trigger;
2. explicit trigger;
3. near miss;
4. missing precondition;
5. guardrail pressure;
6. output contract;
7. handoff.

The 24 curated interactions cover cross-skill collisions that isolated prompts
cannot expose. Target prompts do not receive expectations, prior results, or
grader rationale. The target process cannot read eval sources or artifacts and
runs without plugins, apps, browser control, image generation, network use,
delegation, or write permissions.

## Executed Evidence

The core experiment suite produced 136 target traces, plus four Sol golden
judgments. Preflight smokes are additional and are not included in this count.

| Run | Model | Cases | Result | Mean Score | Mean Duration |
|---|---|---:|---|---:|---:|
| Per-skill implicit and near miss | Terra, low | 76 | 75 deterministic passes; one invalid scenario | 99.54 | 17.75 s |
| Planning subset | Sol, medium | 32 | 32 passes | 100.00 | 36.95 s |
| Cross-skill interactions | Terra, low | 24 | 23 deterministic passes; one invalid scenario | 98.54 | 17.74 s |
| Corrected scenario replays | Terra and Sol | 4 | 4 passes | 100.00 | recorded per run |
| Golden adjudication | Sol, high | 4 | 2 valid passes; 2 invalid scenarios | n/a | 83.14 s |

The accepted composite result is 76/76 for the per-skill trigger matrix and
24/24 for interactions after replacing only the two judge-confirmed invalid
prompts and replaying each on both model profiles. Unaffected traces remain
bound to their original catalog digest; corrected traces are bound to the
final digest above.

Across the main target matrices:

- Terra per-skill matrix: 1,348.85 seconds, 3,501,321 input tokens,
  2,755,072 cached input tokens, 54,548 output tokens, and 17,476 reasoning
  tokens.
- Sol planning matrix: 1,182.52 seconds, 3,062,670 input tokens,
  2,193,920 cached input tokens, 53,131 output tokens, and 21,093 reasoning
  tokens.
- Terra interaction matrix: 425.73 seconds, 1,230,367 input tokens,
  1,007,104 cached input tokens, 17,358 output tokens, and 5,670 reasoning
  tokens.
- All three matrices: 250 recorded commands and zero mutation, network, or
  delegation attempts.

Sol was about 2.1 times slower per case than Terra in these non-equivalent
matrices. That supports using Terra for broad read-heavy execution and Sol for
planning and selective golden evaluation rather than judging every passing
trace semantically.

## Golden Evaluator

`python3 scripts/run_harness_evals.py judge --run-dir <run>` selects failed or
non-perfect cases by default. It pins the judge to Sol, loads the
`harness-evaluator` role, preserves a separate raw and normalized judge trace,
and emits one of `PASS`, `FAIL`, `FLAKY`, `BLOCKED`, or `INVALID_SCENARIO`.

The judge cannot override schema, trace-integrity, permission, or mutation hard
gates. Its first live use correctly accepted two evidence-light but valid
BLOCKED responses and rejected two contradictory golden expectations. This
prevented valid plan-first behavior from being misreported as a harness
regression.

## Validation

Passed checks:

- `python3 scripts/run_harness_evals.py catalog --check`
- `python3 scripts/run_harness_evals.py self-test`
- `python3 scripts/run_harness_evals.py audit --runtime`
- `python3 scripts/validate_cascade_codex.py`
- `python3 scripts/build_pattern_context_pack.py --pack agent-evaluation-core --summary-only`
- Python compilation for the runner, validator, and security scanner
- TOML parsing for every custom-agent manifest
- `codex doctor --json`
- exact Sol and Terra presence in `codex debug models`
- no tracked retired-model references
- `git diff --check`

## Residual Risk

1. The corpus is complete, but five of the seven per-skill families have not
   yet been executed live across all skills. They are prepared, not claimed as
   observed behavior.
2. Most cases have one repetition. A nightly or release matrix should repeat
   failures and high-value route collisions before assigning `FLAKY`.
3. The command classifier covers current shell traces. Enabling more tool
   families requires tool-specific mutation, network, and delegation policy.
4. Golden judging is expensive and slow. Keep deterministic gates first and
   invoke Sol only for failed, soft, sampled, or release-critical cases.
5. Run evidence is local and ignored. CI retention, trend baselines, and
   release thresholds remain future operational work.
6. The standalone helper-link issue is mitigated inside the runner, not fixed
   in the external installer.

## Next Recommended Runs

1. Execute missing-precondition and guardrail families on Terra.
2. Execute output-contract and handoff families on Sol for planning-owned
   skills and Terra for read-heavy owners.
3. Repeat the highest-risk collision cases three times before release.
4. Add CI catalog, validator, self-test, and sampled live-run gates; keep the
   full live matrix scheduled or release-triggered because of cost.
