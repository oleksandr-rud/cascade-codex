# Quality assessment rules

## Evidence eligibility

Evidence is eligible only when producer, subject revision, case identity,
environment, result, and freshness are known. A report without an immutable
subject binding is GAP or STALE. Authored cases are not executed cases.

## Non-compensation

Required deterministic checks are binary gates. Any required `FAIL`,
`BLOCKED`, `NOT_RUN`, `GAP`, or `STALE` item prevents a PASS recommendation.
Semantic scores are reduced only after deterministic eligibility and cannot
erase a deterministic failure.

## Claim scope

State exactly what each receipt proves. Local and mocked checks do not prove a
live provider. Browser structure does not prove pixel parity. Simulation does
not prove production usage. A release recommendation is not release approval.
