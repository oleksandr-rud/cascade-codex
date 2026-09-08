# Cascade Software Architect boundary

Cascade Software Architect owns software-system boundary design, architecture
pattern selection, non-dispatching cross-plugin capability graphs, independent
architecture review, and independent change review.

It does not own product, market, design, security, quality, prompt, evaluation,
persona, simulation, AI-agent behavior, project scheduling, implementation, or
execution semantics. It consumes those owners' artifacts and returns candidate
structures or read-only findings.

`capabilities.yaml` is the machine-readable route and dependency contract.
Every skill produces an artifact type with one repository-wide semantic owner.

Capability descriptors may declare `optional_consumes` in addition to required
`consumes`. Plan nodes select only a declared, relevant subset. The host checks
availability, ownership and order for selected optional inputs; absent optional
inputs do not create prerequisites. Existing descriptors and plans remain valid
without the optional field.
