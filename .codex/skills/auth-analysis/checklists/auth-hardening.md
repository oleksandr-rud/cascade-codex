# Auth Hardening Checklist

- [ ] Access tokens are short-lived enough for the risk model and include only necessary claims.
- [ ] Refresh/session credentials are opaque, revocable, and server-side validated.
- [ ] Logout invalidates the server-side session used by subsequent request validation.
- [ ] Force logout and user deactivation invalidate existing tokens on the next request.
- [ ] Password reset/change invalidates sessions when required by the current spec.
- [ ] Every protected backend route has a backend role dependency or explicit public rationale.
- [ ] Frontend route guards match backend role gates but are not treated as enforcement.
- [ ] Tenant-scoped user/session/device/work-order/manual queries include `organization_id`.
- [ ] Admin/global paths are explicit, least-privilege, and audited.
- [ ] Client auth storage does not place long-lived or refresh credentials in JavaScript-readable storage.
- [ ] API client handles 401/refresh/logout without replay loops or leaking auth state.
- [ ] Sensitive auth actions emit audit events without raw secrets.
- [ ] Tests/probes cover revocation, tenant isolation, route parity, role denial, and token expiry.

