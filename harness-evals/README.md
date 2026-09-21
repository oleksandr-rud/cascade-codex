# Cascade Harness Evals

This directory owns canonical harness scenarios and structured output schemas.
It is a source-checkout evaluation lab, not part of the generated core target
runtime. Generated scenarios and the admission corpus are loaded
only by explicit source eval/corpus commands; normal request admission and
plugin routing do not read them.
Live traces and reports are generated under `.artifacts/harness-evals/` and are
ignored, disposable local diagnostics, not source files or durable evidence.
Do not copy run directories, judge outputs, or aggregate reports into tracked
work reports or archives merely to retain a passing score. Re-run a focused
case from its current source-bound contract when the diagnostic is needed
again.

An explicitly registered simulation campaign may retain the minimal specialized
route/trace receipt required by its frozen claim contract. That campaign-scoped
receipt is not the generic run directory and cannot establish target-product
behavior or widen the claim it was created to evaluate.

## Case lifecycle

The permanent catalog is a risk-based core, not a completion quota. It contains
36 explicitly retained cases in `core-cases.yaml` and nine fixed role baselines
in `agent-outcomes.yaml`. Each core case names its distinct risk. Source wiring
checks still inspect every role and plugin capability without executing a model
for every registered skill.

The previous 180-case catalog expanded nine skills into seven variants and
added 108 interactions plus nine outcomes. We removed that expansion: four
local cases and 32 interactions remain alongside all nine role baselines.
The 59 other generated variants are no longer required per skill. The 76 other
interactions are either overlapping route checks or task-specific domain and
project graph examples; recreate a relevant case from current requirements
when that boundary changes. Their prior definitions remain recoverable in Git,
not an additional maintained catalog. This is an intentional coverage-policy
change, not evidence that the removed cases passed.

Retained cases include all six targeted regressions (HX-066, HX-067, HX-068,
HX-072, HX-079, HX-080), evidence/authority/dirty-work boundaries, bounded routing,
and the exact HX-055 campaign canary. HS-context-implicit and HS-context-handoff
also retain evaluator and campaign-adapter fixtures. Every role retains its
source/model/ownership baseline. Judge integrity remains covered by the existing
runtime self-test, not a growing set of model calls.

For a particular change, the host authors a small task draft from accepted
behavior, changed sources and unique risks. The runner compiles and freezes it;
it does not invent semantic test inputs or call a model to generate them.
Use `task-suite.schema.json`: each case needs a risk, input, owner, expected
primary route and allowed statuses; optionally add supporting/rejected routes,
a next handoff and context budgets. Do not send expected answers to the target.

Freeze before execution with `eval prepare --file DRAFT`. The exclusive output
is under ignored `.artifacts/harness-evals/suites/`, bound to task identity,
scenario definitions and current harness sources. Changed sources require a new
freeze; changed criteria start a new experiment. `run --suite FILE` uses the
same read-only runner and two independent judges as the core. Judging verifies
the exact suite binding again. Temporary coverage is requested explicitly with
`coverage --suite FILE` and never counts toward core coverage.
Task runs stay beside their frozen suite in `<suite-name>/runs/<run-id>/`;
cleanup inspects only that directory, including interrupted or corrupt attempts.

For model comparisons keep the selected cases, applicable source version and
rubrics identical; record explicit execution policy for each experiment. A
model override remains diagnostic and cannot bypass the current pinned
acceptance policy. Neither core nor temporary completeness is a default task
completion gate; use only the cases needed to support the accepted claim.

At closeout, `eval closeout --suite FILE` proposes cleanup of the exact suite
and its bound runs only when all cases and all recorded attempts have complete,
accepted raw evidence. Failed, blocked, stale, interrupted, corrupt or unjudged
attempts remain for triage. A later pass cannot erase an earlier failure.
The command never deletes or runs models. Review the proposal, promote a minimal
unique regression for a discovered defect, preserve required handoffs and
campaign receipts, then seek authorization for exact deletion paths. An unrun
suite may be retired manually if its evaluation was explicitly abandoned;
it never receives a passing cleanup recommendation.

### Minimal task draft

```yaml
schema_version: 1
task_id: prompt-routing-fix
purpose: Verify a wording-only prompt request stays within its accepted boundary.
cases:
  - id: HT-wording-only
    risk: A wording edit incorrectly starts architecture work or evaluation.
    owner: agent-engineer
    prompt: Refine one supplied instruction prompt's wording; its role, workflow and permissions are accepted. No experiment is requested. The actual prompt text is absent; identify that gap without inventing it.
    expected_primary: cascade-prompt:prompt
    forbidden_primary: [cascade-ai-architect:architect-ai-system, cascade-evals:prompt-evaluation]
    status_any: [GAP, BLOCKED]
```

This illustrates the input shape; generate a task-specific case instead of
retaining another wording variation when HX-102 already covers the risk.

## Commands

```bash
bun scripts/cascade.ts eval catalog --write
bun scripts/cascade.ts eval catalog --check
bun scripts/cascade.ts eval audit
bun scripts/cascade.ts eval self-test
bun scripts/cascade.ts eval run \
  --case-kind agent-outcome
bun scripts/cascade.ts eval judge \
  --run-dir .artifacts/harness-evals/<run-id>
bun scripts/cascade.ts eval coverage --list-missing
```

Use `eval prepare --file DRAFT`, `eval run --suite FILE`, and
`eval closeout --suite FILE` for temporary cases. A full permanent run requires
explicit `eval run --all`; unfiltered `run` does not launch the catalog.

Live runs are serial by default. Use `--scenario`, `--skill`, `--agent`,
`--case-kind`, `--limit`, and `--repetitions` for focused diagnosis. Agent
outcome cases default to the model and reasoning effort in that agent's current
manifest; command-line model options remain diagnostic overrides. The command
prints the run directory and
writes raw traces, normalized traces, per-case mechanical eligibility, a source
manifest, and summary reports. The `judge` command selects every eligible case,
runs required outcome and trajectory profiles independently through the
read-only Cascade Evals harness subject profile (no registered host role), and writes one judgment trace per case/profile.

`judge --judge-profile <id>` may run one required profile at a time. Unknown
profiles and runs without eligible targets fail before modifying judgments.
Validated existing profiles are reused and merged from their raw evidence;
the aggregate is `INCOMPLETE` (exit 1) until every required profile is present,
`FAIL` (exit 1) for a rejected judgment, and `PASS` (exit 0) only for complete
acceptance. One writer is allowed per run. An interrupted or damaged judgment
remains evidence of that attempt; use a fresh diagnostic run instead of deleting
it to manufacture a passing history. Judge model/effort overrides must match
the pinned profile; change the frozen profile for a different experiment.

Each run or re-evaluation batch resolves its route inventory once; each judging
or coverage batch reads its required profiles once. A later command resolves
current sources again, so this reuse cannot hide edits between commands.

The `coverage` command exact-matches each run's complete scenario object to the
current catalog and exact harness source digest. It verifies raw, normalized,
and eligibility artifacts, then rejects stale sources, unsupported models,
blocked or failed traces, missing judges, invalid ratings, and any required
judge failure before claiming accepted coverage.
Curated case YAML is bound through each complete scenario, separately from shared
harness sources. Editing an unrelated case preserves valid evidence for unchanged
cases; a changed or unknown scenario cannot be judged or counted as current.
Judge receipts bind the exact scenario and execution identity as well as its
raw target packet. Shared code, roles, skills, schemas and policy still invalidate
all affected source-bound diagnostics.
Coverage recomputes eligibility and ratings from the raw target and judge
records; cached summary flags cannot establish acceptance. Judge receipts bind
the exact target evidence packet. Missing or changed raw evidence, mismatched
normalization, altered receipts, non-independent contexts and unsafe judge
traces invalidate the case. The source snapshot must remain current throughout
judging; older diagnostics remain historical.
It reports trace-complete execution separately from diagnostic acceptance so
confirmed regressions remain counted as executed without being converted into
passes. Accepted coverage is a property of that exact disposable run; it is not
product, simulation, deployment, release, or architecture evidence.

Agent outcome eligibility additionally requires the responsible role and
primary skill to be loaded and all declared instruction sources to be cited.
Skill, role, command, output-detail, and extra-supporting-route bounds remain
diagnostic so context efficiency is visible without turning reasonable model
variation into a hard admission gate. These measurements are not release proof
and are not a reason to create a work graph.

A loaded skill or role requires a file-reading command whose output
matches the current entrypoint's opening and body. Echoed paths, inventories,
empty output and failed reads without source content do not qualify. A later
failed search in the same shell group does not erase an already observed read.
This establishes observed source
exposure; the independent semantic judges assess how the instructions were used.

The deterministic `self-test` also copies
`fixtures/onboarding/basic-project/` into a temporary target and proves project
inventory, target-config/path rejection, complete onboarding evidence,
project-part/doc-routing checks, preservation hashes, and source drift without
running a live model or configured target commands.

The default `execution` and `planning` profiles pin target probes to
`gpt-6-astra`; judge profiles independently pin `gpt-6-astra` and high
reasoning effort. `--model` remains an explicit
diagnostic override and is recorded as the `custom` profile.

The environment variable `CASCADE_EVAL_CODEX_MODEL` can provide an explicit
diagnostic override. A command-line `--model` value takes precedence. Do not
put user credentials, provider configuration, or telemetry settings in this
directory.

`judge-profiles.yaml` and `rubrics/` are versioned measurement contracts.
Judges emit only 0–4 dimension ratings, rationale, evidence, and a semantic
verdict. The runner recomputes weighted scores and requires threshold,
minimum-dimension, and verdict agreement. Use `cascade-evals:build-judge` to
change or calibrate these contracts; use
`cascade-evals:harness-evaluation` to coordinate and reduce one bounded target
diagnostic.
The per-case `effectiveness_score` is the lower required-judge score, while the
coverage ledger retains both profile scores and their distributions.

The CLI enables the Code Mode host needed for Astra's local source-reading
commands and disables multi-agent dispatch, plugins, apps and visual/network
surfaces. Read-only sandboxing and trace checks still apply. Disabling the host
can make every source read fail before a role is exercised; classify that as
execution-environment evidence, not a semantic role-quality result.

A failed eligibility check accompanied by the CLI's disabled-Code-Mode or
policy-rejected CreateProcess diagnostics is BLOCKED/environment, rather than a
model routing failure. The policy remains in force; the runner does not retry
with a broader sandbox. Model prose alone cannot supply that classification.
