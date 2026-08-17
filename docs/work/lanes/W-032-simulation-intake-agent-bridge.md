# Work Lane: W-032 Simulation Intake And Agent Bridge

Status: `IN_PROGRESS`
Planning Status: `REVIEW_SUBJECT_DRIFTED`; revision-24 proportional-routing behavior remains the candidate, but immutable r64 no longer binds the current source
Plan Revision: `24`
Lane Task Graph Revision: `2`
Owner: `agent-engineer`
Created: 2026-08-04
Lane-State Owner: `orchestrator in the root task`
Terminal Gate: `W-032-GT`
Execution Surface: `root`
Dispatch State: `AUTHORIZED`
Dispatch Authorization: `2026-08-05 explicit subagent and delegated implementation authorization`
Next Gate: `join revision-24 to the next current-source W-031 revision-41 immutable subject, then run G1-G4 review against that exact intake-v6/action-binding-v2 and v41/core@42 producer binding; W-031-G6 and integrated G6/GT remain open; G5 stays accepted`

## Request And Outcome

Connect prompt intake, extracted claims, product domains/capabilities/briefs,
simulation campaign authoring, exact policy selection, operator execution,
independent evaluation, and explicit product-doc refinement without merging
their authorities.

## Acceptance Criteria

- `SIB-001` through `SIB-006` and `PR-009` through `PR-012` are durable and
  trace to code, templates, roles, and tests.
- W-031 classifies simulation authoring/operation with proportional simulation
  governance and recognizes current shell-tool identities.
- Product campaigns bind a scope-correct intake; only READY, current,
  digest-equal product intakes can execute.
- Product intakes bind a current Task Envelope and reviewed/approved generated
  brief; harness intakes cannot claim product context.
- Product campaign manifests reference one authored seed-binding artifact;
  READY intakes persist and replay its exact digest-bound, complete ID mapping.
- Harness campaigns and intakes remain unbound; no claim-text matcher or second
  semantic classifier may create seed dispositions.
- Declared policy IDs equal computed action-policy applicability exactly.
- `agent-engineer`, `simulation-operator`, `simulation-evaluator`, and
  `harness-evaluator` retain separate authoring, execution, and judgment roles.
- Simulation findings cannot silently mutate product docs; accepted findings
  re-enter synthesis and composition explicitly.

## Lane-Local Task Graph

The local implementation is a review candidate, not an accepted producer.
Named upstream gates remain authoritative even when equivalent local tests
pass. Only the lane-state owner records transitions; no node self-accepts.

| Node ID | Workline / obligation | Requires Nodes | Requires Accepted Producers | External Conditions | Expected Receipt | Write Scope | Tools / Permissions | Per-Node Gate | Attempt / Max | Repair / Exhaustion | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `W-032-N01` | WL-01 intake-v6 and product seed schema/scope | none | `W-031-G1`, `W-031-G2`, `WG-001-N02` | `EXT-01`, `EXT-02` | scope-correct intake/seed schema, canonical action-binding-v2, and bounded-reader receipt | intake/seed/campaign schema, resolver types, bounded seed read | local filesystem/Bun; scoped writes only | `W-032-G1` | `1/2 r22` | repair exact schema, binding, read, legacy, or scope boundary; after max replan | `REVIEW_R22_A1` |
| `W-032-N02` | WL-02 compiler, brief, and seed projection | `W-032-N01` | `W-030-GT` | `EXT-01`, `EXT-02`, `EXT-03` | compiler/CLI, current-brief, and exact same-buffer seed receipt | compiler, snapshots, seed projection | local filesystem/Bun; no external action | `W-032-G2` | `1/2 r19` | exact source/mapping/read replay and brief equality; after max replan | `REVIEW_R19_A1` |
| `W-032-N03` | WL-03 exact policy equality | `W-032-N02` | `WG-001-N05` | `EXT-01`, `EXT-04` | exact applicability and denial receipt | compiler/resolver policy bindings | local fixtures only; no campaign execution | `W-032-G3` | `3/3` | revalidate after schema/read repair | `REVIEW` |
| `W-032-N04` | WL-04 starter seed artifact, author skill, and product specs | `W-032-N03` | `W-030-GT` | `EXT-01`, `EXT-03` | starter/author-guidance and generated fixed-point receipt | starter, simulation-author skill/templates, product ledgers | local filesystem/Bun; no product-doc promotion | `W-032-G4` | `2/2 r24` | repair authored mapping guidance or refresh generated projections; after max replan | `REVIEW_R24_A2` |
| `W-032-N05` | WL-05 role and READY/run replay gate | `W-032-N04` | `W-032-G1` through `W-032-G4` | `EXT-01`, `EXT-02`, `EXT-04` | agent-wiring, non-READY denial, and same-buffer seed replay receipt | skills and campaign run gate | local validation only; provider execution separately authorized | `W-032-G5` | `1/2 r19` | revalidate claim provenance, seed bytes, context, and intake root at READY/run | `ACCEPTED` |
| `W-032-N06` | WL-06 integration and closeout | `W-032-N05` | `W-031-G6`, `WG-001-N05`, `W-032-G1` through `W-032-G5` | `EXT-01` through `EXT-04` | current-source regression and independent review join | lane/spec projections; generated artifacts remain root-owned | local validation; no commit, push, provider run, or release action | `W-032-G6` | `1/2 r22` | reopen earliest invalid producer/consumer | `BLOCKED_ON_W031_G6_AND_W032_G1_G2_G3_G4` |

### External Conditions

| Condition ID | Authority | Satisfaction Rule | State |
|---|---|---|---|
| `EXT-01` | user | scoped local implementation and documentation repair authorized | `SATISFIED` |
| `EXT-02` | W-031 | exact local producer parity is Task Envelope/schema/catalog/case-set v41, classifier v41, `cascade-core@42`, and 981 corpus cases; W-031-G6 and W-032 integrated acceptance remain separate open gates | `PRODUCER_PARITY_CURRENT_GATES_OPEN` |
| `EXT-03` | archived W-030 authority | `W-030-GT ACCEPTED` and current product-context contract/PB-002 digests resolve | `SATISFIED` |
| `EXT-04` | WG-001/W-004 | shared definitions are complete and the action-policy producer `WG-001-N05` is accepted | `SATISFIED_ACCEPTED` |

### Evidence Gates

| Gate ID | Subject | Required Evidence | Evaluator / Reviewer | State | Failure / Repair Route |
|---|---|---|---|---|---|
| `W-032-G1` | intake-v6/seed schema and scope | closed schema parity, canonical action-binding-v2 version/digest, exact simulation/intake path-root equality, positive ASCII-only canonical product seed path identity, product-required/harness-forbidden seed binding, bounded nofollow one-buffer seed read under its exact canonical physical root, harness separation, replacement-only v1-v5 migration, accepted W-031 schema gates, and complete `WG-001-N02` | independent architecture reviewer | `REVIEW_R22_A1` | `W-032-N01` or named producer |
| `W-032-G2` | compiler/brief/seed projection | compiler/CLI, pre-write intake destination equality, exact active-claim mapping, same-buffer projection/source digest with exact physical-root replay, stale campaign/source/artifact tests, `W-030-GT ACCEPTED`, and current PB-002 fixed point | independent integration reviewer | `REVIEW_R19_A1` | `W-032-N02` or W-030 on source defect |
| `W-032-G3` | policy equality | canonical action-binding-v2 version/digest, exact applicability, over/under-selection, deny, mismatch tests and accepted `WG-001-N05` | independent security reviewer | `REVIEW` | `W-032-N03` |
| `W-032-G4` | templates/specs | schema-v6 empty-task starter, starter seed artifact, simulation-author ID-map guidance, proportional ordinary-simulation versus campaign routing, campaign/intake schema and runtime parity for the positive ASCII seed-path grammar, catalog/brief fixed point, and no implicit product-doc mutation | independent Spec reviewer | `REVIEW_R24_A2` | `W-032-N04` |
| `W-032-G5` | roles/run gate | role wiring, exact-root same-reader seed replay, cross-root run refusal before reservation/dispatch, non-READY denial, harness non-binding, no-auto-dispatch, and authority probes | independent functional reviewer | `ACCEPTED` | `W-032-N05` |
| `W-032-G6` | integrated candidate | current focused and aggregate regression, repository gates, immutable evidence, fixed-point review | integration, functional, security, and harness reviewers | `BLOCKED_ON_W031_G6_AND_W032_G1_G2_G3_G4` | earliest invalid producer/consumer |
| `W-032-GT` | product-intake readiness | accepted `W-032-G1`, `W-032-G2`, `W-032-G3`, `W-032-G4`, `W-032-G5`, `W-032-G6`, `W-031-G6`, `WG-001-N05`, and `W-030-GT` | orchestrator joins independent receipts | `BLOCKED` | reopen earliest unmet gate |

### Current Frontier And Repair

- In progress: revision-24 preserves the revision-22 seed-path boundary while its
  N01/N03/N04 consumer surfaces migrate to intake v6 and N06 action-binding
  v2 with W-031 v41/`cascade-core@42` parity. It also makes the campaign/intake
  boundary explicit: ordinary actor/interface simulations stay bounded and do
  not create an intake, while product, calibration, repeated-run, or release
  campaigns escalate. Fresh G1/G4 and
  formal G2/G3 review are still required; parity is not acceptance. The prior
  r22 technical receipt is historical after producer identity drift.
  Product/harness seed presence parity, exact physical-root and same-buffer
  authority, G2/G3 review semantics, and accepted N05/G5 remain preserved
  inputs.
- Blocked: N06 and `W-032-GT` await `W-031-G6` plus independent acceptance of
  G1 through G4 and the integrated G6 join. Immutable r64 has nine current-source
  drift items, so generated catalog/brief projection refresh, a new joined
  immutable subject, and aggregate integration remain root-owned.
  No historical immutable fixture is a pending W-032 frontier or
  product-simulation execution/acceptance receipt.
- Accepted: N05/G5 and external `EXT-04`/`WG-001-N05`; `W-030-GT` remains an
  accepted external input.
- Failure reopens the earliest responsible node and only its consumers. Task
  Envelope, brief, seed artifact/mapping, task/action, policy, or scope drift
  reopens N02 through N06; an author-guidance defect reopens N04-N06 and an
  agent-role defect reopens N05/N06.

## Boundaries And Dependencies

| Producer / authority | W-032 consumption | Must remain separate |
|---|---|---|
| W-031 / `TAP-*` | typed Task Envelope, claims, controls, authority gaps | no campaign action authorization |
| product catalog and `PB-XXX` | exact product seed and source digests | no execution or behavior proof |
| W-004 / WG-001 | campaign/task/policy/runtime/evidence contracts | W-004 remains shared merge owner |
| persona governance | derivation and proposal-only refinement rules | no synthetic self-validation or direct mutation |

WG-001 revision 13 binds `WG-001-N18` to `W-032-GT` as the product-intake readiness
node. It gates product entries within `WG-001-N17`; it does not delay harness
mechanics or change Gate B’s deterministic implementation meaning.

## Current Evidence And Remaining Gates

- Implemented candidate: intake-v6/seed schemas, canonical N06
  action-binding-v2 projection, product manifest reference,
  authored seed projection, exact active-claim coverage and target resolution,
  compile/check/READY/run replay, harness non-binding, draft starter artifact,
  simulation-author instructions, schema/runtime campaign seed-scope parity,
  and canonical product seed lexical admission before referenced loads.
- Revision-22 adds one positive ASCII-only grammar identity to campaign
  `seed_binding_file`, intake-v6 `seed_binding.path`, runtime manifest and
  intake validation, and the bounded seed reader. Paired public-schema/runtime
  matrices cover valid product/harness controls, the seven revision-21
  prior-accepted spellings, adjacent mixed-case/arbitrary-percent/non-ASCII
  variants, and the earlier wrong-root/traversal/separator classes. Every
  invalid case is replayed against a referenced-load sentinel.
- The revision-41 W-031 local candidate has a passing
  v41/`cascade-core@42` admission fixed point with `981/981` exact corpus cases
  and zero over/under-control. The current narrow W-031/W-032 focused parity
  plus intake-v6/definition/starter-template suite passes `237/237` with 3,388
  assertions; the complete repository suite passes `478/478` with 5,031
  assertions. Root-owned independent integration joins remain
  separate gates, and mechanical parity does not accept W-032.
- The seven-campaign catalog and self-test pass at semantic digest
  `ea46795935e30c202ca7bf159a5143718c2a2ac03e5ffa1b451c16819f6c0475`.
  Release scope remains `NOT_RUN`.
- Immutable r57 freezes revision-24 with W-004 revision-76 and W-031
  revision-41 at run
  `wg001-n06-r76-w031-r41-w032-r24-review-20260808-r57`. It is deterministic
  review-candidate evidence only and does not accept G1-G4/G6/GT.
- Immutable fixtures r51, rejected r53, and rejected r54 are historical after
  the v41/core@42 producer rebind.
  It is not product-simulation execution and does not independently accept the
  current producer; refreshed immutable integration remains root-owned.
- Intake trust probes cover duplicate/missing mappings, absent `SEEDED`, invalid
  disposition targets, unknown campaign claim/scenario/task IDs, stale campaign
  and source digests, exact persisted projection replay, product manifest
  omission, harness/product authority crossover, replacement-only intake v1-v5,
  canonical action-binding-v2 fields, and a schema-v6 empty-task starter.
- Independent receipt `W032-R22-ARCH-FUNCTIONAL-REVIEW-20260805-IND-03`
  passed the r22 G1/G4 technical subject at the prior v22/core@23 fixed point.
  The W-031 producer bump invalidates its integrated identity, so refreshed
  acceptance remains `NOT_RUN`; G5 stays accepted.
- Product/provider execution, independent product evaluation, persona research
  validation, merge, deploy, and release eligibility: `NOT_RUN`.

### Revision 12 Attempt 1 Fixed Point

- Receipt `W032-R12A1-EXEC-20260805` resolves the current brief manifest and
  generated projection with bounded, nofollow, identity-stable reads.
- Compile copies product context only from that authoritative snapshot. READY
  check/run requires a current reviewed or approved source, byte-identical
  projection, and exact equality for every persisted v2 product-context field.
- Self-resealed mutations of paths, digests, brief/domain/capability identity,
  every reference class, extra references, current status, file bytes, and
  symlink substitution reject. The public v2 schema remains unchanged.
- The exact focused suite passes `95/95`; the aggregate suite passes `213/213`.
  Catalog `1e448871...` and r22 manifest `638aa50b...` are current. Independent
  W-032 review and accepted W-031/WG-001 producers remain required.

### Revision 13 Claim-Provenance Bridge

W-031 revision-10 review proved that W-032 copies active claim statements,
statuses, and policy tags but drops each Task Envelope claim source. Exact
digest binding therefore preserves bytes without preserving whether a claim is
user-authored, trusted, external, or inferred.

Revision 13 authorizes a versioned intake contract that carries exact source
provenance for every copied claim, rejects legacy READY artifacts that cannot
prove that binding, and prevents external or inferred claims from becoming
implicit simulation authority. Existing exact brief, envelope, action-policy,
role-separation, no-auto-dispatch, and proposal-only refinement rules remain.

The implemented intake v3 preserves exact claim kind and source, rejects v1/v2
with a migration-required disposition, and revalidates the complete active
claim projection at READY/run time. External or inferred claims cannot become
implicit simulation authority. Focused owned suites pass `87/87`; the complete
suite passes `222/222` with 1426 assertions. PB-001/PB-002, catalog
`34c1d08e...`, and r24 manifest `34cdd12e...` are current. Independent W-032
review and accepted W-031/WG-001 producers remain required.

## File Ownership

- W-032: `docs/specs/simulation-intake-agent-bridge/**`, this lane,
  `product-evals/intakes/**`, `scripts/cascade/simulation-intake*`, and narrow
  intake/template/agent/product-ledger integrations.
- W-031: generic Task Envelope and `TAP-*` authority; W-032 contributes the
  simulation-specific control/corpus repair under serialized root ownership.
- W-004: shared campaign policy/runtime/evidence contracts and WG-001 merge.
- No commit, push, provider run, publication, deployment, or product-document
  promotion is authorized by lane readiness alone.

## Replanning History

| Revision | Trigger | Preserved | Changed | Evidence Impact |
|---|---|---|---|---|
| `1` | implement the missing admission-to-simulation bridge | separate W-031/W-030/W-004 authorities and no-auto-dispatch | intake schema/compiler, brief/policy binding, run gate, templates, roles, WG-001-N18 | local implementation reached review |
| `2` | fixed-point review found scope crossover, forged READY decisions, and stale policy-bundle identity gaps | lane topology, agent separation, campaign authority, provider gates | scope/identity path binding, exact READY policy/decision validation, admission bundle `cascade-core@2`, negative probes | 49 focused and 152 aggregate tests pass; independent acceptance remains open |
| `3` | fixed-point review found `simulation intake --check` compared generated content without strictly resolving READY dependencies | scope, policy, and role boundaries; no provider execution | READY checks now re-resolve the current envelope snapshot, brief, policies, and digests after equality comparison | 49 focused and 152 aggregate tests pass at catalog `73e0a208...`; independent acceptance remains open |
| `4` | reconciliation found prose-only producer dependencies and no stable lane terminal gate | current implementation, authority separation, W-030 acceptance, local evidence | added typed nodes, stable `W-032-G1..GT`, external conditions, bounded repair, and explicit accepted W-031/WG-001 producer dependencies | 50 focused and 153 aggregate tests pass locally; terminal acceptance is blocked on `W-031-G6`, `WG-001-N05`, and independent W-032 review |
| `5` | current-source validation found a stale generated campaign catalog after shared simulation changes | lane topology, intake behavior, authority separation, and named producer gates | regenerated the catalog and refreshed current immutable candidate evidence without changing intake behavior | catalog `92e7e3fe...`, 50 focused tests, 154 aggregate tests, and r11 fixture evidence pass locally; independent acceptance remains open |
| `6` | W-004 cleanup review invalidated source-bound catalog and fixture identities | lane topology, intake compiler behavior, authority separation, and named producer gates | refreshed catalog and immutable evidence after W-004 stopped treating resource release as verified target reset | catalog `8a73c618...`, 50 focused tests, 154 aggregate tests, and r13 fixture evidence pass locally; independent acceptance remains open |
| `7` | W-004 exact-byte and terminal-finalization repair changed shared runtime identity | lane topology, intake behavior, authority separation, and named producer gates | refreshed current catalog and immutable evidence after N04 recovery hardening | catalog `a2a0e009...`, 50 focused tests, 155 aggregate tests, and r14 fixture evidence pass locally; independent acceptance remains open |
| `8` | W-031 attempt-2 and W-004 attempt-8 changed admission and artifact identities | lane topology, intake behavior, authority separation, and named producer gates | rebound local evidence to `cascade-core@5`, refreshed PB-002/catalog, and recorded r17 immutable evidence; exact W-032 admission bindings stay stale until producer acceptance | catalog `059b6943...`, 71 focused tests, 189 aggregate tests, and r17 fixture evidence pass locally; independent acceptance remains open |
| `9` | W-031 revision-7 A2 review proved the external-binding helper was not reachable through the public CLI and the run gate did not revalidate bound request/source identity | authority separation, exact policy equality, product brief/template work, no-auto-dispatch, named producer gates | reopen N01-N06; persist external bindings, expose explicit CLI inputs, and revalidate the current Task Envelope plus expected digests before a READY run | revision-8 local evidence becomes historical; repair attempt 2/3 required before independent W-032 review |
| `10` | revision-8 attempt-1 architecture/security review found an in-place breaking v1 intake shape and lexical/unbounded Task Envelope snapshot reads | public CLI binding behavior, authority separation, exact policy equality, product context, no-auto-dispatch | final 3/3 repair advances the intake contract with explicit legacy disposition and uses one bounded nofollow buffer for parse/hash/validation at compile and run gates | revision-9 fixed point becomes historical after mutation; fresh independent receipts required |
| `11` | revision-10 final review found partial runtime enforcement of the public v2 schema and insufficient post-open ancestor containment | v2 identity and stable v1 rejection, exact bindings, product context, no-auto-dispatch | exact schema/runtime validation, opened-file canonical containment, parity/race probes, and root-help refresh | 94 focused and 209 aggregate tests pass; fresh review and producer acceptance remain open |
| `12` | revision-11 final review found copied product-context identity was not equality-bound to current brief authority | public v2 schema, exact admission and policy bindings, no-auto-dispatch | authoritative current-brief equality at compile/check and READY/run plus self-resealed forgery probes | 95 focused and 213 aggregate tests pass; fresh review and producer acceptance remain open |
| `16` | product seeding remained prose-only and could not prove which active source claim intentionally seeded which campaign target | revision-15 strict preview/check/write/run boundary, exact provenance/brief/policy replay, role separation, and no auto-dispatch | intake v5, product-only authored seed artifact, exact ID mapping/digests/target resolution, harness non-binding, author guidance, and focused negative probes | local candidate only; W-031 rebind, generated fixed points, aggregate/immutable evidence, and independent acceptance remain open or `NOT_RUN` |
| `17` | revision-16 G1/G2/G5 review found seed validation, projection SHA, and source SHA came from separate pathname opens | intake v5/seed v1 shapes, explicit ID mappings, no implicit classifier, harness separation, legacy boundary, roles, and policy equality | one bounded nofollow physically contained seed read; fatal UTF-8/JSON validation and projection/source digests share its exact buffer; symlink/substitution/bound regressions | focused candidate passes; root-owned source-bound refresh, aggregate evidence, independent review, and producer acceptance remain open |
| `18` | revision-17 G1/G2/G5 review found campaign simulation and intake lexical roots were not equality-bound, and replacement mode skipped the only embedded-scope comparison | intake v5, product-only seed binding, revision-17 same-buffer seed authority, strict legacy boundary, roles, and policy equality | schema/runtime/resolution root equality plus final pre-write destination validation; both cross-root public matrices deny before replacement/reservation/dispatch | root-specific `2/2` and 45 assertions pass; W-031 v16 rebind, generated refresh, aggregate evidence, independent review, and producer acceptance remain open |
| `19` | revision-18 G1/G2/G5 review found the seed path lexical root was narrower than the generic reader's repository-wide physical containment root | intake v5, product-only seed binding, one-buffer digest/projection, campaign/intake-root equality, nofollow/bounds/UTF-8/JSON, legacy boundary, roles, and policy equality | optional exact physical root plus ancestor-directory identity replay; seed reads bind the canonical seed root and deterministic same-inode ancestor-move probes require rejection | common/definition/intake `60/60`, aggregate `265/265`, current r31; independent review and producer acceptance remain open or `NOT_RUN` |
| `20` | revision-19 G1/G4 review found runtime required product seed binding and denied harness seed binding while the public campaign schema admitted both invalid shapes | intake v5, exact simulation/intake roots, revision-19 exact physical-root and one-buffer authority, strict legacy boundary, roles, policy equality, and accepted N05/G5 | product branch requires `seed_binding_file`, harness branch forbids it, and paired direct-schema/runtime controls prove parity | common/definition/intake `60/60`; G1/G4 proposed for review only against the current 265-test/r31 baseline |
| `21` | independent receipt `W032-R20-ARCH-FUNCTIONAL-REVIEW-20260805-IND-01` failed revision-20 G1/G4 because schema/runtime seed admission accepted wrong-root and non-canonical lexical paths before the physical-root reader | product-required/harness-forbidden seed presence, intake v5, exact simulation/intake roots, exact physical-root and one-buffer authority, strict legacy boundary, G2/G3 review semantics, and accepted N05/G5 | exact canonical slash-separated seed root in schema/runtime manifest validation before any referenced load, paired invalid-path matrix, and load-order sentinel | common/definition/intake `61/61` with 348 expectations and seven-campaign self-test pass; G1/G4 proposed for `REVIEW_R21_A1` only; aggregate/fixed-point independent evidence remains `NOT_RUN` |
| `22` | independent receipt `W032-R21-ARCH-FUNCTIONAL-REVIEW-20260805-IND-01` failed revision-21 G1/G4 because seven percent-encoded or Unicode alternate spellings remained admissible and intake-v5 retained a broader seed path | product/harness seed presence parity, intake v5, exact simulation/intake roots, exact physical-root and one-buffer authority, strict legacy boundary, G2/G3 review semantics, and accepted N05/G5 | one positive ASCII-only grammar identity across both public schemas and one runtime validator reused by manifest, intake, and bounded-reader admission; complete paired and load-order matrices | W-032 definition slice `24/24` with 236 expectations; combined focused `65/66` is blocked only by a concurrent W-031 v19-to-v20 consumer assertion rebind; G1/G4 remain review-only and aggregate/fixed-point independent evidence remains `NOT_RUN` |
| `23` | W-031 current producer advanced after r55 | intake-v6/action-binding-v2 behavior, seed-path boundary, role separation, G5 acceptance, and graph revision 2 | rebind Task Envelope/schema/catalog/case-set parity to v41/`cascade-core@42` and revision 40 | combined admission/clause/hook/intake slice passes `209/209`; fresh G1-G4 and integrated gates remain open |
| `24` | fixed-point review found W-032 still described every simulation as an escalated campaign | intake-v6/action-binding-v2, product seed mapping, role separation, G5 acceptance, and graph revision 2 | distinguish ordinary bounded actor/interface simulations from explicit product, calibration, repeated-run, and release campaigns; rebind revision 41 and immutable r58 | complete suite passes `482/482`; r58 is deterministic review evidence only and G1-G4/G6/GT remain open or blocked |

### Revision 9 Fixed Point

- Implementation receipt: `W031-R8-W032-R9-EXEC-20260805-A1`.
- Current admission input: `cascade-core@6`, schema/catalog/case-set v5, exact
  `32/32` corpus.
- The public intake CLI carries expected request/source digests; the intake
  persists actual/expected request/source plus derivation bindings; READY and
  campaign run validation recheck the current envelope, snapshot, revision,
  derivation, intake identity, and expected bindings.
- Current evidence: 75 focused tests, 195 aggregate tests, catalog
  `e1e82b2d...`, and verified r18 manifest `37ddf460...`.
- W-032 remains in review. W-031/WG-001 producer acceptance and independent
  W-032 gates remain required; product/provider execution and promotion remain
  `NOT_RUN`.

### Revision 10 Fixed Point

- Implementation receipt: `W031-R8A2-W032-R10A3-EXEC-20260805`.
- Current admission input is `cascade-core@7` with schema, catalog, and case-set
  v6; the public intake schema is v2 and rejects v1 with a stable migration-
  required result.
- Snapshot reads at compile and run time are bounded, nofollow, regular-file,
  identity-checked, and consumed from one buffer for digest, parse, and
  validation.
- Current local evidence is 80 focused and 202 aggregate tests, catalog
  `80ce2c96...`, and verified r19 manifest `6b2cd6b...`.
- Independent W-031/WG-001 producer acceptance and fresh W-032 review remain
  open. Product/provider execution, semantic evaluation, promotion, merge,
  deploy, and release eligibility remain `NOT_RUN`.

### Revision 11 Fixed Point

- Receipt: `W032-R11A1-EXEC-20260805-124930Z`.
- Runtime validates the complete closed intake-v2 schema before semantic
  checks; stable v1 migration rejection is preserved.
- Shared bounded reads verify opened-file canonical containment plus pre/post
  path identity, and root help exposes both mandatory digest flags.
- Local evidence: 94 focused checks, 209 aggregate tests, catalog
  `8bb094b2...`, and valid r20 manifest `3e7c22b5...`.
- Fresh independent W-032 review and accepted W-031/WG-001 producers remain
  required. Product/provider execution and all promotion/release states remain
  `NOT_RUN`.

### Revision 11 Final Projection Refresh

- W-031 final producer candidate is `cascade-core@9`/v8 with exact `68/68`
  corpus evidence; receipt `W031-R9A2-EXEC-20260805` remains independently
  unaccepted.
- PB-002 and catalog `5f3d6c01...` are current; aggregate regression is
  `211/211` with 1185 expectations; r21 verifies 90 files at manifest
  `7f680af1...` and remains `release_eligible=false`.
- Runtime/schema and bounded-reader subjects retain passing local evidence.
  Final W-032 acceptance still waits for accepted W-031/WG-001 producers and
  fresh independent W-032 receipts.

### Revision 14 Upstream Provenance Replan

Revision-13 intake-v3 exact replay and external/inferred-authority rejection
pass locally, but independent end-to-end review proved that they faithfully
preserve a W-031 claim already mislabeled as `USER`. Revision 14 therefore
does not add a second provenance classifier. It blocks on W-031 revision 11,
then versions the compatible intake contract so the trusted source-segment or
direct-user attestation identity is copied, equality-bound, and revalidated at
compile/check/READY/run. Legacy v3 handling must be explicit. G1/G2/G5/G6 and
GT remain blocked until the producer is repaired and fresh cross-boundary
review passes; product/provider execution and promotion remain `NOT_RUN`.

### Revision 14 Intake V4 Fixed Point

Receipt `W032-R14-V4-EXEC-20260805` advances the intake to v4, copies the
producer's exact provenance version/mode/source-segment digest/direct-user
attestation projection, and replays equality at check/READY/run. V1-v3 return
stable migration-required errors. No second lexical classifier is introduced.

Focused/adjacent tests pass `69/69`; the complete suite passes `228/228` with
1498 assertions; PB-002 and catalog `3a32a9a6...` are current; r25 verifies 90
immutable files at manifest `f8aa1b11...`. These are local implementation
receipts, not producer or W-032 acceptance. Product/provider execution,
semantic evaluation, promotion, merge, deployment, and release remain
`NOT_RUN`.

### Revision 14 Attempt 1 Review And Final Attempt 2 Replan

The v4 schema, compile projection, exact READY replay, and producer-drift
rejection pass independently, but the public recompile command cannot replace a
referenced v1-v3 intake because campaign resolution validates that legacy file
before compilation. Attempt 2 may bypass only stale/legacy current-intake
loading during explicit intake compilation, while retaining full validation
for check/run and every other campaign consumer. Add an end-to-end public
`--write` legacy replacement regression. W-031/WG-001 producer acceptance and
all provider/promotion/release gates remain separate.

### Revision 14 Final Attempt 2 Fixed Point

Receipt `W032-R14-A2-EXEC-LEGACY-REPLACEMENT-20260805` adds a compile-only
replacement mode: public `--write` can replace referenced v1-v3 intakes, while
`--check`, READY/run, default resolution, and `allowStaleIntake` remain strict.
The intake is rebound to Task Envelope v12 wording without changing provenance
semantics. Focused W-032 suites pass `40/40`; complete regression is `233/233`;
catalog `5b3240ce...` and r26 manifest `4bde207c...` are current. Independent
W-032 and producer acceptance remain required.

### Revision 15 Attempt 1 Replan And Candidate

Independent follow-up found that revision-14's replacement mode was reachable
through the exported default compiler as well as public `--write`. A no-flag
preview could therefore report a schema-v4 READY candidate while the campaign
still referenced a legacy, unrunnable intake. Revision 15 preserves the v4
contract, exact provenance/product/policy replay, strict READY/run behavior,
and explicit v1-v3 migration, but narrows replacement to the public
`simulation intake ... --write` service. Default preview, `--check`, ordinary
resolution, and the resolver used by run remain strict.

Attempt-1 receipt `W032-R15-A1-EXEC-PREVIEW-STRICT-20260805`
implements the private write-only compile mode and adds a public behavior
matrix: legacy default preview and `--check` fail without schema-v4 READY
output, strict run preflight fails before reservation/dispatch, public
`--write` replaces v1/v2/v3, and subsequent preview/check accept the persisted
READY v4 intake. Focused W-032 intake/definition/simulation suites pass `40/40`
with 215 assertions. Root then rebound PB-002 to the integrated W-031 v13 /
`cascade-core@14` producer, regenerated catalog
`fd1625243d2b593fb8b69d8cfb1cda624a0c8c8e01ad74cbf223ce61081d689c`,
and passed the complete `236/236` suite with `1654` assertions plus every
repository check. Immutable r27 verifies 90 files at manifest
`3af061c0b763b089a25e256f07232a7c4e562fc71f95b71dba4027e9a200acec`.
The W-032 runtime/schema diff digest is
`f235f4da718eec9413850469b2a24051bd142d8bd47c9d45453b501f2b2efaf1`.
Independent W-032 and producer acceptance remain required; provider execution,
semantic evaluation, promotion, deployment, and release remain `NOT_RUN`.

### Revision 16 Attempt 1 Seed-Binding Candidate

Revision 16 adds an authored product-only seed-binding artifact and advances
the intake contract to v5. The compiler persists the artifact path and digest,
campaign digest, exact Task Envelope source identity, and a complete
`source_claim_id` mapping projection. READY requires at least one `SEEDED`
mapping with current campaign claim and scenario/task targets; other
dispositions are rationale-only. Duplicate, missing, stale, unknown, implicit,
or cross-scope bindings fail closed at compile/check/READY/run. Harness intake
behavior and revision-15's strict write-only legacy replacement boundary are
preserved.

Receipt `W032-R16-A1-EXEC-SEED-BINDING-20260805` is bound to owned content
manifest `7422f0cee5cb3ea82db4c46c30361b6d2bfca4bce2b517e7056af9498920b1c0`.
The exact producer rebind is `cascade-core@16`/Task Envelope schema-v15,
classifier v15, and case-set v15 with 140 cases. Focused W-032 suites pass
`48/48` with 257 assertions. After root-owned catalog/PB-002 regeneration,
the complete repository suite passes `246/246` with 1819 assertions and every
repository gate passes. Catalog `25cfaa0c...` and immutable r28 manifest
`89a4c18f...` are current; the fixture remains `release_eligible=false`.

This is an integrated review candidate, not accepted upstream or lane truth.
Independent W-032 review, accepted W-031/WG-001 producers, provider execution,
semantic evaluation, promotion, deployment, and release remain open or
`NOT_RUN`.

### Revision 17 Attempt 1 Bounded Seed Read Fixed Point

Revision-16 independent review failed G1/G2/G5 because seed content was parsed
and hashed through separate, symlink-following reads. Receipt
`W032-R17-A1-EXEC-SEED-READ-20260805` routes compile/check/READY/run through one
bounded nofollow regular-file snapshot with physical-ancestor containment,
stable pre/post identity, strict UTF-8/JSON parsing, and digest/projection
derivation from the same bytes. Symlink, ancestor/file substitution,
oversize, invalid encoding/JSON, no-implicit-mapping, v5 E2E, and legacy
boundary regressions pass.

Focused W-032 suites pass `48/48` with 257 assertions. The integrated suite
passes `257/257` with 1888 assertions, all repository gates pass, catalog
`acd7f8ee...` is current, and immutable r29 verifies 91 files at manifest
`f9f2e314...`. Independent W-032 and producer acceptance remain required;
provider/product execution, semantic/persona evaluation, promotion,
deployment, and release remain `NOT_RUN`.

### Revision 18 Attempt 1 Intake-Root Fixed Point

Revision-17 independent review failed G1/G2/G5 because `simulation_file` and
`intake_file` could select different physical lexical roots. Embedded intake
scope comparison occurred only after loading the referenced intake, so the
explicit replacement route bypassed it and could target a cross-scope path.

Receipt `W032-R18-A1-EXEC-INTAKE-ROOT-20260805` makes the simulation manifest
path root authoritative in schema, runtime manifest validation, resolved
simulation replay, replacement compilation, and the writer's final pre-write
check. Product-under-harness and harness-under-product READY sentinels now fail
default/check/write/resolve/run without byte replacement, reservation, or
dispatch. Root-specific probes pass `2/2` with 45 assertions. Revision-17's
same-buffer product seed read remains intact. The broader owned two-file run is
`42/42 PASS` after rebinding the existing producer assertion to W-031 revision
15's schema v16 and `cascade-core@17`. Root-owned catalog/brief refresh,
aggregate/immutable evidence, independent review, provider execution, promotion,
deployment, and release remain open or `NOT_RUN`.

After root-owned catalog/brief refresh, every repository gate passes and the
complete suite passes `262/262` with `2001` assertions. Campaign catalog
`1adbe379...` is current, and immutable fixture
`wg001-attempt20-review-20260805-r30` verifies 91 files at manifest
`df6b1da1...`, fixture evaluation `PASS`, and `release_eligible=false`.
Independent W-032 and producer acceptance, provider execution, promotion,
deployment, and release remain open or `NOT_RUN`.

### Revision 19 Attempt 1 Exact Seed Physical Root

Revision-18 review failed G1/G2/G5 because seed path admission ended at a
lexical root while the generic opened-file containment check ended at the
canonical repository root. Moving an opened seed ancestor outside
`product-evals/intakes/product/seed-bindings/`, recreating its old pathname,
and hard-linking the same inode back could preserve repository containment and
file identity without preserving the seed authority root.

Receipt `W032-R19-A1-EXEC-SEED-PHYSICAL-ROOT-20260805` adds an optional exact
physical root to the bounded reader, replays directory identities from the
file parent through that root, retains pre/post descriptor containment, and
binds seed reads to the canonical seed-binding directory. Generic callers
retain repository-root behavior. Deterministic generic and seed-level probes
move the opened ancestor outside the permitted root and hard-link the same
inode back; rejection is the only accepted result. One-buffer digest and
projection derivation, nofollow open, stable file checks, byte limits, fatal
UTF-8/JSON parsing, revision-18 campaign/intake-root equality, and existing
substitution protections remain unchanged.

The focused common plus simulation-definition run passes `39/39` with 118
expectations. After W-031 revision 18 fixed schema/classifier v19 and
`cascade-core@20`, the exact consumer rebind is rerun against the requested
common/definition/intake slice during root integration. Campaign self-test passes
for seven campaigns, calibration remains `CALIBRATED`, and release scope is
`NOT_RUN`; the owned-file `git diff --check` passes. Generated catalog and
PB-002 refresh are current. Aggregate and immutable evidence pass locally;
independent review, accepted producers, provider execution, promotion,
deployment, and release remain separate or `NOT_RUN`. G1/G2/G5 are proposed for
`REVIEW_R19_A1` only; no W-032 gate is accepted.

The root-integrated common/definition/intake slice passes `62/62` with 352
assertions after the W-031 v19/core@20 rebind. The complete suite passes
`280/280` with `2348` assertions, every repository gate passes, and campaign
catalog `82d7657c...` is current. Immutable fixture
`wg001-attempt23-review-20260805-r33` verifies 91 files at manifest
`9fb77657...`, fixture evaluation `PASS`, and `release_eligible=false`.

### Revision 20 Attempt 1 Campaign Seed Schema Parity

Revision-19 G1/G4 review failed because the public campaign schema allowed a
product campaign without `seed_binding_file` and a harness campaign with that
product-only field even though runtime resolution rejected both. The public
contract and runtime therefore described different campaign authority
boundaries.

Receipt `W032-R20-A1-EXEC-CAMPAIGN-SEED-SCHEMA-PARITY-20260805` requires the
seed binding in the product schema branch, forbids it in the harness branch,
and validates the same invariant during runtime manifest parsing before any
referenced-file load. Resolution replays the invariant against the resolved
simulation scope. The existing root-pairing test now includes paired direct-
schema and runtime cases for valid product, valid harness, product without a
seed, and harness with a seed; required simulation/intake root pairings remain
unchanged.

The focused common/definition/intake slice passes `60/60` with 334 assertions.
The current root-owned integrated baseline passes `268/268` with 2162
assertions at campaign catalog `3a32aded...`; r32 verifies 91 files at manifest
`d7dfc93d...` and remains `release_eligible=false`. This attempt proposes G1
and G4 for `REVIEW_R20_A1` only. N05/G5 and `EXT-04` remain accepted; G2/G3,
W-031-G6, integrated G6, and terminal GT acceptance remain open. No provider
execution, promotion, deployment, or release is authorized.

### Revision 21 Attempt 1 Campaign Seed Lexical Root

Independent receipt `W032-R20-ARCH-FUNCTIONAL-REVIEW-20260805-IND-01` failed
revision-20 G1/G4 because product seed presence parity did not constrain the
field to its only permitted lexical authority root. Both the public schema and
runtime manifest validator accepted traversal and alternate path spellings;
the later physical-root reader could not compensate for manifest admission.

Receipt `W032-R21-A1-EXEC-SEED-LEXICAL-ROOT-20260805` is bound to plan revision
21, Task Graph revision 2, attempt 1/2, base/head
`4226bfa1f69f069407b5f383e8c72dd39aa5abed`, branch `master`, and worker-local
execution identity `/root/w032_r21_repair` at `2026-08-05T18:22:00Z`. Its
assigned writes are the campaign schema, simulation definition runtime/test,
and W-032 contract/plan/lane; no generated artifact, active registry,
Coordination Graph, staging, commit, push, provider, or release action is
included. The three runtime/test source identities are:

- `product-evals/campaigns/schema.json` SHA-256 `96e9e43655e7084ef37c8f2a9a8c7c1f952b0307890ef4c99ac2326c50812ea2`;
- `scripts/cascade/simulation-definitions.ts` SHA-256 `2945106758d575e6f99bcfb877e1dbd2744cb30030b233315f6520e6343b9e56`;
- `scripts/cascade/simulation-definitions.test.ts` SHA-256 `799c0cb293a0d64fa59b15e002c2ef5907ebe5545b40163171371ed37e5decb7`.

The product campaign schema and runtime manifest validator now require one
canonical slash-separated `.json` path below
`product-evals/intakes/product/seed-bindings/`. Wrong-root, `.`/`..`,
backslash, absolute, and duplicate-separator paths fail before the evaluation
profile or any later campaign reference is loaded. Valid product/harness and
missing/forbidden seed behavior remains paired across schema/runtime. Exact
physical-root replay, same-buffer parsing/digest/projection, G2/G3 review
semantics, and accepted N05/G5 READY/run and no-dispatch semantics are
preserved.

Worker-local functional evidence
`W032-R21-A1-FUNCTIONAL-SEED-LEXICAL-ROOT-20260805` is required for G1/G4 and
passes the common/definition/intake command `61/61` with 348 expectations. The
seven-campaign self-test also passes with calibration `CALIBRATED` and release
scope `NOT_RUN`. Owned-path `git diff --check` passes; final owned-path diff
inspection is complete for this worker-local receipt.

The receipt proposes `REVIEW_R20_A1 -> REVIEW_R21_A1` for N01/G1 and N04/G4;
it does not record acceptance. Independent fixed-point architecture and Spec
review, G2/G3 acceptance, W-031-G6, revision-21 aggregate/integrated and
immutable evidence, G6, and terminal GT remain open or `NOT_RUN`. G5 remains
accepted and is reopened only if later evidence shows its named lexical,
physical-root, same-buffer, READY/run, or no-dispatch input changed.

Root integration completes the previously open aggregate/immutable evidence:
the W-031 v19/core@20 consumer rebind passes, PB-002 and campaign catalog
`82d7657c...` are current, the complete suite passes `280/280`, and r33
verifies 91 files at manifest `9fb77657...` with
`release_eligible=false`. These results do not independently accept G1-G4,
G6, or GT.

### Revision 22 Attempt 1 Positive ASCII Seed-Path Grammar

Independent receipt `W032-R21-ARCH-FUNCTIONAL-REVIEW-20260805-IND-01` failed
revision-21 G1/G4 after accepting all seven forbidden alternate spellings:
lowercase and uppercase percent-encoded dot-dot, percent-encoded slash and
backslash, U+FF0E fullwidth-dot traversal, U+2215 division slash, and U+2044
fraction slash. It also found intake-v5 `seed_binding.path` retained a broad
`.+` grammar. The receipt preserves G2/G3 review semantics and accepted G5;
the earliest repair subjects are N01/G1 and N04/G4.

Receipt `W032-R22-A1-EXEC-SEED-PATH-GRAMMAR-20260805` is bound to plan revision
22, Task Graph revision 2, attempt 1/2, base/head
`4226bfa1f69f069407b5f383e8c72dd39aa5abed`, branch `master`, and worker-local
execution identity `/root/w032_r22_repair` at `2026-08-05T18:48:30Z`. Assigned
and actual writes are limited to the campaign schema, intake-v5 schema,
simulation-definition runtime/test, and W-032 contract/plan/lane. Generated
catalogs/briefs, `active.md`, WG-001, staging, commit, push, provider/product
execution, promotion, deployment, and release are excluded. Input identities
are:

- `product-evals/campaigns/schema.json` SHA-256 `96e9e43655e7084ef37c8f2a9a8c7c1f952b0307890ef4c99ac2326c50812ea2`;
- `product-evals/intakes/schema.json` SHA-256 `871f8169bb4b43d4b47872a6bbde28f8e36bcbcd1bbcfef119d731b7ad6c9e51`;
- `scripts/cascade/simulation-definitions.ts` SHA-256 `2945106758d575e6f99bcfb877e1dbd2744cb30030b233315f6520e6343b9e56`;
- `scripts/cascade/simulation-definitions.test.ts` SHA-256 `799c0cb293a0d64fa59b15e002c2ef5907ebe5545b40163171371ed37e5decb7`.

The output identities at worker-local validation are:

- campaign schema SHA-256 `95b8a1c49811362e300b648ef95c68c234203bc319a8c1e016c03aaa0fdbee89`;
- intake-v5 schema SHA-256 `7094266ebe3b50f9c625f8129405ee405738ec58ef30ec8e87d4c98681956adf`;
- simulation-definition runtime SHA-256 `41805c7eda90b49ccefdead9c1359a0f59d7e60572cb85f8f8305e628dc5dde6`;
- simulation-definition tests SHA-256 `2ac65f2d8a89ff2f7c5db5dbc3ccec90cce7a745f3672a4c72f019e57596169d`.

The campaign and intake schemas reuse byte-equal local `seedBindingPath`
definitions, and parity tests bind both strings to the exported runtime pattern
identity. One runtime validator is called by manifest scope validation,
intake-v5 validation, and the bounded seed reader. Its positive character set
excludes `%` and every non-ASCII code point; its component shape rejects
dot-only components and empty separators. The paired matrices cover all seven
r21 spellings plus mixed-case percent forms, arbitrary percent encoding,
ordinary non-ASCII text, and every earlier literal path class. Each case also
runs through a missing evaluation-profile sentinel, proving manifest rejection
occurs before any campaign reference is loaded.

Worker-local W-032 evidence
`W032-R22-A1-FUNCTIONAL-SEED-PATH-GRAMMAR-20260805` passes the definition slice
`24/24` with 236 expectations. Campaign self-test passes seven campaigns at
catalog digest `263f07b6...`, calibration `CALIBRATED`, and release scope
`NOT_RUN`. The first combined common/definition/intake run is preserved as a
historical concurrent-snapshot failure: seven intake cases observed W-031
runtime schema v20 while its five public schemas remained v19. The W-032 slice
and then-current common slice passed; no W-031/common source was changed or
suppressed by this repair. After the producer schemas reached v20, the combined
rerun passed `65/66` with 510 expectations; only the concurrent consumer
assertion that still expected schema v19/`cascade-core@20` failed. Root then
rebound that assertion and the fixed-point combined rerun passes `66/66` with
527 expectations. Repository validation passes `290/290` with 2,594
assertions, campaign catalog `26f238f5...` and PB-002 are current, and
immutable fixture `wg001-attempt24-review-20260805-r34` verifies 93 files at
manifest `f0fe20e1...` with `release_eligible=false`.

This receipt proposes `REVIEW_R21_A1 -> REVIEW_R22_A1` for N01/G1 and N04/G4
and never records acceptance.
Independent fixed-point architecture and Spec review, G2/G3 acceptance,
W-031-G6, revision-22 aggregate/integrated and immutable evidence, G6, and
terminal GT remain open or `NOT_RUN`. G5 remains accepted and reopens only if
later evidence invalidates its exact physical-root, same-buffer, READY/run, or
no-dispatch inputs.

Refreshed technical receipt
`W032-R22-ARCH-FUNCTIONAL-REVIEW-20260805-IND-03` passed revision 22 against
the then-current W-031 v22/`cascade-core@23` fixed point, preserving technical
G1/G4 pass recommendations and G5 acceptance while correctly leaving formal
G2 integration and G3 security review `NOT_RUN`. W-031 revision 22 then changed
the producer identity, so that receipt is retained as historical technical
evidence and cannot accept a current gate.

Root integration now binds the unchanged intake-v5 runtime to W-031 schema v23
and `cascade-core@24`. The common/definition/intake slice passes `69/69` with
575 assertions, admission passes `294/294`, the complete suite passes
`310/310` with 3,116 assertions, campaign catalog `d57288db...` and PB-002 are
current, and immutable fixture `wg001-attempt27-review-20260805-r37` verifies
93 files at manifest `e9217dab...` with fixture evaluation `PASS` and
`release_eligible=false`. Fresh fixed-point G1/G4 review at this producer is
required before formal G2/G3 review and the G6/GT joins; no provider-backed
product execution or product semantic evaluation was run.

W-031 revision 23 advances the producer again to Task Envelope/classifier v24,
`cascade-core@25`, and 308 exact corpus cases. W-032 runtime behavior remains
unchanged; its consumer assertion and projections are rebound to that identity.
The common/definition/intake slice passes `70/70` with 590 assertions,
admission passes `308/308`, and the complete suite passes `316/316` with 3,262
assertions. Campaign catalog `e8b2b9f5...` and PB-001/PB-002 are current. The
prior v23/core@24 technical receipt is historical after this producer drift.
Fresh G1/G4 review and formal G2/G3 review remain `NOT_RUN`; G5 remains
accepted, while G6/GT and provider-backed product execution remain blocked.

W-031 revisions 24 and 25 advance the current producer to Task
Envelope/classifier v26 and `cascade-core@27`. W-032 remains behavior revision
22, but its consumer projection is rebound to that exact producer. The W-004
N06 direct cutover also makes the product specialization boundary explicit:
product campaign manifests and generated starters carry
`specialized_evaluation: null`; product artifacts cannot carry a harness
specialized-evaluator principal or receipt.

Root integration passes the common/definition/intake/starter join `80/80` with
636 assertions and the complete suite `335/335` with 3,526 assertions.
Campaign catalog `429eca73...`, PB-001, and PB-002 are current. Immutable r40
verifies schema `1.2.0`, 97 files, and manifest `cae5fae...` with fixture
evaluation `PASS` and `release_eligible=false`. Fresh fixed-point G1/G4 review
at v26/core@27 and formal G2/G3 review remain `NOT_RUN`; G5 remains accepted,
while G6/GT and provider-backed product execution remain blocked.

W-031 revision 26 advances the producer identity to Task Envelope/classifier
v27 and `cascade-core@28` with 430 exact admission cases. W-032 behavior stays
at revision 22; only its current consumer assertion and projections are
rebound. The narrow common/definition/intake parity slice passes `71/71` with
597 assertions. Fresh producer-bound G1/G4, formal G2/G3, W-031-G6, the
integrated G6/GT join, provider-backed product execution, and product semantic
evaluation remain `NOT_RUN` or blocked as applicable.

Root fixed-point integration regenerates catalog `588f75ef...`, PB-001, and
PB-002, passes the complete suite `346/346` with 3,678 assertions, and freezes
immutable r41 with 97 files at manifest `fa6d1d54...` and
`release_eligible=false`. This binds the current v27/core@28 producer and
revision-22 consumer mechanically; it does not replace fresh producer-bound
G1/G4, formal G2/G3, W-031-G6, or the integrated G6/GT acceptance receipts.
No product campaign or provider-backed semantic evaluation was run.

W-031 revision 27 advances the current producer identity to Task
Envelope/schema/catalog/case-set v28, classifier v28, and `cascade-core@29`
with 454 exact cases. W-032 stays behavior revision 22; its narrow admission
consumer assertion is rebound to the new producer identity. This is a
producer-identity projection only: fresh W-032 G1/G4, formal G2/G3, W-031-G6,
integrated G6/GT, provider-backed product execution, and product semantic
evaluation remain open, blocked, or `NOT_RUN` as applicable.

Root fixed-point integration regenerates campaign catalog `651aecba...`,
PB-001, and PB-002, passes the complete suite `353/353` with 3,764 assertions,
and freezes immutable r42 with 99 files at manifest `60e19b5a...` and
`release_eligible=false`. This proves mechanical v28/core@29 consumer parity
only; fresh W-032 G1/G4, formal G2/G3, W-031-G6, integrated G6/GT, product
execution, and product semantic evaluation remain open or `NOT_RUN`.

W-031 revision 28 supersedes the producer identity with Task
Envelope/schema/catalog/case-set v29, classifier v29, and `cascade-core@30`
with 485 exact cases. W-032 remains behavior revision 22; its narrow admission
consumer assertion is rebound to that producer identity and passes in the
combined `144/144`, 2,343-assertion producer-parity suite. This is mechanical
consumer parity only. Root still owns the integrated N06 projection join;
fresh W-032 G1/G4, formal G2/G3, W-031-G6, integrated G6/GT, provider-backed
product execution, and product semantic evaluation remain open or `NOT_RUN`.

Root fixed-point integration regenerates campaign catalog `78838d3b...`,
PB-001, and PB-002, passes the complete suite `361/361` with 3,871 assertions,
and freezes immutable r43 with 99 files at manifest `5e0e2c83...` and
`release_eligible=false`. This is mechanical v29/core@30 parity only; fresh
W-032 G1/G4, formal G2/G3, W-031-G6, integrated G6/GT, product execution, and
product semantic evaluation remain open or `NOT_RUN`.

W-031 revision 29 supersedes the producer identity with Task
Envelope/schema/catalog/case-set v30, classifier v30, and `cascade-core@31`
with 515 exact cases. W-032 remains behavior revision 22; the narrow admission
consumer assertion is mechanically rebound and passes in the combined
`148/148`, 2,424-assertion parity suite. Root still owns protected projection
regeneration and the integrated N06 join. Fresh W-032 G1/G4, formal G2/G3,
W-031-G6, integrated G6/GT, provider product execution, and product semantic
evaluation remain open or `NOT_RUN`.

Root fixed-point integration regenerates campaign catalog `70143a4a...`,
PB-001, and PB-002, passes the complete `366/366` suite with 3,959 assertions,
and freezes immutable r44 with 99 files at manifest `dbaf083f...` and
`release_eligible=false`. This is mechanical v30/core@31 consumer parity only;
fresh W-032 G1/G4, formal G2/G3, W-031-G6, integrated G6/GT, product
execution, and product semantic evaluation remain open, blocked, or `NOT_RUN`.

W-031 revision 30 supersedes the producer identity with Task
Envelope/schema/catalog/case-set v31, classifier v31, and `cascade-core@32`
with 545 exact cases. W-032 remains behavior revision 22; the narrow admission
consumer assertion is mechanically rebound and passes in the combined
`153/153`, 2,506-assertion parity suite. Root still owns protected projection
regeneration and the integrated N06 join. Fresh W-032 G1/G4, formal G2/G3,
W-031-G6, integrated G6/GT, provider product execution, and product semantic
evaluation remain open or `NOT_RUN`.

Root fixed-point integration regenerates catalog `234c05a3...`, PB-001, and
PB-002, passes the complete `371/371` suite with 4,052 assertions, and freezes
immutable r45 with 100 files at manifest `9f365c68...` and
`release_eligible=false`. This is mechanical v31/core@32 consumer parity only;
fresh W-032 G1/G4, formal G2/G3, W-031-G6, integrated G6/GT, product
execution, and product semantic evaluation remain open, blocked, or `NOT_RUN`.

W-031 revision 31 supersedes the producer identity with Task
Envelope/schema/catalog/case-set v32, classifier v32, and `cascade-core@33`
with 599 exact cases. W-032 remains behavior revision 22; its narrow admission
consumer assertions are mechanically rebound and pass in the combined
`158/158`, 2,605-assertion parity suite. Root still owns protected projection
regeneration and the integrated N06 join. Fresh W-032 G1/G4, formal G2/G3,
W-031-G6, integrated G6/GT, provider product execution, and product semantic
evaluation remain open or `NOT_RUN`; this parity receipt does not accept them.

W-031 revision 32 supersedes the producer identity with Task
Envelope/schema/catalog/case-set v33, classifier v33, and `cascade-core@34`
with 661 exact cases. W-032 remains behavior revision 22; combined narrow parity
passes `163/163` with 2,698 assertions. Root owns protected N06 projection
regeneration. Fresh W-032 G1/G4, formal G2/G3, W-031-G6, integrated G6/GT,
provider product execution, semantic evaluation, and release proof remain open
or `NOT_RUN`; this mechanical parity does not accept them.

W-031 revision 33 supersedes the rejected-r47 producer identity with Task
Envelope/schema/catalog/case-set v34, classifier v34, and `cascade-core@35`
with 705 exact cases. W-032 remains behavior revision 22; the narrow consumer
assertion is mechanical producer parity only and the combined suite passes
`166/166` with 2,762 assertions. Fresh W-032 G1/G4, formal G2/G3,
W-031-G6, integrated G6/GT, immutable evidence, provider product execution,
semantic evaluation, and release proof remain open or `NOT_RUN`.

### Revision 22 V34/Core35 Root Integration

Root joins the revision-33 W-031 producer and revision-22 W-032 consumer at
immutable r49. Admission passes `705/705`; the joined deterministic suite
passes `389/389` with 4,361 assertions; r49 verifies 109 files at manifest
`80a26aa1876aefc424bad897876bc18dea5e90bac70d5099c427916f51c58b43`.
This is producer/consumer parity only. G1-G4, integrated G6, W-031-G6, and GT
remain open; no provider, product, live, deployment, or release proof exists.

### Revision 22 V35/Core36 Mechanical Rebind

W-031 revision 34 advances the producer identity to Task
Envelope/schema/catalog/case-set v35, classifier v35, and `cascade-core@36`
with 765 exact cases. W-032 remains behavior revision 22; the root-owned
narrow consumer assertion is mechanically rebound and the combined focused
suite passes `169/169` with 2,849 assertions.

This rebind changes no intake, seed, product/harness, policy, execution, or
evaluation authority. Generated and immutable integration remains root-owned;
fresh G1/G4, formal G2/G3, W-031-G6, integrated G6/GT, provider execution,
semantic evaluation, deployment, and release proof remain open or `NOT_RUN`.

### Revision 22 V35/Core36 Root Integration

Root joins the revision-34 W-031 producer and revision-22 W-032 consumer at
immutable r50. Admission passes `765/765`; the joined deterministic suite
passes `397/397` with 4,479 assertions; r50 verifies 123 files at manifest
`468f484f91baec54175f89be6bcc7a7ee4197afe1a6cd5b2956f694076b0d880`.
This is producer/consumer parity only. G1-G4, integrated G6, W-031-G6, and GT
remain open; no provider, product, live, deployment, or release proof exists.

### Revision 22 V36/Core37 Mechanical Rebind

W-031 revision 35 advances the producer identity to Task
Envelope/schema/catalog/case-set v36, classifier v36, and `cascade-core@37`
with 785 exact cases. W-032 remains behavior revision 22; the root-owned
narrow consumer assertion is mechanically rebound. This rebind changes no
intake, seed, product/harness, policy, execution, evaluation, or acceptance
authority. Fresh G1/G4, formal G2/G3, W-031-G6, integrated G6/GT, provider
execution, semantic evaluation, deployment, and release proof remain open or
`NOT_RUN`.

### Revision 22 V36/Core37 Root Integration

Root joins W-031 revision 35 and W-032 revision 22 at immutable r51. Admission
passes `785/785`; combined focused admission/intake parity passes `171/171`
with 2,870 assertions; the joined deterministic suite passes `405/405` with
4,531 assertions. r51 verifies 125 files at manifest
`b45a458a328060b10b7bb66ddd8481aef8096d08353b512450e0c2f339a28126`.
This is producer/consumer parity only. G1-G4, integrated G6, W-031-G6, and GT
remain open; provider, product, live, deployment, and release proof remain
`NOT_RUN`.

### Revision 22 V37/Core38 Mechanical Rebind

W-031 revision 36 advances the producer identity to Task
Envelope/schema/catalog/case-set v37, classifier v37, and `cascade-core@38`
with `907/907` exact admission cases and zero over/under-control. W-032 remains
behavior revision 22; only its narrow producer-identity assertion and current
projections are rebound. The focused W-031/W-032 suite passes `179/179` with
2,888 assertions; admission validation and the exact `907/907` corpus pass;
PB-002 generation and fixed-point checking pass.

This changes no intake, seed, product/harness, policy, execution, evaluation,
or acceptance authority. Fresh G1/G4, formal G2/G3, W-031-G6, integrated
G6/GT, immutable integration, provider execution, semantic evaluation,
deployment, and release proof remain open or `NOT_RUN`.

W-031 revision 37 and its r53 integration were subsequently rejected. Their
v38/`cascade-core@39` parity and `925/925` corpus receipts remain historical
only and cannot satisfy any current W-032 gate.

### Revision 22 V39/Core40 Mechanical Rebind

W-031 revision 38 advances the accepted-candidate producer identity to Task
Envelope/schema/catalog/case-set v39, classifier v39, and `cascade-core@40`
with `949/949` exact admission cases and zero over/under-control. W-032 remains
behavior revision 22; only its narrow producer-identity assertion and current
projections are rebound. The focused W-031/W-032 suite passes `192/192` with
3,008 assertions; admission validation and the exact `949/949` corpus pass;
PB-002 generation and fixed-point checking pass.

This changes no intake, seed, product/harness, policy, execution, evaluation,
or acceptance authority. Fresh G1-G4, W-031-G6, integrated G6/GT, immutable
integration, provider execution, semantic evaluation, deployment, and release
proof remain open or `NOT_RUN`; G5 stays accepted.

### Revision 22 Intake V6 And N06 Action-Binding V2 Migration

The W-032 consumer and simulation starter now project intake schema v6. A
DRAFT starter with `tasks: []` remains valid. Every populated action carries
`action_binding_version: cascade-action-binding-v2` and the canonical
`action_binding_digest`; the previous lossy action digest is unsupported.
Intake schemas v1 through v5 remain replacement-only and cannot be READY.

This migration retains W-031 revision-39 v40/`cascade-core@41` parity and does
not accept W-032. The focused W-031, intake, definition, and starter-template
slice passes `237/237` with 3,388 assertions. Fresh G1-G4, W-031-G6,
integrated G6/GT, catalog and immutable integration, provider execution,
semantic evaluation, deployment, and release proof remain open or `NOT_RUN`;
G5 stays accepted pending the fresh joins.

W-031 revision 38 and its r54 integration were subsequently rejected. Their
v39/`cascade-core@40` parity and `949/949` corpus receipts remain historical
only and cannot satisfy any current W-032 gate.

### Revision 22 V40/Core41 Mechanical Rebind

W-031 revision 39 advances the accepted-candidate producer identity to Task
Envelope/schema/catalog/case-set v40, classifier v40, and `cascade-core@41`
with `965/965` exact admission cases and zero over/under-control. W-032 remains
behavior revision 22; only its narrow producer-identity assertion and current
projections are rebound. The focused W-031/W-032 suite passes `201/201` with
3,078 assertions; admission validation and the exact `965/965` corpus pass;
PB-002 generation and fixed-point checking pass.

This changes no intake, seed, product/harness, policy, execution, evaluation,
or acceptance authority. Fresh G1-G4, W-031-G6, integrated G6/GT, immutable
integration, provider execution, semantic evaluation, deployment, and release
proof remain open or `NOT_RUN`; G5 stays accepted.

W-031 revision 36 was subsequently rejected by independent review. The
v37/`cascade-core@38` parity receipt and its `907/907` corpus result remain
historical only and cannot satisfy any current W-032 gate.

### Revision 22 V38/Core39 Mechanical Rebind

W-031 revision 37 advances the review-candidate producer identity to Task
Envelope/schema/catalog/case-set v38, classifier v38, and `cascade-core@39`
with `925/925` exact admission cases and zero over/under-control. W-032 remains
behavior revision 22; only its narrow producer-identity assertion and current
projections are rebound. The focused W-031/W-032 suite passes `184/184` with
2,940 assertions; admission validation and the exact `925/925` corpus pass;
PB-002 generation and fixed-point checking pass.

This changes no intake, seed, product/harness, policy, execution, evaluation,
or acceptance authority. Fresh G1/G4, formal G2/G3, W-031-G6, integrated
G6/GT, immutable integration, provider execution, semantic evaluation,
deployment, and release proof remain open or `NOT_RUN`.
