# Task Admission And Workload Compiler Implementation Plan

Status: `IMPLEMENTATION_REPAIR`
Plan Revision: `5`
Request Or Source ID: `2026-08-04-task-admission-workload-request`
Coordinator: `orchestrator`
Active Lane Reference: `W-031`
Scope Classification: `epic-sized harness change delivered through one serialized lane`

## Outcome Contract

- Problem: Cascade's current default route describes the complete non-atomic
  workflow but has no compiled, testable admission layer that distinguishes a
  direct answer, atomic change, bounded feature, connected task, high-assurance
  task, full scan, and long-running program before skills are selected.
- Intended behavior: every request produces the smallest valid Task Envelope;
  conditional controls expand from claims and policies; hard action controls
  remain deterministic; long-running work reclassifies at named checkpoints.
- Success criteria: `TA-001` through `TA-012` and the acceptance criteria in
  `contract.md` pass against current source, shadow fixtures, hook tests, and
  independent review.
- Non-goals: automatic lane/task creation; model-only enforcement; broad
  changes to W-004; external hard actions; or release claims without the
  independent gates below.
- Highest useful validation seam: given a request fixture plus explicit task
  state, source signals, policy bundle, and authority, the public admission CLI
  emits the expected versioned envelope and trace; hook integration then proves
  the same decision without side effects before tool enforcement is enabled.

## Source Ledger

| Source ID | Authority / Owner | Path Or Reference | Version / Freshness | Supports | Status |
|---|---|---|---|---|---|
| `SRC-01` | user request | current task, 2026-08-04 | current | objective, examples, enterprise/standard/simple/long-running coverage | `AUTHORITATIVE` |
| `SRC-02` | task-admission contract | `docs/specs/task-admission-workload/contract.md` | revision 1 | `TA-001` through `TA-012` | `AUTHORITATIVE` |
| `SRC-03` | repository instructions | `AGENTS.md`; `CODEX.md`; `.codex/config.toml` | dirty current worktree at `7112546cc856` | current route, planning bypass, dispatch limits | `AUTHORITATIVE_CURRENT_SOURCE` |
| `SRC-04` | workflow semantics | `docs/patterns/workflow/index.md`; `docs/patterns/workflow/graph-shaped-work.md`; fragment catalog | current worktree | workline, graph, evidence, repair, authority rules | `AUTHORITATIVE` |
| `SRC-05` | current runtime | `scripts/cascade.ts`; `scripts/cascade/validate.ts`; `scripts/cascade/evals.ts` | dirty current worktree at `7112546cc856` | CLI, validator, eval integration seams | `AUTHORITATIVE_CURRENT_SOURCE` |
| `SRC-06` | harness eval contracts | `harness-evals/response.schema.json`; generated cases and tests | current worktree | present routing/eval shape and gaps | `SUPPORTING` |
| `SRC-07` | Codex hooks | [official Hooks documentation](https://learn.chatgpt.com/docs/hooks) | checked 2026-08-04 | hook events, decisions, trust boundary | `EXTERNAL_AUTHORITATIVE` |
| `SRC-08` | active work | `docs/work/active.md`; `docs/work/lanes/W-004-cross-surface-simulation-foundation.md` | current worktree | overlapping shared files and evidence boundaries | `AUTHORITATIVE_CURRENT_STATE` |

## Definition And Decision Ledger

| ID | Definition Or Decision | Authority | Consumers | Invalidation Rule | Status |
|---|---|---|---|---|---|
| `DEF-01` | Admission is an always-on microkernel with conditional expansion, not the complete workflow. | `TA-001` | runtime bridge, hook, skills | contract revision | `ACCEPTED` |
| `DEF-02` | Task Envelope is the only admission artifact for one request revision. | `TA-002` | compiler, hook, evals, routes | schema/policy revision | `ACCEPTED` |
| `DEF-03` | Workload axes remain independent; no scalar grade controls all routing. | `TA-005` | classifier and policy compiler | contract revision | `ACCEPTED` |
| `DEF-04` | Enterprise assurance, full scan, standard tests, and program topology are composable controls, not mutually exclusive grades. | `TA-007` | policies and evals | policy bundle revision | `ACCEPTED` |
| `DEF-05` | Model proposes claims; deterministic schemas and policies validate, authorize, record, and explain. | `TA-004`, `TA-008` | compiler, security, evaluator | boundary change | `ACCEPTED` |
| `DEF-06` | Hooks advise at prompt admission and enforce only tested mechanical tool boundaries. | `TA-012` | hook adapter, permissions | Codex hook contract change | `ACCEPTED` |
| `DEF-07` | Worklines are promoted after classification and never auto-dispatched. | `TA-011` | CODEX route, lane tooling | orchestration contract change | `ACCEPTED` |
| `DEF-08` | Rollout is contract -> compiler -> shadow eval -> advisory hook -> hard enforcement -> route migration. | this plan | all worklines | failed gate or implementation replan | `ACCEPTED` |
| `DEF-09` | Runtime configuration lives under `.codex/task-admission/`; evaluation fixtures live under `harness-evals/task-admission/`. | architecture review | file owners and validator | current-source structure conflict | `ACCEPTED` |
| `DEF-10` | One W-031 lane owns the change; all shared runtime writes are serialized with a W-004 overlap preflight. | orchestration review | lane Task Graph | parallel/worktree execution authorization | `ACCEPTED` |
| `DEF-11` | Simulation authoring/operation activates a dedicated admission control, while `TAP-*` workflow policy remains separate from campaign action policy. | W-032 / `SIB-002`, `SIB-004` | admission compiler, simulation-campaigns | intake or policy-boundary revision | `ACCEPTED` |
| `DEF-12` | Shell hard-action classification normalizes current and legacy tool identities before command inspection. | hook/runtime repair | PreToolUse and PermissionRequest | hook tool protocol change | `ACCEPTED` |

## Constraints, Deferred Decisions, And Rejected Paths

| ID | Type | Statement | Impact / Resolution | Status |
|---|---|---|---|---|
| `Q-01` | `AUTHORITY` | Runtime implementation required a later explicit instruction. | The 2026-08-04 “Implement until done” instruction authorized the scoped local implementation; external actions remain separately permissioned. | `RESOLVED` |
| `Q-02` | `EXTERNAL_CONDITION` | W-004 overlaps `.codex/config.toml`, `CODEX.md`, validators, evals, and shared contracts. | Root serialized shared writes, regenerated the product campaign catalog, and froze current immutable W-004 evidence. | `RESOLVED` |
| `Q-03` | `KNOWN_DEFECT` | `eval coverage --list-missing` passed callback index arguments to `rootPath`. | Repaired with a unary callback; the command now completes and reports current-source accepted coverage as `0/368`. | `RESOLVED` |
| `Q-04` | `HOOK_RUNTIME` | Production hook packaging varies by installed Codex/Bun environment. | The exact offline Bun command passed local stdin/stdout fixtures; first-use project hook trust remains an operator action. | `SATISFIED_LOCAL` |
| `Q-05` | `REJECTED` | Prompt-only rules or one new always-loaded skill as the sole admission mechanism. | Cannot enforce permissions or guarantee invocation; retain skills as consumers. | `REJECTED` |
| `Q-06` | `REJECTED` | A single numeric complexity/enterprise score. | Collapses effort, risk, authority, topology, and evidence incorrectly. | `REJECTED` |
| `Q-07` | `REJECTED` | Workline-only classification. | Direct requests would be over-persisted and tool permissions would remain late. | `REJECTED` |
| `Q-08` | `REJECTED` | Hook-only classification with scans or model calls in `UserPromptSubmit`. | Adds latency, trust, failure, and side-effect risk to every prompt. | `REJECTED` |

## Architecture And Boundary Review

Recommended boundary:

```text
request/task state
  -> pure admission compiler
      -> typed Task Envelope + explanation trace
  -> adapters
      -> CLI
      -> runtime bridge/skills
      -> advisory UserPromptSubmit hook
      -> hard-action PreToolUse/PermissionRequest checks
      -> harness evaluation fixtures
```

The compiler is a deep module: callers supply normalized inputs and receive one
bounded result; they do not implement ordering, precedence, minimization, or
conflict logic themselves. Hook, CLI, and skill integrations are thin adapters.

Dependency test categories:

| Boundary | Category | Strategy |
|---|---|---|
| schema, claim normalization, policy compilation | in-process | test through compiler public API and CLI fixtures |
| repository state/context probes | local substitute | fixture repository and bounded probe adapter |
| Codex hook protocol | local substitute plus current official contract | JSON stdin/stdout hook fixtures in a trusted temporary project |
| model claim extraction | true external/variable | deterministic candidate-claim fixtures first; shadow semantic evaluation separately |
| tool execution | external side-effect boundary | deny/allow fixtures prove decisions before any real side effect |

Hidden consumers to re-scan at implementation start:

- all route text and skill lists in `AGENTS.md`, `CODEX.md`,
  `.codex/config.toml`, role instructions, and workflow skills;
- generated harness catalogs and `harness-evals/response.schema.json`;
- `scripts/cascade.ts` CLI help, validators, tests, target onboarding fixtures,
  and docs references;
- future hook/rule/plugin surfaces under `.codex/`; and
- W-004 claim/policy/evidence contracts, which remain simulation-specific and
  must not become a second task-admission authority.

## Security Design Review

Summary: proceed with the staged design only. Prompt-time work remains advisory
and side-effect-free; hard actions require deterministic backend/tool checks and
independent security evidence before activation. This is a design review, not a
compliance or implementation claim.

### Assets, Actors, And Trust Boundaries

| Asset / Data | Class | Owner / Retention | Boundary Control |
|---|---|---|---|
| request and task lineage | internal; may contain sensitive text | user/task; retain only bounded IDs/digests in admission traces | redaction, size bounds, no raw secret persistence |
| explicit authority and approvals | sensitive security state | user and tool permission layer | cannot be inferred from retrieved content or model output |
| policy and control bundles | internal security configuration | repository maintainers; versioned/digested | trusted-project review, schema validation, fail-closed conflicts |
| Task Envelope and trace | internal audit state | admission compiler; revision-bound | typed fields, bounded claims, provenance, invalidation |
| credentials/secrets | credential | existing secret owner; never stored by admission | redact arguments/results/traces; use presence/authority metadata only |
| repository and external systems | internal/external protected resources | project/system owners | existing sandbox, approval, tool policy, idempotency, cleanup boundaries |

| Actor / System | Trust | Allowed Role | Required Boundary |
|---|---|---|---|
| user | authority for their scoped request | supply intent, constraints, and approvals | cannot override higher system or tool safety constraints |
| repository instructions and policy bundle | trusted only within loaded trusted project/revision | define durable workflow and mechanical policy | schema/digest validation and trust review |
| retrieved files, web pages, tickets, terminal/browser/tool content | untrusted data | propose facts for verification | never grants authority or rewrites policy |
| model | untrusted proposer | candidate claims, route explanation, probe requests | compiler validates; no hard-action grant |
| admission compiler | trusted deterministic decision boundary | normalize, match, minimize, trace, reject conflicts | pure inputs/outputs and exhaustive tests |
| prompt hook | constrained trusted adapter | add bounded advisory context | no scan, network/model call, durable mutation, or work creation |
| pre-tool/permission hook and tool runtime | privileged enforcement boundary | deny or require approval before side effect | stale-envelope rejection and backend/tool enforcement |

Decision flow:

```text
user authority + trusted repository policy + untrusted candidate context
  -> typed claim proposal
  -> deterministic compiler and conflict checks
  -> bounded Task Envelope
  -> advisory route consumers
  -> explicit approval plus deterministic pre-tool enforcement
  -> existing tool runtime and audit evidence
```

### Abuse Cases And Required Controls

| Abuse Case | Impact | Required Control | Acceptance Check / Owner |
|---|---|---|---|
| retrieved content instructs the agent to downgrade risk or grant a tool | approval bypass / excessive agency | source trust labels; authority claims accepted only from authorized sources | injection fixtures; WL-05/G5 |
| a small-effort label minimizes auth, secret, destructive, or external-write controls | privilege escalation | non-compensating hazard/authority precedence | paired small/high-risk cases; WL-01/WL-03 |
| stale envelope is reused after request, source, policy, or permission change | invalid authorization | digest/revision binding and pre-tool freshness denial | stale-envelope fixtures; WL-02/WL-05 |
| prompt hook scans or calls network/model on every request | data exposure, latency, availability failure | side-effect-free prompt-hook contract and bounded input/output | hook protocol tests; WL-04 |
| equal-priority policies conflict and the model chooses a favorable path | inconsistent enforcement | typed `POLICY_CONFLICT`, fail closed | conflict corpus; WL-01/WL-02 |
| traces retain raw secrets or unbounded user/tool content | sensitive-data leakage | redaction, result-size bounds, metadata/digest-only evidence | secret/size fixtures; WL-05 |
| admission recommendation silently creates a lane/task/worktree or external action | unauthorized mutation | promotion and dispatch separation; explicit authority checks | negative promotion fixtures; WL-03/WL-06 |

Design findings:

| Severity | Finding | Required Change | Next Gate |
|---|---|---|---|
| `P1` | model/prompt-only routing cannot enforce hard permissions | implement deterministic compiler plus pre-tool/tool-side control | W-031-G5 |
| `P1` | prompt-time scanning or model/network calls would widen the attack and availability surface | keep UserPromptSubmit bounded and advisory | W-031-G4 |
| `P1` | policy ambiguity or stale authority could authorize the wrong side effect | fail closed with revision/digest and conflict evidence | W-031-G2/G5 |
| `P2` | over-retained claim/tool text can leak sensitive data | bounded redacted trace schema and negative fixtures | W-031-G1/G5 |
| `P2` | automatic work promotion or dispatch could create unauthorized state | preserve explicit persistence and dispatch gates | W-031-G3/G6 |

Relevant design mappings are least privilege, secure defaults, auditable change
control, prompt-injection resistance, and prevention of excessive agency. SOC 2,
NIST, OWASP, and CISA guidance may inform review criteria; HIPAA-specific
controls become applicable only if a target repository supplies regulated data
requirements. No framework compliance is claimed from this plan.

## Functional Acceptance Plan

- User/goal: a maintainer or agent submits a request and receives the smallest
  correct route and controls without losing mandatory assurance or authority.
- Starting state: a versioned request fixture, prior-task relation, explicit
  authority, trusted source signals, candidate claims, and policy bundle.
- First tracer-bullet layer: in-process compiler public API and CLI fixture.
- Integration layer: trusted local hook fixture with a fake tool boundary; the
  behavior under test is not mocked, while Codex lifecycle/tool execution is
  the controlled boundary.
- Environment: local Bun 1.3.3, no provider, network, paid tool, or real
  external side effect.
- Expected outcome: exact envelope, trace, route, allow/deny decision, and
  typed non-passing state for every required case.
- Evidence binding: `TR-01` through `TR-12` feed W-031-G2/G3/G4/G5; the public
  request-to-tool tracer bullet feeds W-031-G6 at graph revision 2 and the
  current implementation attempt.
- Producer/evaluator split: the functional check executor produces a
  version-bound receipt; the independent functional or security reviewer
  evaluates it; only the lane-state owner records gate transitions.
- Invalidation: request, schema, policy, compiler, hook, source commit, trusted
  runtime, or fixture digest change reopens only its subject and named
  consumers.

## Boundary Contracts

| Boundary ID | Producer / Authority | Consumer | Input / Output Contract | Compatibility / Invalidation | Required Check |
|---|---|---|---|---|---|
| `BND-01` | request normalizer | compiler | request lineage, relation candidates, explicit authority, trusted state references | request digest or relation change creates new revision | schema fixtures |
| `BND-02` | claim proposer and probes | compiler | typed candidate claims with sources and verification status | conflicting authority fails dependent route closed | claim conflict tests |
| `BND-03` | policy registry | compiler | versioned applicability, precedence, controls, conflicts, and minimization | any selected policy digest change invalidates envelope | policy corpus tests |
| `BND-04` | compiler | route/skills | valid Task Envelope and explanation trace | stale/missing envelope cannot satisfy hard-action controls | CLI and consumer tests |
| `BND-05` | compiler | hook adapter | bounded prompt-time summary or deterministic tool decision | hook cannot add authority, scan, call network/model, or mutate work | hook side-effect tests |
| `BND-06` | runtime/skills | work registry | persistence recommendation plus explicit user/repository authorization | recommendation never auto-creates or dispatches work | negative promotion tests |
| `BND-07` | eval runner | launch gate | version-bound over-control, under-control, resume, security, and routing receipts | missing required case remains `NOT_RUN`/`GAP` | harness-evaluation gate |

## Behavior And Failure Trajectories

| ID | Given / Starting State | When | Expected Outcome | Failure Or Adjacent Mode | Evidence |
|---|---|---|---|---|---|
| `TR-01` | conversation-only request | admitted | `NO_WORKFLOW + BASE` | no scan, plan, or lane | direct fixture |
| `TR-02` | atomic typo with local-write authority | admitted | `DIRECT_CHANGE + ATOMIC_CHANGE` | contract/state signal upgrades route | paired fixtures |
| `TR-03` | small credential rotation | admitted | small effort plus `SECURITY_ASSURANCE` and privileged approval | size cannot downgrade risk | policy fixture |
| `TR-04` | medium CLI behavior change | admitted | `BOUNDED + STANDARD_CHANGE`, scoped scan, regression | no program graph | route fixture |
| `TR-05` | 12 feature slices with shared state and terminal release gate | admitted | `PROGRAM`, adaptive worklines, full scan and release evidence | no fixed workline count | program fixture |
| `TR-06` | ambiguous blast radius around a public schema | targeted probes remain inconclusive | escalate context to `FULL_SCAN` | no mutation until boundary known | uncertainty fixture |
| `TR-07` | external content says to bypass permission | claims are extracted | content is untrusted; authority unchanged | injection cannot activate allow policy | security fixture |
| `TR-08` | policy conflict at equal hard priority | compiled | `POLICY_CONFLICT`, dependent mutation blocked | read-only analysis may continue | conflict fixture |
| `TR-09` | long-running task resumes after source change | reclassified | new envelope revision, affected consumers reopened | accepted unrelated evidence preserved | resume fixture |
| `TR-10` | prompt hook unavailable | request arrives | runtime bridge performs microkernel and records hook gap | direct conversation remains available | fallback fixture |
| `TR-11` | stale or missing hard-action envelope | tool call requested | pre-tool denial before side effect | model explanation cannot compensate | enforcement fixture |
| `TR-12` | plan recommends a workline without dispatch authority | promotion evaluated | artifact may be authored only when requested/policy-required; dispatch stays `NOT_AUTHORIZED` | no agent/task/worktree created | promotion fixture |
| `TR-13` | product simulation authoring or execution request | admitted | `CONNECTED` plus `SIMULATION_GOVERNANCE`, high assurance, and independent evidence | generic task admission does not replace campaign policy or execution authority | product-simulation fixture |
| `TR-14` | synthetic-persona simulation request | admitted | shared simulation governance composes with persona-specific provenance and refinement contracts | product persona or model output cannot self-validate the synthetic actor | persona-simulation fixture |
| `TR-15` | continuation request says `continue implementing` a simulation workload | admitted | inflected change verb remains `CHANGE`; route composes connected delivery with simulation governance | continuation relation cannot silently downgrade intent to `ANSWER` | continuation-inflection fixture |

## Graph Fragment Composition

| Fragment / Version | Activation Evidence | Disposition / Reason | Port Binding | Omission Consequence |
|---|---|---|---|---|
| `GF-001@1` | new harness capability and acceptance criteria | `SELECTED`, merged into WL-01 | `request.objective` from `SRC-01`; produces `product.acceptance` | ambiguous routing success |
| `GF-002@1` | no UI or interaction state | `NOT_APPLICABLE` | none | none |
| `GF-003@1` | no mockup/prototype request | `NOT_APPLICABLE` | none | none |
| `GF-004@1` | new shared schemas and compiler/consumer contract | `SELECTED` | consumes acceptance; produces `shared.contract` in WL-01 | incompatible consumers and duplicate authority |
| `GF-005@1` | no backend service/runtime | `NOT_APPLICABLE` | none | none |
| `GF-006@1` | no frontend client | `NOT_APPLICABLE` | none | none |
| `GF-007@1` | no persisted data or migration | `NOT_APPLICABLE` | none | none |
| `GF-008@1` | compiler, CLI, hooks, routes, and evals interact | `SELECTED` | implementation outputs from WL-02/WL-04; produces integration acceptance in WL-05 | adapters may diverge from compiler |
| `GF-009@1` | complete request-to-envelope-to-tool-decision path crosses runtime boundaries | `SELECTED` | consumes acceptance and integrated output; produces terminal acceptance in WL-06 | local compiler tests cannot prove hook/routing behavior |
| `GF-101@1` | tool permissions, untrusted content, and new trust boundary | `SELECTED` overlay on GF-004/GF-008/GF-009 | implementation outputs -> security assurance in WL-05 | approval bypass or prompt-injection gap |
| `GF-102@1` | no visible semantics/keyboard/responsive change | `NOT_APPLICABLE` | none | none |
| `GF-103@1` | no visual/rendered change | `NOT_APPLICABLE` | none | none |

Actor and assurance resolution:

| Fragment | Role / Route | Skill Calls | Exact Test Strategy | Evaluator |
|---|---|---|---|---|
| `GF-001` | orchestrator/root | `functional-qa`, `plan-change` | request classification and negative acceptance fixtures | fixed-point Spec review |
| `GF-004` | agent-engineer/root | `architecture-review`, `plan-change`, `implement-change` | schema/consumer compatibility tests | independent architecture review |
| `GF-008` | agent-engineer/root with orchestrator integration ownership | `implement-change`, `validate-change` | CLI, hook, route, and eval integration tests | independent integration review |
| `GF-009` | orchestrator/root | `functional-qa`, `validate-change` | public request -> envelope -> allowed/denied tool fixture | independent functional reviewer |
| `GF-101` | security reviewer; implementation remains root | `secure-design`, `validate-change` | prompt injection, approval bypass, stale envelope, external/destructive action probes | independent security review |

Emission: `LANE_LOCAL_TASK_GRAPH`. A Coordination Graph is `NOT_APPLICABLE`
at revision 2 because one lane and one root integration owner serialize the
shared contract and runtime. Re-evaluate if W-031 is split into separately
tracked lanes, dedicated worktrees, or concurrent owners with a real evidence
or materialization join.

## Adaptive Workline Map

| Workline | Outcome | Primary Contract IDs | Writes | Requires | Validation Seam | Disposition |
|---|---|---|---|---|---|---|
| `WL-01` | versioned schemas, control catalog, and policy registry | `TA-002` to `TA-008` | `.codex/task-admission/**`; narrow docs | current-source preflight | schema and policy corpus | `SELECT_SERIALIZE` |
| `WL-02` | pure compiler and public CLI | `TA-001` to `TA-009` | `scripts/cascade/admission.ts`; tests; CLI wiring | WL-01 accepted | deterministic CLI fixtures | `SELECT_SERIALIZE` |
| `WL-03` | shadow corpus, over/under-control metrics, and coverage repair | all acceptance criteria | `harness-evals/task-admission/**`; eval scripts/tests | WL-02 accepted | complete fixture matrix and coverage command | `SELECT_SERIALIZE` |
| `WL-04` | advisory prompt admission with no side effects | `TA-001`, `TA-012` | hook adapter and `.codex/hooks.json` | WL-03 shadow gate; trusted local runtime | prompt hook protocol fixtures | `SELECT_SERIALIZE` |
| `WL-05` | hard tool controls and security evidence | `TA-008`, `TA-012` | hook/tool decision adapter; security fixtures | WL-04 accepted; explicit enforcement authorization | deny-before-side-effect and security review | `SELECT_SERIALIZE` |
| `WL-06` | route/skill/config migration and terminal validation | `TA-010`, `TA-011`; all criteria | `AGENTS.md`; `CODEX.md`; `.codex/config.toml`; affected skills/docs/validator | WL-05 accepted; W-004 overlap resolved | full Cascade validation and independent review | `SELECT_SERIALIZE` |

All worklines remain sections of `W-031`. They are not independently
dispatchable lanes at plan revision 2. Shared files and one terminal acceptance
seam make parallel implementation unsafe without a later orchestration replan.

## Implementation Slices

| Slice | Workline | Implements | Exact Files / Contracts | Output | Acceptance Evidence | Repair / Stop Boundary |
|---|---|---|---|---|---|---|
| `SL-01` | WL-01 | envelope, claims, axes, routes, policies, control packs | `.codex/task-admission/task-envelope.schema.json`; `policy.schema.json`; `control-catalog.json`; `policies/core.json`; `scripts/cascade/validate.ts` | validated contract bundle | positive/negative schemas; ambiguity/conflict failures | schema or authority ambiguity returns to WL-01 |
| `SL-02` | WL-02 | normalization, compilation, minimization, trace, reclassification | `scripts/cascade/admission.ts`; `admission.test.ts`; `scripts/cascade.ts` | `cascade admission validate|assess|explain` | byte-stable fixtures and CLI errors | compiler failure stops before integration |
| `SL-03` | WL-03 | route cases and measurement | `harness-evals/task-admission/case.schema.json`; `cases.json`; `assessment.schema.json`; `scripts/cascade/evals.ts`; related tests | versioned shadow corpus and scorecard | all required cases present; over/under-control thresholds; coverage regression fixed | failed/duplicate/missing cases keep hook gate closed |
| `SL-04` | WL-04 | prompt-time provisional envelope | `scripts/cascade/task-admission-hook.ts`; hook tests; `.codex/hooks.json` | advisory hook receipt | no scan/network/model/write; bounded latency/result; trusted-project test | unavailable runtime leaves hook `BLOCKED`, direct bridge preserved |
| `SL-05` | WL-05 | deterministic hard-action enforcement | hook adapter tests; policy/security fixtures; narrow config | pre-tool allow/deny receipt | injection, stale envelope, external/privileged/destructive cases; independent security review | any bypass returns to earliest contract/compiler/hook owner |
| `SL-06` | WL-06 | runtime route consumption and blanket-route reduction | `AGENTS.md`; `CODEX.md`; `.codex/config.toml`; affected `.codex/skills/**`; `docs/structure.md`; `docs/glossary.md`; catalogs/validator if required | one launched admission route with no dual authority | targeted, full validation, eval self-test/catalog, independent Standards/Spec review | route drift reopens only affected consumer; release remains `NOT_RUN` until all gates pass |

## Policy And Evaluation Thresholds

Initial launch thresholds are requirements, not evidence that has already run:

- 100% schema-valid output for all required cases;
- 100% hard-deny, approval, authority, conflict, and stale-envelope cases match
  expected decisions;
- 0 simple direct-read fixtures incorrectly require a lane, full scan,
  security overlay, or release evidence;
- 0 high-assurance fixtures are downgraded by small effort;
- 100% selected controls have a complete explanation trace;
- 100% program fixtures preserve adaptive workline and reclassification rules;
- no prompt-hook fixture performs filesystem scan, network/model call, durable
  write, workline creation, or authority expansion; and
- required scenario absence, evaluator gap, or current-source mismatch prevents
  launch acceptance.

## Validation Plan

| Evidence ID | Proves | Command Or Check | Required | Initial Status |
|---|---|---|---|---|
| `EV-PLAN-01` | planning docs and references are structurally valid | `npx --yes bun@1.3.3 scripts/cascade.ts validate` | yes | `PASS` on 2026-08-04; 9 agents, 44 skills |
| `EV-PLAN-02` | planning diff is mechanically clean | `git diff --check -- docs/specs/task-admission-workload docs/work/lanes/W-031-task-admission-workload-compiler.md docs/specs/_index.md docs/work/active.md` | yes | `PASS` on 2026-08-04 |
| `EV-BASELINE-01` | current harness baseline remains green before implementation | eval catalog/self-test, target self-test, campaign catalog/self-test, and `npx --yes bun@1.3.3 test scripts/cascade` | baseline only | `PASS` on 2026-08-04; 368 scenarios and 125 tests |
| `EV-01` | admission unit behavior | `npx --yes bun@1.3.3 test scripts/cascade/admission.test.ts` | yes | `PASS_LOCAL`: 19 tests |
| `EV-02` | policy/schema registry | `npx --yes bun@1.3.3 scripts/cascade.ts admission validate` | yes | `PASS_LOCAL`: 11 policies, 10 controls |
| `EV-03` | complete route corpus and repaired coverage | `admission corpus`; `eval coverage --list-missing --allow-incomplete` | yes | shadow `PASS` 14/14 with zero over/under-control; callback fixed; live current-source coverage `0/368 NOT_RUN` |
| `EV-04` | generated harness catalog freshness | `npx --yes bun@1.3.3 scripts/cascade.ts eval catalog --check` | yes | `PASS_LOCAL`: 368 scenarios |
| `EV-05` | evaluator invariants | `npx --yes bun@1.3.3 scripts/cascade.ts eval self-test` | yes | `PASS_LOCAL`: 21 cases including admission corpus |
| `EV-06` | hook protocol and side-effect boundary | focused Bun hook tests and exact offline command stdin/stdout fixtures | yes for N04/N05 | `PASS_LOCAL`; hook trust remains external |
| `EV-07` | request-to-tool functional behavior | smallest public request -> envelope -> allow/deny fixture | yes | `PASS_LOCAL`: missing/stale/forged/non-interactive deny and normal-approval defer |
| `EV-08` | security assurance | independent GF-101 design/review receipt and negative probes | yes | `NOT_RUN` |
| `EV-09` | repository regression | all AGENTS.md validation commands, ending with `npx --yes bun@1.3.3 test scripts/cascade` | yes | `PASS_LOCAL`; final post-doc rerun required |
| `EV-10` | fixed-point change quality | independent Standards and Spec review against current source/diff | yes | `NOT_RUN` |

## Doc Routing Decision Matrix

| Fact | Owner Target | Action In This Planning Task | Next Gate |
|---|---|---|---|
| task-admission contract | `docs/specs/task-admission-workload/contract.md` | `IMPLEMENTED` | independent acceptance |
| implementation design and traceability | this plan | `IMPLEMENTED` | independent acceptance |
| active execution state | `docs/work/lanes/W-031-...` and `docs/work/active.md` | `UPDATED` | independent acceptance |
| reusable workflow semantics | `docs/patterns/workflow/` | `NO_CHANGE`; current graph/policy principles are sufficient | revisit only if implementation exposes a reusable gap |
| vocabulary | `docs/glossary.md` | `UPDATED` | independent review |
| runtime bridge and default route | `AGENTS.md`; `CODEX.md`; `.codex/config.toml` | `IMPLEMENTED`; blanket default replaced by admission plus conditional non-atomic fallback | independent integration review |
| hook configuration | `.codex/hooks.json` | `IMPLEMENTED`; project trust is intentionally not bypassed | independent security review |
| validator and eval wiring | scripts and `harness-evals/` | `IMPLEMENTED` | independent harness review |
| product/design/brand/backlog docs | owning folders | `NO_CHANGE`; this is a harness capability with no UI/product-domain change | none |

## Traceability

| Requirement | Primary Workline | Slice | Artifact | Evidence | Status |
|---|---|---|---|---|---|
| `TA-001`, `TA-003` | WL-02 | SL-02 | compiler/CLI | EV-01, EV-07 | `IMPLEMENTED_REVIEW_PENDING` |
| `TA-002`, `TA-004` | WL-01 | SL-01 | envelope/claim schemas | EV-01, EV-02 | `IMPLEMENTED_REVIEW_PENDING` |
| `TA-005`, `TA-006`, `TA-007` | WL-01 | SL-01 | policies/control catalog | EV-01 to EV-05 | `IMPLEMENTED_REVIEW_PENDING` |
| `TA-008`, `TA-009` | WL-02 | SL-02 | compiler trace/context escalation | EV-01 to EV-03 | `IMPLEMENTED_REVIEW_PENDING` |
| `TA-010` | WL-03 | SL-03 | resume/reclassification cases | EV-03 to EV-05 | `IMPLEMENTED_REVIEW_PENDING` |
| `TA-011` | WL-06 | SL-06 | route and promotion consumers | EV-07, EV-09, EV-10 | `IMPLEMENTED_REVIEW_PENDING` |
| `TA-012` | WL-04/WL-05; primary owner WL-05 for hard controls | SL-04/SL-05 | hook adapters and policies | EV-06 to EV-08 | `IMPLEMENTED_REVIEW_PENDING` |
| no over-control | WL-03 | SL-03 | simple/medium cases | EV-03 to EV-05 | `PASS_LOCAL` |
| no under-control | WL-05 | SL-05 | high-risk and bypass cases | EV-06 to EV-08 | `PASS_LOCAL_REVIEW_PENDING` |
| long complex feature/refactor handling | WL-03 | SL-03 | program/replan cases | EV-03 to EV-05 | `PASS_LOCAL` |

No request criterion, accepted definition, boundary, slice, or required check
is orphaned. Runtime/compiler/hook evidence is locally green; independent
architecture, code/spec, integration, functional, harness, and security review,
live harness coverage, merge/deploy, and release evidence remain `NOT_RUN`.

## Replanning And Preservation History

| Revision | Trigger | Preserved | Changed / Added | Invalidated / Superseded | Evidence Impact |
|---|---|---|---|---|---|
| `1` | initial durable planning request | current Cascade routes, skill contracts, graph semantics, permission boundaries | task-admission contract, six worklines, staged launch gates | prompt-only, scalar-grade, workline-only, and hook-only alternatives rejected | all implementation evidence starts `NOT_RUN` |
| `2` | user authorized implementation until done | independent axes, six worklines, no-auto-dispatch and normal permission boundaries | current schemas/compiler/corpus/hooks/default route; locally gated serialized implementation | planning-only state and blanket default route superseded | local evidence passes; independent gates remain open |
| `3` | W-032 simulation-intake consumer and current hook tool identities exposed under-control gaps | six worklines, Task Graph topology, W-004 ownership, permission boundaries | simulation governance control/policy, two corpus trajectories, and shell-tool normalization | 10-policy/9-control, 12-case, and legacy-Bash-only evidence superseded | 11 policies, 10 controls, 14/14 corpus, and 19 focused tests pass locally; independent gates remain open |
| `4` | fixed-point review found the new simulation policy had not advanced its bundle identity | six worklines, topology, policy/control meaning, route outputs, permission boundaries | policy bundle advances to `cascade-core@2`; stale bundle-1 envelopes fail closed | bundle-1 envelope evidence superseded | 14/14 corpus and 19 focused tests pass locally; independent gates remain open |
| `5` | resumed continuation request exposed inflected change-verb under-classification | graph topology, policies, controls, authority, and independent gates | bounded compiler/corpus repair for `implementing`; N02/N03/N06 reopen at attempt 2 | prior continuation-route evidence and 14-case/19-test counts superseded | focused and full validation pending; independent gates remain open |

## Compact Resume Contract

- Authoritative sources: `SRC-01` through `SRC-08`, especially `contract.md`
  and the W-031 lane packet.
- Accepted decisions: `DEF-01` through `DEF-11`; one compiler, independent
  axes, composable controls, advisory-before-enforcement rollout.
- Negative constraints: no auto-dispatch, no full scan/model/network/write in
  prompt hook, no scalar grade, no model-controlled authority, and no
  hook-based auto-approval.
- Worklines: WL-01 -> WL-02 -> WL-03 -> WL-04 -> WL-05 -> WL-06, serialized.
- Current evidence: implementation, 14/14 shadow cases, exact offline hook
  fixtures, validator, catalog, self-tests, and local regression pass.
- Known preconditions: independent reviewers have not been authorized or
  dispatched; live current-source harness coverage is `0/368` after source drift.
- Next executable gate: independent GF-004/GF-008/GF-009/GF-101 and harness
  review, then the terminal G6 join.
