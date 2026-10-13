# S10 — Business rules and access

Use IDEF9's rule-discovery viewpoint to expose the business logic. For each rule
record its context, condition, allowed/denied outcome, enforcement location,
user-visible error and acceptance. Specify authentication/session behavior,
resource ownership, role/scope checks and trust boundaries when present.

The section contains rules and access tables. Its diagram traces a consequential
rule to its enforcing handler/DB mechanism and test, or shows sensitive data
crossing trust boundaries. Bind edges to specific checks. UI visibility alone
does not enforce a permission. An LLM proposal does not grant authorization.

Check negative access cases and integrity under concurrent requests. See
[trust dataflow](../../../spec-diagrams/references/architecture-dataflow.md).
