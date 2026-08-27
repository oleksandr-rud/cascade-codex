---
name: run-qa-plan
description: Execute an authorized, frozen Cascade QA test design through the current repository's registered command, API, browser, CLI, or other test adapters and freeze receipts. Use only when a valid QA artifact already defines the cases and evidence contract; do not design tests, assess quality, or patch failures.
---

# Run QA Plan

This is a target-host execution adapter. Portable quality planning and test
semantics belong to `cascade-qa:plan-quality` and
`cascade-qa:design-tests`; quality reduction belongs to
`cascade-qa:assess-quality`.

## Execute

1. Resolve the exact QA artifact, behavior revision, subject digest, test IDs,
   registered `adapter_id` values, environment, permissions, data boundary,
   stop conditions, cleanup, and expected receipt contract.
2. Reject an invalid, stale, ambiguous, raw-command-bearing, or unauthorized
   artifact. A QA plan proposes execution; it does not grant permission.
3. Map each requested adapter to current `harness.config.yaml`, repository
   scripts, browser tooling, or an explicitly supplied interface. Never invent
   a command, target, credential, provider, deployment, or destructive setup.
4. Run only the selected cases within current user authority. Stop on a defined
   safety boundary, invalid environment identity, scope drift, or prohibited
   data requirement.
5. Freeze one receipt per case with subject digest, adapter, environment,
   inputs, observation identity, status, timestamp, cleanup result, and claim
   scope. Preserve `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, `GAP`, and `STALE`.
6. Clean up only case-owned transient state and retain the evidence required by
   the plan. Never delete failed receipts.
7. Hand the frozen artifact and receipts to `cascade-qa:assess-quality`. Route
   failures to `cascade-qa:triage-defects` before implementation or test repair.

## Output

Return the exact plan identity, executed and unexecuted test IDs, per-case
receipts, cleanup status, deviations, blockers, and next plugin route. State
what remains `NOT_RUN`; execution evidence never self-approves release.
