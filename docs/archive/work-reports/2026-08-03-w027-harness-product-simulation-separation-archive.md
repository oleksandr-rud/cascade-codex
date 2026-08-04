# Archive Capsule: AR-007 W-027 Harness And Product Simulation Separation

Archive ID: `AR-007`
Date: 2026-08-03
Scope: `W-027`
Final status: `COMPLETE`; `W-027-GT ACCEPTED`
Owner: `agent-engineer`
Archive reason: terminal lane and completion evidence are preserved; no active
registry row or live-path consumer remains.

## Authority And Preserved Meaning

- Lane: `W-027`, plan revision 1, terminal receipt
  `W027-CLOSEOUT-20260803-A1`.
- Accepted outcome: harness/framework simulation definitions and target-product
  simulations use separate typed roots, runtime enforcement, catalog scope,
  defaults, docs, and validator coverage.
- Preserved `NOT_RUN`: target-product simulation execution, real target
  adapters/reference data, non-fixture target calibration, deployment, release
  eligibility, W-004 current-source N03 revalidation, and W-004 attempt 5.
- Preserved blocked consumer: W-004 remains `BLOCKED` at WG-001 plan revision
  18/work-graph revision 11; W-027 does not compensate for failed/exhausted
  N04/N05 reviews.
- Publication: commit, push, publication, provider spend, and broad staging
  were `NOT_REQUESTED`.

## Source To Archive Map

| Source Path | Archive Path | SHA-256 Before | SHA-256 After |
|---|---|---|---|
| `docs/work/lanes/W-027-harness-product-simulation-separation.md` | `docs/archive/work-reports/2026-08-03-W-027-harness-product-simulation-separation.md` | `1aaa53c78be6caddf4690c15728ec6e3200f65f0533da0e2385c5960d5f08c98` | `1aaa53c78be6caddf4690c15728ec6e3200f65f0533da0e2385c5960d5f08c98` |
| `docs/work/reports/2026-08-03-harness-product-simulation-separation.md` | `docs/archive/work-reports/2026-08-03-harness-product-simulation-separation.md` | `c7b1af59408d766dc445b2bb37501d23499bbd2e9cb362e88ebfaf8cb172825b` | `c7b1af59408d766dc445b2bb37501d23499bbd2e9cb362e88ebfaf8cb172825b` |

The originals were moved byte-for-byte. Historical live paths inside the
archived lane are execution-era references and remain unchanged.

## Dependency And Inbound-Reference Audit

- `docs/work/active.md` contains no W-027 row.
- W-004, WG-001, the active registry, and current program/report projections
  reference W-027 only as the completed source-invalidation producer; none
  requires a live lane or report path.
- The live report and archive indexes point to this capsule and relocated
  artifacts.
- No backlog, graph gate, or active lane depends on mutating the archived copy.

## Validation Evidence

- implementation/default source digest:
  `28d468ad9dab022b104b09cbf799e391cd9308dbc9ef753b2eb03238a081c8b6`;
- exact Bun 1.3.3 aggregate tests: `86/86 PASS`;
- Cascade validator: `PASS`;
- harness catalog/self-test: `PASS`, 44 skills / 368 scenarios / 20 cases;
- target self-test: `PASS`, 26 cases;
- campaign catalog/self-test: `PASS`, seven entries, digest
  `aeb8eaedc7436f4189b4025479e04a7fb267106bf3172e6196aaafb7ea77cd0c`;
- initializer/derivation dry-runs, JSON parsing, scope/root/stale-path scans,
  and `git diff --check`: `PASS`.

## Rehydration And Invalidation

Read this capsule, then the archived completion report, then the archived lane.
Do not edit archived artifacts to resume work. A new lane must bind the current
source identity and state whether it extends product simulation behavior,
framework fixtures, or W-004 current-source revalidation.

The archive remains historical when implementation sources change. Its
terminal claim is invalid only if the recorded source digest or archive hashes
do not match; later source changes require new validation and do not rewrite
this capsule.
