# Work Lane: W-031 Task Admission And Workload Compiler

Status: `IN_PROGRESS`
Planning Status: `IMPLEMENTATION_REPAIR`
Plan Revision: `5`
Owner: `agent-engineer`
Created: 2026-08-04
Lane Model: `sequential-pipeline`
Next Gate: `independent GF-004/GF-008/GF-009/GF-101 review and terminal evidence join`
Execution Surface: `root`
Dispatch State: `IMPLEMENTATION_IN_PROGRESS`
Dispatch Authorization: `2026-08-04 user instruction: Implement until done`
Runtime Handle: `none`

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
| `SRC-03` | implementation plan | `docs/specs/task-admission-workload/implementation-plan.md` | revision 5 | worklines, slices, traceability, validation | `AUTHORITATIVE` |
| `SRC-04` | current source | branch `master`, HEAD `7112546cc856`, dirty worktree | checked 2026-08-04 | runtime/config/eval boundaries and overlap | `AUTHORITATIVE_CURRENT_SOURCE` |
| `SRC-05` | active work | `docs/work/active.md`; W-004 lane | checked 2026-08-04 | shared-file ownership and serialization | `AUTHORITATIVE_CURRENT_STATE` |
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
| `Q-03` | `KNOWN_DEFECT` | `eval coverage --list-missing` passed array-callback arguments to `rootPath`. | replaced with an explicit unary callback; command now completes and truthfully reports current live coverage as `0/368` after source invalidation | W-031-N03 | `RESOLVED` |
| `Q-04` | `HOOK_RUNTIME` | Hook runtime must be bounded and network-free. | exact `npx --offline --yes bun@1.3.3` stdin/stdout fixtures passed; normal Codex trust review is still required on first use | W-031-N04 | `SATISFIED_LOCAL` |
| `Q-05` | `NEGATIVE_CONSTRAINT` | No hook may scan, call model/network, write durable state, create work, or expand authority at prompt submission. | failure blocks N04/N05 | GF-101 security gate | `ACCEPTED` |
| `Q-06` | `KNOWN_DEFECT` | Continuation requests using an inflected change verb such as `implementing` can be misclassified as `ANSWER`, suppressing simulation governance. | reopen compiler, corpus, and route-integration evidence without changing topology | W-031-N02/N03/N06 | `IN_REPAIR` |

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
| `S-011` | Given a product or synthetic-persona simulation change/operation, admission selects connected `SIMULATION_GOVERNANCE`, high assurance, independent evidence, and `simulation-campaigns`. | admission unit and corpus fixtures | `PASS_LOCAL` |
| `S-012` | Given current `exec_command` or `functions.exec_command` shell identities, destructive/external commands retain legacy `Bash` hard-action classification. | hook/tool classification fixtures | `PASS_LOCAL` |
| `S-013` | Given a product simulation authoring or execution request, admission selects connected delivery plus simulation governance. | product-simulation route and policy fixture | `PASS_LOCAL` |
| `S-014` | Given a synthetic-persona simulation request, admission preserves persona-specific authority while selecting the shared simulation-governance control. | persona-simulation route and policy fixture | `PASS_LOCAL` |
| `S-015` | Given a continuation request using `implementing`, admission preserves `CHANGE` intent and simulation governance. | continuation-inflection unit and corpus fixtures | `NOT_RUN` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| task routing and skill selection | `TA-001` to `TA-011` | `AGENTS.md`, `CODEX.md`, `.codex/config.toml`, workflow skills | yes | direct answers and atomic changes stay lightweight | route corpus and Standards/Spec review | `PASS_LOCAL_REVIEW_PENDING` | `implement-change` |
| permission/tool enforcement | `TA-008`, `TA-012` | hooks and policy decisions | yes | prompt/tool content cannot grant authority | GF-101 negative probes | `PASS_LOCAL_REVIEW_PENDING` | `secure-design` |
| harness evaluations | all contract acceptance criteria | `harness-evals/`, eval CLI, generated catalog | yes | current 44-skill/368-scenario catalog remains valid; current live coverage is explicitly invalidated | catalog, self-test, coverage, admission corpus | `PASS_SHADOW_LIVE_NOT_RUN` | `harness-evaluation` |
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
| `2` | `5` | `orchestrator in the root task` | this Task Graph; Evidence Gates; amendments; lane-owner transitions/repairs | Current Frontier and `docs/work/active.md` | implementation was serialized in root; no agent/task/worktree auto-creation or independent self-acceptance |

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
| `W-031-N01` | WL-01 | reconcile current source/W-004 overlap; implement schemas, catalog, and policies | none | none | `EXT-01`, `EXT-02` | version-bound contract bundle receipt | `.codex/task-admission/**`; narrow validator/docs | local filesystem, Git inspection, Bun; scoped writes after authorization; no external action | `W-031-G1` | `1/3` | repair contract; after max block for replan | `REVIEW` |
| `W-031-N02` | WL-02 | implement pure compiler, CLI, trace, and reclassification | `W-031-N01` | terminal independent join per revision 2 | `EXT-01` | compiler/CLI receipt | admission source/tests and CLI wiring | local filesystem and Bun; scoped writes; no network or live tool action | `W-031-G2` | `2/3` | repair compiler; after max replan | `IN_PROGRESS` |
| `W-031-N03` | WL-03 | repair eval coverage callback; add shadow corpus and metrics | `W-031-N02` | terminal independent join per revision 2 | `EXT-01` | complete shadow-eval receipt | admission eval schemas/cases and eval tests | local filesystem and Bun; deterministic fixtures; provider-backed semantic runs require separate authority | `W-031-G3` | `2/3` | repair earliest corpus/runner defect; after max block | `IN_PROGRESS` |
| `W-031-N04` | WL-04 | implement advisory `UserPromptSubmit` adapter in a trusted fixture | `W-031-N03` | terminal independent join per revision 2 | `EXT-01`, `EXT-03` | bounded no-side-effect hook receipt | hook adapter/tests/config | trusted local hook fixture; no network/model call, project-state mutation, or external action | `W-031-G4` | `1/3` | keep runtime bridge fallback; block hook activation | `REVIEW` |
| `W-031-N05` | WL-05 | implement deterministic PreToolUse/PermissionRequest hard controls and security probes | `W-031-N04` | terminal independent join per revision 2 | `EXT-01`, `EXT-04` | enforcement and security receipts | narrow hook/policy/security files | local deny/allow fixtures; activation needs explicit authority; real side effects forbidden in tests | `W-031-G5` | `1/3` | reopen earliest contract/compiler/hook; after max security replan | `REVIEW` |
| `W-031-N06` | WL-06 | migrate route consumers, remove blanket default where superseded, and run terminal validation | `W-031-N05` | terminal independent join per revision 2 | `EXT-01`, `EXT-02` | integrated current-source receipt | boot/config/skills/docs/catalog/validator consumers | local filesystem, Git inspection, Bun; scoped writes; no broad stage, commit, push, publish, or deploy | `W-031-G6` | `2/3` | restore existing explicit route until fixed; no dual authority at launch | `IN_PROGRESS` |

### External Conditions

| Condition ID | Authority | Consumer Nodes | Satisfaction Rule | State | Invalidation / Block Route |
|---|---|---|---|---|---|
| `EXT-01` | user | N01-N06 | explicit implementation authorization for W-031 | `SATISFIED` | request amendment can invalidate scope |
| `EXT-02` | root integration owner and current source | N01, N06 | re-scan dirty paths and W-004 ownership; serialize or replan overlaps | `SATISFIED` | later shared-source drift reopens affected nodes |
| `EXT-03` | trusted Codex project/runtime | N04 | exact local hook command and protocol pass without network/model dependency | `SATISFIED_LOCAL` | first-use Codex hook trust remains an operator action |
| `EXT-04` | user plus tool permission boundary | N05 | explicit local hook implementation authority; hard actions still require a current session-bound envelope and normal interactive approval | `SATISFIED_LOCAL` | no external/privileged/destructive action was executed |

### Evidence Gates

| Gate ID | Subject | Required Evidence | Evaluator / Reviewer | Acceptance | State | Failure / Repair Route |
|---|---|---|---|---|---|---|
| `W-031-G1` | `W-031-N01` contract | schemas, 11-policy/10-control corpus, validator, architecture compatibility review | independent architecture reviewer | all required current evidence passes | `OPEN_REVIEW_REQUIRED` | `W-031-N01` |
| `W-031-G2` | `W-031-N02` compiler | deterministic unit/CLI fixtures, trace and conflict/reclassification cases | independent code/Spec reviewer | exact outputs and typed failures pass | `OPEN_REVIEW_REQUIRED` | `W-031-N02` or `W-031-N01` on contract defect |
| `W-031-G3` | `W-031-N03` shadow | 14/14 corpus, repaired coverage command, zero over/under-control, catalog/self-test | harness evaluator independent from implementation output | no required shadow case missing/fail/gap/not-run | `OPEN_REVIEW_REQUIRED` | `W-031-N03`, `W-031-N02`, or `W-031-N01` by earliest cause |
| `W-031-G4` | `W-031-N04` advisory hook | exact offline runtime fixture, bounded output, zero forbidden prompt-hook side effects | integration reviewer | compiler equivalence and no-side-effect checks pass | `OPEN_REVIEW_REQUIRED` | `W-031-N04`; preserve direct bridge |
| `W-031-G5` | `W-031-N05` enforcement | hard deny/approval/stale/injection/non-interactive probes and GF-101 receipt | independent security reviewer | every hard-control case passes | `OPEN_REVIEW_REQUIRED` | earliest `W-031-N01/N02/N04/N05` owner |
| `W-031-G6` | `W-031-N06` terminal | request-to-tool functional receipt, full Cascade regression, fixed-point Standards/Spec review, residual risk | orchestrator joins independent inputs | every required current input passes; no dual admission authority | `OPEN_REVIEW_REQUIRED` | reopen earliest invalid producer/consumer |

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

- Graph revision / plan revision: `2 / 5`
- Ready: none.
- In progress: `W-031-N02`, `W-031-N03`, and `W-031-N06` on repair attempt 2.
- In review: `W-031-N01`, `W-031-N04`, and `W-031-N05`.
- Blocked: acceptance only, because independent reviewers were not authorized or dispatched.
- Accepted: none.
- Open gates: `W-031-G1` through `W-031-G6`.
- External conditions: locally satisfied; first-use hook trust and every real hard
  action retain their normal operator/permission boundary.
- Next executable node: finish the continuation-inflection compiler/corpus
  repair, then return N02/N03/N06 to review before independent gates execute.
- Projection reconciliation: current with this lane revision and active row.

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
| `5` | resumed admission classified `continue implementing ... simulation workload` as read-only because intent matching omitted inflected change verbs | graph revision 2, policy/control semantics, permission boundary, independent gates | reopen N02/N03/N06 for bounded compiler, corpus, and projection repair attempt 2 | prior continuation-route evidence and 14-case/19-test counts superseded | N02, N03, N06 | pending focused and full regression evidence; independent gates remain open |

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
  14-case corpus, hook adapter/config, validators, defaults, docs, and tests.
- Open conditions: independent architecture, code/spec, integration,
  functional, harness, and security review. Current live harness coverage is
  `0/368` after source invalidation and is not represented as a pass.
- Next executable gate: independent review and the G1-G6 evidence join.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| spec/lane/reference validation | `npx --yes bun@1.3.3 scripts/cascade.ts validate` | `PASS`: 9 agents, 44 skills |
| generated eval catalog remains current | `npx --yes bun@1.3.3 scripts/cascade.ts eval catalog --check` | `PASS`: 368 scenarios, digest `67607bcf...` |
| harness, target, and campaign self-tests | exact AGENTS.md commands | `PASS`: 21 harness, 26 target, 7 campaign cases |
| admission registry and corpus | `admission validate`; `admission corpus` | `PASS`: 11 policies, 10 controls, 14/14 trajectories, zero over/under-control |
| focused admission and hook tests | `npx --yes bun@1.3.3 test scripts/cascade/admission.test.ts` | `PASS`: 19 tests |
| Cascade script tests | `npx --yes bun@1.3.3 test scripts/cascade` | `PASS` at latest full fixed point; rerun required after final doc reconciliation |
| planning diff integrity | scoped `git diff --check` and reference searches | `PASS` |
| eval coverage baseline | `npx --yes bun@1.3.3 scripts/cascade.ts eval coverage --list-missing --allow-incomplete` | command defect `FIXED`; current live accepted coverage is truthfully `0/368`, so provider-backed coverage remains `NOT_RUN` |
| exact offline hook protocol | `UserPromptSubmit`, denied hard action, and session-bound envelope fixtures | `PASS_LOCAL`; first-use Codex trust review remains external |
| runtime/compiler/hook/security/functional evidence | W-031-G1 through G6 | local evidence `PASS`; independent acceptance `NOT_RUN` |

## Status Reconciliation

- Last checked: `2026-08-04`.
- Source identity: `master@7112546cc856` plus preserved pre-existing dirty
  worktree.
- Completion disposition: `KEEP_OPEN_IN_REVIEW`.
- Reason: implementation and local deterministic evidence are complete, but
  the same root actor cannot supply the independent GF-004/GF-008/GF-009/
  GF-101 or harness-review receipts required for acceptance.
- Synchronized surfaces: lane packet, spec index, and active registry after
  planning validation.

## Closeout

- Handoff or integration evidence: current implementation packet and local
  receipts are ready for independent review.
- Report: this lane and the implementation plan are the durable handoff.
- Remaining risk: independent policy/security calibration, first-use hook
  trust, hosted/specialized tools outside hook coverage, current live harness
  coverage, merge/deploy/release evidence, and external hard actions remain
  unexecuted.
