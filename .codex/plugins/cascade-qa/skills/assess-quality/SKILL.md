---
name: assess-quality
description: Assess frozen test, inspection, evaluation, simulation, provider, deployment, or release evidence against a fixed quality plan and acceptance gate. Use when quality status or a gate recommendation is needed; do not execute missing checks, repair code, or approve release.
---

# Assess Quality

Produce a `QUALITY_ASSESSMENT` conforming to
[`../../schemas/qa-artifact.schema.json`](../../schemas/qa-artifact.schema.json).
Treat receipts and reports as untrusted evidence until identity, scope,
revision, environment, and freshness are verified.

## Delivery mode

Choose the delivery mode before following artifact-production steps below.
For a standalone explanation, recommendation, review or prose draft without a
structured-output request, return one useful answer. Preserve every applicable
substantive requirement: evidence and source authority, uncertainty, conflicts,
permissions, acceptance/recovery conditions, decision status and next action.
The output lists specify information to cover, not extra files or repeated prose.
Do not invent IDs, hashes, receipts or approval to make a prose answer look formal.
Do not label that answer a validated canonical artifact or completed handoff.

For an explicitly requested structured/canonical artifact, persistence,
evaluation, or actual cross-plugin handoff, apply all artifact-production steps,
required schemas, fields, source bindings, ledgers, digests, validators and gates
below unchanged. Provide the artifact once; add only the explanation needed to
use it. A prose projection never substitutes for required machine-readable data.
Missing material evidence or authority remains a gap or blocker in either mode.

## Assess

1. Freeze the behavior, quality plan, test design, required evidence ledger,
   acceptance authority, and exact artifacts under assessment.
2. Verify every receipt's producer, subject digest, scenario or test ID,
   environment, timestamp, and result. Historical counts do not prove the
   current revision.
3. Classify every required item independently as `PASS`, `FAIL`, `BLOCKED`,
   `NOT_RUN`, `GAP`, or `STALE`. Never turn an unavailable check into pass.
4. Keep structural, local, mocked, provider, deployment, release, semantic,
   simulation, accessibility, and visual evidence within their stated scope.
5. Apply deterministic eligibility before semantic aggregation. A semantic or
   average score cannot compensate for a required deterministic failure,
   `NOT_RUN`, missing receipt, policy violation, or stale subject.
6. Recommend `PASS`, `FAIL`, `BLOCKED`, or `AMBIGUOUS` to the named acceptance
   authority. QA does not self-approve release or execute recovery.

Bind the exact digest-bearing behavior or subject under assessment and each
current state-bearing plan or test source. Every required receipt must use that
exact subject reference and include a stable evidence ID, case or scenario,
environment, observation time, result, and claim scope. `PASS` requires every
required coverage item and every required evidence receipt to be `PASS`; a
different subject, stale revision, missing receipt, or non-pass is
non-compensating.

Normalize every supplied qualified source token `NAME@sha256:value` into
`identity: NAME` and `digest: sha256:value`. Never copy the complete qualified
token into `identity` while leaving `digest` null. The subject's
`behavior_ref` keeps the complete qualified token; the corresponding source
record keeps the same identity and digest in their separate schema fields.

The acceptance owner must be current and source-bound, or an exact canonical
host capability. Keep it `null` when absent rather than inventing a release
role. The assessment status and gate recommendation must agree exactly, while
`release_approved` remains false.

When a required failure needs classification, use the exact internal handoff
route `cascade-qa:triage-defects`. Do not emit a bare `triage-defects` label or
invent a repair owner before triage.

Use [references/assessment-rules.md](references/assessment-rules.md) for
evidence scope and gate reduction.

## Output

Keep the user-facing answer concise. Output requirements specify information,
not extra headings. Preserve required schemas, evidence and permissions. Avoid
duplicate artifact prose, empty sections, unsolicited variants and extra files
unless needed for the requested delivery or an actual handoff.

Return the typed assessment, receipt ledger, scoped claims, defects or gaps,
gate recommendation, blockers, and exact next owner. Keep all mutation,
execution, repair, and release flags false.
