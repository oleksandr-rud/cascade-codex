# S14 — Acceptance and tests

Specify observable success and failure for accepted behavior. Each case names
requirement/scenario/contract IDs, fixture, actor/environment, actions, expected
result and oracle. Cover permissions, data integrity, concurrency and external
effects where those risks exist. Use exact run commands and separate planned
checks from executed evidence. A model judge is needed only for meaning-dependent
oracles; typed judgments must remain distinct from mechanical format checks.

For a proposed specification, label candidate acceptance against that proposal.
Missing owner acceptance remains explicit; case authoring cannot supply it.
Non-software acceptance may use observation or a business experiment.

The section contains acceptance cases and current evidence. Its trace diagram
connects a capability through scenario and enforcing contracts to acceptance.
Bind every node; diagram connectivity alone cannot establish useful coverage.

Check meaningful boundary behavior rather than test counts. See
[traceability guidance](../../../spec-diagrams/references/trace-decisions.md).
When cases or testability need development, apply
[W04 test design](../development-policies/W04-test-design.md) before implementation:
choose the enforcing boundary, a reproducible fixture and a falsifiable oracle.
