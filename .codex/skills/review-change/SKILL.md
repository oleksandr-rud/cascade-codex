---
name: review-change
description: Review a branch, PR, work-in-progress diff, or changes since a fixed point along two separate axes: repository standards and originating spec/request fit. Produces review findings only; use `validate-change` for command/test evidence.
---

# Review Change

Review a change without merging the two questions that often mask each other:

- **Standards**: does the diff follow repo instructions, skill rules,
  architecture patterns, and documented coding standards?
- **Spec**: does the diff satisfy the originating user request, issue, PRD,
  work-lane criterion, scenario row, or plan without missing behavior or scope
  creep?

Run this locally unless the user explicitly authorizes parallel agents.

## Source Order

1. Fixed point supplied by the user, or a safe default only when the user asks
   for one.
2. Current diff and commit list:
   - `git diff <fixed-point>...HEAD`
   - `git log <fixed-point>..HEAD --oneline`
3. Originating request/spec source:
   - latest user request or current plan;
   - referenced issue, PRD, work lane, scenario, product/spec doc, or design
     note;
   - current work packet only when directly relevant and not historical.
4. Standards sources:
   - `AGENTS.md`, `codex.md`, and relevant `.codex/skills/*`;
   - relevant `.codex/agents/*` role contracts;
   - relevant `docs/patterns/*`;
   - lint/type/test configs only as standards inventory, not as a substitute
     for running tools.

## Checklist

1. Pin the fixed point. If none is provided and there is no safe default, ask:
   "Review against what: a branch, commit, tag, or main?"
2. Capture the diff command and commit list once. Use the three-dot diff so the
   comparison is against the merge base.
3. Identify the spec source. If none exists, keep the Standards review and mark
   Spec as `NO_SPEC_AVAILABLE`.
4. Identify standards sources and read only files relevant to touched areas.
5. Review Standards and Spec separately:
   - Standards findings cite the rule source and changed file or hunk.
   - Spec findings cite the request/spec row and missing, partial, wrong, or
     extra behavior.
   - Keep judgment calls separate from hard violations.

## Output

- fixed point, diff command, and commit count;
- Standards findings, or `PASS`;
- Spec findings, `PASS`, or `NO_SPEC_AVAILABLE`;
- worst issue per axis when findings exist;
- routes for follow-up: `implement-change`, `functional-qa`,
  `test-autorepair`, `validate-change`, or `issue-intake`.

## Rules

- Do not edit files from this skill.
- Do not treat a review as validation evidence for commands that did not run.
- Do not let missing spec context block Standards review.
- Do not use completed or unrelated work packets as the spec source.
