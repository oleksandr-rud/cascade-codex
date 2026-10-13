# Plan only the needed coordination

An ordinary case stays in S14/TEST. Use a candidate campaign plan when cases share
consequential environment/reset, variants, ordering, budgets, contours or aggregate
evidence. Emit NOT_NEEDED, PLAN or UNRESOLVED with the reason and exact case IDs.
Do not manufacture a campaign for every specification.

## Portable plan

Bind the same behavior revision as the cases. Include:

- objective, scope/exclusions and member case/variant IDs;
- target/environment versions, fixtures, actor access and isolation/reset;
- sequence/dependency and concurrency limits only where consequential;
- execution references, per-case time/resource limits and stop/recovery rules;
- observable outcomes, evidence location/schema, partial/inconclusive treatment;
- aggregate decision rule and coverage gaps; all planned runs start NOT_RUN.

Keep case-owned oracles at their references. Execution grants and runtime state
belong to the target host. A prose or portable plan is a candidate design, not a
native executable QA or simulation artifact. No operational world model is built.

## Optional QA handoff

Through the configured W04/W07 binding, load the exact current
`cascade-quality:plan-quality` or `cascade-quality:design-tests` entrypoint.
They require accepted behavior, its owner/revision and source bindings. A proposed
parent allows candidate local design, not a fabricated canonical QA artifact.

Retain native artifact schemas and digests. Every native test-design case keeps a
non-null stable risk_ref. Execution requests use actual registered adapter_id
bindings; a raw shell command in the portable TEST document does not grant native
adapter authority. The target's execution method remains separate from planning.

## Optional user-simulation handoff

Use `cascade-simulations:manage-simulation-campaign` for explicitly scoped planning
of multiple cases/contours. One actor run does not require that campaign method.
Prepare only missing inputs through the selected native methods:

| Method | Boundary |
|---|---|
| simulation-brief | Ground domain/feature context and input references |
| simulation-outcome | Define observable success/failure, evidence and interpretation |
| simulation-actor | Define an executable actor from supported evidence or an explicitly supplied role |
| simulation-persona | Consume its required frozen compile-persona simulation projection; a synthetic actor fixture cannot substitute |

Bind actor/brief/outcome/interface and the actual environment/adapter version.
For variants declare changed factors and preserved baseline. Specify budgets,
reset/isolation, permissions, observation limits and evidence freeze/aggregation
under the native contract. Unsupported interface or missing persona/owner source
is a gap, not invented readiness. Reuse native artifact ownership; do not redefine
the ecosystem's world/campaign schema in the specification plugin.

Campaign authoring, execution and independent evaluation have different owners.
Planning does not authorize simulation execution or messaging/delegation. Preserve
native BLOCKED/GAP/INVALID/NOT_RUN outcomes and do not upgrade a candidate plan or
actor narrative to proof of user success.
