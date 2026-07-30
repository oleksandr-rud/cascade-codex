# Work Graph Reconciliation Checklist

## Authority And Scope

- [ ] The request concerns existing active lanes, worklines, or Coordination
      Graphs; new-request discovery remains with `orchestrate-work`.
- [ ] The requested mode is explicit: audit only, graph create/update, or
      reconciliation handoff.
- [ ] The current plan revision, graph revision, prior authority, and proposed
      coordination-state/materialization owner are identified.
- [ ] Changed outcomes, criteria, boundaries, topology, gates, or owners are
      routed through `plan-change` rather than silently rewritten.

## Complete Inventory

- [ ] `docs/work/active.md`, every referenced lane packet, existing graph and
      graph index row, relevant report, receipt, and evidence record were read.
- [ ] Current implementation, source/input versions, diff, branches,
      worktrees, ancestry or immutable transport, and ownership were checked
      where they affect currency.
- [ ] Every inbound workline, graph, gate, materialization, batch, terminal,
      report, and evidence reference was inventoried.
- [ ] IDs, aliases, revisions, owners, gate subjects, and source references
      were normalized without inventing missing authority.
- [ ] Age, title similarity, missing recent activity, or an active-row label
      was not treated as sufficient proof of duplication, staleness, or
      completion.

## Duplicate And Drift Audit

- [ ] Every duplicate candidate was compared by intended outcome.
- [ ] Acceptance criteria and primary criterion owners were compared.
- [ ] Write scope, output contracts, and produced artifacts were compared.
- [ ] Evidence and validation boundaries were compared.
- [ ] Consumers, dependencies, and invalidation obligations were compared.
- [ ] Partial overlap was routed to `UPDATE` or `plan-change`, not silently
      collapsed.
- [ ] Unique criteria, constraints, references, dependencies, consumers, and
      evidence are assigned a migration or retention target before any merge
      or supersession.

## Dispositions And Retention

- [ ] Every inspected record has exactly one of `KEEP`, `UPDATE`,
      `MERGE_INTO <W-ID>`, `SUPERSEDE_BY <W-ID>`, `RETIRE_ACTIVE_ROW`, or
      `BLOCKED_REVIEW`.
- [ ] Every `MERGE_INTO` names a canonical survivor and means workline identity
      consolidation, not Git merge or materialization.
- [ ] Every `SUPERSEDE_BY` retains the prior packet, revisions, reports,
      receipts, and evidence as history.
- [ ] Every `RETIRE_ACTIVE_ROW` has completion evidence, resolved dependencies,
      checked inbound references, and a `closeout` owner.
- [ ] No durable packet, graph revision, report, receipt, or evidence is marked
      for deletion merely because its active projection is stale or complete.
- [ ] No permanent `CLOSED` active-row status is proposed.
- [ ] Every unresolved `BLOCKED_REVIEW` prevents cutover for its affected
      workline.

## Canonical Survivor And Graph Gate

- [ ] Every unique obligation and request criterion has one canonical
      surviving owner.
- [ ] At least two survivors have a real dependency, evidence/batch join,
      materialization or integrated-validation boundary, invalidation
      relationship, or partial-repair route; otherwise the result is
      `NO_CHANGE`/no graph.
- [ ] Graph, workline, edge, gate, receipt, and evidence IDs are unique,
      stable, and never reused.
- [ ] Every workline, edge endpoint, dependency, gate, evidence subject, and
      consumer resolves to a canonical authority; there are no dangling refs.
- [ ] Typed edges are acyclic and transitions, invalidation, failure, repair,
      and resume destinations are defined.
- [ ] One coordination-state/materialization owner is authoritative; shared
      writes name the accepted materialization owner.
- [ ] Plan and graph revisions, direct-cutover record, preserved/invalidated
      evidence, affected consumers, and recomputed frontier are explicit.
- [ ] The graph uses `docs/work/graph-template.md` and does not invent a second
      schema or duplicate rich definitions from product/source/generated
      documents.
- [ ] After cutover, lane packets, plans, reports, active rows, and boards are
      references or derived projections, not competing graph authorities.

## Output And Handoff

- [ ] The output includes the version-bound inventory, five-axis comparison
      matrix, disposition ledger, survivor set, migrated-reference ledger,
      invalidation set, graph delta, proposed transitions, and next gate.
- [ ] Graph action is exactly `CREATE`, `UPDATE`, `NO_CHANGE`, or `BLOCKED`.
- [ ] Required checks distinguish structural validity from execution,
      materialization, batch evaluation, judgment, and terminal acceptance.
- [ ] Registry retirement is handed to `closeout`; execution, dispatch,
      materialization, or batch work is handed to `orchestrate-work`.
- [ ] No graph operation implied worktree creation, automatic mutation,
      branch merge, commit, broad staging, push, or publication.
