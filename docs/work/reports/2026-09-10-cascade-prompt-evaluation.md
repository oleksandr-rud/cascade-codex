# Cascade Prompt evaluation — 2026-09-10

The evaluation infrastructure is implemented and exercised. The claim that all
Cascade Prompt knowledge is applied correctly is **not established**. The final
source audit accepted three groups, rejected three, and produced four invalid
judge responses. Behavioral failures and interrupted runs remain visible.

## Scope and evidence

The suite covers 50 base cases (36 interviews and 14 quality tasks), 59 rule
groups, all 18 routing cases, and a closed inventory of 30 files: 26 reference
and runtime files, the skill entrypoint, and three context templates. Ten source
audits compare reference requirements with their actual runtime consumers.

Four independent judge profiles assess outcomes, execution trajectories,
interviews, and knowledge coverage. Judges receive blinded profiles and must
provide exact source quotations with evidence pointers. Host validation owns
thresholds and acceptance; malformed evidence cannot become a semantic pass.
Frozen requests, source digests, model settings, controller events, and outputs
bind each result to its actual subject. Verified replay preserves that identity
without claiming a fresh model execution or a variance observation.

The final Prompt package is `0.7.1+codex.20260909222626`; Evals is
`0.3.1+codex.20260910083517`. The last Evals build only normalized two JSON files'
line endings; their parsed content was checked against the evaluated version.
Installed/source parity passed for all 35 Prompt and 109 Evals files.

The [case ledger](2026-09-10-cascade-prompt-evaluation.yaml) records individual
outcomes, failures, and hashes of local evidence. Raw traces remain in ignored
`.artifacts/` folders and are not available from a fresh clone. The ledger is a
dated diagnostic record, not a release certificate or a pooled quality score.

## Campaign results

| Campaign | Accepted | Rejected | Not run | Invalid | Missing summary |
|---|---:|---:|---:|---:|---:|
| Original v4, 65 runner jobs | 19 | 23 | 14 | 4 | 5 |
| Corrected name fixtures, 9 | 9 | 0 | 0 | 0 | 0 |
| Intermediate runtime repairs, 12 | 4 | 7 | 0 | 0 | 1 |
| Corrected interaction/oracle checks, 3 | 2 | 1 | 0 | 0 | 0 |
| First final source audit, 10 | 0 | 0 | 0 | 0 | 10 |
| Completed final source audit, 10 | 3 | 3 | 0 | 4 | 0 |

These are raw runner outcomes, not interchangeable trials. Corrected fixtures,
source revisions, and repaired evaluators have different identities. Three of
the original four `INVALID` outcomes were timeouts mislabeled by the earlier
runner; that classification is fixed in the current implementation. A process
interruption at 2026-09-09 22:31:40 UTC left multiple runs incomplete. Its cause
was not established; incomplete work supplies no semantic verdict.

Supplemental checks:

- Nine corrected model/template authoring fixtures were accepted, including
  Astra, Qwen, Gemma, Mistral, an unknown 27B model, and extraction context.
- Corrected invoice and support interactions were both accepted. Their earlier
  fixtures omitted required selection, normalization, or fallback decisions;
  independent triage preserved the original results before repairing them.
- Four synthetic judge challenges passed: correct output, contract violation
  or injection, unauthorized effect, and missing evidence. This does not replace
  human calibration.
- Two real Astra target responses were accepted. One was judged in the original
  run; the other used its verified original execution with fresh independent
  judges after interruption. This is not two fresh replay executions.
- Actual saved builder/target evidence passed the final replay checks. Changed
  requests, case identities, and target inputs were rejected.
- Invoice repeatability remains `PARTIAL`, with only one of three requested
  fresh repetitions complete. Stability and flakiness are unmeasured.

## Remaining findings

The final source audit accepted request profiling, the model registry, and the
routing-case map. It rejected these three groups:

1. **Prompt composition:** efficient-tier decomposition does not explicitly
   require visible intermediate artifacts for complex work.
2. **Tier selection:** conservative candidate selection without representative
   measurements is missing; balanced-tier escalation does not explicitly rule
   out instruction, schema, and tool defects first.
3. **Specialization overlays:** coding lacks explicit inspect-before-edit and
   preserve-unrelated-work duties. Generic orchestration leaves retry limits,
   idempotency, and unavailable-tool handling insufficiently explicit.

Clarification policy, context acquisition, task profiling, and routing evaluation
received invalid judge responses because exact quoted evidence failed the
contract. Their returned ratings are diagnostic only and establish neither
acceptance nor a confirmed defect. Judge evidence-format reliability is an open
evaluation issue; quote checks were not relaxed to make the audit pass.

The original behavioral audit also found over-clarification when conservative
defaults were sufficient, premature `BLOCKED` before asking an answerable
authority question, a missed evaluation pack for comparison, and a missed
safety pack for an authorized document mutation. These cases have no complete
passing rerun against the final subject. Later original quality rejections were
not all independently triaged and must not all be labeled Prompt defects.

## Implementation verification and limits

Repository tests passed: **40 tests, zero failures, 325 assertions**. Focused
quality-runner, interview-runner, execution-adapter, variance, and calibration
contract checks passed. Runtime packaging, plugin validation, evaluation and
campaign catalogs, frozen-evidence hashes, and installed/source parity passed.
The final repository validator and staged whitespace check also passed.

The implementation additionally closes evidence and routing gaps: bounded
question choices, supplied-context precedence, model identity preservation,
task-specific context templates, context/evaluation routing, strict judge
responses, portable execution adapters, and replay integrity. Existing Design
focus/selection, Ukrainian admission, and Windows test fixes from this work are
included in the verified repository state.

Named open-weight authoring cases do **not** execute Qwen, Gemma, or Mistral
checkpoints; those provider tests are `NOT_RUN`. Human judge calibration is
`NOT_RUN`. Staged source reads test consumption of the frozen Prompt package,
not normal app-side installed-skill discovery. Coverage is complete for the
declared inventory, not proof of every possible prompt or production workflow.

The next bounded improvement should address the three rejected source groups,
repair judge quotation reliability, then rerun only affected source audits and
unresolved behavioral cases against a newly frozen subject. Keep the historical
failures and incomplete variance denominator intact.
