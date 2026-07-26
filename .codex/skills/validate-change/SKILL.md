---
name: validate-change
description: Use after or during a change to aggregate command, test, type, diff, link, scenario, functional acceptance, and review evidence into validation status.
---

# Validate Change

Use after implementation, during feedback loops, or whenever confidence depends
on evidence. This skill aggregates existing evidence; it does not execute
missing product-visible proof, replace fixed-point review, or repair stale tests.

Use this skill directly when the evidence already exists and the task is to
assess freshness, invalidation, gate impact, the earliest responsible node,
workline, or contract, and the smallest trustworthy reopen set. A graph-shaped
subject does not require `orchestrate-work` as a supporting route. Use
`functional-qa` only when new product-visible proof must be authored or
executed; use `orchestrate-work` only when topology, scheduling, ownership,
dispatch, or materialization coordination must change.

## Source Order

1. Latest request, current plan, behavior examples, and required evidence.
2. Current diff and directly affected feature contracts.
3. Targeted command, test, functional, scenario, and review evidence.
4. Current work lane, Feature Impact Matrix, and directly relevant specs.
5. `docs/patterns/testing/index.md`, `docs/patterns/workflow/index.md`, and
   boundary or context-memory patterns when the change touches those areas.
6. The plan's graph-fragment selection ledger, port bindings, resolved test and
   evaluator assignments, and applicable source fragment definitions.
7. `docs/patterns/workflow/graph-shaped-work.md` plus the applicable lane-local
   Task Graph and/or authoritative `docs/work/graphs/CG-XXX-*.md` Coordination
   Graph when validation evaluates a graph, materialization, batch, or terminal
   gate.

## Modes

- `targeted`: smallest relevant lint/type/unit/integration checks.
- `functional`: browser/API/journey/scenario evidence from `functional-qa`.
- `review`: Standards/Spec findings from `review-change`.
- `regression`: broader coverage when blast radius is high.
- `coverage`: scoped current-task criteria to changed code and tests.
- `feature-impact`: Feature Impact Matrix coverage for directly changed and
  protected adjacent behavior.
- `batch`: shard-complete evaluation against one version-bound Batch Evaluation
  Matrix.
- `materialized-integration`: checks against the combined uncommitted state in
  the designated active worktree.

## Direct Evidence-Assessment Boundary

For a read-only assessment of an existing receipt, check, batch, materialization,
or integrated result:

1. load the current evidence and its authoritative Task Graph or Coordination
   Graph records directly;
2. assess subject/revision/input/transport/materialization/target/environment
   freshness and preserve the failing or stale receipt as historical evidence;
3. identify the earliest responsible node, workline, or contract;
4. calculate gate impact and reopen only the invalidated subject,
   materializations, downstream consumers, batches, and terminal inputs whose
   named bindings are no longer trustworthy;
5. preserve accepted work whose inputs, contracts, and evidence remain current;
   and
6. return evidence plus proposed transitions to the lane-state or
   coordination-state owner without mutating authoritative graph state.

Do not load `functional-qa` merely because an existing receipt is functional.
Do not load `orchestrate-work` merely because the subject is graph-shaped or a
bounded reopen set must be calculated. Route onward only after the assessment:
to `functional-qa` for missing new product-visible proof, `implement-change` for
a product/source defect, `test-autorepair` for proven stale tests,
`plan-change` for an actual definition/gate/topology decision change, or
`orchestrate-work` for an actual scheduling/ownership/dispatch/materialization
coordination change.

## Checklist

1. Read current diff, plan, behavior examples, and validation requirements.
2. Run targeted checks before broad checks.
3. Compare current request and current work-lane criteria against changed files and
   tests using `docs/patterns/workflow/index.md`.
4. When graph fragments were composed, build a fragment evidence matrix keyed
   by fragment instance and source version. Verify current port bindings,
   owning workline, actor/skill resolution, every required test/evaluator input,
   conditional-test disposition, produced ports, omission reasons, and repair
   routes. Evidence from omitted fragments is neither required nor silently
   reused; missing selected required evidence is `GAP` or `BLOCKED`, never
   acceptance.
5. Compare Feature Impact Matrix rows against the diff, source docs/spec IDs,
   touched code/public contracts, and required checks. If no matrix exists for
   a product-visible change, infer the directly changed feature and likely
   protected adjacent behavior from the plan and diff, then report missing
   contracts or checks as `GAP`.
6. Treat uncovered required behavior as `FAIL`, unless explicitly deferred or
   blocked.
7. Route feature-impact findings by contract: documented expected behavior
   broken by the change goes to `implement-change`; stale tests for correct
   behavior go to `test-autorepair`; missing or ambiguous contracts go to
   `plan-change`; missing required checks go to `functional-qa`.
8. Use `review-change` for fixed-point Standards/Spec review; keep findings
   separate from command/test evidence.
9. Use `functional-qa` to author or execute missing product-visible acceptance
   proof. Consume and assess existing functional evidence directly here.
10. Use `test-autorepair` only when evidence shows tests are stale while behavior
   still matches the expected contract.
11. Load `docs/patterns/boundaries/index.md` for public-contract or model/tool
   runtime changes and `docs/patterns/context-memory/index.md` for
   retrieval/source-context changes.
12. For research, source-context, prompt, policy, or semantic-core changes,
    report structural validation separately from factual or methodological
    validation. Passing commands do not prove source coverage, evidence
    strength, claim truth, or docking quality.
13. Report `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, or `GAP` with commands and
    evidence.
14. For graph-shaped work, inventory every gate input without merging its
    evidence class. Each functional, command, Standards, Spec, or semantic
    evidence record retains a stable evidence ID; subject node/workline/
    materialization/batch/gate; graph revision; attempt; input/source versions;
    producer transport and source commit/digest; evidence locus; producer;
    production time; required/optional level; named evaluator/reviewer
    authority; acceptance criteria; invalidation condition; and failure route.
    Integrated evidence also binds materialization IDs, target HEAD, combined
    diff fingerprint, and environment. Missing identity or evaluator authority
    is `GAP`.
15. Evaluate the join explicitly: all required current inputs must pass;
    required `FAIL` fails it; required `BLOCKED` blocks it; required `GAP` or
    `NOT_RUN` keeps it from acceptance; optional `NOT_RUN` records optionality
    and reason. Validation aggregates evidence and proposes a gate state; only
    the applicable lane-state or coordination-state owner records `OPEN`,
    `ACCEPTED`, `FAILED`, or `BLOCKED` transitions.
16. For batch validation, verify required workline/materialization gates,
    immutable producer transports, target HEAD/combined diff, definition and
    runner/model/environment/rubric versions, every expected shard, requirement
    levels, missing/duplicate policy, and aggregation rule. Deduplicate by
    stable evidence ID and subject; never silently average duplicates. A missing
    required shard or required `FAIL`, `BLOCKED`, `GAP`, or `NOT_RUN` prevents
    acceptance.
17. For materialized integration, verify the source receipts/transports,
    materialization set and lifecycle, target active worktree/branch, target
    HEAD, combined diff fingerprint, staged state, and preserved dirty paths.
    Worker-local or pre-materialization evidence remains provisional and cannot
    prove the combined state. Validation may propose `APPLIED -> VALIDATING`
    and, after current checks, `VALIDATING -> ACCEPTED`, or the declared failure/
    block route; only the materialization owner records each transition.
18. Recheck freshness against the current subject, fragment source/version and
    bound ports, graph revision, attempt,
    named inputs/sources, producer transport, materialization set, batch
    definition, target HEAD/combined diff, environment, and commit where
    applicable. Invalidated evidence proposes `ACCEPTED -> OPEN`, identifies the
    earliest responsible node/workline/contract, and reopens only its affected
    materialization plus downstream consumers/batches whose named input,
    contract, gate, or evidence is no longer trustworthy. Preserve unrelated
    accepted work.
19. When the request is only this freshness/invalidation and repair-impact
    assessment, finish it in `validate-change`; do not add `functional-qa`,
    `plan-change`, or `orchestrate-work` as supporting routes unless the named
    follow-up condition for that skill is actually present.

## Output

- commands run and results;
- selected-fragment evidence matrix with source versions, ports, owning
  worklines, skill/test/evaluator resolution, conditional dispositions, and
  omitted-fragment exclusions;
- evidence-input matrix with identities, producers, evaluator/reviewer
  authorities, requirement levels, evidence locus, transport/materialization/
  target/batch bindings, freshness, and acceptance criteria;
- functional/scenario evidence;
- Feature Impact Matrix coverage and routes;
- work-lane/spec coverage matrix summary;
- failures and routing;
- proposed gate/materialization/batch state, invalidated evidence, earliest
  responsible graph node/workline/contract, affected materializations and
  consumers/batches, preserved accepted work, and deterministic failure/reopen
  route when graph-shaped;
- explicit direct-route disposition for any unnecessary functional-QA,
  replanning, or orchestration hop;
- residual risk.
