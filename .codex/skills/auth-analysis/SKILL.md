---
name: auth-analysis
description: Use this skill when Security needs to audit JWTs, sessions, refresh/logout behavior, RBAC, role gates, multitenant isolation, auth routes, auth services, or frontend/client auth architecture for hardening and weaknesses. Produces evidence-backed findings and validation plans; does not patch product/runtime code.
---

# Auth Analysis

Use this skill for target-project authentication and authorization review. It owns
JWT/session lifecycle, RBAC, multitenant isolation, auth-related client-server
contracts, and auth-sensitive audit evidence.

## Trigger Contract

Use this skill when the request mentions:

- JWT, bearer tokens, refresh tokens, logout, revocation, session timeout, or
  device sessions;
- RBAC, role gates, route guards, admin/operator/reviewer permissions;
- tenant isolation, `organization_id`, cross-tenant access, object ownership;
- auth route coverage, client token storage, auth API parity, or hardening;
- SOC 2/HIPAA/NIST auth control evidence.

Do not use this skill when:

- the request is a broad stack scan with no auth emphasis; use `codebase-audit`;
- the request is a product/design review before code exists; use
  `secure-design`;
- the user asks for implementation; first produce findings, then route through
  `plan-change` and `implement-change`.

## Source Order

1. Latest user request and active goal.
2. `AGENTS.md`, `.codex/agents/security/AGENT.md`.
3. `docs/patterns/boundaries.md`.
4. Active auth/security specs under `docs/specs/` when the request names or
   implies one.
5. Backend, API, service, middleware, route, schema, database, and audit code
   discovered from `harness.config.yaml`, `docs/structure.md`, imports, route
   registries, auth modules, and package manifests.
6. Frontend, client, SDK, API wrapper, storage, route guard, and state code
   discovered from `harness.config.yaml`, `docs/structure.md`, package
   manifests, and current source roots.
7. Source-backed security references supplied by the user or stored in project
   docs.

## Procedure

1. State the auth boundary being audited and whether the work is review-only.
2. Inventory public and protected auth routes, plus expected frontend calls.
3. Trace token issuance, validation, refresh, logout, force logout, password
   reset, invitation acceptance, account lockout, user deactivation, and remote
   session termination.
4. For every protected route family, check role dependency and whether the
   service/database query is scoped by `organization_id` or is an explicit safe
   admin/global path.
5. For client code, inspect token storage, request hooks, 401/refresh behavior,
   route role guards, cached auth state, and API/backend route parity.
6. Map sensitive actions to audit events and security alerts.
7. Compare implementation against the auth requirements in
   `docs/patterns/boundaries.md`.
8. Produce findings using `templates/auth-analysis-report.md`.
9. Recommend validation checks, including regression tests for revocation,
   tenant isolation, role access, route parity, and client auth behavior.

## Required Checks

- JWT claims: `sub`, `organization_id`, `role`, `iat`, `exp`, session binding.
- Token validation: user lookup, active user, active organization, revocation,
  device-session state, expiration, clock precision.
- Session lifecycle: login, refresh, logout, remote logout, force logout,
  deactivation, password reset/change, invitation auto-login.
- Client storage: access token lifetime, localStorage exposure, refresh cookie
  policy, 401 replay guard, logout failure behavior.
- RBAC: backend dependencies and frontend guards align, with backend as the
  enforcement authority.
- Tenant isolation: every tenant-scoped query includes `organization_id`;
  admin/global paths are explicit and audited.
- Audit: login, failed login, logout, force logout, role/user/org changes,
  password reset, external system credential changes, data export, and
  cross-tenant attempts.

## Output

Use the report template and include:

- auth surface inventory;
- proven controls;
- findings ordered by severity;
- route/client contract mismatches;
- tenant isolation gaps or proof;
- SOC 2/HIPAA/NIST/OWASP mappings;
- validation plan;
- next workflow gate.

## Guardrails

- Never expose token values, secrets, reset links, `.env` contents, or raw regulated sensitive data.
- Do not rely on frontend role gates as authorization proof.
- Do not claim logout/revocation works unless current request validation checks
  server-side revocation state.
- Do not add compatibility shims or dual auth flows by default.
- Do not suppress typing, validation, auth, audit, or tenant checks to make a
  test pass.
