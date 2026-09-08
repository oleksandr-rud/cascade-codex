---
name: build-agent-skills
description: Map agent capability clusters into focused, triggerable, testable Codex skill design briefs and, when explicitly requested, candidate skill packages through the native skill-creator. Use when an agent architecture needs reusable skills, when an existing SKILL.md package should be redesigned or audited, or when deciding whether related capabilities belong in one skill or several. Never silently install, enable, register, or activate generated skills.
---

# Build Agent Skills

Design the smallest reusable skill set that makes agent behavior reliable without turning every capability or workflow phase into a separate skill.

## Choose skill boundaries

Create a skill only for a coherent user-triggered task or reusable procedural contract. Group capabilities when they share the trigger, authoritative context, tools, permissions, output, and evaluation oracle. Split only for materially different triggers, permissions, source domains, outputs, or independent reuse.

Do not use a skill to hold project facts that belong in configuration, product documentation, schemas, or runtime state. Do not duplicate native or installed skills; bind them as dependencies when appropriate.

## Produce a design brief

For every proposed skill, use [assets/skill-brief.yaml](assets/skill-brief.yaml) and define:

- a verb-led semantic name and exact trigger language;
- owned capability slugs and explicit non-goals;
- representative positive and negative invocation examples;
- required inputs, source authority, output contract, and completion oracle;
- workflow, tools, permissions, side effects, recovery, and budgets;
- needed `scripts/`, `references/`, or `assets/`, with a reason for each;
- native or plugin dependencies without copying their instructions;
- deterministic validation and realistic forward-evaluation cases;
- target path, package status, version, and provenance.

Keep the eventual `SKILL.md` concise and imperative. Put all trigger conditions in the frontmatter description because the body is loaded only after invocation. Use resources only when they reduce repeated work or move optional detail out of the core instructions.

## Optional package creation

Scaffold or edit a package only when the user explicitly asks to create or update it and authorizes the target path.

1. Resolve `skill-creator` from the current native Skills catalog. Do not search caches, copy its instructions, or substitute an unverified generator.
2. If it is unavailable, return the completed design brief and `BLOCKED` for package creation.
3. Invoke the current native `skill-creator` with the design brief, target path,
   examples and required resources. Let it own scaffolding, UI metadata and
   packaging validation; do not impose a second initializer or metadata policy.
4. Check that the resulting package preserves the architecture brief's trigger,
   responsibilities and output contract. Record native structural validation
   separately from behavioral evaluation.
5. Return the package as `CANDIDATE` with changed files, validation evidence,
   unresolved gaps and activation requirements.

Package creation alone does not authorize installation, marketplace edits,
plugin activation, registry changes, runtime dispatch or production promotion.
Use explicit authorization already present in the session when it covers those
actions; ask only for genuinely missing authority, not a repeated request.

## Review gates

Reject or revise a proposal when:

- its description cannot distinguish positive from negative triggers;
- it duplicates another skill or contains unrelated task families;
- it depends on hidden prompt history or undeclared authority;
- a resource directory has no required file;
- state-changing tools lack permission and confirmation rules;
- evaluation checks formatting while ignoring the promised behavior;
- the package claims success from validation that was `NOT_RUN`.
