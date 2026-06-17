---
name: pain-mining
description: Use during business-analysis or market-validation lanes to extract and classify real user pain from reviews, forums, interviews, support notes, sales notes, communities, tickets, or provided research.
---

# Pain Mining

Use when a market-validation lane or product discovery loop needs real user
pain, urgency, workaround behavior, language, frequency, and buying pressure
from source material.

This skill does not invent personas or requirements. It turns user evidence
into pain clusters that can be scored, tested, or routed to
`synthesis-to-spec`.

## Source Order

1. Latest market-validation frame, user brief, source packet, or lane request.
2. Provided interviews, support notes, sales notes, tickets, reviews, forums,
   communities, app-store reviews, complaint logs, or customer research.
3. Existing `docs/product/`, `docs/specs/`, `docs/backlog/_index.md`,
   `docs/work/lanes/`, and prior pain reports.
4. Live external sources when the pain evidence depends on current reviews,
   forums, public communities, or market behavior.
5. `docs/patterns/workflow.md` for the Doc Routing Decision Matrix.

## Checklist

1. Define the target segment, job, workflow, geography, and excluded audiences.
2. Collect pain signals with source identity, date, context, and sample size.
3. Cluster pain by job, trigger, severity, frequency, workaround, buyer, and
   switching friction.
4. Separate observed facts, user-provided facts, assumptions, inference, and
   weak signals.
5. Preserve user language in short excerpts only when source policy allows it;
   otherwise summarize.
6. Identify adjacent workflows or complementary runs when one pain cluster
   implies hidden users, support burden, integrations, compliance, or design
   constraints.
7. Route product implications to `hypothesis-scoring`,
   `validation-experiments`, `docs-impact-map`, or `synthesis-to-spec`.
8. Record Doc Routing Decision Matrix rows when durable facts, gaps, or
   deferred follow-ups are produced.

## Evidence Rules

- Do not treat marketing claims as user pain.
- Do not over-weight one loud source without sample context.
- Mark source bias, geography mismatch, stale dates, and unverifiable claims.
- Keep weak evidence as an experiment candidate, not a requirement.

## Templates

- `templates/pain-mining-report.md`

## Output

- pain clusters and evidence quality;
- source map and confidence;
- user language and workaround patterns;
- adjacent impact candidates;
- hypothesis and experiment routes;
- Doc Routing Decision Matrix rows.
