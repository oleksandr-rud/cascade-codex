---
name: select-capabilities
description: Select the smallest sufficient set of namespaced Cascade plugin capabilities for a request from a validated Task Envelope and current capability catalog. Use when the request spans plugin domains or the exact route is ambiguous; do not use when one explicit route already fits or to execute, persist, schedule, or approve work.
---

# Select Capabilities

Produce one versioned `cascade-capability-selection` candidate. The host owns
admission, permissions, deterministic validation, repository access, and
execution. This skill owns semantic inclusion and exclusion only.

Interpret claim and descriptor meaning with the LLM; never choose a capability
from regexes, keyword/phrase tables or lexical overlap. Emit the defined
claim-bound selection structure for host validation. A mechanically valid
Task Envelope whose semantic fields were inferred lexically is an upstream
interpretation gap; do not treat those fields as established meaning. The host
must supply a current semantically interpreted envelope before dependent routing.

## Inputs

Require a current validated Task Envelope, the digest-bound generated plugin
capability catalog, available input-artifact identities, and the applicable
model policy. Read
[references/capability-selection.schema.json](references/capability-selection.schema.json)
when creating or reviewing the selection. Read
[../plan-workflow/references/capability-catalog.schema.json](../plan-workflow/references/capability-catalog.schema.json)
when catalog identity or descriptor fields are in question.

Missing, stale, or conflicting identity is `BLOCKED`. Do not search caches,
invent a local fallback, or select a route merely because it is installed.

## Fail-closed preflight

Before comparing routes or opening any domain skill, verify that the serialized
Task Envelope, current catalog digest, available input-artifact identities, and
model policy are actually present. Do not reconstruct a missing Task Envelope
from request prose or treat “already admitted” as its identity. Return
`BLOCKED` immediately with the first missing or stale identity.

When preflight passes, select only from the catalog's `.plugins[].skills[]`
descriptors. Do not load candidate domain `SKILL.md` files merely to decide
whether to select them; the descriptor trigger, anti-trigger, artifact,
dependency, effect, authority, version, and evaluation fields are the routing
surface. Open another plugin skill only after host validation selects it for
actual work.

## Selection

1. Bind each requested outcome to one or more Task Envelope claims and available
   input artifacts.
2. Compare plausible catalog candidates using their descriptions, triggers,
   anti-triggers, consumes, produces, authority, effect, and current version.
   Evaluate each unresolved decision or required work product, including
   prerequisites to a requested implementation. An anti-trigger about target
   execution excludes using that method as the executor; it does not exclude
   necessary design or review before the host executes. A bounded task or one
   owner can still need a specialist method. Do not match isolated topic words.
3. Select the smallest sufficient route set. Expand every required dependency;
   include an optional dependency only when the request or a missing artifact
   makes its contribution material.
   Reuse accepted frozen inputs. An available producer is not automatically work
   to execute again. `optional_consumes` are optional context for selection;
   phase-specific evidence and authority requirements in the selected skill
   still govern execution and acceptance.
4. Record trigger evidence and the anti-trigger disposition for every selected
   route. Record plausible rejected routes and an exact exclusion reason.
5. Keep `cascade-coordinator:select-capabilities` and
   `cascade-coordinator:plan-workflow` out of the selected work set: they are
   controllers, not domain work nodes.
6. Preserve the Task Envelope authority ceiling. A selection never grants
   permission, dispatches an agent, executes a tool, mutates a target, schedules
   project work, or accepts its own result.
7. Use `gpt-6-astra` with the current planning effort and a non-null digest of
   the exact selection prompt. Emit `dispatch_authorized: false`.

## Route disposition

- One exact sufficient route with satisfied inputs: emit it directly; no plugin
  workflow plan is needed unless a required dependency adds another node.
- Two or more selected routes, a dependency, artifact handoff, parallel branch,
  or join: hand the validated selection to
  `cascade-coordinator:plan-workflow`.
- Missing owner, catalog route, required input, dependency, or authority:
  return `BLOCKED` with the first concrete blocker.

Qualify selection behavior through `cascade-evals:agent-evaluation` when a
semantic routing change requires model-backed evidence. Mechanical catalog,
schema, identity, and authority failures cannot be overridden by a judge.

## Done

Finish when every selected route is current, claim-bound, trigger-supported,
anti-trigger-safe, dependency-closed, within authority, disjoint from rejected
candidates, and covered by an observable output or next planning gate.

Keep the user-facing answer concise. Output requirements specify information,
not extra headings. Preserve required schemas, evidence and permissions. Avoid
duplicate artifact prose, empty sections, unsolicited variants and extra files
unless needed for the requested delivery or an actual handoff.
