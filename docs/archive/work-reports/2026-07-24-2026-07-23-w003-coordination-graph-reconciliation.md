# W-003 Coordination Graph Reconciliation

Date: 2026-07-23
Lane: `W-003`
Plan Revision: `5`
Prior Embedded Graph: revision `4`, `FROZEN` and `SUPERSEDED`
Current Coordination Graph: `CG-001@2`
Cutover: `OH-W003-CG001-01 ACCEPTED`
Status: graph revision-2 offline implementation/evaluation `PASS`; terminal
acceptance remains `BLOCKED` on required model-backed evidence

## Decision

W-003 requires a first-class Coordination Graph because its worklines cross
dedicated worktrees, evidence and batch joins, root-owned no-commit
materialization, integrated validation, invalidation, partial repair, and a
shared terminal gate. These relationships cannot remain authoritative inside a
lane packet without duplicating the new work-folder graph entity.

The direct cutover therefore freezes W-003's embedded graph at final revision
4 and makes `docs/work/graphs/CG-001-w003-coordination-graph.md` current
revision 2 the only cross-workline authority. W-003 retains definitions, criteria,
planning history, and historical evidence. The implementation packet and
`active.md` become projections of CG-001.

## Version-Bound Inventory

| Surface | Current Binding | Role In Cutover |
|---|---|---|
| W-003 lane | base `a14a9bc...`; plan 4 / graph 3 | updated to plan 5; embedded graph receives final revision 4 and is frozen |
| W-003 packet | task revision 2 | updated to task revision 3 and derived from W-003 plan 5 plus current `CG-001@2` |
| active registry | one W-003 row | retained as one thin projection pointing to CG-001 |
| prior report | `2026-07-22-graph-shaped-workflow-mechanics.md` | retained unchanged as revision-4 historical evidence |
| WL-07 producer | `4c6b3041b8bc9d6b81a18f64ee29e91dec78d2a9` | accepted semantic/template transport |
| WL-08 producer | source `494649b946e4cc4ac8c97eb5d460a72626ad8dc6`; repaired dependent transport through `6c073ba` | accepted reconciliation transport and repaired reference identity |
| WL-09 producer | source `6ff0966574bcfcd250af0774f08e8ded378473a0`; repaired dependent transport through `d6763d7` | accepted execution/materialization transport and repaired reference identity |
| WL-10 producer | `1539836613466a366ada2b10fa8a73b116873489` | accepted direct-cutover transport |
| WL-11 producer | `0772244f206a3c4e0dab2e280dbff536a8c126a5` | accepted validator/authored-harness transport; model evidence remains `NOT_RUN` |
| designated active worktree | `REPOSITORY_ROOT`, branch `agent/w003-integration-r4-g3`, HEAD `a14a9bc...` | all accepted transports appear as uncommitted unstaged/untracked state; pre-state-record combined SHA-256 `e48e6c5162374c3913207ea1166bbbe8580d75332ef9ffc339609c4d8f6f4091` |

## Canonicalization Result

The audit compared outcome, criteria ownership, write/output scope, evidence
boundary, dependencies, invalidation, and inbound consumers. Titles and age
were not used as closure or duplication evidence.

| Workline / Record | Disposition | Canonical Target | Retained Or Migrated Content | Status / Reason |
|---|---|---|---|---|
| W-003 plan | `UPDATE` | W-003 plan revision 5 | definitions, criteria, histories, and rich implementation detail retained; cross-workline authority references migrated | necessary plan, stale graph authority location |
| embedded W-003 graph | `SUPERSEDE_BY` | current `CG-001@2` (initial handoff to revision 1) | every revision, gate, receipt, failure, repair, and handoff record retained as frozen history | direct cutover prevents dual authority |
| `WL-01` through `WL-04` | `KEEP` | same IDs | accepted revision-4 gates and receipts retained | distinct historical outcomes; no new gate is retro-accepted |
| `WL-05 / AG-05` | `KEEP` | same IDs | authored/deterministic evidence and required `NOT_RUN` canary boundary retained | still blocked; explicit model-spend authority required |
| `WL-06` | `SUPERSEDE_BY` | `WL-12` | `R-06A`/`R-06B`, public-doc outputs, failed terminal reviews, and residual risks retained | old integration/closeout lacks materialization and combined-diff binding |
| `WL-07` | `KEEP` | same ID | accepted `4c6b3041...` transport | current semantic/schema owner |
| `WL-08` | `KEEP` | same ID | source and consumer transport identities retained | current reconciliation owner |
| `WL-09` | `KEEP` | same ID | source and consumer transport identities retained | current execution/materialization owner |
| `WL-10` | `KEEP` | same ID | accepted cutover artifacts and immutable receipt `1539836...` | distinct migration owner; materialized without commit |
| `WL-11` | `KEEP` | same ID | accepted validator/harness receipt `0772244...` | distinct validator/harness owner; authored/deterministic evidence is not model execution |
| `WL-12` | `KEEP` | same ID | root materialization, batch, integrated, and terminal responsibility | deterministic evidence passes; independent review pending |
| legacy merge queue | `SUPERSEDE_BY` | CG-001 Materialization Queue | branch/commit lineage retained in frozen packet | branch merge is not the current target operation |
| active W-003 row | `UPDATE` | CG-001 projection | one row retained | W-003 remains active; no closeout retirement allowed |
| revision-4 report | `KEEP` | same report | complete report retained unchanged | accurate historical evidence, not active authority |

No true duplicate was found, so `MERGE_INTO` is not used. No row meets the
evidence requirements for `RETIRE_ACTIVE_ROW`. No unresolved identity,
ownership, overlap, or consumer mapping requires `BLOCKED_REVIEW`.

## Evidence Preservation And Invalidation

| Evidence | Disposition |
|---|---|
| legacy `DG-00`, `AG-01` through `AG-04`, and `JG-CORE` | accepted revision-4 evidence retained; not relabeled as revision-5 acceptance |
| `R-DG00` | retained dispatch history; revision-5 dispatch uses `CG-DG-01` and base `a14a9bc...` |
| `R-05A` through partial `R-05C`, `HX-027` through `HX-036` | retained with authored/deterministic/executed states unchanged; refresh W-002 freshness before any run |
| legacy `AG-05` | remains `BLOCKED`; required `HX-031` target/evaluate/judge evidence remains `NOT_RUN` |
| `R-06A`/`R-06B` | retained output evidence; cannot accept superseded `WL-06`, legacy `AG-06`, or any new gate |
| failed terminal reviews at `41aad39` | retained failed historical evidence |
| blocked-handoff reviews at `6d88300` | retained as valid revision-4 handoff evidence; plan 5 invalidates them for current acceptance |
| accepted WL-07 through WL-11 producer transports | current materialized inputs; `CG-MR-ROOT-R5-COMBINED`, `CG-BATCH-01`, and `CG-IV-01` record no-commit presence and deterministic integrated passes |
| revision-1 Standards/Spec reviews at digest `ac30eb83...` | retained `FAIL`; exposed stale projections, self-invalidating review closure, and illegal no-op transition; invalidated for acceptance by `CG-AM-02` |
| graph revision-2 deterministic evidence | validator, 40-skill/326-scenario catalog, runtime audit, 18 self-tests, workflow selectors, and diff hygiene pass before fresh fixed-point reviews |

## Authority And Materialization Boundary

`OH-W003-CG001-01` accepts the authority move from the frozen embedded graph to
current `CG-001@2`. It does not authorize a branch merge, current-branch commit, broad
staging, cleanup, push, or publication.

Root `agent-engineer` is the sole Coordination Graph state and materialization
owner. Workers may commit their owned worktrees to create immutable transports.
Root applies accepted transports to the designated active worktree without an
automatic commit, preserves unrelated dirty state, records unchanged target
HEAD plus the combined diff fingerprint, and runs current integrated evidence.

The current active-root HEAD is `a14a9bc...`; WL-07 through WL-11 changes are
visible as uncommitted unstaged/untracked state. Root bound the exact
materialized payload before state-record updates as SHA-256 `e48e6c5162374c3913207ea1166bbbe8580d75332ef9ffc339609c4d8f6f4091`.
No active-branch commit, push, broad stage, clean, or reset occurred.

## Current Frontier And Next Gates

- `CG-AG-07` through `CG-AG-11` preserve accepted producer handoffs.
- `CG-MQ-07` through `CG-MQ-11`, `CG-BATCH-01`, and `CG-IV-01` are accepted
  revision-2 deterministic/materialization evidence for the unchanged
  active-root HEAD.
- `WL-12` and `CG-AG-12` are in review pending independent Standards and Spec
  evidence against the combined state.
- `CG-BATCH-02` and `CG-TG-02` remain blocked by legacy `AG-05` because the
  required bounded canary is `NOT_RUN` without spend authority.

## Validation Required After Materialization

```bash
python3 scripts/build_pattern_context_pack.py --pack workflow
python3 scripts/validate_cascade_codex.py
python3 scripts/run_harness_evals.py catalog --check
python3 scripts/run_harness_evals.py self-test
python3 scripts/run_harness_evals.py audit --runtime
git diff --check
```

WL-11 must additionally prove unique IDs, acyclic typed edges, defined gate and
resume destinations, reconciliation routing, dirty-target blocking,
materialization lifecycle, batch missing/duplicate behavior, and partial
repair. Root must obtain separate Standards and Spec reviews against the
combined active-worktree binding.

The graph parser/runtime remains out of scope. Instruction-driven coordination
and validation do not become deterministic scheduling or transactional state.
