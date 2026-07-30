# Work Lane: W-019 Frontend And Fullstack Infrastructure

Status: `COMPLETE`
Owner: `agent-engineer`
Coordinator: `W-018 orchestrator`
Created: 2026-07-28
Lane Model: `parallel-sectioning`
Next Gate: `none`

## Request

Add the `frontend-infrastructure` graph/spec pair for static, SSR, streaming,
edge, hybrid, embedded-BFF, and fullstack composition decisions.

## Acceptance Criteria

- The pair extends `infrastructure`, requires the web frontend/app-stack
  authority, and preserves applicable infrastructure decisions.
- Static clients can select delivery only.
- SSR and edge modes explicitly route compute, delivery, secrets,
  observability, and justified cache/session resources.
- Embedded and separate BFF boundaries are deterministic.
- Browser code cannot own infrastructure credentials or direct database,
  cache-service, queue, or broker access.
- Fullstack remains composition of application units, not a new app type or
  duplicate infrastructure resource tree.

## Scope

Exclusive writes:

- `docs/patterns/architecture-defaults/frontend-infrastructure.graph.yaml`;
- `docs/patterns/architecture-defaults/frontend-infrastructure.spec.md`.

Out:

- frontend context-pack edits;
- infrastructure root or shared validator edits;
- framework/library selection;
- source or IaC scaffold generation.

## Behavior Examples

| ID | Example | Expected |
|---|---|---|
| `FFI-001` | A static React/Vite client has no server runtime requirement. | delivery and edge resources only |
| `FFI-002` | A Next.js app uses SSR, streaming, and revalidation. | compute, delivery, secrets, server/browser telemetry, and explicit cache policy |
| `FFI-003` | Route handlers only aggregate UI data and share one build/release owner. | embedded BFF may remain in the frontend unit |
| `FFI-004` | A BFF owns domain workflows, durable data, multiple clients, or independent scaling. | classify a separate `backend-service` unit |
| `FFI-005` | SSR wants another service's database credentials. | reject; use the owning application interface |

## Feature Impact Matrix

| Feature | Touched | Protected behavior | Check | Status |
|---|---|---|---|---|
| Frontend infrastructure profile | yes | frontend app-stack and policy pairs retain their authority | pair validation | `NOT_RUN` |
| Frontend cache | relationship only | browser/query semantics stay in `frontend-cache` | ownership marker check | `NOT_RUN` |
| Fullstack | yes | no seventh application type | schema enum and spec marker | `NOT_RUN` |
| Backend resources | relationship only | independent backend unit owns domain/data/messaging | graph relationship check | `NOT_RUN` |

## Plan

1. Author graph nodes for delivery mode, server runtime, edge/delivery,
   sessions/secrets, observability, BFF boundary, resource routing, proof, and
   selected profile.
2. Author decisions for static-first, SSR proof, edge placement, cache
   separation, browser credentials, embedded-BFF eligibility, and separate-BFF
   classification.
3. Document fullstack composition and failure/security proof.
4. Validate graph/spec links and hand W-018 a two-file receipt plus normalized
   decision/node inventory.

## Agent And Skill Routing

- Execution: one direct `agent-engineer` subagent after explicit W-018
  dispatch.
- Required skills: `architecture-review -> implement-change`.
- Optional review: `designer` only if the work changes UI component,
  interaction, accessibility, or design-system rules; SSR/BFF infrastructure
  alone does not trigger that role.
- Write boundary: the two profile files in Scope.
- Handoff: no merge by the section agent; return the pair identity, inventory,
  validation results, and any stop condition to W-018.

## Dependencies And Handoff

- Must wait for: W-018 IG-IP-01.
- Can run with: W-020-W-022.
- Merge owner: W-018.
- Stop condition: the design needs a new app type, resource kind, schema field,
  or `fullstack-infrastructure` pair.

## Validation

| Check | Status |
|---|---|
| YAML parse and graph endpoint resolution | `PASS` |
| graph/spec bidirectional identity | `PASS` |
| required/preserved relationship resolution | `PASS` |
| SSR/BFF/fullstack marker checks | `PASS` |

## Closeout

- Report: `docs/work/reports/2026-07-28-contour-infrastructure-implementation-graph.md`.
- Implementation evidence: `PASS`; 11 nodes, 12 edges, and 10 decisions.
- Pair receipt: graph
  `sha256:d2499ffcb7eb503fb6abc937a6a03e7f6d87b93bc0d0f3c2fceb41d4e55b424f`;
  spec
  `sha256:c72422327b5d441eaf267d2ed72b8e982b0104c4e594a7528c861874f4c0b0bb`.
- Security repair: `PASS`; frontend server access is limited to
  frontend-owned resources and cross-unit data access requires the owning
  application interface.
