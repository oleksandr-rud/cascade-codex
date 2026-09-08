---
name: plan-workflow
description: Compile a multi-plugin Cascade request and its validated Task Envelope into an ordered, dependency-safe, policy-preserving workflow plan. Use when two or more plugin capabilities must be selected, excluded, sequenced, parallelized, or joined; do not use for ordinary implementation slicing, project scheduling, target execution, or self-dispatch.
---

# Plan Workflow

Produce one versioned `cascade-plugin-plan` candidate. The host owns admission,
permissions, deterministic validation, and dispatch. This skill owns semantic
selection and ordering only.

## Inputs

Require a current validated Task Envelope, the digest-bound generated plugin
capability catalog, available input-artifact identities, and the user's explicit
model or evaluation policy. Missing or stale identity is `BLOCKED`, not a reason
to search plugin caches or invent a route.

Read [references/capability-descriptor.schema.json](references/capability-descriptor.schema.json)
when auditing plugin descriptors and
[references/capability-catalog.schema.json](references/capability-catalog.schema.json)
when binding the generated catalog. Read
[references/plugin-plan.schema.json](references/plugin-plan.schema.json) when
creating or reviewing a plan.

## Workflow

1. Bind every selected capability to one or more Task Envelope claims, applied
   policies, controls, or requested output artifacts. Reject candidates whose
   trigger, anti-trigger, authority, effect, or model profile does not fit.
2. Select the smallest sufficient skill set. Record plausible rejected
   candidates and the exact exclusion reason so unnecessary plugins remain
   observable.
3. Expand required dependencies, then connect nodes through declared
   `consumes` and `produces` artifact types. Optional dependencies remain
   absent unless they materially improve the requested outcome.
   `consumes` are required inputs. A descriptor's `optional_consumes` lists
   additional permitted inputs; put only the relevant, available subset in a
   plan node's `optional_consumes`. Omission means none. Selected optional
   inputs need the same source availability and ordered artifact edges as
   required inputs. Do not run growth planning to satisfy an ordinary Product
   definition, or invent a product contract for a pre-product growth test.
4. Topologically order the graph. Parallelize only read-safe nodes with no
   dependency, artifact, authority, or write conflict; name one deterministic
   merge owner for every join.
5. Preserve admission controls and authority exactly. A plugin plan never grants
   permission, weakens policy, executes a tool, dispatches an agent, mutates a
   target, accepts its own output, or substitutes Project Management for a
   domain decision.
6. Bind model-controlled planning, prompt construction, target execution, and
   independent judges to `gpt-5.6-sol`. Use the host planning effort for the
   plan itself and `max` for frozen evaluation builder, target, and judge
   contracts. Judges must run in separate contexts.
7. Emit a schema-conforming candidate with claim-to-node bindings, plugin
   versions, artifact edges, ordering and parallel groups, rejected candidates,
   validation and evaluation gates, stop/recovery behavior, and
   `dispatch_authorized: false`.

## Prompt and evaluation lifecycle

Prompt creation, diagnosis, comparison, and refinement must resolve
`cascade-prompt:prompt`; do not copy prompt policy here. Qualify prompt behavior
through `cascade-evals:prompt-evaluation`, and qualify the final skill route and
workflow behavior through `cascade-evals:agent-evaluation`. Preserve prompt,
catalog, subject, case, runner, model, rubric, and evidence digests. Mechanical
eligibility precedes blind semantic judgment; a self-review is not independent
evidence.

## Done

Finish when the plan schema validates, its graph is acyclic, every required
dependency and consumed artifact is satisfied, authority and Sol model policy
are preserved, and every selected node has an observable output or gate. Return
`BLOCKED` with the first missing owner/input when these conditions cannot be
met. Registration and execution require separate host authority.
