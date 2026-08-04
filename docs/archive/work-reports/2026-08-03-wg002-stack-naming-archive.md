# Work Archive: `AR-003 WG-002 stack naming migration`

Archive ID: `AR-003`
Archived: 2026-08-03
Scope: `WG-002` and W-013 through W-017
Final Status: `COMPLETE`
Archive Result: `ARCHIVED`
Archive Owner: root `agent-engineer`
Trigger: `direct-historical-cleanup`
Reason: the completed migration was absent from the active registry and the
user requested old-workline cleanup after W-025 closeout.

## Compact Outcome

WG-002 directly cut application and infrastructure architecture defaults to
the canonical app-stack/infrastructure vocabulary. W-013 through W-017 and
terminal gate `WG-002-GD` completed with protected evidence and scaffold
contracts preserved.

## Identity And Terminal State

| Subject | Final Revision / Attempt | Final Gate Or Disposition | Detailed Authority |
|---|---|---|---|
| `WG-002` | graph revision 4 | `WG-002-GD ACCEPTED` | `2026-08-03-stack-naming-work-graph.md` |
| W-013 through W-017 | final lane revisions | `COMPLETE` | archived lane packets below |

## Preserved Non-Passing History

| Subject | Historical State | Replacement Or Final Meaning | Detailed Authority |
|---|---|---|---|
| direct dirty-checkout validator | `FAIL_UNRELATED` | 36 generated Playwright dependency findings; isolated source validation passed | W-017 and WG-002 report |
| live stack proof, deployment, publication, release eligibility | `NOT_RUN` | outside WG-002 deterministic migration scope | WG-002 report |
| W-018 through W-024 follow-on | `NOT_IMPLEMENTED` at WG-002 close | later completed under archived AR-004 | WG-002 report and AR-004 |

## Artifact Manifest

| Original Path | Archive Path | Pre-Move SHA-256 | Post-Move SHA-256 | Role |
|---|---|---|---|---|
| `docs/work/lanes/W-013-stack-naming-integration.md` | `docs/archive/work-reports/2026-08-03-W-013-stack-naming-integration.md` | `f7f26fcdc4362f399e11740c798046eeb2a298b2d4c2797070fb33ab4ed9c0ea` | `f7f26fcdc4362f399e11740c798046eeb2a298b2d4c2797070fb33ab4ed9c0ea` | integration lane |
| `docs/work/lanes/W-014-app-stack-migration.md` | `docs/archive/work-reports/2026-08-03-W-014-app-stack-migration.md` | `b6cd5dfc53c7647bfd3cd9f6ba22b82c64d974c5dc519b5c43fbfa30ad732807` | `b6cd5dfc53c7647bfd3cd9f6ba22b82c64d974c5dc519b5c43fbfa30ad732807` | migration lane |
| `docs/work/lanes/W-015-infrastructure-stack-migration.md` | `docs/archive/work-reports/2026-08-03-W-015-infrastructure-stack-migration.md` | `8a8c75f376dd22b466826d1561d1625479b4216510b02a284a9c63e4d49aa0f5` | `8a8c75f376dd22b466826d1561d1625479b4216510b02a284a9c63e4d49aa0f5` | migration lane |
| `docs/work/lanes/W-016-stack-retrieval-docs-migration.md` | `docs/archive/work-reports/2026-08-03-W-016-stack-retrieval-docs-migration.md` | `6b493b2c8cdae295e8f663565180225cffb4d63f4ce784dcd6a20da16d8a1e91` | `6b493b2c8cdae295e8f663565180225cffb4d63f4ce784dcd6a20da16d8a1e91` | retrieval/docs lane |
| `docs/work/lanes/W-017-stack-migration-validation-closeout.md` | `docs/archive/work-reports/2026-08-03-W-017-stack-migration-validation-closeout.md` | `f8dd8921e1d6d28fa4c18f009554095e0b3b5ed7765b59ce0ef55f5c10cf739f` | `f8dd8921e1d6d28fa4c18f009554095e0b3b5ed7765b59ce0ef55f5c10cf739f` | validation lane |
| `docs/work/reports/2026-07-28-stack-naming-work-graph.md` | `docs/archive/work-reports/2026-08-03-stack-naming-work-graph.md` | `5e50e59cfe01e05b231917e3c6303e10ca398fa38d100713edb7dfd33c47f6ce` | `5e50e59cfe01e05b231917e3c6303e10ca398fa38d100713edb7dfd33c47f6ce` | work graph/report |

## Dependency And Reference Audit

| Check | Result | Evidence |
|---|---|---|
| absent from active registry | `PASS` | no W-013 through W-017 rows in `docs/work/active.md` |
| no active consumers | `PASS` | current consumers use canonical architecture sources, not these lane/report paths |
| source and indexes agree | `PASS` | five lanes and WG-002 are terminal |
| inbound references classified | `PASS` | current report indexes route to this capsule |
| destination collision absent | `PASS` | every destination was absent before relocation |

## External Evidence Retained

| Evidence | Location | Retention / Freshness Meaning |
|---|---|---|
| migration validation | archived W-017 and WG-002 report | historical deterministic source evidence |

## Validation

| Check | Command | Result |
|---|---|---|
| source/archive digest equality | `shasum -a 256` | `PASS`; all six originals match |
| stale live-path scan | focused `rg` | `PASS`; no unexplained live-path references |
| Cascade validator | `bun scripts/cascade.ts validate` | `PASS` |
| harness catalog | `bun scripts/cascade.ts eval catalog --check` | `PASS`; 44 skills, 368 scenarios |
| whitespace | `git diff --check` | `PASS` |

## Rehydration

Read this capsule, then the archived WG-002 report and W-013 through W-017
lane packets. New work must use current architecture sources and create current
execution authority; do not edit archived records.

## Publication

- Commit: `NOT_REQUESTED`
- Push: `NOT_REQUESTED`
- External publication: `NOT_REQUESTED`
