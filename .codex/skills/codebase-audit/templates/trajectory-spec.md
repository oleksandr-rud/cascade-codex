# Security Trajectory Spec

## Identity

- Trajectory ID:
- Trajectory name:
- Owner skill:
- Requested by:
- Date:
- Status: planned | in-progress | complete | deferred | blocked

## Purpose

What risk, control, or system boundary this trajectory evaluates.

## Scope

In scope:

- 

Out of scope:

- 

## Source Order

1. Latest user request.
2. Current code and config.
3. Active specs and work docs.
4. Project security memory.
5. Official external research.
6. Assumptions.

## Entry Points

Backend:

- 

Frontend:

- 

Workers/agents/infrastructure:

- 

## Audit Questions

- What data, identity, tenant, or privileged action crosses this boundary?
- Which auth, role, tenant, audit, rate, trace, or storage controls apply?
- Which control is enforced by code rather than prompt text or convention?
- Which tests or probes prove the control?
- Which docs or product requirements conflict with current code?

## Required Evidence

| Evidence | Source | Status | Notes |
|---|---|---|---|
| Route/dependency inventory | file/command | missing / weak / proved | |
| Tenant filter evidence | file/line | missing / weak / proved | |
| Audit event evidence | file/line | missing / weak / proved | |
| Validation evidence | command/test | missing / weak / proved | |

## Findings

| Severity | Finding | Evidence | Requirement | Suggested next gate |
|---|---|---|---|---|
| P0/P1/P2/P3 | | | | |

## Regression Map

- Routes:
- Services:
- Agents/workers:
- Frontend API/state:
- Third-party providers:
- Tests/scenarios:

## Validation Plan

Commands or deterministic probes:

```bash

```

## Open Questions

- 

