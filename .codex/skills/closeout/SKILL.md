---
name: closeout
description: Finish work by recording validation evidence, durable lessons, work reports, memory updates, and final handoff.
---

# Closeout

Use when work is done, blocked, or ready for handoff.

## Source Order

1. Latest user request.
2. Current diff and validation evidence.
3. Current work lanes and behavior examples.
4. `docs/patterns/workflow.md`.
5. Session memory and durable lesson locations.

## Checklist

1. Review the diff, validation evidence, unresolved risks, and user-facing
   behavior.
2. Compare current request and directly relevant criteria against changed files
   and tests.
3. Return to implementation if required behavior is missing and feasible.
4. Mark deferred or blocked work with owner and next step.
5. Persist durable rejected-scope decisions only when they would prevent future
   re-suggestion: record the concept, why it is out of scope, and any prior
   request/report links in the narrowest existing decision, backlog, pattern,
   or report location.
6. Persist only reusable lessons, required handoff state, or requested reports.
7. Do not create a generic learned-lessons dump.
8. Keep final handoff concise and honest about checks that did not run.

## Memory Routing

- Use `templates/learn-routing.md` when deciding whether a lesson should become
  durable memory.
- Active work state: `docs/work/active.md` and `docs/work/lanes/`
- Durable work handoff: `docs/work/reports/`
- Durable rejected scope: existing backlog, pattern, decision, or work report,
  only when it prevents repeat bad suggestions
- Durable workflow lessons: `.codex/skills/`, `.codex/agents/`, or
  `docs/patterns/`
- Codebase vocabulary: `docs/glossary.md`
- Product/spec facts: `docs/product/`, `docs/design/`, `docs/brand/`, and
  `docs/specs/`
- Folder/write-target rules: `docs/structure.md`

Never write stack inventories, product specs, role inventories, historical
decisions, or learned lessons into `AGENTS.md`.

## Output

- outcome and lane status;
- files changed;
- validation evidence;
- unresolved risks or blocked checks;
- memory written.
