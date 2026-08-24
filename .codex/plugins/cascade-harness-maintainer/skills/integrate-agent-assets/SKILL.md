---
name: integrate-agent-assets
description: Integrate reviewed agent architecture, role, skill, workflow, prompt, tool, memory, or evaluation candidate artifacts into a target Codex or coding-agent harness. Use when a Cascade Agent Architect packet or equivalent design must be mapped to repository-owned surfaces without copying plugin runtime, activating unreviewed candidates, or losing provenance.
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
invoke `cascade-agent-architect:architect-ai-system`; do not invent a competing
architecture inside this skill.

## Workflow

1. Validate packet identity, references, digests, approval state, and target
   compatibility. Reject ambiguous owners and unresolved high-risk gaps.
2. Build an integration map from each accepted artifact to one target-owned
   surface and all of its consumers. Mark artifacts `REUSE`, `ADAPT`, `ADD`,
   `DEPRECATE`, or `REJECT` with reasons.
3. Reconcile rather than duplicate. Preserve stronger target contracts and
   record any intentional divergence from the source packet.
4. Keep deterministic routing outside prompts where the target supports it.
   Preserve typed inputs/outputs, tool permissions, confirmation, state,
   budgets, recovery, observability, and done conditions.
5. Route prompt bodies through `cascade-prompt:prompt` when authoring is
   required. Bind the returned prompt identity and digest; do not copy Cascade
   Prompt policy.
6. Keep repository-specific evaluation cases and assertions in the target.
   Bind them to `cascade-evals:harness-evaluation` for generic evaluation
   phases and judges. Use Cascade Simulations only for approved dynamic runs.
7. Implement in dependency order, update validators and generated catalogs,
   then validate source, references, routing, and discovery.
8. Activate or remove an old owner only when explicitly authorized and after
   replacement parity, rollback, and installed discovery are proven.

## Required receipt

Return source packet/version/digests; integration decisions; target paths and
owners; dependency versions/digests; candidate versus active state; validation
evidence; deviations; deprecations; rollback; and all unexecuted gates.
