# WG-001 Next Frontier Preparation

Date: 2026-07-30
Status: `IMPLEMENTED_AWAITING_REVIEW`
Plan Revision: `12`
Work Graph Revision: `11`
Prepared Nodes: `WG-001-N04`, `WG-001-N05`
Dispatch State: `COMPLETE`
State Owner And Merge Owner: `W-004`

## Outcome

WG-001-N04 and WG-001-N05 were prepared as bounded implementation packets from
the accepted current-source WG-001-N03 state. The authorized implementation
has since completed; current evidence is recorded in
`docs/work/reports/2026-07-30-wg001-n04-n05-implementation.md`. Neither node is
accepted because independent GF-004/GF-101 review remains `NOT_RUN`.

N04 remains the first recommended dispatch because it establishes the atomic
artifact and identity boundary consumed by every later receipt. N05 is also
definition- and implementation-ready. Their graph dependencies remain
independent, but their implementations must not run concurrently because both
integrate through `scripts/cascade/campaigns.ts` and the generated campaign
catalog. W-004 is the single integration owner.

## Authority And Frozen Baseline

| Source | Version / identity | Use |
|---|---|---|
| Current repository | `master@21ba5288b27700f94ecad92ec0cf3d1e5dca5f29` | only implementation base |
| Accepted lifecycle seam | WG-001-N03 implementation digest `a964ee6a736727b13a7e25fef18fc87f13a8128b119f8863a42de2c620e71491` | preserve without reconstruction |
| Work graph | `WG-001`, plan revision 12, work-graph revision 11 | node identity, ordering, authority, and acceptance |
| Program contract | `docs/work/reports/2026-07-27-cross-surface-simulation-program.md` | artifact, identity, policy, safety, and run-package definitions |
| W-004 lane | `docs/work/lanes/W-004-cross-surface-simulation-foundation.md` | criteria, protected consumers, validation, and Gate A |
| Execution contract | `.codex/skills/simulation-execution/SKILL.md` and execution-quality checklist | reservation, lease, evidence, recovery, and finalization requirements |
| Campaign contract | `.codex/skills/simulation-campaigns/SKILL.md` and campaign-quality checklist | selection, safety, claim, and reporting requirements |

Relevant current-source fingerprints at preparation time:

| Path | SHA-256 |
|---|---|
| `scripts/cascade/campaigns.ts` | `2740b66f9df85e6273a5bac80d1cf77de00866e7bccb1274eca9181663cebf27` |
| `scripts/cascade/campaigns.test.ts` | `719bc7cbbe93ef1e107940dc8b66653be171595bd9e8c89ca4fc97386e9bc79f` |
| `scripts/cascade/common.ts` | `07aeded6a195591ba0b7fd3830118f7ba0f0401fd77f5b97b3aba2632415549a` |
| `scripts/cascade/simulation-definitions.ts` | `bc2e2c901e24b620fd91af20748ea9539e816082adf4d8d88827432224f767ec` |
| `product-evals/policies/schema.json` | `bdae369dadb190926c9bcc018e67ff4f6f449ddeaa24bfa045d9e66b9ccb8673` |
| `product-evals/campaigns/catalog.generated.json` | `6a9bde660a72b33a3bc5a819ca664addc78e2507cf910152d48b11c511d8adf6` |

Any unexplained change to a fingerprinted implementation input requires a
fresh overlap review before dispatch. The current dirty tree contains accepted
WG-001-N03 work and unrelated user-owned changes; it is not permission to
replace, reset, or import historical branch content.

## Current-Source Architecture Review

Scope: two story-sized, state-machine and shared-contract slices inside the
W-004 epic.

Dependency category: local filesystem and in-process policy evaluation. Tests
use temporary local directories and deterministic definitions; no remote or
true-external dependency is required.

Current scaffolding:

- `commandRun` rejects an existing run directory, creates a reservation, freezes
  sources, writes execution/evaluation/aggregation namespaces, and checks role
  strings for pairwise distinction.
- `writeJsonExclusive` and `writeJsonAtomic` exist as local filesystem
  primitives.
- fake and direct-process adapters already default-deny absent policy and
  record allow, deny, or confirmation decisions.
- campaign resolution already rejects unknown and overlapping referenced
  policies for the currently expressible action-type shape.

Missing invariants:

- reservation has no lease identity, attempt/retry lineage, recovery authority,
  or explicit terminal finalization record;
- identity is a set of strings rather than one role/session/source-bound
  envelope;
- several execution and summary files use overwrite-capable writes;
- source/evidence freezing does not define symlink, size, redaction,
  unredactable-secret, producer, or verification behavior;
- the artifact tree has no public verifier for namespace ownership, receipt
  digests, finalization, or post-write tampering;
- policy applicability is only action type, policy definitions have no explicit
  version/scope/budget/redaction contract, and decisions do not bind the
  observed input or policy digest;
- confirmation correctly blocks execution today, but no receipt contract can
  distinguish absent, stale, rejected, or accepted approval;
- direct-process output and frozen evidence have no policy-enforced size or
  redaction boundary.

Architecture decision:

- deepen two internal modules, `campaign-artifacts.ts` and
  `campaign-policies.ts`, rather than adding filesystem or policy adapter
  abstractions;
- retain `campaigns.ts` as orchestration and make it consume the two invariant
  owners;
- use direct schema cutover and update every tracked fixture/template in the
  same node; no compatibility shim or historical implementation fallback;
- keep N04 and N05 independently acceptable, then join them only through
  WG-001-N08 and Gate A;
- serialize edits through W-004 because their integration and generated
  catalog write scopes overlap.

## Secure Design Review

Status: `DONE_WITH_CONCERNS`; the concerns below are implementation acceptance
criteria, not claims of current certification.

Assets and data:

| Asset / data | Classification | Owner | Required retention behavior |
|---|---|---|---|
| source definitions and dirty-source identity | internal | W-004 | digest-bound and minimized |
| task output, traces, screenshots, documents, and evidence | potentially sensitive/untrusted | simulation operator | redacted or blocked before durable freezing |
| policy and approval decisions | security/audit | W-004 policy authority | append-only, exact-input and exact-policy bound |
| run, lease, role, session, recovery, and retry identity | security/audit | W-004 artifact authority | immutable through terminal finalization |
| live/provider credentials | credential | external runtime owner | never stored in campaign artifacts |

Trust and decision flow:

```text
untrusted task/model/provider output
  -> pre-resolved policy and budget evaluation
  -> allowed action execution or fail-closed stop
  -> redaction and artifact-safety classification
  -> content-addressed append-only freeze
  -> independent oracle/evaluation
  -> digest-chain verification and atomic finalization
```

| Severity | Finding | Required control | Owning node |
|---|---|---|---|
| P0 | Raw task output or evidence can be copied into durable artifacts without a redaction or unredactable-secret decision. | Bound size, reject unsafe file types/symlinks, apply a named redaction profile, and fail closed before freezing when safety cannot be proven. | N04 enforcement; N05 policy input |
| P1 | Action-type-only `ALLOW` can apply more broadly than the intended campaign, task, driver, or action observation. | Versioned declarative scope, exact applicability record, policy digest, one-applicable-policy rule, and default deny. | N05 |
| P1 | Reservation and identity strings do not establish lease ownership, role/session separation, retry lineage, or recovery authority. | One structured identity envelope, exclusive lease, explicit recovery identity, and no automatic target-action resume. | N04 |
| P1 | Overwrite-capable stage files and a mutable summary do not prove append-only namespace ownership or atomic terminal state. | Exclusive stage writes, atomic finalization record, terminal write lock, and verifier. | N04 |
| P1 | Confirmation has no exact approval receipt contract. | Bind approval to run/task/action index, observation digest, policy digest, approver identity, decision, and expiry; absent or stale approval remains blocked. | N05 |
| P1 | Output/action/token/cost limits are not represented consistently. | Typed budgets with preflight support checks and action-time counters; unsupported required budget dimensions block before execution. | N05 |

Security acceptance does not require live credentials, accounts, providers, or
Computer Use. Those remain separate later gates. No raw sensitive example may
be added to fixtures or reports.

## Graph Fragment Composition

Emission remains the existing W-004 lane-local work graph. No new lane or
Coordination Graph is needed.

| Fragment | Disposition | Reason / port binding |
|---|---|---|
| `GF-001` product definition | `NOT_APPLICABLE` | existing program and W-004 criteria already own accepted behavior; no new product decision |
| `GF-002` design experience | `NOT_APPLICABLE` | no UI or interaction design |
| `GF-003` prototype/mockup | `NOT_APPLICABLE` | no prototype |
| `GF-004` shared contract v1 | `SELECTED` | N04 produces artifact/identity contract; N05 produces policy-decision contract; independent architecture review required |
| `GF-005` backend service | `NOT_APPLICABLE` | no server, database, queue, or remote service |
| `GF-006` frontend client | `NOT_APPLICABLE` | no frontend |
| `GF-007` data migration | `NOT_APPLICABLE` | direct schema cutover updates current fixtures/templates; no persisted-data migration |
| `GF-008` integration wiring | `MERGED` into `GF-004` | each module integrates into the same local campaign runner under W-004; WG-001-N08 owns their later combined gate |
| `GF-009` end-to-end | `NOT_APPLICABLE` to preparation | focused public CLI/artifact functional checks prove these internal slices; cross-contour E2E remains N08 |
| `GF-101` security assurance v1 | `SELECTED` | identity, permissions, secrets, untrusted files/output, and external-action policy are affected |
| `GF-102` accessibility assurance | `NOT_APPLICABLE` | no UI |
| `GF-103` visual assurance | `NOT_APPLICABLE` | no rendered output |

Resolved roles and skill route:

- implementation owner: `agent-engineer` through W-004;
- implementation route after authorization:
  `context -> architecture-review -> secure-design -> plan-change ->
  functional-qa where the CLI/artifact boundary is exercised ->
  implement-change -> review-change -> validate-change -> closeout`;
- GF-004 acceptance: independent architecture/contract review;
- GF-101 acceptance: independent security review plus risk-selected local
  probes;
- no role, worker, or reviewer is dispatched by this preparation.

## WG-001-N04 Implementation Packet

Preparation receipt: `WG001-N04-PREP-20260730-R12`

| Field | Prepared value |
|---|---|
| Objective | atomic run/lease reservation, structured identity, safe append-only artifact namespaces, explicit recovery/finalization, and artifact verification |
| State | `REVIEW`; implementation receipt `WG001-N04-EXEC-20260730-A1`; independent review `NOT_RUN` |
| Preferred surface | `root` |
| Attempt | implementation attempt 1 of 2 completed |
| Requires nodes | accepted `WG-001-N02`; accepted WG-001-N03 is a protected current-source input |
| External conditions | exact Bun 1.3.3; current fingerprints; no unexplained overlap in allowed writes |
| Output receipt | `WG001-N04-EXEC-20260730-A1`; independent GF-004/GF-101 review receipts pending |
| Acceptance owner | W-004 after independent architecture and security review |
| Repair | return to `PENDING`, preserve failed artifacts, repair earliest failed invariant |
| Exhaustion | after attempt 2, `BLOCKED` pending `plan-change`; no unchanged retry |

Allowed implementation writes:

- add `scripts/cascade/campaign-artifacts.ts`;
- add `scripts/cascade/campaign-artifacts.test.ts`;
- update `scripts/cascade/campaigns.ts` and
  `scripts/cascade/campaigns.test.ts` only for artifact-store integration and
  public campaign-run verification;
- update `scripts/cascade/common.ts` and its test only if an invariant belongs
  to the existing exclusive/atomic filesystem primitives;
- update `scripts/cascade.ts` only if the prepared `campaign verify <run-id>`
  public command is added;
- add a versioned run-artifact/identity schema under `product-evals/campaigns/` and
  register it in `harness.config.yaml` when used as a public contract;
- regenerate `product-evals/campaigns/catalog.generated.json` only from the final
  current sources.

Protected paths:

- N05 policy schema/definitions/module;
- W-005 through W-010 and W-012 surface-owned definitions and adapters;
- existing `.artifacts/campaigns/` history;
- candidate/archived implementation branches and patches;
- unrelated dirty documentation, validator, graph, and architecture work.

Implementation slices:

1. Define `CampaignArtifactStore` as the sole reservation, namespace,
   append-only write, finalization, and verification authority.
2. Replace check-then-write orchestration with one exclusive reservation that
   records run, attempt, parent/retry, operator role/session, target, simulator,
   recovery authority, lease ID/owner/expiry, campaign digest, and source
   identity before target events.
3. Freeze only bounded regular files from permitted roots; refuse symlinks,
   oversized or changing bodies, unsafe destinations, and unredactable content.
   Record producer, timestamp, original path, frozen path, size, digest,
   redaction profile/status, and lineage.
4. Make execution, specialized evaluation, general evaluation, calibration,
   and aggregation stage receipts exclusive to their namespaces. Rewriting a
   receipt or writing after terminal finalization fails closed.
5. Finalize through an atomic terminal record that binds reservation,
   lifecycle, source manifest, stage receipts, cleanup/recovery, summary, and
   complete digest chain. An interrupted run may be finalized only by its
   declared recovery identity and may not resume target actions.
6. Add artifact verification through the module public interface and, if kept
   small, `campaign verify <run-id>`.

Behavior and failure examples:

- Two concurrent reservations for one run ID yield one winner; the loser
  creates no target event and overwrites nothing.
- A retry uses a new run ID and records its parent; the original tree and
  digests remain unchanged.
- A crash after a possibly external action can be cleaned up and finalized
  `UNKNOWN_OUTCOME` by the declared recovery identity without resuming action.
- A role/session collision, mismatched lease owner, duplicate stage receipt,
  post-finalization write, symlink, size violation, secret-safety failure, or
  tampered digest fails closed.
- Verification of an untampered, fully finalized deterministic run succeeds
  without executing the target or evaluator.

Required checks:

```bash
npx --yes bun@1.3.3 test scripts/cascade/campaign-artifacts.test.ts scripts/cascade/campaigns.test.ts scripts/cascade/common.test.ts
npx --yes bun@1.3.3 test scripts/cascade
npx --yes bun@1.3.3 scripts/cascade.ts campaign catalog --check
npx --yes bun@1.3.3 scripts/cascade.ts campaign self-test
npx --yes bun@1.3.3 scripts/cascade.ts validate
npx --yes bun@1.3.3 scripts/cascade.ts eval catalog --check
npx --yes bun@1.3.3 scripts/cascade.ts eval self-test
npx --yes bun@1.3.3 scripts/cascade.ts target self-test
git diff --check
```

Acceptance additionally requires a fresh deterministic
`simulation-contract-smoke` run under a new run ID, artifact verification, a
same-ID race fixture, no old-source import, and independent GF-004/GF-101
review bound to the exact implementation digest.

## WG-001-N05 Implementation Packet

Preparation receipt: `WG001-N05-PREP-20260730-R12`

| Field | Prepared value |
|---|---|
| Objective | versioned policy registry/resolver with declarative applicability, default deny, confirmation receipts, budgets, redaction decisions, and exact audit records |
| State | `REVIEW`; implementation receipt `WG001-N05-EXEC-20260730-A1`; independent review `NOT_RUN` |
| Preferred surface | `root` |
| Attempt | implementation attempt 1 of 2 completed |
| Requires nodes | accepted `WG-001-N02`; accepted WG-001-N03 is a protected current-source input |
| External conditions | exact Bun 1.3.3; current fingerprints; no unexplained overlap in allowed writes |
| Output receipt | `WG001-N05-EXEC-20260730-A1`; independent GF-004/GF-101 review receipts pending |
| Acceptance owner | W-004 after independent architecture and security review |
| Repair | return to `PENDING`, preserve failed decision evidence, repair earliest failed invariant |
| Exhaustion | after attempt 2, `BLOCKED` pending `plan-change`; no unchanged retry |

Allowed implementation writes:

- add `scripts/cascade/campaign-policies.ts`;
- add `scripts/cascade/campaign-policies.test.ts`;
- update `scripts/cascade/campaigns.ts` and
  `scripts/cascade/campaigns.test.ts` only for resolver integration and
  action-time enforcement;
- update `scripts/cascade/simulation-definitions.ts` and its test for the
  versioned policy definition and reference rules;
- update `product-evals/policies/schema.json`, current tracked policy definitions, and
  the simulation starter template through one direct cutover;
- regenerate `product-evals/campaigns/catalog.generated.json` only from the final
  current sources.

Protected paths:

- N04 reservation/artifact implementation except the named typed policy port;
- W-005 through W-010 and W-012 surface-owned definitions and adapters;
- claim reduction and receipt-chain behavior owned by N06/N07;
- existing run artifacts and historical definitions;
- candidate/archived implementation branches and patches;
- unrelated dirty work.

Policy contract:

- definition identity: schema version, stable policy ID, explicit policy
  version, and resolved source digest;
- declarative scope only: campaign IDs, task IDs, task kinds, drivers, action
  types, and bounded observable fields; no executable expressions;
- applicability result:
  `APPLICABLE` or `NOT_APPLICABLE`, with the exact observation digest and
  reason;
- action result: `ALLOW`, `DENY`, or `REQUIRE_CONFIRMATION`; no applicable
  policy is default `DENY`;
- at most one applicable policy per action. Ambiguity is a pre-action
  `BLOCKED` result, never precedence guessed by file order;
- confirmation receipt binds run/task/action index, observation digest, policy
  digest, approver identity, decision, and expiry. Missing, rejected, stale, or
  mismatched confirmation stops before the action;
- budgets declare bounded supported dimensions such as action count and output
  bytes. A required unsupported dimension blocks preflight;
- redaction decisions name a profile and whether unsafe/unredactable evidence
  must be blocked. A task/model/provider observation cannot widen its own
  policy, budget, or redaction profile;
- every considered decision records policy ID/digest, applicability, effect,
  budget snapshot, confirmation receipt digest when present, redaction
  profile/status, reason, and timestamp.

Implementation slices:

1. Define and validate the direct-cutover policy schema and current fixtures.
2. Implement a pure resolver that evaluates scope and produces a complete
   decision record without executing an action.
3. Enforce decision, confirmation, and supported budget limits immediately
   before every action/process dispatch; stop a batch at the first non-allow
   result while preserving prior decisions and observations.
4. Pass typed redaction requirements to the artifact boundary without writing
   artifacts or creating a second artifact authority.
5. Bind decision digests into task results and execution receipt inputs.

Behavior and failure examples:

- No applicable policy records considered policies as `NOT_APPLICABLE`, emits
  default deny, and performs no side effect.
- A scoped allow applies only to the exact campaign/task/driver/action
  observation it declares.
- Two applicable policies block before execution; file order cannot choose a
  winner.
- Deny or confirmation-required stops before the affected action. Later output
  or semantic judgment cannot compensate.
- Accepted confirmation works only for its exact non-expired observation and
  policy digest.
- Exhausted action/output budget preserves the partial trace and stops before
  the over-budget action/output is accepted.
- Unsupported required budget or redaction capability blocks preflight.

Required checks:

```bash
npx --yes bun@1.3.3 test scripts/cascade/campaign-policies.test.ts scripts/cascade/campaigns.test.ts scripts/cascade/simulation-definitions.test.ts
npx --yes bun@1.3.3 test scripts/cascade
npx --yes bun@1.3.3 scripts/cascade.ts campaign catalog --check
npx --yes bun@1.3.3 scripts/cascade.ts campaign self-test
npx --yes bun@1.3.3 scripts/cascade.ts validate
npx --yes bun@1.3.3 scripts/cascade.ts eval catalog --check
npx --yes bun@1.3.3 scripts/cascade.ts eval self-test
npx --yes bun@1.3.3 scripts/cascade.ts target self-test
git diff --check
```

Acceptance additionally requires deterministic allow/default-deny/scope/
ambiguity/confirmation/budget/redaction fixtures, no old-source import, and
independent GF-004/GF-101 review bound to the exact implementation digest.

## Traceability And Scheduling

| Existing criterion | Primary prepared owner | Evidence |
|---|---|---|
| SF-005 retry immutability | N04 | two run trees plus unchanged original digests |
| SF-007 frozen evidence body | N04 | safe-freeze and tamper fixtures |
| SF-015 reservation race | N04 | same-ID concurrent reservation fixture |
| SF-016 crash/recovery identity | N04 | interrupted-run recovery/finalization fixture |
| SF-017 append-only receipt namespaces | N04; N07 remains chain owner | namespace ownership and overwrite refusal |
| SF-018 role/session separation | N04; N06 remains evaluator-acceptance owner | identity-envelope negatives |
| SF-019 unredactable evidence | N04 enforcement; N05 policy input | fail-closed freeze and redaction decision |
| SF-006 unknown policy reference | N05 | definition validation with zero execution events |
| SF-014 denied composed action | N05; W-012 remains composed consumer | action-time deny decision |
| SIM-020 through SIM-024 | N04/N05 prepared portions | local deterministic fixtures; later contour evidence remains N08/surface-owned |

Scheduling:

1. authorize and implement N04 first;
2. independently review and accept N04;
3. refresh N05's source fingerprints and overlap map;
4. authorize and implement N05;
5. independently review and accept N05;
6. recompute the frontier for N06 and N08.

This is serialization for shared write safety, not a new semantic dependency or
work-graph topology change. Work Graph Revision remains 11.

## Preparation Validation And Remaining `NOT_RUN`

Preparation must validate the current graph/docs and baseline tests. It does
not satisfy either node's implementation or acceptance gate.

Preparation validation receipt:
`WG001-FRONTIER-PREP-VALIDATE-20260730-R12`.

| Check | Current result |
|---|---|
| exact Bun focused implementation checks | `PASS`; 48 tests, 163 assertions |
| exact Bun aggregate implementation checks | `PASS`; 61 tests, 194 assertions |
| Cascade validator | `PASS`; 9 agents, 44 skills, zero project-specific leakage |
| campaign catalog | `PASS`; 7 entries, digest `a72cd1621a5b3fcb4e9dece95fec1aa372f681552d79cf823b5b8ed97926aeda` |
| campaign self-test | `PASS`; framework fixture `CALIBRATED`, release scope `NOT_RUN` |
| harness catalog/self-test | `PASS`; 44 skills, 368 scenarios, 20 self-test cases |
| target self-test | `PASS`; 26 cases |
| JSON and repository diff checks | `PASS` |
| current N04/N05 fixed point | `3d58dc883166880fc0c3499216a980c2af63cd5570153a6a3b3228f5df999598` |
| N04/N05 deterministic run | `PASS`; `wg001-frontier-20260730-r2`; 72-file terminal manifest `VALID` |

Still `NOT_RUN`:

- N04 and N05 independent implementation reviews;
- N06 through N08 and Gate A;
- W-005 through W-010 and W-012 implementations;
- live Computer Use, model, desktop, mobile, provider, target-project
  calibration, deployment, publication, spending, and release evidence.

## Preparation Closeout

Closeout receipt:
`WG001-FRONTIER-PREP-CLOSEOUT-20260730-R12`.

| Binding | Value |
|---|---|
| Subject | WG-001-N04 and WG-001-N05 preparation only |
| Plan / graph | plan revision 12 / work-graph revision 11 |
| Attempt | preparation attempt 1 |
| Source | `master@21ba5288b27700f94ecad92ec0cf3d1e5dca5f29` plus accepted WG-001-N03 implementation digest `a964ee6a736727b13a7e25fef18fc87f13a8128b119f8863a42de2c620e71491` |
| Producer | root task `019fb3c2-bd84-7282-9df0-5477a8321233`, W-004 planning authority |
| Produced at | `2026-07-30T17:19:17Z` |
| Outputs | this report; synchronized work graph, W-004 lane, active registry, program report, fix plan, and report index |
| Evidence | `WG001-FRONTIER-PREP-VALIDATE-20260730-R12` |
| Transition | preparation-time transition `IN_PROGRESS -> COMPLETE`; implementation later moved N04/N05 to `REVIEW` |
| Invalidation | changed source fingerprint, accepted predecessor/input, node outcome, write ownership, security contract, fragment version, graph topology, or dispatch policy requires a fresh preparation review |

Closeout dispositions:

- W-004 remains `OPEN`; WG-001 is `ACTIVE`; Gate A remains open.
- No terminal node, lane, or graph gate is proposed as complete.
- Commit, staging, push, publication, task creation, delegation, and live
  execution are `NOT_REQUESTED`.
- Doc routing: the durable planning fact is owned by this report and its
  existing active-work projections. No product, design, brand, spec, glossary,
  stack, runtime, or reusable boundary-pattern diff is needed.
- Archive result: `NOT_APPLICABLE` because the lane and graph remain active.
- Memory write: none; not requested.
