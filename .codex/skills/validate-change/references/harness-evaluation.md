# Harness evaluation

Read only for a harness evaluation claim or a change to the optional evaluation lab.
The commands below require the Cascade source or an explicitly installed lab;
the core target runtime does not ship that lab or its runners.

Harness evaluation is conditional. Run catalog and self-test when harness eval
implementation, scenarios, expectations, or judge contracts change. Run a
focused live scenario only when mechanical evidence cannot decide a changed
semantic assertion.

Live harness traces, judgments, and coverage reports are disposable diagnostics
under ignored `.artifacts/harness-evals/`. They must not be promoted into
tracked work state or treated as product, simulation, provider, deployment,
release, or architecture evidence. Re-run the exact current source-bound case
when a semantic diagnostic is needed again.

Only an already registered simulation campaign with an explicit specialized
route/trace claim may retain its minimal digest-bound receipt inside the frozen
run package. That exception does not make the generic harness run durable or
prove target-product behavior.

```bash
bun scripts/cascade.ts eval catalog --check
bun scripts/cascade.ts eval audit
bun scripts/cascade.ts eval self-test
bun scripts/cascade.ts eval run --scenario HX-NNN --model-profile planning
bun scripts/cascade.ts eval evaluate --run-dir .artifacts/harness-evals/<run-id>
bun scripts/cascade.ts eval judge --run-dir .artifacts/harness-evals/<run-id>
```

Live targets run read-only. Accepted diagnostic coverage requires a current source-bound
scenario, complete trace, mechanical eligibility, and every configured
independent judgment. A semantic score cannot override a schema, permission,
mutation, or trace-integrity failure.

## Task-local evaluation cases

For harness behavior changes needing semantic evaluation, select permanent
cases by the affected risk. Generate additional cases from the accepted change
and actual failure boundaries only when the core lacks them. Give each one a
distinct risk, concrete input and expected route/status or handoff; freeze the
task draft with `cascade eval prepare --file <draft>` before running
`cascade eval run --suite <frozen-suite>`. Follow the host schema at
`harness-evals/task-suite.schema.json` when this optional evaluation lab exists.
Do not multiply every skill into a fixed case quota or make full catalog
coverage an ordinary completion gate. Use the same frozen cases and rubric for
a controlled comparison; any revision starts a new experiment. Keep temporary
cases out of the core, promote unique discovered regressions, and route their
cleanup proposal through closeout. No evaluation lab is required in a target
bundle that omits it.
