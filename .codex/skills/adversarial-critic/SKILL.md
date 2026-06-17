---
name: adversarial-critic
description: Use before synthesis when market-validation conclusions, hypotheses, evidence quality, competitor assumptions, economics, risks, or missing research need adversarial stress-testing.
---

# Adversarial Critic

Use before final synthesis when market-validation findings may be incomplete,
overconfident, biased, stale, or missing non-obvious product impacts.

This skill challenges conclusions. It does not replace source-gathering lane
skills or final spec synthesis.

## Source Order

1. Latest market-validation report and lane outputs.
2. Hypothesis scorecard, experiment plans, pain clusters, competitor map, and
   economics model.
3. Existing product/spec/design/brand/backlog docs and active work lanes.
4. Current code or product surface when the conclusion depends on an existing
   system.
5. Live external sources when the critique depends on current competitors,
   pricing, regulations, geography, or market behavior.
6. `docs/patterns/workflow.md` for the Doc Routing Decision Matrix.

## Checklist

1. Attack the top hypotheses:
   - What would make this false?
   - Who would not buy?
   - What substitute wins?
   - What constraint blocks delivery?
   - What cost or support load is hidden?
2. Look for missing lanes:
   - adjacent persona;
   - complementary workflow;
   - geography or channel mismatch;
   - regulatory or operational constraint;
   - design, brand, integration, or support dependency.
3. Check evidence quality:
   - stale sources;
   - biased sample;
   - inference presented as fact;
   - competitor claims accepted without proof;
   - weak pain signal;
   - missing buyer evidence.
4. Classify each critique as `fix-now`, `research`, `defer`, or `accept-risk`.
5. Route gaps to the lane skill that can resolve them, or to
   `validation-experiments` when research cannot settle the risk.
6. Block `synthesis-to-spec` when a critical assumption lacks evidence.
7. Record Doc Routing Decision Matrix rows for durable risks, blocked facts, or
   follow-up decisions.

## Templates

- `templates/critic-report.md`

## Output

- challenged claims;
- missing evidence and hidden assumptions;
- adjacent impact candidates;
- accepted risks and blockers;
- follow-up routes;
- Doc Routing Decision Matrix rows.
