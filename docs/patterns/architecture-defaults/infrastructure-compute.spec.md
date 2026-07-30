# Compute Infrastructure

- Pair ID: `infrastructure-compute`
- Graph: `docs/patterns/architecture-defaults/infrastructure-compute.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use when an application or job needs runtime compute. Start from the actual
workload rather than a preferred orchestrator or cloud product.

## Default Architecture

```text
workload profile
  -> process/VM | container service | cluster | function | edge | batch | accelerator
  -> placement, capacity, scaling, identity, and network policy
  -> load, failure, drain, recovery, cost, and teardown proof
```

### Compute Candidate Families

| Family | Prefer when | Prove first |
|---|---|---|
| Process or VM | Stable long-running workload and direct host control are valuable | Patching, image lifecycle, process supervision, scaling, recovery, and operational ownership |
| Managed container service | Container packaging is useful without owning a cluster control plane | Runtime compatibility, scaling, networking, identity, storage, health, drain, and platform limits |
| Orchestrated cluster | Many workloads genuinely need shared scheduling, placement, policy, extensions, or existing cluster operations | Control-plane ownership, upgrades, capacity, policy, tenancy, observability, and failure domains |
| Function or serverless job | Work is bounded, event/request driven, and platform limits fit | Cold start, duration, concurrency, state, networking, retries, idempotency, cost, and local/CI proof |
| Edge runtime | User-facing latency or locality requires distributed execution | Runtime/API limits, data access, consistency, deployment, observability, security, and rollback |
| Batch or accelerated compute | Scheduled, queued, CPU/GPU, or high-throughput work dominates | Queueing, quotas, data movement, checkpointing, artifacts, cost, interruption, and cleanup |

## Reference File Structure

Keep compute modules under the target's infrastructure authority, with
environment inputs separate from reusable resource modules. Application startup
owns process composition; infrastructure owns placement and runtime resources.

## Default Decisions

- Select the simplest compute model that meets workload and recovery needs.
- Scale from measured signals with explicit bounds.
- Define startup, readiness, drain, cancellation, shutdown, and reschedule
  behavior.

## Validation Contract

- Prove runtime and architecture compatibility on the actual compute model.
- Prove startup, readiness, load, scaling limits, saturation, drain,
  cancellation, shutdown, reschedule, retry, and rollback.
- Prove workload identity, network reachability, secret access, resource limits,
  telemetry, alerts, cost ceilings, and teardown.

## Exceptions

A binding runtime platform may fix the compute model. Record platform limits,
coupling, failure behavior, cost, and exit constraints instead of inventing
alternative candidates.
