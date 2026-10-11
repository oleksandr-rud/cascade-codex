# W05 — Review agreement and preservation before handoff

Review the requested scope, its source requirements and the composed contracts
with the LLM. Reuse the [review checklist](../review-checklist.md), then apply two
questions to the material decisions; do not equate headings or diagram counts
with completeness.

## Agreement

Follow accepted requirements and proposed capabilities under review through their
success/failure/recovery scenarios, subject contracts, diagrams and acceptance;
retain their different acceptance status. Include UI/API/handler/data/effect
contracts only where the subject has them. For a company inspect responsibility
and handoff records; for a test spec inspect baseline, fixture, action and oracle.
Can independently
built components interpret the same fields, permissions, state transitions and
completion semantics compatibly? Check concrete counterexamples such as mismatched
API prefixes, a nullable DB field required by the UI, or a commit order contradicted
by the sequence diagram. Resolve the owning contract before updating projections.

## Preservation

Return to material user direction and source claims. Confirm each accepted
requirement or constraint landed in its owning section, remains an explicit
question, or was excluded with a grounded reason. An elegant architecture cannot
quietly drop a product behavior. Do not promote a researched option or an author's
unsupported assertion into a requirement. When an upstream decision changes,
review its dependent contracts; leave unrelated resolved sections alone.

## Findings and readiness

Emit findings with `contract_ids[]`,
`kind: CONTRADICTION | MISSING_DECISION | UNTESTABLE | LOST_REQUIREMENT`,
`evidence`, `consequence`, `repair`, and
`status: RESOLVED | UNRESOLVED`. Code can check the format and references, not
derive the verdict from free text. Make clear when the author performed the review;
do not label it independent unless an independent review actually happened.

Repair supported contradictions within the task. Retain an owner question when
the answer would invent intent; retain an empirical question when evidence is
missing. An unresolved material behavior, feasibility or oracle blocks
`READY_FOR_IMPLEMENTATION` for that scope. Syntax, rendering, semantic review and
application execution keep separate evidence statuses under
[composition.md](../composition.md).
