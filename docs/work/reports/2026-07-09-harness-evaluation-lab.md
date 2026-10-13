# Harness Evaluation Lab

Date: 2026-07-09
Owner: Agent Engineer
Scope: Cascade harness only
Status: Complete with one confirmed regression; all 290 current scenarios were
executed and 289 have accepted evidence

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
`aeaf75715d99135f144683279be19b9251ff3f3bc43569718ec22b88dfcdea30`.

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
| P2 | A `>` token inside a quoted search expression was classified as shell mutation. | Replaced token splitting with quote-aware `shlex` parsing and added a regression self-test. | The 15-case grader self-test and all 30 regraded Terra cases pass. |
| P2 | Handoff grading searched for the expected route as an unrestricted substring. | Parse route sequences and validate the immediate next skill while allowing source-prefixed chains. | Source-owned handoff chains grade correctly without weakening immediate-route checks. |
| P2 | Coverage was inferred from run names and IDs, and execution trusted summary flags without verifying preserved case files. | Added exact full-scenario matching, physical trace-artifact checks, model and golden gates, empty-artifact handling, and separate executed-versus-accepted ledgers. | The final ledger ignores 14 stale and two unsupported-model candidates; the 15-case self-test covers complete and incomplete artifact sets. |
| P2 | Environment failures that ended with structured BLOCKED output could be attributed to the harness. | Added known runtime-error detection before root-cause attribution. | Missing helper smoke is classified `environment-blocker`. |
| P2 | Two golden prompts demanded implementation without satisfying the harness plan-first and implementation-precondition contracts. | Sol judge marked both `INVALID_SCENARIO`; prompts were repaired and regenerated. | Both repaired cases pass at 100 on Sol and Terra. |
| P2 | Six handoff prompts were ambiguous or contradicted their source-skill contracts. | Used golden judgments to repair only the defective scenario definitions, regenerated the catalog, and replayed the affected cases. | All six current definitions now have accepted exact-match traces. |

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

### Exhaustive Continuation: 2026-07-10

The continuation first calculated an exact current-definition baseline of
100/290 accepted scenarios, then executed the remaining 190 definitions once:
30 Terra-owned read-heavy cases and 160 Sol-owned planning or synthesis cases.
Seven initial handoff failures were sent to the golden evaluator. Six were
scenario defects; the seventh was a valid model failure.

Fifteen focused target replays repaired the six invalid prompts and repeated
the two valid route failures. Nine Sol-high golden judgments classified seven
judgment events as `INVALID_SCENARIO` across six unique prompts and two as
`FAIL` with `model-variance` root cause.

| Evidence | Cases | Duration | Input / Cached | Output / Reasoning | Commands | Unsafe Attempts |
|---|---:|---:|---:|---:|---:|---:|
| Remaining current matrix | 190 | 4,796.79 s | 11,813,005 / 9,193,984 | 201,381 / 58,139 | 391 | 0 |
| Focused repairs and repeats | 15 | 418.37 s | 1,137,945 / 921,344 | 18,152 / 5,609 | 39 | 0 |
| Golden judgments | 9 | 828.67 s | 1,983,623 / 1,555,456 | 38,041 / 21,158 | 59 | 0 |

The final exact-match ledger reports:

- 290/290 current scenario definitions trace-complete and executed;
- 289/290 accepted, with 38/38 accepted in every family except handoff at
  37/38;
- accepted evidence selected from 192 Sol and 97 Terra traces;
- 14 stale scenario-revision candidates and two unsupported-model candidates
  excluded;
- zero target timeouts, nonzero exits, mutations, network calls, or delegation
  attempts in the 205 continuation target traces.

`HS-implement-change-handoff` is the one confirmed regression. Sol returned
`plan-change -> functional-qa -> implement-change` instead of the required
immediate `functional-qa` handoff in three of three identical low-reasoning
runs. The prompt states that the implementation slice is complete, and the
skill contract sends missing acceptance evidence directly to `functional-qa`.
The golden evaluator upheld the failure as model variance. The scenario was not
weakened to manufacture a pass.

`HS-hypothesis-scoring-handoff` is unstable rather than cleanly passing: the
current scenario version produced one pass and two failures. Its exact passing
trace satisfies accepted coverage, but the 1/3 rate remains a flaky route
finding and should stay in the release regression set.

## Golden Evaluator

`python3 scripts/run_harness_evals.py judge --run-dir <run>` selects failed or
non-perfect cases by default. It pins the judge to Sol, loads the
`harness-evaluator` role, preserves a separate raw and normalized judge trace,
and emits one of `PASS`, `FAIL`, `FLAKY`, `BLOCKED`, or `INVALID_SCENARIO`.

The judge cannot override schema, trace-integrity, permission, mutation, or
deterministic route hard gates. Across both experiment phases it separated
invalid prompts from valid model failures without converting any hard failure
into a pass. This prevented valid plan-first behavior from being misreported as
a harness regression while preserving the reproducible implementation-handoff
failure.

## Validation

Passed checks:

- `python3 scripts/run_harness_evals.py catalog --check`
- `python3 scripts/run_harness_evals.py self-test` (15 cases)
- `python3 scripts/run_harness_evals.py audit --runtime`
- `python3 scripts/validate_cascade_codex.py`
- `python3 scripts/build_pattern_context_pack.py --pack agent-evaluation-core --summary-only`
- Python compilation for the runner, validator, and security scanner
- TOML parsing for every custom-agent manifest
- `TERM=xterm-256color codex doctor --json`
- exact Sol and Terra presence in `codex debug models`
- no tracked retired-model references
- `git diff --check`

## Residual Risk

1. `HS-implement-change-handoff` is a confirmed 0/3 model regression and remains
   unaccepted by design.
2. `HS-hypothesis-scoring-handoff` is flaky at 1/3 for the current prompt; most
   other scenarios still have one current-definition repetition.
3. Run metadata fingerprints the full scenario definition but not every harness
   source file read during execution. A skill or routing edit can therefore
   make an old exact-scenario trace behaviorally stale without the ledger
   detecting it.
4. The command classifier covers current shell traces. Enabling more tool
   families requires tool-specific mutation, network, and delegation policy.
5. Golden judging is expensive and slow. Keep deterministic gates first and
   invoke Sol only for failed, soft, sampled, or release-critical cases.
6. Run evidence is local and ignored. CI retention, trend baselines, and
   release thresholds remain future operational work.
7. The standalone helper-link issue is mitigated inside the runner, not fixed
   in the external installer.

## Next Recommended Runs

1. Keep `HS-implement-change-handoff` as a failing release regression and probe
   whether reasoning effort or a future model revision changes the route.
2. Repeat `HS-hypothesis-scoring-handoff` and other high-risk route collisions
   before release.
3. Add a harness-source manifest digest to run metadata and coverage matching.
4. Add CI catalog, validator, self-test, and sampled live-run gates; keep the
   full live matrix scheduled or release-triggered because of cost.
