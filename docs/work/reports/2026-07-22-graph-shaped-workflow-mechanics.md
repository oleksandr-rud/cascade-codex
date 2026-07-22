# Graph-Shaped Workflow Mechanics

Date: 2026-07-22
Lane: `W-003`
Status: `BLOCKED`
Plan Revision: `4`
Graph Revision: `3`

## Outcome

Cascade now has a graph-shaped lane protocol for complex work without adding a
graph runtime or replacing the model/tool loop. The lane packet holds
authoritative task, dependency, gate, amendment, transition, and repair state;
status boards and `docs/work/active.md` are derived projections. Atomic work
may bypass the graph sections while retaining the ordinary workflow contract.

The protocol adds typed dependency readiness, version-bound receipts and
evidence joins, one lane-state writer, bounded partial repair, attempt
exhaustion, ownership handoff, cross-lane invalidation, graph revision history,
and terminal aggregation that cannot accept its producers.

## Delivered Surfaces

| Surface | Result |
|---|---|
| Reusable semantic authority | `docs/patterns/workflow/graph-shaped-work.md` with six selectively compilable workflow-pack sections |
| Lane representation | Optional graph sections in `docs/work/lane-template.md` plus a complete non-active example |
| Creation and execution | Context, orchestration, planning, and implementation skills enforce authority, readiness, ownership, and receipt boundaries |
| Evidence and repair | Functional acceptance, review, validation, test repair, and closeout skills preserve evidence classes, freshness, minimal repair, exhaustion, and terminal rules |
| Harness coverage | Ten authored interactions, `HX-027` through `HX-036`, cover `GW-001` through `GW-022` |
| Public routing | README and CODEX point complex lanes to the semantic owner and preserve the no-runtime/atomic-bypass boundary |

## Parallel Execution And Integration

Work ran in one branch/worktree per workline with the root thread as the only
state and merge owner. `WL-02`, `WL-03`, and `WL-04` executed from one accepted
semantic base with disjoint writes. The first `JG-CORE` integration review
failed and reopened only the responsible compatibility slices. The repaired
second join passed at `ce737f2`, preserving unrelated accepted work and the
failed-attempt history.

| Gate | Result |
|---|---|
| `DG-00` | Accepted reproducible dispatch base |
| `AG-01` | Accepted semantic authority and pack routing |
| `AG-02` through `AG-04` | Accepted lane representation, execution skills, and evidence/repair skills |
| `JG-CORE` | Accepted on attempt 2 after bounded compatibility repair |
| `AG-05` | `BLOCKED`; authored/deterministic coverage passes, required bounded target/evaluate/judge evidence awaits spend authority |
| `AG-06`, `TG-01` | `OPEN`; affected consumers of blocked `AG-05` |

## Validation Evidence

All required deterministic checks pass on integrated head
`6c4e33e833373b9fb514e040f2a3f68fd0a9e590`:

| Check | Result |
|---|---|
| Workflow context pack | PASS, 15 sections; all six graph selectors also compile independently |
| Cascade validator | PASS, 7 agents, 39 skills, zero project leakage and zero legacy review-alias references |
| Harness catalog | PASS, 309 scenarios, digest `6d856d23e4c9695094382fd09beaae96efdba56a29cbb168f8b12e9797ca2fea` |
| Harness self-test | PASS, 18 cases |
| Runtime audit | PASS, zero findings; required Sol and Terra models available |
| Diff hygiene | PASS |

## Documentation Impact

| Owner Target | Disposition | Reason |
|---|---|---|
| `CODEX.md` | `UPDATED` | Thin runtime-bridge route to the graph protocol and its authority/no-runtime boundary |
| `README.md` | `UPDATED` | Package capability route and validated 39-skill count |
| `docs/structure.md` | `NO_CHANGE` | Existing folder and write-target map remains accurate |
| Work and pattern indexes | `NO_CHANGE` except this report index | Existing lane, example, semantic-owner, and pack routing is already current |
| Product/design/brand/spec/glossary/backlog | `NO_CHANGE` | This change is a reusable harness workflow contract, not a target-product fact |

## Evidence Boundaries And Deferred Scope

- Model-backed target, evaluation, and judge execution is required by the
  unchanged `AG-05` contract and is `NOT_RUN`; no model spend occurred because
  explicit authority was not provided.
- Current coverage is 0/309 executed and 0/309 accepted. The authored cases and
  deterministic checks do not prove live-model effectiveness or judge
  calibration.
- The protocol is instruction-driven. It does not provide transactional state,
  deterministic scheduling, or executable Markdown validation.
- An executable graph parser/validator remains deferred under `AQ-05`; it
  requires a separate runtime/schema decision rather than silent scope growth.

All implementation, documentation, and deterministic evidence is preserved.
The deterministic resume route is: authorize one bounded `HX-031` run, execute
target/evaluate/judge/coverage under the current W-002 contract, reevaluate
`AG-05`, then refresh terminal Standards/Spec reviews and `AG-06`/`TG-01`.
