# WG-001 N04 And N05 Implementation

Date: 2026-07-30; repaired 2026-07-31; historical reconciliation 2026-08-06
Status: `HISTORICAL_SUPERSEDED_EVIDENCE`
Work Graph: `WG-001`
Plan Revision: `14`
Nodes: `WG-001-N04`, `WG-001-N05`
Execution Receipts: `WG001-N04-EXEC-20260730-A1`,
`WG001-N05-EXEC-20260730-A1`,
`WG001-N04-REPAIR-EXEC-20260731-A2`, and
`WG001-N05-REPAIR-EXEC-20260731-A2`
Runtime: root task `019fb3c2-bd84-7282-9df0-5477a8321233`

## Outcome

This report preserves the original N04/N05 implementation and repair evidence.
Its `REVIEW` state is historical: later fixed-point receipts in the W-004 lane
and authoritative WG-001 report accepted N04 and N05. Use those current owners
for live state; retain the attempts and failures below as source-bound history.

N04 now owns:

- atomic same-ID run reservation with a structured role/session identity
  envelope, lease, attempt, parent-run, and recovery authority;
- exclusive governed stage writes, content-addressed bounded evidence freezing,
  symlink and secret-like material rejection, atomic terminal finalization, and
  manifest verification;
- the public `campaign verify <run-id>` command and versioned run-artifact
  schema.
- platform-bound source manifests, frozen artifact records, task results, and
  execution receipts.

N05 now owns:

- versioned, campaign/task/kind/driver/action/path-scoped policy definitions;
- a pure one-applicable-policy resolver with default deny and ambiguity
  blocking;
- action/output budgets, named redaction controls, exact expiring confirmation
  receipts, and policy/action/confirmation digests;
- explicit policy-decision digests in task results and execution receipts.
- generated-package validation that rejects a referenced policy whose exact
  campaign/task/kind/driver/action/path or command-prefix scope cannot apply
  before provisioning.

The scenario-building repair also binds the starter policy to its generated
`<simulation-id>-smoke` campaign and expands the generated design/checklist
with reservation, lease, recovery, role-session separation, confirmation,
budget, redaction, platform, terminal verification, and retry-parentage
prompts. It does not implement the N08 multi-scenario portfolio.

## Current Source Identity

- Base: `master@21ba5288b27700f94ecad92ec0cf3d1e5dca5f29`.
- Accepted predecessor:
  `a964ee6a736727b13a7e25fef18fc87f13a8128b119f8863a42de2c620e71491`.
- N04/N05 current implementation fixed-point digest:
  `0ccb25a3eb88d58289d47e920d5924e78390dd11b69e20b354c4ce53d069d940`.
- Generated campaign catalog digest:
  `9fee3f183d458f56ff7f5d59eee7fbea9d45531b2a9cb2533d1a18bde8fce6ba`.

## Functional Evidence

| Gate | Result | Evidence |
|---|---|---|
| N04/N05 plus starter focused suites | `PASS` | 52 tests across artifact, policy, campaign, definition, common, and starter contracts |
| Aggregate Cascade tests | `PASS` | 62 tests across 8 files |
| Generated starter journey | `PASS` | 19 collision-free paths; generated policy campaign scope equals `scenario-gap-proof-smoke`; mismatched referenced policy is rejected before execution |
| Deterministic campaign run | `PASS` | `.artifacts/campaigns/wg001-frontier-repair-20260731-r1`; attempt 2, parent `wg001-frontier-20260730-r2`, platform `darwin-local`, fixture evaluation pass, framework calibration only, `release_eligible=false` |
| Artifact verification | `PASS` | 72 files; manifest digest `2c74f0b81c009cdee51743e873dc802a5bfa72e5ba55814955c025b891fd3960` |
| Cascade validator | `PASS` | 9 agents, 44 skills, zero project-specific leakage |
| Harness catalog/self-test | `PASS` | 44 skills, 368 scenarios, 20 self-test cases |
| Target self-test | `PASS` | 26 cases |
| Campaign catalog/self-test | `PASS` | 7 campaigns; current catalog digest; framework calibration fixture passes |

The deterministic campaign is local framework evidence. It is not target
release, live provider, Computer Use, desktop, mobile, or model-effectiveness
evidence.

## Review And Remaining Gates

- The bullets that originally recorded local review and missing independent
  receipts described this report's 2026-07-30 fixed point only.
- Later fixed-point receipts accepted both N04 and N05. Their current state is
  `ACCEPTED` in the W-004 lane and authoritative WG-001 revision 13 report.
- This report does not project the active N06 repair, Gate A, surface, live, or
  release frontier; consult WG-001 revision 13 for those current states.

## Resume Contract

Historical only: the original resume route required independent GF-004 and
GF-101 review against this report's fixed-point digest. That route completed in
later accepted receipts and must not be restarted from this stale source
identity. Any new invalidation or repair follows the current W-004 lane and
WG-001 revision 13.

## Attempt 2 Receipt And Closeout

| Binding | Value |
|---|---|
| Receipt IDs | `WG001-N04-REPAIR-EXEC-20260731-A2`; `WG001-N05-REPAIR-EXEC-20260731-A2`; `WG001-N04-N05-REPAIR-VALIDATE-20260731-A2`; `WG001-N04-N05-REPAIR-REVIEW-20260731-A2` |
| Subject and gate | WG-001-N04 artifact/platform seam and WG-001-N05 policy/starter seam; independent GF-004/GF-101 acceptance gates |
| Plan / Work Graph | revision 13 / revision 11 |
| Attempt and route | attempt 2 of 2; `REVIEW -> PENDING -> READY -> IN_PROGRESS -> REVIEW` |
| Comparison base / target HEAD | `master@21ba5288b27700f94ecad92ec0cf3d1e5dca5f29` / unchanged uncommitted target HEAD |
| Reviewed source-set digest | `0ccb25a3eb88d58289d47e920d5924e78390dd11b69e20b354c4ce53d069d940` |
| Producer | root task `019fb3c2-bd84-7282-9df0-5477a8321233`; W-004 implementation authority |
| Produced at | `2026-07-30T21:40:22Z` |
| Permissions and environment | local filesystem and exact Bun 1.3.3; no live provider, Computer Use, deployment, publication, or spending |
| Outputs | policy applicability preflight; exact starter policy/campaign binding; platform-bound frozen/source/task/execution evidence; enriched scenario design and checklist; regenerated catalog |
| Validation | 52 focused and 62 aggregate tests; Cascade, campaign, harness, target, JSON, and diff gates; immutable deterministic run and manifest verification |
| Local review | Standards `PASS`; Spec `PASS`; findings only and not independent acceptance evidence |
| Protected work | N06 through N08, Gate A, surface lanes, SIM-020 through SIM-024 portfolio, unrelated dirty paths, historical runs, and current branch history remain unchanged |
| Invalidation | source-set digest, base, policy/starter binding, platform evidence contract, plan/graph revision, or producer/consumer binding change |
| Next action | independent GF-004/GF-101 review; accept only on current bound receipts, otherwise replan because attempt 2 is exhausted |

Doc routing: durable scenario-building rules were updated in the existing
`simulation-campaigns` skill, template, and checklist; execution state was
synchronized in the existing W-004 lane, WG-001 report, active registry, and
program report. No product, design, brand, glossary, stack, or new spec artifact
was required.

Archive disposition: `NOT_APPLICABLE`; W-004 and WG-001 remain active. Commit,
staging, push, publication, and deployment are `NOT_REQUESTED`.

## Attempt 2 Independent Review And Plan-Revision-14 Route

Independent GF-004 receipts
`WG001-N04-GF004-REVIEW-20260731-A2` and
`WG001-N05-GF004-REVIEW-20260731-A2`, plus independent GF-101 receipts
`WG001-N04-GF101-REVIEW-20260731-A2` and
`WG001-N05-GF101-REVIEW-20260731-A2`, are required `FAIL`. They bind the
23-path source-set digest
`34c4b495ab5e01d7c312e8e90e649295ea99ced22bac03e0f04a9f42f2dda065`.

The blocking set is lease/recovery fencing, sole artifact authority and atomic
terminal integrity, status-appropriate finalization, symlink/path/read bounds,
confirmation schema and cryptographic authority, campaign-wide budget
consumption, shared definition/runtime applicability, both advertised
redaction profiles, and streaming output bounds. Plan revision 14 extends only
N04/N05 to four attempts and opens attempt 3. No later node is accepted or
unblocked by this replan.

## Attempt 3 Review Failure And Attempt 4 Repair

- GF-004 receipt: `WG001-N04-N05-GF004-REVIEW-20260731-A3`, `FAIL`.
- GF-101 receipt: `WG001-N04-N05-GF101-REVIEW-20260731-A3`, `FAIL`.
- Reviewed source digest:
  `83094f89e10695a051fdc3c93095e2e945b8bc0304bc45fea86ed0e7f706aec0`.
- Plan revision 15 opens attempt 4 of 4 for only the exact blocking artifact,
  terminal-evidence, containment, policy-validation, secret-isolation,
  redaction, and catalog findings.
- N04/N05 remain `IN_PROGRESS`; no downstream acceptance or execution
  authority is inferred.

## Attempt 4 Independent Review And Blocked Disposition

- `WG001-N04-N05-GF004-REVIEW-20260731-A4`: `FAIL`.
- `WG001-N04-N05-GF101-REVIEW-20260731-A4`: `FAIL`.
- Source digest:
  `711d0ecf0881977d1fae9aa62371fe55a41c73c95f9bee15cdd681577c5c2876`.
- Passing evidence: 74 aggregate tests, catalog digest
  `25bc8484ea084b0ddc962d0d28b21fefd2be19dbf1b489cd4f9171cf11feae84`,
  and valid run `wg001-n04-n05-repair-20260731-r3`.
- Blocking evidence: unsafe stale-lock takeover, skeletal terminal receipts,
  missing producer identity enforcement, unbounded lifecycle/JSON I/O, and
  pre-task child environment inheritance.
- Attempt 4 of 4 is exhausted. N04/N05 are `BLOCKED`; N06 and later work remain
  unopened pending an explicit human replan decision.
