# Work Archive: `AR-002 W-002 Judged Harness Evaluations`

Archive ID: `AR-002`  
Archived: 2026-07-24  
Scope: `W-002`, its judge-builder design brief, and completion report  
Final Status: `COMPLETE`  
Archive Result: `ARCHIVED`  
Archive Owner: `agent-engineer`  
Trigger: `direct-historical-cleanup`  
Reason: W-002 predates the automatic post-closeout chain but has accepted lane
closeout authority, retired active projection, and frozen detailed evidence.

## Compact Outcome

W-002 replaced point-total harness effectiveness grading with binary
mechanical eligibility followed by independent `outcome-v1` and
`trajectory-v1` semantic judgments. It added versioned judge profiles, anchored
rubrics, response validation, source-digest freshness, and the
`judge-eval-builder` authoring boundary.

## Identity And Terminal State

| Subject | Final Revision / Attempt | Final Gate Or Disposition | Detailed Authority |
|---|---|---|---|
| `W-002` | current-source canary `w002-current-canary-20260722` | `COMPLETE`; fixed-point review `PASS` | `2026-07-24-W-002-judged-harness-evals.md` |
| `judge-eval-builder` design | reviewed 2026-07-22 | `reviewed`; incorporated into W-002 | `2026-07-24-W-002-judge-eval-builder-design.md` |

## Preserved Non-Passing History

| Subject | Historical State | Replacement Or Final Meaning | Detailed Authority |
|---|---|---|---|
| `HS-context-implicit` canary | eligible but outcome and trajectory `FAIL` | proves the full judged-evaluation path executes; does not prove target effectiveness | archived W-002 report |
| remaining 298 scenarios | `NOT_RUN` under the W-002 source digest | full-catalog execution was outside the accepted W-002 closeout requirement | archived lane and report |
| human-labeled judge calibration | `NOT_RUN` | no agreement, false-pass, false-fail, stability, or calibration-confidence claim | archived lane, design brief, and report |
| earlier pre-fix canary | stale and unaccepted | superseded by the current-source canary and corrected eligibility contract | archived report |

## Artifact Manifest

| Original Path | Archive Path | Pre-Move SHA-256 | Post-Move SHA-256 | Role |
|---|---|---|---|---|
| `docs/work/lanes/W-002-judge-eval-builder-design.md` | `docs/archive/work-reports/2026-07-24-W-002-judge-eval-builder-design.md` | `be266e0fbd24c09de1c782d4ca739ab7a6aa2dbd911e25de28d64823ab33bdbe` | `be266e0fbd24c09de1c782d4ca739ab7a6aa2dbd911e25de28d64823ab33bdbe` | reviewed skill design |
| `docs/work/lanes/W-002-judged-harness-evals.md` | `docs/archive/work-reports/2026-07-24-W-002-judged-harness-evals.md` | `3f2bcb25b2d5754636a210ebe25d33d4b0253418bc0cc6870a135a7f3745a555` | `3f2bcb25b2d5754636a210ebe25d33d4b0253418bc0cc6870a135a7f3745a555` | lane packet |
| `docs/work/reports/2026-07-22-judged-harness-evaluations.md` | `docs/archive/work-reports/2026-07-24-2026-07-22-judged-harness-evaluations.md` | `f07beeb551b064991dbcb12561dfa7e980ad2137197bb8f6ab6fabcb628dd8c2` | `f07beeb551b064991dbcb12561dfa7e980ad2137197bb8f6ab6fabcb628dd8c2` | completion report |

## Dependency And Reference Audit

| Check | Result | Evidence |
|---|---|---|
| absent from active registry | `PASS` | `docs/work/active.md` has no active lane rows |
| no active consumers | `PASS` | W-003 is complete and archived; remaining W-002 references are frozen historical provenance or live archive pointers |
| source and indexes agree | `PASS` | lane and report both state `COMPLETE`; accepted stop contract preserved |
| inbound references classified | `PASS` | report index points to this capsule; references inside archived W-003/W-002 originals remain execution-era provenance |
| destination collision absent | `PASS` | all archive destinations were absent before the move |

## External Evidence Retained

| Evidence | Location | Retention / Freshness Meaning |
|---|---|---|
| judged canary | `.artifacts/harness-evals/w002-current-canary-20260722/` | ignored local evidence retained in place; historical current-source run for W-002 only |
| current harness contracts | `evals/harness/`; `scripts/run_harness_evals.py` | live implementation authority; archived W-002 files remain historical evidence |

## Validation

| Check | Command | Result |
|---|---|---|
| source/archive digest equality | `shasum -a 256 <archived-original>` | `PASS` for all three originals |
| stale live-path scan | focused `rg` over non-archived files | `PASS` |
| Cascade validator | `python3 scripts/validate_cascade_codex.py` | `PASS` |
| harness catalog | `python3 scripts/run_harness_evals.py catalog --check` | `PASS`; 41 skills, 339 scenarios |
| whitespace | `git diff --check` | `PASS` |

## Rehydration

Read this capsule first, then the archived W-002 lane, judge-builder design,
and completion report. Treat their original `docs/work/` paths as
execution-era provenance. A new evaluation campaign must establish explicit
current authority and bind new evidence to the then-current source digest,
profiles, rubrics, and scenario definitions.

## Publication

- Commit: `NOT_REQUESTED`
- Push: `NOT_REQUESTED`
- External publication: `NOT_REQUESTED`
