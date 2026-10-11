# A case that can falsify behavior

Bind the design to the exact parent owner/revision, including related API, handler,
schema or UI owners when split. Record proposed/accepted status from its real
source. Source changes invalidate affected design/review evidence; planned cases
and observed execution results are separate records.

| Field | Contract |
|---|---|
| Case ID | Stable identifier referenced by S14 and any campaign |
| Behavior / scenario / enforcement refs | Exact requirement, SC and applicable OP/H/D/UI/rule identifiers |
| Risk ID / consequence | Stable risk reference and the observable failure that matters |
| Level / reason | Why this boundary can detect that failure |
| Fixture / environment / actor | Versioned target, concrete data/access and setup; no unidentified or production target |
| Actions / control | Reproducible actions; clock/network coordination or independent connections when needed |
| Oracle | Evidence, expected result and a plausible broken result it excludes |
| Cleanup / isolation | What must reset, allowed cleanup boundary and persistent evidence to retain |
| Execution ref | Exact existing runner/command, registered adapter or proposed binding with a visible gap |
| Evidence | NOT_RUN until actually executed; retain scoped PASS/FAIL/BLOCKED evidence independently |

Detailed cases can use Given/When/Then, but “the feature works” is not an oracle.
Example: after a losing conflicting booking request, observe both the conflict
response and the final reservation rows; assert no second active reservation.
This detects a server returning an error after already writing invalid state.

For semantic outcomes define judge input and governing source, allowed verdicts
`PASS / FAIL / INCONCLUSIVE`, supporting claims/evidence and uncertainty. Calibrate
the judge for consequential use. Invalid structured output requires bounded
repair or an inconclusive outcome, never lexical extraction from prose.

Separate requirements review (“clear and testable”) from execution (“implemented
behavior passed”). Do not claim a test ran because its file/command exists. A
fixture readiness gap can leave execution BLOCKED while the design remains useful.
Do not remove failures to hide defects or add tests only for wording/helper counts.
