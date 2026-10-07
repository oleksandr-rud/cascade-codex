---
name: resolve-validation-failure
description: Resolve a current validation failure by proving its owner and repairing the authorized implementation, stale test, environment or flaky boundary. Use after a concrete failing check; preserve accepted behavior and meaningful coverage, and stop unresolved ambiguity.
---

# Resolve Validation Failure

Bind the failing command/case, source and test revisions, accepted behavior and current
environment. Preserve the failure. Reproduce with the smallest appropriate check.

Use an existing current cascade-quality:triage-defects assessment when supplied. When
ownership is uncertain, have that method classify the evidence as PRODUCT_DEFECT,
TEST_DRIFT, ENVIRONMENT_OR_TOOLING, FLAKY or AMBIGUOUS. Meaning requires LLM
interpretation and explicit uncertainty; no keyword/substring classification.
An ordinary proven implementation failure does not require a separate document factory.

- PRODUCT_DEFECT: implement-change repairs the public behavior and preserves the oracle.
- TEST_DRIFT: change only proven stale tests/fixtures/locators after accepted public
  behavior independently passes and the current test revision is bound. Preserve coverage.
- ENVIRONMENT_OR_TOOLING: repair the authorized environment/adapter, or return the
  concrete missing capability. Do not alter behavior or tests to conceal the failure.
- FLAKY: reproduce and fix the observed race/instability; retries expose evidence and
  do not convert an intermittent failure into acceptance.
- AMBIGUOUS: collect the missing boundary evidence or resolve the behavior contract.
  Do not invent a repair owner or overwrite an oracle.

Keep writes inside the existing request. Never weaken an assertion, remove a meaningful
case or mask a defect to obtain green output. A declared class cannot itself authorize
mutation. Re-run the failing check and affected regression boundaries, then validate-change.
Return the proven owner, actual change, retained coverage, current evidence and unresolved
items. This replaces the old isolated test-only entrypoint with one evidence-bound recovery
path; test-only permission remains a strict conditional mode.
