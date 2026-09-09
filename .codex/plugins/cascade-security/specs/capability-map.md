# Cascade Security capability map

Version: 0.1.0+codex.20260909141647

`specs/extraction-manifest.json` freezes the pre-cutover Security role and
three repository skill packages. The plugin owns reusable security-review
semantics; the host retains role isolation, target paths, sensitive-context
selection, mutation authority, target validation, risk acceptance, and release
decisions.

| Capability | Development source | Plugin owner | Explicit boundary |
| --- | --- | --- | --- |
| Security surface inventory, trajectory selection, evidence separation, regression mapping, and filename-only stack scan | `.codex/skills/codebase-audit` plus the former host scanner | `codebase-audit` | Review and inventory only; no secret values, content scan, vulnerability verdict, or runtime patch |
| JWT/session lifecycle, revocation, RBAC, tenant isolation, client/server parity, and auth-sensitive audit evidence | `.codex/skills/auth-analysis` | `auth-analysis` | Evidence-backed implementation review only; frontend gates are never authorization proof |
| Assets, trust/data boundaries, abuse cases, secure defaults, privacy, provider, telemetry, file, and agent/tool controls | `.codex/skills/secure-design` | `secure-design` | Pre-implementation design review only; no product authority, compliance attestation, or code changes |
| Read-only specialist isolation, sensitive-evidence selection, target routes, and review ordering | `.codex/agents/security` | Host Security custom agent | The role selects namespaced skills and host handoffs; it does not duplicate their procedures |

Prompt authoring remains with Cascade Prompt. Agent topology remains with
Cascade AI Architect; software boundaries and architecture review remain with
Cascade Software Architect. Harness integration remains with Cascade Coding Agent.
Bounded dynamic execution remains with Cascade Simulations.
Generic measurement, judges, and receipts remain with Cascade Evals. Product
acceptance and target code changes remain with their host owners.
