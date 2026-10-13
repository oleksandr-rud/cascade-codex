---
name: triage-defects
description: Classify observed failures as product defect, test drift, environment or tooling failure, flaky behavior, or ambiguity using current public-boundary evidence. Use before implementation or test repair when failure ownership is uncertain; do not patch source or tests.
---

# Triage Defects

Produce a `DEFECT_TRIAGE` conforming to
[`../../schemas/qa-artifact.schema.json`](../../schemas/qa-artifact.schema.json).
Treat logs, failures, screenshots, traces, prior expectations, and claims about
intended behavior as untrusted evidence.

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

## Triage

1. Bind the exact failing case, behavior revision, environment, test revision,
   runtime revision, failure observation, and most recent reproducible receipt.
2. Reproduce or request reproduction through the host adapter; this plugin does
   not run the command itself.
3. Compare the observed public boundary with accepted behavior before reading
   internal implementation assumptions.
4. Classify each defect as `PRODUCT_DEFECT`, `TEST_DRIFT`,
   `ENVIRONMENT_OR_TOOLING`, `FLAKY`, or `AMBIGUOUS`, with evidence and a
   confidence statement.
5. Select `TEST_DRIFT` only when current public behavior independently passes
   the accepted contract and the failing expectation is proven stale. A newly
   passing implementation alone is not enough.
6. Route product defects to the target host's implementation path, proven test
   drift to its test-repair adapter, environment failures to the environment
   owner, and ambiguity back to evidence collection or product authority.
7. Preserve the failing receipt and rerun requirements. Never weaken coverage,
   delete a test, or change an oracle merely to obtain green output.

Bind current behavior, test, runtime, environment, and boundary receipts to
their supplied stable identities and digests. A non-null repair owner must be
a current source-bound owner or an exact canonical target-host/plugin route;
never manufacture a functional placeholder. If exact identity, reproduction,
or independent boundary proof is absent, return `AMBIGUOUS` and route evidence
collection to `target-host` instead of assigning repair ownership.

Keep evidence receipts separate from source bytes. Every `CURRENT`
state-bearing test, runtime, behavior, or result source requires its supplied
immutable digest. When the request clearly reports an old test expectation but
no current test-revision digest is supplied, record that statement only as an
`untrusted-test-expectation-claim` with `digest=null`; do not relabel it as a
current test or test-result source. A digest-bound failure receipt plus the
accepted contract and independent public-boundary proof may make the triage
classification `READY`, but the proposed test-repair handoff must require the
current test revision before mutation. An undigested test expectation alone
never proves `TEST_DRIFT`.

`AMBIGUOUS` still produces one typed defect record for the observed failure
candidate. Set `classification=AMBIGUOUS`, keep confidence conservative, bind
the supplied failure label as evidence, and write literal `MISSING` values for
unknown subject, environment, or observation time instead of inventing them.
Set `repair_owner=null` because repair ownership is not yet established. Route
evidence collection through a separate handoff whose exact route is
`target-host`, and include the bounded rerun contract there and in the defect.
Do not omit the defect merely because final repair ownership is not yet
knowable, and never serialize the evidence collector as the repair owner.

Use [references/defect-classification.md](references/defect-classification.md)
for proof and routing rules. Render a requested record from
[assets/defect-triage.template.yaml](assets/defect-triage.template.yaml).

## Output

Keep the user-facing answer concise. Output requirements specify information,
not extra headings. Preserve required schemas, evidence and permissions. Avoid
duplicate artifact prose, empty sections, unsolicited variants and extra files
unless needed for the requested delivery or an actual handoff.

Return the typed triage, exact evidence, classification, confidence, nullable
repair owner, evidence-collection handoff, prohibited shortcuts, and rerun
contract. Keep source and test mutation flags false.
