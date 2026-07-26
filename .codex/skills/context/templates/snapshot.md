# Context Snapshot

Date: YYYY-MM-DD
Plan Revision: `<REVISION_OR_NONE>`
Graph Applicability: `<GRAPH_REQUIRED | ATOMIC_BYPASS | NOT_EVALUATED>`
Graph Revision: `<REVISION_OR_NONE>`

## Work

- Active lanes:
- Connected worklines:
- Status:
- Criteria met:

## Compact Planning Context

- Authoritative sources and freshness:
- Accepted definitions and decisions:
- Negative constraints and non-goals:
- Assumptions and open questions:
- Superseded or invalidated knowledge:

## Branch

- Branch:
- Working tree:
- Recent commits:

## Last Session

- Last gate:
- Open loops:
- Drift risk:

## Workline State

| Workline / Node | Outcome | Typed Requires | Input Versions / Attempt | Produces | Evidence State | Blocker / Drift | Next Gate |
|---|---|---|---|---|---|---|---|
| `<WL_OR_NODE_ID>` | `<OUTCOME>` | `<NODES_GATES_EXTERNAL>` | `<VERSIONS_ATTEMPT_MAX>` | `<OUTPUT_RECEIPT>` | `<STATUS>` | `<BLOCKER_OR_NONE>` | `<GATE>` |

## Graph State When Applicable

- Lane-state owner and ownership-handoff status:
- Authoritative Task Graph / gate / amendment / transition-repair sources:
- Derived frontier before reconciliation:
- Recomputed frontier and next ready node:
- Rejected duplicate/cycle/open-definition/transition conditions:
- Cross-lane producer lane, lane-scoped gate, evidence version, merge owner,
  and invalidation route:
- Worker receipts or conflicting proposals retained as evidence/history:

## Rehydration Check

- Current and preserved:
- Changed or added:
- Invalidated or superseded:
- Unknown freshness:

## Backlog Pressure

- P0/P1 items:
- Relevant blockers:

## Gaps Detected

- Missing work registry:
- Missing scenarios:
- Missing validation evidence:
- Other:

## Next Entry Point

`context | ingest-spec | discover | docs-impact-map | pattern-context | orchestrate-work | plan-change | functional-qa | implement-change | review-change | validate-change | test-autorepair | issue-intake | closeout`
