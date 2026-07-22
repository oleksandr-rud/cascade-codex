# Non-Active Example: Graph-Shaped Compatibility Bundle

Example Status: `REFERENCE_ONLY_NON_ACTIVE`
Example ID: `EX-GRAPH-01`
Planning Status: `IMPLEMENTATION_READY`
Plan Revision: `2`
Graph Revision: `2`
Lane-State Owner: example `orchestrator`
Lane Model: `orchestrator-workers`
Terminal Gate: `TG-01`

> This is copyable guidance, not active work. Do not register `EX-GRAPH-01` in
> `docs/work/active.md`. A real lane must replace every example path, actor,
> source, time, and evidence reference with current values.

## Request And Acceptance Criteria

Prepare a compatibility bundle containing a frozen interface contract, one
implementation, an operator guide, an independent policy scan, a migration
note, and integration evidence.

- Every bounded producer has one stable node ID and one per-node gate.
- Node, gate, and external/cross-lane dependencies remain separately typed.
- Required evidence joins are current before a node becomes `ACCEPTED`.
- A missing sandbox approval blocks only its consumer.
- A contract-version amendment reopens stale consumers while preserving an
  unrelated accepted policy scan.
- The terminal aggregate consumes accepted gates and has no consumer.

## Compact Planning Context

### Source Ledger

| Source ID | Source / Authority | Version / Freshness | Supports | Status |
|---|---|---|---|---|
| `SRC-01` | approved compatibility request | `request-v2`, current | interface and migration requirements | `AUTHORITATIVE` |
| `SRC-02` | upstream bundle lane `EX-UPSTREAM` | gate `AG-UP`, evidence `EV-UP-v4`, current | integration fixture | `AUTHORITATIVE` |
| `SRC-03` | repository boundary map | `boundary-v1`, current | write scopes and policy scan | `AUTHORITATIVE` |

### Definitions, Constraints, And Boundaries

| ID | Kind | Statement | Status / Route |
|---|---|---|---|
| `DEF-01` | definition | Output production moves a node to `REVIEW`; only its per-node gate may accept it. | `ACCEPTED` |
| `DEF-02` | definition | The Task Graph, Evidence Gates, latest Graph Amendment, and transition/repair history are authoritative. | `ACCEPTED` |
| `DEF-03` | constraint | IDs are stable and never reused; graph mechanics remain instruction-driven. | `ACCEPTED` |
| `DEF-04` | constraint | The example is not active state and never updates the active registry. | `ACCEPTED` |

| Boundary ID | Producer / Authority | Consumer | Contract | Invalidation Rule |
|---|---|---|---|---|
| `BND-01` | `N-01` / `AG-01` | `N-02`, `N-03`, `N-06` | current `CONTRACT` version plus accepted producer state | contract-version change reopens named consumers |
| `BND-02` | `EX-UPSTREAM` / `AG-UP` | `N-05` | current `EV-UP-v4`, compatible version, one merge owner | producer gate reopen or version change blocks/reopens `N-05` |
| `BND-03` | per-node gates | `TG-01` | all six producer gates are current and accepted | any producer gate reopening returns `TG-01` to `OPEN` |

## Operational Semantics

### Graph Applicability And Authority

| Applicability | Reason / Boundary | Normal Rules Still Required |
|---|---|---|
| `GRAPH_SHAPED` | Six connected obligations, a blocked approval, a cross-lane input, a multi-input evidence join, and bounded repair need explicit state. | planning, approval, review, validation, and closeout |

| Graph Revision | Plan Revision | Lane-State Owner | Authoritative Records | Derived Projections | Instruction-Driven Limit |
|---:|---:|---|---|---|---|
| `2` | `2` | example `orchestrator` only | Task Graph; Evidence Gates; `AM-01`; Transition and Repair History | Current Frontier and any status summary | no scheduler, parser, locking, transactions, or automatic transitions |

### Task Graph

The table is the current revision-2 state after the amendment and bounded
repair. `N-06` and `AG-06` were introduced once in revision 2; no prior ID was
reused.

| Node ID | Obligation | Actor / Type | Requires Nodes | Requires Gates | External Conditions | Named / Versioned Inputs | Expected Receipt | Write Scope | Tools / Permissions | Per-Node Gate | Attempt / Max | Status | Last Transition | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `N-01` | freeze interface contract | planner / definition | none | none | none | `SRC-01@request-v2` | `R-N01-v2` / `CONTRACT@v2` | `docs/specs/example-contract.md` | local files / allowed | `AG-01` | `2/3` | `ACCEPTED` | `TR-13` | `EV-01-v2` |
| `N-02` | implement the contract | worker / implementation | none | `AG-01` | `EXT-01` | `CONTRACT@v2` | `R-N02-v2` / `BUILD@v2` | `src/example/` | local test runner / sandbox approval recorded | `AG-02` | `2/3` | `ACCEPTED` | `TR-16` | `EV-02-CMD-v2`, `EV-02-REV-v2`; optional `EV-02-LIVE-v2` |
| `N-03` | update the operator guide | writer / documentation | `N-01` | none | none | `CONTRACT@v2` | `R-N03-v2` / `GUIDE@v2` | `docs/example-guide.md` | local files / allowed | `AG-03` | `2/3` | `ACCEPTED` | `TR-19` | `EV-03-v2` |
| `N-04` | run the independent policy scan | reviewer / policy | none | none | none | `SRC-03@boundary-v1` | `R-N04-v1` / `POLICY@v1` | none | read-only scan / allowed | `AG-04` | `1/2` | `ACCEPTED` | `TR-07` | `EV-04-v1` |
| `N-05` | validate the integrated bundle | integrator / validation | none | `AG-02`, `AG-03`, `AG-04`, `AG-06` | `XL-01` | `BUILD@v2`, `GUIDE@v2`, `POLICY@v1`, `MIGRATION@v1`, `EV-UP-v4` | `R-N05-v2` / `BUNDLE@v2` | none | local validator / allowed | `AG-05` | `2/2` | `ACCEPTED` | `TR-25` | `EV-05-CMD-v2`, `EV-05-REV-v2` |
| `N-06` | author the migration note | writer / documentation | `N-01` | none | none | `CONTRACT@v2` | `R-N06-v1` / `MIGRATION@v1` | `docs/example-migration.md` | local files / allowed | `AG-06` | `1/2` | `ACCEPTED` | `TR-22` | `EV-06-v1` |

### External And Cross-Lane Conditions

| Condition ID | Type | Authority / Producer Lane | Required Gate / Evidence | Consumer Nodes | Version / Freshness | Merge Owner | Satisfaction State | Invalidation / Block Route |
|---|---|---|---|---|---|---|---|---|
| `EXT-01` | approval | example sandbox owner | approval record `APR-01` | `N-02` | current for attempts 1-2 | not applicable | `SATISFIED`; initially absent and caused `TR-04` `BLOCKED` | absence keeps `N-02` blocked; resolution returns it to `PENDING` for recalculation |
| `XL-01` | cross-lane | `EX-UPSTREAM` | accepted `AG-UP` / `EV-UP-v4` | `N-05` | version 4, current at integration | root example owner | `SATISFIED` | producer reopen/version change returns `N-05` to `PENDING` and `AG-05` to `OPEN` |

### Evidence Gates

`AG-02` is the explicit evidence join: command and independent review evidence
are both required; the optional live probe is recorded but cannot compensate
for either required input.

| Gate ID | Type / Subject | Required Evidence / Inputs | Optional Evidence | Evidence Producers | Evaluator / Reviewer Authority | Acceptance Criteria | Invalidation / Reopen Rule | State | Failure / Repair Route |
|---|---|---|---|---|---|---|---|---|---|
| `AG-01` | per-node / `N-01` | `EV-01-v2` | none | contract checker | example lane owner after source review | current contract evidence passes | `SRC-01` or `CONTRACT` version change reopens gate and consumers | `ACCEPTED` | repair `N-01` |
| `AG-02` | per-node / `N-02` | `EV-02-CMD-v2`, `EV-02-REV-v2` | `EV-02-LIVE-v2` (`NOT_RUN`, optional, no live environment) | test runner; independent reviewer | example lane owner after reviewer result | both required current inputs pass | contract, source commit, or required evidence change reopens `N-02`, `N-05`, and `TG-01` | `ACCEPTED` | repair `N-02`; unresolved environment affects only optional evidence |
| `AG-03` | per-node / `N-03` | `EV-03-v2` | none | documentation checker | independent reviewer | guide matches current contract | contract or guide version change reopens `N-03`, `N-05`, and `TG-01` | `ACCEPTED` | repair `N-03` |
| `AG-04` | per-node / `N-04` | `EV-04-v1` | none | policy scanner | policy owner | current boundary scan passes | boundary or scan-policy change reopens `N-04`, `N-05`, and `TG-01` | `ACCEPTED` | repair `N-04` |
| `AG-05` | per-node / `N-05` | `EV-05-CMD-v2`, `EV-05-REV-v2` | none | integration validator; independent reviewer | example lane owner after reviewer result | all producer gates and `XL-01` current; both evidence inputs pass | any input gate, cross-lane evidence, bundle version, or required evidence change reopens `N-05` and `TG-01` | `ACCEPTED` | repair earliest invalid producer, then `N-05` |
| `AG-06` | per-node / `N-06` | `EV-06-v1` | none | documentation checker | independent reviewer | migration note matches `CONTRACT@v2` | contract or note version change reopens `N-06`, `N-05`, and `TG-01` | `ACCEPTED` | repair `N-06` |
| `TG-01` | terminal aggregate / example lane | accepted `AG-01` through `AG-06`; `EV-RISK-v2` | none | per-node gates; lane owner risk record | root example owner | all six gates current and accepted; residual risk recorded | any required gate/evidence invalidation returns terminal to `OPEN` | `ACCEPTED` | reopen invalidated gate and affected consumers; no downstream consumer |

### Evidence Receipt Records

| Evidence ID | Subject Node / Gate | Graph Revision | Attempt | Input / Source Versions | Source Commit / Digest | Producer | Produced At | Requirement | Result | Invalidation Condition |
|---|---|---:|---:|---|---|---|---|---|---|---|
| `EV-01-v1` | `N-01`, `AG-01` | `1` | `1` | `SRC-01@request-v1` | `example-a1` | contract checker | `2026-01-10T09:00Z` | required | `PASS`, later invalidated | request or contract version changes |
| `EV-02-CMD-v1` | `N-02`, `AG-02` | `1` | `1` | `CONTRACT@v1` | `example-b1` | test runner | `2026-01-10T10:00Z` | required | `PASS`, later invalidated | contract or implementation source changes |
| `EV-02-REV-v1` | `N-02`, `AG-02` | `1` | `1` | `CONTRACT@v1`, `EV-02-CMD-v1` | `example-b1` | independent reviewer | `2026-01-10T10:02Z` | required | `PASS`, later invalidated | reviewed commit or command evidence changes |
| `EV-02-LIVE-v1` | `N-02`, `AG-02` | `1` | `1` | `CONTRACT@v1` | not applicable | live probe | `2026-01-10T10:02Z` | optional | `NOT_RUN`; no live environment | optionality or live requirement changes |
| `EV-03-v1` | `N-03`, `AG-03` | `1` | `1` | `CONTRACT@v1` | `example-c1` | documentation checker | `2026-01-10T10:05Z` | required | `PASS`, later invalidated | contract or guide changes |
| `EV-04-v1` | `N-04`, `AG-04` | `1` | `1` | `SRC-03@boundary-v1` | `example-d1` | policy scanner | `2026-01-10T10:10Z` | required | `PASS` | boundary or scan policy changes |
| `EV-05-CMD-v1` | `N-05`, `AG-05` | `1` | `1` | revision-1 producer gates, `EV-UP-v4` | `example-e1` | integration validator | `2026-01-10T11:00Z` | required | `PASS`, later invalidated | any named input or source changes |
| `EV-05-REV-v1` | `N-05`, `AG-05` | `1` | `1` | `EV-05-CMD-v1` | `example-e1` | independent reviewer | `2026-01-10T11:10Z` | required | `PASS`, later invalidated | reviewed commit or integration evidence changes |
| `EV-RISK-v1` | `TG-01` | `1` | `1` | accepted revision-1 producer gates | `example-terminal1` | example lane owner | `2026-01-10T11:14Z` | required | `PASS`, later invalidated | any terminal input or residual-risk statement changes |
| `EV-01-v2` | `N-01`, `AG-01` | `2` | `2` | `SRC-01@request-v2` | `example-a2` | contract checker | `2026-01-11T09:00Z` | required | `PASS` | request or contract version changes |
| `EV-02-CMD-v2` | `N-02`, `AG-02` | `2` | `2` | `CONTRACT@v2` | `example-b2` | test runner | `2026-01-11T10:00Z` | required | `PASS` | contract or implementation source changes |
| `EV-02-REV-v2` | `N-02`, `AG-02` | `2` | `2` | `CONTRACT@v2`, `EV-02-CMD-v2` | `example-b2` | independent reviewer | `2026-01-11T10:10Z` | required | `PASS` | reviewed commit or command evidence changes |
| `EV-02-LIVE-v2` | `N-02`, `AG-02` | `2` | `2` | `CONTRACT@v2` | not applicable | live probe | `2026-01-11T10:10Z` | optional | `NOT_RUN`; no live environment | optionality or live requirement changes |
| `EV-03-v2` | `N-03`, `AG-03` | `2` | `2` | `CONTRACT@v2` | `example-c2` | documentation checker | `2026-01-11T10:15Z` | required | `PASS` | contract or guide changes |
| `EV-05-CMD-v2` | `N-05`, `AG-05` | `2` | `2` | `BUILD@v2`, `GUIDE@v2`, `POLICY@v1`, `MIGRATION@v1`, `EV-UP-v4` | `example-e2` | integration validator | `2026-01-11T11:00Z` | required | `PASS` | any named input or source changes |
| `EV-05-REV-v2` | `N-05`, `AG-05` | `2` | `2` | `EV-05-CMD-v2` | `example-e2` | independent reviewer | `2026-01-11T11:10Z` | required | `PASS` | reviewed commit or integration evidence changes |
| `EV-06-v1` | `N-06`, `AG-06` | `2` | `1` | `CONTRACT@v2` | `example-f1` | documentation checker | `2026-01-11T10:20Z` | required | `PASS` | contract or migration note changes |
| `EV-RISK-v2` | `TG-01` | `2` | `1` | accepted `AG-01` through `AG-06` | `example-terminal2` | example lane owner | `2026-01-11T11:15Z` | required | `PASS` | any required gate or residual-risk statement changes |

### Transition History

The rows retain the control transitions needed to reconstruct the blocked
state, amendment, repair, and final acceptance. The readiness walks below show
the complete legal state sequence used for each execution.

| Transition ID / Time | Subject | Prior -> Next | Recorded By | Preconditions | Receipt / Evidence | Invalidation Condition | Failure / Resume Route |
|---|---|---|---|---|---|---|---|
| `TR-01 / 2026-01-10T09:05Z` | `N-01` | `REVIEW -> ACCEPTED` | example lane owner | `AG-01` accepted | `R-N01-v1`, `EV-01-v1` | contract input changes | return to `PENDING` |
| `TR-04 / 2026-01-10T09:10Z` | `N-02` | `PENDING -> BLOCKED` | example lane owner | `EXT-01` absent | blocker `APR-01` | approval recorded | return to `PENDING`, recalculate |
| `TR-05 / 2026-01-10T09:30Z` | `N-02` | `BLOCKED -> PENDING` | example lane owner | `APR-01` recorded | condition `EXT-01` | approval expires | recalculate, then `READY` only if all checks pass |
| `TR-07 / 2026-01-10T10:12Z` | `N-04` | `REVIEW -> ACCEPTED` | example lane owner | `AG-04` accepted | `R-N04-v1`, `EV-04-v1` | boundary input changes | return to `PENDING` |
| `TR-10 / 2026-01-10T11:15Z` | `TG-01` | `OPEN -> ACCEPTED` | example lane owner | `AG-01` through `AG-05` accepted in revision 1 | `EV-RISK-v1` | any input gate reopens | return to `OPEN` |
| `TR-11 / 2026-01-11T08:30Z` | `TG-01` | `ACCEPTED -> OPEN` | example lane owner | `AM-01` invalidates inputs | `RP-01` | all current revision-2 inputs pass | reevaluate after affected repair |
| `TR-12 / 2026-01-11T08:30Z` | `N-01`, `N-02`, `N-03`, `N-05` | `ACCEPTED -> PENDING` | example lane owner | `AM-01` and `RP-01` identify stale bindings | invalidated revision-1 evidence | replacement evidence becomes stale | resume from `N-01`; preserve `N-04` |
| `TR-13 / 2026-01-11T09:05Z` | `N-01` | `REVIEW -> ACCEPTED` | example lane owner | reopened `AG-01` accepts current evidence | `R-N01-v2`, `EV-01-v2` | contract input changes | return to `PENDING` |
| `TR-16 / 2026-01-11T10:12Z` | `N-02` | `REVIEW -> ACCEPTED` | example lane owner | evidence join `AG-02` accepts both required inputs | `R-N02-v2`, `EV-02-CMD-v2`, `EV-02-REV-v2` | any required binding changes | return to `PENDING`; reopen `N-05` |
| `TR-19 / 2026-01-11T10:17Z` | `N-03` | `REVIEW -> ACCEPTED` | example lane owner | reopened `AG-03` accepts | `R-N03-v2`, `EV-03-v2` | contract or guide changes | return to `PENDING`; reopen `N-05` |
| `TR-22 / 2026-01-11T10:22Z` | `N-06` | `REVIEW -> ACCEPTED` | example lane owner | new `AG-06` accepts | `R-N06-v1`, `EV-06-v1` | contract or migration note changes | return to `PENDING`; reopen `N-05` |
| `TR-25 / 2026-01-11T11:12Z` | `N-05` | `REVIEW -> ACCEPTED` | example lane owner | `AG-02`, `AG-03`, `AG-04`, `AG-06`, and `XL-01` current; `AG-05` accepts | `R-N05-v2`, `EV-05-CMD-v2`, `EV-05-REV-v2` | any named input changes | return to `PENDING` |
| `TR-26 / 2026-01-11T11:16Z` | `TG-01` | `OPEN -> ACCEPTED` | example lane owner | all revision-2 per-node gates accepted | `EV-RISK-v2` | any required gate/evidence reopens | terminal has no consumer; reopen only affected inputs |

### Repair History

| Repair ID / Time | Failure Class / Cause | Failed Evidence / Input | Earliest Responsible Node | Reopened Nodes / Gates | Preserved Accepted IDs | Versions / Attempt / Revisions | Deterministic Resume Route |
|---|---|---|---|---|---|---|---|
| `RP-01 / 2026-01-11T08:30Z` | stale evidence after material contract amendment | `CONTRACT@v1`; `EV-01-v1`, `EV-02-CMD-v1`, `EV-02-REV-v1`, `EV-03-v1`, `EV-05-CMD-v1`, `EV-05-REV-v1`, `EV-RISK-v1` | `N-01` | `N-01`, `N-02`, `N-03`, `N-05`; `AG-01`, `AG-02`, `AG-03`, `AG-05`, `TG-01`; new `N-06`/`AG-06` start pending/open | `N-04`, `AG-04`, `EV-04-v1`; source `SRC-03` | affected existing nodes move to attempt 2; plan `2`; graph `1 -> 2` | resume `N-01` from `PENDING`; after `AG-01`, run ready `N-02`, `N-03`, `N-06`; then `N-05`; reevaluate terminal |

### Graph Amendment History

| Amendment ID / Time | Prior -> Next Revision | Reason | Changed Nodes / Edges / Actors / Owners / Gates | Stable New / Replacement IDs | Preserved Evidence | Invalidated Evidence | Affected Consumers | Recomputed Frontier |
|---|---|---|---|---|---|---|---|---|
| `AM-01 / 2026-01-11T08:30Z` | `1 -> 2` | request adds `CONTRACT@v2` and a required migration note | change inputs for `N-01`, `N-02`, `N-03`, `N-05`; add `N-06 -> AG-06 -> N-05`; add `AG-06 -> TG-01` | new `N-06`, `AG-06`; all prior IDs retained, none reused | `EV-04-v1`, `N-04`, `AG-04`, `EV-UP-v4`, `APR-01` | `EV-01-v1`, `EV-02-CMD-v1`, `EV-02-REV-v1`, `EV-03-v1`, `EV-05-CMD-v1`, `EV-05-REV-v1`, `EV-RISK-v1` | reopen `N-01`, `N-02`, `N-03`, `N-05`; add `N-06`; reopen affected gates and terminal | `N-01` ready; `N-02`, `N-03`, `N-05`, `N-06` pending; `N-04` accepted |

### Current Frontier (Derived)

- Graph revision / plan revision: `2 / 2`.
- Ready, in progress, in review, blocked, or failed: none.
- Accepted: `N-01` through `N-06`.
- Accepted gates: `AG-01` through `AG-06` and `TG-01`.
- Open or unresolved joins: none.
- Conditions: `EXT-01` and `XL-01` are satisfied and current.
- Next executable node: none; the example terminal is accepted.
- Projection reconciliation: `CURRENT` against the Task Graph, gates,
  `AM-01`, `RP-01`, and Transition History.

## Typed Edge List And Acyclic Inspection

| From | Edge Type | To |
|---|---|---|
| `N-01` | producer gate | `AG-01` |
| `AG-01` | required gate | `N-02` |
| `N-01` | required node | `N-03` |
| `N-01` | required node | `N-06` |
| `EXT-01` | external approval | `N-02` |
| `N-02` | producer gate | `AG-02` |
| `N-03` | producer gate | `AG-03` |
| `N-04` | producer gate | `AG-04` |
| `N-06` | producer gate | `AG-06` |
| `AG-02` | required gate | `N-05` |
| `AG-03` | required gate | `N-05` |
| `AG-04` | required gate | `N-05` |
| `AG-06` | required gate | `N-05` |
| `XL-01` | cross-lane condition | `N-05` |
| `N-05` | producer gate | `AG-05` |
| `AG-01` | terminal input | `TG-01` |
| `AG-02` | terminal input | `TG-01` |
| `AG-03` | terminal input | `TG-01` |
| `AG-04` | terminal input | `TG-01` |
| `AG-05` | terminal input | `TG-01` |
| `AG-06` | terminal input | `TG-01` |

Inspection result: 15 subjects, 21 directed edges, no back edge, no duplicate
node or gate ID, and a topological order exists:

`N-01, N-04, EXT-01, XL-01 -> AG-01, AG-04, N-03, N-06 -> N-02, AG-03, AG-06 -> AG-02 -> N-05 -> AG-05 -> TG-01`.

`TG-01` has outdegree `0`. No node consumes it, and it does not accept a
producer that is needed by another input to the same terminal gate.

## End-To-End Readiness Walk

1. In graph revision 1, `N-01` and `N-04` have no prerequisites and become
   `READY`. Each follows `READY -> IN_PROGRESS -> REVIEW`; its per-node gate
   accepts current evidence before the node becomes `ACCEPTED`.
2. `N-03` becomes ready because its required node `N-01` is accepted. `N-02`
   does not become ready: `EXT-01` is absent, so the lane owner records
   `PENDING -> BLOCKED` in `TR-04`. This block does not affect `N-03` or `N-04`.
3. `APR-01` satisfies `EXT-01`. The owner records `BLOCKED -> PENDING`,
   recalculates readiness, and only then moves `N-02` through execution to
   `REVIEW`. `AG-02` accepts only after both required evidence inputs pass;
   optional `EV-02-LIVE-v1` being not run cannot replace them.
4. With `AG-02`, `AG-03`, and `AG-04` accepted and cross-lane `XL-01` current,
   `N-05` becomes ready, produces its receipt, passes `AG-05`, and becomes
   accepted.
5. Revision-1 `TG-01` accepts the five then-current per-node gates and has no
   consumer. Output receipts alone never unlocked the next step.
6. After `AM-01` and the revision-2 repair described below, `N-06` and
   `AG-06` join the graph. All six per-node gates become accepted before the
   final `TG-01` transition in `TR-26`.

## Stale-Evidence And Partial-Repair Walk

1. `SRC-01` changes from `request-v1` to `request-v2`; the new contract also
   requires a migration note. Because topology and a gate change, the lane
   owner records `AM-01` and increments graph revision `1 -> 2` rather than
   treating the change as an ordinary retry.
2. Evidence bound to `CONTRACT@v1` becomes stale. `AG-01`, `AG-02`, `AG-03`,
   `AG-05`, and `TG-01` reopen. `N-01`, `N-02`, `N-03`, and `N-05` return to
   `PENDING`; new `N-06` starts `PENDING`. The owner records the exact set in
   `RP-01`.
3. `N-04`, `AG-04`, and `EV-04-v1` remain accepted because their
   `SRC-03@boundary-v1` input, scope, contract, and evidence did not change.
   This is the preserved side of the partial repair.
4. Repair resumes at earliest responsible `N-01`. Once `AG-01` accepts
   `EV-01-v2`, readiness fans out to `N-02`, `N-03`, and `N-06`; each produces
   current evidence and passes its own gate.
5. `N-05` remains pending until `AG-02`, `AG-03`, preserved `AG-04`, new
   `AG-06`, and `XL-01` are all current. It then reruns against the complete
   revision-2 inputs and passes `AG-05`.
6. `TG-01` reaccepts only after all six current per-node gates and
   `EV-RISK-v2` pass. No unrelated accepted work was rerun, and the terminal
   still has no consumer.

## Validation Snapshot

| Check | Evidence | Status |
|---|---|---|
| Stable identity | `N-01` through `N-06`; `AG-01` through `AG-06`; `TG-01`; amendment adds rather than reuses IDs | `PASS` |
| Typed dependencies | node, gate, external, and cross-lane edges are separate | `PASS` |
| Acyclic terminal shape | explicit edge inspection; `TG-01` outdegree `0` | `PASS` |
| Review versus acceptance | every node receipt reaches `REVIEW` before its gate accepts it | `PASS` |
| Block and resume | `TR-04`, `TR-05`, `EXT-01` | `PASS` |
| Partial repair and stale evidence | `AM-01`, `RP-01`, revision-2 repair walk | `PASS` |
| Active-registry isolation | this file is linked only from the examples index | `PASS` |

Residual risk: this packet demonstrates instruction-driven state recording; it
does not provide executable scheduling or deterministic Markdown enforcement.
