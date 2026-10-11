# S16 — Feature delta

Bind the current specification/code baseline and precise changed contract IDs.
Describe the new user outcome, added/modified/preserved behavior, affected screens,
operations, handlers, data and tests. Define compatibility, migration, rollout,
recovery and replacement behavior where applicable. Preserve unaffected contracts
by reference rather than rewriting the whole application.

The section contains a delta table and impact diagram. The diagram distinguishes
changed, retained and removed elements in text, not color alone. Bind its edges
to actual caller/data dependencies and acceptance cases.

Check affected consumers and whether an old client/data version remains valid.
See [impact guidance](../../../spec-diagrams/references/trace-decisions.md).
