# Work state and coordination

Start with one inline slice. Create durable state only when work must survive
tasks, cross owners, carry a real dependency, or join independently accepted
evidence.

For a request to check current work, run the read-only projection first:

```bash
npx --offline --yes bun@1.3.3 scripts/cascade.ts work audit --json --check
```

Read only the named lanes or graph needed to explain a collision, blocker,
handoff, or acceptance decision. Do not scan every report or revision.

Use `docs/work/active.md` as the current registry. Advanced Task Graph and
Coordination Graph states, joins, revisions, and partial repair live in
`docs/patterns/workflow/graph-shaped-work.md`. A graph is declarative and never
permission or automatic dispatch.

| Execution surface | Authority |
|---|---|
| `root` | Current scoped request |
| `internal-subagent` | Explicit delegation or parallel-agent authorization |
| `user-visible-task` | Explicit request to create, open, or fork a task |

A request to refresh a named active record permits a read-only audit and
in-scope local status synchronization. Mark it complete only when current
source, dependencies, criteria, and required validation pass. Historical,
partial, candidate-branch, blocked, or `NOT_RUN` evidence stays open.

Closeout may retire an accepted active projection. Archival is explicit and is
never an automatic closeout chain.
