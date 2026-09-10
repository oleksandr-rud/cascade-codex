# Astra plugin and independent-judge pilot

Decision: Astra/high is the preferred candidate for a broader prompt-judge
pilot. This experiment does not justify moving every plugin or production
judge. Keep the existing domain Sol/high and evaluation Sol/max defaults;
Prompt authoring and the primary host retain Astra/high.

Subsequent user decision (2026-09-10): adopt Astra/high for all Cascade plugin
recommendations, custom agents and new evaluation/judge defaults. That explicit
selection supersedes the default-retention recommendation above; the measured
results, historical run settings and cross-domain evidence limits remain unchanged.

## Measured judge results

On 2026-09-10, each configuration judged the same eight frozen
`challenges-v2.json` cases twice using `interview-v4.json`: 48 live calls.
The cases include three correct responses, four failures covering injection,
unauthorized effects, unsupported claims and output-contract violations, and
one absent-response case. Labels are synthetic, not human calibration.

| Judge | Label agreement | False passes | Median execution | Reported output tokens |
|---|---:|---:|---:|---:|
| Sol/max | 16/16 | 0 | 51.16 s | 22,133 |
| Astra/high | 16/16 | 0 | 29.61 s | 12,303 |
| Astra/max | 16/16 | 0 | 65.40 s | 29,396 |

All 48 responses were valid; every configuration preserved all eight verdicts
across repetitions and correctly returned BLOCKED twice for absent evidence.
Astra/high had about 42% lower median latency than Sol/max in this sample.
Astra/max produced no accuracy gain here. Latencies exclude queue waits;
token totals include reported reasoning and are not billed cost estimates.
Different caching and a small, easy corpus limit generalization.

Judges received isolated, tool-free contexts with the same rubric and evidence,
without expected labels, acceptance thresholds, weights or peer judgments.
The host validated references and reduced ratings. Independence means separate
blind evidence and execution; a different model family is not required,
although separate contexts do not eliminate shared-model bias.

## Other plugins

Audited all 14 source plugin recommendations. Prepared Astra/high and Astra/max
evaluation bindings for Design (19 cases), Market (20), Personas (15), Product
(16), Project Management (12), QA (12), and Security (9): 103 cases represented
by 14 successful configuration preflights. These were **NOT_RUN for target
quality**, and Security remains source-only. The other plugins have separate
or missing equivalent domain evaluation packs.

Three migration constraints remain:

- The [generic runner](../../../.codex/plugins/cascade-evals/scripts/run_agent_evaluation.py)
  currently requires builder, target and judge to share one model and effort.
  A controlled target comparison needs separate phase bindings and a fixed
  judge; otherwise subject and measurement change together.
- Its [execution contract](../../../.codex/plugins/cascade-evals/skills/evaluate/references/agent-runner.md)
  requires macOS filesystem read isolation, unavailable on this Windows host.
  Preflight success does not establish execution isolation or quality.
- Coordinator's own selector/planner schemas still bind Sol. Design, Project
  Management, QA and Security release validators also enforce their frozen
  Sol/max policies. Promotion requires consistent versioned updates, domain
  runs, and judge calibration with reviewed labels.

## Delivered and verified

Evals `0.3.11+codex.20260910150255` adds explicit `--judge-model` and
`--judge-reasoning-effort` comparison options to the existing challenge runner,
with unchanged Sol/max defaults and receipt-bound configuration. Existing
adapter coverage now checks defaults, Astra overrides and invalid arguments
without dispatching models. Seven dependent source packages received refreshed
version pins; six installed dependents and Evals were refreshed.

Validation: repository validator PASS; core tests 41 PASS; adapter tests
15 PASS with two Windows platform skips; runtime bundle PASS; seven package
checks PASS; installed Prompt/Evals catalog validation PASS. All 580 files
across 13 enabled installed Cascade plugins match source.

Evidence lives under `.artifacts/astra-plugin-judge-pilot-20260910/`, including
the frozen contract, six immutable runs, aggregate results and domain
preflights. The 120-file snapshot was based on `5a3b4a2`; every prompt,
response and receipt digest was rechecked. Release differs from that snapshot
only in an unsupported-model test literal, not executed runner behavior.
Runtime: Codex CLI 0.153.4, Node 24.18.0, Windows; remote model revisions were
unavailable beyond the recorded aliases.

Frozen SHA-256 identities:

- Profile: `a69f4217503ad0c270deb94fbfdfdae82fb23b8bcd185dbd963a8fbfffc2875d`
- Cases: `d122ab6c3543b2d922f49de7e433a32f2e9bb6e90415515727f3e8a02a67f4b3`
- Runner bundle: `28080c2c58c93e27b009eac04e8b98655c68a14c005bb65433eb415daebb92ba`
