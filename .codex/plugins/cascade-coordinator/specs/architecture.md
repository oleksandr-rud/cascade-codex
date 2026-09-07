# Cascade Coordinator boundary

Cascade Coordinator owns semantic capability selection and non-dispatching
cross-plugin workflow planning. It consumes the host-authored Task Envelope and
the generated capability catalog, then produces digest-bound candidates that
make selected and rejected routes, claim bindings, dependencies, artifact
edges, ordering, joins, blockers, and stop conditions explicit.

It does not own admission, permissions, repository access, target mutation,
project scheduling, domain decisions, execution, evaluation acceptance, or
dispatch. The active host role validates Coordinator artifacts and invokes the
selected namespaced skills under current user authority.

`capabilities.yaml` is the portable route contract. Bun host validators enforce
schema, identity, dependency, artifact, authority, parallelism, and
non-dispatch invariants before a candidate may be consumed.

## Input and resource seam

The host compiles the full claim-bearing Task Envelope and exposes its current
path and digest to the Coordinator. The envelope may live only under an ignored
session artifact root; it is routing input, not durable evidence. The generated
capability catalog remains the compact descriptor surface, so selection does
not require opening every plugin skill.

The project-level `cascade_workspace` MCP may return the validated Task
Envelope, generated catalog, explicit allowlisted files, or a digest-bound
pattern-context preview in one read-only response. Repository traversal,
memory policy, arbitrary file reads, authentication, and resource freshness
remain host responsibilities. The Coordinator does not call the server by
itself: the active Codex host retrieves the required inputs before capability
selection. The Coordinator must not embed a fake endpoint, claim access it does
not have, or turn resource retrieval into permission or dispatch.

## Output and persistence seam

Selected plugin skills produce typed candidate artifacts. A Coordinator plan
may order those artifacts and name their consumers, but it never persists
them. When a candidate must become durable repository state, the active host
routes it through the repo-local `closeout` skill. `closeout` may use
`prepare_workspace_artifact` and `persist_workspace_artifact` under the current
Task Envelope, destination registry, optimistic digest, and validation
evidence. The Workspace MCP cannot establish authority or verify that a skill
is active; it is a deterministic host adapter, not a dispatcher or another
planning node. A standalone plugin remains valid when that optional adapter is
absent and returns its candidate plus handoff to the host.

## Conditional preparation

- Prompt authoring alone selects Cascade Prompt; prompt evaluation is added
  only for a frozen prompt and cases that require measurement.
- Prompt or agent evaluation adds Cascade Simulations only when an adaptive or
  stateful actor contour is part of the claim. Deterministic cases do not pay
  simulation setup cost.
- One simulation run needs an actor, brief, observable outcome, and interface
  adapter. Campaign governance is added only for an explicit versioned
  multi-case or multi-contour comparison.
- Independent simulation evaluation requires a frozen run and controller
  review. It never executes or repairs the target.
- Generic harness evaluation is a focused disposable diagnostic, not a default
  validation phase or durable evidence branch.

The Coordinator does not create another planning or technology-selection
boilerplate. Ordinary implementation readiness belongs to the host's concise
`plan-change` ready check. Architecture and technology choices route to
`cascade-software-architect:select-architecture-patterns` with a host-supplied
versioned catalog; reusable context retrieval remains the host
`pattern-context` adapter.
