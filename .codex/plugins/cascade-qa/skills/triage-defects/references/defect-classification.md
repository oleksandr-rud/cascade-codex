# Defect classification rules

- `PRODUCT_DEFECT`: current observable behavior violates an accepted contract.
- `TEST_DRIFT`: accepted public behavior independently passes, while the test
  encodes a proven obsolete expectation or fixture.
- `ENVIRONMENT_OR_TOOLING`: the subject cannot be judged because setup,
  provider, runner, dependency, or observation tooling failed.
- `FLAKY`: repeated controlled executions diverge without an accepted state or
  input difference.
- `AMBIGUOUS`: behavior authority, reproduction, or evidence cannot distinguish
  the other classes.

An ambiguous failure remains a defect candidate in the typed ledger. Use
explicit `MISSING` markers for unavailable evidence fields, low or otherwise
conservative confidence, `repair_owner: null`, a separate `target-host`
evidence-collection handoff, and a rerun contract; never drop the record,
manufacture product/test ownership, or label the evidence collector as the
repair owner.

Changing implementation to satisfy an obsolete test is not test repair.
Changing an expectation to match a broken implementation is not product
repair. The triage artifact identifies the next owner but mutates neither.
An undigested report about a test expectation remains an untrusted claim, not
a current test source. It can supplement a digest-bound failure receipt and
independent public-boundary proof for classification, but test repair remains
gated on the exact current test revision.
