---
name: review-architecture
description: Review a proposed or existing software, plugin, workflow, or AI-system architecture for ownership, boundary, contract, dependency, state, failure, operability, security, and validation defects. Use for architecture-specific independent review; remain read-only and leave domain acceptance to its owner.
---

# Review Architecture

Recover the exact architecture claim, authoritative sources, accepted
assumptions, current candidate, and all direct or hidden consumers. Trace
behavior through public contracts, state/data owners, interfaces, dependencies,
runtime resources, permissions, failure paths, observability, and validation.
For cross-boundary modules, public contracts, shared abstractions, state
machines, or major refactors, apply
[checklists/deep-module-review.md](checklists/deep-module-review.md).

Check for duplicated authority, bypassed boundaries, cyclic dependencies,
shallow abstractions, invalid pattern composition, write conflicts, missing
recovery or stop behavior, stale consumers, and evidence stronger than the run
supports. Rank actionable findings by impact and confidence with exact source
locations. Distinguish candidate defects from pre-existing state. If no finding
remains, state `NO_FINDINGS` and list residual risk and `NOT_RUN` evidence.

This skill does not patch the architecture, approve a product, accept release,
or replace Security, QA, or domain review.
