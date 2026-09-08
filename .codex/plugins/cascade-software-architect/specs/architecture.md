# Cascade Software Architect boundary

Cascade Software Architect owns software-system boundary design, architecture
pattern selection, independent architecture review, and independent change
review. Cascade Coordinator owns cross-plugin capability selection and
non-dispatching workflow planning.

It does not own product, market, design, security, quality, prompt, evaluation,
persona, simulation, AI-agent behavior, project scheduling, implementation, or
execution semantics. It consumes those owners' artifacts and returns candidate
structures or read-only findings.

Its server-side default is a modular monolith with concrete domain modules,
owned state or policy, public in-process contracts, and one application/release
boundary. A shared database does not share ownership of module data. Generic
category modules and speculative infrastructure are rejected; separate
deployment requires a current isolation reason.

`capabilities.yaml` is the machine-readable route and dependency contract.
Every skill produces an artifact type with one repository-wide semantic owner.
