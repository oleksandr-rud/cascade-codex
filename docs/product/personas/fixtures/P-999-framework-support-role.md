# Persona: Framework Support Role Fixture

ID: P-999
Revision: 1
Status: `approved`
Maturity: `hypothesis`
Source: deterministic Cascade contract fixture
Source Digests: none; this complete file is the digest-bound source
Reference Window: not applicable

## Summary

- Role: deterministic support-workflow test actor
- Primary job: exercise persona-to-population contract mechanics
- Product goal: none; this is not a product persona
- Constraint: must not support product, market, prevalence, or release claims

## Context

- Expertise: fixture only
- Frequency: test execution only
- Environment: local deterministic simulation
- Tools or adjacent workflow: Cascade campaign fixture

## Evidence, Confidence, And Uncertainty

| Attribute | Evidence Source | Evidence Class | Confidence | Uncertainty / Abstention Rule | Invalidation Signal |
|---|---|---|---|---|---|
| direct communication behavior | deterministic fixture definition | inferred | low | abstain from any real-user interpretation | any use outside framework contract testing |

## Permitted Uses And Prohibited Claims

- Permitted uses: schema, digest, resolver, CLI, and artifact tests.
- Prohibited claims: real-user behavior, prevalence, usability, accessibility,
  market fit, calibration, deployment, or release readiness.
- Sensitive attributes excluded or minimized: all demographic and personal
  attributes.
- Product artifacts affected: none.
- Review owner: Cascade harness maintainer.

## Behavior Implications

- Requirement impact: none outside deterministic contract validation.
- Journey impact: none.
- Scenario impact: supports only the simulation correctness fixture.
- Permission or access impact: no external access or mutable provider.

## Content And Design Implications

- Tone or copy: none.
- Information density: none.
- Accessibility: no product inference allowed.
- Interaction needs: deterministic fixture actions only.

## Traceability

- Requirements: none.
- Journeys: none.
- Scenarios: `simulation-correctness-fixture` only.
- Brand/design/spec dependencies: none.
- Prior revision or supersession: none.
- Approved derivation manifests:
  `product-evals/simulations/harness/simulation-correctness-fixture/derivations/P-999-coverage-v1.json`.

## Doc Routing Decisions

| Fact | Source | Owner Target | Action | Bloat Check | Evidence | Next Gate |
|---|---|---|---|---|---|---|
| deterministic persona bridge fixture | W-025 | this fixture only | updated | isolated from the persona index authority table | resolver tests | validate-change |

## Open Questions

- None; delete or replace this fixture if it is ever interpreted as product
  evidence.
