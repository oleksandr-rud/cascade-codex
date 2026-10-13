# S03 — Scenarios and processes

For each material behavior define actor, trigger, preconditions, ordered steps,
success result, alternatives, failure, recovery and postconditions. Describe
business events and observable consequences before choosing technical layers.
Reuse IDEF3's process and object-state viewpoints where useful.

The section contains numbered scenarios and corresponding process flows. Label
branches with explicit conditions; explain parallel joins and re-entry/retry.
Bind consequential steps to the enforcing operation, handler or human role and
to acceptance. Show a failure branch that changes the result, not every possible
low-level exception in one diagram.

Check that a developer can determine what happens after a failure or repeated
action. See [process guidance](../../../spec-diagrams/references/process-state.md).
