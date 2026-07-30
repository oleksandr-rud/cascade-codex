# Backend Stack

- Pair ID: `backend-stack`
- Graph: `docs/patterns/architecture-defaults/backend-stack.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use for a `backend-service` or `backend-worker` after the stack profile and
`service-api-worker` boundaries are known. Select application runtime and
framework here; select compute, databases, brokers, caches, and delivery
products through infrastructure extensions.

## Default Architecture

```text
backend claims and policies
  + service or worker workload
  + selected stack profile
  -> Bun/Hono | Go standard library | Python/FastAPI | adapted candidate
  -> real dependency and deployment proof
  -> selected runtime, framework, process profile, and owner
```

### Backend Runtime And Framework Profiles

| Technology | Use when | Avoid or prove first |
|---|---|---|
| Bun + Hono | The service is TypeScript-first and benefits from direct TypeScript execution, Web APIs, shared contract types, or a lightweight HTTP boundary. | Native Node modules, telemetry agents, database drivers, or deployment tooling depend on unverified compatibility. Prove the real dependency set. |
| Go standard library first | A long-lived API, gateway, worker, or network service benefits from static binaries, explicit concurrency, predictable deployment, and a small dependency surface. | Direct Python data/ML integration or shared TypeScript contracts dominate, or the team lacks a credible Go ownership path. |
| Python + FastAPI | The service is close to Python automation, data, scientific, or ML code and typed request models plus generated OpenAPI reduce delivery cost. | CPU-heavy request work, blocking dependencies without an execution plan, or mandatory compact single-binary delivery. |

Use the same runtime candidate independently for an API and worker. A worker
still needs explicit scheduling or delivery semantics, idempotency, retry,
shutdown, concurrency, and resource behavior.

### Backend Process Profiles

| Unit | Required proof |
|---|---|
| API/service | Request concurrency, timeouts, cancellation, auth, driver behavior, graceful shutdown, telemetry, migration and rollback compatibility |
| Worker | Delivery/schedule contract, job duration, CPU versus I/O, concurrency, idempotency, retry/dead-letter behavior, shutdown and resume |

Do not introduce a second backend language because its local syntax or
benchmark is attractive. Its product or operational advantage must exceed the
cost of another build, dependency, security, telemetry, deployment, and on-call
profile.

## Reference File Structure

Apply the selected runtime to the existing backend archetype:

```text
src/<app-name>/startup/
src/<app-name>/modules/<slice>/
  interface/
  application/
  domain/
  infrastructure/
src/libs/
```

The runtime changes idiomatic filenames and adapters, not ownership or
dependency direction. Infrastructure product clients remain adapters behind
module or shared-lib ports.

## Default Decisions

- Evaluate API and worker process profiles separately.
- Prefer one supported backend runtime until a specialist workload proves the
  operational cost of another.
- Keep runtime/framework selection separate from infrastructure products.

## Validation Contract

- Prove the actual database, cache, broker, telemetry, and auth clients.
- Prove request or job concurrency, cancellation, shutdown, and failure paths.
- Prove build, test, package, deployment target, rollback, and security-update
  routes.
- Record exact versions or compatible constraints and upgrade owner.

## Exceptions

An established backend runtime not listed here is a valid adapted candidate
when it satisfies the same claims, policy outcomes, boundaries, and proof
contract. The catalog is not permission to replace a coherent supported stack.

## Current Documentation Basis

- [Bun documentation](https://bun.sh/docs)
- [Hono documentation](https://hono.dev/docs/)
- [Go documentation](https://go.dev/doc/)
- [FastAPI documentation](https://fastapi.tiangolo.com/)
