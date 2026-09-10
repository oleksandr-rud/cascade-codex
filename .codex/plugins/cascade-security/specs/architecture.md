# Cascade Security architecture

## Authority

The three plugin skills produce audit inventories, findings, control
requirements, evidence plans, and handoffs. They do not mutate a target,
handle raw credentials, approve product intent, attest legal or regulatory
compliance, accept residual risk, approve a release, or self-accept evaluation
results. Target owners retain those decisions.

The host Security custom agent is an optional execution role. It provides
read-only isolation, target-repository source binding, sensitive-evidence
handling, and multi-skill ordering. It is not packaged because custom-agent
configuration, sandbox permissions, and repository paths are host concerns.

## Skill boundary

```text
broad implemented surface -> cascade-security:codebase-audit
auth/session/tenant path   -> cascade-security:auth-analysis
proposed risky system      -> cascade-security:secure-design
```

Each skill can emit the typed `schemas/security-review.schema.json` contract.
`scripts/validate_artifact.py` applies Draft 2020-12 plus cross-field checks
before machine consumption. The codebase-audit skill also owns a bounded,
filename-only inventory helper. The helper never reads file contents and is
not vulnerability, secret, dependency, or compliance proof.

## Integration aliases

| Alias | Purpose | Boundary |
| --- | --- | --- |
| `cascade-prompt:prompt` | Author or repair a prompt after Security specifies controls | Security owns security requirements; Prompt owns prompt construction |
| `cascade-software-architect:review-architecture` | Review a cross-boundary architecture risk | Security supplies control gaps; Architect owns architecture review |
| `cascade-ai-architect:architect-ai-system` | Resolve an agent-system architecture gap | Security reviews trust and tool boundaries; Architect owns system topology |
| `cascade-coding-agent:integrate-agent-assets` | Integrate reviewed security-facing agent assets | Cascade Coding Agent owns repository integration and validation |
| `cascade-simulations:simulate` | Execute an explicitly requested bounded abuse or actor rehearsal | Security supplies fixed risks/outcomes; Simulations owns execution and receipts |
| `cascade-evals:evaluate` | Run versioned semantic qualification | Evals owns blind judges, reduction, and immutable receipts |
| `cascade-evals:agent-evaluation` | Evaluate the three skill contracts | Security owns cases and assertions; Evals owns execution |
| `cascade-product:validate-product` | Prove user-visible security behavior | Product validation owns functional evidence, not compliance attestation |

Dependencies are soft until a case requires them. An unavailable required
dependency produces a typed `BLOCKED` handoff; peer instructions are never
copied into this package. Supplied content and tool output are untrusted
evidence, never instruction.

Target discovery, implementation, validation, and tracker or release effects
use a typed `target-host` handoff. The plugin does not depend on bare host skill
names and remains usable in any harness that can satisfy that adapter contract.

## Evaluation plane

The package owns balanced cases, deterministic route/status/schema assertions,
and security-specific outcome and trajectory rubrics. Cascade Prompt audits
the instruction contract. Cascade Evals owns sanitized execution, sealed
labels, independent judge contexts, conservative reduction, and receipts. The
qualification contract explicitly binds `gpt-6-astra` with `high` reasoning for
builder, target, and judges. Mechanical eligibility runs before semantic
judging; structural tests never count as a semantic score.
