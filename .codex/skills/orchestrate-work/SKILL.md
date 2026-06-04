---
name: orchestrate-work
description: Use when Orchestrator needs to split, schedule, track, or merge autonomous work lanes, especially when work can run in parallel or must be serialized because of dependencies, file conflicts, or shared decisions.
---

# Orchestrate Work

Use this skill before or during non-atomic work when there may be multiple
independent lanes, dynamic subtasks, incoming specs, or parallel validation
opportunities.

This skill coordinates work; it does not patch product/runtime code by itself.

## Source Order

1. Latest user request and active goal.
2. `docs/work/active.md` and any relevant `docs/work/lanes/*.md`.
3. Current code, tests, changed files, and planned validation commands.
4. `CODEX.md`, `AGENTS.md`, `harness.config.yaml`, and relevant workflow
   skills.
5. `docs/patterns/workflow.md`.
6. `docs/structure.md` for lane/report write targets.

## Task Routing Table

| Task type | Next route |
|---|---|
| New project setup, harness install, onboarding, or adaptation | `project-onboarder` or `adapt-harness` |
| New feature, ticket, screenshot, design note, or source spec | `ingest-spec -> plan-change` |
| Unclear product/design intent, missing persona, or missing journey | `discover` |
| Behavior-visible change | `functional-qa` before or alongside implementation evidence |
| Implementation, bug fix, or refactor | `plan-change -> implement-change` unless atomic |
| Cross-boundary architecture risk | `architecture-review -> plan-change` |
| Standards/Spec review for WIP, branch, or PR | `review-change` |
| Failed stale test while product behavior is correct | `test-autorepair` |
| Product bug found by tests or functional checks | `implement-change` |
| Issue body, tracker ticket, or durable bug report request | `issue-intake` |
| Finished, blocked, or handoff-ready work | `closeout` |

Human review is an explicit open-question or exception path, not a standalone
workflow route.

## Lane Decision Rules

Use one active row in `docs/work/active.md` when the change is small.

Create lane packets under `docs/work/lanes/` when a workstream needs its own:

- acceptance criteria;
- behavior examples;
- validation commands;
- blocked/deferred decisions;
- owner or delegated role;
- independent evidence to merge later.

Parallel lanes are allowed only when:

- they write disjoint files or have a single merge owner;
- they do not depend on each other's unfinished output;
- they do not share unresolved product/design decisions;
- each lane has an explicit validation gate;
- the merge step can aggregate evidence deterministically.

Serialize lanes when file ownership, public contracts, state-machine behavior,
or product intent overlaps.

## Checklist

1. Classify work as `single-lane`, `parallel-sectioning`, `parallel-voting`,
   `orchestrator-workers`, or `evaluator-optimizer`.
2. Record lanes in `docs/work/active.md`.
3. Create lane packets only for lanes that need more detail than a row.
4. Assign each lane a next gate from the task routing table.
5. Track dependencies and conflicts before starting edits.
6. Merge evidence into `docs/work/active.md` before closeout.
7. Write a report under `docs/work/reports/` only when requested, multi-turn,
   blocked, or decision-heavy.

## Output

- lane model selected;
- active lanes and dependencies;
- parallel-safe lanes;
- serialized lanes and reason;
- next gates;
- merge and validation plan.
