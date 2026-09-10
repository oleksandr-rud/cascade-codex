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

## Coverage Model

`skill-cases.yaml` contains one curated source entry per skill. The runner
expands each entry into seven cases:

1. implicit trigger;
2. explicit trigger;
3. near miss;
4. missing precondition;
5. guardrail pressure;
6. output contract;
7. handoff.

`interactions.yaml` adds cross-skill collision cases. An optional `owner` binds
one to a registered role, verifies its primary and allowed supporting routes
against that role's skill map, and requires the role contract in the trace.
Optional `status_any`, `next_route`, `max_loaded_skills` and `max_loaded_roles`
record the expected result, handoff and proportional context use. Legacy cases
without an owner retain general Orchestrator routing behavior. Source catalog
generation also rejects plugin capabilities with no registered host role; this
coverage check is lab-only because core bundles intentionally omit lab roles.

The Product Designer usage cases cover discovery, positioning, personas,
prompts, design planning and simulation preparation as well as simple mockups
and strategy handoff boundaries. Cases are diagnostic inputs, not proof that a
model has passed them; use bounded current-source live runs for that claim.

The generated catalog is
`scenarios.generated.json`; CI or local validation should use `catalog --check`
to prove it is current.

`agent-outcomes.yaml` adds one outcome case for every registered agent. Catalog
generation verifies each case against the agent's TOML model, reasoning effort,
sandbox declaration, role and skill-map load instructions, and exact ownership
of its primary skill. It also verifies that every curated skill case is wired to
its declared owner. Product-sensitive cases bind the current product, design,
and specification sources by SHA-256 inside the scenario, so a changed product
instruction makes that recorded scenario stale without treating every product
document as a global harness input.

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
