# Delivery And Operations Infrastructure

- Pair ID: `infrastructure-delivery`
- Graph: `docs/patterns/architecture-defaults/infrastructure-delivery.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use when selecting or changing network/edge exposure, DNS/TLS, CDN/WAF,
artifact storage, CI/CD, configuration/secrets, observability, or
infrastructure-as-code.

## Default Architecture

```text
exposure, release, security, and operations claims
  -> network and edge topology
  -> immutable artifact and promotion pipeline
  -> configuration and secret authority
  -> logs, metrics, traces, errors, SLOs, and alerts
  -> reviewed infrastructure code, drift, and teardown
  -> release, rollback, failure, and recovery proof
```

### Delivery Selection Areas

| Area | Required decisions |
|---|---|
| Network and edge | Segmentation, ingress/egress, DNS, TLS, load balancing, CDN, WAF, rate limits, private access, and failure domains |
| Artifact and pipeline | Build identity, provenance, integrity, registry/storage, promotion, environment gates, deployment strategy, verification, and rollback |
| Configuration and secrets | Authority, environment scope, access, rotation, injection, redaction, audit, revocation, and break-glass |
| Observability | Logs, metrics, traces, errors, correlation, dashboards, SLOs, alerts, retention, privacy, cost, and incident owner |
| Infrastructure code | Module ownership, environment composition, policy checks, plan/apply permissions, state, locking, imports, drift, migrations, and destroy safeguards |

Frontend framework or backend runtime selection remains in its application
technology extension. This extension selects the hosting and delivery resources
that make that technology operable.

## Reference File Structure

Use existing target paths. Keep reusable infrastructure components separate
from environment composition, and keep secret values outside source:

```text
infra/
  components/
  environments/
  policies/
  observability/
.github/workflows/ or target pipeline owner
```

## Default Decisions

- Build once and promote an identified artifact.
- Define rollback or forward recovery before release.
- Select telemetry and alerts from owned failure modes.
- Keep one reviewed infrastructure-code authority with drift and teardown
  controls.

## Validation Contract

- Provision a clean bounded environment and repeat the operation safely.
- Verify identity and least privilege for build, deploy, runtime, secret, and
  operator paths.
- Verify DNS/TLS, ingress/egress, edge behavior, artifact integrity,
  provenance, promotion, deployment verification, rollback/forward recovery,
  secret rotation, telemetry, alerts, drift detection, import, and teardown.
- Report authored configuration, validated plan, applied state, observed
  runtime, and production eligibility as separate gates.

## Exceptions

A managed full-stack platform may combine hosting, build, delivery, edge,
configuration, and observability. Record the coupling, limits, data handling,
cost, export, rollback, and exit constraints rather than splitting the product
artificially.
