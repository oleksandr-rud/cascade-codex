# W04 — Focused test design

Use [spec-test-design](../../../spec-test-design/SKILL.md) for cases, fixtures,
test levels, observable oracles and conditional campaign needs. This policy
selects that procedure; it does not maintain a second test-design method.

Inputs: exact behavior owner/revision and IDs, proposed or accepted status,
material risks, enforcing contracts and current tests/fixtures when available.
Outputs: cases and evidence rules in S14, applicable measurements in S18, and
explicit gaps. Planned execution is NOT_RUN.

Choose only checks that observe relevant risks. Unit, contract/integration, E2E
and user simulations have distinct purposes; none is required for every function.
Non-software subjects may use observations, rehearsals or business experiments.
If the oracle or fixture cannot detect failure, return the affected requirement to
S01/W03 instead of inventing accepted behavior.

Use configured QA methods through [policy bindings](../policy-bindings.md) only
when their native accepted-behavior inputs are satisfied. S14 owns acceptance,
the linked test design owns case details, and execution evidence stays separate.
The traceability view connects behavior → enforcing contract → case → oracle;
it cannot establish coverage from connectivity alone.
