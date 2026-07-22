---
name: review-change
description: Use to review a branch, PR, work-in-progress diff, or fixed-point change for repository standards and originating spec/request fit; produces findings only, not command/test evidence.
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

1. Comparison Base and Reviewed Head/Digest supplied by the user, or safe
   defaults only when the user asks for them.
2. Current diff and commit list:
   - `git diff <comparison-base>...<reviewed-head>`
   - `git log <comparison-base>..<reviewed-head> --oneline`
3. Originating request/spec source:
   - latest user request or current plan;
   - referenced issue, PRD, work lane, scenario, product/spec doc, or design
     note;
   - current work packet only when directly relevant and not historical.
4. Standards sources:
   - `AGENTS.md`, `CODEX.md`, and relevant `.codex/skills/*`;
   - relevant `.codex/agents/*` role contracts;
   - relevant `docs/patterns/*`;
   - lint/type/test configs only as standards inventory, not as a substitute
     for running tools.
5. `docs/patterns/workflow/graph-shaped-work.md` plus the current lane's
   authoritative node/gate records when review evidence feeds a graph gate.

## Checklist

1. Pin the Comparison Base and the distinct Reviewed Head/Digest. If no safe
   comparison base exists, ask: "Review against what: a branch, commit, tag,
   or main?" If the review target is ambiguous, also ask which head, commit,
   digest, or work-in-progress state is being reviewed.
2. Capture the diff command and commit list once. Use the three-dot diff so the
   comparison is against the merge base, while the Reviewed Head/Digest records
   the exact change state receiving findings.
3. Identify the spec source. If none exists, keep the Standards review and mark
   Spec as `NO_SPEC_AVAILABLE`.
4. Identify standards sources and read only files relevant to touched areas.
5. Review Standards and Spec separately:
   - Standards findings cite the rule source and changed file or hunk.
   - Spec findings cite the request/spec row and missing, partial, wrong, or
     extra behavior.
   - Keep judgment calls separate from hard violations.
6. For a graph-shaped lane, emit separate Standards and Spec evidence records,
   even when one reviewer produces both. Each record names a stable evidence
   ID; subject node/gate; graph revision; node attempt; input/source versions;
   Comparison Base; Reviewed Head/Digest; producer/reviewer; production time;
   required/optional level; acceptance criteria; invalidation condition; and
   failure route. Missing identity or reviewer authority is `GAP`.
7. Treat the assigned reviewer as the review-evidence producer and the
   gate-named independent reviewer/evaluator as acceptance authority. When
   independence is required, self-review cannot satisfy that input. Only the
   lane-state owner records gate transitions.
8. Apply requirement levels without collapsing outcomes: required `PASS` may
   contribute to acceptance; required `FAIL`, `BLOCKED`, `GAP`, or `NOT_RUN`
   prevents it; optional `NOT_RUN` records optionality and reason.
9. `NO_SPEC_AVAILABLE` cannot satisfy a required Spec-review input. Record that
   evidence as `GAP` and route the missing contract; when Spec review is
   explicitly optional, record optional `NOT_RUN` and its reason.
10. Key freshness to the Reviewed Head/Digest, not only the Comparison Base.
    When the reviewed head/digest, comparison base, revision, attempt, inputs,
    or governing sources change, mark the affected review evidence stale and
    propose reopening its subject, gate, and consumers that relied on it.
    Preserve unrelated accepted work.

## Output

- Comparison Base, Reviewed Head/Digest, diff command, and commit count;
- Standards findings, or `PASS`;
- Spec findings, `PASS`, or `NO_SPEC_AVAILABLE`;
- graph evidence identities, requirement levels, reviewer/evaluator
  authority, freshness, and proposed gate/reopen state when applicable;
- worst issue per axis when findings exist;
- routes for follow-up: `implement-change`, `functional-qa`,
  `test-autorepair`, `validate-change`, or `issue-intake`.

## Rules

- Do not edit files from this skill.
- Do not treat a review as validation evidence for commands that did not run.
- Keep review output findings-only; binding the reviewed head does not turn a
  review into command or test evidence.
- Do not let missing spec context block Standards review.
- Do not use completed or unrelated work packets as the spec source.
- Do not self-accept a node or mutate authoritative gate state; return evidence
  and a proposed transition to the lane-state owner.
