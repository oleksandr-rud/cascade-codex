# Simulation Campaign Design: `<campaign-id>`

## Identity

- Status:
- Owner and lane:
- Campaign ID and version:
- Source revision:
- Current authority state:
- Requested outcome:

## Campaign Decision

- Contour:
- Driver:
- Tier:
- Platform:
- Purpose:
- Claims this campaign may support:
- Non-goals:
- Reason this must be separate from adjacent campaigns:

## Definition Graph

| Surface | ID or path | Version or digest | Status |
|---|---|---|---|
| Manifest | | | |
| Tasks | | | |
| Simulation | | | |
| Populations and scenarios | | | |
| World and reset fixture | | | |
| Dataset partitions | | | |
| Claims | | | |
| Policies | | | |
| Oracles | | | |
| Metrics | | | |
| Treatments and baseline | | | |
| Calibration definition | | | |
| Fixtures | | | |
| Generated catalog | | | |

## Runtime Contract

- Runtime and adapter:
- Environment and platform:
- Operator, evaluator, target, and recovery session separation:
- Identity and permission scope:
- Isolation boundary:
- Reservation, lease, and recovery authority:
- Policy scope, version, default-deny, and ambiguity behavior:
- Confirmation receipt binding and expiry:
- Timeout and required budget dimensions:
- Fixture or seed identity:
- Evidence root:
- Evidence producer, platform, lineage, and redaction:
- Cleanup contract:
- Terminal finalization and verification:
- Retry and replay parentage:

## Claim Map

| Claim ID | Statement and scope | Policies | Required oracles/metrics | Calibration required | Evidence target | Reduction rule |
|---|---|---|---|---|---|---|
| | | | | | | |

## Population, Data, And Calibration

- Population source and reference window:
- Actor weights and required risk slices:
- Scenario distribution and stop conditions:
- Stateful world and negative behavior:
- Development/regression/holdout/calibration-reference identities:
- Leakage and minimization rules:
- Metric directions, aggregations, and hard gates:
- Baseline and treatment identities:
- Reference labels and reviewer identity:
- Sample, slice, agreement, correlation, and freshness thresholds:
- Calibration invalidation inputs:

## Lifecycle

| Stage | Inputs | Expected output | Failure status | Evidence |
|---|---|---|---|---|
| Preflight | | | | |
| Provision | | | | |
| Seed | | | | |
| Execute | | | | |
| Observe | | | | |
| Evaluate | | | | |
| Freeze | | | | |
| Cleanup | | | | |
| Handoff | | | | |

## Selection And Replay

- Selection filters:
- Ordering and sharding:
- Retry policy:
- Replay command or route:
- Flake classification:
- Stop conditions:

## Validation Matrix

| Gate | Expected evidence | Status |
|---|---|---|
| Definition validation | | NOT_RUN |
| Preflight | | NOT_RUN |
| Execution | | NOT_RUN |
| Claim reduction | | NOT_RUN |
| Calibration reduction | | NOT_RUN |
| Target-project reference comparison | | NOT_RUN |
| Evidence freeze | | NOT_RUN |
| Cleanup | | NOT_RUN |
| Handoff receipt | | NOT_RUN |

## Handoff

- Frozen artifact root:
- Result digest:
- Cleanup status:
- Residual risk:
- Next owner:
- Explicitly not proven:
