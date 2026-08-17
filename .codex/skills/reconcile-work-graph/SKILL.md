---
name: reconcile-work-graph
description: Use when existing active lanes, worklines, or Coordination Graphs must be audited, deduplicated, reconciled, migrated, or retired before creating or updating a Coordination Graph.
---

# Reconcile Work Graph

Use this skill for existing work records whose identity, currency, ownership,
or cross-workline relationships must be established before a first-class
Coordination Graph can become authoritative.

Reconciliation is audit-first. It does not prioritize slices into delivery
horizons or turn future roadmap candidates into active work. Do not create or
update a Coordination Graph until the audit produces a valid canonical survivor
set. This skill does not discover worklines for a new request, schedule or
dispatch work, implement product changes, mutate worker-owned lane state,
delete durable evidence, or retire active rows.

## Source Order

1. Latest user request, active goal, and explicit cleanup or graph scope.
2. `docs/work/graph-template.md`, `docs/work/graphs/_index.md`, relevant
   `docs/work/graphs/CG-*.md`, and
   `docs/patterns/workflow/graph-shaped-work.md`.
3. `docs/work/active.md` and every referenced `docs/work/lanes/*.md` packet.
4. Relevant `docs/work/reports/`, receipts, evidence, revisions, and inbound
   workline or graph consumers.
5. Current implementation, diff, source versions, branches, worktrees, and Git
   ancestry or transport identities when they affect current ownership.
6. `docs/work/_index.md`, `docs/structure.md`, and
   `docs/patterns/workflow/index.md`.
7. `context`, `orchestrate-work`, `plan-change`, and `closeout` skill contracts.

Do not infer current state from an active-row label, title similarity, age, or
the absence of recent activity. Current source, version-bound evidence, owner
records, and live branch/worktree state take precedence over stale projections.

## Routing Boundary

| Need | Route |
|---|---|
| Define implementation slices for a new request | `plan-change` |
| Rank slices, assign delivery dispositions, and trace MVP coverage | `plan-iterations` |
| Instantiate, connect, or schedule committed-horizon worklines | `orchestrate-work` |
| Audit already materialized lanes/worklines/graphs before graph creation or cutover | `reconcile-work-graph` |
| Change outcomes, criterion ownership, workline boundaries, topology, gates, or owner contracts | `plan-change` |
| Dispatch ready work, coordinate worktrees, or run materialization and batch gates | `orchestrate-work` |
| Remove a completed row from `docs/work/active.md` after evidence retention | `closeout` |
| Compact and move an already closed lane/graph/report set out of `docs/work/` | `archive-work` |
| Repair stale automated tests while product behavior is correct | `test-autorepair` |
| Remove duplicate code or runtime pathways | `architecture-review -> plan-change -> implement-change` |

For an ambiguous request to "connect worklines," use this skill only when the
worklines already exist and need evidence-backed reconciliation. Use
`orchestrate-work` when the request still needs decomposition or initial
workline selection.

When iteration planning would change existing active work, use this skill first
to establish canonical identities, evidence, and consumers. Return the survivor
set to `plan-iterations`; do not assign horizons as a reconciliation
disposition.

## Audit And Canonicalization

1. Inventory the active registry, lane packets, existing Coordination Graphs,
   reports, source/input versions, current implementation, branches,
   worktrees, receipts, evidence, and every inbound consumer or dependency.
2. Normalize stable IDs, aliases, revisions, owners, gate subjects, and source
   references. Record uncertainty; never invent an identity to make the graph
   appear complete.
3. Compare each possible duplicate across all of these axes:
   - intended outcome;
   - acceptance criteria and their primary owners;
   - write scope, output contracts, and produced artifacts;
   - evidence and validation boundary; and
   - consumers, dependencies, and invalidation obligations.
4. Treat titles and names as discovery hints only. A true duplicate has the
   same outcome and compatible or subset obligations across the remaining
   axes. Partial overlap is not enough to merge; classify it as `UPDATE` or
   route a boundary decision through `plan-change`.
5. Give every inspected workline or record exactly one disposition:

| Disposition | Required meaning and action |
|---|---|
| `KEEP` | Current, distinct, and independently necessary; retain as a canonical survivor. |
| `UPDATE` | Still necessary, but a projection, reference, binding, or version is stale; name the authority and update owner. |
| `MERGE_INTO <W-ID>` | True duplicate; migrate every unique criterion, dependency, evidence reference, and consumer to the named survivor before consolidation. This is workline identity consolidation, not Git merge or materialization. |
| `SUPERSEDE_BY <W-ID>` | A newer authority replaces the workline; preserve the prior packet, revisions, reports, receipts, and evidence as historical records. |
| `RETIRE_ACTIVE_ROW` | Work is complete, dependencies are resolved, and durable evidence is already preserved; propose registry retirement through `closeout`. |
| `BLOCKED_REVIEW` | Authority, ownership, evidence, overlap, or consumer impact cannot be resolved safely; block graph cutover for the affected workline. |

6. Before `MERGE_INTO`, `SUPERSEDE_BY`, or `RETIRE_ACTIVE_ROW`, inspect all
   inbound references and record what must migrate, remain historical, or be
   invalidated. Never delete a lane packet, graph revision, report, receipt, or
   evidence because its active projection is stale, duplicate, superseded, or
   complete.
7. Establish the canonical survivor set only after every inspected record has
   a supported disposition and every unique obligation has one surviving
   owner. Unresolved `BLOCKED_REVIEW` rows prevent cutover.

Use `checklists/reconciliation.md` for the fixed-point audit and cutover gate.

## Coordination Graph Gate

Create or update a graph matching `docs/work/graphs/CG-*.md` from
`docs/work/graph-template.md` only when the request authorizes that write and
all of these checks pass:

- at least two canonical worklines have a qualifying dependency, evidence or
  batch join, materialization/integrated-validation boundary, invalidation
  relationship, or partial-repair route;
- stable graph, workline, edge, gate, receipt, and evidence IDs are unique and
  never reused;
- every workline, dependency endpoint, gate, evidence subject, and inbound
  consumer resolves to a canonical authority;
- typed edges are acyclic and every gate, transition, failure, invalidation,
  and resume destination is defined;
- one coordination-state/materialization owner is authoritative, and shared
  writes name the accepted materialization owner;
- plan and graph revisions, cutover authority, preserved/invalidated evidence,
  and affected consumers are explicit; and
- rich source/spec definitions stay in their owner documents and appear only
  as stable references, versions, and dependency-relevant projections.

Use direct cutover. After it is accepted, do not preserve a second
authoritative cross-workline graph in lane packets, plans, reports, or status
boards. `docs/work/active.md` and lane rows remain derived projections.

Creating the file does not schedule work, mutate graph state automatically,
create worktrees, run batches, materialize changes, merge branches, commit,
push, or publish. Only the named coordination-state owner applies
authoritative transitions and graph revisions.

## Mutation And Retention Rules

- Default to an audit and proposed disposition map. Write a Coordination Graph
  only when graph creation/update is in scope and the canonicalization gate
  passes.
- Route changed definitions, workline boundaries, criteria, topology, gates,
  or owners through `plan-change` before recording the resulting graph
  revision.
- Route actual `RETIRE_ACTIVE_ROW` actions through `closeout`. That route must
  prove completion, resolve dependencies, preserve durable evidence, and
  remove the row instead of inventing a permanent `CLOSED` status.
- Route physical compaction of an already closed artifact set through
  `archive-work`. Reconciliation must resolve duplicate, stale, superseded, or
  conflicting identity before archival eligibility can pass.
- Preserve unrelated accepted work and current evidence. Invalidate only the
  consumers whose named inputs, authority, bindings, or versions changed.
- Never turn an untrusted worker receipt, stale projection, or completion
  claim into accepted graph state.

## Output

- version-bound inventory of active rows, lanes, graphs, reports, source,
  worktree/branch state, receipts, evidence, and inbound consumers;
- comparison matrix covering outcome, criteria, writes/outputs, evidence, and
  consumers for every duplicate candidate;
- disposition ledger with rationale, canonical target, migrated or retained
  content, action owner, and evidence;
- canonical survivor set plus unresolved blockers;
- migrated-reference ledger and invalidation set;
- graph action: `CREATE`, `UPDATE`, `NO_CHANGE`, or `BLOCKED`, with plan/graph
  revision and direct-cutover delta when applicable;
- topology, authority, binding, and retention validation results; and
- proposed transitions and next routes to `plan-change`, `plan-iterations`,
  `orchestrate-work`, `validate-change`, or `closeout`.
