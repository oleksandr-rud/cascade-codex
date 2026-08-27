---
name: maintain-harness
description: Implement a scoped change to an existing Codex or coding-agent harness, including instructions, configuration, skills, roles, tools, hooks, context, memory, observability, evaluation wiring, validators, and deprecations. Use after a clear request or accepted audit finding; preserve target authority, protect unrelated work, and validate source plus installed behavior proportionally.
---

# Maintain Harness

Make the smallest structurally complete target-repository harness change. This
skill maintains an existing harness; use Cascade AI Architect when the work
first requires designing a new agent system or materially changing its
topology, and Cascade Software Architect when software boundaries or an
independent change review are unresolved.

## Preconditions

- A target repository and requested outcome are explicit.
- Its boot instructions and current source precedence have been read.
- Dirty work, protected paths, change authority, and success criteria are
  known.
- A short plan maps producer, consumers, validation, installation, and
  deprecation impact.

If these are absent, inspect first with `$audit-harness`. Ask only a question
whose answer materially changes the authorized result.

## Workflow

1. Freeze a change envelope: intended behavior, assumptions, non-goals,
   touched owners, likely regressions, validation commands, and rollback.
2. Trace the current path before editing. Prefer current code over prose and
   do not overwrite unrelated changes.
3. Keep one owner per rule. Route durable facts to the target's declared
   configuration/docs and reusable workflow behavior to its skills or roles.
4. For external capabilities, resolve the exact installed namespaced skill
   with `../../scripts/resolve_plugin_skill.py`, record version and digests, and
   return `BLOCKED` if a required dependency is unavailable or invalid.
5. Implement a narrow behavior slice. Update all real consumers and generated
   artifacts controlled by that source; never patch only an installed cache.
6. Preserve permission, confirmation, idempotency, retry, timeout, stop,
   observability, redaction, evidence, and rollback contracts when affected.
7. Validate from cheapest to strongest: syntax/schema, focused tests, target
   validator, generated-catalog check, source-reference scan, installed
   discovery, then a bounded functional or live evaluation only when its
   preconditions and authority exist.
8. Compare source and installed identity when packaging changed. Remove a
   superseded owner only after replacement parity and discovery are proven.
9. Review the fixed-point diff against the request. Report exact passes and
   every `NOT_RUN`, `BLOCKED`, or historical-only evidence boundary.

## Delegation boundaries

- Use `cascade-ai-architect:architect-ai-system` for new or materially
  redesigned agent architecture.
- Use `cascade-prompt:prompt` for prompt-specific authoring or diagnosis.
- Use `cascade-evals:harness-evaluation` for generic evaluation lifecycle and
  judge contracts.
- Use `cascade-personas:build-persona` and `compile-persona` for canonical
  human models and purpose-limited projections; never recreate persona
  authoring in the target.
- Use Cascade Simulations only when an approved dynamic campaign needs actors,
  interfaces, execution, or frozen-run review.

Do not copy those dependencies' instructions into the target. Keep target-
specific scenarios, assertions, release policy, and repository edits local.

## Output

Return changed behavior and owners; files changed; dependency identities;
validation evidence grouped as source, fixture, installed, live, semantic, and
release; remaining gaps; rollback/deprecation state; and the exact next action
if blocked.
