# State, claims, observations and memory

Authoritative domain state belongs to the target application. Observations are source-
bound events. Claims are model interpretations with support and uncertainty. Derived
memory summarizes accepted records and remains traceable to its sources.

Analyzer emits the [claims/actions contract](claims-actions-admission.md). Admission
eligibility retains the original support status; it is neither factual acceptance nor
domain mutation. The Policy Engine may record admitted analyses under host authorization.
Explicit domain effects use registered host operations outside the Analyzer wire.

Each role's Context Builder projects only task-relevant, authorized records from a
current snapshot. Preserve conflicts, uncertainty, source references, current user input
and unresolved obligations. Compaction cannot silently turn reported claims into facts,
drop a pending obligation or create permission. A fresh analysis follows new research.

Memory changes require an explicit host-owned contract and CAS/idempotency. The previous
standalone mutation-store example is retired; targets implement their own store and
validate its isolation, conflicts, evidence retention and replay behavior.
