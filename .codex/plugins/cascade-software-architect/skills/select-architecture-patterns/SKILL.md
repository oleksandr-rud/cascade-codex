---
name: select-architecture-patterns
description: Select and compose architecture patterns from a host-supplied versioned catalog using current source claims, compatibility constraints, required relationships, and explicit dispositions. Use when architecture defaults or design patterns must be chosen or rejected; do not invent pattern bodies or treat a reference default as mandatory.
---

# Select Architecture Patterns

Consume only the smallest relevant pattern entries and their exact source
locators. Resolve base architecture before stack, application contour before
its technology extension, and operated resources independently. Verify declared
`extends`, `requires`, `conflicts_with`, and `preserves` relationships before
composition.

For each candidate, record source claims, applicable policies, disposition
(`ADOPTED`, `ADAPTED`, `REJECTED`, or `GAP`), rationale, preserved contracts,
required evidence, and affected consumers. A missing required pattern or
validation is `GAP`; do not substitute an adjacent contour. Return a candidate
selection record only. The host owns its catalog, source retrieval, scaffolding,
and validation commands.
