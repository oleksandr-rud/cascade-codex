---
name: review-change
description: Review a current code, configuration, schema, documentation, or harness diff against its originating request, architecture, public contracts, consumers, and regression surface. Use when an independent fixed-point review materially reduces risk; remain read-only and do not replace domain, security, QA, or acceptance authority.
---

# Review Change

Recover the exact request, accepted assumptions, architecture and policy
constraints, current diff, nearby dirty work, and relevant consumers. Trace each
changed behavior through public interfaces, state or persistence, tools,
permissions, generated artifacts, tests, and observable outcomes as applicable.

Find correctness defects, regressions, unsafe edge cases, contract or ownership
drift, stale consumers/documentation, and missing proof. Separate introduced
findings from pre-existing state. Rank actionable findings by impact and
confidence and cite the smallest useful source location. After repairs, review
the new fixed point; stop when no actionable finding remains or a real authority
blocker is reached.

Return findings first, then open questions, residual risk, and evidence that was
`NOT_RUN`. Do not patch, self-accept, manufacture process artifacts, or require
review passes solely to satisfy a count.
