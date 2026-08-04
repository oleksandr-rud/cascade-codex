# Archive Capsule: AR-008 W-028 Top-Level Evaluation Root Separation

Archive ID: `AR-008`
Date: 2026-08-03
Scope: `W-028`
Final status: `COMPLETE`; `W-028-GT ACCEPTED`
Owner: `agent-engineer`
Archive reason: terminal lane and completion evidence are preserved; no active
registry row or live-path consumer remains.

## Authority And Preserved Meaning

- Lane: `W-028`, plan revision 1, terminal receipt
  `W028-CLOSEOUT-20260803-A1`.
- Accepted outcome: harness evaluations and product evaluations use separate
  top-level source roots, while typed harness/product simulation definitions
  remain separated below the product-evaluation root.
- Accepted defaults: `.artifacts/harness-evals/` and
  `.artifacts/product-evals/` are the current evidence roots; historical
  `.artifacts/campaigns/` evidence is preserved without becoming a new default.
- Preserved `NOT_RUN`: target-product simulation execution, target calibration,
  deployment, release eligibility, W-004 current-source N03 revalidation, and
  W-004 attempt 5.
- Preserved blocked consumer: W-004 remains `BLOCKED` at WG-001 plan revision
  19/work-graph revision 11; W-028 does not compensate for failed/exhausted
  N04/N05 reviews.
- Publication: commit, push, publication, provider spend, and broad staging
  were `NOT_REQUESTED`.

## Source To Archive Map

| Source Path | Archive Path | SHA-256 Before | SHA-256 After |
|---|---|---|---|
| `docs/work/lanes/W-028-top-level-evaluation-root-separation.md` | `docs/archive/work-reports/2026-08-03-W-028-top-level-evaluation-root-separation.md` | `d264bd625c8297ae3ea7efa397450c7858a144b0195862070b87831bdeb56acf` | `d264bd625c8297ae3ea7efa397450c7858a144b0195862070b87831bdeb56acf` |
| `docs/work/reports/2026-08-03-top-level-evaluation-root-separation.md` | `docs/archive/work-reports/2026-08-03-top-level-evaluation-root-separation.md` | `6c4f90f67c271a02da5d11d341a84207303e533b35cd29d5390953165b53fcda` | `6c4f90f67c271a02da5d11d341a84207303e533b35cd29d5390953165b53fcda` |

The originals were moved byte-for-byte. Historical live paths inside the
archived lane are execution-era references and remain unchanged.

## Dependency And Inbound-Reference Audit

- `docs/work/active.md` contains no W-028 row.
- W-004, WG-001, the active registry, and current program/report projections
  reference W-028 only as a completed source-invalidation producer; none
  requires a live lane or completion-report path.
- The live report and archive indexes point to this capsule and relocated
  artifacts.
- No backlog, graph gate, or active lane depends on mutating the archived copy.

## Validation Evidence

- implementation/default source digest:
  `31ee0face4704068e768fb7982af5df1cc6eb67e8fb6d502c8d31623e1808983`;
- exact Bun 1.3.3 aggregate tests: `89/89 PASS`;
- Cascade validator: `PASS`;
- harness catalog/self-test: `PASS`, 44 skills / 368 scenarios / 20 cases,
  digest `67607bcf956e21217f79084eb2cf0ba454e46948b2e6739cabc91d764d10efbe`;
- target self-test: `PASS`, 26 cases;
- campaign catalog/self-test: `PASS`, seven entries, digest
  `7c69a0f1cb5010cb4e4b0666cdbc20aeb8e60f98361aa707a4f0ac38a2a71299`;
- focused tests: `72/72 PASS`; isolated Playwright fixture: `1/1 PASS`;
- initializer/derivation dry-runs, JSON parsing, root/stale-path scans,
  archive hashes, and `git diff --check`: `PASS`.

## Rehydration And Invalidation

Read this capsule, then the archived completion report, then the archived lane.
Do not edit archived artifacts to resume work. A new lane must bind the current
source identity and state whether it changes harness evaluation, product
evaluation, harness simulation, product simulation, or their evidence roots.

The archive remains historical when implementation sources change. Its
terminal claim is invalid only if the recorded source digest or archive hashes
do not match; later source changes require new validation and do not rewrite
this capsule.
