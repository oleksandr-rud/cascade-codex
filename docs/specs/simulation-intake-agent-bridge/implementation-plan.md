# Simulation Intake And Agent Bridge Implementation Plan

Status: `IMPLEMENTED_CURRENT_SOURCE`; independent review pending
Plan Revision: `3`
Owner Lane: `W-032`

## Intended Behavior

Turn a simulation request into one inspectable chain from W-031 claims to a
scope-correct campaign, product brief when required, exact action policies,
and separated author/operator/evaluator handoffs. Fail closed on missing,
ambiguous, stale, or cross-authority inputs.

## Assumptions And Success Criteria

- W-031 owns generic request admission; W-032 consumes its Task Envelope.
- W-030/`PB-XXX` owns deterministic product-context projection; W-032 binds it
  rather than reimplementing product discovery.
- W-004/WG-001 owns shared campaign/runtime/policy/evidence contracts; W-032
  adds the admission bridge and is a prerequisite for product execution.
- Success requires focused tests, generated catalog refresh, repository
  validation, fixed-point review, and exact `NOT_RUN` reporting.

## Worklines And Slices

| Workline | Slice | Primary contracts | Writes | Evidence / repair boundary |
|---|---|---|---|---|
| `WL-01` | scope and intake schema | `SIB-001` | intake schema, campaign `intake_file`, resolver types | schema/definition tests; repair before consumers |
| `WL-02` | Task Envelope and brief compiler | `SIB-002`, `SIB-003` | `simulation-intake.ts`, CLI, Task Envelope snapshots | deterministic compile/check/write; stale brief blocks |
| `WL-03` | action-policy equality | `SIB-004` | compiler and resolver policy bindings | zero/overlap/deny/mismatch tests; fail before run |
| `WL-04` | templates and product specs | `SIB-001`, `SIB-003` | starter, compose templates, catalog, brief, product ledgers | brief/catalog fixed point; draft starter remains non-runnable |
| `WL-05` | agent handoffs and execution gate | `SIB-005` | agent skills/load orders, campaign run gate | role wiring validation; non-READY product run denied |
| `WL-06` | integration and closeout | `SIB-006` | W-031/W-032/WG-001 projections, catalogs, report | full regression/review; reopen earliest failed workline |

The lane uses a sequential lane-local Task Graph because every slice consumes
the prior contract and shares runtime/template/doc files. A separate
Coordination Graph is not created. WG-001 revision 12 records W-032 as the
product-run intake prerequisite while W-004 remains merge owner.

## Behavior Examples

- Given “create a product simulation from PB-001 and execute it,” admission
  selects connected simulation governance and the author compiles a product
  intake before any operator run.
- Given a product starter, initialization emits a valid DRAFT intake; campaign
  validation can inspect it, but campaign execution refuses it.
- Given one action with no policy or two matching policies, intake compilation
  is BLOCKED with the exact task/action and policy identities.
- Given task policy IDs that omit or add a policy relative to computed
  applicability, compilation/resolution fails closed.
- Given a changed Task Envelope, brief output, task action, or policy file, the
  prior READY intake is stale and cannot execute.
- Given evaluated synthetic-persona findings, the evaluator emits a proposal;
  product documents change only after synthesis, external evidence where
  required, and accountable review.

## Validation

```bash
npx --yes bun@1.3.3 test scripts/cascade/admission.test.ts \
  scripts/cascade/simulation-intake.test.ts \
  scripts/cascade/simulations.test.ts \
  scripts/cascade/simulation-definitions.test.ts
npx --yes bun@1.3.3 scripts/cascade.ts admission corpus
npx --yes bun@1.3.3 scripts/cascade.ts brief validate PB-002
npx --yes bun@1.3.3 scripts/cascade.ts brief generate PB-002 --check
npx --yes bun@1.3.3 scripts/cascade.ts campaign catalog --check
npx --yes bun@1.3.3 scripts/cascade.ts campaign self-test
npx --yes bun@1.3.3 scripts/cascade.ts validate
npx --yes bun@1.3.3 test scripts/cascade
git diff --check
```

Provider-backed product execution, independent semantic evaluation, persona
research validation, merge, deployment, and release eligibility remain
`NOT_RUN` unless separately authorized and evidenced.

## Revision 2 Trust Hardening

- READY intakes now fail closed on blocking or forged action decisions,
  task/action policy-set mismatch, duplicate binding identities, and envelope
  snapshot paths that do not match intake scope and envelope identity.
- Harness intakes cannot bind product context, campaign resolution rechecks
  the current action decision, and `cascade-core@2` invalidates envelopes from
  the pre-simulation policy bundle.
- Local evidence: 49 focused admission/intake/simulation tests, 152 aggregate
  tests, current PB-001/PB-002 projections, catalog digest `817d3d26...`, and
  verified immutable run `wg001-resume-hardening-20260804-r6`.

## Revision 3 Strict Check Fixed Point

- `simulation intake --check` first compares the deterministic compiled intake
  and then strictly resolves every READY dependency. A matching intake can no
  longer pass while its snapshotted envelope, brief, policy file, or digest is
  stale.
- Local structural, regression, and immutable evidence is current at catalog
  `73e0a208...`; run `wg001-resume-hardening-20260804-r7` verifies 89 files and
  remains `release_eligible=false`.
