# Codebase Audit Trajectory Checklist

- [ ] The trajectory has a clear risk or control objective.
- [ ] The source order names current code as authoritative over stale docs.
- [ ] Backend route, service, and database entry points are listed when relevant.
- [ ] Frontend API, state, and route guard entry points are listed when relevant.
- [ ] Agent, worker, external-provider, and infrastructure surfaces are listed when relevant.
- [ ] Evidence is file/line, command output, or source-linked; not memory-only.
- [ ] Auth, role, tenant, audit, secret, telemetry, and data-retention controls are checked when touched.
- [ ] SOC 2/HIPAA/NIST/OWASP requirements are mapped as requirements, not claimed compliance.
- [ ] Validation commands or probes are specific enough to run later.
- [ ] Findings do not include secrets or raw sensitive payloads.

