# Judged Harness Eval Quality Checklist

## Corpus And Execution

- [ ] Every discovered skill has seven generated cases and relevant route collisions.
- [ ] Target prompts exclude expected routes, rubric rationale, and prior answers.
- [ ] Target runs are read-only, serial by default, replayable, and source-digested.
- [ ] Raw stdout JSONL, stderr, model, timeout, command, and usage are preserved.
- [ ] Secrets and credentials are absent from prompts, traces, and reports.

## Eligibility And Judgment

- [ ] Schema, route, anti-trigger, skill-load, status, mutation, and trace checks are binary gates with no quality points.
- [ ] Every eligible case has independent outcome and trajectory judgments.
- [ ] Judges cannot read eligibility verdicts, legacy scores, or peer judgments.
- [ ] Every dimension has an integer 0–4 rating, rationale, and evidence.
- [ ] The harness recomputes scores and verifies threshold, floor, and verdict agreement.
- [ ] Missing judges, malformed ratings, blockers, and invalid scenarios cannot pass.
- [ ] Harness defects, model variance, scenario defects, and environment blockers remain separate.

## Regression And Claims

- [ ] Flaky classifications use repeated identical runs.
- [ ] Confirmed failures become narrow regression cases without weakening expectations.
- [ ] Current coverage requires exact catalog and harness source digests.
- [ ] Synthetic tests are not reported as live or human calibration.
- [ ] Reports separate authored, executed, judged, calibrated, and accepted evidence.
- [ ] Catalog freshness, self-tests, validator, and `git diff --check` pass.
