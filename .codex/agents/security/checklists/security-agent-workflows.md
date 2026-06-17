# Security Agent Workflow Checklist

Use this checklist when the Security role combines security skills or routes
findings into the rest of the Cascade workflow.

## Security Stack Review

- [ ] Load `codebase-audit`.
- [ ] Inspect `harness.config.yaml`, `docs/structure.md`,
      `docs/patterns/boundaries.md`, source roots, package manifests, routes,
      services, configuration, and tests relevant to the requested boundary.
- [ ] Generate or update focused audit trajectories rather than one broad
      undifferentiated report.
- [ ] Use helper scripts only when the target repo explicitly provides a
      read-only helper with safe defaults; otherwise inspect files and existing
      commands directly.
- [ ] Escalate auth, session, role, permission, and tenant-boundary concerns to
      `auth-analysis`.
- [ ] Escalate proposed feature, workflow, architecture, agent/tool, external
      integration, or product-risk concerns to `secure-design`.
- [ ] Map compliance frameworks only as evidence requirements or controls, not
      as certification claims.
- [ ] Recommend deterministic probes, commands, or functional checks.

## Auth-Sensitive Review

- [ ] Inventory token issuance, validation, refresh, logout, revocation,
      deactivation, reset/change flows, and invitation or bootstrap flows when
      present.
- [ ] Check backend enforcement, service/database filters, object ownership,
      route dependencies, and audit events.
- [ ] Check frontend or client storage, route guards, API hooks, retry behavior,
      and backend/client route parity as supporting evidence.
- [ ] Treat server-side enforcement as the security boundary.
- [ ] Produce findings with validation probes and next owner route.

## Secure Design Review

- [ ] Identify assets, actors, data classes, trust boundaries, privileged
      actions, and external providers.
- [ ] Map data flow and decision flow.
- [ ] List abuse cases, secure defaults, least privilege, revocation,
      auditability, privacy, data minimization, and failure behavior.
- [ ] Keep credentials, tokens, private customer data, regulated sensitive
      data, raw logs, and sensitive screenshots out of durable findings.
- [ ] Route product ambiguity to `discover` or `compose-spec`.
- [ ] Route architecture risk to `architecture-review`.
- [ ] Route behavior proof to `functional-qa` or `validate-change`.
