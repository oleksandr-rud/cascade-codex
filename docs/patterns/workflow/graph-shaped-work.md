# Graph-Shaped Work

Use these rules when connected obligations or worklines have readiness,
evidence, repair, handoff, or integration state that cannot be represented
safely as a linear checklist. A lane packet may own one lane-local Task Graph;
a separate `docs/work/graphs/CG-XXX-slug.md` entry may own one cross-workline
Coordination Graph. This document owns reusable semantics only; it is never
active task state.

## Graph-Shaped Work

Graph-shaped coordination augments Cascade's existing skill routes and local
model/tool loops. Skills still plan, implement, review, validate, repair, and
close work. A Task Graph records bounded obligations inside one lane. A
Coordination Graph connects two or more worklines across ownership, evidence,
worktree, materialization, invalidation, or terminal-acceptance boundaries.
Neither graph is a scheduler, worker, source spec, or substitute for a lane.

Context-pack metadata selects these rules but does not redefine them or store
live state. Changing reusable graph semantics invalidates affected skill,
template, pack-metadata, and evaluation consumers; refresh those consumers
against this document before relying on them again. Retrieval metadata never
becomes semantic authority.

A lane is one independently tracked workstream with one owner, scope,
integration boundary, and terminal validation boundary. Use a lane-local Task
Graph when a lane has several connected obligations and at least one of these
conditions:

- work has prerequisite, evidence-gate, or external-condition dependencies;
- independent work may proceed in parallel but must join before a consumer;
- evidence failure should repair a bounded subset instead of restarting all
  work;
- topology, ownership, or evidence bindings may change across handoff;
- the current frontier would otherwise be ambiguous after compaction or resume.

Atomic work may omit graph-shaped sections. A one-file mechanical edit or
another single obligation with no useful dependency or repair structure still
follows normal planning, permission, review, validation, and closeout rules.
Do not create nodes merely to mirror every skill invocation or prose step.

Use a Coordination Graph only when there are at least two real worklines and
at least one cross-workline dependency, evidence join, materialization or
integrated-validation boundary, invalidation relationship, or partial-repair
route. Several unrelated worklines do not justify a graph. Product, design,
brand, source, and generated spec documents never receive graph boilerplate;
the graph references their stable IDs, versions, and owner paths instead.

These mechanics are instruction-driven. They do not schedule work, lock state,
parse Markdown into an executable graph, provide transactions, or replace
model reasoning and tool-use loops. Any runtime, scheduler, compiler, parser,
database, or deterministic enforcement proposal requires a separate approved
plan.

Definition coverage: `DEF-01`, `DEF-12`, `DEF-13`. Boundary coverage:
`BND-01`.

## Graph State Authority

Each node is one bounded obligation with a lane-scoped, stable ID that is never
reused, including after supersession. A node declares one actor/type,
named/versioned inputs, expected output receipt, write scope, required tools
and permissions, attempt/maximum, repair and exhaustion routes, and one
per-node acceptance gate. Gate IDs are also stable and never reused.

One lane-state owner records authoritative transitions. Workers and evidence
producers return version-bound receipts or proposed transitions; producing an
artifact or reporting completion does not authorize them to mutate shared lane
state, accept a node or gate, update a derived status board, or materialize or
integrate work.
Conflicting proposals remain evidence/history while the owner records one
reconciled transition.

Every ordinary worker-output or proposed-transition receipt binds a stable
receipt ID; its node, workline, and gate subject as applicable; plan and graph
revision; attempt; named inputs and source versions; source commit or digest;
producer and thread; production time; outputs and evidence references; and
invalidation conditions. A receipt missing a required binding remains an
untrusted proposal rather than current lane state.

Transferring lane-state ownership increments graph revision and blocks every
authoritative mutation until an explicit handoff acceptance records the new
owner and revision. Workers may preserve output or proposals during the block,
but neither prior nor incoming owner may record transitions before that
handoff completes.

The lane's Task Graph, evidence-gate records, latest graph amendment, and
transition/repair history are authoritative lane-local state. Current
Frontier, status boards, and the active-work registry are derived projections.
When a Coordination Graph exists, its cross-workline records and
materialization queue are authoritative only in the separate `CG-XXX` entry;
lane rows and the active registry reference that authority. Recompute a
drifting projection from authoritative state before execution.

Node states and legal next states are:

| State | Meaning | Legal next states |
|---|---|---|
| `PENDING` | Readiness preconditions are incomplete or must be recalculated. | `READY`, `BLOCKED`, `SUPERSEDED` |
| `READY` | Every declared readiness condition is current and satisfied. | `IN_PROGRESS`, `BLOCKED`, `SUPERSEDED` |
| `IN_PROGRESS` | The assigned actor is executing within the declared bounds. | `REVIEW`, `FAILED`, `BLOCKED`, `SUPERSEDED` |
| `REVIEW` | The expected output exists but its per-node gate has not accepted it. | `ACCEPTED`, `FAILED`, `BLOCKED`, `SUPERSEDED` |
| `ACCEPTED` | The required current evidence join passed. | `PENDING` only after input or evidence invalidation; otherwise terminal |
| `FAILED` | Execution or acceptance evidence identifies a failed obligation. | `PENDING`, `BLOCKED`, `SUPERSEDED` |
| `BLOCKED` | A named precondition, permission, decision, exhaustion, or environment boundary prevents progress. | `PENDING` after recorded resolution and readiness recalculation, or `SUPERSEDED` |
| `SUPERSEDED` | A later graph revision replaced unfinished work. | terminal |

Gates use `OPEN`, `ACCEPTED`, `FAILED`, and `BLOCKED`; their evidence-bound
legal transitions and reopen routes are defined under Evidence Gates below.

Every transition record names the transition owner, prior and next state,
preconditions, the governing receipt and evidence identities, invalidation
condition, and a deterministic failure or resume route. A failed or unblocked
node returns to `PENDING` for readiness recalculation; it never skips directly
to `READY`. Producing the expected output moves an `IN_PROGRESS` node to
`REVIEW`. Only its accepted per-node gate authorizes `REVIEW -> ACCEPTED`.

Definition coverage: `DEF-02`, `DEF-04`, `DEF-06`, `DEF-07`, `DEF-14`.
Boundary coverage: `BND-02`, `BND-03`.

## Dependency Readiness

Represent dependency types in separate fields:

- **Requires Nodes** contains prerequisite node IDs whose state must be
  `ACCEPTED`.
- **Requires Gates** contains acceptance-gate IDs whose state must be
  `ACCEPTED`.
- **External Conditions** contains named permissions, decisions, environment
  state, or cross-lane conditions with an authority and freshness rule.

Do not combine these into an untyped dependency list. Reject a topology that
reuses an ID, references an undefined transition or resume destination, or
contains a dependency cycle. Per-node gates accept one producer. Aggregate and
terminal gates may combine already accepted producers, but a producer or its
consumer must not depend on an aggregate gate that also requires that same
producer or consumer.

A node is `READY` only when all of the following are true:

1. every required node and gate is `ACCEPTED`;
2. every external condition is explicitly satisfied and current;
3. every named/versioned input exists and remains current;
4. objective, actor/type, output receipt, write scope, per-node gate,
   attempt/maximum, repair route, and exhaustion route are defined;
5. no unresolved product, design, ownership, permission, or environment
   blocker applies;
6. write scope is disjoint from active work or one integration owner is declared;
7. required tools and permissions are available;
8. paid/live or externally mutating work has explicit tool, cost, permission,
   idempotency, and cleanup bounds;
9. no later graph revision has superseded the node.

Recalculate readiness after an accepted result, blocker change, repair,
evidence invalidation, cross-lane change, or graph amendment. A completed
worker turn, available output, or passing evidence from another input version
does not satisfy readiness.

Definition coverage: `DEF-03`, `DEF-05`, `DEF-14`, `DEF-15`. Boundary
coverage: `BND-02`, `BND-06`.

## Evidence Gates

An evidence receipt records a stable evidence ID, subject node/gate, graph
revision, node attempt, input/source versions, source commit or digest when
available, producer, production time, requirement level, result, and
invalidation condition. Evidence without enough identity or evaluator
authority is `GAP`, not acceptance evidence.

Each gate names its required and optional evidence, evidence producers,
acceptance criteria, and evaluator/reviewer authority. Worker output never
self-accepts. Preserve independent review when the owning review, security, or
public-contract workflow requires it, and keep Standards/Spec findings,
functional evidence, command results, and semantic judgments as distinct gate
inputs.

Evidence results retain their existing meanings:

- required `PASS` contributes to acceptance;
- `FAIL` fails the join and identifies the responsible producer or contract;
- `BLOCKED` prevents the join from closing until its named precondition exists;
- `GAP` routes to the owner of the missing intent, contract, or coverage;
- required `NOT_RUN` prevents acceptance;
- optional `NOT_RUN` records both its optionality and reason.

Gate states are `OPEN`, `ACCEPTED`, `FAILED`, and `BLOCKED`. The lane-state
owner records `OPEN -> ACCEPTED` only when every required, current input passes;
`OPEN -> FAILED` when a required input fails; and `OPEN -> BLOCKED` when a
required input cannot be produced or evaluated. Repair or blocker resolution
returns `FAILED` or `BLOCKED` to `OPEN` for reevaluation. Invalidated evidence,
inputs, or versions reopen `ACCEPTED -> OPEN` and trigger bounded consumer
repair.

Aggregate and terminal gates verify already accepted producers; they do not
retroactively accept a producer needed by another input to the same gate.
Existing evaluation contracts remain authoritative for their own eligibility,
execution, review, and judgment meanings. Graph-shaped rules may consume those
results but must not relabel authored, deterministic, executed, judged,
historical, or accepted evidence.

Definition coverage: `DEF-04`, `DEF-05`, `DEF-08`, `DEF-16`. Boundary
coverage: `BND-03`, `BND-04`, `BND-05`.

## Partial Repair

When execution or evidence fails, first classify the failure: product/runtime
defect, stale test, missing contract, missing acceptance evidence, environment
blocker, or invalid workflow state. Then:

1. identify the earliest node responsible for the failed evidence, input, or
   contract;
2. reopen that node and each consumer whose named input, contract, gate, or
   evidence is no longer trustworthy;
3. preserve accepted nodes whose inputs, scope, contract, and acceptance
   evidence remain unchanged;
4. record failed evidence, cause, reopened and preserved IDs, versions,
   attempt, and deterministic resume route in repair history;
5. return repaired or unblocked nodes to `PENDING`, then recalculate readiness
   and Current Frontier before execution resumes.

An unchanged-topology retry increments the node attempt and leaves graph
revision unchanged. Every retryable obligation has an explicit maximum, and
attempts `1` through that maximum may execute. After the maximum attempt has
been consumed without success, a request for another unchanged-topology retry
moves the node to `BLOCKED` and routes to the lane owner, `plan-change`, or user
escalation; never reset the counter silently. A change to topology,
dependencies, actor, ownership, or gates is an amendment and a new graph
revision, not another unchanged-topology attempt.

New impact evidence may expand the repair set, but a failure does not reopen
unrelated accepted work. Resume from the earliest reopened obligation whose
readiness conditions pass; unresolved blockers remain named rather than being
inferred away.

Definition coverage: `DEF-08`, `DEF-09`, `DEF-10`, `DEF-14`, `DEF-15`.
Boundary coverage: `BND-02`, `BND-04`.

## Graph Revision And Cross-Lane Work

Plan revision and graph revision describe different changes. Increment plan
revision when planning knowledge, definitions, workline boundaries, or
implementation decisions materially change. Increment graph revision when the
instantiated topology, dependency, actor, ownership, or gate changes. An
ordinary retry changes attempt/history only.

Every graph amendment records the prior and next revision, reason, changed
nodes/edges/actors/owners/gates, stable replacement IDs, preserved and
invalidated evidence, affected consumers, and the recomputed frontier. Never
reuse a node or gate ID from an earlier or superseded revision. Preserve
revision and repair history so a handoff can restore graph revision, current
frontier, unresolved joins, blockers, and next executable node from authority.

A cross-lane consumer without a Coordination Graph records the producer lane
ID, accepted producer gate and current evidence reference, compatible
version/freshness, integration owner, and invalidation route. The producer
gate—not a completion claim or worker receipt—controls readiness. If producer
evidence reopens or changes version, recalculate consumer readiness and reopen
only consumer work whose inputs are no longer current. Conflicting integration
ownership blocks the dependency.

When a Coordination Graph is created, migrate every cross-workline edge,
aggregate gate, materialization record, and terminal gate to that graph in one
recorded cutover. Lane packets then keep read-only references to the graph and
their own workline row. Do not operate dual authoritative copies or a fallback
path. Lane-local Task Graphs may remain authoritative for obligations inside
their lane, but they must not restate cross-workline transitions.

Parallel work may consume the same accepted producer gate when write scopes
are disjoint. Local receipts remain provisional until the coordination owner
accepts them, materializes required changes into the designated active
worktree, and the required compatibility or evaluation join passes. An
integration failure reopens only responsible producers and affected consumers.

Terminal aggregate gates consume accepted per-node or workline gates and have
no downstream consumer in the same graph. Lane completion does not itself
complete the user's overall goal; the root owner confirms every required lane
or terminal gate and reports residual instruction-driven risk.

Definition coverage: `DEF-06`, `DEF-07`, `DEF-10`, `DEF-11`, `DEF-13`.
Boundary coverage: `BND-01`, `BND-02`, `BND-03`, `BND-06`.

## Coordination Graph Authority And Applicability

A Coordination Graph is a first-class work entity stored at
`docs/work/graphs/CG-XXX-slug.md`. It connects existing worklines; it is not a
workline, lane, worker, generated spec, implementation plan, or execution
runtime. Its stable `CG-XXX` ID is never reused. `docs/work/graphs/_index.md`
indexes current and retained graphs, while `docs/work/active.md` remains a
derived projection that points to the graph and active worklines.

Create a Coordination Graph only when all of these are true:

1. at least two canonical worklines exist or are selected by planning; and
2. at least one typed cross-workline dependency, evidence or batch join,
   materialization/integrated-validation boundary, invalidation relationship,
   or partial-repair route exists; and
3. the graph reduces ambiguity that lane rows and direct references cannot
   safely represent.

Do not create a graph for atomic work, one workline, several unrelated
worklines, or merely to visualize prose. Keep rich product and implementation
definitions in their narrow authoritative owners. A Coordination Graph stores
stable source/criterion IDs, versions, paths, and dependency-relevant
projections only, so source and generated documents do not acquire unused graph
sections.

One coordination-state and materialization owner records every authoritative
cross-workline transition. Workers, workline owners, reviewers, test runners,
and evaluation shards return version-bound receipts or transition proposals;
they do not mutate the Coordination Graph, its derived frontier, the
materialization queue, or the active registry. A workline row in the graph is
a reference to the owning lane packet and current accepted gate, not a copy of
its definitions or lane-local Task Graph.

The authoritative Coordination Graph records are:

- applicability decision, source and boundary references, and graph revision;
- canonical workline registry and typed edge list;
- accepted workline gates and cross-workline evidence/aggregate gates;
- worktree dispatch ledger and accepted worker receipts;
- materialization queue and materialization receipts;
- batch-evaluation matrix and integrated active-worktree evidence;
- transition, repair, amendment, reconciliation, and ownership-handoff
  history; and
- terminal aggregate gate.

Current Frontier, active-registry rows, status boards, summaries, and queue
views are derived projections. Reconcile them from the authoritative graph
before dispatch, materialization, repair, handoff, or terminal acceptance.
The same state and gate transition semantics used by lane-local graphs apply
unless this section defines a workline- or materialization-specific state.

Creating a graph is a direct authority cutover. Record the prior authority,
new graph ID/revision, migrated edges and gates, preserved/invalidated evidence,
and cutover time. After cutover, no lane packet, plan, report, or status board
may remain a second authoritative source for the migrated state. Retained prior
records are historical evidence only.

## Coordination Graph Reconciliation And Retention

Before creating a graph from existing work, inventory the active registry,
lane packets, prior graphs, reports, source versions, current implementation,
worktrees/branches, receipts, evidence, and inbound consumers. Normalize IDs,
aliases, owners, revisions, and current gate subjects before comparing work.
Duplicate detection uses outcome, acceptance criteria, write scope, produced
artifacts, consumers, and evidence boundaries—not title similarity.

Give every inspected workline one explicit disposition:

- `KEEP`: current and independently necessary;
- `UPDATE`: still active but its projection or bindings are stale;
- `MERGE_INTO <W-ID>`: a true duplicate whose unique requirements,
  dependencies, evidence, and consumers must migrate to the named survivor;
- `SUPERSEDE_BY <W-ID>`: replaced by a newer authority while retained as
  historical evidence;
- `RETIRE_ACTIVE_ROW`: complete, with durable packet/report/evidence already
  preserved; or
- `BLOCKED_REVIEW`: ownership, authority, evidence, or overlap cannot yet be
  resolved safely.

Do not delete durable lane packets, graph revisions, reports, receipts, or
evidence merely because a row is duplicate, stale, superseded, or complete.
Retire an active row only through the owning closeout route after checking
inbound references and preserving durable evidence. Do not invent a permanent
`CLOSED` active state. A `BLOCKED_REVIEW` disposition prevents graph cutover
for the unresolved workline.

Reconciliation outputs a version-bound inventory, disposition map, canonical
survivor map, migrated-reference ledger, graph delta, invalidation set,
proposed transitions, and next gate. Only the coordination-state owner applies
the authoritative graph changes. Reject cutover with duplicate IDs, dangling
consumers, undefined gates, cycles, conflicting state/materialization owners,
or evidence whose subject/version cannot be established.

Plan and graph revisions remain distinct. Discovery, definitions, workline
boundaries, or implementation decisions change Plan Revision. Topology,
dependencies, canonical workline identity, gates, owner, or materialization
contract change Coordination Graph Revision. An ordinary retry changes attempt
and history only. Retain amendment and reconciliation history so later owners
can distinguish current state from superseded or historical evidence.

## Dedicated Worktrees, Batch Evaluation, And Materialization

When worklines execute in dedicated worktrees, the Coordination Graph owns the
cross-worktree dispatch and integration contract. The coordination owner
assigns each workline a thread, branch, worktree, base SHA, allowed writes,
producer gate, attempt, and invalidation rule. The worker verifies the binding,
edits only its assigned worktree, runs lane-local checks, and returns a receipt
with base/head SHA, owned commits when used, actual changed paths, exact check
results, evidence versions, worktree cleanliness, blockers, and a proposed
transition.

A worker commit is an optional immutable transport artifact. It does not
authorize a merge, commit, or broad staging operation in the active worktree.
Worker completion, local checks, and workline acceptance remain distinct. A
receipt is ready for materialization only after its workline gate is accepted,
its producer/input bindings remain current, and active-worktree overlap checks
pass.

An uncommitted active-worktree materialization is not a Git base and must not
be named as the source of dependent-worktree readiness. Bind each producer to
one immutable transport identity: preferably the accepted worker commit set,
otherwise a content-addressed patch or diff digest. Before a consumer worktree
runs, prove that the exact producer transport is present there and record the
consumer base SHA plus that proof. A later amended commit, rebased transport,
patch digest, or consumer-base change invalidates the dependent readiness and
its evidence.

The **Materialization Queue** orders accepted workline results whose changes
must appear together in the designated current active worktree. Materialize
one scoped result at a time using an explicit transport method, without
automatically committing the current branch. Record target HEAD before/after,
active-worktree baseline fingerprint, pre-existing dirty paths, applied paths,
transport method, conflicts, resulting diff fingerprint, staged/unstaged state,
focused checks, and rollback/repair route. For no-commit materialization,
target HEAD may remain unchanged; the bound diff proves the result appeared.

Materialization states are:

| State | Meaning | Legal next states |
|---|---|---|
| `QUEUED` | Accepted workline result awaits current target checks. | `APPLYING`, `BLOCKED`, `SUPERSEDED` |
| `APPLYING` | The coordination owner is applying the scoped result. | `APPLIED`, `FAILED`, `BLOCKED` |
| `APPLIED` | The bound change is present in the active worktree. | `VALIDATING`, `FAILED` |
| `VALIDATING` | Focused or integrated checks run against the combined active-worktree state. | `ACCEPTED`, `FAILED`, `BLOCKED` |
| `ACCEPTED` | Current required post-materialization evidence passed. | `QUEUED` only after input/evidence invalidation; otherwise terminal |
| `FAILED` | Application or validation failed with a responsible route. | `QUEUED`, `BLOCKED`, `SUPERSEDED` |
| `BLOCKED` | Conflict, dirty-path overlap, stale input, or missing authority prevents safe materialization. | `QUEUED` after resolution/recalculation, or `SUPERSEDED` |
| `SUPERSEDED` | A later graph revision replaced this queue item. | terminal |

Never overwrite unexplained active-worktree changes. Overlapping worker and
pre-existing dirty paths block materialization until one owner resolves the
conflict. Do not clean, reset, commit, push, or broadly stage the active
worktree as an implied graph action. Those operations require their own user
authority. Apply dependent results only after their producer materialization
and focused gate are accepted.

Batch evaluation is an aggregate evidence join, not a synonym for worker or
materialization success. Each batch records its batch ID, required workline and
materialization gates, exact source/input versions, target HEAD and combined
diff fingerprint, immutable producer transport identities, test/evaluation
definition digest, runner/model/environment and rubric versions where
applicable, shard membership, expected coverage,
required/optional evidence, missing/duplicate-result policy, aggregation rule,
and failure/repair route. Deduplicate receipts by stable evidence ID and
subject; never average duplicate evidence silently.

Required `FAIL`, `BLOCKED`, `GAP`, or `NOT_RUN`, a missing required shard, or a
stale binding prevents batch acceptance. Keep authored, deterministic,
executed, reviewed, judged, calibrated, historical, materialized, and accepted
evidence meanings distinct. Pre-materialization results remain provisional and
cannot prove the combined active-worktree state.

The terminal gate accepts only after every required workline gate,
materialization gate, integrated active-worktree test/evaluation, and residual
risk input is current for the same Coordination Graph revision and combined
state. Integrated evidence binds the active target HEAD plus the combined diff
fingerprint separately from each producer transport identity; neither binding
substitutes for the other. An integrated failure identifies the earliest
responsible workline or contract, reopens only its invalidated materialization
and downstream
consumers/batches, and preserves unrelated accepted work. Repair returns
affected items through readiness and queue recalculation; it never patches the
derived frontier directly.

These contracts remain instruction-driven. They define assignments, evidence,
state ownership, and safe handoffs but do not create worktrees, run agents,
apply patches, schedule batches, mutate Markdown, merge branches, or commit
changes automatically.
