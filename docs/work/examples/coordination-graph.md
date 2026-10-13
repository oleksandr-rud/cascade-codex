# Non-Active Example: Coordination Graph For A Worktree Bundle

Example Status: `REFERENCE_ONLY_NON_ACTIVE`
Example ID: `EX-CG-01`
Plan Revision: `3`
Coordination Graph Revision: `2`
Coordination-State / Materialization Owner: example root orchestrator
Execution Mode: `dedicated-worktrees`
Terminal Gate: `CG-TG-01`

> This is copyable guidance, not active work. Never register it in
> `docs/work/active.md` or `docs/work/graphs/_index.md`. A real graph replaces
> every example identity, path, SHA, digest, time, and evidence reference.

## Goal And Applicability

Three worklines deliver one compatibility bundle: `WL-01` freezes a contract,
`WL-02` implements it, and `WL-03` validates the combined result. The graph is
applicable because three worklines have a producer dependency, dedicated
worktree transport, a materialization boundary, and an integrated evidence
join. The graph references the source spec; it does not copy graph tables into
that document.

| Decision | Workline Count | Qualifying Relations | Why Direct References Are Insufficient |
|---|---:|---|---|
| `CREATE_GRAPH` | `3` | producer gate; immutable transport; materialization; batch join; partial repair | readiness and acceptance bind different worktrees and the combined dirty active-worktree state |

## Authority And Worklines

`CG-CO-01` cuts cross-workline authority directly from the prior plan table to
`EX-CG-01@1`. The plan table and lane packets retain references only. The
example root orchestrator is the sole graph-state and materialization owner;
workers propose transitions and cannot update this graph.

| Workline | Lane / Packet | Outcome | Owner / Write Scope | Requires | Produces Gate | Execution Location | Status |
|---|---|---|---|---|---|---|---|
| `WL-01` | `W-101` / example lane | contract v2 | definition worker / `docs/example-contract.md` | none | `CG-AG-01` | `/tmp/example-wl01` | `ACCEPTED` |
| `WL-02` | `W-102` / example lane | implementation v2 | implementation worker / `src/example/` | `CG-AG-01`, producer transport `T-01` | `CG-AG-02` | `/tmp/example-wl02` | `ACCEPTED` |
| `WL-03` | `W-103` / example lane | integration evaluation | validator / no writes | `CG-MG-01`, `CG-BATCH-01` inputs | `CG-AG-03` | current active worktree | `ACCEPTED` |

## Typed Edges And Gates

| Edge | From | Type | To | Satisfaction / Transport | Invalidation / Repair |
|---|---|---|---|---|---|
| `CG-E-01` | `WL-01` | workline gate | `CG-AG-01` | current contract evidence | reopen `WL-01`, `WL-02`, queue items, batch |
| `CG-E-02` | `CG-AG-01` | required gate / transport | `WL-02` | `T-01=commit example-c1`; prove commit present in consumer worktree | amended/rebased commit or consumer base change blocks `WL-02` |
| `CG-E-03` | `WL-02` | workline gate | `CG-AG-02` | current implementation evidence | reopen `WL-02`, `CG-MQ-02`, batch |
| `CG-E-04` | `CG-AG-01`, `CG-AG-02` | materialization inputs | `CG-MG-01` | both accepted and applied to same target state | reopen invalid queue item only |
| `CG-E-05` | `CG-MG-01` | batch input | `CG-BATCH-01` | same target HEAD plus combined diff | rerun batch after combined-state change |
| `CG-E-06` | `CG-AG-03`, `CG-BATCH-01` | terminal inputs | `CG-TG-01` | every required current input passes | reopen earliest invalid producer |

| Gate | Type / Subject | Required Evidence | State | Acceptance / Reopen Rule |
|---|---|---|---|---|
| `CG-AG-01` | workline / `WL-01` | `CG-EV-01` | `ACCEPTED` | contract evidence current for plan 3, graph 2 |
| `CG-AG-02` | workline / `WL-02` | `CG-EV-02-CMD`, `CG-EV-02-REV` | `ACCEPTED` | both required inputs pass against `T-01` |
| `CG-MG-01` | materialization aggregate | `CG-MR-01`, `CG-MR-02` | `ACCEPTED` | both receipts bind target `example-root` plus `DIFF-COMBINED-2` |
| `CG-AG-03` | integrated validation / `WL-03` | `CG-EV-IV-01` | `ACCEPTED` | validator passes combined state |
| `CG-TG-01` | terminal | `CG-AG-01`, `CG-AG-02`, `CG-MG-01`, `CG-AG-03`, `CG-BATCH-01` | `ACCEPTED` | all inputs current at graph revision 2 |

## Worktree Dispatch And Immutable Transport

| Dispatch | Workline | Branch / Worktree | Base SHA | Required Producer Transport / Presence Proof | Allowed Writes | Status |
|---|---|---|---|---|---|---|
| `CG-D-01` | `WL-01` | `example/wl01` / `/tmp/example-wl01` | `example-base` | none | `docs/example-contract.md` | `ACCEPTED` |
| `CG-D-02` | `WL-02` | `example/wl02` / `/tmp/example-wl02` | `example-base` | `T-01=commit example-c1`; `git merge-base --is-ancestor example-c1 example-wl02-head` passes | `src/example/` | `ACCEPTED` |

| Receipt | Workline | Base / Head / Commits | Immutable Transport | Checks | Proposed State |
|---|---|---|---|---|---|
| `CG-WR-01` | `WL-01` | `example-base / example-c1 / example-c1` | `T-01=commit example-c1` | contract check `PASS` | `REVIEW` |
| `CG-WR-02` | `WL-02` | `example-base / example-c2 / example-c2` | consumes proven `T-01`; produces `T-02=commit example-c2` | unit `PASS`; review `PASS` | `REVIEW` |

The uncommitted materialization in the active worktree is not used as
`WL-02`'s Git base. `WL-02` readiness is bound to immutable `T-01` and proof
that `T-01` is present in its own worktree. A patch/diff digest could replace a
commit only if its content identity and presence proof were recorded.

## Materialization Queue And Receipts

| Queue / Order | Workline / Receipt | Target | Baseline | Transport | State |
|---|---|---|---|---|---|
| `CG-MQ-01 / 1` | `WL-01 / CG-WR-01` | current active worktree | `HEAD=example-root`, clean scoped path | apply `T-01` without commit | `ACCEPTED` |
| `CG-MQ-02 / 2` | `WL-02 / CG-WR-02` | current active worktree | `HEAD=example-root`, `DIFF-1` present | apply `T-02` without commit | `ACCEPTED` |

| Receipt | Source Transport | Target HEAD Before / After | Preserved Dirty Paths | Applied Paths / Combined Diff | Staged State | Focused Checks |
|---|---|---|---|---|---|---|
| `CG-MR-01` | `T-01=example-c1` | `example-root / example-root` | `notes/private.md` | `docs/example-contract.md / DIFF-1` | unstaged | contract check `PASS` |
| `CG-MR-02` | `T-02=example-c2` | `example-root / example-root` | `notes/private.md` | `src/example/ / DIFF-COMBINED-2` | unstaged | focused unit `PASS` |

Target HEAD remains unchanged because materialization does not commit. The
combined diff fingerprint proves both accepted results appear while the
unrelated dirty file remains preserved.

## Batch And Integrated Validation

| Batch | Required Gates | Producer Transports | Target HEAD / Combined Diff | Definitions / Runner | Shards | Aggregation | State |
|---|---|---|---|---|---|---|---|
| `CG-BATCH-01` | `CG-AG-01`, `CG-AG-02`, `CG-MG-01` | `T-01`, `T-02` | `example-root / DIFF-COMBINED-2` | `suite-digest-v2 / runner-v1` | unit, contract, integration; all required | every required current shard passes; duplicate evidence IDs rejected | `ACCEPTED` |

`CG-EV-IV-01` records integrated validation `PASS` against target HEAD
`example-root` and `DIFF-COMBINED-2`. The target binding is separate from
`T-01` and `T-02`: producer transports prove lineage/presence, while HEAD plus
combined diff proves the exact active-worktree state evaluated.

## Partial Repair And Revision

`CG-RP-01` shows a contract change invalidating `T-01`. It reopens `WL-01`,
dependent `WL-02`, both materialization items, the batch, integrated evidence,
and terminal gate. It preserves an unrelated accepted policy receipt. The
repair resumes at `WL-01`; it does not rerun unrelated accepted work or edit
the derived frontier directly.

Graph revision `1 -> 2` records the changed producer transport and affected
edges. An ordinary retry with unchanged topology changes only attempt/history.
A retained revision-1 receipt remains historical evidence and cannot satisfy a
revision-2 gate.

## Reconciliation And Retention

| Record | Comparison | Disposition | Result |
|---|---|---|---|
| `W-099` | same outcome, criteria, writes, outputs, and consumers as `W-101` | `MERGE_INTO W-101` | unique source reference migrated; durable packet retained; active-row retirement routed to closeout |
| `W-100` | completed independent policy evidence | `RETIRE_ACTIVE_ROW` | durable report preserved; not deleted |
| `W-101` through `W-103` | canonical current work | `KEEP` | referenced by graph |

## Derived Frontier And Terminal Result

- Accepted worklines: `WL-01`, `WL-02`, `WL-03`.
- Accepted materializations: `CG-MQ-01`, `CG-MQ-02`.
- Accepted batch/integrated gates: `CG-BATCH-01`, `CG-AG-03`.
- Terminal: `CG-TG-01 ACCEPTED` for graph revision 2, target HEAD
  `example-root`, combined diff `DIFF-COMBINED-2`.
- Next executable action: none.
- Commit, push, or publication: not authorized or implied.
