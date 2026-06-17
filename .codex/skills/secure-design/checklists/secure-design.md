# Secure Design Checklist

- [ ] Assets, data classes, and tenant boundaries are explicit.
- [ ] Authentication and authorization are enforced server-side.
- [ ] Tenant-scoped data reads/writes require `organization_id` or an explicit safe global/admin path.
- [ ] Sensitive actions have audit events with enough context to reconstruct what happened.
- [ ] Secrets, refresh credentials, provider API keys, and external system credentials are not model-visible or client-visible.
- [ ] AI/RAG inputs from manuals, transcripts, external system, logs, webpages, or tickets are treated as untrusted data.
- [ ] External-provider data flow is necessary, minimized, and covered by contract/security posture.
- [ ] Telemetry/tracing excludes raw prompts, transcripts, manual text, external system payloads, and regulated sensitive data unless explicitly approved.
- [ ] File uploads have size, type, parser, storage, and lifecycle controls.
- [ ] Failure modes are safe, visible, and auditable.
- [ ] User convenience does not require customer customers to configure security manually.
- [ ] Acceptance checks prove the control, not only the happy path.

