# Work Archive: AR-006 W-026 Persona Provenance And Defaults Hardening

Archive ID: `AR-006`
Archived: 2026-08-03
Scope: `W-026 lane and completion report`
Final Status: `COMPLETE`
Archive Result: `ARCHIVED`
Archive Owner: `agent-engineer`
Trigger: `automatic-post-closeout`
Reason: W-026 accepted its terminal gate, left the active registry, and has no
active consumer requiring its live lane or report path.

## Compact Outcome

W-026 hardened the product-persona/synthetic-persona bridge with executable
persona status eligibility, explicit and evidence-gated weight semantics,
reproducible generator input digests, evaluation-receipt proposal bindings,
and terminal source/input/evidence integrity checks. It also aligned reusable
defaults and repaired current WG-001 projections to plan revision 17.

## Identity And Terminal State

| Subject | Final Revision / Attempt | Final Gate Or Disposition | Detailed Authority |
|---|---|---|---|
| `W-026` | plan revision 1 | `W-026-GT ACCEPTED` | `docs/archive/work-reports/2026-08-03-W-026-persona-provenance-defaults-hardening.md` |

## Preserved Non-Passing History

| Subject | Historical State | Replacement Or Final Meaning | Detailed Authority |
|---|---|---|---|
| provider-backed refinement quality | `NOT_RUN` | deterministic contracts pass; live usefulness is not inferred | archived completion report |
| external persona evidence and promotion | `NOT_RUN` | external research and accountable human review remain required | archived completion report |
| target calibration/deployment/release | `NOT_RUN` | framework calibration remains reducer evidence only | archived completion report |
| WG-001-N03 | `PENDING` | W-025/W-026 source invalidation; current-source revalidation remains `NOT_RUN` | live WG-001 plan revision 17 |
| WG-001-N04/N05 | `BLOCKED` | attempt 4/4 reviews failed and attempts are exhausted | live WG-001 authority |

## Artifact Manifest

| Original Path | Archive Path | Pre-Move SHA-256 | Post-Move SHA-256 | Role |
|---|---|---|---|---|
| `docs/work/lanes/W-026-persona-provenance-defaults-hardening.md` | `docs/archive/work-reports/2026-08-03-W-026-persona-provenance-defaults-hardening.md` | `a53215b69f93c8975a1bbb5e27bcd20bda9c9d6205c04dba2db9023c6f5ebf23` | `a53215b69f93c8975a1bbb5e27bcd20bda9c9d6205c04dba2db9023c6f5ebf23` | lane |
| `docs/work/reports/2026-08-03-persona-provenance-defaults-hardening.md` | `docs/archive/work-reports/2026-08-03-persona-provenance-defaults-hardening.md` | `05282f4c601307cadee9479aa043b955eb92174aac25f2f520ce3b4441d3a365` | `05282f4c601307cadee9479aa043b955eb92174aac25f2f520ce3b4441d3a365` | completion report |

## Dependency And Reference Audit

| Check | Result | Evidence |
|---|---|---|
| absent from active registry | `PASS` | W-026 row removed from `docs/work/active.md` |
| no active consumers | `PASS` | W-004 consumes the source-change fact and live WG-001 state, not the W-026 live file paths |
| source and indexes agree | `PASS` | lane terminal state, report, active registry, report index, and archive index reconciled |
| inbound references classified | `PASS` | active WG-001 references preserve W-026 as an invalidation event; report index routes detail here |
| destination collision absent | `PASS` | all three AR-006 destinations were absent before archive |

## External Evidence Retained

| Evidence | Location | Retention / Freshness Meaning |
|---|---|---|
| owned source manifest | digest `202099051f0810122d1524a98e2e0e66585b76eaf55be84a5f206fc26b8cc1c3` on base `7112546cc856d1bc7f4b4409ef80170c71b9c236` | exact 21-file W-026 source identity; invalidated by any owned-file change |
| campaign catalog | digest `213a94b684e6c6341924fcb8723e2483050fa5cd198db0bc83f8b3cd26e962b4` | current seven-entry generated catalog at closeout |
| harness catalog | digest `d6030bf0ea98a6bd26b431de50ac1b7ca909a19a289192d005403c514507897d` | 44 skills and 368 scenarios at closeout |

## Validation

| Check | Command | Result |
|---|---|---|
| source/archive digest equality | `shasum -a 256 <source/archive files>` | `PASS`; both files byte-identical |
| stale live-path scan | `rg` over `docs/` and `.codex/` | `PASS`; no unexplained live-path references |
| Cascade validator | `npx --yes bun@1.3.3 scripts/cascade.ts validate` | `PASS` |
| harness catalog | `npx --yes bun@1.3.3 scripts/cascade.ts eval catalog --check` | `PASS` |
| campaign catalog | `npx --yes bun@1.3.3 scripts/cascade.ts campaign catalog --check` | `PASS`; 7 entries |
| tests | `npx --yes bun@1.3.3 test scripts/cascade` | `PASS`; 84 tests |
| whitespace | `git diff --check` | `PASS` |

## Rehydration

Read this capsule first, then the detailed archived lane and completion report.
Treat their original live paths as execution-era provenance. Related future
work creates a new lane and references AR-006; do not mutate archived records.
WG-001 remains live and blocked under its own plan revision 17 authority.

## Publication

- Commit: `NOT_REQUESTED`
- Push: `NOT_REQUESTED`
- External publication: `NOT_REQUESTED`
