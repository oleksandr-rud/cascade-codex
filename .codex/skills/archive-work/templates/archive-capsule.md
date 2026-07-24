# Work Archive: `<AR-XXX scope>`

Archive ID: `<AR-XXX>`  
Archived: `YYYY-MM-DD`  
Scope: `<lane-graph-report-set>`  
Final Status: `<COMPLETE|SUPERSEDED>`  
Archive Owner: `<role-or-owner>`  
Reason: `<explicit-request-and-maintenance-benefit>`

## Compact Outcome

<What completed or was superseded, without collapsing historical failures.>

## Identity And Terminal State

| Subject | Final Revision / Attempt | Final Gate Or Disposition | Detailed Authority |
|---|---|---|---|
| `<W-XXX or CG-XXX>` | `<revision>` | `<ACCEPTED or SUPERSEDED>` | `<archived-path>` |

## Preserved Non-Passing History

| Subject | Historical State | Replacement Or Final Meaning | Detailed Authority |
|---|---|---|---|
| `<gate-workline-evidence>` | `<BLOCKED|FAIL|NOT_RUN|SUPERSEDED>` | `<replacement-or-retention-reason>` | `<archived-path>` |

## Artifact Manifest

| Original Path | Archive Path | Pre-Move SHA-256 | Post-Move SHA-256 | Role |
|---|---|---|---|---|
| `<docs/work/...>` | `<docs/archive/work-reports/...>` | `<digest>` | `<digest>` | `<lane-graph-report>` |

## Dependency And Reference Audit

| Check | Result | Evidence |
|---|---|---|
| absent from active registry | `<PASS|BLOCKED>` | `<path-line-or-note>` |
| no active consumers | `<PASS|BLOCKED>` | `<search-result>` |
| source and indexes agree | `<PASS|BLOCKED>` | `<paths>` |
| inbound references classified | `<PASS|BLOCKED>` | `<updated-historical-blocked>` |
| destination collision absent | `<PASS|BLOCKED>` | `<path-check>` |

## External Evidence Retained

| Evidence | Location | Retention / Freshness Meaning |
|---|---|---|
| `<artifact-report-commit>` | `<path-or-id>` | `<meaning>` |

## Validation

| Check | Command | Result |
|---|---|---|
| source/archive digest equality | `<sha-command>` | `<PASS|FAIL>` |
| stale live-path scan | `<rg-command>` | `<PASS|BLOCKED>` |
| Cascade validator | `python3 scripts/validate_cascade_codex.py` | `<PASS|FAIL>` |
| harness catalog | `python3 scripts/run_harness_evals.py catalog --check` | `<PASS|NOT_RUN>` |
| whitespace | `git diff --check` | `<PASS|FAIL>` |

## Rehydration

Read this capsule first, then the detailed archived graph, lane packets, and
reports listed in the manifest. Treat their original live paths as
execution-era provenance. To resume related work, create or reopen explicit
current authority and reference this archive; do not mutate archived records.

## Publication

- Commit: `<NOT_REQUESTED|commit>`
- Push: `<NOT_REQUESTED|remote>`
- External publication: `<NOT_REQUESTED|destination>`
