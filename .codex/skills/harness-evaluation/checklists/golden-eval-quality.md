# Golden Harness Eval Quality Checklist

## Corpus

- [ ] Every discovered skill has one source case entry.
- [ ] Every skill has implicit, explicit, near-miss, missing-precondition,
      guardrail, output-contract, and handoff cases.
- [ ] Cross-skill collisions cover the main ambiguous routes.
- [ ] Target prompts do not contain expected routes, rubric rationale, or prior
      answers.
- [ ] Expectations are specific enough for deterministic grading.

## Execution

- [ ] Target runs are read-only and serial unless parallel execution was
      explicitly authorized.
- [ ] Model, CLI version, timeout, command, exit code, and environment errors
      are captured.
- [ ] Raw stdout JSONL and stderr are preserved outside tracked source files.
- [ ] Every run has a replay command.
- [ ] Secrets and credentials are absent from prompts, traces, and reports.

## Grading

- [ ] Schema, route, anti-trigger, skill-load, status, mutation, and trace hard
      gates run before semantic judgment.
- [ ] No-trace, malformed-output, and mutation cases cannot pass on prose
      quality alone.
- [ ] Harness defects, model variance, scenario defects, and environment
      blockers are separate.
- [ ] Flaky classifications use repeated identical runs.
- [ ] The earliest causal failure is reported with an evidence path.

## Regression Promotion

- [ ] Confirmed failures become narrow regression cases.
- [ ] Golden expectations are not weakened to accept a current failure.
- [ ] Harness fixes route to their owning skill, agent, config, docs, hook,
      schema, or validator surface.
- [ ] Catalog freshness, self-tests, Cascade validator, and `git diff --check`
      pass before closeout.
