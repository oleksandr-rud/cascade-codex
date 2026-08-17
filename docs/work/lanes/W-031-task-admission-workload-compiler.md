# Work Lane: W-031 Task Admission And Workload Compiler

Status: `IN_PROGRESS`
Planning Status: `REVIEW_SUBJECT_DRIFTED`; revision-41 behavior remains the candidate, but immutable r64 no longer binds the current source
Plan Revision: `41`
Owner: `agent-engineer`
Created: 2026-08-04
Lane Model: `sequential-pipeline`
Next Gate: `freeze one new current-source immutable subject for revision-41, then obtain exact architecture/harness, functional, and GF-101 receipts against that subject and workspace binding`
Execution Surface: `root`
Dispatch State: `AUTHORIZED`
Dispatch Authorization: `2026-08-05 explicit subagent and delegated implementation authorization`
Runtime Handle: `root current-source review-subject refresh`

## Request

Prepare the workload model, durable specification, implementation plan, and
work lane for a layer that admits every request, extracts and verifies claims,
selects proportional controls, distinguishes simple/medium/enterprise/program
work, and reclassifies complex long-running tasks.

## Acceptance Criteria

- `docs/specs/task-admission-workload/contract.md` defines the Task Envelope,
  claims, independent workload axes, routes, composable controls, precedence,
  workline promotion, reclassification, hooks, security, and examples.
- The implementation plan maps every contract to one primary workline, slice,
  exact artifact set, validation seam, repair boundary, and terminal gate.
- Simple and medium requests have explicit low-overhead paths; no full workflow,
  scan, lane, security overlay, or enterprise evidence activates without a
  matching claim or policy.
- Small high-risk requests cannot be downgraded by effort, and large low-risk
  work is not automatically treated as regulated.
- Complex feature sets and refactors use adaptive worklines, checkpoints, and
  graph applicability rather than a fixed workline count.
- Model proposal, deterministic compilation, permission enforcement, execution,
  evidence, independent review, acceptance, and release eligibility remain
  distinct states.
- Runtime contracts, compiler, local hooks, route consumers, and deterministic
  fixtures are implemented; no agent, branch, worktree, external action, or
  independent acceptance is created or implied by the lane.

## Scope

In:

- durable task-admission contract and implementation plan;
- one lane-local Task Graph for implementation and independent acceptance;
- schema, compiler, CLI, eval, hook, enforcement, route-consumer, security, and
  validation workline design;
- current-source conflict and coverage-defect preconditions; and
- active registry and spec-index projection.

Out:

- independently accepting the implemented contracts, compiler, hooks, routes,
  or tests;
- changing current W-004 ownership or acceptance state;
- delegating work or creating separate user-visible tasks;
- live/provider execution, external writes, commits, pushes, publication,
  deployment, or release claims.

## Source Ledger

| Source ID | Source / Authority | Path Or Tool | Version / Freshness | Supports | Status |
|---|---|---|---|---|---|
| `SRC-01` | user request | current task | 2026-08-04 current | objective and planning authorization | `AUTHORITATIVE` |
| `SRC-02` | contract | `docs/specs/task-admission-workload/contract.md` | revision 1 | `TA-001` through `TA-012` | `AUTHORITATIVE` |
| `SRC-03` | implementation plan and lane repair receipt | `docs/specs/task-admission-workload/implementation-plan.md`; current lane receipt | revision 41 | worklines, slices, traceability, validation | `AUTHORITATIVE` |
| `SRC-04` | current source | branch `master`, HEAD `4226bfa1f69f`, preserved dirty worktree | checked 2026-08-05 | runtime/config/eval boundaries and overlap | `AUTHORITATIVE_CURRENT_SOURCE` |
| `SRC-05` | active work | `docs/work/active.md`; W-004 lane | checked 2026-08-05 | shared-file ownership and serialization | `AUTHORITATIVE_CURRENT_STATE` |
| `SRC-06` | official Codex hooks | `https://learn.chatgpt.com/docs/hooks` | checked 2026-08-04 | prompt, pre-tool, permission, trust boundaries | `EXTERNAL_AUTHORITATIVE` |

## Compact Planning Context

### Definitions And Decisions

| ID | Definition Or Decision | Authority / Source | Consumers | Invalidation Rule | Status |
|---|---|---|---|---|---|
| `DEF-01` | Every request gets the cheap admission microkernel; expensive controls are conditional. | `SRC-02/TA-001` | all nodes | contract revision | `ACCEPTED` |
| `DEF-02` | Independent axes replace a scalar workload grade. | `SRC-02/TA-005` | policy and eval nodes | contract revision | `ACCEPTED` |
| `DEF-03` | Enterprise assurance, full scan, standard testing, and program topology compose independently. | `SRC-02/TA-007` | policy/compiler/eval nodes | policy revision | `ACCEPTED` |
| `DEF-04` | Model proposals never grant authority or enforce hard controls. | `SRC-02/TA-004,TA-008` | compiler/hook/security nodes | trust-boundary change | `ACCEPTED` |
| `DEF-05` | One W-031 lane serializes six worklines; no Coordination Graph at revision 2. | `SRC-03` | Task Graph | later lane split, parallel owner, or materialization join | `ACCEPTED` |
| `DEF-06` | Advisory prompt admission precedes hard-action enforcement and route migration. | `SRC-03/DEF-08` | N04 through N06 | failed shadow/security gate | `ACCEPTED` |

### Constraints, Questions, And Deferred Scope

| ID | Type | Statement | Impact | Resolution Route / Owner | Status |
|---|---|---|---|---|---|
| `Q-01` | `AUTHORITY` | Implementation and local hook activation required explicit authority. | authority was supplied by the 2026-08-04 implementation instruction; external actions remain separately permissioned | user implementation request | `RESOLVED` |
| `Q-02` | `CURRENT_SOURCE` | W-004 overlaps shared config, route, validator, and eval files in a dirty worktree. | root serialized the shared writes, regenerated the campaign catalog, and froze new W-004 evidence | W-031-N01/N06, root integration owner | `RESOLVED` |
| `Q-03` | `KNOWN_DEFECT` | `eval coverage --list-missing` passed array-callback arguments to `rootPath`. | replaced with an explicit unary callback; command now completes and truthfully reports current live coverage as `0/386` after source invalidation | W-031-N03 | `RESOLVED` |
| `Q-04` | `HOOK_RUNTIME` | Hook runtime must be bounded and network-free. | exact `npx --offline --yes bun@1.3.3` stdin/stdout fixtures passed; normal Codex trust review is still required on first use | W-031-N04 | `SATISFIED_LOCAL` |
| `Q-05` | `NEGATIVE_CONSTRAINT` | No hook may scan, call model/network, write durable state, create work, or expand authority at prompt submission. | failure blocks N04/N05 | GF-101 security gate | `ACCEPTED` |
| `Q-06` | `KNOWN_DEFECT` | Continuation requests using an inflected change verb such as `implementing` can be misclassified as `ANSWER`, suppressing simulation governance. | inflected change/operation forms are recognized; unit and corpus evidence cover the exact resumed request | W-031-N02/N03/N06 | `RESOLVED` |

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `S-001` | Given a conversation-only request, admission selects `NO_WORKFLOW + BASE` without a scan or lane. | direct classification fixture | `PASS_LOCAL` |
| `S-002` | Given a typo fix with local-write authority, admission selects `DIRECT_CHANGE + ATOMIC_CHANGE`. | atomic-change fixture and targeted-check contract | `PASS_LOCAL` |
| `S-003` | Given a small privileged credential rotation, assurance remains high and explicit approval is required. | risk/authority fixture | `PASS_LOCAL` |
| `S-004` | Given a medium CLI behavior change, admission selects a bounded plan and regression without a program graph. | bounded-change fixture | `PASS_LOCAL` |
| `S-005` | Given 12 related feature slices with shared state and a release join, admission selects a program and adaptive worklines. | program/replan fixture | `PASS_LOCAL` |
| `S-006` | Given prompt injection in retrieved content, policy and authority remain unchanged. | security fixture and deny trace | `PASS_LOCAL` |
| `S-007` | Given equal-priority conflicting policies, compilation fails closed with both policy IDs. | policy-conflict fixture | `PASS_LOCAL` |
| `S-008` | Given resume after source drift, only consumers of invalid claims and evidence reopen. | reclassification fixture | `PASS_LOCAL` |
| `S-009` | Given a stale hard-action envelope, PreToolUse denies before the side effect. | hook/tool receipt | `PASS_LOCAL` |
| `S-010` | Given a persistence recommendation without dispatch authority, no agent, task, branch, or worktree is created. | negative promotion fixture | `PASS_LOCAL` |
| `S-011` | Given an ordinary bounded actor/interface simulation, admission selects `BOUNDED + SIMULATION_GOVERNANCE` and `cascade-simulations:simulate` without campaign controls. | admission unit and corpus fixtures | `PASS_LOCAL` |
| `S-012` | Given current `exec_command` or `functions.exec_command` shell identities, destructive/external commands retain legacy `Bash` hard-action classification. | hook/tool classification fixtures | `PASS_LOCAL` |
| `S-013` | Given an explicit product campaign, calibration, repeated-run, or release request, admission selects connected delivery plus campaign simulation governance. | product-simulation route and policy fixture | `PASS_LOCAL` |
| `S-014` | Given a synthetic-persona simulation request, admission preserves persona-specific authority while keeping the route bounded unless explicit campaign escalation cues are present. | persona-simulation route and policy fixture | `PASS_LOCAL` |
| `S-015` | Given a continuation request using `implementing`, admission preserves `CHANGE` intent and simulation governance. | continuation-inflection unit and corpus fixtures | `PASS_LOCAL` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| task routing and skill selection | `TA-001` to `TA-011` | `AGENTS.md`, `CODEX.md`, `.codex/config.toml`, workflow skills | yes | direct answers and atomic changes stay lightweight | route corpus and Standards/Spec review | `PASS_LOCAL_REVIEW_PENDING` | `implement-change` |
| permission/tool enforcement | `TA-008`, `TA-012` | hooks and policy decisions | yes | prompt/tool content cannot grant authority | GF-101 negative probes | `PASS_LOCAL_REVIEW_PENDING` | `secure-design` |
| harness evaluations | all contract acceptance criteria | `harness-evals/`, eval CLI, generated catalog | yes | current 45-skill/386-scenario catalog remains valid; current live coverage is explicitly invalidated | catalog, self-test, coverage, admission corpus | `PASS_SHADOW_LIVE_NOT_RUN` | `harness-evaluation` |
| simulation claim/policy contracts | W-004 | `product-evals/`, campaign/runtime schemas | no | remain simulation-specific, no duplicate task-admission authority | hidden-consumer and compatibility review | `PASS_LOCAL_REVIEW_PENDING` | `architecture-review` |
| active work and dispatch | `TA-011` | `docs/work/`, orchestration routes | yes | planning/readiness never dispatches automatically | negative promotion and dispatch fixtures | `PASS_LOCAL_REVIEW_PENDING` | `orchestrate-work` |
| current direct workflow | `SRC-03` | boot route and target adapter defaults | yes | only admission is default; the full path is a conditional non-atomic fallback | full validation before route migration | `PASS_LOCAL_REVIEW_PENDING` | `validate-change` |

## Boundary Contracts

| Boundary ID | Producer / Authority | Consumer | Input / Output Contract | Compatibility / Invalidation | Required Check |
|---|---|---|---|---|---|
| `BND-01` | request/state normalizer | admission compiler | request digest, relation, intent, authority, trusted source refs | input change creates new envelope revision | schema fixtures |
| `BND-02` | model/probes | compiler | typed candidate claims; no authority grant | conflict or unverifiable hard claim blocks dependent control | claim tests |
| `BND-03` | policy registry | compiler | versioned predicates, precedence, controls, conflicts | policy digest change invalidates affected envelope | policy tests |
| `BND-04` | compiler | CLI/hooks/routes/evals | valid Task Envelope and explanation trace | consumers reject stale/invalid envelopes | compatibility tests |
| `BND-05` | hook adapters | Codex lifecycle | bounded advisory context or deterministic tool decision | no scan/network/model/write/authority expansion | hook fixtures |
| `BND-06` | route consumer | work registry | recommendation plus explicit persistence/dispatch authority | no auto-creation or dispatch | negative promotion tests |

## Coordination Graph Reference

| Coordination Graph | Plan / Graph Revision | This Lane / Workline | Owner | Projection Status |
|---|---|---|---|---|
| `NOT_APPLICABLE` | `plan 1 / lane graph 1` | `W-031 / WL-01..WL-06` | root integration owner | one serialized lane; re-evaluate on parallel/worktree split |

## Lane-Local Task Graph State

| Applicability | Reason / Boundary | Normal Rules Still Required |
|---|---|---|
| `GRAPH_SHAPED` | six connected obligations have accepted-gate dependencies, security/functional joins, bounded repair, and a resumable frontier | authorization, planning, review, validation, closeout |

| Graph Revision | Plan Revision | Lane-State Owner | Authoritative Records | Derived Projections | Instruction-Driven Limit |
|---|---|---|---|---|---|
| `2` | `41` | `orchestrator in the root task` | this Task Graph; Evidence Gates; amendments; lane-owner transitions/repairs | Current Frontier and `docs/work/active.md` | revision-40/r56 remains historical; revision-41 binds the current v41/core@42 source without self-acceptance |

### Graph Fragment Instances

| Fragment Instance | Source Fragment / Version | Disposition | Bound Ports | Actor / Skills | Tests / Evaluator | Owning Workline | Invalidation / Omission Rule |
|---|---|---|---|---|---|---|---|
| `FI-01` | `GF-001@1` | `SELECTED` | request objective -> product acceptance | orchestrator; plan-change, functional-qa | route acceptance fixtures; Spec reviewer | WL-01 | acceptance contract change reopens consumers |
| `FI-04` | `GF-004@1` | `SELECTED` | product acceptance -> shared contract | agent-engineer/root; architecture-review, plan-change, implement-change | schema/consumer compatibility; architecture reviewer | WL-01/WL-02, primary WL-01 | schema drift reopens bound consumers |
| `FI-08` | `GF-008@1` | `SELECTED` | compiler/hook outputs -> integration accepted | root integration owner; implement-change, validate-change | CLI/hook/route integration; integration reviewer | WL-04/WL-06, primary WL-06 | earliest failed producer plus affected consumers reopen |
| `FI-09` | `GF-009@1` | `SELECTED` | product acceptance + integration -> E2E accepted | orchestrator/root; functional-qa, validate-change | request-to-tool fixture; independent functional reviewer | WL-06 | E2E failure reopens earliest responsible workline |
| `FI-101` | `GF-101@1` | `SELECTED` | implementation output -> security assurance | security reviewer; secure-design, validate-change | risk-selected negative probes; independent security reviewer | WL-05 | security failure reopens affected design/contract/implementation |

All other catalog fragments are `NOT_APPLICABLE` for revision 2: no UI,
prototype, backend service, frontend client, persistence/migration,
accessibility, or visual behavior changes.

### Task Graph

| Node ID | Workline | Obligation | Requires Nodes | Requires Gates | External Conditions | Expected Receipt | Write Scope | Tools / Permissions | Per-Node Gate | Attempt / Max | Repair / Exhaustion | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `W-031-N01` | WL-01 | reconcile current source/W-004 overlap; implement schemas, catalog, policies, and trusted source-segment contract | none | none | `EXT-01`, `EXT-02` | version-bound contract bundle receipt | `.codex/task-admission/**`; narrow validator/docs | local filesystem, Git inspection, Bun; scoped writes after authorization; no external action | `W-031-G1` | `2/2 r41` | repair the earliest contract defect; after max replan | `REVIEW_R41_A2` |
| `W-031-N02` | WL-02 | implement pure compiler, CLI, trace, and reclassification | `W-031-N01` | terminal independent join per revision 2 | `EXT-01` | compiler/CLI receipt | admission source/tests and CLI wiring | local filesystem and Bun; scoped writes; no network or live tool action | `W-031-G2` | `2/2 r41` | repair compiler, clause, or prompt/tool parity; after max replan | `REVIEW_R41_A2` |
| `W-031-N03` | WL-03 | maintain the exact shadow corpus and metrics | `W-031-N02` | terminal independent join per revision 2 | `EXT-01` | complete shadow-eval receipt | admission eval schemas/cases and eval tests | local filesystem and Bun; deterministic fixtures; provider-backed semantic runs require separate authority | `W-031-G3` | `2/2 r41` | exact corpus now runs through TA-C981; after max replan | `REVIEW_R41_A2` |
| `W-031-N04` | WL-04 | implement advisory `UserPromptSubmit` adapter in a trusted fixture | `W-031-N03` | terminal independent join per revision 2 | `EXT-01`, `EXT-03` | bounded no-side-effect hook receipt | hook adapter/tests/config | trusted local hook fixture; no network/model call, project-state mutation, or external action | `W-031-G4` | `2/2 r41` | malformed input and timeout fail closed with exit 2; after max replan | `REVIEW_R41_A2` |
| `W-031-N05` | WL-05 | implement deterministic PreToolUse/PermissionRequest hard controls and security probes | `W-031-N04` | terminal independent join per revision 2 | `EXT-01`, `EXT-04` | enforcement and security receipts | narrow hook/policy/security files | local deny/allow fixtures; activation needs explicit authority; real side effects forbidden in tests | `W-031-G5` | `2/2 r41` | fresh GF-101 required for the current source; after max replan | `REVIEW_R41_A2` |
| `W-031-N06` | WL-06 | migrate route consumers, remove blanket default where superseded, and run terminal validation | `W-031-N05` | terminal independent join per revision 2 | `EXT-01`, `EXT-02` | integrated current-source receipt | boot/config/skills/docs/catalog/validator consumers | local filesystem, Git inspection, Bun; scoped writes; no broad stage, commit, push, publish, or deploy | `W-031-G6` | `2/2 r41` | current v41/core@42 working tree is frozen once at r58 before independent review | `REVIEW_R41_A2` |

### External Conditions

| Condition ID | Authority | Consumer Nodes | Satisfaction Rule | State | Invalidation / Block Route |
|---|---|---|---|---|---|
| `EXT-01` | user | N01-N06 | explicit implementation authorization for W-031 | `SATISFIED` | request amendment can invalidate scope |
| `EXT-02` | root integration owner and current source | N01, N06 | re-scan dirty paths and W-004 ownership; serialize or replan overlaps | `SATISFIED` | later shared-source drift reopens affected nodes |
| `EXT-03` | trusted Codex project/runtime | N04 | exact local hook command and protocol pass without network/model dependency | `SATISFIED_LOCAL` | first-use Codex hook trust remains an operator action |
| `EXT-04` | trusted authority host plus normal tool permission boundary | N05 | production host must select a current session-bound one-shot receipt and normal interactive approval must still allow the action; because that host is absent, current hard actions default-deny | `SATISFIED_LOCAL_DEFAULT_DENY` | production host and every external/privileged/destructive action remain `NOT_IMPLEMENTED/NOT_RUN` |

### Evidence Gates

| Gate ID | Subject | Required Evidence | Evaluator / Reviewer | Acceptance | State | Failure / Repair Route |
|---|---|---|---|---|---|---|
| `W-031-G1` | `W-031-N01` contract | schemas, policy/control corpus, validator, architecture compatibility review | independent architecture reviewer | all required current evidence passes | `REVIEW_R41_A2` | `W-031-N01` |
| `W-031-G2` | `W-031-N02` compiler | deterministic unit/CLI fixtures, trace and conflict/reclassification cases | independent code/Spec reviewer | exact outputs and typed failures pass | `REVIEW_R41_A2` | `W-031-N02` or `W-031-N01` on contract defect |
| `W-031-G3` | `W-031-N03` shadow | versioned exact corpus, zero over/under-control, catalog/self-test | harness evaluator independent from implementation output | no required shadow case missing/fail/gap/not-run | `REVIEW_R41_A2` | `W-031-N03`, `W-031-N02`, or `W-031-N01` by earliest cause |
| `W-031-G4` | `W-031-N04` advisory hook | exact offline runtime fixture, bounded output, zero forbidden prompt-hook side effects | integration reviewer | compiler equivalence and no-side-effect checks pass | `REVIEW_R41_A2` | `W-031-N04`; preserve direct bridge |
| `W-031-G5` | `W-031-N05` enforcement | hard deny/approval/stale/injection/non-interactive probes and GF-101 receipt | independent security reviewer | every hard-control case passes | `REVIEW_R41_A2` | earliest `W-031-N01/N02/N04/N05` owner |
| `W-031-G6` | `W-031-N06` terminal | request-to-tool functional receipt, full Cascade regression, fixed-point Standards/Spec review, residual risk | orchestrator joins independent inputs | every required current input passes; no dual admission authority | `REVIEW_R41_A2` | reopen earliest invalid producer/consumer |

### Legal Transitions And Repair

Nodes follow the shared lifecycle `PENDING -> READY -> IN_PROGRESS -> REVIEW ->
ACCEPTED`; failures or blocker resolution return through `PENDING` before
readiness is recalculated. Only the lane-state owner records transitions.
Worker or tool output proposes a transition and cannot self-accept a gate.

| Change Or Failure | Reopens | Preserves |
|---|---|---|
| request/contract/policy meaning changes | N01 and every named consumer of changed IDs | unrelated claims, policies, and cases |
| compiler-only defect | N02 and downstream gates | accepted N01 schema/policy evidence |
| eval fixture or coverage-runner defect | N03 and affected gate | accepted compiler evidence if inputs unchanged |
| advisory hook protocol/runtime defect | N04 and downstream | compiler and shadow corpus |
| hard-control/security failure | earliest responsible N01/N02/N04/N05 plus affected consumers | unrelated simple/medium route evidence |
| route-consumer drift | N06 and affected consumer checks | accepted compiler, shadow, hook, and security evidence with current inputs |
| plan topology/owner/gate change | new Graph Revision with new IDs where replaced | unaffected accepted evidence explicitly rebound |

### Current Frontier (Derived)

- Graph revision / plan revision: `2 / 41`.
- Ready: none.
- In progress: one root-owned evidence refresh for the unchanged revision-41
  behavior candidate; N01-N06 are not accepted or reopened as implementation
  repairs by this projection change.
- In review: none until a new immutable subject binds the current source.
- Root integration: immutable r64 is preserved as historical evidence, but its
  source binding has nine drift items and cannot receive current reviews.
- Blocked: acceptance pending a new current-source freeze and fresh independent
  receipts.
- Accepted: none.
- Open gates: `W-031-G1` through `W-031-G6`.
- External conditions: locally satisfied; first-use hook trust and every real hard
  action retain their normal operator/permission boundary.
- Next executable gate: freeze one new current-source immutable subject, then
  obtain exact architecture/harness, functional, and GF-101 reviews against it.
- Projection reconciliation: revision-41 is current at
  v41/`cascade-core@42` with 981 exact admission cases, persistence `587/587`,
  claims `789/789`, and zero over/under-control. The evaluator now records and
  rejects prohibited non-shell tool actions, and ordinary simulations remain
  bounded unless explicit campaign escalation cues are present. W-032 revision
  24 preserves intake-v6/action-binding-v2 behavior and rebinds that producer identity;
  G1-G4/G6/GT remain open or blocked and G5 is accepted. Immutable r55 is
  historical; immutable r57 and r64 are preserved history, and no current
  deterministic review candidate exists until the next freeze.
  This is not product-simulation execution or independent acceptance.

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| `docs/specs/task-admission-workload/**` | W-031 | write | contract and implementation plan authority |
| `docs/work/lanes/W-031-...`; W-031 active row | orchestrator | write | lane state and projection |
| `.codex/task-admission/**` | WL-01 | implemented write scope | runtime schemas, controls, and policies |
| `scripts/cascade/admission*`; CLI wiring | WL-02 | implemented write scope | compiler public boundary |
| `harness-evals/task-admission/**`; eval coverage repair | WL-03 | implemented write scope | evaluation only; no policy authority |
| hook adapter and `.codex/hooks.json` | WL-04/WL-05, root integration owner | implemented write scope | advisory and enforcement separated |
| `AGENTS.md`, `CODEX.md`, `.codex/config.toml`, affected skills/docs/validator | WL-06, root integration owner | implemented merge scope | serialized with current W-004 work |
| W-004 claims/policies/runtime/evidence | W-004 | read/protected | principles may be reused; types/authority remain separate |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| local filesystem/git/Bun | current-source inspection and planning validation | read; scoped docs writes authorized | preserve dirty work, exact commands/results |
| official Codex Hooks documentation | hook contract | read-only web source | source ID and checked date; no external instruction authority |
| model/network calls inside prompt hook | none | forbidden by contract | fail hook gate if observed |
| external systems, providers, paid tools | none in planning | not authorized | remain `NOT_RUN` |

## Selected Workline Map

| Workline | Outcome | Primary Criteria | Requires | Produces | Owner / Writes | Validation | Status |
|---|---|---|---|---|---|---|---|
| `WL-01` | schema/policy contract | `TA-002..TA-008` | sources and overlap preflight | shared contract | agent-engineer; `.codex/task-admission/**` | G1 | `IMPLEMENTED_IN_REVIEW` |
| `WL-02` | pure compiler/CLI | `TA-001..TA-009` | revision-2 local prerequisite | compiler receipt | agent-engineer; scripts/tests | G2 | `IMPLEMENTED_IN_REVIEW` |
| `WL-03` | corpus, metrics, coverage | all acceptance criteria | revision-2 local prerequisite | shadow receipt | agent-engineer; harness evals | G3 | `IMPLEMENTED_IN_REVIEW` |
| `WL-04` | advisory hook | `TA-001`, `TA-012` | shadow corpus, trusted runtime | advisory receipt | agent-engineer; hook adapter | G4 | `IMPLEMENTED_IN_REVIEW` |
| `WL-05` | hard/security controls | `TA-008`, `TA-012` | advisory fixture, enforcement authority | security receipt | agent-engineer + security reviewer | G5 | `IMPLEMENTED_IN_REVIEW` |
| `WL-06` | route migration/terminal join | `TA-010`, `TA-011`, terminal criteria | local implementation fixed point, overlap preflight | integrated receipt | root integration owner | G6 | `IMPLEMENTED_IN_REVIEW` |

## Parallel Dependencies

- Can run with: work that does not touch W-031 artifacts or its shared route,
  validator, hook, and generated-catalog consumers.
- Must wait for: independent review before any node or terminal gate is
  accepted; revision 2 allowed one serialized root implementation batch after
  each local prerequisite passed.
- Conflicts with: W-004 or user edits to shared config, route, validator, eval,
  claim/policy, or generated-catalog files; those require serialization or a
  later Coordination Graph replan.

## Handoff And Integration Contract

- Handoff summary: contract revision, policy/schema digests, compiler and
  corpus receipts, hook trust/runtime identity, security review, route diff,
  current source identity, and exact `NOT_RUN` gates.
- Required output: one current Task Envelope implementation and consumer path,
  with no dual authority.
- Integration owner: orchestrator in the root task.
- Immutable producer transport: not applicable while execution stays in one
  root worktree; re-evaluate before dedicated-worktree dispatch.
- Evidence to preserve: per-gate identities, current source/diff, selected
  policy versions, evaluator authority, failures, invalidation, and residual
  risk.
- Stop condition: G6 accepts current-source evidence; closeout then records
  implementation state without implying merge, deploy, or release eligibility.

## Replanning History

| Revision | Trigger | Preserved | Changed / Added | Invalidated / Superseded | Worklines Re-evaluated | Evidence Impact |
|---|---|---|---|---|---|---|
| `1` | initial planning/worklane request | current routing, permission, graph, and evidence semantics | contract, six worklines, Task Graph, gates | scalar grade and prompt/workline/hook-only approaches rejected | all | implementation evidence starts `NOT_RUN` |
| `2` | user instructed implementation until done; independent reviewers were not authorized | six worklines, gate owners, no-auto-dispatch and permission boundaries | serialized root implementation may continue across locally green prerequisites; independent acceptance remains terminal | planning-only and strict per-node review serialization superseded | all | N01-N06 reach `REVIEW`; G1-G6 remain open |
| `3` | W-032 consumes admission for simulation authoring/execution and current hook tool names differ from legacy `Bash` | six worklines, Task Graph topology, permission boundary, separate W-004 action-policy authority | `TAP-011`, `SIMULATION_GOVERNANCE`, two corpus cases, and shell-tool normalization | 10-policy/9-control and 12-case evidence superseded | N01-N03, N05-N06 | 11 policies, 10 controls, 14/14 corpus, and 19 focused tests pass locally; independent gates remain open |
| `4` | fixed-point review found `TAP-011` had not advanced the admission policy-bundle identity | six worklines, Task Graph topology, policy/control meaning, route results, permission boundary | policy bundle advances to `cascade-core@2`; stale bundle-1 envelopes fail closed | bundle-1 envelope evidence superseded | N01-N03, N05-N06 | admission corpus and 19 focused tests pass locally; independent gates remain open |
| `5` | resumed admission classified `continue implementing ... simulation workload` as read-only because intent matching omitted inflected change verbs | graph revision 2, policy/control semantics, permission boundary, independent gates | recognize bounded verb inflections and add `TR-15`; N02/N03/N06 repair attempt 2 returns to review | prior continuation-route evidence and 14-case/19-test counts superseded | N02, N03, N06 | 15/15 corpus, 20 focused tests, and 153-test regression pass locally; independent gates remain open |
| `6` | authorized independent reviews failed G1/G2/G3/G5/G6 | six worklines, graph revision 2, no-auto-approval, prompt-hook no-side-effect boundary | integrity-bound envelope, atomic claims, relation/intent correction, control closure, exact corpus/schema gate, fail-closed current-tool enforcement, runtime reclassification, secret minimization | revision-5 fixed point and every dependent W-032 intake identity | all | repair attempt 3 starts from N01; fresh independent receipts required |
| `7` | revision-6 attempt limits were exhausted by fresh architecture, harness, functional, and security failures | six-node topology, local advisory hook, normal approval boundary, passing schema/closure/bounded-hook work | trusted authority/current-revision seam, fail-safe shell/MCP/wrapper classification, negation-aware relation tags, atomic claims, multi-turn persistence, read-only contract near-misses, expanded secret keys, and stale evidence repair | attempt-3 receipt, 15-case sufficiency claim, every W-032 admission binding | all | explicit two-attempt repair cycle begins; no gate resets silently and fresh independent receipts remain mandatory |
| `40` | current source advanced after r55 through proportional simulation routing, harness-impact gating, and held-out clause repairs | graph revision 2, six worklines, accepted definitions, hard-action boundary, and all historical receipts | Task Envelope/schema/catalog/case set v41, `cascade-core@42`, 981 cases, current route consumers, W-032 producer parity, and immutable r56 | revision-39/r55 currentness only; its evidence remains historical | all current gates | `981/981`, persistence `587/587`, claims `789/789`, and `209/209` focused tests pass locally; immutable r56 is current and independent review remains |
| `41` | fixed-point review found stale blanket simulation examples and evaluator trace safety ignored non-shell tool items | graph revision 2, v41/core@42 compiler, 981-case corpus, proportional controls, and all historical receipts | ordinary simulation versus campaign examples, fail-closed tool-action trace eligibility, 45-skill/386-scenario catalog, and immutable r58 | revision-40/r56 currentness only; its artifact remains historical | N03 and N06 plus every source-sensitive terminal gate | `981/981` admission and `482/482` complete repository tests pass; immutable r58 is current and independent review remains |

### Revision 7 Attempt 2 Repair

Attempt-1 receipts `W031-R7-GF004-GF008-REVIEW-20260805-A1`,
`W031-HARNESS-REVIEW-20260805-R7-A1`, `W031-R7-A1-GF101-20260805`, and
`W031-GF009-R7-A1-20260805` failed. Attempt 2 must recompute every derived
route/control/trace/persistence field from a bound canonical classification
input; preserve positive clauses after comma-prefixed negation; split common
`and require` criteria; keep mutation nouns in explicit read-only requests
read-only; fail-safe remaining curl/find/MCP variants; redact prefixed and
quoted secret keys; update the W-032 consumer trust seam; and correct CODEX and
current evidence projections. The public envelope remains advisory and the
production host bridge remains `NOT_IMPLEMENTED/NOT_RUN`.

Implementation receipt `W031-R7-EXEC-20260805-A2` is bound to the repaired
source. The public bundle is `cascade-core@5`, schema/catalog/case-set version
`4`, and every compiler-owned envelope field is re-derived from canonical
redacted input. Optional external request/source bindings are checked exactly;
they identify the expected source but do not authenticate its origin. The
current hook has no production `TrustedAuthorityHost`, hard actions deny by
default, and the host authenticity/currentness/atomic-consumption boundary
remains `NOT_IMPLEMENTED/NOT_RUN`.

Local evidence passes 40 admission tests, the exact 25-row corpus with zero
over/under-control, 71 focused admission/intake/simulation/definition tests,
and the complete 189-test regression. Provider-backed harness coverage remains
`0/368 NOT_RUN`. These are review candidates, not independent acceptance.

### Revision 8 Explicit Exhaustion Replan

Revision-7 attempt 2 exhausted its declared `2/2` budget. Receipts
`W031-R7-GF004-GF008-REVIEW-20260805-A2`,
`W031-HARNESS-REVIEW-20260805-R7-A2`, `W031-R7-A2-GF101-20260805`, and
`W031-GF009-R7-A2-20260805` failed G1/G2/G3/G5/G6. This revision preserves the
repaired exact re-derivation, A1 read-only noun cases, atomic criteria,
shell/MCP classifiers, named-secret redaction, no-host default deny, and N04
advisory-hook evidence.

Revision 8 authorizes two bounded repair attempts for affected nodes. Attempt 1
must reject or identity-bind requests beyond the 4,000-character classifier
window; preserve `continue|resume` after negative prefixes; distinguish
`change nothing` from common compound mutation requests such as `make changes`,
`apply fixes`, `correct errors`, and `patch the bug`; extend the exact corpus;
redact standalone `ASIA`, Stripe secret/restricted, and webhook-token formats;
and make W-032's public CLI plus run gate carry and revalidate exact external
request/source bindings. It also corrects the requirements-only wording and
stale revision projection. Fresh fixed-point receipts are required; no gate is
reset to accepted.

Revision-8 attempt-1 implementation receipt
`W031-R8-W032-R9-EXEC-20260805-A1` is current. Schema, catalog, and case-set are
version `5` under `cascade-core@6`. The full redacted request is identity-bound
up to 65,536 characters while the independently digest-bound classification
projection remains capped at 4,000. The exact 32-case corpus covers the new
polarity and compound-mutation edges, standalone AWS/Stripe credential formats
are redacted, and the W-032 public CLI/run gate now persists and revalidates
exact external request/source bindings. The requirements-only envelope remains
advisory and cannot authorize a campaign.

Local evidence passes 42 admission tests, 75 focused admission/intake/
simulation/definition tests, the exact `32/32` corpus with zero over/under-
control, and the full `195/195` regression with 834 expectations. Catalog
`e1e82b2d...` and immutable r18 evidence are current. Provider coverage remains
`0/368 NOT_RUN`; production authority-host integration remains
`NOT_IMPLEMENTED/NOT_RUN`.

### Revision 8 Attempt 2 Final Repair

Receipts `W031-R8-GF004-GF008-REVIEW-20260805-A1`,
`W031-HARNESS-REVIEW-20260805-R8-A1`, and
`W031-R8-A1-GF101-20260805` failed G1/G2/G3/G4/G6; GF-009 and the W-031 G5
security contribution passed. Attempt 2 is the final revision-8 repair.

It must reject over-limit raw requests before expensive normalization so no
accepted suffix is invisible to classification; make the cheap prompt hook
linear and bounded; repair continuation negation; keep read-only resume/
several/multiple/dependent/long-running work out of change-delivery controls;
generalize mutation and `change nothing` grammar; correct TA-C027 and adjacent
corpus cases; version the breaking W-032 intake shape with explicit legacy
disposition; and read/hash/parse envelope snapshots once through the bounded
nofollow regular-file primitive. The production authority host remains absent,
and no repair grants execution authority.

Final implementation receipt `W031-R8A2-W032-R10A3-EXEC-20260805` is current.
Admission schema/catalog/case-set v6 and `cascade-core@7` reject raw requests
above 4,000 characters before normalization; every accepted character shares
one exact identity/classification surface. Read-only duration/dependency terms
no longer pull change controls, the named continuation/compound grammar passes,
and the exact corpus is `40/40`. Intake schema v2 explicitly rejects v1 with a
stable recompile requirement and uses one bounded nofollow buffer for snapshot
hash, parse, and validation at compile and READY/run gates.

Local evidence passes 45 admission tests, 80 focused admission/intake/
simulation/definition tests, `40/40` corpus cases with zero over/under-control,
and `202/202` aggregate tests with 927 expectations. Catalog `80ce2c96...` and
immutable r19 evidence are current. Provider coverage remains `0/368 NOT_RUN`;
the production authority host remains `NOT_IMPLEMENTED/NOT_RUN`.

### Revision 9 Attempt 1 Fixed Point

Implementation receipt `W031-R9A1-EXEC-20260805` advances admission schema,
catalog, and case set to v7 and the policy bundle to `cascade-core@8`.
Mutation grammar covers article/singular/plural correction and patch forms;
negated pause/abort/halt/cancel/stop forms preserve continue/resume with
read-only review/validate intent. Public CLI and hook envelope reads consume
one hardened bounded buffer.

Local evidence passes 46 admission tests, the 48/48 corpus with zero over- or
under-control, and the complete `209/209` regression with 1037 expectations.
Catalog `8bb094b2...` and immutable r20 manifest `3e7c22b5...` are current.
Fresh G1-G6 independent review remains required; provider coverage remains
`0/368 NOT_RUN` and the production authority host remains
`NOT_IMPLEMENTED/NOT_RUN`.

### Revision 9 Attempt 1 Review And Final Repair

Receipts `W031-HARNESS-REVIEW-20260805-R9-A1` and
`W031-R9-GF004-GF008-REVIEW-20260805-A1` failed quantified/object-qualified
mutation forms and negated continuations containing ordinary connectors,
politeness, or dash punctuation. The architecture receipt also found stale
current identity, evidence, and authority-help projections. Functional and
security receipts passed and are preserved subject to source drift.

Final attempt 2/2 must generalize those semantic classes, add adjacent corpus
rows with new identities, clarify the authority candidate in public help, and
refresh every current projection. Another semantic repeat failure exhausts
revision 9 and requires a new plan revision.

### Revision 9 Attempt 2 Final Fixed Point

Implementation receipt `W031-R9A2-EXEC-20260805` advances admission schema,
catalog, classifier, and case set to v8 and the policy bundle to
`cascade-core@9`. The bounded grammar now covers object-qualified and quantified
mutation imperatives plus connector/politeness/dash negated continuations;
root help labels authority input as an untrusted non-grant candidate.

Local evidence passes 46 admission tests, exact `68/68` corpus cases with zero
over- or under-control, 82 focused tests with 620 expectations, and the full
`211/211` regression with 1185 expectations. Catalog `5f3d6c01...` and valid
r21 manifest `7f680af1...` are current. Fresh final independent review remains
required; provider coverage stays `0/368 NOT_RUN` and the production authority
host remains `NOT_IMPLEMENTED/NOT_RUN`.

## Compact Resume Contract

- Authoritative sources: `SRC-01` through `SRC-06`; detailed definitions live
  in the contract and plan, not this projection.
- Decisions: cheap universal microkernel, independent axes, composable controls,
  deterministic compiler, staged advisory/enforcement rollout, one serialized
  lane.
- Negative constraints: no auto-workline, auto-dispatch, scalar grade,
  prompt-hook scan/model/network/write, authority expansion, or hook-based
  auto-approval.
- Worklines: WL-01 -> WL-02 -> WL-03 -> WL-04 -> WL-05 -> WL-06.
- Changed artifacts: versioned admission contracts/policies/compiler/CLI,
  430-case corpus, hook adapter, docs, and focused tests.
- Open conditions: independent architecture, code/spec, integration,
  functional, harness, and security review. Live/provider coverage was not run
  for revision 21 and is not represented as a pass.
- Next executable gate: independent review and the G1-G6 evidence join.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| spec/lane/reference validation | `npx --yes bun@1.3.3 scripts/cascade.ts validate` | revision-26 `FAIL_EXTERNAL_TO_OWNED_SLICE`: 9 agents, 44 skills, zero project-specific leakage; root-owned `simulation-intake-agent-bridge/brief.generated.md` is stale |
| generated eval catalog remains current | `npx --yes bun@1.3.3 scripts/cascade.ts eval catalog --check` | `PASS`: 44 skills, 368 scenarios, catalog `67607bcf...` |
| harness, target, and campaign self-tests | exact AGENTS.md commands | `PASS`; campaign calibration `CALIBRATED`, release scope `NOT_RUN` |
| admission registry and corpus | `admission validate`; `admission corpus` | revision-26 `PASS_LOCAL`: cascade-core@28, 12 policies, 10 controls, 430/430 cases, persistence 391/391, claims 302/302, zero over/under-control |
| focused admission and hook tests | `npx --yes bun@1.3.3 test ./scripts/cascade/admission.test.ts` | revision-26 `PASS_LOCAL`: 112 tests, 1,958 assertions |
| owned compiler/hook TypeScript | focused Bun compile/test path | revision-26 admission suite `PASS_LOCAL`; standalone `tsc` is not configured in the repository and was `NOT_RUN` |
| complete local regression | `npx --yes bun@1.3.3 test scripts/cascade` | revision-26 diagnostic `339/346 PASS`, 3,653 assertions; seven shared/root projection failures: two starter refinement fixtures, four campaign resume fixtures blocked by stale catalog, and one stale generated brief |
| planning diff integrity | scoped `git diff --check` and reference searches | `PASS` |
| eval coverage baseline | `npx --yes bun@1.3.3 scripts/cascade.ts eval coverage --list-missing --allow-incomplete` | revision-14 producer `NOT_RUN`; historical results are not promoted |
| exact offline hook protocol | `UserPromptSubmit`, denied hard action, and session-bound envelope fixtures | focused unit fixtures `PASS_LOCAL`; live trusted host `NOT_IMPLEMENTED/NOT_RUN` |
| runtime/compiler/hook/security/functional evidence | W-031-G1 through G6 | revision-25 independent reviews `FAIL`; revision-26 rerun `NOT_RUN` |

## Status Reconciliation

- Last checked: `2026-08-06`.
- Source identity: `master@4226bfa1f69f` plus preserved dirty worktree with
  runtime, public schema, corpus, tests, generated projections, and docs edits.
- Completion disposition: `KEEP_OPEN_IN_REVIEW`.
- Reason: implementation and local deterministic evidence are complete, but
  the same root actor cannot supply the independent GF-004/GF-008/GF-009/
  GF-101 or harness-review receipts required for acceptance.
- Synchronized surfaces: owned contract, plan, and lane packet only. The active
  registry and W-032 consumer were intentionally not touched by this producer.

## Closeout

- Handoff or integration evidence: current implementation packet and local
  receipts are ready for independent review.
- Report: this lane and the implementation plan are the durable handoff.
- Remaining risk: independent policy/security calibration, first-use hook
  trust, hosted/specialized tools outside hook coverage, current live harness
  coverage, merge/deploy/release evidence, and external hard actions remain
  unexecuted.

### Revision 10 Attempt 1 Fixed Point

- Receipt `W031-R10A1-EXEC-20260805` advances the schema, catalog, classifier,
  and case set to v9 and the policy bundle to `cascade-core@10`.
- Clause-aware bounded token semantics pair every supported mutation verb with
  every mutation noun, allow qualifiers within the accepted request bound,
  preserve conversation-only explanations as read-only, and recognize
  positive continue/resume clauses after real separators without allowing a
  negated prefix to erase them.
- Admission tests pass `46/46` with 620 assertions; the exact corpus passes
  `88/88` with zero over- or under-control; the complete suite passes
  `213/213` with 1357 assertions.
- Catalog `1e448871...` and immutable r22 manifest `638aa50b...` are current.
  Fresh independent G1-G6 receipts remain required. Provider coverage stays
  `0/368 NOT_RUN`; the production authority host remains
  `NOT_IMPLEMENTED/NOT_RUN`.

### Revision 10 Attempt 1 Review And Final Repair

Receipts `W031-HARNESS-REVIEW-20260805-R10`,
`W031-GF009-R10-A1-W032-COMPAT-20260805`,
`W031-R10-A1-W032-R12-A1-GF101-20260805`, and
`W031-R10-GF004-GF008-REVIEW-20260805-A1` failed attempt 1. The repair must:

- add ordinary and indirect mutation imperatives plus compound imperative
  clauses, while preventing noun/future `resume` and unrelated numbers from
  activating continuation or program controls;
- recognize the remaining explicit continuation separators without broad
  token-presence heuristics;
- represent source-labelled request spans/claims so untrusted quoted or
  retrieved text cannot request authority or become a user-provided mutation,
  while a separate genuine user clause remains actionable; and
- align public date-time validation and freshness with strict finite RFC 3339
  instants, including calendar validity and arbitrary fractional precision.

The final attempt must advance coherent admission identities and corpus cases,
preserve requirements-only authority/default deny, and rebind W-032 claim
provenance. Provider execution and production authority remain unchanged.

### Revision 10 Attempt 2 Final Fixed Point

Final implementation advances admission to schema/case/classifier v10 and
`cascade-core@11`. Source-labelled request spans are closed and digest-bound;
external spans cannot emit requested authority or user mutation claims, while
separate direct user clauses remain actionable. The final semantics cover the
reviewed add/compound/indirect/continuation cases without noun-resume or numeric
program over-control.

Exact local evidence is 49 admission tests, `100/100` corpus cases with zero
over/under-control, and `222/222` aggregate tests with 1426 assertions. Catalog
`34c1d08e...` and immutable r24 manifest `34cdd12e...` are current. Final
independent G1-G6 acceptance remains open; provider coverage stays
`0/368 NOT_RUN` and the production authority host remains
`NOT_IMPLEMENTED/NOT_RUN`.

### Revision 10 Attempt 2 Review And Revision 11 Replan

Independent architecture, harness, functional, and security receipts fail
revision 10 attempt 2. The common root cause is that a digest-closed lexical
partition can replay its own wrong `USER`/`EXTERNAL_SOURCE` label: finite source
markers, escape-unaware quote closure, and ambiguous boundaries can upgrade
ticket/page/tool text into direct-user authority. Reviews also reproduced
missed mutation clauses after `but`, line breaks, and list markers; missed
continuations across parenthetical/bracket/brace/single-hyphen boundaries; an
over-controlled host-local `update_plan`; and non-finite/exact-expiry clocks
that do not fail closed.

Revision 11 reopens N01-N03 and N05-N06. It must version a structured trusted
source-segment/direct-user attestation contract, conservatively handle lexical
fallback, repair common clause and continuation boundaries, classify local
plan/input/wait/status operations separately from hard actions, and reject
non-finite or expired-at-this-instant authority. The adversarial corpus must
cover issue body, pasted text, retrieved page, tool result, nested/escaped
quotes, multiline/list prompts, `but`, and the reviewed time boundaries. W-032
must consume the new provenance version explicitly rather than silently
reinterpreting intake v3. No production authority host, provider run, hard
external action, promotion, deployment, or release is authorized by this
replan.

### Revision 11 Attempt 1 Fixed Point

Receipt `W031-R11A1-EXEC-20260805` advances the contract to schema v11 and
`cascade-core@12`. Host-verified segments/direct-user attestation bind
hard-action provenance; lexical fallback remains advisory. The reviewed quote,
multiline, clause, continuation, host-local workflow, and expiry edges have
permanent regressions.

Admission tests pass `53/53`, the exact corpus passes `112/112` with zero
over/under-control, and the complete suite passes `228/228` with 1498
assertions. W-032 intake v4 replays the exact provenance projection; catalog
`3a32a9a6...` and immutable r25 manifest `f8aa1b11...` are current. Independent
G1-G6 acceptance, the production authority host, provider coverage, real hard
actions, promotion, deployment, and release remain open or `NOT_RUN` as
applicable.

### Revision 11 Attempt 1 Review And Final Attempt 2 Replan

Attempt-1 receipts preserve the trusted-attestation and closed-derivation
architecture but fail G3/G5/G6. The final attempt must use exact RFC 3339
comparison for envelope and receipt freshness; classify content-loss Git and
filesystem commands as destructive; allow common bounded local validation and
known read commands without treating them as external writes; recognize
namespaced host-local workflow tools; narrow external markers so ordinary
`document, then ...` clauses remain direct user instructions while pasted,
copied, and clipboard text stays external; and make `apply_patch` destructive
only for a real delete-file header. Add permanent hook, corpus, and
nanosecond-boundary regressions. W-032 must be rebound after the producer
changes. Production authority, provider coverage, real hard actions, and
release remain `NOT_RUN`.

### Revision 11 Final Attempt 2 Fixed Point

Receipt `W031-R11A2-EXEC-20260805` advances the producer coherently to schema
v12, `cascade-core@13`, and a 119-case corpus. Exact nanosecond freshness,
destructive content-loss classification, bounded local validation/known reads,
namespaced host-local tools, narrowed comma markers, pasted/copied/clipboard
provenance, and precise patch-delete detection have permanent tests.

Admission tests pass `56/56` with 758 assertions; corpus passes `119/119` with
zero over/under-control; the complete suite passes `233/233`. W-032 intake v4
is rebound to Task Envelope v12. Catalog `5b3240ce...` and immutable r26
manifest `4bde207c...` are current. Independent acceptance, production
authority hosting, provider coverage, real hard actions, and release remain
open or `NOT_RUN`.

### Revision 11 Attempt Exhaustion And Revision 12 Attempt 1 Replan

Revision-11 attempt 2 of 2 is exhausted after fresh independent probes found
under-control in destructive shell classification and nested patch deletion,
plus over-control in bounded reads and destructive language used for review or
explanation. Revision 12 reopens N01-N06 for one changed attempt.

Attempt 1 must classify content-loss Git checkout/switch/clean/worktree forms
and `/dev/null` copies as destructive; recognize indented delete-file headers
inside `functions.exec`; and fail closed when a nested patch body is dynamic or
otherwise not statically provable as non-deleting. It must also admit the
reviewed bounded Docker, Kubernetes, GitHub, and Git reads; recognize natural
pasted-source introductions; and bind destructive tags to actual change or
operation intent so reviews and explanations remain read-only while real
delete requests retain hard-action controls. Direct compiler, hook, corpus,
and paired positive/negative regressions are required.

Because these semantics change the public producer, schema, classifier,
policy-bundle, catalog, and exact case-set identities advance together. Local
evidence may move the candidate only to `REVIEW`; independent G1-G6 receipts,
the production authority host, provider execution, real hard actions,
promotion, deployment, and release remain `NOT_RUN` and cannot be supplied by
this implementation actor.

### Revision 12 Attempt 1 Integrated Fixed Point

Receipt `W031-R12A1-EXEC-20260805` advances admission coherently to schema,
classifier, catalog, and case-set v13 with `cascade-core@14`. Admission tests
pass `57/57` with 798 assertions; the exact corpus passes `124/124` with zero
over-control and zero under-control. The complete repository suite passes
`236/236` with 1654 assertions, all repository checks pass, and PB-002 replays
the exact v13 producer. Catalog `fd162524...` and immutable r27 manifest
`3af061c0...` are current. The reproducible W-031 runtime/schema/corpus diff
digest is
`80c3fd74462d14f514c9bfe390a0057762dda7a6da2170e93c3d76b3b46dd48b`.

This is a review candidate only. Independent G1-G6 acceptance, production
authority hosting, provider coverage, real hard actions, promotion,
deployment, and release remain open or `NOT_RUN`.

### Revision 12 Attempt Exhaustion And Revision 13 Attempt 1 Replan

Fresh revision-12 probes exhausted that attempt after finding shell
composition and command-flag under-control, incomplete nested capability
discovery, missing destructive variants, unsafe permission-mode deferral,
claim-ID preservation across changed semantics, destructive-vocabulary
cross-product errors, incomplete natural source introductions, and advertised
claim kinds collapsing to `OUTCOME`. Revision 13 reopens N01-N06 for one
changed attempt without changing graph revision 2 or expanding authority.

Attempt 1 must fail closed on shell pipes, background execution,
substitutions, process substitution, unknown composition, and command-specific
write/config flags; recognize nested destructured, optional-chain,
parenthesized, aliased, and computed capabilities; and classify unresolved
capability or command/patch composition as destructive. It must expand
destructive Git, filesystem, PowerShell, infrastructure, package, and MCP
variants; bind hard actions to an explicit safe-interactive permission-mode
allowlist; preserve claim IDs only under canonical claim, intent, and
provenance equality; distinguish meta-work about destructive vocabulary from
actual destructive intent; extend copied/pasted/clipboard/read framing; and
implement current-state, boundary, hazard, and evidence claim contracts.

### Revision 13 Attempt 1 Integrated Fixed Point

Receipt `W031-R13A1-EXEC-20260805` advances admission coherently to schema,
classifier, catalog, and case-set v14 with `cascade-core@15`. Admission tests
pass `60/60` with 892 assertions; registry validation passes for 12 policies,
10 controls, and 131 cases; and the exact corpus passes `131/131` with zero
over-control and zero under-control. Direct regression probes confirm shell
composition and unknown nested capability fail closed, command-specific write
flags retain local/destructive controls, known reads remain read-only, bare
copied/pasted introductions become external-source spans, destructive
meta-work remains local, actual removal intent blocks, and the four advertised
claim kinds are emitted.

W-032 intake v5 replays this exact producer and the complete repository suite
passes `246/246` with `1819` assertions. Every repository gate passes, catalog
`25cfaa0c...` is current, and immutable r28 verifies 91 files at manifest
`89a4c18f...` with `release_eligible=false`.

This producer receipt remains a review candidate only. Independent G1-G6
acceptance including GF-004, GF-008, GF-009, and GF-101, the production trusted
authority host, provider coverage, real hard actions, promotion, deployment,
and release remain `NOT_RUN` or `NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 13 Attempt Exhaustion And Revision 14 Attempt 1 Replan

Fresh revision-13 review probes exhausted that attempt. They reproduced missed
optional-computed capabilities, static-decoy laundering of later dynamic exec
calls, descriptor-duplication over-control, command-flag and cloud-read token
errors, missing destructive MCP synonyms, incomplete natural pasted-review and
destructive-intent phrasing, label-only specialized claims, and duplicate
claim-ID reuse during reclassification.

Revision 14 reopens N01-N06 for one changed attempt without changing graph
revision 2 or expanding authority. The repair must classify every nested
capability, parse literal command bodies per call, distinguish descriptor
duplication from file writes, anchor command/cloud verbs, preserve natural
external-source framing, emit semantic specialized claim contracts, consume
prior claims injectively, and separate real destructive requests from
destructive-vocabulary meta-work.

### Revision 14 Attempt 1 Integrated Fixed Point

Receipt `W031-R14A1-EXEC-20260805` advances admission coherently to schema,
classifier, catalog, and case-set v15 with `cascade-core@16`. Admission tests
pass `62/62` with 936 assertions; registry validation passes for 12 policies,
10 controls, and 140 cases; and the exact corpus passes `140/140` with zero
over-control and zero under-control.

Direct regressions cover optional/static/dynamic nested capabilities, per-call
decoy isolation, descriptor duplication and file redirection, reviewed
find/sed/curl/helm/AWS/Azure flags, destructive MCP synonyms, natural
copied/pasted review introductions, semantic claim consumers/invalidation,
injective duplicate lineage, and destructive versus meta-work phrasing.

W-032 intake v5 replays the exact schema-v15 producer. The complete repository
suite passes `257/257` with `1888` assertions, all repository gates pass,
catalog `acd7f8ee...` is current, and immutable r29 verifies 91 files at
manifest `f9f2e314...` with `release_eligible=false`.

This producer receipt remains a review candidate only. Fresh independent
G1-G6 acceptance including GF-004, GF-008, GF-009, and GF-101, production
trusted authority hosting, provider coverage, real hard actions, promotion,
deployment, and release remain `NOT_RUN` or `NOT_IMPLEMENTED/NOT_RUN` as
applicable.

### Revision 14 Review Failure And Revision 15 Attempt 1 Replan

Fresh revision-14 probes failed residual effect classification for `sed -n`
execution and `s///w`, `find -fprint0`, Bash `{fd}>`, curl `--stderr`/`--hsts`/
`--alt-svc`, destructive AWS/Azure verbs, and MCP unlink/prune/terminate/empty/
rmdir/shred variants. They also failed the named natural paste/clipboard
framings, reviewed/explained proposed actions, `help me remove` requests, and
unlabeled natural current-state/boundary/hazard/evidence probes.

Revision 15 reopens N01-N06 for one changed attempt without changing graph
revision 2 or expanding authority. W-004, W-032, active projections, generated
artifacts, production hook activation, provider execution, and real hard
actions remain protected or `NOT_RUN`.

### Revision 15 Attempt 1 Integrated Fixed Point

Receipt `W031-R15A1-EXEC-20260805` advances admission coherently to schema,
classifier, catalog, and case-set v16 with `cascade-core@17`. Focused admission
tests pass `63/63` with 1,000 assertions; registry validation covers 12 policies,
10 controls, and 151 cases; and the exact corpus passes `151/151` with zero
over-control and zero under-control.

Direct unit and hook regressions cover every revision-15 shell/cloud/MCP
residual plus paired read-only controls. Corpus cases cover all named natural
external-source and destructive/meta-intent framings and semantic claim kinds.

After root-owned projection regeneration, every repository gate passes, the
complete suite passes `262/262` with `2001` assertions, campaign catalog
`1adbe379...` is current, and immutable fixture
`wg001-attempt20-review-20260805-r30` verifies 91 files at manifest
`df6b1da1...` with fixture evaluation `PASS` and
`release_eligible=false`.

This receipt proposes `IN_PROGRESS -> REVIEW`; it does not self-accept G1-G6.
Fresh independent architecture, harness, functional, and security review,
production authority hosting, provider coverage, real hard actions, promotion,
deployment, and release remain `NOT_RUN` or `NOT_IMPLEMENTED/NOT_RUN` as
applicable.

### Revision 15 Independent Review Failure And Revision 16 Attempt 1 Replan

Fresh revision-15 independent probes failed numeric/regex/step-addressed
`sed -n` write and execute effects, option-interspersed and compound AWS/Azure
actions, and their paired read controls. They also failed generalized polite
destructive requests, first-person pasted/copied attribution, review/explain
proposed-action framing, and natural specialized-claim variants with paired
meta/change negatives.

Revision 16 reopens N01-N06 for one changed attempt without changing graph
revision 2 or expanding authority. W-004, W-032, active projections, generated
artifacts, production hook activation, provider execution, and real hard
actions remain protected or `NOT_RUN`.

### Revision 16 Attempt 1 Integrated Fixed Point

Receipt `W031-R16A1-EXEC-20260805` advances admission coherently to schema,
classifier, catalog, and case-set v17 with `cascade-core@18`. Focused admission
tests pass `63/63` with 1,041 assertions; registry validation covers 12 policies,
10 controls, and 160 cases; and the exact corpus passes `160/160`. Every
relation, intent, workload, route, control, skill, and blocker metric is
`160/160`; persistence is `121/121`, claims are `32/32`, and over-control and
under-control are both zero.

Direct unit and public-hook regressions cover all revision-16 shell/cloud,
provenance, intent, and claim families with paired read-only, meta-work, and
change-outcome negatives. No trusted host was activated and no hard action ran.

After root-owned W-032 brief and campaign-catalog regeneration, every repository
gate passes and the complete suite passes `265/265` with `2062` assertions.
Campaign catalog `02265b76...` is current. Immutable fixture
`wg001-attempt21-review-20260805-r31` verifies 91 files at manifest
`2edd58b2...`, fixture evaluation `PASS`, and `release_eligible=false`.

This receipt proposes `IN_PROGRESS -> REVIEW`; it does not self-accept G1-G6.
Fresh independent architecture, harness, functional, and security review is
the next gate. Production authority hosting, provider coverage, real hard
actions, promotion, deployment, and release remain `NOT_RUN` or
`NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 16 Independent Review Failure And Revision 17 Attempt 1 Replan

Fresh revision-16 probes failed print-only `sed` long/combined flags and
alternate-delimiter address forms, four additional polite destructive request
forms, copied/pasted/clipboard/proposed-action/Slack-drop provenance framings,
and ordinary current-state, boundary, hazard, and evidence clauses. The repair
remains limited to W-031 admission runtime/tests, public contracts, corpus, and
lane docs; W-004, W-032, common simulation/campaign files, generated artifacts,
active projections, host activation, and real actions remain protected.

### Revision 17 Attempt 1 Integrated Fixed Point

Receipt `W031-R17A1-EXEC-20260805` advances admission coherently to schema,
classifier, catalog, and case-set v18 with `cascade-core@19`. Focused admission
tests pass `64/64` with 1,108 assertions. The exact corpus contains 184 cases
covering the named failures and paired read-only, meta-work, provenance, and
change-outcome negatives.

Registry validation passes for 12 policies, 10 controls, and 184 cases. The
corpus passes `184/184`; relation, intent, workload, route, controls, skills,
and blockers are each `184/184`, persistence is `145/145`, claims are `56/56`,
and over-control and under-control are zero.

No trusted host was activated and no hard action ran. Complete repository
validation passes at 268/268 tests, current generated briefs and catalogs, and
immutable fixture `wg001-attempt22-review-20260805-r32`, which verifies 91
files at manifest `d7dfc93d...` with fixture evaluation `PASS` and
`release_eligible=false`. This receipt proposes `IN_PROGRESS -> REVIEW`
only. Fresh independent G1-G6 review, provider coverage, promotion,
deployment, and release remain `NOT_RUN` or
`NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 17 Independent Review Failure And Revision 18 Attempt 1 Replan

Frozen receipts `W031-R17-ARCH-HARNESS-REVIEW-20260805-IND-01`,
`W031-R17-FUNCTIONAL-REVIEW-20260805-IND-01`, and
`W031-R17-SECURITY-REVIEW-20260805-IND-01` failed revision 17. Findings covered
local-write admission before envelope checks, shell/Node/package/MCP effect
classification, copied-source punctuation and direct continuations, polite
mutation variants, natural claim variants, source-drift and distinct-objective
reclassification, natural secret redaction, and claim-history overflow.

Revision 18 reopens the same serialized six-node lane for a bounded repair.
Graph revision 2, authority ownership, no-auto-dispatch/no-auto-approval,
W-004/W-032 boundaries, generated artifacts, campaign/simulation files,
active projections, trusted host activation, provider execution, and real
effects remain unchanged and out of scope.

### Revision 18 Attempt 1 Integrated Fixed Point

Receipt `W031-R18A1-EXEC-20260805` advances admission coherently to schema,
classifier, catalog, and case-set v19 with `cascade-core@20`. Focused admission
tests pass `71/71` with 1,254 assertions. Registry validation passes for 12
policies, 10 controls, and 210 cases. The exact corpus passes `210/210`;
relation, intent, workload, route, controls, skills, and blockers are each
`210/210`, persistence is `171/171`, claims are `82/82`, and over-control and
under-control are zero.

The repaired tool boundary requires a current proportional envelope for local
writes and only defers to the ordinary interactive permission flow; it never
auto-approves. Effect-based command classification, provenance/direct-action
separation, source-sensitive claim invalidation, distinct-objective handling,
secret minimization, and bounded claim-history rollover have focused and corpus
coverage. No trusted host was activated and no hard action ran.

This receipt proposes review only. Root integration rebinds W-032 to schema
v19 and `cascade-core@20`, regenerates shared projections, and passes the
complete repository suite `280/280` with 2348 assertions. Campaign catalog
`82d7657c...` and PB-002 are current; immutable fixture
`wg001-attempt23-review-20260805-r33` verifies 91 files at manifest
`9fb77657...` with `release_eligible=false`. Fresh independent
architecture/harness, functional, and security review is the next gate;
provider coverage, promotion, deployment, and release remain `NOT_RUN` or
`NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 18 Independent Review Failure And Revision 19 Attempt 1 Replan

Fresh revision-18 architecture/harness, functional, and security probes failed
grouped and non-quiet `sed` effects, official patch deletion input,
target-unbound local writes, malformed-hook exit behavior, punctuation-bound
direct continuations, polite destructive variants, natural specialized claims
and credential assignments, and weak distinct-objective evidence.

Revision 19 reopens the same serialized six-node lane for a bounded repair.
Graph revision 2, authority ownership, no-auto-dispatch/no-auto-approval,
W-004/W-032 ownership, shared projections, host activation, provider work, and
real effects remain unchanged or protected.

### Revision 19 Attempt 1 Integrated Fixed Point

Receipt `W031-R19A1-EXEC-20260805` advances admission coherently to schema,
classifier, catalog, and case-set v20 with `cascade-core@21`. Focused admission
tests pass `76/76` with 1,289 assertions. Registry validation covers 12
policies, 10 controls, and 228 cases. The exact corpus passes `228/228`;
relation, intent, workload, route, controls, skills, and blockers are each
`228/228`, persistence is `189/189`, claims are `100/100`, and over-control and
under-control are zero. The owned compiler/hook TypeScript check passes.

Target-bound local write admission, official patch deletion, strongest-effect
grouped/quoted/non-quiet `sed`, blocking hook process failures, direct-action
continuations, polite destructive language, specialized claims, natural secret
redaction, and objective lineage have executable regressions and exact corpus
shadows. No trusted host was activated and no hard action ran.

This receipt proposes review only. Root integration rebinds W-032 and the
active/shared projections to v20 and `cascade-core@21`. Repository validation
passes `290/290` with 2,594 assertions; the exact corpus passes `228/228`,
campaign catalog `26f238f5...` and PB-002 are current, and immutable fixture
`wg001-attempt24-review-20260805-r34` verifies 93 files at manifest
`f0fe20e1...` with `release_eligible=false`. Fresh independent G1-G6 review is
the next acceptance gate;
provider coverage, promotion, deployment, and release remain `NOT_RUN` or
`NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 19 Independent Review Failure And Revision 20 Attempt 1 Replan

Fresh revision-19 architecture/harness, functional, and security probes failed
command-specific target completeness, inherited-only required schema fields,
quoted `sed` filenames, review-only provenance/inverse punctuation, passive and
possessive mutation requests, natural claim forms, longer credential linking,
and continuation intent preservation.

Revision 20 reopens the same serialized six-node lane for a bounded repair.
Graph revision 2, authority ownership, no-auto-dispatch/no-auto-approval,
W-004/W-032 ownership, shared projections, host activation, provider work, and
real effects remain unchanged or protected.

### Revision 20 Attempt 1 Integrated Fixed Point

Receipt `W031-R20A1-EXEC-20260805` advances admission coherently to schema,
classifier, catalog, and case-set v21 with `cascade-core@22`. Focused admission
tests pass `83/83` with 1,331 assertions. Registry validation covers 12
policies, 10 controls, and 243 cases. The exact corpus passes `243/243`;
relation, intent, workload, route, controls, skills, and blockers are each
`243/243`, persistence is `204/204`, claims are `115/115`, and over-control and
under-control are zero.

Exact-path Task Envelope targets never imply descendants. Command-specific
destination parsing, fail-closed unresolved forms, own-property schema
validation, position-aware `sed`, review/direct-continuation provenance,
passive/possessive mutation language, natural claims, source-digest
invalidation, longer secret redaction, and continuation lineage have executable
regressions. No trusted host was activated and no hard action ran.

This receipt proposes review only. Root integration rebinds W-032 and the
active/shared projections to v21 and `cascade-core@22`. Repository validation
passes `299/299` with 2,902 assertions; the exact corpus passes `243/243`,
campaign catalog `74ecee7a...` and PB-002 are current, and immutable fixture
`wg001-attempt25-review-20260805-r35` verifies 93 files at manifest
`cbda5987...` with `release_eligible=false`. Fresh independent G1-G6 review is
the next acceptance gate;
provider coverage, promotion, deployment, and release remain `NOT_RUN` or
`NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 20 Independent Review Failure And Revision 21 Attempt 1 Replan

Independent receipts `W031-R20-ARCH-HARNESS-REVIEW-20260805-IND-01`,
`W031-R20-FUNCTIONAL-REVIEW-20260805-IND-01`, and
`W031-R20-A1-GF101-20260805-IND-01` failed the revision-20 candidate on exact
shell-destination semantics, split touch/mkdir options, `sed` in-place forms,
mixed read/write segments, copied-review/direct-continuation boundaries,
possessive destruction, secret redaction, natural claims, and continuation
lineage.

Revision 21 reopens the same serialized six-node lane for a bounded repair.
Graph revision 2, authority ownership, no-auto-dispatch/no-auto-approval,
W-004/W-032 ownership, shared projections, host activation, provider work, and
real effects remain unchanged or protected.

### Revision 21 Attempt 1 Local Review Receipt

Receipt `W031-R21A1-EXEC-20260805` advances admission coherently to schema,
classifier, catalog, and case-set v22 with `cascade-core@23`. Focused admission
tests pass `86/86` with 1,378 assertions. Registry validation covers 12
policies, 10 controls, and 258 cases. The exact corpus passes `258/258`;
relation, intent, workload, route, controls, skills, and blockers are each
`258/258`, persistence is `219/219`, claims are `130/130`, and over-control and
under-control are zero. The owned compiler/hook TypeScript check passes.

Exact no-target-directory semantics, split touch/mkdir options, backup and
parent rejection, macOS `sed -i ''`, mixed read/write segment collection,
review/copy/inverse framing, generalized direct continuations, possessive
removal, natural secret linking, claim classification, and prior-dependent
continuation inheritance have executable regressions. Unresolved `cd` context
fails closed. No trusted host was activated and no hard action ran.

This receipt proposes review only. Root integration rebinds W-032 and the
active/shared projections to v22 and `cascade-core@23`. Repository validation
passes `304/304` with 3,008 assertions; the exact corpus passes `258/258`,
campaign catalog `df608e2b...` and PB-002 are current, and immutable fixture
`wg001-attempt26-review-20260805-r36` verifies 93 files at manifest
`d07ee2a8...` with `release_eligible=false`. Fresh independent G1-G6 review is
the next acceptance gate; provider coverage,
promotion, deployment, and release remain `NOT_RUN` or
`NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 21 Independent Review Failure And Revision 22 Attempt 1 Repair

Independent receipts `W031-R21-A1-GF101-20260805-IND-01` and
`W031-R21-FUNCTIONAL-REVIEW-20260805-IND-01`, plus the concurrent architecture
review, fail the revision-21 candidate. The bounded repair covers complete
mutation target sets for `mv` and patch moves, recursive-copy descendants,
mixed literal output segments, shared JSON Schema validation, full natural
secret redaction, review-only inverse framing, direct and appreciative
destruction language, continuation lineage, and natural claims. The frozen
revision-21 review receipt is invalidated by this changed candidate.

### Revision 22 Attempt 1 Local Review Receipt

Receipt `W031-R22A1-EXEC-20260805` advances admission coherently to schema,
classifier, catalog, and case-set v23 with `cascade-core@24`. Focused admission
tests pass `91/91` with 1,459 assertions. Registry validation covers 12
policies, 10 controls, and 294 cases. The exact corpus passes `294/294`;
relation, intent, workload, route, controls, skills, and blockers are each
`294/294`, persistence is `255/255`, claims are `166/166`, and over-control and
under-control are zero.

`mv -T` binds source and destination, patch moves bind update and move targets,
and recursive/archive copies fail closed under exact-path scope. Literal
no-redirection output segments may compose with exact writes; redirection,
substitution, pipes, and unresolved forms deny. The shared hardened schema
consumer now validates admission artifacts while strict Task Envelope timestamp
semantics remain explicit. Complete secret values, copied/review inverses,
direct continuations, destructive noun/gerund/appreciative forms, meta parser
work, validation inheritance, and source-sensitive claims have executable
regressions and hook projections. No trusted host was activated and no hard
action ran.

This receipt proposes `REVIEW` only and does not transition or accept G1-G6.
Root integration owns W-032 rebinding, active/shared and generated projections,
the complete repository suite, and a new immutable fixture. Fresh independent
revision-22 architecture/harness, functional, and GF-101 security receipts are
the next acceptance inputs. Provider coverage, promotion, deployment, and
release remain `NOT_RUN` or `NOT_IMPLEMENTED/NOT_RUN` as applicable.

Root integration rebinds W-032 to schema v23 and `cascade-core@24`, regenerates
campaign catalog `d57288db...` and PB-002, and passes the W-032 focused join at
`69/69` with 575 assertions. The complete repository suite passes `310/310`
with 3,116 assertions, and immutable fixture
`wg001-attempt27-review-20260805-r37` verifies 93 files at manifest
`e9217dab...` with fixture evaluation `PASS` and
`release_eligible=false`. Fresh independent revision-22 G1-G6 review remains
required; the integrated evidence does not self-accept any gate.

### Revision 22 Independent Failure And Revision 23 Attempt 1 Repair

Independent receipts `W031-R22-ARCH-HARNESS-REVIEW-20260805-IND-7C3A`,
`W031-R22-FUNCTIONAL-REVIEW-20260805-IND-01`, and
`W031-R22-A1-GF101-20260805-IND-01` fail the revision-22 candidate. They reopen
N01-N05 and the N06 consumer for invalid patch-directive filtering, unbounded
`mv` subtree uncertainty, adjacent destructive-language and copied-review
forms, punctuation-bearing and reordered secrets, continuation claim binding,
natural claim kinds, and the stale gate projection.

Receipt `W031-R23A1-EXEC-20260805` advances the Task Envelope, classifier,
catalog, and case set to v24 with `cascade-core@25`. Patch target extraction is
atomic: any invalid Add, Update, Delete, or Move directive invalidates the
complete target set. Exact-target `mv` fails closed until a trusted pre-tool
binding can prove a non-directory source or explicit subtree authority.
Destructive noun, passive, gerund, appreciative, elimination, disposal, and
arranged-deletion requests are covered. Explicit review-only, non-execution,
copied Slack/Teams, audit, analyze, and inverse framings remain read-only;
their later direct execution continuation binds `requested-destructive`.
Natural secrets cover `presently`, `now`, `has been set`, multiword values, and
punctuation-bearing suffixes without retaining raw fragments. Current-state,
evidence, and boundary claims reopen every source-dependent consumer after
source-digest drift.

The exact corpus contains 308 cases and passes `308/308`; persistence is
`269/269`, claims are `180/180`, and over-control and under-control are zero.
Focused admission/hook tests pass `96/96` with 1,590 assertions. The W-032
common/definition/intake join passes `70/70` with 590 assertions at
v24/`cascade-core@25`. The complete suite passes `316/316` with 3,262
assertions. Campaign catalog `e8b2b9f5...` and PB-001/PB-002 are regenerated
and current. Immutable r37 remains historical deterministic evidence; no new
provider, hard-action, promotion, deployment, release, or immutable revision-23
run was executed.

This receipt proposes `REVIEW_R23_A1` for G1-G6 only. Fresh independent
architecture/harness, functional, and GF-101 security receipts are required;
no gate is self-accepted.

### Revision 23 Independent Failure And Revision 24 Attempt 1 Repair

Independent receipts `W031-R23-ARCH-HARNESS-REVIEW-20260805-IND-9D4E`,
`W031-R23-FUNCTIONAL-REVIEW-20260805-IND-01`, and
`W031-R23-A1-GF101-20260805-IND-01` fail revision 23 and reopen N01-N05 plus
the N06 consumer. Receipt `W031-R24A1-EXEC-20260806` advances the public Task
Envelope, classifier, catalog, and case set to v25 with `cascade-core@26`.

Repository-scoped local writes now resolve every target against the repository
root and deny lexical, physical-symlink, absolute, traversal, or unresolved
escape. Repository scope is selected only by explicit repository-wide wording;
it is not a fallback for missing targets. Path-qualified executable identities
deny, patch paths reject quote, backslash, trailing-slash, and dot-segment
aliases, while exact relative paths preserve `@`, Unicode, brackets, and spaces.

Raw source attestations are verified against raw offsets before span-by-span
redaction projects canonical offsets. Natural database/client secrets and
punctuation-bearing values redact without swallowing later user actions.
Structural review/copy framing remains non-authoritative; later explicit
`execute`, `perform`, or `act` continuations restore only the matching action
intent. Adjacent evidence, boundary, current-state, and source-drift claims are
bound to the affected consumers.

Focused admission/hook tests pass `100/100` with 1,722 assertions. Registry
validation covers 12 policies, 10 controls, and 351 cases. The exact corpus
passes `351/351`; persistence is `312/312`, claims are `223/223`, and
over-control and under-control are zero. This is deterministic harness
producer evidence and proposes `REVIEW_R24_A1` only. Root integration passes
the complete `321/321` suite and every repository gate; immutable r39 remains
current deterministic harness evidence, not a product-simulation run or an
independent W-031 acceptance receipt. Fresh revision-24 architecture/harness,
functional, and GF-101 review, trusted-host/provider action, real hard actions,
promotion, deployment, and release remain `NOT_RUN` or open as applicable.

### Revision 24 Independent Failure And Revision 25 Attempt 1 Repair

Independent receipts `W031-R24-ARCH-HARNESS-REVIEW-20260806-IND-4B91`,
`W031-R24-FUNCTIONAL-REVIEW-20260806-IND-01`, and
`W031-R24-A1-GF101-20260806-IND-01` fail revision 24 and reopen N01-N05 plus
the N06 consumer. Receipt `W031-R25A1-EXEC-20260806` advances the public Task
Envelope, classifier, catalog, and case set to v26 with `cascade-core@27`.

Revision 25 rejects unquoted dynamic glob, bracket, and brace shell operands
while preserving quoted or escaped literal special-character paths. Every
existing target component is checked with `lstat` and any symlink, including a
dangling or repository-internal symlink, denies. This pre-tool result is
advisory and fail-closed; the authoritative tool-side mutation path must repeat
the nofollow walk immediately before mutation.

Repository scope now requires an active positive direct mutation clause and
supports explicit repository, repo, codebase, and project-wide synonyms.
Quoted, copied, review-only, and parser/meta phrases cannot widen scope.
Terminal Cancel, Instead, and Actually review-only clauses remove earlier
destructive authority. Structural Critique, Discuss, Summarize, Check, Tell me
whether, and analysis framing remains advisory; `Perform the requested action`
restores only the referenced action class. Secret redaction preserves comma,
semicolon, and exclamation-delimited `Then` actions and retains source
provenance when an assignment crosses a source-segment boundary.

Focused admission/hook tests pass `105/105` with 1,826 assertions. Registry
validation covers 12 policies, 10 controls, and 386 exact cases. The corpus
passes `386/386`; persistence is `347/347`, claims are `258/258`, and
over-control and under-control are zero. This is local producer evidence and
proposes `REVIEW_R25_A1` only. The W-032/full/shared projection join is
root-owned N06 work; independent revision-25 review, trusted-host/provider
action, real hard actions, promotion, deployment, and release remain open or
`NOT_RUN`.

Root integration binds revision 25 to the combined W-004 N06 and W-032
intake-v5 source, regenerates campaign catalog `429eca73...` and both product
briefs, and passes every repository gate. The complete suite passes `335/335`
with 3,526 assertions. Immutable deterministic fixture
`wg001-n06-review-20260806-r40` verifies schema `1.2.0`, 97 files, and manifest
`cae5fae54a6f27daba8a787093c4e08899cc8157dab2c93198db962f898ffa89`
with `release_eligible=false`. Fresh revision-25 architecture/harness,
functional, and GF-101 security reviews remain required; integrated evidence
does not self-accept W-031-G1 through G6.

### Revision 25 Independent Failure And Revision 26 Attempt 1 Repair

Independent receipts `W031-R25-ARCH-HARNESS-REVIEW-20260806-IND-7C2F`,
`W031-R25-FUNCTIONAL-REVIEW-20260806-IND-01`, and
`W031-R25-A1-GF101-20260806-IND-01` fail revision 25 and reopen N01-N05 plus
the N06 consumer. Receipt `W031-R26A1-EXEC-20260806` advances the public Task
Envelope, classifier, catalog, and case set to v27 with `cascade-core@28`.

External frames now cover quoted requests, copied notes,
analysis/assessment-purpose text, and copied-request analysis, safety, and risk
checks without treating their embedded action as direct authority. Later
`perform action requested`, `execute requested action`, and `act on requested
action` clauses recover only the referenced external action. Terminal
Cancel/Stop/Abort review clauses cancel prior action and Instead/Actually
review clauses override it, while direct stop-service and abort-process
requests remain operations.

Unpunctuated `and then`, `afterward`, and `afterwards` actions survive secret
redaction; structured mixed-source spans neither leak the secret nor promote
external text. Direct broad-scope forms cover every file in the repository,
throughout the repo, whole-project, and across all project files. Quoted,
copied, review-only, and parser-test forms cannot widen scope, and
`Document ... docs/current.md` binds only that target. Required destructive
inflections, evidence paraphrases, boundary paraphrases, and source-drift
consumer reopening are fixed in the compiler, CLI, hook, and exact corpus.

Quoted/escaped shell exactness and component-wise nofollow `lstat` checks are
preserved. They are pre-tool decisions, not an atomic writer guarantee. A
deterministic mutation-side containment seam remains `NOT_IMPLEMENTED`, and no
real mutation-side proof, provider action, or hard action was run (`NOT_RUN`).

Focused admission/hook tests pass `112/112` with 1,958 assertions. Registry
validation covers 12 policies, 10 controls, and 430 exact cases. The corpus
passes `430/430`; persistence is `391/391`, claims are `302/302`, and
over-control and under-control are zero. The narrow W-032 consumer parity slice
passes `71/71` with 597 assertions. This is local producer evidence and
proposes `REVIEW_R26_A1` only; it does not self-accept W-031-G1 through G6.

Root integration preserves Task Envelope/classifier v27 and
`cascade-core@28`, regenerates all shared projections, and passes the complete
suite `346/346` with 3,678 assertions. Immutable deterministic fixture
`wg001-n06-r60-w031-r26-review-20260806-r41` verifies 97 files at manifest
`fa6d1d5439086c05b7114bac19f7bdab964f1c4cbad7991632b019ff284dcf6c`
with `release_eligible=false`. Revision 26 remains `IN_REVIEW`; fresh
architecture/harness, functional, and GF-101 receipts are required. The
mutation-side atomic containment seam remains `NOT_IMPLEMENTED`, and real hard
action proof remains `NOT_RUN`.

### Revision 26 Independent Failure And Revision 27 Attempt 1 Repair

Receipts `W031-R26-ARCH-HARNESS-REVIEW-20260806-IND-3B7A`,
`W031-R26-FUNCTIONAL-REVIEW-20260806-IND-01`, and
`W031-R26-A1-GF101-20260806-IND-01` fail revision 26 and reopen N01-N05 plus
the producer-bound N06 projection. Receipt `W031-R27A1-EXEC-20260806` advances
the producer identity to Task Envelope/schema/catalog/case-set v28, classifier
v28, and `cascade-core@29` with 454 exact cases.

Revision 27 implements explicit no-mutation constraints, generalized
safety/risk/security/review framing, then/after-that secret continuations,
format/rename/correct repository mutations, destructive morphology and remote
delete shells, source-sensitive evidence/current/boundary paraphrases, and the
direct `take requested action` variant. Configured hook mutations now require a
trusted current session/envelope/revision/request/source/non-revocation binding;
missing, stale, mismatched, or revoked bindings fail closed.

Focused W-031 and narrow W-032 producer-parity tests pass `138/138` with 2,245
assertions. The exact corpus passes `454/454`; persistence is `391/391`, claims
are `326/326`, and over/under-control are zero. Paired/metamorphic unit and hook
tests cover the repaired boundaries. This is local producer evidence proposing
`REVIEW_R27_A1` only. G1-G6 require fresh independent review. FI-101/G5 remain
unaccepted after the revision-26 security failure. Prompt admission is
advisory, hard actions retain trusted one-shot receipt requirements, atomic
mutation-side containment is `NOT_IMPLEMENTED`, and real mutation/provider/
release proof remains `NOT_RUN`.

Root integration regenerates all protected projections, passes the complete
suite `353/353` with 3,764 assertions, and freezes deterministic r42 with 99
files at manifest
`60e19b5a3723d8e9686159ce8d7f616738118aa1e57f789334bb07e4f767d04a`
and `release_eligible=false`. Revision 27 remains `IN_REVIEW`; fresh
architecture/harness, functional, and GF-101 reviews are required. Trusted
current-envelope selection is implemented only through the deterministic
binding contract; live host integration, real hard actions, and mutation-side
atomic containment remain `NOT_RUN` or `NOT_IMPLEMENTED` as recorded.

### Revision 27 Independent Failure And Revision 28 Attempt 1 Repair

Independent receipts `W031-R27-ARCH-HARNESS-REVIEW-20260806-IND-7E4C`,
`W031-R27-FUNCTIONAL-REVIEW-20260806-IND-01`, and
`W031-R27-A1-GF101-20260806-IND-01` fail revision 27 and reopen N01-N05 plus
the producer-bound N06 projection. Receipt `W031-R28A1-EXEC-20260806`
advances Task Envelope/schema/catalog/case-set and classifier to v29 with
`cascade-core@30` and 485 exact cases.

The repair binds ordinary no-mutation language across intent, authority,
requested tags, and scope; generalizes review-only punctuation and quoted or
copied safety/analysis frames; retains purge/delete continuations after secret
redaction; and covers whole-project/across-every-project-file scope without
widening review or assessment text. Destructive morphology remains active only
for direct requests. Evidence, current-state, and write-boundary paraphrases
retain source-sensitive exact consumer reopening. Only a direct user-sourced
`take requested action` restores an externally described action.

Natural direct gcloud/curl/gh deletion requests classify as destructive.
Destructive git-push delete, deletion-refspec, force, force-with-lease,
force-refspec, mirror, and prune forms classify `DESTRUCTIVE`, while ordinary
push remains `EXTERNAL_WRITE`; an external-write envelope denies every
destructive variant.

Focused paired/metamorphic repair tests pass `6/6` with 98 assertions. The
combined W-031 and narrow W-032 producer-parity suite passes `144/144` with
2,343 assertions. Admission validation reports 12 policies, 10 controls, and
485 cases; the corpus passes `485/485`, persistence `391/391`, claims
`357/357`, with zero over/under-control. This receipt proposes
`REVIEW_R28_A1` only and does not self-accept G1-G6. Prompt admission remains
advisory, trusted current-envelope and one-shot receipt boundaries remain fail
closed, atomic mutation-side containment is `NOT_IMPLEMENTED`, and live host,
provider, real hard-action, deployment, and release proof remains `NOT_RUN`.

Root integration regenerates all protected projections, passes the complete
suite `361/361` with 3,871 assertions, and freezes deterministic r43 with 99
files at manifest
`5e0e2c83a44e9bb76c159541683ed330c04548de1ddc83b0b8e4287283eed99e`
and `release_eligible=false`. Revision 28 remains `IN_REVIEW`; fresh
architecture/harness, functional, and GF-101 reviews are required. Atomic
mutation-side containment, live host integration, real hard actions, provider
execution, and release proof remain `NOT_IMPLEMENTED` or `NOT_RUN`.

### Revision 28 Independent Failure And Revision 29 Attempt 1 Repair

Fresh revision-28 architecture/harness, functional, and GF-101 findings reopen
N01-N05 plus the producer-bound N06 projection. The security findings conflict
only on the full-source deletion refspec; the passing trusted current-envelope,
one-shot receipt, default-deny, nofollow, and command-grammar controls remain
preserved. Receipt `W031-R29A1-EXEC-20260806` advances the producer identity to
Task Envelope/schema/catalog/case-set and classifier v30 with
`cascade-core@31` and 515 exact cases.

The repair generalizes bounded review punctuation and natural safety frames,
embedded untouched/no-mutation constraints, `revise` plus each-file/every-part
repository scope, destructive morphology with inert assessment pairs, and
source-sensitive evidence/current-state/boundary paraphrases. Polite direct
destructive commands classify as operations. Lexical-fallback referenced
actions recover class without minting requested authority; quoted and negated
continuations remain inert.

The full `git push origin refs/heads/main:` deletion refspec joins every
existing delete, force, mirror, prune, and short deletion-refspec form as
`DESTRUCTIVE`; an `EXTERNAL_WRITE` envelope denies each one. New paired and
Git-push groups pass `5/5` with 100 assertions. The combined W-031/narrow W-032
suite passes `148/148` with 2,424 assertions. Admission validation reports 12
policies, 10 controls, and 515 cases; corpus results are `515/515`, persistence
`391/391`, claims `387/387`, and zero over/under-control.

This receipt proposes `REVIEW_R29_A1` only and does not self-accept G1-G6.
Prompt admission remains advisory. Atomic mutation-side containment and live
host integration remain `NOT_IMPLEMENTED`; real hard actions, provider
execution, deployment, and release proof remain `NOT_RUN`.

Root integration regenerates campaign catalog `70143a4a...`, PB-001, and
PB-002, passes the exact `515/515` corpus and complete `366/366` suite with
3,959 assertions, and freezes immutable r44 with 99 files at manifest
`dbaf083fe88d0eb577877e8a0263291534e2a25fddf9531ccbf04d05b7633243`.
Revision 29 remains `IN_REVIEW`; fresh architecture/harness, functional, and
GF-101 receipts are required. The r28 security PASS remains historical
positive evidence only and does not accept a changed r29 identity.

### Revision 29 Independent Failure And Revision 30 Attempt 1 Repair

Independent receipts `W031-R29-A1-ARCH-HARNESS-20260806-IND-8B3F`,
`W031-R29-FUNCTIONAL-REVIEW-20260806-IND-01`, and
`W031-R29-A1-GF101-20260806-IND-01` fail revision 29 and reopen N01-N05 plus
the producer-bound N06 projection. Receipt `W031-R30A1-EXEC-20260806`
advances the producer identity to Task Envelope/schema/catalog/case-set and
classifier v31 with `cascade-core@32` and 545 exact cases.

The repair adds terminal natural review/safety frames, quantified
untouched/unchanged constraints, broader direct repository-scope verbs,
direct-only destructive morphology, specialized evidence/current-state/
boundary paraphrases, declarative boundary intent, exact lexical referenced
local-action target retention, polite destructive requests, and deletion-
refspec punctuation. Every active semantic form has a paired review, quoted,
negated, no-mutation, or direct-action neighbor.

Static shell lexemes are normalized across concatenated quotes, escapes, and
backslash-newline continuations before Git push classification. Split or
escaped delete, force, mirror, prune, short-force, and full deletion-refspec
forms are destructive; dynamic and ambiguous forms fail closed; ordinary
pushes remain external writes. An external-write envelope denies every
destructive equivalent.

Focused W-031 tests pass `132/132` with 2,297 assertions. The combined W-031
and narrow W-032 producer-parity suite passes `153/153` with 2,506 assertions.
Admission validation reports 12 policies, 10 controls, and 545 cases; corpus
results are `545/545`, persistence `391/391`, claims `417/417`, with zero
over/under-control.

This producer receipt proposes `REVIEW_R30_A1` only and does not self-accept
G1-G6. Root owns protected projection regeneration and the integrated N06
join. Prompt admission remains advisory. Atomic mutation-side containment and
live host integration remain `NOT_IMPLEMENTED`; real hard actions, provider
execution, deployment, and release proof remain `NOT_RUN`.

Root integration regenerates catalog `234c05a3...`, PB-001, and PB-002,
passes the exact `545/545` corpus and complete `371/371` suite with 4,052
assertions, and freezes immutable r45 with 100 files at manifest
`9f365c6879fc18668b1d223f779d4b8562bb6bdf5fa663e57a49ebbe9795d209`.
Revision 30 remains `IN_REVIEW`; fresh architecture/harness, functional, and
GF-101 receipts are required. No r29 receipt accepts the changed r30 identity.

### Revision 30 Independent Failure And Revision 31 Attempt 1 Repair

Independent revision-30 review found six producer gaps: review/quotation/
negation/no-mutation wording sensitivity; direct destructive morphology,
politeness, and package/module repository scope; specialized claim/source-drift
coverage; lexical copied-versus-direct provenance, target retention, external
action recovery, and non-authorizing fallback; Git abbreviation/config/global-
option/refspec punctuation/glob/brace/dynamic-command equivalence; and missing
versioned examples plus neighbors. These findings reopen N01-N05 and the
producer-bound N06 projection. Receipt `W031-R31A1-EXEC-20260806` advances the
producer identity to Task Envelope/schema/catalog/case-set and classifier v32
with `cascade-core@33` and 599 exact cases.

The repair makes passive assessment and terminal review frames exact without
weakening polite direct destructive requests, recognizes compulsory,
designated, required-disappearance, and `see that` morphology, preserves
quantified no-mutation constraints, and resolves every-package/every-module
scope as repository-wide only for direct mutations. Evidence, current-state,
and boundary paraphrases retain exact source-drift consumers while meta-change
wording remains an outcome.

Lexical provenance now records copied/external and direct-user spans
separately, retains referenced local targets, recovers external or destructive
action class without minting requested authority, and keeps quoted or negated
continuations inert. Negated direct-user suffixes remain visible as `NON_GOAL`
claims. Git push long abbreviations, `GIT_CONFIG_*`, Git global options,
punctuated deletion refspecs, and unquoted glob/brace/dynamic command forms fail
closed as destructive; ordinary static pushes remain external writes.

Focused W-031 tests pass `137/137` with 2,396 assertions. The combined W-031
and narrow W-032 producer-parity suite passes `158/158` with 2,605 assertions.
Admission validation reports 12 policies, 10 controls, and 599 cases; corpus
results are `599/599`, persistence `391/391`, claims `471/471`, with zero
over/under-control.

This producer receipt proposes `REVIEW_R31_A1` only and does not self-accept
G1-G6. Root retains the concurrent protected N06 consumer/projection join.
Prompt admission remains advisory; no trusted host receipt or action authority
is created. Real hard actions, provider execution, independent acceptance,
deployment, and release proof remain `NOT_RUN`.

Root integration regenerates campaign catalog `3996ed74...` and PB-002,
passes the exact `599/599` corpus and complete `377/377` suite with 4,157
assertions, and freezes immutable r46 with 100 files at manifest
`9ed9d9355d167c765d93c7f3a9ba4b17d1858fb0e30738349717e73aa32ce911`.
Revision 31 remains `IN_REVIEW`; fresh architecture/harness, functional, and
GF-101 receipts are required. W-032 has v32/core@33 mechanical parity only;
its producer-bound gates remain open. Atomic mutation-side containment, live
trusted-host integration, real hard actions, provider execution, deployment,
and release proof remain `NOT_IMPLEMENTED` or `NOT_RUN`.

### Revision 31 Rejection And Revision 32 Attempt 1 Repair

Immutable r46 remains unchanged historical evidence. Rejected-r46 architecture,
functional, harness, and GF-101 findings reopen N01-N05 plus the producer-bound
N06 projection. Receipt `W031-R32A1-EXEC-20260806` advances the producer to
Task Envelope/schema/catalog/case-set and classifier v33 with
`cascade-core@34` and 661 exact cases.

The repair structurally normalizes advisory polarity, direct morphology,
polite shell action, possessive/relational repository scope, specialized claim
families with source-drift reopening, copied/pasted provenance and direct
continuation polarity, and Git abbreviation/global-option/environment/force-
cluster closure. Positive, advisory, quoted, negated, no-mutation, meta, and
ordinary-static neighbors are versioned together.

Focused admission passes `142/142` with 2,489 assertions; narrow W-032 parity
passes in the combined `163/163`, 2,698-assertion suite. Corpus passes
`661/661`, persistence `391/391`, claims `533/533`, with zero over/under.
This proposes `REVIEW_R32_A1` only. Root owns N06 integration. Atomic
containment/live host remain `NOT_IMPLEMENTED`; real hard actions, provider
runs, independent acceptance, deployment, immutable revision-32 evidence, and
release proof remain `NOT_RUN`.

Root integration regenerates campaign catalog `cba94fe4...` and PB-002,
passes the exact `661/661` corpus and complete `384/384` suite with 4,271
assertions, and freezes immutable r47 with 102 files at manifest
`d137961959b29a4436d9952bc58116bf465db452b35c992d7aa2d5421b50fe56`.
Revision 32 remains `IN_REVIEW`; fresh architecture/harness, functional, and
GF-101 receipts are required. W-032 has current durable v33/core@34 mechanical
parity only; its producer-bound gates remain open. Atomic mutation-side
containment, live trusted-host integration, real hard actions, provider
execution, deployment, and release proof remain `NOT_IMPLEMENTED` or `NOT_RUN`.

### Revision 32 Rejection And Revision 33 Attempt 1 Repair

Fresh architecture/harness, functional, and GF-101 review rejected immutable
r47. Revision 33 reopens N01-N05 and the producer-bound N06 projection without
changing the accepted authority model. Receipt `W031-R33A1-EXEC-20260806`
advances the Task Envelope, schema, catalog, case set, and classifier to v34
with `cascade-core@35` and 705 exact cases.

The repair covers review/advisory prefix, suffix, quotation, punctuation, and
negative polarity; quantified no-mutation; direct nominal, passive, modal, and
polite destructive forms; repository relational scope; specialized EVIDENCE,
CURRENT_STATE, and BOUNDARY claims with meta controls and exact source-drift
reopening; copied/pasted em-dash provenance and direct/quoted/negative
continuations; and one bounded Git invocation parser shared by prompt and tool
classification. Git global options, split `-C`, attached `-pC`/`-Cp`, `--fo`/
`--for`, command/exec/env wrappers, isolated environments, absolute git/env
paths, and sensitive helper environments fail closed. Benign assignments,
ordinary pushes, quoted refs, and `--no-force` remain external writes.

The focused W-031 suite passes `145/145` with 2,553 assertions; combined
W-031/W-032 parity passes `166/166` with 2,762 assertions. The exact corpus
passes `705/705`, persistence `391/391`, claims `577/577`, with zero
over/under-control. This state is `REVIEW_R33_A1`, not
acceptance. Root still owns shared/generated projection integration and the
immutable fixture. Atomic containment/live host integration remain
`NOT_IMPLEMENTED`; real hard actions, provider runs, independent acceptance,
deployment, and release proof remain `NOT_RUN`.

### Revision 33 Root Integration

Root regenerates PB-002, validates v34/core@35 at `705/705` with persistence
`391/391`, claims `577/577`, and zero over/under-control, and joins the final
N06 held-outs into a `389/389`, 4,361-assertion suite. Immutable r49 verifies
109 files at manifest `80a26aa1876aefc424bad897876bc18dea5e90bac70d5099c427916f51c58b43`.
This is review-ready deterministic evidence only: W-031 remains `IN_REVIEW`,
W-032 remains mechanical parity only, and fresh G1-G6 reviews are required.

### Revision 33 Rejection And Revision 34 Attempt 1 Repair

Fresh review rejects immutable r49 and reopens N01-N05 plus the
producer-bound N06 projection. Revision 34 preserves the authority model and
repairs compliance/advisory and passive-assessment polarity, quantified
no-mutation wording, direct mutation morphology, polite shell commands,
repository relations, specialized claims and meta controls, provenance,
labeled continuation/non-goal clauses, and bounded Git wrapper parsing.

Receipt `W031-R34A1-EXEC-20260806` advances the Task Envelope, schema,
catalog, case set, and classifier to v35 with `cascade-core@36`. The focused
W-031 suite passes `148/148` with 2,640 assertions. The exact corpus passes
`765/765`, persistence `391/391`, claims `591/591`, with zero
over/under-control. After the root-owned narrow consumer rebind, combined
W-031/W-032 parity passes `169/169` with 2,849 assertions.

This state is `REVIEW_R34_A1`, not acceptance. Root still owns generated
projection integration and immutable freezing. Atomic containment/live host
integration remain `NOT_IMPLEMENTED`; real hard actions, provider runs,
independent acceptance, deployment, and release proof remain `NOT_RUN`.

### Revision 34 Root Integration

Root regenerates PB-002, validates v35/core@36 at `765/765` with persistence
`391/391`, claims `591/591`, and zero over/under-control, and joins N06 r68
into a `397/397`, 4,479-assertion suite. Immutable r50 verifies 123 files at
manifest `468f484f91baec54175f89be6bcc7a7ee4197afe1a6cd5b2956f694076b0d880`.
This is review-ready deterministic evidence only; fresh G1-G6 reviews remain
required and W-032 remains mechanical parity only.

### Revision 34 Rejection And Revision 35 Attempt 1 Repair

All three r50 reviews reject revision 34. Revision 35 replaces the brittle
family-specific closure with quote-aware clause composition for advisory and
assessment operators, negation and quantified no-mutation constraints, direct
versus mentioned actions, natural continuation intent, destructive
morphology, repository relatives, and specialized claim roles. One bounded
static parser now handles separate, attached, combined, quoted, and nested
`env -S`/`--split-string` Git invocations across prompt and tool paths.

Receipt `W031-R35A1-EXEC-20260806` advances the Task Envelope, schema,
catalog, case set, and classifier to v36 with `cascade-core@37`. The exact
corpus expands to `785/785`, persistence passes `391/391`, claims pass
`593/593`, and zero over/under-control is recorded. Focused admission passes
`150/150` with 2,661 assertions; the root-owned W-032 rebind produces combined
parity `171/171` with 2,870 assertions.

### Revision 35 Root Integration

Root regenerates PB-002, joins N06 revision 69, and passes the complete
`405/405`, 4,531-assertion suite. Immutable r51 verifies 125 files at manifest
`b45a458a328060b10b7bb66ddd8481aef8096d08353b512450e0c2f339a28126`.
This is review-ready deterministic evidence only: W-031 remains `IN_REVIEW`,
W-032 remains mechanical parity only, and fresh G1-G6 reviews are required.
Atomic containment/live host integration remain `NOT_IMPLEMENTED`; real hard
actions, provider execution, deployment, and release proof remain `NOT_RUN`.

### Revision 35 Rejection And Revision 36 Attempt 1 Repair

All three r51 reviews reject revision 35. Their receipts remain historical
failure evidence and reopen N01-N05 plus the producer-bound N06 projection.
Revision 36 introduces a retained typed clause projection with source span,
quoted/mentioned status, operator, polarity scope, modality, normalized action,
target quantifier/relation, and continuation link. Intent, authority, claims,
and repository scope are derived through that compositional boundary while the
mature compiler remains authoritative where the module intentionally abstains.

The repair also normalizes GNU/BSD `env -S` `\\_` separators and preserves
prompt/tool fail-closed parity for dynamic operands. Independent architecture
held-outs and paired negative/positive controls are promoted into the exact
versioned corpus. Receipt `W031-R36A1-EXEC-20260806` advances the Task Envelope,
schema, catalog, case set, and classifier to v37 with `cascade-core@38`.

Focused W-031 admission passes `154/154` with 2,679 assertions. The exact corpus
passes `907/907`, persistence `513/513`, and claims `715/715`, with zero
over/under-control. These are deterministic implementation receipts only and
propose `REVIEW_R36_A1`; they do not accept G1-G6.

### Revision 36 Root Integration

Root regenerates PB-002 and the campaign catalog, joins N06 revision 70, and
passes the combined W-031/W-032 slice at `179/179` with 2,888 assertions and
the complete Bun 1.3.3 suite at `418/418` with 4,574 assertions. Admission
v37/`cascade-core@38` remains `907/907`, persistence `513/513`, and claims
`715/715`, with zero over/under-control.

Immutable deterministic fixture
`wg001-n06-r70-w031-r36-review-20260806-r52` verifies 126 files at manifest
`a5a53dccdf80b448a8ddbaa091414c63d69f806d56221eac8e166523f948fe91`.
Its source graph digest is
`7c2480e07b3d3bc0efe3d21f6166b3f8dfb2f7fb8d6d0825949046f5ac47a8b6`,
identity envelope is
`0cebd009be8652eb6877f1aef7aa6fc59f4ab59761fd0baf249a1a02bc053734`,
freshness is `FRESH`, fixture evaluation is `PASS`, and
`release_eligible=false`.

Revision 36 remains `IN_REVIEW`; fresh architecture/harness, functional, and
GF-101 receipts must bind immutable r52 plus the current workspace binding.
W-032 has current v37/core@38 mechanical parity only and its gates stay open.
Atomic containment/live trusted-host integration remain `NOT_IMPLEMENTED`;
real hard actions, provider/live/product execution, deployment, and release
proof remain `NOT_RUN`.

### Revision 36 Independent Rejection And Revision 37 Attempt 1 Repair

All three immutable-r52 reviews reject revision 36. Architecture/harness
receipt `W031-R36A1-ARCH-HARNESS-REJECT-20260806-R52`, functional receipt
`W031-R36-A1-FUNCTIONAL-R52-20260806-IND-01`, and GF-101 receipt
`W031-R36-A1-GF101-20260806-IND-R52` remain historical failure evidence. They
reopen N01-N05 plus the producer-bound N06 projection for clause-overlay and
typed-role use, raw-shell downgrade and meta authority, current-state
grounding, continuation/no-mutation/boundary semantics, and read-only Git
prompt/tool parity.

Receipt `W031-R37A1-EXEC-20260806` advances the Task Envelope, schema, catalog,
case set, and classifier to v38 with `cascade-core@39`. The exact corpus passes
`925/925`, persistence `531/531`, and claims `733/733`, with zero
over/under-control. These are deterministic implementation receipts only and
propose `REVIEW_R37_A1`; they do not accept G1-G6.

### Revision 37 Root Integration

Root regenerates PB-002 and the campaign catalog, joins N06 revision 71, and
passes the combined W-031/W-032 slice at `184/184` with 2,940 assertions and
the complete Bun 1.3.3 suite at `425/425` with 4,636 assertions. Admission
v38/`cascade-core@39` remains `925/925`, persistence `531/531`, and claims
`733/733`, with zero over/under-control.

Immutable deterministic fixture
`wg001-n06-r71-w031-r37-review-20260806-r53` verifies 126 files at manifest
`f606bb5d539ec5860ba3e9b0b7e0eda3a28aed7f207610b00db76581fe4eae6a`.
Its source graph digest is
`aa1214839cdcceab9968af7d465a480bc56b316059537b28c38ff9301e493e1f`,
identity envelope is
`2bf760f1b40d99aba2bc0b18846f483a5e88e9f5c56ad41dea47ca9097f681ef`,
freshness is `FRESH`, fixture evaluation is `PASS`, and
`release_eligible=false`.

Revision 37 remains `IN_REVIEW`; fresh exact architecture/harness, functional,
and GF-101 receipts must bind immutable r53 plus the current workspace binding.
W-032 has current v38/core@39 mechanical parity only and its gates stay open.
Atomic containment/live trusted-host integration remain `NOT_IMPLEMENTED`;
real hard actions, provider/live/product execution, deployment, and release
proof remain `NOT_RUN`.

### Revision 37 Independent Rejection And Revision 38 Attempt 1 Repair

Immutable r53 remains unchanged historical review evidence. Architecture/
harness receipt `W031-R37A1-ARCH-HARNESS-REJECT-20260806-R53-IND-01` and
functional receipt `W031-R37-FUNCTIONAL-REVIEW-20260806-IND-7C12` reject
revision 37. GF-101 was not run before the repair changed the source, so no
revision-37 security acceptance exists. Those dispositions reopen N01-N05 plus
the producer-bound N06 projection without accepting any G1-G6 gate.

Receipt `W031-R38A1-EXEC-20260806` advances the Task Envelope, schema, catalog,
case set, and classifier to v39 with `cascade-core@40`. The exact corpus passes
`949/949`, persistence `555/555`, and claims `757/757`, with zero
over/under-control. These are deterministic implementation receipts only and
propose `REVIEW_R38_A1`; they do not accept G1-G6.

### Revision 38 Root Integration

Root regenerates PB-002 and the campaign catalog, joins N06 revision 72, and
passes the complete Bun 1.3.3 suite at `433/433` with 4,727 assertions.
Admission v39/`cascade-core@40` remains `949/949`, persistence `555/555`, and
claims `757/757`, with zero over/under-control. W-032 has current producer
parity; its G1-G4/G6/GT remain open or blocked and G5 stays accepted.

Immutable deterministic fixture
`wg001-n06-r72-w031-r38-review-20260806-r54` is
`VALID`/`COMPLETED`/`FRESH` and verifies 126 files at manifest
`4032bc467d125d9bc20851557d51bc2c2cc86a9c43aa62bbebc52e069fc2024a`.
Its source digest is
`3614d131e93d84fb8c4258876270869ac019475116c0705732db0e1a2a715b7d`,
identity envelope is
`214fb8dadec579099e5436417ddc57244415ea14e73583efc3715d09a9384048`,
evaluation receipt SHA is
`a10cbf6957969d8145eed3dfb8a1d5b94eb7cac33f116211d5b4e7ea68fe5e09`,
aggregation SHA is
`72bd4203a85d63890428087f0a77ffe0ec61f9f9794a28088506379e6c1aeac9`,
and finalization SHA is
`343c1fcb0b3ba679b5afb81b04b2c019d824c039730748591b9e745e85619f16`.
Fixture evaluation is `PASS`/`CALIBRATED`; `release_eligible=false`.

Revision 38 remains `IN_REVIEW`; fresh exact architecture/harness, functional,
and GF-101 receipts must bind immutable r54 plus the current workspace binding.
Atomic containment/live trusted-host integration remain `NOT_IMPLEMENTED`;
real hard actions, provider/live/product execution, deployment, and release
proof remain `NOT_RUN`.

### Revision 38 Independent Rejection And Revision 39 Attempt 1 Repair

Immutable r54 remains unchanged historical review evidence. Architecture/
harness receipt `W031-R38A1-ARCH-HARNESS-REJECT-20260806-R54-IND-01` and
functional receipt `W031-R38-A1-FUNCTIONAL-R54-20260806-IND-REJECT-7F23`
reject revision 38. GF-101 was not run before the repair changed the source, so
revision 38 has no security acceptance. Those dispositions reopen N01-N05 plus
the producer-bound N06 projection without accepting any G1-G6 gate.

Receipt `W031-R39A1-EXEC-20260806` advances the Task Envelope, schema, catalog,
case set, and classifier to v40 with `cascade-core@41`. The exact corpus passes
`965/965`, persistence `571/571`, and claims `773/773`, with zero
over/under-control. These are deterministic implementation receipts only and
propose `REVIEW_R39_A1`; they do not accept G1-G6.

### Revision 39 Root Integration

Root regenerates PB-002 and the campaign catalog, joins N06 revision 74, and
passes the complete Bun 1.3.3 suite at `449/449` with 4,860 assertions.
Admission v40/`cascade-core@41` remains `965/965`, persistence `571/571`, and
claims `773/773`, with zero over/under-control. W-032 revision 22 has current
intake-v6/action-binding-v2 producer parity and a `237/237` focused suite; its
G1-G4/G6/GT remain open or blocked and G5 stays accepted.

Immutable deterministic fixture
`wg001-n06-r74-w031-r39-review-20260806-r55` is
`VALID`/`COMPLETED`/`FRESH` and verifies 126 files at manifest
`f660e2b06c34d83d4e6543774603cac270aace785a8858ff1d822d880c99dee2`.
Its source digest is
`f5badaa72cc240d5bc09e104464fd46969c5e729f094d3322ec4cf40e8fb61a7`,
identity envelope is
`5780eb289aefecfe17a3d9ebd2c3ae4c40dd788c63c3d13172b38404b9747b65`,
evaluation receipt SHA is
`cb58148ed60dd8e3bd8f7d2cbc6fd32e0bea971a6882cb4373cd05ad9cee1840`,
aggregation SHA is
`2b1df783b954713e3439d3819e93bbbc1579a60e1a68cc9eeea704040c3e12e4`,
and finalization SHA is
`bafbfc72af13314521303cbc2a51830ea0524ad8a4554fab0685db750f802d22`.
Fixture evaluation is `PASS`/`CALIBRATED`; `release_eligible=false`.

Revision 39 remains `IN_REVIEW`; fresh exact architecture/harness, functional,
and GF-101 receipts must bind immutable r55 plus the current workspace binding.
Atomic containment/live trusted-host integration remain `NOT_IMPLEMENTED`;
real hard actions, provider/live/product execution, deployment, and release
proof remain `NOT_RUN`.
