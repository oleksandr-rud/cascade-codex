---
name: architect-software-system
description: Design or revise a source-grounded software-system architecture, including boundaries, application units, interfaces, data and state ownership, runtime resources, delivery constraints, and validation seams; use before a cross-boundary implementation when the architecture itself is unresolved, not for ordinary code edits or AI-agent topology alone.
---

# Architect Software System

Produce a reviewable architecture candidate from current sources. Start with
observable behavior and ownership, then select the smallest structure that
satisfies the accepted constraints.

Map application units, public contracts, state/data owners, trust boundaries,
runtime resources, dependency categories, failure behavior, delivery and
operability constraints, and validation seams. Use `select-architecture-patterns`
only with a host-supplied, versioned pattern catalog. Classify every applicable
pattern `ADOPTED`, `ADAPTED`, `REJECTED`, or `GAP`; a reference default is not a
mandate.

Keep domain decisions with their owning plugins and application facts with the
target repository. Do not scaffold source, select dependencies, mutate a target,
or accept the candidate. Return sources, assumptions, boundaries, alternatives,
chosen structure, consumer impacts, risks, validation gates, and unresolved
gaps.
