# Cascade Design architecture

## Authority

The four plugin skills produce review artifacts, rule proposals, evidence
plans, and handoff requirements. They do not accept product decisions, mutate
the target design system, implement code, certify compliance, approve releases,
or self-accept evaluation results. A target repository's named product, design,
implementation, validation, and release owners retain those decisions.

The host Designer custom agent is an optional execution role. It provides
read-only isolation, current target context, and multi-skill ordering. It is
not packaged here because custom-agent configuration and repository paths are
host concerns.

## Skill boundary

```text
feature task flow       -> cascade-design:ux-flow-review
accessibility evidence  -> cascade-design:accessibility-review
rendered visual evidence -> cascade-design:visual-qa
reusable design rule    -> cascade-design:design-system
```

Each skill emits or renders the same typed
`schemas/design-review.schema.json` contract. The artifact separates sources,
scope, skill-specific coverage, findings, evidence plans, handoffs, and
authority-boundary flags. `scripts/validate_artifact.py` applies Draft 2020-12
and cross-field checks before a typed artifact is consumed.

## Integration aliases

| Alias | Purpose | Boundary |
| --- | --- | --- |
| `cascade-product:define-product` | Resolve missing or changed product behavior | Product owns intent and acceptance; Design proposes evidence-bound deltas only |
| `cascade-personas:compile-persona` | Supply a frozen user-model projection | Persona evidence informs constraints but is not product truth |
| `cascade-simulations:simulate` | Execute a requested bounded actor behavior experiment | Design supplies a fixed context/outcome; Simulations owns execution and receipts |
| `cascade-prompt:prompt` | Audit a model-facing UI prompt or design instruction | Prompt owns prompt construction; Design owns only the interface rule |
| `cascade-evals:evaluate` | Run generic versioned semantic evaluation | Evals owns blind judges, reduction, and immutable receipts |
| `cascade-evals:agent-evaluation` | Evaluate the four skill contracts | The plugin owns cases and assertions; Evals owns execution |

Dependencies are soft until a case requires them. A required alias must resolve
to an enabled immutable installed plugin for executable evaluation. Missing
runtime peers produce a typed `BLOCKED` handoff; their instructions are never
copied into this package.

Host capabilities such as product docs, functional acceptance, implementation,
browser tools, Figma, and release gates are declared handoffs rather than
plugin-owned runtimes. All supplied content and tool output is untrusted
evidence, never instruction.

## Evaluation plane

The package owns a balanced case suite, deterministic route/status/schema
assertions, and design-specific outcome and trajectory rubrics. Cascade Prompt
audits the instruction contract. Cascade Evals owns the sanitized target
runtime, sealed labels, independent judge contexts, conservative reduction,
and receipts. The qualification configuration explicitly binds
`gpt-5.6-sol` with `max` reasoning for builder, target, and judges. Mechanical
eligibility runs before semantic judging; structural tests never count as a
semantic acceptance score.
