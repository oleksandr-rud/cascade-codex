# W03 — Build a concrete solution from credible alternatives

Read the understood scope, scenarios, material research and relevant repository
practices. Identify the decision that prevents contract writing. Reuse settled
decisions; do not reopen the stack or invent another option to fill a comparison.

## Make the decision for the actual subject

For every material choice name its goal, constraints, affected contracts and
evidence. Compare credible alternatives only where they exist. Record the choice,
rationale, consequences and reconsideration condition in the owning section/S15;
mark it DECIDED, PROPOSED, UNKNOWN or CONFLICTING under the actual authority.
An LLM recommendation is a proposal unless the session already resolves it.

For PRODUCT this can select a user-facing mechanism; for COMPANY a responsibility,
handoff or operating process; for SCENARIO a recovery step; for TEST a test level,
fixture or measurement. Use S17 for company consequences and the corresponding
subject contracts elsewhere. Do not force these choices into software modules.
Business preferences need owner intent; empirical claims need W02 evidence.

## Compare mechanisms at the affected boundary

Where multiple approaches are credible, describe each mechanism's behavior,
interfaces, state/data ownership, transaction or effect ordering, operating cost,
failure/recovery and fit with current code. For UI choices compare actual tasks,
layout/navigation and states. Sketch the relevant C4/data/sequence/interaction
view when it makes the distinction clear. Explain the chosen option and the
assumption that would make its strongest alternative preferable.

An architecture or design pattern earns its place by solving a named problem.
Prefer existing repository conventions or a coherent simple foundation when they
fit; verify uncertain technology versions and guarantees through W02. Do not
import a framework, distributed service or elaborate pattern because an exemplar
has one. Produce actual module/API/handler/DDL/UI contracts using the S policies.

An optional configured pattern specialist follows
[policy bindings](../policy-bindings.md). Supply a real versioned pattern catalog
and source claims when its contract requires them. Without that input keep its
selection unresolved; no catalog or implementation is invented.

## Probe only a fact that changes the choice

If documentation cannot settle feasibility, specify a bounded probe:

- Question and candidate mechanism; fixture/environment/version; exact action.
- Observable result that distinguishes outcomes; relevant timeout/effort limit.
- What `PASS`, `FAIL` or an inconclusive result would change in the spec.
- Execution scope and evidence location; teardown if temporary resources exist.

Run it only within the user's authorized scope and available environment. A
specification request does not imply production changes, purchases or deployment.
When execution is unavailable or outside the task, keep the probe `NOT_RUN` and
its decisive uncertainty open. An executable-looking snippet is not evidence.
Use the probe result to revise the candidate, rather than polishing a design
whose central assumption failed.

## Retain the rules independently built parts must share

For each consequential architecture rule record its scope, requirement,
divergence it prevents, owning contract and reconsideration condition in S15.
Examples: where an invariant is enforced; which component owns a shared field;
whether an audit and business mutation commit together. These rules must agree
with concrete algorithms and schemas, not replace them.

Stack versions, file trees and full schema snapshots seed greenfield implementation.
Once code exists, read current facts there; keep intended behavior and exceptional
repository rules in their owning spec/context. Do not duplicate those snapshots
into permanent instructions. A code/spec conflict still needs an explicit repair.

## Bind the choice to verification

Update every affected screen, operation, handler, schema, worker, deployment
contract and diagram. Give W04 the risks and enforcing boundaries so its checks
can falsify a broken implementation. Missing testability can require a design
change: a controllable clock, an inspectable durable result, or a bounded failure
injection seam. Add only seams the accepted risk requires.
