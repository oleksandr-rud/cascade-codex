---
name: develop-skill
description: Create, port, rename, refactor, or validate reusable Codex skill packages with trigger contracts, source order, outputs, guardrails, and quality gates.
---

# Develop Skill

Use when a raw prompt, repeated workflow, or existing skill needs to become a
reusable skill package.

## Checklist

1. Identify skill goal, target runtime, owning role, users, expected outputs,
   and file write scope.
2. Extract trigger, anti-trigger, source order, required behavior, forbidden
   behavior, output contract, artifact requirements, and tests.
3. Challenge the proposed skill name and trigger against ambiguous prompts.
4. Choose the smallest useful structure: `SKILL.md` first, optional rules,
   templates, examples, checklists, references, or scripts only when needed.
5. Write the skill with progressive disclosure: load only extra files required
   for the current task.
6. Validate frontmatter, path references, role wiring, and sample prompts.

## Output

- skill name and role owner;
- contract decisions and assumptions;
- files written;
- validation commands and results;
- limitations.

