# Work Lane Examples

This folder contains optional copyable reference packets. Examples are never
active work unless copied into `docs/work/lanes/` and registered separately in
`docs/work/active.md`.

- [`graph-shaped-lane.md`](graph-shaped-lane.md): non-active graph-shaped lane
  with typed dependencies, evidence joins, blocked readiness, bounded repair,
  revision history, and a terminal aggregate.
- [`coordination-graph.md`](coordination-graph.md): non-active first-class
  Coordination Graph connecting dedicated-worktree worklines through immutable
  transport identities, materialization into an active worktree without an
  automatic commit, batch evaluation, integrated validation, reconciliation,
  and bounded repair.

When adding an example, keep it project-neutral and use it to show:

- when a row in `docs/work/active.md` is enough;
- when a full lane packet prevents missed context;
- how to record source inputs across specs, product, design, brand, work, and
  backlog docs;
- how to declare file ownership before parallel work starts;
- how to scope MCP/tool usage, especially Context7-style documentation lookup;
- how to write handoff and merge evidence so another agent can safely continue.
- when to keep a Task Graph lane-local versus create a separate Coordination
  Graph, and how to avoid dual authority after cutover;
- how to distinguish immutable producer transport, active-worktree HEAD plus
  combined diff, worker-local evidence, and integrated acceptance.
