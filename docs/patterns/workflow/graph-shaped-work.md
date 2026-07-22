# Graph-Shaped Work

Use these rules when one active lane contains connected obligations whose
readiness, evidence, repair, or handoff state cannot be represented safely as a
linear checklist. The lane packet owns each instantiated graph. This document
owns reusable semantics only; it is never active task state.

## Graph-Shaped Work

Graph-shaped coordination augments Cascade's existing skill routes and local
model/tool loops. Skills still plan, implement, review, validate, repair, and
close work. The graph-shaped lane state records which bounded obligations may
run, which evidence gates must accept them, and which work must reopen after a
failure. Context-pack metadata selects these rules but does not redefine them
or store live state.

A lane is one independently tracked workstream with one owner, scope, merge
boundary, and terminal validation boundary. Use graph-shaped sections when a
lane has several connected obligations and at least one of these conditions:

- work has prerequisite, evidence-gate, or external-condition dependencies;
- independent work may proceed in parallel but must join before a consumer;
- evidence failure should repair a bounded subset instead of restarting all
  work;
- topology, ownership, or evidence bindings may change across handoff;
- the current frontier would otherwise be ambiguous after compaction or resume.

Atomic work may omit graph-shaped lane sections. A one-file mechanical edit or
another single obligation with no useful dependency or repair structure still
follows normal planning, permission, review, validation, and closeout rules.
Do not create nodes merely to mirror every skill invocation or prose step.

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
state, accept a node or gate, update a derived status board, or merge work.
Conflicting proposals remain evidence/history while the owner records one
reconciled transition.

The lane's Task Graph, evidence-gate records, latest graph amendment, and
transition/repair history are authoritative active state. Current Frontier,
status boards, merge queues, and the active-work registry are derived
projections. Recompute a drifting projection from authoritative state before
execution.

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
preconditions, input and evidence identity, invalidation condition, and a
deterministic failure or resume route. A failed or unblocked node returns to
`PENDING` for readiness recalculation; it never skips directly to `READY`.
Producing the expected output moves an `IN_PROGRESS` node to `REVIEW`. Only its
accepted per-node gate authorizes `REVIEW -> ACCEPTED`.

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
6. write scope is disjoint from active work or one merge owner is declared;
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
revision unchanged. Every retryable obligation has an explicit maximum. When
the maximum is reached, move the node to `BLOCKED` and route to the lane owner,
`plan-change`, or user escalation; never reset the counter silently. A change
to topology, dependencies, actor, ownership, or gates is an amendment and a new
graph revision, not another unchanged-topology attempt.

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

A cross-lane consumer records the producer lane ID, accepted producer gate and
current evidence reference, compatible version/freshness, merge owner, and
invalidation route. The producer gate—not a completion claim or worker
receipt—controls readiness. If producer evidence reopens or changes version,
recalculate consumer readiness and reopen only consumer work whose inputs are
no longer current. Conflicting merge ownership blocks the dependency.

Parallel work may consume the same accepted producer gate when write scopes
are disjoint. Local receipts remain provisional until the merge owner reviews
and integrates them and any required compatibility join passes. An integration
failure reopens only responsible producers and affected consumers.

Terminal aggregate gates consume accepted per-node or workline gates and have
no downstream consumer in the same graph. Lane completion does not itself
complete the user's overall goal; the root owner confirms every required lane
or terminal gate and reports residual instruction-driven risk.

Definition coverage: `DEF-06`, `DEF-07`, `DEF-10`, `DEF-11`, `DEF-13`.
Boundary coverage: `BND-01`, `BND-02`, `BND-03`, `BND-06`.
