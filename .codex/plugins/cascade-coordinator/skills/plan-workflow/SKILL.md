---
name: plan-workflow
description: Compile an already validated Cascade capability selection into an ordered, dependency-safe, policy-preserving workflow plan. Use when selected capabilities require sequencing, parallelization, an artifact handoff, or a join; route selection or exclusion to select-capabilities first. Do not use for ordinary implementation slicing, project scheduling, target execution, or self-dispatch.
---

# Plan Workflow

Produce one versioned `cascade-plugin-plan` candidate from an already validated
capability selection. The host owns admission, permissions, deterministic
validation, repository access, and dispatch. This skill owns dependency-safe
ordering, artifact edges, parallel groups, and joins only.

## Inputs

Require a current validated Task Envelope, the digest-bound generated plugin
capability catalog, a current validated
`cascade-coordinator:select-capabilities` artifact, available input-artifact
identities, and the user's explicit model or evaluation policy. Missing or stale
identity is `BLOCKED`, not a reason to search plugin caches or invent a route.

Read [references/capability-descriptor.schema.json](references/capability-descriptor.schema.json)
when auditing plugin descriptors and
[references/capability-catalog.schema.json](references/capability-catalog.schema.json)
when binding the generated catalog. Read
[references/plugin-plan.schema.json](references/plugin-plan.schema.json) when
creating or reviewing a plan.

Input identities describe available source types, not a requirement to create
separate files or run their usual producers. A grounded user request can supply
a `design-brief`, `brand-brief`, or `design-proposal`; accepted requirements,
journeys and scenarios retain their original source and acceptance bindings.
Do not relabel an unaccepted report as accepted behavior to satisfy a plan.

## Fail-closed preflight

Before reading schemas, enumerating catalog routes, or opening any domain skill,
verify that the serialized validated capability selection and every required
identity above are present. A prose summary of selected capability names is not
the selection artifact. If any identity is absent, return `BLOCKED` immediately
with the first blocker; do not reconstruct nodes, inspect candidate skill
bodies, or draft a partial graph. When preflight passes, the validated selection
and catalog descriptors are sufficient planning inputs.

## Workflow

1. Preserve the validated capability selection exactly. Every selected work
   node must be present in it and bound to the same current plugin version,
   claims, effect, and authority.
2. Confirm required-dependency closure, then connect nodes through declared
   `consumes` and `produces` artifact types. Optional dependencies remain
   absent unless the selection records why they materially improve the outcome.
   `consumes` are required inputs. A descriptor's `optional_consumes` lists
   additional permitted inputs; put only the relevant, available subset in a
   plan node's `optional_consumes`. A descriptor's `consumes_any_of` declares
   supported alternative input types; select at least one available alternative
   in that same node field. These alternatives are not permission to omit the
   subject. Keep each artifact in only one descriptor input category.
   Omission means none. Selected conditional
   inputs need the same source availability and explicit ordered artifact edges
   as required inputs. Do not run growth planning to satisfy an ordinary Product
   definition, or invent a product contract for a pre-product growth test.
   Reuse valid frozen artifacts supplied by the host without scheduling their
   producers again. Planning input sufficiency does not complete a method:
   execution, calibration, acceptance, and closure still require the evidence
   and authority defined by that skill's applicable phase.
3. Topologically order the graph. Represent every selected producer-to-consumer
   artifact handoff with an explicit edge.
4. Parallelize only `READ_ONLY` nodes with no direct or transitive dependency,
   artifact, authority, or write conflict; name one deterministic
   merge owner for every join.
5. Preserve admission controls and authority exactly. A plugin plan never grants
   permission, weakens policy, executes a tool, dispatches an agent, mutates a
   target, accepts its own output, or substitutes Project Management for a
   domain decision.
6. Bind each work node to its owning plugin's catalog `model_policy.model` and
   planning effort; use `evaluation_reasoning_effort` for Evals nodes. The
   Coordinator's own Astra planning model does not replace a node's policy.
   Preserve the separate builder, target and judge bindings of any frozen
   evaluation contract; do not infer them from the prompt author's model.
   Judges run in separate contexts. A plan records configuration, not an
   automatic model switch or dispatch.
7. Bind the plan to the capability-selection digest and the non-null digest of
   the exact planner prompt. Emit a schema-conforming candidate with
   claim-to-node bindings, plugin versions, complete artifact edges, ordering
   and parallel groups, rejected candidates, validation and evaluation gates,
   stop/recovery behavior, and `dispatch_authorized: false`.

## Prompt and evaluation lifecycle

Prompt creation, diagnosis, comparison, and refinement must resolve
`cascade-prompt:prompt`; do not copy prompt policy here. Qualify prompt behavior
through `cascade-evals:prompt-evaluation`, and qualify the final skill route and
workflow behavior through `cascade-evals:agent-evaluation`. Preserve prompt,
catalog, subject, case, runner, model, rubric, and evidence digests. Mechanical
eligibility precedes blind semantic judgment; a self-review is not independent
evidence.

## Done

Finish when the plan schema validates, its selected routes exactly match the
validated selection, its graph is acyclic, every required dependency and
consumed artifact is satisfied by an input or explicit edge, authority and catalog
model policy are preserved, and every selected node has an observable output or
gate. Return `BLOCKED` with the first missing owner/input when these conditions
cannot be met. Registration and execution require separate host authority.

Keep the user-facing answer concise. Output requirements specify information,
not extra headings. Preserve required schemas, evidence and permissions. Avoid
duplicate artifact prose, empty sections, unsolicited variants and extra files
unless needed for the requested delivery or an actual handoff.
