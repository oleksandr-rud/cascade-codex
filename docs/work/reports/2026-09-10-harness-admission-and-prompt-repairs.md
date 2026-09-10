# Harness admission and Prompt repairs

The user requested existing problems fixed before pushing current work to
master and starting the autonomous project pilot on a separate branch. The
repair baseline is `01f1be6`, which preserves the local pilot plan and integrates
upstream `8c54f70`. Raw attempts remain under the ignored
`.artifacts/harness-repair-20260910/` root.

## Changes and ownership

- Host admission now recognizes the conversational Ukrainian directives
  “давай виправимо”, “давайте зробимо”, and “перед цим запушимо”. The existing
  direct-user provenance, negation, quotation, and hard-action receipt checks
  remain operative. The exact previously misclassified request has a regression
  check alongside negative controls.
- Cascade Prompt resolves packaged paths from `skills/prompt/`, retains the
  literal `Final Prompt` label, asks only for hard unresolved requirements, and
  groups related output-contract decisions into one question. An answerable
  missing decision first returns `NEEDS_INPUT`; `BLOCKED` requires an unavailable
  dependency or an explicitly unresolvable hard gap.
- A reusable single-input prompt with a resolved schema no longer requires the
  context-composition pack and its extraction template. Explicit context-layout
  requests and material multi-source/history composition retain their route.
- Evals checks for `skip_host_skill_discovery` before isolated Codex dispatch.
  The initial CLI 0.144.6 could not support this flag; the supported updater
  installed CLI 0.154.0. An unsupported executable now leaves a non-dispatched
  receipt, without removing isolation. Native discovery receipts identify their
  retained host configuration separately.
- Two observed interview-oracle problems were repaired: “authorized rule” and
  “authorized source” questions were missed by authority-intent matching, and
  the schema fixture
  demanded an ambiguity question even when a compatible default resolved it.
  Positive and negative checks retain the required source-authority and schema
  questions. The schema case also forbids the unnecessary template reads.
  Interview catalog v6 versions the changed fixtures; original results remain
  unchanged and new model attempts receive new identities.

The source packages are Prompt `0.7.3+codex.20260910122426` and Evals
`0.3.5+codex.20260910123140`. Seven dependent evaluation manifests and generated
catalogs track these package versions and source hashes.
All 14 installed Cascade packages match source across 610 files; 166 installed
dependency bindings pass, and 18 unrelated installed packages were preserved.
The exact inventory and hashes are in `plugin-parity-release.json` under the
evidence root.

## Validation and preserved attempts

Source checks passed: 41 runtime tests with 348 assertions, 981 admission cases,
52 Evals Python tests, 94 JavaScript runner tests, 31 harness-evaluation
self-tests, and the repository validator. Catalogs cover 142 harness scenarios,
17 campaigns, and 14 Prompt tasks / 36 interview fixtures. Regression checks
first reproduced the failures and then passed; changed fixture assertions
retain real staged-read evidence for forbidden-read checks.

| Attempt | Outcome and scope |
|---|---|
| `prompt-repair-v1` | Three `NOT_RUN` results: CLI rejected an unsupported isolation feature before model execution. |
| `prompt-repair-v2` | Creative brief and missing-schema case ACCEPTED, each independently judged 1.0. Authority control retained a false mechanical intent rejection. |
| `prompt-repair-v3` | Schema response omitted the unnecessary template: cumulative answer-turn input fell from 37,882 to 23,432 tokens. The run exposed an optional-question oracle defect and premature first-turn `BLOCKED`; those rejections remain preserved. Creative case ACCEPTED, independent judge 1.0. |
| `prompt-repair-v4` | Schema case ACCEPTED, independent judge 1.0. Authority correctly used `NEEDS_INPUT → BLOCKED`, but its “authorized source” wording exposed another false intent rejection. |
| `prompt-repair-v5` | Fresh authority control ACCEPTED, independent judge 1.0. It asks one required question, then remains BLOCKED when the user cannot provide authority. |
| `native-qwen-v1` | Normal installed-skill discovery completed with `Final Prompt`, nine successful nonempty reads, zero failed reads, and 22,485 noncached input tokens. |
| `native-qwen-v2` | Same natural request: `Final Prompt`, six successful nonempty reads, zero failed reads, and 21,164 noncached input tokens. Context-pack/template reads disappeared. |

Builder and judge model calls use Sol/max and the existing shared three-call
pool. Staged authoring, native skill discovery, mechanical eligibility, and
independent semantic judgment retain separate evidence identities. These are
Sol authoring runs about Qwen configuration; actual Qwen target execution is
`NOT_RUN`.

Native diagnostics bind Prompt builds `20260910120726` and `20260910121806`;
their path/format/loading changes are retained in the final Prompt. Later edits
change answerable-gap handling and test mechanics, with separate fresh schema
and authority runs. Raw contracts retain their actual source and runner hashes;
results from different freezes are not combined into a single campaign pass.

## Proof boundary and next work

Token budgets remain provisional and unchanged. The observed input reduction is
one bounded comparison, not a general provider-cost or latency guarantee.
Other project types, Windows runtime execution, all-model endpoints, human
judge calibration, and exhaustive semantic coverage were not qualified by this
repair. Source review in the implementation context is self-review.

The [autonomous project pilot](2026-09-10-autonomous-project-harness-evaluation-plan.md)
remains separate work. Its writable execution profile and project build/run/eval
have not run. Master publication follows the completed repair checks; project
implementation belongs on the requested separate branch.
