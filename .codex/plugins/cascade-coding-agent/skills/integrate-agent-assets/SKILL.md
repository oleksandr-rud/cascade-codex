---
name: integrate-agent-assets
description: Integrate reviewed agent architecture, role, skill, workflow, prompt, tool, memory, or evaluation candidate artifacts into a target Codex or coding-agent harness. Use when a Cascade AI Architect packet or equivalent design must be mapped to repository-owned surfaces without copying plugin runtime, activating unreviewed candidates, or losing provenance.
---

# Integrate Agent Assets

Translate an approved architecture packet into target-repository harness
surfaces while keeping design, candidate generation, activation, and release
as separate states.

## Inputs

- Target repository identity, instructions, source precedence, and dirty-work
  boundary.
- Versioned architecture packet and artifact digests.
- Approved subset, target owners, write authority, and activation policy.
- Existing roles, skills, prompts, tools, config, validators, and consumers.

If no adequate architecture packet exists and design is required, resolve and
invoke `cascade-ai-architect:architect-ai-system`; do not invent a competing
architecture inside this skill.

## Workflow

1. Validate packet identity, references, digests, approval state, and target
   compatibility. Reject ambiguous owners and unresolved high-risk gaps.
2. Build an integration map from each accepted artifact to one target-owned
   surface and all of its consumers. Mark artifacts `REUSE`, `ADAPT`, `ADD`,
   `DEPRECATE`, or `REJECT` with reasons.
3. Reconcile rather than duplicate. Preserve stronger target contracts and
   record any intentional divergence from the source packet.
4. For a workflow candidate, inventory the target's actual roles, namespaced
   skills, tools, execution surfaces, source order, protected paths, dirty
   work, graph state when one already exists, and validation commands. Bind
   every designed capability to one existing owner or an explicit gap; never
   invent a dynamic role or local fallback for an unavailable plugin.
5. Keep deterministic routing outside prompts where the target supports it.
   Preserve typed inputs/outputs, tool permissions, confirmation, state,
   budgets, recovery, observability, and done conditions.
   Only for an explicitly requested or already adopted stateful-agent packet,
   read [the stateful-agent integration profile](references/stateful-agent-profile.md).
6. Bind each executable step to `root`, `internal-subagent`,
   `user-visible-task`, or the target's equivalent surface. Record dispatch
   state, authorization evidence, allowed and forbidden writes, dependency
   gate, merge owner, validation, handoff, and stop behavior. Candidate or
   graph readiness is never dispatch authority; a user-visible task requires
   explicit user task-creation authority.
7. Route prompt bodies through `cascade-prompt:prompt` when authoring is
   required. Bind the returned prompt identity and digest; do not copy Cascade
   Prompt policy.
8. Keep repository-specific evaluation cases and assertions in the target.
   Bind coding-agent route/trace subjects to `cascade-evals:harness-evaluation`
   and other agent/role/skill subjects to `cascade-evals:agent-evaluation`.
   Generic phases belong to `cascade-evals:evaluate`, and judge construction
   to `cascade-evals:build-judge`. Use Cascade Simulations only for approved
   dynamic runs.
9. Implement in dependency order, serialize conflicting writes, name one
   deterministic merge owner for parallel branches, update validators and generated catalogs,
   then validate source, references, routing, and discovery.
10. Activate or remove an old owner only when explicitly authorized and after
   replacement parity, rollback, and installed discovery are proven.

## Required receipt

Keep the user-facing answer concise. Output requirements specify information,
not extra headings. Preserve required schemas, evidence and permissions. Avoid
duplicate artifact prose, empty sections, unsolicited variants and extra files
unless needed for the requested delivery or an actual handoff.

Return source packet/version/digests; integration decisions; target paths and
owners; dependency versions/digests; candidate versus active state; validation
evidence; deviations; deprecations; rollback; and all unexecuted gates. For a
workflow integration, also return the host binding table, execution surface and
dispatch state per step, authorization evidence, write scopes, merge owner,
validation command, handoff, stop rules, and unresolved gaps. Do not recreate a
separate workline, graph, prompt-bank, or report layer when the target's
existing typed workflow and integration receipt carry the same information.
