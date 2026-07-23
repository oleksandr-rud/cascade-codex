# Coordination Graph: CG-001

Status: `BLOCKED`
Planning Status: `IMPLEMENTATION_READY`
Plan Revision: `6`
Coordination Graph Revision: `3`
Coordination-State / Materialization Owner: root `agent-engineer`
Created: 2026-07-23
Execution Mode: `dedicated-worktrees`
Terminal Gate: `CG-TG-03`
Next Gate: explicit authority or a plan/graph amendment for a fourth bounded
WL-12 repair-and-review cycle; no canary may run while `CG-AG-15` is blocked

## Goal, Scope, And Non-Goals

Coordinate W-003 revision-6 worklines across dedicated worktrees, make their
accepted transports appear in the designated active worktree without an
automatic commit, join batch and integrated evidence, and repair only affected
work when an input fails or becomes stale.

In scope:

- authoritative cross-workline topology, readiness, dispatch, gates, evidence
  joins, materialization, batch evaluation, invalidation, repair, and terminal
  aggregation for W-003;
- preservation of accepted revision-4 work and failed legacy `AG-05` evidence
  while replacement attempt `CG-AG-16` remains separately gated; and
- direct cutover from the embedded W-003 graph without a compatibility copy.

Out of scope:

- lane-local Task Graph state and rich definitions owned by W-003 or reusable
  workflow patterns;
- automatic scheduling, worktree creation, graph parsing, state mutation,
  branch merge, commit, push, publication, or model spend; and
- inserting graph boilerplate into product, design, brand, source, generated,
  or normalized spec documents.

## Applicability Decision

| Decision | Workline Count | Qualifying Relations | Why Direct References Are Insufficient | Decision Owner / Time |
|---|---:|---|---|---|
| `CREATE_GRAPH` | 14 retained or current worklines; 2 revision-6 repair producers | dependency waves, evidence and batch joins, dedicated-worktree transport, no-commit materialization, cross-workline invalidation, partial repair, terminal aggregation | W-003 previously duplicated topology, gate, frontier, and integration state inside a lane; current repair needs two immutable transports, one materialization join, and one replacement terminal | root `agent-engineer` / 2026-07-23 |

## Source And Definition References

| Ref ID | Authority / Source | Path Or URI | Version / Freshness | Referenced Criteria / Decisions | Invalidation Rule |
|---|---|---|---|---|---|
| `CG-SRC-01` | W-003 plan | `docs/work/lanes/W-003-graph-shaped-workflow-mechanics.md` | plan revision 6 | request, definitions, criteria, workline outcomes, revision history | a plan revision changes referenced planning knowledge and requires graph-impact review |
| `CG-SRC-02` | workflow semantics | `docs/patterns/workflow/graph-shaped-work.md` | producer `4c6b3041b8bc9d6b81a18f64ee29e91dec78d2a9` | Task Graph versus Coordination Graph, authority, materialization, batch, repair, terminal rules | semantic or selected-context change reopens affected revision-5 gates |
| `CG-SRC-03` | graph schema | `docs/work/graph-template.md` | producer `4c6b3041b8bc9d6b81a18f64ee29e91dec78d2a9` | required graph records and no-runtime boundary | template contract change requires schema and consumer review |
| `CG-SRC-04` | reconciliation contract | `.codex/skills/reconcile-work-graph/SKILL.md` | source producer `494649b946e4cc4ac8c97eb5d460a72626ad8dc6`; repaired dependent transport through `6c073ba` | audit-first canonicalization and six disposition values | skill or checklist change reopens reconciliation/cutover evidence |
| `CG-SRC-05` | execution contracts | graph-aware workflow skills and workflow pack | source producer `6ff0966574bcfcd250af0774f08e8ded378473a0`; repaired dependent transport through `d6763d7` | dispatch, immutable transport, no-commit materialization, batch joins, integrated validation | changed materialization or evidence contract reopens affected gates and batches |
| `CG-SRC-06` | completed judged-harness contract | W-002 lane/report and current harness runner | target attempts `1/2` and `2/2` failed mechanical eligibility; judges `NOT_RUN` | evidence classes and required `HX-031` canary | runner/schema/profile/rubric drift invalidates prior runs; exhausted attempts require explicit replan before another canary |

## Boundary Contracts

| Boundary ID | Producer / Authority | Consumer | Input / Output Contract | Compatibility / Invalidation | Required Gate |
|---|---|---|---|---|---|
| `CG-BND-01` | `WL-07` | `WL-08`, `WL-09` | accepted first-class graph semantics and work-folder schema | producer semantic change reopens both consumers | `CG-AG-07` |
| `CG-BND-02` | `WL-08`, `WL-09` | `WL-10`, `WL-11` | canonical reconciliation plus graph-aware execution/materialization contracts | either producer transport or gate change reopens both consumers | `CG-AG-08`, `CG-AG-09` |
| `CG-BND-03` | accepted repair transports | designated active worktree | exact allowed paths appear without changing target HEAD or overwriting preserved dirty state | transport, applied delta, target baseline, overlap, or combined diff change invalidates materialization evidence | `CG-AG-15` |
| `CG-BND-04` | batch and integrated validators | `CG-TG-03` | current evidence bound to graph revision 3, target HEAD, fixed-point digest, and materialization set | any required missing/stale/failed input keeps the terminal open | `CG-AG-15` |
| `CG-BND-05` | preserved W-002/W-003 canary contract | `CG-TG-03` | one replacement bounded target/evaluate/judge attempt for `HX-031` after `CG-AG-15` | failed target eligibility or required `NOT_RUN` judges remain blocking; authored/deterministic evidence cannot substitute | `CG-AG-16` |

## Authority And Direct Cutover

Only root `agent-engineer` records authoritative cross-workline transitions,
queue state, batches, repairs, graph amendments, or terminal decisions.
Workers return immutable transports, receipts, evidence, and transition
proposals only.

| Cutover ID | Prior Authority | New Graph / Revision | Migrated Edges / Gates / Queues | Preserved / Invalidated Evidence | Cutover Time | Status / Block Route |
|---|---|---|---|---|---|---|
| `CG-CO-01` | W-003 embedded graph, final revision 4 | `CG-001@1` | revision-5 `WL-07` through `WL-12`, `CG-AG-07` through `CG-AG-12`, Materialization Queue, batches, `CG-TG-02`; legacy topology/gates/merge queue frozen | revision-4 receipts and accepted gates preserved as historical inputs; revision-4 frontier, terminal reviews, and merge queue invalid for current coordination acceptance | 2026-07-23, effective with atomic materialization of the WL-10 transport | `ACCEPTED` by `OH-W003-CG001-01`; any partial file-set application blocks mutation and must be rolled back or completed by root |

After this cutover, W-003, its implementation packet, and `active.md` contain
definitions, retained evidence, or derived projections only. No fallback
cross-workline authority remains in those files.

## Canonical Workline Registry

| Workline | Lane / Packet | Outcome / Criteria Refs | Owner / Thread | Write Scope | Requires | Produces Gate / Artifact | Execution Location | Status / Revision |
|---|---|---|---|---|---|---|---|---|
| `WL-01` | W-003 | original semantic authority | historical `W003-WL01` | workflow semantic paths | legacy `DG-00` | legacy `AG-01` | retained worker worktree | `ACCEPTED`; revision-4 history |
| `WL-02` | W-003 | original lane representation | historical `W003-WL02` | lane template/example | legacy `AG-01` | legacy `AG-02` | retained worker worktree | `ACCEPTED`; revision-4 history |
| `WL-03` | W-003 | original creation/execution skills | historical `W003-WL03` | creation/execution skills | legacy `AG-01` | legacy `AG-03` | retained worker worktree | `ACCEPTED`; revision-4 history |
| `WL-04` | W-003 | original evidence/repair skills | historical `W003-WL04` | evidence/repair skills | legacy `AG-01` | legacy `AG-04` | retained worker worktree | `ACCEPTED`; revision-4 history |
| `WL-05` | W-003 | focused model-backed behavior evidence | root authorized runner | artifact run directory only | `CG-AG-15`, refreshed `CG-SRC-06` | replacement `CG-AG-16` | active worktree / authorized runner | `BLOCKED`; replacement canary cannot run while exhausted WL-12 review is blocked |
| `WL-06` | W-003 | old integration/closeout projection | historical `W003-WL06` | retained public-doc outputs | legacy `JG-CORE`, `AG-05` | legacy `AG-06` | retained worker worktree | `SUPERSEDED` by `WL-12`; evidence retained |
| `WL-07` | W-003 rev 5 | Coordination Graph semantics and work-folder authority | `W003-WL07` | workflow pattern, graph template/index/example and routing | `CG-DG-01` | `CG-AG-07`; transport `4c6b3041...` | `/private/tmp/cascade-w003-wl07-r5-cg1` | `ACCEPTED`; producer transport present in WL-10 and active root |
| `WL-08` | W-003 rev 5 | reconciliation skill and canonical disposition contract | `W003-WL08` | reconciliation skill, checklist, role wiring | `CG-AG-07` | `CG-AG-08`; source `494649b...`, repaired dependent transport through `6c073ba` | `/private/tmp/cascade-w003-wl08-r5-cg1` | `ACCEPTED`; producer transport present in WL-10 and active root |
| `WL-09` | W-003 rev 5 | dispatch, materialization, batch, and repair mechanics | `W003-WL09` | graph-aware skills and workflow pack | `CG-AG-07` | `CG-AG-09`; source `6ff0966...`, repaired dependent transport through `d6763d7` | `/private/tmp/cascade-w003-wl09-r5-cg1` | `ACCEPTED`; producer transport present in WL-10 and active root |
| `WL-10` | W-003 rev 5 | direct W-003 to CG-001 cutover | `W003-WL10` | W-003, packet, active row, CG-001, reconciliation report/index | `CG-AG-08`, `CG-AG-09` | `CG-AG-10`; transport `1539836613466a366ada2b10fa8a73b116873489` | `/private/tmp/cascade-w003-wl10-r5-cg1` | `ACCEPTED`; materialized without active-branch commit |
| `WL-11` | W-003 rev 5 | validator and harness coverage for new contracts | `W003-WL11` | validator and harness-owned paths | `CG-AG-08`, `CG-AG-09` | `CG-AG-11`; transport `0772244f206a3c4e0dab2e280dbff536a8c126a5` | `/private/tmp/cascade-w003-wl11-r5-cg1` | `BLOCKED`; current catalog contains `HX-047..051` beyond the accepted 326-scenario transport |
| `WL-12` | W-003 rev 6 | root materialization, combined validation, evidence aggregation, terminal proposal | root `agent-engineer` | active worktree materialization and root-owned graph/report state | `CG-AG-13`, `CG-AG-14` | replacement `CG-AG-15`; `CG-BATCH-03`; `CG-IV-02` | `/Users/royrud1902/Documents/cascade-codex` | `BLOCKED`; attempt `3/3` failed final Spec review, further cycle requires explicit authority/amendment |
| `WL-13` | W-003 rev 6 | route-boundary repair | `W003-WL13` | `CODEX.md`; orchestrator role; functional/validation skill contracts | preserved `CG-AG-09`; failed target traces A1/A2 | `CG-AG-13`; immutable repair transport | `/private/tmp/cascade-w003-wl09-r5-cg1` | `ACCEPTED`; attempt `1/2`, transport `bd8104ac...` |
| `WL-14` | W-003 rev 6 | harness output-contract and 331-scenario transport repair | `W003-WL14` | runner; exact active-root skill-case source; interaction source; generated catalog | preserved `CG-AG-08`, `CG-AG-09`; failed trace A2; current skill-case source and HX-047..051 | `CG-AG-14`; immutable repair transport | `/private/tmp/cascade-w003-wl11-r5-cg1` | `ACCEPTED`; attempt `1/2`, transport `36a067c5...` |

## Typed Coordination Edges

| Edge ID | From | Type | To | Satisfaction Rule / Immutable Transport | Invalidation / Repair Route |
|---|---|---|---|---|---|
| `CG-E-01` | `CG-DG-01` | `REQUIRES_GATE` | `WL-07` | reviewed base `a14a9bc...` and bounded dispatch | refresh dispatch and affected transports |
| `CG-E-02` | `CG-AG-07` | `REQUIRES_GATE` | `WL-08` | gate accepted for `4c6b3041...` | reopen `WL-08` and consumers if semantics change |
| `CG-E-03` | `CG-AG-07` | `REQUIRES_GATE` | `WL-09` | gate accepted for `4c6b3041...` | reopen `WL-09` and consumers if semantics change |
| `CG-E-04` | `CG-AG-08` | `REQUIRES_GATE` | `WL-10` | accepted source `494649b...` and repair `6c073ba` present | reopen `WL-10` and affected cutover evidence |
| `CG-E-05` | `CG-AG-09` | `REQUIRES_GATE` | `WL-10` | accepted source `6ff0966...` and repair `d6763d7` present | reopen `WL-10` and affected cutover evidence |
| `CG-E-06` | `CG-AG-08` | `REQUIRES_GATE` | `WL-11` | accepted reconciliation contract present in consumer | reopen `WL-11` if source or presence proof changes |
| `CG-E-07` | `CG-AG-09` | `REQUIRES_GATE` | `WL-11` | accepted execution contract present in consumer | reopen `WL-11` if source or presence proof changes |
| `CG-E-08` | `CG-AG-10` | `MATERIALIZES` | `WL-12` | accepted WL-10 immutable transport enters `CG-MQ-10` | return queue to `QUEUED` after repaired transport |
| `CG-E-09` | `CG-AG-11` | `MATERIALIZES` | `WL-12` | accepted WL-11 immutable transport enters `CG-MQ-11` | return queue to `QUEUED` after repaired transport |
| `CG-E-10` | legacy `AG-05` | `TERMINAL_INPUT` | `CG-TG-02` | required current target/evaluate/judge evidence passes | keep terminal blocked; repair or obtain authority through owning route |
| `CG-E-11` | `CG-AG-12` | `TERMINAL_INPUT` | `CG-TG-02` | all required materialization, batch, integrated, and review evidence current | reopen earliest affected workline/queue/batch only |
| `CG-E-12` | preserved `CG-AG-09` | `REQUIRES_GATE` | `WL-13` | accepted graph-aware execution semantics remain current | reopen WL-13 if source semantics change |
| `CG-E-13` | preserved `CG-AG-08`, `CG-AG-09` | `REQUIRES_GATE` | `WL-14` | accepted reconciliation/execution inputs remain current | reopen WL-14 if either producer changes |
| `CG-E-14` | `CG-AG-13` | `MATERIALIZES` | `WL-12` | accepted WL-13 immutable transport enters `CG-MQ-13` | requeue MQ-13 on transport/source drift |
| `CG-E-15` | `CG-AG-14` | `MATERIALIZES` | `WL-12` | accepted WL-14 immutable transport enters `CG-MQ-14` | requeue MQ-14 on transport/source drift |
| `CG-E-16` | `CG-AG-15` | `REQUIRES_GATE` | `WL-05` | one current combined fixed point and both independent reviews pass | keep replacement canary pending until current |
| `CG-E-17` | `CG-AG-15`, `CG-AG-16` | `TERMINAL_INPUT` | `CG-TG-03` | integrated repair and eligible dual-judged replacement canary both accept | reopen only the failing producer and named consumers |

## Coordination Gates And Evidence Joins

| Gate ID | Type / Subject | Required Inputs | Optional Inputs | Evidence Producers | Evaluator / Reviewer Authority | Acceptance Rule | Invalidation / Reopen | State | Failure / Repair Route |
|---|---|---|---|---|---|---|---|---|---|
| `CG-DG-01` | dispatch / revision-5 worktrees | clean base `a14a9bc...`, exact thread/branch/worktree/write scopes | none | root Git inspection | root `agent-engineer` | every dispatched transport descends from the named base and writes only assigned paths | base, scope, or branch identity change | `ACCEPTED` | refresh affected dispatches; do not infer readiness |
| `CG-AG-07` | workline / `WL-07` | transport `4c6b3041...`, semantic/template checks and accepted producer review | none | WL-07 worker and reviewers | root `agent-engineer` | all required current producer evidence passes | semantic, template, transport, or review change | `ACCEPTED` | repair `WL-07`; reopen consumers |
| `CG-AG-08` | workline / `WL-08` | source `494649b...`, repaired dependent transport through `6c073ba`, skill/checklist/wiring review | none | WL-08 worker and reviewers | root `agent-engineer` | reconciliation contract and six canonical dispositions pass | source/consumer transport or contract change | `ACCEPTED` | repair `WL-08`; reopen consumers |
| `CG-AG-09` | workline / `WL-09` | source `6ff0966...`, repaired dependent transport through `d6763d7`, execution-contract review | none | WL-09 worker and reviewers | root `agent-engineer` | dispatch/materialization/batch/repair contracts agree | source/consumer transport or contract change | `ACCEPTED` | repair `WL-09`; reopen consumers |
| `CG-AG-10` | workline / `WL-10` | immutable WL-10 transport, reconciliation report, no-dual-authority audit, focused validation | none | WL-10 worker; root reviewer | root `agent-engineer` | owned diff passes and atomic cutover is reviewable | any owned artifact, producer input, or transport change | `ACCEPTED` | repair WL-10; keep old/new partial authority from materializing |
| `CG-AG-11` | workline / `WL-11` | immutable WL-11 transport, validator and harness checks | optional model evidence only if separately authorized | WL-11 worker; validators; root reviewer | root `agent-engineer` | required deterministic and review evidence passes without overstating live behavior | source, test, validator, transport, or review change | `BLOCKED` | bind `HX-047..051` to a reviewed repair transport, then refresh the affected materialization and batch |
| `CG-AG-12` | historical materialization/integrated / `WL-12` | accepted `CG-AG-10`, historical `CG-AG-11`; historical materialization receipts; `CG-BATCH-01`; `CG-IV-01`; invalidated reviews | legacy canary was a separate terminal input | root materialization owner, validators, reviewers | root `agent-engineer` | retained only to explain the superseded revision-2 join | any old binding change remains historical | `BLOCKED`; superseded | no resume; use `CG-AG-15` |
| `CG-AG-13` | repair workline / `WL-13` | bound dispatch, failed traces A1/A2, route-contract diff, focused checks, independent review | none | WL-13 worker and reviewer | root `agent-engineer` | route semantics distinguish product-visible proof from read-only evidence-impact analysis without weakening HX-031 | owned file, base, transport, or review drift | `ACCEPTED` | repair WL-13 within attempt `1/2`; preserve unrelated gates |
| `CG-AG-14` | repair workline / `WL-14` | bound dispatch, failed trace A2, output-contract assertion, byte-identical active-root skill-case source, exact 331-scenario source/generated catalog, deterministic checks, independent review | none | WL-14 worker and reviewer | root `agent-engineer` | current-support/future-handoff semantics are explicit and transport contains the current skill cases plus HX-047..051 | owned file, base, skill-case source, catalog, transport, or review drift | `ACCEPTED` | repair WL-14 within attempt `1/2`; preserve unrelated gates |
| `CG-AG-15` | materialization/integrated / `WL-12` | accepted `CG-AG-13`, `CG-AG-14`; accepted `CG-MQ-13`, `CG-MQ-14`; `CG-BATCH-03`; `CG-IV-02`; matching independent reviews | none | root materialization owner, validators, reviewers | root `agent-engineer` | every required current input passes for graph revision 3, target HEAD, transports, and one fixed-point digest | transport, queue, target, digest, batch, review, or graph revision change | `BLOCKED`; attempt `3/3` exhausted | explicit authority/amendment before repairing remaining projection and GF-004 findings |
| `CG-AG-16` | replacement canary / `WL-05` attempt `3/3` | accepted `CG-AG-15`; one eligible HX-031 target; accepted outcome and trajectory judges; current coverage row | none | authorized runner and required judges | root `agent-engineer` | exact current target is mechanically eligible and both independent judgments accept | source/catalog/profile/rubric/model/run or fixed-point drift | `OPEN` | failure blocks revision 6; no fourth attempt authorized |

| Evidence ID | Subject / Gate | Graph Revision | Input / Source Versions | Source Commit / Digest / Diff | Producer / Time | Requirement | Result | Evaluator | Invalidation / Failure Route |
|---|---|---:|---|---|---|---|---|---|---|
| `CG-EV-07-TRANSPORT` | `WL-07 / CG-AG-07` | 2 (carried from 1) | W-003 rev 5 semantic producer | `4c6b3041b8bc9d6b81a18f64ee29e91dec78d2a9` | WL-07 / 2026-07-23 | required | `PASS` | root accepted producer handoff | transport or reviewed content change |
| `CG-EV-08-TRANSPORT` | `WL-08 / CG-AG-08` | 2 (carried from 1) | reconciliation producer | source `494649b946e4cc4ac8c97eb5d460a72626ad8dc6`; repair `6c073ba` | WL-08 / 2026-07-23 | required | `PASS` | root accepted repaired producer handoff | source/repair identity or content change |
| `CG-EV-09-TRANSPORT` | `WL-09 / CG-AG-09` | 2 (carried from 1) | execution-mechanics producer | source `6ff0966574bcfcd250af0774f08e8ded378473a0`; repair `d6763d7` | WL-09 / 2026-07-23 | required | `PASS` | root accepted repaired producer handoff | source/repair identity or content change |
| `CG-EV-05-CANARY` | legacy `AG-05 / CG-TG-02` | 2 (carried from 1) | `HX-031`; two-attempt W-003 bound | target runs below; no judgment | root runner / 2026-07-23 | required | `FAIL`; exhausted | W-002 evaluator route | replan attempt budget and repair contracts before any newly authorized run |
| `CG-EV-05-TARGET-A1` | legacy `AG-05` attempt `1/2` | 2 | catalog `6301b59f...`; source `615f9830...` | `.artifacts/harness-evals/w003-hx031-20260723t1408z` | `gpt-5.6-sol` / 2026-07-23 | required | `FAIL`: primary, support, load | mechanical eligibility | target-behavior route repair required; judges remain `NOT_RUN` |
| `CG-EV-05-TARGET-A2` | legacy `AG-05` attempt `2/2` | 2 | catalog `6301b59f...`; source `99ad436b...` | `.artifacts/harness-evals/w003-hx031-r2-20260723t1411z` | `gpt-5.6-sol` / 2026-07-23 | required | `FAIL`: support | mechanical eligibility | supporting-skill versus future-handoff contract repair required; judges remain `NOT_RUN` |
| `EV-CG-AG12-STANDARDS-59BCFE5B-R2` | `WL-12 / CG-AG-12` | 2 | accepted transports/materializations, `CG-BATCH-01`, `CG-IV-01` | target HEAD `a14a9bc...`; fixed-point digest `59bcfe5b6a2920a5ea1f5454c3e35e26fa7913588088b667721003486655ec28` | independent Standards reviewer / 2026-07-23 | required | historical `PASS`; `INVALIDATED` by `CG-RP-03` | root accepts only with matching Spec receipt | current 331-scenario source exceeds the reviewed 326-scenario binding |
| `CG-EV-AG12-SPEC-59BCFE5` | `WL-12 / CG-AG-12` | 2 | accepted transports/materializations, `CG-BATCH-01`, `CG-IV-01` | target HEAD `a14a9bc...`; fixed-point digest `59bcfe5b6a2920a5ea1f5454c3e35e26fa7913588088b667721003486655ec28` | independent Spec reviewer / 2026-07-23 | required | historical `PASS`; `INVALIDATED` by `CG-RP-03` | root accepts only with matching Standards receipt | current 331-scenario source exceeds the reviewed 326-scenario binding |
| `CG-EV-AG13-REVIEW-BD8104A` | `WL-13 / CG-AG-13` | 3 | plan 6; failed traces A1/A2; unchanged HX-031 contract | base `578451e...`; transport `bd8104acdf0408e793c2a542093f777198e7565b` | independent reviewer / 2026-07-23 | required | `PASS` Standards and Spec | root accepted reviewed producer handoff | base/head, four owned contracts, graph revision, or HX-031 contract change |
| `CG-EV-AG14-REVIEW-36A067C` | `WL-14 / CG-AG-14` | 3 | plan 6; failed trace A2; exact current catalog sources | base `0772244f...`; transport `36a067c5c5befd3accb283d50c2d02ede84cde28`; catalog `6301b59f...` | independent reviewer / 2026-07-23 | required | `PASS` Standards and Spec | root accepted reviewed producer handoff | base/head, four owned paths, source bytes, catalog, graph revision, or HX-031/W-002 contract change |
| `EV-CG-AG15-STANDARDS-B1C48673-R3` | `WL-12 / CG-AG-15 / CG-IV-02` | 3 | plan 6; attempt `2/3`; transports/materialization/batch at reviewed fixed point | target `a14a9bc...`; digest `b1c48673a31b13700e1de70c908cae8073822316c7c0f092b0e09ad0297e6bae` | independent Standards reviewer / 2026-07-23 | required | historical `FAIL`; invalidated by bounded repair | root may not accept gate from this receipt | current-projection, fragment-ledger, materialization-detail, and fragment-kind repair required |
| `CG-EV-AG15-SPEC-B1C4867` | `WL-12 / CG-AG-15 / CG-IV-02` | 3 | plan 6; attempt `2/3`; transports/materialization/batch at reviewed fixed point | target `a14a9bc...`; digest `b1c48673a31b13700e1de70c908cae8073822316c7c0f092b0e09ad0297e6bae` | independent Spec reviewer / 2026-07-23 | required | historical `FAIL`; invalidated by bounded repair | root may not accept gate from this receipt | current graph/plan/packet authority and resume projections required repair |
| `CG-EV-AG15-SPEC-5C1FE93` | `WL-12 / CG-AG-15 / CG-IV-02` | 3 | plan 6; attempt `3/3`; current repair transports, materialization, and batch | target `a14a9bc...`; digest `5c1fe931070e2cf7e17609058541f70b878fb0cafca63cd907ff6e910876afea` | independent Spec reviewer / 2026-07-23 | required | `FAIL`; attempt exhausted | root cannot accept or launch canary | repair two stale graph projections and fully resolve selected GF-004 only after explicit authority/amendment |

## Dedicated Worktree Dispatch

| Dispatch ID | Workline | Thread | Branch / Worktree | Base SHA | Required Producer Transport / Presence Proof | Allowed Writes | Producer Gate | Attempt / Max | Input Versions | Status | Invalidation / Stop Route |
|---|---|---|---|---|---|---|---|---:|---|---|---|
| `CG-D-07` | `WL-07` | `W003-WL07` | `agent/w003-wl07-r5-cg1` / `/private/tmp/cascade-w003-wl07-r5-cg1` | `a14a9bc...` | none | assigned semantic/template/routing paths | `CG-AG-07` | 1/3 | W-003 rev 5 request | `ACCEPTED` | transport/source drift reopens gate |
| `CG-D-08` | `WL-08` | `W003-WL08` | `agent/w003-wl08-r5-cg1` / `/private/tmp/cascade-w003-wl08-r5-cg1` | `a14a9bc...` | `4c6b3041...`; exact producer present | assigned reconciliation paths | `CG-AG-08` | 1/3 | `CG-SRC-02@4c6b3041` | `ACCEPTED` | transport/source drift reopens gate |
| `CG-D-09` | `WL-09` | `W003-WL09` | `agent/w003-wl09-r5-cg1` / `/private/tmp/cascade-w003-wl09-r5-cg1` | `a14a9bc...` | `4c6b3041...`; exact producer present | assigned execution-contract paths | `CG-AG-09` | 1/3 | `CG-SRC-02@4c6b3041` | `ACCEPTED` | transport/source drift reopens gate |
| `CG-D-10` | `WL-10` | `W003-WL10` | `agent/w003-wl10-r5-cg1` / `/private/tmp/cascade-w003-wl10-r5-cg1` | `a14a9bc...` | accepted producers present through dependent head `d6763d7`; immutable output `1539836613466a366ada2b10fa8a73b116873489` | only W-003 mechanics/packet, active row, CG-001/index, reconciliation report/index | `CG-AG-10` | 1/3 | plan 5 / CG 1 / accepted producers | `ACCEPTED` | stop on producer drift, scope conflict, or dual authority |
| `CG-D-11` | `WL-11` | `W003-WL11` | `agent/w003-wl11-r5-cg1` / `/private/tmp/cascade-w003-wl11-r5-cg1` | `a14a9bc...` | accepted producers present through dependent head `073e3ed`; immutable output `0772244f206a3c4e0dab2e280dbff536a8c126a5` | assigned validator/harness paths | `CG-AG-11` | 1/3 | plan 5 / accepted producers | `ACCEPTED` | source/test/validator drift reopens the gate |
| `CG-D-13` | `WL-13` | `W003-WL13` | `agent/w003-wl09-r5-cg1` / `/private/tmp/cascade-w003-wl09-r5-cg1` | `578451eaf13f06fe3d4b4fd8663ae2ba860b103c` | preserved `CG-AG-09`; failed A1/A2 traces are read-only inputs; output `bd8104ac...` | `CODEX.md`; orchestrator role; functional/validation skill contracts | `CG-AG-13` | 1/2 | plan 6 / graph 3 / A1+A2 | `ACCEPTED` | base, scope, failed-trace, or contract change blocks dispatch |
| `CG-D-14` | `WL-14` | `W003-WL14` | `agent/w003-wl11-r5-cg1` / `/private/tmp/cascade-w003-wl11-r5-cg1` | `0772244f206a3c4e0dab2e280dbff536a8c126a5` | preserved `CG-AG-08`, `CG-AG-09`; active-root skill-case source and HX-047..051; output `36a067c5...` | runner; byte-identical active-root skill-case source; interaction source; generated catalog | `CG-AG-14` | 1/2 | plan 6 / graph 3 / A2 / catalog 331 | `ACCEPTED` | base, scope, skill-case source, catalog, failed-trace, or contract change blocks dispatch |

### Worker Receipts

| Receipt ID | Workline / Gate | Plan / Graph Revision | Branch / Worktree | Base / Head SHA / Owned Commits | Immutable Transport Identity / Producer Presence Proof | Allowed / Actual Paths | Inputs / Outputs | Exact Local Checks / Evidence | Cleanliness / Blockers | Prior / Proposed State | Invalidation / Repair Route |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `CG-WR-07` | `WL-07 / CG-AG-07` | 5 / 1 | WL-07 branch/worktree | `a14a9bc... / 4c6b3041... / 4c6b3041...` | accepted commit | assigned WL-07 paths / same | first-class graph semantics/template/index/example | accepted producer evidence | clean / none reported | `REVIEW -> ACCEPTED` by root | refresh on transport or source change |
| `CG-WR-08` | `WL-08 / CG-AG-08` | 5 / 1 | WL-08 branch/worktree | `a14a9bc... / 494649b... / 494649b...` | source `494649b...`; repaired dependent presence through `6c073ba` | assigned WL-08 paths / same | reconciliation skill/checklist/wiring | accepted producer evidence | clean / none reported | `REVIEW -> ACCEPTED` by root | refresh on transport or source change |
| `CG-WR-09` | `WL-09 / CG-AG-09` | 5 / 1 | WL-09 branch/worktree | `a14a9bc... / 6ff0966... / 6ff0966...` | source `6ff0966...`; repaired dependent presence through `d6763d7` | assigned WL-09 paths / same | execution/materialization skill contracts | accepted producer evidence | clean / none reported | `REVIEW -> ACCEPTED` by root | refresh on transport or source change |
| `CG-WR-10` | `WL-10 / CG-AG-10` | 5 / 1 | WL-10 branch/worktree | `a14a9bc... / 1539836613466a366ada2b10fa8a73b116873489 / same owned commit` | producer presence proven at `d6763d7`; immutable transport `1539836...` | seven authorized work surfaces / exact scope match | direct cutover and reconciliation | graph contract, pack build, diff and scope checks pass | clean / none | `IN_PROGRESS -> REVIEW`; root accepted gate | owned diff, input, or transport change reopens |
| `CG-WR-11` | `WL-11 / CG-AG-11` | 5 / 1 | WL-11 branch/worktree | `a14a9bc... / 0772244f206a3c4e0dab2e280dbff536a8c126a5 / same owned commit` | producer presence proven at `073e3ed`; immutable transport `0772244...` | seven validator/harness paths / exact scope match | graph validation and authored cases | validator, catalog, runtime audit, self-test, negative probes pass; model evidence `NOT_RUN` | clean / none | `IN_PROGRESS -> REVIEW`; root accepted gate | source/test/validator or transport change reopens |
| `CG-WR-13` | `WL-13 / CG-AG-13` | 6 / 3 | WL-13 branch/worktree | `578451e... / bd8104acdf0408e793c2a542093f777198e7565b / one owned commit` | immutable route-boundary transport | four authorized route contracts / exact scope | direct validation route and conditional future handoffs | catalog, audit, self-test, focused route audit, diff and independent review pass; inherited old-base validator debt separately recorded | clean / none | `IN_PROGRESS -> REVIEW`; root accepted gate | transport, owned contract, graph revision, or HX-031 contract drift |
| `CG-WR-14` | `WL-14 / CG-AG-14` | 6 / 3 | WL-14 branch/worktree | `0772244f... / 36a067c5c5befd3accb283d50c2d02ede84cde28 / one owned commit` | immutable runner/catalog transport; exact active-root catalog-source presence | four authorized harness paths / exact scope | supporting-skill prompt contract, self-test, exact 40/331 catalog | validator, catalog `6301b59f...`, 19 self-tests, runtime/static audit, compile, diff and independent review pass | clean / none | `IN_PROGRESS -> REVIEW`; root accepted gate | transport, source bytes, catalog, graph revision, or W-002/HX-031 contract drift |

## Materialization Queue

The designated active worktree is
`/Users/royrud1902/Documents/cascade-codex` on
`agent/w003-integration-r4-g3`. Its HEAD remains
`a14a9bc30e3ce1d8f2875bcd53e9c8c17cd0e98f`; accepted producer changes are
present as uncommitted tracked/untracked state. Root must bind exact dirty-path
inventory and combined diff identity before accepting any queue item. No graph
operation authorizes a commit on that branch.

| Queue ID / Order | Workline / Receipt | Required Gates | Target Worktree / Branch | Target Baseline | Allowed Paths | Transport Method | State | Conflict / Invalidation Route |
|---|---|---|---|---|---|---|---|---|
| `CG-MQ-07 / 1` | `WL-07 / CG-WR-07` | `CG-AG-07` | active root / integration branch | HEAD `a14a9bc...`; bound by combined receipt | WL-07 scope | root-applied commit-derived delta without commit | `ACCEPTED` | unexplained overlap blocks; refresh materialization receipt |
| `CG-MQ-08 / 2` | `WL-08 / CG-WR-08` | `CG-AG-08` | active root / integration branch | same HEAD and combined binding | WL-08 scope | root-applied source and repair deltas without commit | `ACCEPTED` | unexplained overlap blocks; refresh materialization receipt |
| `CG-MQ-09 / 3` | `WL-09 / CG-WR-09` | `CG-AG-09` | active root / integration branch | same HEAD and combined binding | WL-09 scope | root-applied source and repair deltas without commit | `ACCEPTED` | unexplained overlap blocks; refresh materialization receipt |
| `CG-MQ-10 / 4` | `WL-10 / CG-WR-10` | `CG-AG-10` | active root / integration branch | same HEAD and combined binding | WL-10 owned paths | exact accepted transport applied without commit | `ACCEPTED` | transport or combined-state drift requeues this item |
| `CG-MQ-11 / 5` | `WL-11 / CG-WR-11` | `CG-AG-11` | active root / integration branch | same HEAD and combined binding | WL-11 owned paths | accepted transport plus unexplained later catalog delta | `BLOCKED` | bind `HX-047..051` to a reviewed repair transport, then return through `QUEUED` |
| `CG-MQ-13 / 6` | `WL-13 / CG-WR-13` | `CG-AG-13` | active root / integration branch | HEAD `a14a9bc...`; bound by revision-6 materialization receipt | exact WL-13 owned paths | reviewed transport semantics applied without commit while preserving newer accepted graph-fragment clauses | `ACCEPTED` | transport, overlap adaptation, combined-state, or review drift requeues this item |
| `CG-MQ-14 / 7` | `WL-14 / CG-WR-14` | `CG-AG-14` | active root / integration branch | same HEAD and revision-6 binding | exact WL-14 owned paths, including `skill-cases.json` | runner byte-identical to transport; three catalog paths satisfied by byte-identical presence proof; no commit | `ACCEPTED` | transport, source bytes, catalog, or combined-state drift requeues this item |

### Materialization Receipts

| Receipt ID | Queue / Workline | Graph Revision | Source Branch / Base / Head / Immutable Transport | Target HEAD Before / After | Active Baseline / Preserved Dirty Paths | Applied Paths / Combined Diff Fingerprint | Transport Method / Conflicts | Staged State | Focused Checks | Prior / Proposed State | Rollback / Repair Route |
|---|---|---:|---|---|---|---|---|---|---|---|---|
| `CG-MR-ROOT-R5-COMBINED` | `CG-MQ-07..11 / WL-07..11` | 2 | accepted sources/repairs plus `1539836613466a366ada2b10fa8a73b116873489` and `0772244f206a3c4e0dab2e280dbff536a8c126a5` | `a14a9bc30e3ce1d8f2875bcd53e9c8c17cd0e98f / same` | preflight inventory contained only already accepted queue paths; all unrelated target state preserved | exact scoped deltas visible; immutable materialized-transport payload SHA-256 `e48e6c5162374c3913207ea1166bbbe8580d75332ef9ffc339609c4d8f6f4091` | reviewed commit-derived deltas / no conflict or unexplained overlap | unstaged/untracked; cached diff empty | historical pack selectors, validator, 326-scenario catalog, runtime audit, self-test, diff hygiene pass | historical `ACCEPTED`; `CG-MQ-11` invalidated by `CG-RP-03`, other queue items preserved | repair/rematerialize only MQ-11; recompute combined fingerprint and downstream evidence |
| `CG-MR-ROOT-R6-REPAIRS` | `CG-MQ-13..14 / WL-13..14` | 3 | `bd8104acdf0408e793c2a542093f777198e7565b`; `36a067c5c5befd3accb283d50c2d02ede84cde28` | `a14a9bc30e3ce1d8f2875bcd53e9c8c17cd0e98f / same` | 44-entry preflight porcelain inventory SHA-256 `1689ecb3f9be42e378e932316e5cf08ab2f29f56007f1757d1953b4dd9c9d666`; no cleanup, stage, or commit | eight sorted materialized paths; path+length+bytes SHA-256 `cca69b3d237cb75340323c8bffe56e536659b8d045a5ab7b324a8c3a8d6f625a`; entire combined diff fingerprint is the matching pre-acceptance review digest | WL-13 reviewed semantics overlap-adapted around newer graph-fragment clauses; WL-14 runner and catalog paths byte-identical / no unexplained conflict | unstaged/untracked; cached diff empty | full pack plus six selectors, validator, catalog, 19 self-tests, runtime audit, compile, diff hygiene pass | `QUEUED -> APPLYING -> APPLIED -> VALIDATING -> ACCEPTED`; `WL-12 -> REVIEW` | requeue only affected repair transport and rerun batch/reviews on transport/path/digest/check drift |

`CG-MR-ROOT-R6-REPAIRS` applied exactly these eight sorted paths:

- `.codex/agents/orchestrator/AGENT.md`
- `.codex/skills/functional-qa/SKILL.md`
- `.codex/skills/validate-change/SKILL.md`
- `CODEX.md`
- `evals/harness/interactions.json`
- `evals/harness/scenarios.generated.json`
- `evals/harness/skill-cases.json`
- `scripts/run_harness_evals.py`

The exact 44-entry pre-existing porcelain inventory was:

- `.codex/README.md`
- `.codex/agents/orchestrator/AGENT.md`
- `.codex/agents/orchestrator/skills.yaml`
- `.codex/skills/agentic-workflow-builder/SKILL.md`
- `.codex/skills/agentic-workflow-builder/checklists/workflow-packet-quality.md`
- `.codex/skills/agentic-workflow-builder/templates/agentic-workflow-packet.md`
- `.codex/skills/closeout/SKILL.md`
- `.codex/skills/context/SKILL.md`
- `.codex/skills/functional-qa/SKILL.md`
- `.codex/skills/harness-evaluation/SKILL.md`
- `.codex/skills/implement-change/SKILL.md`
- `.codex/skills/orchestrate-work/SKILL.md`
- `.codex/skills/plan-change/SKILL.md`
- `.codex/skills/plan-change/checklists/planning-completeness.md`
- `.codex/skills/plan-change/templates/definition-ready-plan.md`
- `.codex/skills/review-change/SKILL.md`
- `.codex/skills/test-autorepair/SKILL.md`
- `.codex/skills/validate-change/SKILL.md`
- `CODEX.md`
- `README.md`
- `docs/patterns/workflow/graph-shaped-work.md`
- `docs/patterns/workflow/index.md`
- `docs/patterns/workflow/workflow.pack.yaml`
- `docs/structure.md`
- `docs/work/_index.md`
- `docs/work/active.md`
- `docs/work/examples/_index.md`
- `docs/work/lane-template.md`
- `docs/work/lanes/W-003-graph-shaped-workflow-implementation-packet.md`
- `docs/work/lanes/W-003-graph-shaped-workflow-mechanics.md`
- `docs/work/reports/_index.md`
- `evals/harness/interactions.json`
- `evals/harness/scenarios.generated.json`
- `evals/harness/skill-cases.json`
- `harness.config.example.yaml`
- `harness.config.yaml`
- `scripts/validate_cascade_codex.py`
- `.codex/skills/reconcile-work-graph/` (untracked)
- `docs/patterns/workflow/fragments/` (untracked)
- `docs/work/examples/coordination-graph.md` (untracked)
- `docs/work/graph-template.md` (untracked)
- `docs/work/graphs/` (untracked)
- `docs/work/reports/2026-07-23-w003-coordination-graph-reconciliation.md` (untracked)
- `docs/work/reports/2026-07-23-w003-terminal-canary-blocker.md` (untracked)

These paths were neither cleaned nor overwritten. Root coordination records
changed afterward under the graph-state-owner boundary and are not
worker-transport payload.

### Evidence Fixed Point And Review Closure

The materialized-transport payload fingerprint above proves the exact accepted
worker deltas that appeared in the active worktree. It intentionally precedes
root-authored coordination-state recording and is not the independent review
digest.

Before each independent review attempt, root reruns the required deterministic
checks and computes one **pre-acceptance fixed-point digest** over the entire
tracked diff plus every untracked path relative to target HEAD. Standards and
Spec receipts must bind that same digest, target HEAD, graph revision, producer
transports, materialization set, batch, and integrated-validation IDs. The
review receipts are the authoritative location for that digest because writing
it into the reviewed tree before hashing would be self-referential.

If and only if both required revision-6 reviews return `PASS` for the same fixed
point, they may pre-authorize one bounded root mutation without invalidating
their receipts: record both receipt IDs/digest/results, record `WL-12 REVIEW ->
ACCEPTED` and `CG-AG-15 OPEN -> ACCEPTED`, and refresh only derived current
frontier/index/active/header projections. `CG-TG-03` remains `OPEN` until the
separate replacement canary accepts `CG-AG-16`.
Any implementation, contract, transport, materialization, batch, evidence,
review-criterion, or other content change is outside that exception and
invalidates both reviews. After the bounded mutation, root reruns the
mechanical validator, catalog check, audit, self-test, and diff hygiene; those
checks confirm recording integrity but do not replace the reviews.

## Batch Evaluation Matrix

| Batch ID | Required Workline / Materialization Gates | Producer Transport Identities | Target HEAD / Combined Diff | Input / Definition Digests | Runner / Model / Environment / Rubric Versions | Shards / Expected Coverage | Required / Optional Evidence | Missing / Duplicate Policy | Aggregation Rule | State | Failure / Repair Route |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `CG-BATCH-01` | `CG-AG-07` through `CG-AG-11`; `CG-MQ-07` through `CG-MQ-11` | exact accepted transports for WL-07..11 | active-root HEAD `a14a9bc...`; payload SHA-256 `e48e6c...`; fresh pre-acceptance review digest required | plan 5, graph 2, workflow/skill/template/validator sources | local Python validators and harness deterministic runner; model not required for this batch | full workflow pack and 3 graph selectors; structural validator; current 40-skill/331-scenario catalog; 18 self-tests; runtime audit | all named deterministic checks required; independent reviews join `CG-AG-12` separately | missing required result blocks; duplicate evidence IDs rejected rather than averaged | every required deterministic shard passes for the same reviewed source set | `BLOCKED`; current 331-scenario checks pass, but accepted transport/reviews bind 326 | repair WL-11/MQ-11 and rerun the fixed-point reviews |
| `CG-BATCH-02` | legacy `AG-05` | `HX-031` attempts `1/2` and `2/2` | current active target after materialization | source digests `615f9830...` and `99ad436b...`; current source restored to `615f9830...` | target `gpt-5.6-sol`; outcome and trajectory judges required only after eligibility | one bounded canary before any expansion | target/evaluate/judge required; authored/deterministic inputs insufficient | missing or duplicate required result blocks | all required current evidence passes under one newly authorized contract | `BLOCKED`; both target attempts failed, judges `NOT_RUN`, attempt budget exhausted | plan-change/user escalation, contract repair, and explicit authority for a new bounded attempt |
| `CG-BATCH-03` | `CG-AG-13`, `CG-AG-14`; accepted `CG-MQ-13`, `CG-MQ-14` | `bd8104ac...`; `36a067c5...` | active-root HEAD `a14a9bc...`; materialized pathset SHA-256 `cca69b3d...`; new pre-acceptance review digest pending | plan 6, graph 3, current skills/runner/catalog/schema | local Python validators and deterministic runner | workflow pack plus six selectors; structural validator; catalog 40/331; self-test 19; runtime audit; Python compile; diff hygiene | all shards required; matching Standards/Spec reviews join `CG-AG-15` separately | missing or duplicate required result blocks; stale 326 evidence excluded | every required deterministic shard passes for the same fixed point | `PASS`; rerun after `CG-RP-04`, final review join pending | repair earliest responsible WL-13/WL-14 or WL-12 projection and affected queue only |
| `CG-BATCH-04` | accepted `CG-AG-15` | one replacement HX-031 attempt `3/3` | exact accepted revision-6 active fixed point | current catalog/source manifest, response schema, profiles, rubrics, target/judge models | authorized target plus independent outcome/trajectory judges | exactly one target; judges only after eligibility; current coverage row | all three results required | duplicate run/evidence rejected; failed eligibility prevents judge launch | target eligible and both required judges accepted | `BLOCKED` pending CG-AG-15 | failure blocks revision 6; no fourth target attempt |

## Integrated Active-Worktree Validation

| Validation ID | Subject / Combined State | Graph Revision | Target HEAD / Diff Fingerprint | Required Checks / Evaluations | Evidence | Result | Invalidation Rule | Repair Route |
|---|---|---:|---|---|---|---|---|---|
| `CG-IV-01` | materialized WL-07 through WL-11 plus WL-10 cutover | 2 | active-root HEAD `a14a9bc...`; payload SHA-256 `e48e6c5162374c3913207ea1166bbbe8580d75332ef9ffc339609c4d8f6f4091`; fresh pre-acceptance review digest required | full workflow pack/selectors; Cascade validator; catalog check; self-test; runtime audit; diff hygiene; topology/cutover/materialization/batch authored scenarios | `CG-MR-ROOT-R5-COMBINED`, WL-11 receipt, integrated command output | `BLOCKED`; deterministic checks pass for 331 scenarios, but transport/fixed-point evidence binds 326 | any transport, graph, target dirty set, payload, fixed-point digest, check definition, or review binding change outside the bounded recording exception | repair WL-11/MQ-11, then rerun batch/integration and independent reviews |
| `CG-IV-02` | accepted preserved work plus materialized WL-13/WL-14 repairs | 3 | active-root HEAD `a14a9bc...`; pathset SHA-256 `cca69b3d...`; final reviewed digest `5c1fe931...` | `CG-BATCH-03`; `CG-MR-ROOT-R6-REPAIRS`; matching Standards/Spec reviews | root materialization receipt, deterministic output, independent reviews | `BLOCKED`; required final Spec review failed at attempt `3/3` | any repair transport, graph, target dirty set, catalog, runner, digest, or review binding change | explicit authority/amendment before another bounded review cycle |

## Reconciliation And Dispositions

| Workline / Record | Current Authority / Evidence | Duplicate / Drift Comparison | Inbound Consumers | Disposition | Canonical Survivor / Migration | Retention / Active-Row Route | Status |
|---|---|---|---|---|---|---|---|
| W-003 lane/plan | plan revision 6; embedded graph revision 4 frozen | outcome/criteria remain necessary; cross-workline state belongs only here | all W-003 worklines, packet, active row | `UPDATE` | plan revision 6; cross-workline references resolve to current `CG-001@3` | preserve full plan and revision history | current after `CG-AM-03`; projection repair in WL-12 attempt 3 |
| embedded W-003 graph | revision-4 final amendment plus retained gate/evidence history | duplicates this graph authority if left active | context, packet, active row, closeout | `SUPERSEDE_BY` | current `CG-001@3`; initial handoff was to revision 1 | retain frozen revision-4 graph and all receipts | superseded on accepted handoff |
| `WL-01` through `WL-04` | accepted legacy gates and receipts | distinct completed outcomes, not duplicates of revision-5 work | legacy and new validation context | `KEEP` | remain historical accepted worklines | retain packets, branches, gates, evidence | accepted historical inputs; no retro-acceptance of new gates |
| `WL-05 / AG-05` | authored/deterministic evidence plus two failed target attempts and judges `NOT_RUN` | historical inputs to replacement attempt, not current terminal authority | `CG-AG-16`, `CG-TG-03` | `UPDATE` | `WL-05` replacement attempt `3/3` under `CG-AG-16` | preserve both failed traces and all partial evidence | pending accepted `CG-AG-15`; one replacement attempt authorized |
| `WL-06` | retained `R-06A`/`R-06B`; legacy `AG-06 OPEN` | old integration/closeout scope is replaced by materialization-aware WL-12 | old `TG-01`; public docs | `SUPERSEDE_BY` | `WL-12`; migrate only current public-doc outputs and residual risks | preserve worker branch, receipts, failed reviews, and report | superseded; never retro-accepted |
| `WL-07` | accepted transport `4c6b3041...` | distinct semantic/schema owner | WL-08, WL-09, graph consumers | `KEEP` | `WL-07` | retain transport and evidence | canonical current workline |
| `WL-08` | accepted source `494649b...` / repair `6c073ba` | distinct reconciliation owner | WL-10, WL-11 | `KEEP` | `WL-08` | retain source and repaired dependent transport identities | canonical current workline |
| `WL-09` | accepted source `6ff0966...` / repair `d6763d7` | distinct execution-mechanics owner | WL-10, WL-11 | `KEEP` | `WL-09` | retain source and repaired dependent transport identities | canonical current workline |
| `WL-10` | accepted direct-cutover transport `1539836...` | distinct migration owner | WL-12, active registry, reports | `KEEP` | `WL-10` | retain immutable receipt and reconciliation report | accepted/materialized |
| `WL-11` | historical validation transport `0772244...`; current catalog repair is `WL-14` | distinct retained validator/harness history | historical `CG-BATCH-01`; current WL-14 inputs | `KEEP` | `WL-11` historical plus current `WL-14` repair | retain authored/deterministic receipt without live-effectiveness claim | historical gate blocked; repaired current transport accepted in WL-14 |
| `WL-12` | root revision-6 integration workline | distinct materialization/batch/terminal owner | `CG-AG-15`, `CG-TG-03` | `KEEP` | `WL-12` | root retains graph and materialization receipts | review attempt `3/3`; projection repair before fresh reviews |
| `WL-13` | accepted route-boundary transport `bd8104ac...` | distinct repair producer | `CG-AG-15` through `CG-MQ-13` | `KEEP` | `WL-13` | retain immutable transport and independent review | accepted/materialized |
| `WL-14` | accepted runner/catalog transport `36a067c5...` | distinct repair producer | `CG-AG-15` through `CG-MQ-14` | `KEEP` | `WL-14` | retain exact source-byte and transport evidence | accepted/materialized |
| legacy merge queue | revision-4 packet and merge lineage | terminology and target operation are stale; historical lineage remains useful | legacy workline gates and `JG-CORE` | `SUPERSEDE_BY` | `CG-001` Materialization Queue | retain legacy queue as frozen history | active use prohibited after cutover |
| W-003 active row | `docs/work/active.md` current projection | revision-4/5 projections retained only in history | context and operators | `UPDATE` | reference current `CG-001@3` | keep one W-003 row; no retirement until terminal closeout | updated by `CG-AM-03` and revision-6 repair transitions |
| revision-4 report | `2026-07-22-graph-shaped-workflow-mechanics.md` | accurate historical outcome; not current graph authority | audit and handoff readers | `KEEP` | retain unchanged | add revision-5 reconciliation report separately | historical only |

No true duplicate workline was found, so `MERGE_INTO` is unused. No completed
active row qualifies for `RETIRE_ACTIVE_ROW`, and no unresolved identity or
ownership requires `BLOCKED_REVIEW`. The canonical survivor set is therefore
W-003 plus `WL-01` through `WL-05` and `WL-07` through `WL-14`, with `WL-06`
retained only as a superseded historical workline.

## Transition And Repair History

| Transition ID / Time | Subject | Prior -> Next | Recorded By | Preconditions | Receipt / Evidence | Invalidation | Failure / Resume Route |
|---|---|---|---|---|---|---|---|
| `CG-TR-01 / 2026-07-23` | authority | embedded W-003 graph revision 4 -> `CG-001@1` | root `agent-engineer` | complete atomic cutover set and accepted `OH-W003-CG001-01` | reconciliation ledger and WL-10 transport | partial application or owner/revision change | block graph mutation until root restores one complete authority |
| `CG-TR-02 / 2026-07-23` | `WL-07..09` | `REVIEW -> ACCEPTED` | root `agent-engineer` | accepted producer SHAs and evidence | `CG-EV-07-TRANSPORT`, `CG-EV-08-TRANSPORT`, `CG-EV-09-TRANSPORT` | transport/source/review change | reopen affected producer and consumers |
| `CG-TR-03 / 2026-07-23` | `WL-10` | `PENDING -> IN_PROGRESS` | root `agent-engineer` | `CG-AG-08`, `CG-AG-09` accepted and repaired transports present at `d6763d7` | dispatch `CG-D-10` | producer drift or scope conflict | return to `PENDING`; recompute readiness |
| `CG-BR-01 / 2026-07-23` | legacy `AG-05` | `NO_STATE_CHANGE`; blocker reaffirmed while state remains `BLOCKED` | root `agent-engineer` | no model-spend authority and required evidence absent | `CG-EV-05-CANARY` | actual authorized current evidence | keep terminal blocked; resume through W-002 evaluator route |
| `CG-TR-05 / 2026-07-23` | `WL-10 / CG-AG-10` | `REVIEW -> ACCEPTED` | root `agent-engineer` | immutable transport `1539836...`, scope/cutover checks, root review | `CG-WR-10` | owned artifact, producer, or transport change | reopen WL-10 and affected cutover/materialization only |
| `CG-TR-06 / 2026-07-23` | `WL-11 / CG-AG-11` | `REVIEW -> ACCEPTED` | root `agent-engineer` | immutable transport `0772244...`, validator/catalog/audit/self-test evidence | `CG-WR-11` | source/test/validator or transport change | reopen WL-11 and affected queue/batch only |
| `CG-TR-07 / 2026-07-23` | `CG-MQ-07..11 / WL-12` | `QUEUED -> APPLYING -> APPLIED -> VALIDATING -> ACCEPTED`; `WL-12 -> REVIEW` | root `agent-engineer` | accepted gates/transports, no unexplained overlap, unchanged target HEAD, integrated deterministic passes | `CG-MR-ROOT-R5-COMBINED`, `CG-BATCH-01`, `CG-IV-01` | target/transport/payload/check drift | requeue only affected materialization and downstream batch/review |
| `CG-TR-08 / 2026-07-23` | `WL-12 / CG-AG-12` | `REVIEW -> ACCEPTED`; `OPEN -> ACCEPTED` | root `agent-engineer` | matching required PASS reviews at fixed-point digest `59bcfe5b...` | `EV-CG-AG12-STANDARDS-59BCFE5B-R2`, `CG-EV-AG12-SPEC-59BCFE5` | any change outside their authorized bounded recording mutation | reopen WL-12 and affected integrated/terminal consumers only |
| `CG-TR-09 / 2026-07-23` | `WL-05 / AG-05 / CG-BATCH-02` | `BLOCKED -> BLOCKED`; attempt `0/2 -> 2/2` exhausted | root `agent-engineer` | explicit bounded spend authority; eligibility precedes judges | `CG-EV-05-TARGET-A1`, `CG-EV-05-TARGET-A2` | a newly approved contract/attempt supersedes only the failed candidate, not its history | plan-change/user escalation; no third unchanged attempt |
| `CG-TR-10 / 2026-07-23` | `WL-11 / CG-AG-11 / CG-MQ-11 / WL-12 / CG-AG-12` | accepted projections -> `BLOCKED` | root `agent-engineer` | current catalog 331 differs from reviewed 326 and accepted transport lacks `HX-047..051` | current catalog digest `6301b59f...`; diff against transport `0772244f...` | reviewed repair transport plus new fixed-point evidence | preserve CG-AG-07..10 and MQ-07..10; repair only WL-11 and downstream joins |
| `CG-TR-11 / 2026-07-23` | `WL-13`, `WL-14` | `READY -> IN_PROGRESS` | root `agent-engineer` | `CG-AM-03` accepted; bound worktrees clean at exact bases; disjoint write scopes; implementation and one replacement canary authorized | `CG-D-13`, `CG-D-14` | base, scope, input, worktree, or graph revision drift | stop affected worker; return only that workline to `PENDING` for readiness recalculation |
| `CG-TR-12 / 2026-07-23` | `WL-13`, `WL-14`, `CG-AG-13`, `CG-AG-14`, `CG-MQ-13`, `CG-MQ-14`, `WL-12` | producer `REVIEW -> ACCEPTED`; gates `OPEN -> ACCEPTED`; queues through `QUEUED -> APPLYING -> APPLIED -> VALIDATING -> ACCEPTED`; WL-12 `PENDING -> REVIEW` | root `agent-engineer` | immutable transports and independent producer reviews pass; root preflight preserves dirty state; materialized paths bind exact transport or reviewed overlap adaptation; deterministic batch passes | `CG-WR-13`, `CG-WR-14`, `CG-EV-AG13-REVIEW-BD8104A`, `CG-EV-AG14-REVIEW-36A067C`, `CG-MR-ROOT-R6-REPAIRS`, `CG-BATCH-03` | transport, source bytes, materialized pathset, graph revision, deterministic shard, or final review drift | reopen earliest affected WL-13/WL-14 and only its queue plus downstream batch/review |
| `CG-TR-13 / 2026-07-23` | `WL-12 / CG-AG-15 / CG-IV-02` | `NO_STATE_CHANGE`; WL-12 remains `REVIEW`, gate remains `OPEN`, integrated result remains `BLOCKED`; attempt `2/3 -> 3/3` | root `agent-engineer` | matching digest `b1c48673...` received required Standards and Spec `FAIL` receipts | `EV-CG-AG15-STANDARDS-B1C48673-R3`, `CG-EV-AG15-SPEC-B1C4867`, `CG-RP-04` | any further implementation/projection change consumes the final attempt and requires new authority if reviews fail | repair only named projection/ledger/receipt/terminology findings, rerun deterministic batch, compute one new digest, obtain final reviews |
| `CG-TR-14 / 2026-07-23` | `WL-12 / CG-AG-15 / CG-IV-02 / WL-05` | WL-12 `REVIEW -> BLOCKED`; CG-AG-15 `OPEN -> BLOCKED`; IV-02 remains `BLOCKED`; WL-05 `PENDING -> BLOCKED`; attempt `3/3` exhausted | root `agent-engineer` | required Spec review failed at digest `5c1fe931...`; Standards reviewer independently reported blocking defects; no acceptance authorization | `CG-EV-AG15-SPEC-5C1FE93`, `CG-RP-05` | explicit plan/graph amendment or user-authorized extra bounded attempt | preserve accepted producers/materializations; do not run canary; resume only after new authority |

| Repair ID / Time | Failure Class / Cause | Failed Evidence / Input | Earliest Responsible Workline | Reopened Worklines / Gates / Queue / Batches | Preserved Accepted IDs | Versions / Attempts / Revisions | Resume Route |
|---|---|---|---|---|---|---|---|
| `CG-RP-01 / historical` | revision-4 compatibility failure | `JG-CORE` attempt-1 reviews | responsible subset of `WL-02..04` | legacy producers and join only | `DG-00`, `WL-01`, unrelated outputs | plan 4 / graph 3 / attempt 1 | completed by accepted attempt 2 at `ce737f2` |
| `CG-RP-02 / 2026-07-23` | target route and supporting-route failures | `CG-EV-05-TARGET-A1`, `CG-EV-05-TARGET-A2` | `WL-05` plus owning route/output contracts | legacy `AG-05`, `CG-BATCH-02`, `CG-TG-02` | all unrelated accepted producer work | plan 5 / graph 2 / attempts `1/2`, `2/2` exhausted | explicit replan and authority; materialize reviewed repairs before a newly bounded canary |
| `CG-RP-03 / 2026-07-23` | catalog/transport freshness drift | current 331 scenarios versus accepted 326-scenario WL-11 transport/reviews | `WL-11` | `CG-AG-11`, `CG-MQ-11`, `CG-BATCH-01`, `CG-IV-01`, `WL-12`, `CG-AG-12`, `CG-TG-02` | `CG-AG-07..10`, `CG-MQ-07..10`, legacy accepted work | plan 5 / graph 2 / catalog `6301b59f...` | create reviewed WL-11 repair transport, rematerialize MQ-11, rerun fixed-point validation/reviews |
| `CG-RP-04 / 2026-07-23` | fixed-point projection/definition evidence failure | attempt-2 Standards/Spec receipts at `b1c48673...` | `WL-12` projection and evidence records | `CG-BATCH-03`, `CG-IV-02`, `CG-AG-15`; no producer or queue gate reopened | `CG-AG-07..10`, `CG-AG-13/14`, `CG-MQ-07..10`, `CG-MQ-13/14`, both repair transports | plan 6 / graph 3 / WL-12 attempt `3/3` | repair current authority/resume clauses, add fragment composition ledger, enumerate materialization evidence, normalize `assurance-overlay`, rerun and re-review |
| `CG-RP-05 / 2026-07-23` | final fixed-point review failure / exhausted retry | `CG-EV-AG15-SPEC-5C1FE93`; Standards blocking report | `WL-12` current projections and selected `GF-004@1` resolution | `WL-12`, `CG-AG-15`, `CG-IV-02`, `WL-05`, `CG-AG-16`, `CG-TG-03` | `CG-AG-07..10`, `CG-AG-13/14`, `CG-MQ-07..10`, `CG-MQ-13/14`, `CG-BATCH-03`, both repair transports/materialization | plan 6 / graph 3 / attempt `3/3` exhausted | explicit authority or amendment; then repair stale TG/topology/preserved projections, canonical dispositions, GF-004 architecture-review/evaluator binding, GF-008 actor resolution, and exact test command/environment bindings |

## Amendment And Ownership-Handoff History

| Amendment ID / Time | Prior -> Next Graph Revision | Reason | Changed Worklines / Edges / Owners / Gates / Materialization | Stable New / Replacement IDs | Preserved / Invalidated Evidence | Affected Consumers | Recomputed Frontier |
|---|---|---|---|---|---|---|---|
| `CG-AM-01 / 2026-07-23` | embedded graph 3 -> final embedded graph 4; new `CG-001@1` | first-class Coordination Graph and no-commit materialization replace embedded cross-workline graph/merge control | adds WL-07..12, new gates/edges/materialization/batches, same sole root owner | `CG-001`, `CG-AG-07..12`, `CG-MQ-07..11`, `CG-BATCH-01..02`, `CG-IV-01`, `CG-TG-02` | revision-4 evidence retained; old frontier/queue/terminal reviews historical only | all W-003 coordination consumers | WL-07..11 and materializations accepted; WL-12 in review; AG-05 remains blocked |
| `CG-AM-02 / 2026-07-23` | `CG-001@1 -> CG-001@2` | failed fixed-point reviews exposed stale projections and a self-invalidating review-receipt model | topology, owners, worklines, transports, and queue items unchanged; adds pre-acceptance fixed-point review closure and repairs derived projections | keeps all stable IDs; adds `CG-BR-01` classification and bounded receipt-recording exception | producer/workline/materialization acceptance preserved; prior `CG-BATCH-01`, `CG-IV-01`, and failed review receipts retained but invalidated for acceptance; deterministic batch/integration and both reviews must rerun | CG-001, W-003/packet/index/active/report projections, WL-12 review | WL-12 review after revision-2 deterministic rerun; AG-05 remains blocked |
| `CG-AM-03 / 2026-07-23` | `CG-001@2 -> CG-001@3`; W-003 plan 5 -> 6 | user authorized implementation after two exhausted target failures and a stale 326-to-331 catalog binding | adds parallel repair WL-13/WL-14, replacement gates CG-AG-13..16, MQ-13/14, batches 03/04, IV-02, and terminal CG-TG-03; owner unchanged | old gates, queues, batches, terminal, traces, and reviews retained as historical; CG-AG-07..10 and MQ-07..10 preserved | WL-05, WL-12, route/harness consumers, active projection | WL-13 and WL-14 READY in bound worktrees; all downstream revision-6 subjects pending |

| Handoff ID | Prior Owner | Incoming Owner | Prior -> New Revision | Mutation-Blocked Window | Accepted Record / Evidence | Status | Resume / Invalidation Rule |
|---|---|---|---|---|---|---|---|
| `OH-W003-CG001-01` | root `agent-engineer` writing W-003 embedded graph | root `agent-engineer` writing `CG-001` | embedded graph 4 -> `CG-001@1` | from creation of any cutover artifact until the complete atomic file set is present | `CG-CO-01`, reconciliation ledger/report, W-003 supersession, packet/active projections | `ACCEPTED` | partial application, graph revision change, or owner change blocks mutation and requires explicit new handoff/amendment |

## Current Frontier (Derived)

- Coordination Graph / Plan revision: `CG-001@3 / W-003 plan 6`.
- Ready worklines: none.
- In progress / review: none; `WL-12` attempt `3/3` is exhausted and blocked.
- Accepted workline gates: preserved `CG-DG-01`, `CG-AG-07` through
  `CG-AG-10`, plus repair gates `CG-AG-13` and `CG-AG-14`.
- Materialization queue: `CG-MQ-07` through `CG-MQ-10`, `CG-MQ-13`, and
  `CG-MQ-14` are `ACCEPTED`; historical `CG-MQ-11` remains `BLOCKED`.
- Revision-1 deterministic joins were invalidated by `CG-AM-02`; revision-2
  326-scenario reviews are stale against the current 331-scenario catalog.
- Blocked revision-6 gates: `CG-AG-15`, `CG-AG-16`, and `CG-TG-03`.
- Historical blocked evidence: `CG-AG-11`, `CG-MQ-11`, `CG-BATCH-01`,
  `CG-IV-01`, `CG-AG-12`, legacy `AG-05`, `CG-BATCH-02`, and `CG-TG-02`.
- Preserved accepted work: legacy `DG-00`, `AG-01` through `AG-04`,
  `JG-CORE`; current `CG-AG-07` through `CG-AG-10`.
- Next action: obtain explicit authority or a plan/graph amendment for one
  additional bounded WL-12 repair/review cycle; do not run the canary.
- Projection reconciliation: rebuilt from the accepted cutover, canonical
  workline registry, gate table, queue, and evidence records above.

## Terminal Gate

| Gate | Required Workline Gates | Required Materialization Gates | Required Batch / Integrated Evidence | Residual Risk Owner | Acceptance Rule | State | Reopen Route |
|---|---|---|---|---|---|---|---|
| `CG-TG-02` | historical graph-revision-2 inputs | historical MQ-07..11 receipts | historical batches 01/02, IV-01, reviews | root `agent-engineer` | retained only to explain exhausted/stale evidence | `SUPERSEDED` by `CG-TG-03`; never accepted | no resume; use revision-6 replacement gates |
| `CG-TG-03` | preserved `CG-AG-07..10`; replacement `CG-AG-13..16` | accepted `CG-MQ-07..10`, `CG-MQ-13`, `CG-MQ-14` | `CG-BATCH-03`, `CG-BATCH-04`, `CG-IV-02`, matching revision-3 Standards/Spec reviews | root `agent-engineer` | every required current input passes for graph revision 3, exact transports, one target HEAD/fixed-point binding, and no required `FAIL`, `BLOCKED`, `GAP`, or `NOT_RUN` | `BLOCKED`; `CG-AG-15` failed final review and `CG-AG-16` did not run | explicit authority/amendment for bounded WL-12 repair; unrelated accepted work stays accepted |

## Validation And Retention

| Check | Command Or Evidence | Status |
|---|---|---|
| topology and unique IDs | focused edge/ID audit plus WL-11 validator | `PASS`; unchanged by graph revision 2 |
| source/gate/evidence bindings | accepted producer identities and worker receipts | `PASS`; exact immutable transports and dependent presence proofs retained |
| active-worktree overlap and materialization | current `CG-MR-ROOT-R6-REPAIRS`; historical `CG-MR-ROOT-R5-COMBINED` retained | `PASS`; eight current repair paths enumerated, preserved dirty inventory bound, unchanged HEAD, cached diff empty |
| batch and integrated acceptance | historical `CG-BATCH-01..02`/`CG-IV-01`; current `CG-BATCH-03`/`CG-IV-02` | current rerun passes at 40 skills, 331 scenarios, and 19 self-tests; final fixed-point reviews pending |
| direct-cutover and projection reconciliation | `OH-W003-CG001-01`, W-003/packet/active/report diff | `PASS`; one indexed cross-workline authority remains |

- Durable graph path and revision retained: this file, current `CG-001@3`;
  revisions 1 and 2 remain historical.
- Reports and evidence retained: revision-4 W-003 packet/report/receipts plus
  `2026-07-23-w003-coordination-graph-reconciliation.md` and
  `2026-07-23-w003-terminal-canary-blocker.md`.
- Active-row retirement route: none; W-003 remains active and blocked.
- Commit/push/publication authority: not granted by this graph. Worker commits
  are immutable transports only; active-root materialization must not commit.
- Remaining risk and next gate: final review attempt `3/3` failed. Obtain
  explicit authority or amend the plan/graph before repairing and reviewing
  `CG-AG-15`; the canary remains prohibited.
