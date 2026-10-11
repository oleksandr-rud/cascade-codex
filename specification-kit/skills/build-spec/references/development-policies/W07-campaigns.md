# W07 — Conditional test and simulation campaign planning

Use when a group of cases needs shared scheduling, environments/reset, variants,
budgets, contour dependencies or aggregate evidence. An ordinary executable case
can stay in S14. Do not create a campaign solely because tests were mentioned.

The [test-design skill](../../../spec-test-design/SKILL.md) owns the portable
campaign procedure and [handoff guide](../../../spec-test-design/references/campaign-handoffs.md).
Inputs: source-bound behavior/cases, actual coordination need, target/environment,
fixtures/reset, oracles, resources/limits and requested planning scope.
Output: a candidate plan with case membership, dependencies, execution bindings,
stop/recovery rules, evidence and unexecuted status. It grants no execution scope.

Select `cascade-quality:plan-quality` for unresolved quality scope and
`cascade-quality:design-tests` for accepted-behavior cases/native QA requests.
Select `cascade-simulations:manage-simulation-campaign` for an explicitly requested
multi-case/multi-contour simulation plan. Prepare only needed native inputs with
`cascade-simulations:simulation-brief`, `cascade-simulations:simulation-outcome`,
`cascade-simulations:simulation-actor` or `cascade-simulations:simulation-persona`.
The last requires the native frozen compiled-persona simulation projection;
an invented actor fixture is not such a projection.

Preserve native schemas, owner/revision/digests, adapter IDs and gaps. A portable
case table is not an executable native campaign. Use a draft plan while required
inputs are unavailable; continue independent cases. Neither policy selection nor
the existence of a plan executes tests, dispatches actors or grants external effects.

Diagram: case/contour dependency and reset flow when coordination is consequential;
otherwise reference the S14 trace view. Keep campaign state and observed evidence
outside the behavioral specification, linked to its exact baseline.
